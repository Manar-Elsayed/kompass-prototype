"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, Building2, ClipboardList, Clock, HandHeart, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Refund, RefundReason } from "@/lib/types";
import { formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { inLastDays } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DetailSheet, RowActions, SheetSection, actionsColumn } from "@/components/admin/row-actions";
import { DL, KpiCard, Mono, PageHeader } from "@/components/admin/ui";

const REASONS: RefundReason[] = ["fake_lead", "manual"];
const NO_LEAD = "none";

/**
 * Refund policy: a purchase is refunded only when its offer is confirmed fake (cancelling the offer
 * as fake pays every claim automatically). A customer cancelling a real request is never refunded.
 * Admin can still add a manual refund to any company as a documented exception.
 */
export default function CompanyRefundsPage() {
  const t = useTranslations();
  const tr = useTranslations("admin.refunds");
  const lang = useLang();
  const refunds = useStore((s) => s.refunds);
  const orders = useStore((s) => s.orders);
  const offers = useStore((s) => s.offers);
  const decideRefund = useStore((s) => s.decideRefund);
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();
  const [issuing, setIssuing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const sum = (rs: Refund[]) => rs.reduce((a, r) => a + r.amount, 0);
  const pending = refunds.filter((r) => r.status === "pending");
  const refunded30 = refunds.filter((r) => r.status === "refunded" && inLastDays(r.decidedAt ?? r.createdAt, 30));
  const manual30 = refunded30.filter((r) => r.reason === "manual");
  const offerOf = (r: Refund) => (r.orderId ? orderMap[r.orderId]?.offerId : undefined);

  const reject = (r: Refund) =>
    confirm({
      title: `${t("common.actions.reject")} · ${r.id}`,
      body: tr("rejectBody"),
      tone: "danger",
      confirmLabel: t("common.actions.reject"),
      onConfirm: () => {
        decideRefund(r.id, "rejected");
        toast.success(tr("rejected"));
      },
    });

  const columns: ColumnDef<Refund, unknown>[] = [
    { id: "id", header: "#", accessorFn: (r) => r.id, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    {
      id: "partner",
      header: t("common.fields.company"),
      accessorFn: (r) => partnerMap[r.partnerId]?.name ?? "–",
      cell: ({ row: { original: r } }) => (
        <Link href={`/admin/partners/${r.partnerId}`} className="flex w-fit items-center gap-2 font-semibold text-ink hover:text-primary">
          <Avatar name={partnerMap[r.partnerId]?.name ?? "?"} square className="size-7 text-[10px]" />
          {partnerMap[r.partnerId]?.name ?? "–"}
        </Link>
      ),
    },
    {
      id: "reason",
      header: tr("reason"),
      accessorFn: (r) => r.reason,
      cell: ({ row: { original: r } }) => (
        <div className="max-w-xs">
          <p className="font-medium text-ink">{tr(`reasons.${r.reason}`)}</p>
          {r.note && <p className="line-clamp-1 text-xs text-muted-foreground">{r.note}</p>}
        </div>
      ),
    },
    {
      id: "lead",
      header: tr("lead"),
      accessorFn: (r) => offerOf(r) ?? "",
      cell: (c) =>
        c.getValue() ? (
          <Link href={`/admin/leads/${c.getValue() as string}`} className="font-mono text-[13px] font-semibold text-primary hover:underline">{c.getValue() as string}</Link>
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
    },
    { id: "amount", header: t("common.fields.amount"), accessorFn: (r) => r.amount, cell: (c) => <span className="font-bold">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "date", header: t("common.fields.date"), accessorFn: (r) => r.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (r) => r.status,
      cell: ({ row: { original: r } }) => {
        if (r.status !== "pending") return <StatusBadge status={r.status} />;
        // the refund is paid by confirming the offer fake, never approved on its own
        const offerId = offerOf(r);
        const fake = offerId && offerMap[offerId]?.cancelReason === "fake";
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={r.status} />
            {!fake && (
              <span className="flex items-center gap-1 text-xs font-medium text-warning" title={tr("confirmFirst")}>
                <AlertTriangle className="size-3.5" /> {tr("notFakeYet")}
              </span>
            )}
          </div>
        );
      },
    },
    actionsColumn<Refund>((r) => {
      const offerId = offerOf(r);
      return (
        <RowActions
          onView={() => setOpenId(r.id)}
          actions={[
            { label: tr("openLead"), icon: <ClipboardList />, href: offerId ? `/admin/leads/${offerId}` : undefined, hidden: !offerId },
            { label: t("admin.rows.openCompany"), icon: <Building2 />, href: `/admin/partners/${r.partnerId}` },
            { label: t("common.actions.reject"), icon: <X />, tone: "danger", onSelect: () => reject(r), hidden: r.status !== "pending", separated: true },
          ]}
        />
      );
    }),
  ];

  const open = refunds.find((r) => r.id === openId);
  const openOfferId = open && offerOf(open);
  const openOffer = openOfferId ? offerMap[openOfferId] : undefined;

  return (
    <>
      <PageHeader title={tr("title")} subtitle={tr("subtitle")} actions={<Button onClick={() => setIssuing(true)}><Plus /> {tr("issue")}</Button>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={tr("pendingTotal")} value={formatCHF(sum(pending), lang)} icon={<Clock />} tone="warning" footer={tr("requests", { count: pending.length })} />
        <KpiCard label={tr("refunded30")} value={formatCHF(sum(refunded30), lang)} icon={<RotateCcw />} tone="success" footer={tr("requests", { count: refunded30.length })} />
        <KpiCard label={tr("manual30")} value={formatCHF(sum(manual30), lang)} icon={<HandHeart />} footer={tr("requests", { count: manual30.length })} />
      </div>
      <DataTable
        data={refunds}
        columns={columns}
        search={(r) => `${r.id} ${partnerMap[r.partnerId]?.name ?? ""} ${r.note} ${offerOf(r) ?? ""} ${tr(`reasons.${r.reason}`)}`}
        searchPlaceholder={tr("searchPh")}
        wideSearch
        initialSort={[{ id: "status", desc: false }]}
        onRowClick={(r) => setOpenId(r.id)}
        filters={[
          { id: "status", label: t("common.fields.status"), options: (["pending", "refunded", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (r) => r.status },
          { id: "reason", label: tr("reason"), options: REASONS.map((x) => ({ value: x, label: tr(`reasons.${x}`) })), get: (r) => r.reason },
        ]}
        rowClassName={(r) => (r.status === "pending" ? "bg-warning-soft/25" : undefined)}
      />
      <DetailSheet
        open={!!open}
        onOpenChange={(v) => !v && setOpenId(null)}
        title={<Mono className="text-lg">{open?.id}</Mono>}
        badge={open && <StatusBadge status={open.status} />}
        subtitle={open && `${partnerMap[open.partnerId]?.name ?? "–"} · ${formatDateTime(open.createdAt, lang)}`}
        footer={
          open?.status === "pending" ? (
            <>
              <Button variant="danger-soft" onClick={() => { setOpenId(null); reject(open); }}><X /> {t("common.actions.reject")}</Button>
              {openOfferId && (
                <Button asChild className="flex-1">
                  <Link href={`/admin/leads/${openOfferId}`}>{tr("openLead")} <ArrowRight /></Link>
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {open && (
          <>
            <SheetSection>
              <DL
                items={[
                  { label: t("common.fields.amount"), value: <span className="font-bold">{formatCHF(open.amount, lang)}</span> },
                  { label: tr("reason"), value: tr(`reasons.${open.reason}`) },
                  { label: t("common.fields.company"), value: <Link href={`/admin/partners/${open.partnerId}`} className="font-semibold text-primary hover:underline">{partnerMap[open.partnerId]?.name ?? "–"}</Link> },
                  { label: tr("lead"), value: openOfferId ? <Link href={`/admin/leads/${openOfferId}`} className="font-mono font-semibold text-primary hover:underline">{openOfferId}</Link> : "–" },
                  { label: t("admin.rows.decidedOn"), value: open.decidedAt ? formatDateTime(open.decidedAt, lang) : "–" },
                  { label: t("admin.rows.offerStatus"), value: openOffer ? <StatusBadge status={openOffer.status} /> : "–" },
                ]}
              />
            </SheetSection>
            {open.note && (
              <SheetSection title={tr("note")}>
                <p className="text-sm text-foreground">“{open.note}”</p>
              </SheetSection>
            )}
            {open.status === "pending" && openOffer?.cancelReason !== "fake" && (
              <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft/40 p-3 text-sm text-ink">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> {tr("confirmFirst")}
              </p>
            )}
          </>
        )}
      </DetailSheet>
      {issuing && <ManualRefundDialog onClose={() => setIssuing(false)} />}
      {dialog}
    </>
  );
}

/** The exception path: refund any company, with the reason written down, after a confirmation. */
function ManualRefundDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations();
  const tr = useTranslations("admin.refunds");
  const lang = useLang();
  const partners = useStore((s) => s.partners).filter((p) => p.status === "approved");
  const orders = useStore((s) => s.orders);
  const issueRefund = useStore((s) => s.issueRefund);
  const { confirm, dialog } = useConfirm();
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [orderId, setOrderId] = useState(NO_LEAD);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const partner = partners.find((p) => p.id === partnerId);
  const value = Number(amount) || 0;
  const valid = !!partner && value > 0 && note.trim().length > 0;

  // money reaches the wallet at once, so the admin checks company, amount and reason once more
  const review = () => {
    if (!valid) return;
    const offerId = orders.find((o) => o.id === orderId)?.offerId;
    confirm({
      title: tr("approveTitle", { amount: value, name: partner!.name }),
      body: (
        <span className="block space-y-2">
          <span className="block">{tr("approveWallet")}</span>
          <span className="block rounded-lg bg-surface-2 p-3 text-ink">
            <span className="block font-semibold">{tr("walletChange", { before: partner!.wallet, after: partner!.wallet + value })}</span>
            {offerId && <span className="block text-xs text-muted-foreground">{tr("lead")}: {offerId}</span>}
            <span className="mt-1 block">“{note.trim()}”</span>
          </span>
          <span className="block text-xs">{tr("noUndo")}</span>
        </span>
      ),
      tone: "success",
      confirmLabel: tr("confirmRefund", { amount: value }),
      onConfirm: submit,
    });
  };

  const submit = () => {
    if (!valid) return;
    issueRefund({ partnerId, amount: value, reason: "manual", orderId: orderId === NO_LEAD ? undefined : orderId, note: note.trim() });
    toast.success(tr("refunded", { amount: value, name: partner!.name }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{tr("issue")}</DialogTitle>
          <DialogDescription>{tr("issueHint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("common.fields.company")} required className="sm:col-span-2" hint={partner ? tr("walletBalance", { amount: partner.wallet }) : undefined}>
            <Select value={partnerId} onValueChange={(v) => { setPartnerId(v); setOrderId(NO_LEAD); }} options={partners.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
          <Field label={tr("lead")}>
            <Select
              value={orderId}
              onValueChange={(v) => setOrderId(v)}
              options={[{ value: NO_LEAD, label: "–" }, ...orders.filter((o) => o.partnerId === partnerId).map((o) => ({ value: o.id, label: `${o.offerId} · ${formatCHF(o.price, lang)}` }))]}
            />
          </Field>
          <Field label={`${t("common.fields.amount")} (CHF)`} required>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={tr("note")} required className="sm:col-span-2">
            <Textarea rows={3} value={note} placeholder={tr("notePh")} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.actions.cancel")}</Button>
          <Button onClick={review} disabled={!valid}><RotateCcw /> {tr("issue")} · {formatCHF(value, lang)}</Button>
        </DialogFooter>
        {dialog}
      </DialogContent>
    </Dialog>
  );
}
