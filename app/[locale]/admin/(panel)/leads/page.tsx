"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { Offer } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { daysLeft, isExpiringSoon } from "@/lib/mock/selectors";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { Mono, PageHeader } from "@/components/admin/ui";

const STATUSES = ["new", "in_progress", "completed", "expired", "cancelled"] as const;

export default function LeadsPage() {
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const services = useStore((s) => s.services);
  const patch = useStore((s) => s.patch);
  const serviceMap = useServiceMap();
  const { confirm, dialog } = useConfirm();

  const sold = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) m[o.offerId] = (m[o.offerId] ?? 0) + 1;
    return m;
  }, [orders]);

  const toggleVisible = (o: Offer) =>
    confirm({
      title: t(o.active ? "admin.leads.deactivateTitle" : "admin.leads.activateTitle"),
      body: t(o.active ? "admin.leads.deactivateBody" : "admin.leads.activateBody", { id: o.id }),
      tone: o.active ? "danger" : "success",
      onConfirm: () => {
        patch("offers", o.id, { active: !o.active });
        toast.success(t("common.toast.updated"));
      },
    });

  const columns: ColumnDef<Offer, unknown>[] = [
    { id: "id", header: t("admin.leads.id"), accessorFn: (o) => o.id, cell: ({ row }) => <Mono>{row.original.id}</Mono> },
    {
      id: "customer",
      header: t("admin.leads.customer"),
      accessorFn: (o) => `${o.firstName} ${o.lastName}`,
      cell: ({ row: { original: o } }) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{o.firstName} {o.lastName}</p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">{o.email}</p>
        </div>
      ),
    },
    { id: "service", header: t("common.fields.service"), accessorFn: (o) => L(serviceMap[o.serviceId]?.name), cell: (c) => <span className="whitespace-nowrap">{c.getValue() as string}</span> },
    {
      id: "route",
      header: t("admin.leads.route"),
      accessorFn: (o) => `${o.from.city} → ${o.to.city}`,
      cell: ({ row: { original: o } }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {o.from.zip} {o.from.city} <span className="text-foreground/40">→</span> {o.to.zip} {o.to.city}
        </span>
      ),
    },
    { id: "execution", header: t("admin.leads.execution"), accessorFn: (o) => o.executionDate, cell: (c) => <span className="whitespace-nowrap">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "sold",
      header: t("admin.leads.sold"),
      accessorFn: (o) => sold[o.id] ?? 0,
      cell: ({ row: { original: o } }) => {
        const n = sold[o.id] ?? 0;
        return (
          <span className={n >= o.offersWanted ? "font-bold text-success" : n ? "font-semibold text-ink" : "text-muted-foreground"}>
            {n}/{o.offersWanted}
          </span>
        );
      },
    },
    {
      id: "expires",
      header: t("admin.leads.expires"),
      accessorFn: (o) => o.deadline,
      cell: ({ row: { original: o } }) =>
        o.status === "in_progress" || o.status === "new" ? (
          <span className={cn("whitespace-nowrap", isExpiringSoon(o) ? "font-semibold text-warning" : "text-muted-foreground")}>
            {t("admin.leads.expiresIn", { days: Math.max(0, daysLeft(o.deadline)) })}
          </span>
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
    },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (o) => o.status,
      cell: ({ row: { original: o } }) => (
        <span className="flex items-center gap-1.5">
          <StatusBadge status={o.status} />
          {o.noShow && o.noShow.status !== "resolved" && <Badge tone="danger">{t("admin.leads.noShowOpen")}</Badge>}
          {o.status === "new" && o.flags.length > 0 && (
            <span title={t("admin.leads.flagged")} className="text-warning"><AlertTriangle className="size-4" aria-label={t("admin.leads.flagged")} /></span>
          )}
        </span>
      ),
    },
    { id: "created", header: t("common.fields.created"), accessorFn: (o) => o.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "visible",
      header: t("admin.leads.visible"),
      accessorFn: (o) => (o.active ? 1 : 0),
      cell: ({ row: { original: o } }) =>
        o.status === "in_progress" ? <Switch checked={o.active} onCheckedChange={() => toggleVisible(o)} aria-label={t("admin.leads.visible")} /> : null,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: o } }) => (
        <Button asChild variant="ghost" size="icon-sm" aria-label={t("common.actions.view")}>
          <Link href={`/admin/leads/${o.id}`}>
            <Eye />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.leads.title")}
        subtitle={t("admin.leads.subtitle")}
        actions={
          <Button asChild>
            <Link href="/admin/leads/new">
              <Plus /> {t("admin.leads.add")}
            </Link>
          </Button>
        }
      />
      <DataTable
        data={offers}
        columns={columns}
        search={(o) => `${o.id} ${o.firstName} ${o.lastName} ${o.email} ${o.from.city} ${o.to.city} ${o.from.zip}`}
        searchPlaceholder={t("admin.shell.search")}
        onRowClick={(o) => router.push(`/admin/leads/${o.id}`)}
        filters={[
          { id: "status", label: t("common.fields.status"), options: STATUSES.map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (o) => o.status },
          {
            id: "attention",
            label: t("admin.leads.attention"),
            options: [
              { value: "noshow", label: t("admin.leads.noShowOpen") },
              { value: "review", label: t("admin.leads.needsReview") },
              { value: "expiring", label: t("admin.leads.expiringSoon") },
            ],
            get: (o) => (o.noShow && o.noShow.status !== "resolved" ? "noshow" : o.status === "new" ? "review" : isExpiringSoon(o) ? "expiring" : ""),
          },
          {
            id: "booking",
            label: t("site.booking.who"),
            options: (["personal", "other", "organization"] as const).map((b) => ({ value: b, label: t(`site.booking.${b}`) })),
            get: (o) => o.booking,
          },
          { id: "service", label: t("common.fields.service"), options: services.map((s) => ({ value: s.id, label: L(s.name) })), get: (o) => o.serviceId },
          { id: "lang", label: t("common.fields.language"), options: ["de", "en", "fr", "it"].map((l) => ({ value: l, label: t(`common.lang.${l}`) })), get: (o) => o.lang },
        ]}
        rowClassName={(o) => (o.status === "cancelled" ? "opacity-60" : o.status === "new" ? "bg-warning-soft/25" : isExpiringSoon(o) ? "bg-warning-soft/15" : undefined)}
      />
      {dialog}
    </>
  );
}
