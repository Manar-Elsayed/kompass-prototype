"use client";

import { useTranslations } from "next-intl";
import { Building2, Check, CheckCircle2, Clock, Receipt, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { PartnerDue } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { inLastDays } from "@/lib/mock/selectors";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/controls";
import { DueStatusBadge } from "@/components/shared/due-status";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";
import { useDueDecision } from "@/components/admin/due-actions";

export default function PartnerDuesPage() {
  const t = useTranslations();
  const td = useTranslations("admin.dues");
  const lang = useLang();
  const dues = useStore((s) => s.dues);
  const partnerMap = usePartnerMap();
  const router = useRouter();
  const { approve, reject, dialog } = useDueDecision();
  const href = (d: PartnerDue) => `/admin/finance/partner-dues/${d.id}`;

  const pending = dues.filter((d) => d.status === "pending");
  // approved in the last 30 days (by the decision date, not the upload date)
  const confirmed30 = dues.filter((d) => d.status === "confirmed" && inLastDays(d.decidedAt ?? d.createdAt, 30));

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
        viewHref={href(d)}
        actions={[
          { label: t("common.actions.approve"), icon: <Check />, onSelect: () => approve(d), hidden: d.status !== "pending" },
          { label: t("common.actions.reject"), icon: <X />, tone: "danger", onSelect: () => reject(d), hidden: d.status !== "pending" },
          { label: t("admin.rows.openCompany"), icon: <Building2 />, href: `/admin/partners/${d.partnerId}`, separated: d.status === "pending" },
        ]}
      />
    )),
  ];

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
        onRowClick={(d) => router.push(href(d))}
        rowClassName={(d) => (d.status === "pending" ? "bg-warning-soft/25" : undefined)}
      />

      {dialog}
    </>
  );
}
