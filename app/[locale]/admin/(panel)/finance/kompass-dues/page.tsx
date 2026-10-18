"use client";

import { useTranslations } from "next-intl";
import { BellRing, Scale, Wallet, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import type { Partner } from "@/lib/types";
import { cn, formatCHF } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { partnerLedger } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Avatar, Progress } from "@/components/ui/controls";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { KpiCard, PageHeader } from "@/components/admin/ui";

type Row = Partner & ReturnType<typeof partnerLedger>;

export default function KompassDuesPage() {
  const t = useTranslations();
  const tk = useTranslations("admin.kompassDues");
  const lang = useLang();
  const router = useRouter();
  const db = useStore();
  const rows: Row[] = db.partners.filter((p) => p.status === "approved").map((p) => ({ ...p, ...partnerLedger(db, p.id) }));
  const purchased = rows.reduce((a, r) => a + r.purchased, 0);
  const paid = rows.reduce((a, r) => a + r.paid, 0);
  const outstanding = rows.reduce((a, r) => a + r.outstanding, 0);

  const columns: ColumnDef<Row, unknown>[] = [
    { id: "name", header: t("common.fields.company"), accessorFn: (r) => r.name, cell: ({ row: { original: r } }) => <span className="flex items-center gap-2 font-semibold text-ink"><Avatar name={r.name} square className="size-8" />{r.name}</span> },
    { id: "leads", header: tk("purchased"), accessorFn: (r) => r.leads },
    { id: "purchased", header: t("admin.partners.spent"), accessorFn: (r) => r.purchased, cell: (c) => formatCHF(c.getValue() as number, lang) },
    { id: "paid", header: tk("paid"), accessorFn: (r) => r.paid, cell: (c) => <span className="text-success">{formatCHF(c.getValue() as number, lang)}</span> },
    {
      id: "progress",
      header: "%",
      enableSorting: false,
      cell: ({ row: { original: r } }) => (
        <div className="w-28">
          <Progress value={r.purchased ? (r.paid / r.purchased) * 100 : 100} tone={r.outstanding ? "accent" : "success"} className="h-1.5" />
        </div>
      ),
    },
    { id: "outstanding", header: tk("outstanding"), accessorFn: (r) => r.outstanding, cell: (c) => <span className={cn("font-bold", (c.getValue() as number) > 0 ? "text-accent" : "text-muted-foreground")}>{formatCHF(c.getValue() as number, lang)}</span> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: r } }) =>
        r.outstanding > 0 ? (
          <Button size="sm" variant="outline" onClick={() => toast.success(tk("reminded", { name: r.name }))}>
            <BellRing /> {tk("remind")}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader title={tk("title")} subtitle={tk("subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("admin.partners.spent")} value={formatCHF(purchased, lang)} icon={<Banknote />} />
        <KpiCard label={tk("paid")} value={formatCHF(paid, lang)} icon={<Wallet />} tone="success" />
        <KpiCard label={tk("outstanding")} value={formatCHF(outstanding, lang)} icon={<Scale />} tone="accent" />
      </div>
      <DataTable
        data={rows}
        columns={columns}
        search={(r) => r.name}
        initialSort={[{ id: "outstanding", desc: true }]}
        onRowClick={(r) => router.push(`/admin/partners/${r.id}`)}
        filters={[{ id: "o", label: tk("balance"), options: [{ value: "due", label: tk("outstanding") }, { value: "ok", label: tk("paid") }], get: (r) => (r.outstanding > 0 ? "due" : "ok") }]}
      />
    </>
  );
}
