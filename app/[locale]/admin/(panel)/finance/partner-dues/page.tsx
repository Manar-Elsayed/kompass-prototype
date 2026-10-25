"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Check, CheckCircle2, Clock, Receipt, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { PartnerDue } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { inLastDays } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/controls";
import { useConfirm } from "@/components/shared/bits";
import { DueStatusBadge } from "@/components/shared/due-status";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DetailSheet, RowActions, SheetSection, actionsColumn } from "@/components/admin/row-actions";
import { DL, KpiCard, Mono, PageHeader } from "@/components/admin/ui";
import { MoneyDocument } from "@/components/shared/money-doc";
import { PaymentProof } from "@/components/shared/payment-proof";

export default function PartnerDuesPage() {
  const t = useTranslations();
  const td = useTranslations("admin.dues");
  const lang = useLang();
  const dues = useStore((s) => s.dues);
  const decideDue = useStore((s) => s.decideDue);
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();
  const [receipt, setReceipt] = useState<PartnerDue | null>(null);

  const pending = dues.filter((d) => d.status === "pending");
  // approved in the last 30 days (by the decision date, not the upload date)
  const confirmed30 = dues.filter((d) => d.status === "confirmed" && inLastDays(d.decidedAt ?? d.createdAt, 30));

  const approve = (d: PartnerDue) =>
    confirm({
      title: td("confirmTitle", { amount: d.amount, name: partnerMap[d.partnerId]?.name ?? "" }),
      // an invoice payment marks the invoice paid; a top-up credits the wallet
      body: d.invoiceId ? td("confirmInvoiceBody", { id: d.invoiceId }) : td("confirmBody"),
      tone: "success",
      confirmLabel: t("common.actions.approve"),
      onConfirm: () => {
        decideDue(d.id, "confirmed");
        toast.success(d.invoiceId ? td("confirmedInvoice", { id: d.invoiceId }) : td("confirmed"));
      },
    });
  const cancel = (d: PartnerDue) =>
    confirm({
      title: t("common.confirm.title"),
      body: `${d.id} · ${formatCHF(d.amount, lang)}`,
      tone: "danger",
      confirmLabel: t("common.actions.reject"),
      onConfirm: () => {
        decideDue(d.id, "canceled");
        toast.success(td("canceled"));
      },
    });

  const columns: ColumnDef<PartnerDue, unknown>[] = [
    { id: "id", header: td("payment"), accessorFn: (d) => d.id, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    { id: "partner", header: t("common.fields.company"), accessorFn: (d) => partnerMap[d.partnerId]?.name ?? "–", cell: (c) => <span className="flex items-center gap-2 font-semibold text-ink"><Avatar name={c.getValue() as string} square className="size-7 text-[10px]" />{c.getValue() as string}</span> },
    {
      id: "amount",
      header: t("common.fields.amount"),
      accessorFn: (d) => d.amount,
      // a top-up is the usual case; only a payment for a credit invoice is tagged
      cell: ({ row: { original: d } }) => (
        <div className="whitespace-nowrap">
          <p className="font-bold">{formatCHF(d.amount, lang)}</p>
          {d.invoiceId && <Badge tone="info" className="mt-0.5">{td("forInvoice", { id: d.invoiceId })}</Badge>}
        </div>
      ),
    },
    {
      id: "ref",
      header: t("common.fields.reference"),
      accessorFn: (d) => d.reference,
      cell: ({ row: { original: d } }) => (
        <div className="whitespace-nowrap">
          <Mono className="text-muted-foreground">{d.reference}</Mono>
          <p className="text-xs text-muted-foreground">{td(d.method)}</p>
        </div>
      ),
    },
    { id: "date", header: t("common.fields.date"), accessorFn: (d) => d.createdAt, cell: (c) => <span className="text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (d) => d.status,
      cell: ({ row: { original: d } }) => <DueStatusBadge status={d.status} />,
    },
    actionsColumn<PartnerDue>((d) => (
      <RowActions
        onView={() => setReceipt(d)}
        actions={[
          { label: t("common.actions.approve"), icon: <Check />, onSelect: () => approve(d), hidden: d.status !== "pending" },
          { label: t("common.actions.reject"), icon: <X />, tone: "danger", onSelect: () => cancel(d), hidden: d.status !== "pending" },
          { label: t("admin.rows.openCompany"), icon: <Building2 />, href: `/admin/partners/${d.partnerId}`, separated: d.status === "pending" },
        ]}
      />
    )),
  ];
  const partner = receipt ? partnerMap[receipt.partnerId] : undefined;

  return (
    <>
      <PageHeader title={td("title")} subtitle={td("subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={td("pendingTotal")} value={formatCHF(pending.reduce((a, d) => a + d.amount, 0), lang)} icon={<Clock />} tone="warning" footer={td("receiptsCount", { count: pending.length })} />
        <KpiCard label={td("confirmedTotal")} value={formatCHF(confirmed30.reduce((a, d) => a + d.amount, 0), lang)} icon={<CheckCircle2 />} tone="success" footer={td("receiptsCount", { count: confirmed30.length })} />
        <KpiCard label={t("common.table.all")} value={dues.length} icon={<Receipt />} />
      </div>
      <DataTable
        data={dues}
        columns={columns}
        search={(d) => `${d.id} ${d.reference} ${d.invoiceId ?? ""} ${partnerMap[d.partnerId]?.name}`}
        searchPlaceholder={td("searchPh")}
        wideSearch
        filters={[{ id: "status", label: t("common.fields.status"), options: (["pending", "confirmed", "canceled"] as const).map((s) => ({ value: s, label: t(`common.dueStatus.${s}`) })), get: (d) => d.status }]}
        onRowClick={setReceipt}
        rowClassName={(d) => (d.status === "pending" ? "bg-warning-soft/25" : undefined)}
      />

      <DetailSheet
        wide
        open={!!receipt}
        onOpenChange={(v) => !v && setReceipt(null)}
        title={<Mono className="text-lg">{receipt?.id}</Mono>}
        badge={receipt && <DueStatusBadge status={receipt.status} />}
        subtitle={receipt && `${partner?.name ?? "–"} · ${formatDate(receipt.createdAt, lang)}`}
        footer={
          receipt?.status === "pending" ? (
            <>
              <Button variant="danger-soft" onClick={() => { setReceipt(null); cancel(receipt); }}><X /> {t("common.actions.reject")}</Button>
              <Button variant="success" className="flex-1" onClick={() => { setReceipt(null); approve(receipt); }}><Check /> {t("common.actions.approve")}</Button>
            </>
          ) : undefined
        }
      >
        {receipt && (
          <>
            {/* the payment as a Kompass document */}
            {partner && (
              <MoneyDocument
                doc={{
                  kind: "payment",
                  id: receipt.id,
                  date: receipt.createdAt,
                  partner,
                  line: receipt.invoiceId ? td("forInvoice", { id: receipt.invoiceId }) : td("forWallet"),
                  amount: receipt.amount,
                  method: td(receipt.method),
                  reference: receipt.reference,
                  badge: <DueStatusBadge status={receipt.status} />,
                  note:
                    receipt.status === "pending" ? (
                      <p className="flex items-start gap-2 rounded-lg bg-warning-soft/50 p-3 text-xs text-ink"><Clock className="mt-0.5 size-3.5 shrink-0 text-warning" /> {td("noteWaiting")}</p>
                    ) : (
                      <p className={receipt.status === "confirmed" ? "flex items-center gap-2 font-semibold text-success" : "flex items-center gap-2 font-semibold text-danger"}>
                        {receipt.status === "confirmed" ? <CheckCircle2 className="size-4" /> : <X className="size-4" />}
                        {td(receipt.status === "confirmed" ? "noteApproved" : "noteRejected", { date: formatDate(receipt.decidedAt ?? receipt.createdAt, lang) })}
                      </p>
                    ),
                }}
              />
            )}
            {/* what the company uploaded as proof */}
            <SheetSection title={td("proofTitle")}>
              <PaymentProof due={receipt} partner={partner} />
            </SheetSection>
            {partner && (
              <SheetSection title={t("admin.rows.walletImpact")}>
                <DL
                  items={[
                    { label: t("common.fields.company"), value: <Link href={`/admin/partners/${partner.id}`} className="font-semibold text-primary hover:underline">{partner.name}</Link> },
                    { label: t("admin.rows.walletNow"), value: formatCHF(partner.wallet, lang) },
                    {
                      label: receipt.status === "pending" ? t("admin.rows.walletAfter") : t("common.fields.status"),
                      value:
                        receipt.status !== "pending" ? (
                          <DueStatusBadge status={receipt.status} />
                        ) : receipt.invoiceId ? (
                          <span className="text-muted-foreground">{formatCHF(partner.wallet, lang)} · {td("walletUnchanged")}</span>
                        ) : (
                          <span className="font-bold text-success">{formatCHF(partner.wallet + receipt.amount, lang)}</span>
                        ),
                    },
                  ]}
                />
              </SheetSection>
            )}
          </>
        )}
      </DetailSheet>
      {dialog}
    </>
  );
}
