"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Ban, ExternalLink, Plus, RotateCcw, ShieldCheck, UserPlus } from "lucide-react";
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
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { Mono, PageHeader } from "@/components/admin/ui";

const STATUSES = ["new", "in_progress", "completed", "expired", "cancelled"] as const;

export default function LeadsPage() {
  return (
    <Suspense>
      <Leads />
    </Suspense>
  );
}

function Leads() {
  const t = useTranslations();
  // the dashboard to-do links here with ?attention=noshow|review|expiring
  const attention = useSearchParams().get("attention");
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const services = useStore((s) => s.services);
  const patch = useStore((s) => s.patch);
  const approveOffer = useStore((s) => s.approveOffer);
  const repostOffer = useStore((s) => s.repostOffer);
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
    // the lead number with the day it came in (sorting by number = sorting by age)
    {
      id: "id",
      header: t("admin.leads.id"),
      accessorFn: (o) => o.id,
      cell: ({ row: { original: o } }) => (
        <div className="whitespace-nowrap">
          <Mono>{o.id}</Mono>
          <p className="text-xs text-muted-foreground">{formatDate(o.createdAt, lang)}</p>
        </div>
      ),
    },
    {
      id: "customer",
      header: t("admin.leads.customer"),
      accessorFn: (o) => `${o.firstName} ${o.lastName}`,
      cell: ({ row: { original: o } }) => (
        <div className="w-32 min-w-0 2xl:w-48">
          <p className="truncate font-semibold text-ink">{o.firstName} {o.lastName}</p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr" title={o.email}>{o.email}</p>
        </div>
      ),
    },
    {
      id: "service",
      header: t("common.fields.service"),
      accessorFn: (o) => L(serviceMap[o.serviceId]?.name),
      cell: (c) => <p className="w-20 font-medium leading-snug text-ink 2xl:w-32">{c.getValue() as string}</p>,
    },
    // fixed width; the full addresses show on hover
    {
      id: "route",
      header: t("admin.leads.route"),
      accessorFn: (o) => `${o.from.city} → ${o.to.city}`,
      cell: ({ row: { original: o } }) => (
        <p className="w-32 truncate text-muted-foreground 2xl:w-48" title={`${o.from.zip} ${o.from.city} → ${o.to.zip} ${o.to.city}`}>
          {o.from.city === o.to.city ? t("admin.leads.localMove", { city: o.from.city }) : <>{o.from.city} <span className="text-foreground/40">→</span> {o.to.city}</>}
        </p>
      ),
    },
    // the job date with how long the offer stays on sale
    {
      id: "execution",
      header: t("admin.leads.execution"),
      accessorFn: (o) => o.executionDate,
      cell: ({ row: { original: o } }) => (
        <div className="whitespace-nowrap">
          <p>{formatDate(o.executionDate, lang)}</p>
          {(o.status === "in_progress" || o.status === "new") && (
            <p className={cn("text-xs", isExpiringSoon(o) ? "font-semibold text-warning" : "text-muted-foreground")}>
              {t("admin.leads.expiresIn", { days: Math.max(0, daysLeft(o.deadline)) })}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (o) => o.status,
      cell: ({ row: { original: o } }) => (
        <div className="flex flex-col items-start gap-1">
          <span className="flex items-center gap-1.5">
            <StatusBadge status={o.status} />
            {o.status === "new" && o.flags.length > 0 && (
              <span title={t("admin.leads.flagged")} className="text-warning"><AlertTriangle className="size-4" aria-label={t("admin.leads.flagged")} /></span>
            )}
          </span>
          <span className={cn("text-xs", (sold[o.id] ?? 0) >= o.offersWanted ? "font-semibold text-success" : (sold[o.id] ?? 0) ? "text-ink" : "text-muted-foreground")}>
            {t("admin.leads.soldShort", { sold: sold[o.id] ?? 0, wanted: o.offersWanted })}
          </span>
          {o.noShow && o.noShow.status !== "resolved" && <Badge tone="danger">{t("admin.leads.noShowOpen")}</Badge>}
        </div>
      ),
    },
    {
      id: "visible",
      header: t("admin.leads.visibility"),
      accessorFn: (o) => (o.active ? 1 : 0),
      cell: ({ row: { original: o } }) =>
        o.status === "in_progress" ? (
          <span title={t("admin.leads.visible")}>
            <Switch checked={o.active} onCheckedChange={() => toggleVisible(o)} aria-label={t("admin.leads.visible")} />
          </span>
        ) : null,
    },
    actionsColumn<Offer>((o) => {
      const open = o.status === "new" || o.status === "in_progress";
      const full = (sold[o.id] ?? 0) >= o.offersWanted;
      return (
        <RowActions
          viewHref={`/admin/leads/${o.id}`}
          actions={[
            {
              label: t("admin.leads.detail.approve"),
              icon: <ShieldCheck />,
              hidden: o.status !== "new",
              onSelect: () =>
                confirm({
                  title: t("admin.leads.detail.approve"),
                  body: t("admin.leads.detail.checksFlagged"),
                  tone: "success",
                  confirmLabel: t("admin.leads.detail.approve"),
                  onConfirm: () => {
                    approveOffer(o.id);
                    toast.success(t("admin.leads.detail.approved", { id: o.id }));
                  },
                }),
            },
            {
              label: t("admin.leads.detail.repost"),
              icon: <RotateCcw />,
              hidden: o.status !== "in_progress" || full,
              onSelect: () => {
                repostOffer(o.id);
                toast.success(t("admin.rows.reposted", { id: o.id }));
              },
            },
            { label: t("admin.rows.assignCompany"), icon: <UserPlus />, href: `/admin/leads/${o.id}#assign`, hidden: !open || full },
            { label: t("admin.leads.detail.customerPage"), icon: <ExternalLink />, href: `/requests/${o.id}` },
            { label: t("admin.leads.detail.cancel"), icon: <Ban />, tone: "danger", href: `/admin/leads/${o.id}#cancel`, hidden: o.status === "cancelled", separated: true },
          ]}
        />
      );
    }),
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
        initialFilters={attention ? { attention } : undefined}
        columns={columns}
        search={(o) => `${o.id} ${o.firstName} ${o.lastName} ${o.email} ${o.from.city} ${o.to.city} ${o.from.zip} ${o.to.zip}`}
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
          { id: "service", label: t("common.fields.service"), options: services.map((s) => ({ value: s.id, label: L(s.name) })), get: (o) => o.serviceId },
          { id: "lang", label: t("common.fields.language"), options: ["de", "en", "fr", "it"].map((l) => ({ value: l, label: t(`common.lang.${l}`) })), get: (o) => o.lang },
        ]}
        rowClassName={(o) => (o.status === "cancelled" ? "opacity-60" : o.status === "new" ? "bg-warning-soft/25" : isExpiringSoon(o) ? "bg-warning-soft/15" : undefined)}
      />
      {dialog}
    </>
  );
}
