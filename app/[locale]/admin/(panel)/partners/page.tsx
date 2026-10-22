"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Partner } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerRatings, useServiceMap } from "@/lib/mock/hooks";
import { documentState } from "@/lib/mock/selectors";
import { DocStateBadge } from "@/components/admin/doc-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/controls";
import { StatusBadge } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/ui";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { useCompanyActions } from "@/components/admin/company-actions";

export default function PartnersPage() {
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const partners = useStore((s) => s.partners).filter((p) => p.status === "approved");
  const orders = useStore((s) => s.orders);
  const services = useStore((s) => s.services);
  const patch = useStore((s) => s.patch);
  const ratings = usePartnerRatings();
  const serviceMap = useServiceMap();
  const { actionsFor, dialogs } = useCompanyActions();

  const columns: ColumnDef<Partner, unknown>[] = [
    {
      id: "name",
      header: t("common.fields.company"),
      accessorFn: (p) => p.name,
      cell: ({ row: { original: p } }) => (
        <span className="flex items-center gap-3">
          <Avatar name={p.name} square className="size-9" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{p.name}</span>
            <span className="block text-xs text-muted-foreground">{p.zip} {p.city} · {p.canton}</span>
          </span>
        </span>
      ),
    },
    {
      id: "services",
      header: t("common.fields.services"),
      accessorFn: (p) => p.serviceIds.map((id) => L(serviceMap[id]?.name)).join(", "),
      enableSorting: false,
      cell: ({ row: { original: p } }) => (
        <div className="flex max-w-56 flex-wrap gap-1">
          {p.serviceIds.slice(0, 2).map((id) => (
            <Badge key={id} tone="neutral">{L(serviceMap[id]?.name)}</Badge>
          ))}
          {p.serviceIds.length > 2 && <Badge tone="outline">+{p.serviceIds.length - 2}</Badge>}
        </div>
      ),
    },
    { id: "leads", header: t("admin.partners.leadsBought"), accessorFn: (p) => orders.filter((o) => o.partnerId === p.id).length, cell: (c) => <span className="font-semibold">{c.getValue() as number}</span> },
    { id: "wallet", header: t("admin.partners.wallet"), accessorFn: (p) => p.wallet, cell: (c) => <span className="font-semibold">{formatCHF(c.getValue() as number, lang)}</span> },
    {
      id: "rating",
      header: t("common.fields.rating"),
      accessorFn: (p) => ratings[p.id]?.avg ?? 0,
      cell: ({ row: { original: p } }) =>
        ratings[p.id] ? (
          <span className="flex items-center gap-1 font-semibold">
            <Star className="size-4 fill-amber-400 text-amber-400" /> {ratings[p.id].avg.toFixed(1)}
            <span className="text-xs font-normal text-muted-foreground">({ratings[p.id].count})</span>
          </span>
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
    },
    {
      id: "documents",
      header: t("admin.partners.docs.title"),
      accessorFn: (p) => documentState(p).state,
      cell: ({ row: { original: p } }) => <DocStateBadge partner={p} withDate />,
    },
    { id: "status", header: t("common.fields.status"), accessorFn: (p) => (p.banned ? "banned" : "active"), cell: (c) => <StatusBadge status={c.getValue() as string} /> },
    actionsColumn<Partner>((p) => <RowActions viewHref={`/admin/partners/${p.id}`} actions={actionsFor(p)} />),
  ];

  return (
    <>
      <PageHeader title={t("admin.partners.title")} subtitle={t("admin.partners.subtitle")} />
      <DataTable
        data={partners}
        columns={columns}
        search={(p) => `${p.name} ${p.city} ${p.email} ${p.canton}`}
        onRowClick={(p) => router.push(`/admin/partners/${p.id}`)}
        rowClassName={(p) => (p.banned ? "bg-danger-soft/30" : undefined)}
        filters={[
          { id: "svc", label: t("common.fields.service"), options: services.map((s) => ({ value: s.id, label: L(s.name) })), get: (p) => p.serviceIds },
          { id: "canton", label: "Canton", options: [...new Set(partners.map((p) => p.canton))].sort().map((c) => ({ value: c, label: c })), get: (p) => p.canton },
          { id: "status", label: t("common.fields.status"), options: [{ value: "active", label: t("common.status.active") }, { value: "banned", label: t("common.status.banned") }], get: (p) => (p.banned ? "banned" : "active") },
          {
            id: "docs",
            label: t("admin.partners.docs.title"),
            options: (["missing", "expired", "review", "expiring", "ok"] as const).map((k) => ({ value: k, label: t(`admin.partners.docs.state.${k}`) })),
            get: (p) => documentState(p).state,
          },
        ]}
      />
      {dialogs}
    </>
  );
}
