"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Partner } from "@/lib/types";
import { formatCHF, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { inLastDays, refNow } from "@/lib/mock/selectors";
import { Avatar } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/ui";

type Row = Partner & { leads30: number; spend30: number; health: "healthy" | "atRisk" | "dormant"; spark: number[] };

export default function ActivityPage() {
  const t = useTranslations();
  const lang = useLang();
  const router = useRouter();
  const partners = useStore((s) => s.partners).filter((p) => p.status === "approved");
  const orders = useStore((s) => s.orders);
  const now = refNow();

  const rows: Row[] = partners.map((p) => {
    const mine = orders.filter((o) => o.partnerId === p.id);
    const recent = mine.filter((o) => inLastDays(o.createdAt, 30));
    const daysSince = (now - Date.parse(p.lastSeen)) / 86_400_000;
    const spark = Array.from({ length: 6 }, (_, w) => mine.filter((o) => inLastDays(o.createdAt, 30, (5 - w) * 30)).length);
    return {
      ...p,
      leads30: recent.length,
      spend30: recent.reduce((a, o) => a + o.price, 0),
      health: p.banned || daysSince > 14 ? "dormant" : recent.length < 2 ? "atRisk" : "healthy",
      spark,
    };
  });

  const tone = { healthy: "success", atRisk: "warning", dormant: "neutral" } as const;

  const columns: ColumnDef<Row, unknown>[] = [
    { id: "name", header: t("common.fields.company"), accessorFn: (r) => r.name, cell: ({ row: { original: r } }) => <span className="flex items-center gap-3 font-semibold text-ink"><Avatar name={r.name} square className="size-8" />{r.name}</span> },
    { id: "leads30", header: t("admin.activity.last30"), accessorFn: (r) => r.leads30, cell: (c) => <span className="font-semibold">{c.getValue() as number}</span> },
    { id: "spend", header: t("admin.partners.spent"), accessorFn: (r) => r.spend30, cell: (c) => formatCHF(c.getValue() as number, lang) },
    {
      id: "trend",
      header: "6m",
      enableSorting: false,
      cell: ({ row: { original: r } }) => {
        const max = Math.max(1, ...r.spark);
        return (
          <div className="flex h-7 items-end gap-0.5" dir="ltr">
            {r.spark.map((v, i) => (
              <span key={i} className="w-2 rounded-sm bg-primary/70" style={{ height: `${Math.max(8, (v / max) * 100)}%`, opacity: 0.35 + (i / 6) * 0.65 }} />
            ))}
          </div>
        );
      },
    },
    { id: "lastSeen", header: t("common.fields.lastSeen"), accessorFn: (r) => r.lastSeen, cell: (c) => <span className="text-muted-foreground">{timeAgo(c.getValue() as string, lang)}</span> },
    { id: "health", header: t("admin.activity.health"), accessorFn: (r) => r.health, cell: (c) => <Badge dot tone={tone[c.getValue() as Row["health"]]}>{t(`admin.activity.${c.getValue()}`)}</Badge> },
  ];

  return (
    <>
      <PageHeader title={t("admin.activity.title")} subtitle={t("admin.activity.subtitle")} />
      <DataTable
        data={rows}
        columns={columns}
        search={(r) => `${r.name} ${r.city}`}
        initialSort={[{ id: "leads30", desc: true }]}
        onRowClick={(r) => router.push(`/admin/partners/${r.id}`)}
        filters={[{ id: "health", label: t("admin.activity.health"), options: (["healthy", "atRisk", "dormant"] as const).map((h) => ({ value: h, label: t(`admin.activity.${h}`) })), get: (r) => r.health }]}
      />
    </>
  );
}
