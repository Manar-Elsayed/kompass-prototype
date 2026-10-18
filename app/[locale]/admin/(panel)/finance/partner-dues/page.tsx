"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Clock, Receipt, X } from "lucide-react";
import { toast } from "sonner";
import type { PartnerDue } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { inLastDays } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";

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
  const confirmed30 = dues.filter((d) => d.status === "confirmed" && inLastDays(d.createdAt, 30));

  const approve = (d: PartnerDue) =>
    confirm({
      title: td("confirmTitle", { amount: d.amount, name: partnerMap[d.partnerId]?.name ?? "" }),
      body: td("confirmBody"),
      tone: "success",
      confirmLabel: t("common.actions.approve"),
      onConfirm: () => {
        decideDue(d.id, "confirmed");
        toast.success(td("confirmed"));
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
    { id: "id", header: t("admin.shop.order"), accessorFn: (d) => d.id, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    { id: "partner", header: t("common.fields.company"), accessorFn: (d) => partnerMap[d.partnerId]?.name ?? "–", cell: (c) => <span className="flex items-center gap-2 font-semibold text-ink"><Avatar name={c.getValue() as string} square className="size-7 text-[10px]" />{c.getValue() as string}</span> },
    { id: "amount", header: t("common.fields.amount"), accessorFn: (d) => d.amount, cell: (c) => <span className="font-bold">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "method", header: td("method"), accessorFn: (d) => d.method, cell: (c) => td(c.getValue() as "card") },
    { id: "ref", header: t("common.fields.reference"), accessorFn: (d) => d.reference, cell: (c) => <Mono className="text-muted-foreground">{c.getValue() as string}</Mono> },
    {
      id: "receipt",
      header: td("receipt"),
      enableSorting: false,
      cell: ({ row: { original: d } }) => (
        <button onClick={() => setReceipt(d)} className="group relative block h-10 w-16 overflow-hidden rounded-md border bg-surface-2" aria-label={td("receipt")}>
          <Image src={d.receipt} alt="" fill className="object-cover transition group-hover:scale-110" sizes="64px" />
        </button>
      ),
    },
    { id: "date", header: t("common.fields.date"), accessorFn: (d) => d.createdAt, cell: (c) => <span className="text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (d) => d.status,
      cell: ({ row: { original: d } }) =>
        d.status === "pending" ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="success" onClick={() => approve(d)}><Check /> {t("common.actions.approve")}</Button>
            <Button size="icon-sm" variant="danger-soft" onClick={() => cancel(d)} aria-label={t("common.actions.reject")}><X /></Button>
          </div>
        ) : (
          <StatusBadge status={d.status} />
        ),
    },
  ];

  return (
    <>
      <PageHeader title={td("title")} subtitle={td("subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={td("pendingTotal")} value={formatCHF(pending.reduce((a, d) => a + d.amount, 0), lang)} icon={<Clock />} tone="warning" footer={`${pending.length} ${td("receipt")}`} />
        <KpiCard label={td("confirmedTotal")} value={formatCHF(confirmed30.reduce((a, d) => a + d.amount, 0), lang)} icon={<CheckCircle2 />} tone="success" footer={`${confirmed30.length} ${td("receipt")}`} />
        <KpiCard label={t("common.table.all")} value={dues.length} icon={<Receipt />} />
      </div>
      <DataTable
        data={dues}
        columns={columns}
        search={(d) => `${d.id} ${d.reference} ${partnerMap[d.partnerId]?.name}`}
        filters={[{ id: "status", label: t("common.fields.status"), options: (["pending", "confirmed", "canceled"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (d) => d.status }]}
        rowClassName={(d) => (d.status === "pending" ? "bg-warning-soft/25" : undefined)}
      />

      <Dialog open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{td("receipt")} · {receipt?.id}</DialogTitle>
          </DialogHeader>
          {receipt && (
            <>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2">
                <Image src={receipt.receipt} alt="" fill className="object-contain" sizes="640px" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span><strong>{partnerMap[receipt.partnerId]?.name}</strong> · {formatCHF(receipt.amount, lang)} · {td(receipt.method)}</span>
                {receipt.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button variant="danger-soft" size="sm" onClick={() => { setReceipt(null); cancel(receipt); }}>{t("common.actions.reject")}</Button>
                    <Button variant="success" size="sm" onClick={() => { setReceipt(null); approve(receipt); }}>{t("common.actions.approve")}</Button>
                  </div>
                ) : (
                  <StatusBadge status={receipt.status} />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
