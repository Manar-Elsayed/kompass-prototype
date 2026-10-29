"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Partner } from "@/lib/types";
import { formatCHF, formatDate, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { activityStatus, inLastDays, lastPaymentAt, type ActivityStatus } from "@/lib/mock/selectors";
import { Avatar } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { useCompanyActions } from "@/components/admin/company-actions";
import { PageHeader } from "@/components/admin/ui";

type Row = Partner & { leads30: number; spend30: number; lastPayment?: string; activity: ActivityStatus };
const STATUSES: ActivityStatus[] = ["active", "slowing", "dormant", "inactive"];

export default function ActivityPage() {
  const t = useTranslations();
  const lang = useLang();
  const router = useRouter();
  const partners = useStore((s) => s.partners).filter((p) => p.status === "approved");
  const orders = useStore((s) => s.orders);
  const topups = useStore((s) => s.topups);
  const dues = useStore((s) => s.dues);
  const { actionsFor, dialogs } = useCompanyActions();

  const rows: Row[] = partners.map((p) => {
    const mine = orders.filter((o) => o.partnerId === p.id);
    const recent = mine.filter((o) => inLastDays(o.createdAt, 30));
    const lastPayment = lastPaymentAt({ topups, dues }, p.id);
    return {
      ...p,
      leads30: recent.length,
      spend30: recent.reduce((a, o) => a + o.price, 0),
      lastPayment,
      activity: activityStatus(p, recent.length, lastPayment),
    };
  });

  const tone = { active: "success", slowing: "warning", dormant: "neutral", inactive: "danger" } as const;

  const columns: ColumnDef<Row, unknown>[] = [
    { id: "name", header: t("common.fields.company"), accessorFn: (r) => r.name, cell: ({ row: { original: r } }) => (
        <span className="flex items-center gap-3">
          <Avatar name={r.name} square className="size-8 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{r.name}</span>
            <span className="block text-xs text-muted-foreground">{r.city} · {r.canton}</span>
          </span>
        </span>
      ),
    },
    { id: "leads30", header: t("admin.activity.last30"), accessorFn: (r) => r.leads30, cell: (c) => <span className="font-semibold">{c.getValue() as number}</span> },
    { id: "spend", header: t("admin.activity.spent30"), accessorFn: (r) => r.spend30, cell: (c) => formatCHF(c.getValue() as number, lang) },
    { id: "lastSeen", header: t("common.fields.lastSeen"), accessorFn: (r) => r.lastSeen, cell: (c) => <span className="text-muted-foreground">{timeAgo(c.getValue() as string, lang)}</span> },
    {
      id: "lastPayment",
      header: t("admin.activity.lastPayment"),
      // never-paid companies sort as the oldest
      accessorFn: (r) => r.lastPayment ?? "",
      cell: ({ row: { original: r } }) =>
        r.lastPayment ? (
          <div className="whitespace-nowrap">
            <p>{formatDate(r.lastPayment, lang)}</p>
            <p className="text-xs text-muted-foreground">{timeAgo(r.lastPayment, lang)}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">{t("admin.activity.never")}</span>
        ),
    },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (r) => STATUSES.indexOf(r.activity),
      cell: ({ row: { original: r } }) => (
        <Badge dot tone={tone[r.activity]} title={t(`admin.activity.hints.${r.activity}`)}>{t(`admin.activity.status.${r.activity}`)}</Badge>
      ),
    },
    // no money actions here: this page is about engagement, credit is given from Wallets
    actionsColumn<Row>((r) => <RowActions viewHref={`/admin/partners/${r.id}`} actions={actionsFor(r, { money: false })} />),
  ];

  return (
    <>
      <PageHeader title={t("admin.activity.title")} subtitle={t("admin.activity.subtitle")} />
      <DataTable
        data={rows}
        columns={columns}
        search={(r) => `${r.name} ${r.city} ${r.canton}`}
        searchPlaceholder={t("admin.activity.searchPh")}
        initialSort={[{ id: "leads30", desc: true }]}
        onRowClick={(r) => router.push(`/admin/partners/${r.id}`)}
        filters={[{ id: "status", label: t("common.fields.status"), options: STATUSES.map((h) => ({ value: h, label: t(`admin.activity.status.${h}`) })), get: (r) => r.activity }]}
      />
      {dialogs}
    </>
  );
}
