"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, BellRing, CheckCircle2, Flag, Headset, Mail, Phone, RotateCcw, ShoppingBag, PhoneMissed, Trophy, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { ORDER_OUTCOMES, type FakeReportStatus, type Order, type OrderOutcome } from "@/lib/types";
import { cn, formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { leadOutcome, type LeadGroup, type LeadOutcome } from "@/lib/mock/selectors";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCards } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { EmptyState, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DL, Mono, PageHeader } from "@/components/admin/ui";
import { JobFacts, JobPlaces } from "@/components/shared/job-details";
import { routeFull, routeText } from "@/lib/jobs";

const REASONS = ["phone", "never", "duplicate", "unreachable"] as const;
const GROUPS: LeadGroup[] = ["open", "won", "lost", "executed", "reported", "cancelled"];
const OUTCOME_TONE: Record<LeadOutcome, "neutral" | "success" | "warning" | "info" | "danger" | "primary"> = {
  active: "primary",
  won: "success",
  lost: "neutral",
  unreachable: "warning",
  chosen: "success",
  chosenOther: "neutral",
  executed: "success",
  reported: "warning",
  cancelledFake: "info",
  cancelledCustomer: "danger",
};
/** How a fake-lead report moves; the last step is confirmed (refunded) or rejected. */
const REPORT_STEPS: FakeReportStatus[] = ["open", "testing", "pending"];

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
  const refunds = useStore((s) => s.refunds);
  const patch = useStore((s) => s.patch);
  const { confirm, dialog } = useConfirm();
  const serviceMap = useServiceMap();
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const outcomeOf = (o: Order) => leadOutcome({ offers, fakeReports: reports, refunds }, o);
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

  // One status per offer. When the customer named a company in the after-move survey, that answer
  // decides Won / Lost and is marked "Confirmed by customer".
  const status = (o: Order, withNote = true) => {
    const { status: s, byCustomer } = outcomeOf(o);
    return (
      <span className="inline-flex flex-col items-start gap-0.5">
        <Badge tone={OUTCOME_TONE[s]} dot>{t(`outcome.${s}`)}</Badge>
        {withNote && byCustomer && (
          <span className="flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
            <UserCheck className="size-3" /> {t("confirmedByCustomer")}
          </span>
        )}
      </span>
    );
  };
  // after the call: how it went (click the same answer again to clear it)
  const setOutcome = (o: Order, outcome: OrderOutcome) => {
    const clear = o.outcome === outcome;
    patch("orders", o.id, clear ? { outcome: undefined, outcomeAt: undefined } : { outcome, outcomeAt: new Date().toISOString() });
    toast.success(clear ? t("outcomeCleared") : t("outcomeSaved", { status: t(`outcome.${outcome}`) }));
  };
  const markExecuted = (o: Order) =>
    confirm({
      title: t("markDoneTitle", { id: o.offerId }),
      body: t("markDoneBody"),
      tone: "success",
      confirmLabel: t("markDone"),
      onConfirm: () => {
        patch("orders", o.id, { executed: true });
        toast.success(t("executed"));
      },
    });

  const columns: ColumnDef<Order, unknown>[] = [
    // the reference with the day it was bought (sorting by it = newest purchases first)
    {
      id: "bought",
      header: tf("reference"),
      accessorFn: (o) => o.createdAt,
      cell: ({ row: { original: o } }) => (
        <span className="flex flex-col items-start gap-0.5 whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <Mono>{o.offerId}</Mono>
            {o.channel === "manual" && (
              <Badge tone="accent" className="px-1.5" title={t("assigned")}>
                <Headset aria-label={t("assigned")} />
              </Badge>
            )}
          </span>
          <span className="text-xs text-muted-foreground">{t("boughtOn", { date: formatDate(o.createdAt, lang) })}</span>
        </span>
      ),
    },
    {
      id: "customer",
      header: tl("customer"),
      accessorFn: (o) => `${offerMap[o.offerId]?.firstName} ${offerMap[o.offerId]?.lastName}`,
      cell: ({ row: { original: o } }) => {
        const x = offerMap[o.offerId];
        return (
          <div className="w-32 min-w-0 2xl:w-44">
            <p className="truncate font-semibold text-ink">{x?.firstName} {x?.lastName}</p>
            <p className="truncate text-xs text-muted-foreground" dir="ltr">{x?.phone}</p>
          </div>
        );
      },
    },
    {
      id: "svc",
      header: tf("service"),
      accessorFn: (o) => L(serviceMap[offerMap[o.offerId]?.serviceId ?? ""]?.name),
      cell: (c) => <p className="w-20 font-medium leading-snug text-ink 2xl:w-32">{c.getValue() as string}</p>,
    },
    {
      id: "route",
      header: tl("route"),
      accessorFn: (o) => (offerMap[o.offerId] ? routeText(offerMap[o.offerId]) : ""),
      cell: ({ row: { original: o } }) => {
        const x = offerMap[o.offerId];
        return (
          <p className="w-28 truncate text-muted-foreground 2xl:w-48" title={x ? routeFull(x) : undefined}>
            {x ? routeText(x) : "–"}
          </p>
        );
      },
    },
    { id: "exec", header: tl("execution"), accessorFn: (o) => offerMap[o.offerId]?.executionDate ?? "", cell: (c) => <span className="whitespace-nowrap">{c.getValue() ? formatDate(c.getValue() as string, lang) : "–"}</span> },
    {
      id: "paid",
      header: t("paid"),
      accessorFn: (o) => o.price,
      cell: ({ row: { original: o } }) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">{formatCHF(o.price, lang)}</p>
          {o.couponCode && <p className="font-mono text-xs text-success" dir="ltr">{o.couponCode}</p>}
        </div>
      ),
    },
    { id: "status", header: tf("status"), accessorFn: (o) => outcomeOf(o).status, cell: ({ row: { original: o } }) => status(o) },
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <DataTable
        data={orders}
        columns={columns}
        search={(o) => `${o.offerId} ${offerMap[o.offerId]?.firstName} ${offerMap[o.offerId]?.lastName} ${offerMap[o.offerId]?.from.city}`}
        searchPlaceholder={t("searchPh")}
        onRowClick={(o) => setOpenId(o.id)}
        initialSort={[{ id: "bought", desc: true }]}
        emptyState={<EmptyState icon={<ShoppingBag />} title={t("empty")} action={<Button asChild variant="accent"><Link href="/portal/shop">{tn("shop")}</Link></Button>} />}
        filters={[{ id: "st", label: tf("status"), options: GROUPS.map((g) => ({ value: g, label: t(`groups.${g}`) })), get: (o) => outcomeOf(o).group }]}
      />

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="max-w-md overflow-y-auto">
          {open && lead && (
            <div className="flex min-h-full flex-col">
              <div className="space-y-5 p-6">
                <div>
                  <DialogTitle className="flex items-center gap-2"><Mono className="text-lg">{lead.id}</Mono> {status(open, false)}</DialogTitle>
                  <DialogDescription className="mt-1">{L(serviceMap[lead.serviceId]?.name)} · {formatDateTime(open.createdAt, lang)}</DialogDescription>
                </div>
                <OutcomeBanner order={open} />
                {open.channel === "manual" && (
                  <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-3 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-ink"><Headset className="size-4 text-accent" /> {t("assignedTitle", { price: formatCHF(open.price, lang) })}</p>
                    <p className="mt-1 text-muted-foreground">{open.note ? `“${open.note}”` : t("assignedNoNote")}</p>
                  </div>
                )}
                {lead.buyersNotifiedAt && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground"><BellRing className="size-3.5" /> {t("customerNotified", { date: formatDate(lead.buyersNotifiedAt, lang) })}</p>
                )}
                {outcomeOf(open).byCustomer && (
                  <div className={cn("rounded-xl border p-3 text-sm", outcomeOf(open).status === "chosen" ? "border-success/30 bg-success-soft/40" : "bg-surface-2/60")}>
                    <p className="flex items-center gap-2 font-semibold text-ink"><UserCheck className="size-4 text-success" /> {t("confirmedByCustomer")}</p>
                    <p className="mt-1 text-muted-foreground">{t(outcomeOf(open).status === "chosen" ? "choiceHint.you" : "choiceHint.other")}</p>
                    {outcomeOf(open).overridden && open.outcome && <p className="mt-1 text-xs text-muted-foreground">{t("overridden", { status: t(`outcome.${open.outcome}`) })}</p>}
                  </div>
                )}
                {/* the company reports how it went until the customer's answer settles it */}
                {["open", "won", "lost"].includes(outcomeOf(open).group) && !outcomeOf(open).report && !outcomeOf(open).byCustomer && (
                  <div className="rounded-xl border p-3">
                    <p className="text-sm font-semibold text-ink">{t("outcomeTitle")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("outcomeHint")}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {(ORDER_OUTCOMES as readonly OrderOutcome[]).map((x) => (
                        <Button
                          key={x}
                          size="sm"
                          variant={open.outcome === x ? (x === "won" ? "success" : "secondary") : "outline"}
                          aria-pressed={open.outcome === x}
                          onClick={() => setOutcome(open, x)}
                          className="h-auto min-h-9 whitespace-normal py-1.5"
                        >
                          {x === "won" ? <Trophy /> : x === "lost" ? <UserX /> : <PhoneMissed />} {t(`set.${x}`)}
                        </Button>
                      ))}
                    </div>
                    {/* a number nobody answers may mean a fake request: point to the refund path */}
                    {open.outcome === "unreachable" && (
                      <p className="mt-3 rounded-lg bg-warning-soft/60 px-3 py-2 text-xs text-ink">
                        {t("unreachableHint")}{" "}
                        <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setReporting(open)}>{t("report")}</button>
                      </p>
                    )}
                  </div>
                )}
                <Card className="bg-primary-soft/40 p-4 shadow-none">
                  <p className="text-lg font-bold text-ink">{lead.firstName} {lead.lastName}</p>
                  {lead.requester && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("bookedBy", { name: `${lead.requester.firstName} ${lead.requester.lastName}` })}
                      {lead.organization ? ` · ${lead.organization.name} · ` : " · "}
                      <span dir="ltr">{lead.requester.phone}</span>
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm"><a href={`tel:${lead.phone}`}><Phone /> {t("call")}</a></Button>
                    <Button asChild size="sm" variant="outline"><a href={`mailto:${lead.email}`}><Mail /> {t("email")}</a></Button>
                  </div>
                  <p className="mt-3 text-sm" dir="ltr">{lead.phone} · {lead.email}</p>
                </Card>
                <JobPlaces offer={lead} />
                <JobFacts offer={lead} cols={1} />
                <DL items={[{ label: tl("execution"), value: formatDate(lead.executionDate, lang) }, { label: t("paid"), value: formatCHF(open.price, lang) }]} />
                {lead.details && <p className="rounded-xl border border-dashed p-4 text-sm">“{lead.details}”</p>}
              </div>
              {(outcomeOf(open).group === "open" || outcomeOf(open).group === "won") && (
                <div className="sticky bottom-0 mt-auto flex gap-2 border-t bg-surface p-4">
                  {!outcomeOf(open).report && outcomeOf(open).group === "open" && <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setReporting(open)}><Flag /> {t("report")}</Button>}
                  <Button variant="success" className="flex-1" onClick={() => markExecuted(open)}>
                    <CheckCircle2 /> {t("markDone")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Dialog>

      {reporting && <ReportDialog order={reporting} onClose={() => setReporting(null)} />}
      {dialog}
    </>
  );
}

