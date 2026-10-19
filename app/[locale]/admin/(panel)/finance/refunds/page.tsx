"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, Check, Clock, Plus, RotateCcw, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Refund, RefundMethod, RefundReason } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { inLastDays } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";

const REASONS: RefundReason[] = ["fake_lead", "duplicate_lead", "cancelled_job", "wallet_payout", "goodwill"];
const METHODS: RefundMethod[] = ["wallet", "bank"];

type Draft = { partnerId: string; amount: string; reason: RefundReason; method: RefundMethod; orderId: string; note: string };
const NO_LEAD = "none";

export default function CompanyRefundsPage() {
  const t = useTranslations();
  const tr = useTranslations("admin.refunds");
  const lang = useLang();
  const refunds = useStore((s) => s.refunds);
  const orders = useStore((s) => s.orders);
  const partners = useStore((s) => s.partners);
  const issueRefund = useStore((s) => s.issueRefund);
  const decideRefund = useStore((s) => s.decideRefund);
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();
  const [draft, setDraft] = useState<Draft | null>(null);

  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const sum = (rs: Refund[]) => rs.reduce((a, r) => a + r.amount, 0);
  const pending = refunds.filter((r) => r.status === "pending");
  const refunded30 = refunds.filter((r) => r.status === "refunded" && inLastDays(r.decidedAt ?? r.createdAt, 30));
  const wallet30 = refunded30.filter((r) => r.method === "wallet");

  /** What approving does to the money, in words — differs for wallet credits, bank refunds and wallet payouts. */
  const effect = (r: Pick<Refund, "amount" | "method" | "reason">) =>
    r.method === "wallet" ? tr("approveWallet") : r.reason === "wallet_payout" ? tr("approvePayout", { amount: r.amount }) : tr("approveBank");

  const approve = (r: Refund) => {
    const name = partnerMap[r.partnerId]?.name ?? "";
    const balance = partnerMap[r.partnerId]?.wallet ?? 0;
    if (r.reason === "wallet_payout" && r.amount > balance) {
      toast.error(tr("payoutTooHigh", { amount: balance }));
      return;
    }
    confirm({
      title: tr("approveTitle", { amount: r.amount, name }),
      body: effect(r),
      tone: "success",
      confirmLabel: t("common.actions.approve"),
      onConfirm: () => {
        decideRefund(r.id, "refunded");
        toast.success(tr("refunded", { amount: r.amount, name }));
      },
    });
  };
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

  // issue dialog
  const approvedPartners = partners.filter((p) => p.status === "approved");
  const draftPartner = draft ? partnerMap[draft.partnerId] : undefined;
  const draftOrders = draft ? orders.filter((o) => o.partnerId === draft.partnerId) : [];
  const amount = Number(draft?.amount) || 0;
  const payoutTooHigh = !!draft && draft.reason === "wallet_payout" && amount > (draftPartner?.wallet ?? 0);
  const canIssue = !!draft && !!draftPartner && amount > 0 && !payoutTooHigh;

  const openIssue = () => {
    const p = approvedPartners[0];
    setDraft({ partnerId: p?.id ?? "", amount: "", reason: "duplicate_lead", method: "wallet", orderId: NO_LEAD, note: "" });
  };
  const issue = () => {
    if (!draft || !canIssue) return;
    const name = draftPartner!.name;
    confirm({
      title: tr("approveTitle", { amount, name }),
      body: effect({ amount, method: draft.method, reason: draft.reason }),
      tone: "success",
      confirmLabel: tr("issue"),
      onConfirm: () => {
        issueRefund({
          partnerId: draft.partnerId,
          amount,
          reason: draft.reason,
          method: draft.method,
          orderId: draft.orderId === NO_LEAD ? undefined : draft.orderId,
          note: draft.note.trim(),
        });
        setDraft(null);
        toast.success(tr("refunded", { amount, name }));
      },
    });
  };

  const columns: ColumnDef<Refund, unknown>[] = [
    { id: "id", header: "#", accessorFn: (r) => r.id, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    {
      id: "partner",
      header: t("common.fields.company"),
      accessorFn: (r) => partnerMap[r.partnerId]?.name ?? "–",
      cell: ({ row: { original: r } }) => (
        <Link href={`/admin/partners/${r.partnerId}`} className="flex items-center gap-2 font-semibold text-ink hover:text-primary">
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
      accessorFn: (r) => (r.orderId ? orderMap[r.orderId]?.offerId ?? "" : ""),
      cell: (c) =>
        c.getValue() ? (
          <Link href={`/admin/leads/${c.getValue() as string}`} className="font-mono text-[13px] font-semibold text-primary hover:underline">{c.getValue() as string}</Link>
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
    },
    {
      id: "method",
      header: tr("method"),
      accessorFn: (r) => r.method,
      cell: (c) => (
        <span className="flex items-center gap-1.5 text-muted-foreground [&_svg]:size-4">
          {c.getValue() === "wallet" ? <Wallet /> : <Banknote />} {tr(`methods.${c.getValue() as RefundMethod}`)}
        </span>
      ),
    },
    { id: "amount", header: t("common.fields.amount"), accessorFn: (r) => r.amount, cell: (c) => <span className="font-bold">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "date", header: t("common.fields.date"), accessorFn: (r) => r.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (r) => r.status,
      cell: ({ row: { original: r } }) =>
        r.status === "pending" ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="success" onClick={() => approve(r)}><Check /> {t("common.actions.approve")}</Button>
            <Button size="icon-sm" variant="danger-soft" onClick={() => reject(r)} aria-label={t("common.actions.reject")}><X /></Button>
          </div>
        ) : (
          <StatusBadge status={r.status} />
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={tr("title")}
        subtitle={tr("subtitle")}
        actions={<Button onClick={openIssue}><Plus /> {tr("issue")}</Button>}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={tr("pendingTotal")} value={formatCHF(sum(pending), lang)} icon={<Clock />} tone="warning" footer={tr("requests", { count: pending.length })} />
        <KpiCard label={tr("refunded30")} value={formatCHF(sum(refunded30), lang)} icon={<RotateCcw />} tone="success" footer={tr("requests", { count: refunded30.length })} />
        <KpiCard label={tr("walletCredits")} value={formatCHF(sum(wallet30), lang)} icon={<Wallet />} footer={tr("requests", { count: wallet30.length })} />
      </div>
      <DataTable
        data={refunds}
        columns={columns}
        search={(r) => `${r.id} ${partnerMap[r.partnerId]?.name ?? ""} ${r.note} ${r.orderId ? orderMap[r.orderId]?.offerId ?? "" : ""}`}
        filters={[
          { id: "status", label: t("common.fields.status"), options: (["pending", "refunded", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (r) => r.status },
          { id: "reason", label: tr("reason"), options: REASONS.map((x) => ({ value: x, label: tr(`reasons.${x}`) })), get: (r) => r.reason },
          { id: "method", label: tr("method"), options: METHODS.map((x) => ({ value: x, label: tr(`methods.${x}`) })), get: (r) => r.method },
        ]}
        rowClassName={(r) => (r.status === "pending" ? "bg-warning-soft/25" : undefined)}
      />

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{tr("issue")}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("common.fields.company")} required className="sm:col-span-2" hint={draftPartner ? tr("walletBalance", { amount: draftPartner.wallet }) : undefined}>
                <Select
                  value={draft.partnerId}
                  onValueChange={(v) => setDraft({ ...draft, partnerId: v, orderId: NO_LEAD })}
                  options={approvedPartners.map((p) => ({ value: p.id, label: p.name }))}
                />
              </Field>
              <Field label={tr("reason")} required>
                <Select
                  value={draft.reason}
                  // a wallet payout always goes to the bank and isn't tied to a lead
                  onValueChange={(v) => setDraft({ ...draft, reason: v as RefundReason, ...(v === "wallet_payout" ? { method: "bank" as const, orderId: NO_LEAD } : {}) })}
                  options={REASONS.map((x) => ({ value: x, label: tr(`reasons.${x}`) }))}
                />
              </Field>
              <Field label={tr("method")} required>
                <Select
                  value={draft.method}
                  disabled={draft.reason === "wallet_payout"}
                  onValueChange={(v) => setDraft({ ...draft, method: v as RefundMethod })}
                  options={METHODS.map((x) => ({ value: x, label: tr(`methods.${x}`) }))}
                />
              </Field>
              <Field label={tr("lead")}>
                <Select
                  value={draft.orderId}
                  disabled={draft.reason === "wallet_payout"}
                  onValueChange={(v) => {
                    const o = orderMap[v];
                    setDraft({ ...draft, orderId: v, amount: o ? String(o.price) : draft.amount });
                  }}
                  options={[
                    { value: NO_LEAD, label: "–" },
                    ...draftOrders.map((o) => ({ value: o.id, label: `${o.offerId} · ${formatCHF(o.price, lang)}` })),
                  ]}
                />
              </Field>
              <Field label={`${t("common.fields.amount")} (CHF)`} required error={payoutTooHigh ? tr("payoutTooHigh", { amount: draftPartner?.wallet ?? 0 }) : undefined}>
                <Input type="number" min={1} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} aria-invalid={payoutTooHigh} />
              </Field>
              <Field label={tr("note")} className="sm:col-span-2">
                <Textarea rows={3} value={draft.note} placeholder={tr("notePh")} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </Field>
              <p className="text-xs text-muted-foreground sm:col-span-2">{tr("issueHint")}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>{t("common.actions.cancel")}</Button>
            <Button onClick={issue} disabled={!canIssue}>{tr("issue")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
