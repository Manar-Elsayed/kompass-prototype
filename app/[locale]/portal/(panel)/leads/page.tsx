"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Flag, Mail, Phone, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Order } from "@/lib/types";
import { cn, formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCards } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { EmptyState, StatusBadge } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DL, Mono, PageHeader } from "@/components/admin/ui";

const REASONS = ["phone", "never", "duplicate", "unreachable"] as const;

export default function MyLeadsPage() {
  return (
    <Suspense>
      <MyLeads />
    </Suspense>
  );
}

function MyLeads() {
  const t = useTranslations("portal.leads");
  const tf = useTranslations("common.fields");
  const tl = useTranslations("admin.leads");
  const tn = useTranslations("portal.nav");
  const tst = useTranslations("common.status");
  const tof = useTranslations("site.offerForm");
  const L = useL();
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const orders = useStore((s) => s.orders).filter((o) => o.partnerId === partner.id);
  const offers = useStore((s) => s.offers);
  const reports = useStore((s) => s.fakeReports);
  const patch = useStore((s) => s.patch);
  const serviceMap = useServiceMap();
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const reportOf = (orderId: string) => reports.find((r) => r.orderId === orderId);
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [reporting, setReporting] = useState<Order | null>(null);

  // deep link from the shop / dashboard: ?open=<offerId>. Re-checked once persisted orders have loaded.
  const deepLinkOrder = orders.find((o) => o.offerId === params.get("open"))?.id;
  useEffect(() => {
    if (deepLinkOrder) setOpenId(deepLinkOrder);
  }, [deepLinkOrder]);

  const open = orders.find((o) => o.id === openId);
  const lead = open ? offerMap[open.offerId] : undefined;

  // the customer tells Kompass which company they booked; every buyer sees the outcome
  const choiceOf = (o: Order) => {
    const chosen = offerMap[o.offerId]?.chosenPartnerId;
    return !chosen ? "pending" : chosen === partner.id ? "you" : "other";
  };
  const choice = (o: Order) => {
    const c = choiceOf(o);
    return <Badge tone={c === "you" ? "success" : c === "other" ? "neutral" : "outline"}>{t(`choice.${c}`)}</Badge>;
  };

  const status = (o: Order) => {
    const r = reportOf(o.id);
    if (r) return <StatusBadge status={r.status} />;
    return o.executed ? <Badge tone="success" dot>{t("executed")}</Badge> : <StatusBadge status="in_progress" />;
  };

  const columns: ColumnDef<Order, unknown>[] = [
    { id: "lead", header: tf("reference"), accessorFn: (o) => o.offerId, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    {
      id: "customer",
      header: tl("customer"),
      accessorFn: (o) => `${offerMap[o.offerId]?.firstName} ${offerMap[o.offerId]?.lastName}`,
      cell: ({ row: { original: o } }) => {
        const x = offerMap[o.offerId];
        return (
          <div>
            <p className="font-semibold text-ink">{x?.firstName} {x?.lastName}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">{x?.phone}</p>
          </div>
        );
      },
    },
    { id: "svc", header: tf("service"), accessorFn: (o) => L(serviceMap[offerMap[o.offerId]?.serviceId ?? ""]?.name) },
    { id: "route", header: tl("route"), accessorFn: (o) => `${offerMap[o.offerId]?.from.city} → ${offerMap[o.offerId]?.to.city}`, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{c.getValue() as string}</span> },
    { id: "exec", header: tl("execution"), accessorFn: (o) => offerMap[o.offerId]?.executionDate ?? "", cell: (c) => <span className="whitespace-nowrap">{c.getValue() ? formatDate(c.getValue() as string, lang) : "–"}</span> },
    { id: "paid", header: t("paid"), accessorFn: (o) => o.price, cell: ({ row: { original: o } }) => <span className="font-semibold">{formatCHF(o.price, lang)}{o.couponCode && <span className="ms-1 text-xs font-normal text-success" dir="ltr">({o.couponCode})</span>}</span> },
    { id: "bought", header: t("bought"), accessorFn: (o) => o.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    { id: "choice", header: t("choiceCol"), accessorFn: (o) => choiceOf(o), cell: ({ row: { original: o } }) => choice(o) },
    { id: "status", header: tf("status"), accessorFn: (o) => (reportOf(o.id) ? "reported" : o.executed ? "executed" : "open"), cell: ({ row: { original: o } }) => status(o) },
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <DataTable
        data={orders}
        columns={columns}
        search={(o) => `${o.offerId} ${offerMap[o.offerId]?.firstName} ${offerMap[o.offerId]?.lastName} ${offerMap[o.offerId]?.from.city}`}
        onRowClick={(o) => setOpenId(o.id)}
        initialSort={[{ id: "bought", desc: true }]}
        emptyState={<EmptyState icon={<ShoppingBag />} title={t("empty")} action={<Button asChild variant="accent"><Link href="/portal/shop">{tn("shop")}</Link></Button>} />}
        filters={[{ id: "st", label: tf("status"), options: [{ value: "open", label: tst("in_progress") }, { value: "executed", label: t("executed") }, { value: "reported", label: t("reported") }], get: (o) => (reportOf(o.id) ? "reported" : o.executed ? "executed" : "open") },
          { id: "choice", label: t("choiceCol"), options: (["you", "other", "pending"] as const).map((c) => ({ value: c, label: t(`choice.${c}`) })), get: (o) => choiceOf(o) },
        ]}
      />

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="max-w-md overflow-y-auto">
          {open && lead && (
            <div className="flex min-h-full flex-col">
              <div className="space-y-5 p-6">
                <div>
                  <DialogTitle className="flex items-center gap-2"><Mono className="text-lg">{lead.id}</Mono> {status(open)}</DialogTitle>
                  <DialogDescription className="mt-1">{L(serviceMap[lead.serviceId]?.name)} · {formatDateTime(open.createdAt, lang)}</DialogDescription>
                </div>
                <div className={cn("rounded-xl border p-3 text-sm", choiceOf(open) === "you" ? "border-success/30 bg-success-soft/40" : "bg-surface-2/60")}>
                  <p className="font-semibold text-ink">{choice(open)}</p>
                  <p className="mt-1 text-muted-foreground">{t(`choiceHint.${choiceOf(open)}`)}</p>
                  {lead.noShow?.partnerId === partner.id && <p className="mt-2 font-semibold text-danger">{t("noShowAgainst")}</p>}
                </div>
                <Card className="bg-primary-soft/40 p-4 shadow-none">
                  <p className="text-lg font-bold text-ink">{lead.firstName} {lead.lastName}</p>
                  {lead.requester && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("bookedBy", { name: `${lead.requester.firstName} ${lead.requester.lastName}` })}
                      {lead.organization && ` · ${lead.organization.name}`} ·{" "}
                      <span dir="ltr">{lead.requester.phone}</span>
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm"><a href={`tel:${lead.phone}`}><Phone /> {t("call")}</a></Button>
                    <Button asChild size="sm" variant="outline"><a href={`mailto:${lead.email}`}><Mail /> {t("email")}</a></Button>
                  </div>
                  <p className="mt-3 text-sm" dir="ltr">{lead.phone} · {lead.email}</p>
                </Card>
                {(["from", "to"] as const).map((k) => (
                  <section key={k} className="rounded-xl border p-4">
                    <p className="mb-3 text-sm font-bold text-ink">{tof(k === "from" ? "movingFrom" : "movingTo")}</p>
                    <DL
                      items={[
                        { label: tf("street"), value: lead[k].street },
                        { label: tf("city"), value: `${lead[k].zip} ${lead[k].city}` },
                        { label: tf("rooms"), value: lead[k].rooms },
                        { label: tf("floor"), value: `${lead[k].floor} · ${tf("elevator")} ${lead[k].elevator ? "✓" : "✗"}` },
                      ]}
                    />
                  </section>
                ))}
                <DL items={[{ label: tl("execution"), value: formatDate(lead.executionDate, lang) }, { label: t("paid"), value: formatCHF(open.price, lang) }]} />
                {lead.details && <p className="rounded-xl border border-dashed p-4 text-sm">“{lead.details}”</p>}
              </div>
              {!reportOf(open.id) && (
                <div className="sticky bottom-0 mt-auto flex gap-2 border-t bg-surface p-4">
                  <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setReporting(open)}><Flag /> {t("report")}</Button>
                  {!open.executed && (
                    <Button variant="success" className="flex-1" onClick={() => { patch("orders", open.id, { executed: true }); toast.success(t("executed")); }}>
                      <CheckCircle2 /> {t("markDone")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Dialog>

      {reporting && <ReportDialog order={reporting} onClose={() => setReporting(null)} />}
    </>
  );
}

function ReportDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const t = useTranslations("portal.leads");
  const tc = useTranslations("common.actions");
  const tform = useTranslations("common.form");
  const report = useStore((s) => s.reportFakeLead);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("phone");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reportTitle", { id: order.offerId })}</DialogTitle>
          <DialogDescription>{t("reportBody")}</DialogDescription>
        </DialogHeader>
        <Field label={t("reason")}>
          <RadioCards className="grid-cols-1 [&>button]:justify-start" value={reason} onValueChange={(v) => setReason(v as typeof reason)} options={REASONS.map((r) => ({ value: r, label: t(`reasons.${r}`) }))} />
        </Field>
        <Field label={t("details")} hint={tform("optional")}>
          <Textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await mock(() => report(order.id, `${t(`reasons.${reason}`)}${details ? ` — ${details}` : ""}`));
              setBusy(false);
              toast.success(t("reportSent"));
              onClose();
            }}
          >
            <Flag /> {tc("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