/**
 * What happened to the purchase, in plain words: refunded because the offer was fake, not refunded
 * because the customer cancelled, or where a fake-lead report stands (with its steps).
 */
function OutcomeBanner({ order }: { order: Order }) {
  const t = useTranslations("portal.leads");
  const tst = useTranslations("common.status");
  const lang = useLang();
  const offers = useStore((s) => s.offers);
  const fakeReports = useStore((s) => s.fakeReports);
  const refunds = useStore((s) => s.refunds);
  const { status, report, refund, offer } = leadOutcome({ offers, fakeReports, refunds }, order);

  if (status === "cancelledFake")
    return (
      <div className="rounded-xl border border-info/30 bg-info-soft/50 p-3 text-sm">
        <p className="flex items-center gap-2 font-semibold text-info"><RotateCcw className="size-4" /> {t("cancelledFakeTitle")}</p>
        <p className="mt-1 text-muted-foreground">
          {refund?.status === "refunded"
            ? t("cancelledFakeRefunded", { amount: formatCHF(refund.amount, lang), date: formatDate(refund.decidedAt ?? refund.createdAt, lang) })
            : t("cancelledFakePending")}
        </p>
        {refund?.status === "refunded" && <Link href="/portal/payments?tab=statement" className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">{t("seeStatement")}</Link>}
      </div>
    );
  if (status === "cancelledCustomer")
    return (
      <div className="rounded-xl border border-danger/20 bg-danger-soft/40 p-3 text-sm">
        <p className="flex items-center gap-2 font-semibold text-danger"><Ban className="size-4" /> {t("cancelledCustomerTitle", { date: offer?.cancelledAt ? formatDate(offer.cancelledAt, lang) : "" })}</p>
        <p className="mt-1 text-muted-foreground">{t("cancelledCustomerBody")}</p>
      </div>
    );
  if (!report) return null;
  const rejected = report.status === "canceled";
  const reached = rejected ? REPORT_STEPS.length : Math.max(0, REPORT_STEPS.indexOf(report.status));
  return (
    <div className={cn("rounded-xl border p-3 text-sm", rejected ? "bg-surface-2/60" : "border-warning/30 bg-warning-soft/40")}>
      <p className="flex items-center gap-2 font-semibold text-ink"><Flag className="size-4 text-warning" /> {rejected ? t("reportRejectedTitle") : t("reportTitleShort", { date: formatDate(report.createdAt, lang) })}</p>
      <p className="mt-1 text-muted-foreground">{rejected ? t("reportRejectedBody") : t("reportProgressBody")}</p>
      <ol className="mt-3 flex items-center gap-1" aria-label={t("reportSteps")}>
        {[...REPORT_STEPS, rejected ? "canceled" : "confirmed"].map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1">
            <span className={cn("h-1.5 rounded-full", i <= reached ? (rejected && i === REPORT_STEPS.length ? "bg-muted-foreground" : "bg-warning") : "bg-muted")} />
            <span className={cn("text-[11px]", i === reached ? "font-semibold text-ink" : "text-muted-foreground")}>{tst(s)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">“{report.reason}”</p>
    </div>
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
