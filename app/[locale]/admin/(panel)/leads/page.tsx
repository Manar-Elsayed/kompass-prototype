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
import { routeFull, routeText } from "@/lib/jobs";

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

  // dates in the current year without the year (the full date shows on hover)
  const thisYear = new Date().getFullYear();
  const shortDate = (iso: string) => formatDate(iso, lang, new Date(iso).getFullYear() === thisYear ? { day: "2-digit", month: "short" } : undefined);

  const columns: ColumnDef<Offer, unknown>[] = [
    { id: "id", header: t("admin.leads.id"), accessorFn: (o) => o.id, cell: ({ row }) => <Mono className="whitespace-nowrap">{row.original.id}</Mono> },
    {
      id: "customer",
      header: t("admin.leads.customer"),
      accessorFn: (o) => `${o.firstName} ${o.lastName}`,
      cell: ({ row: { original: o } }) => (
        <div className="w-28 min-w-0 2xl:w-48">
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
      accessorFn: (o) => routeText(o),
      cell: ({ row: { original: o } }) => (
        <p className="w-24 truncate text-muted-foreground 2xl:w-48" title={routeFull(o)}>
          {!o.to ? o.from.city : o.from.city === o.to.city ? t("admin.leads.localMove", { city: o.from.city }) : <>{o.from.city} <span className="text-foreground/40">→</span> {o.to.city}</>}
        </p>
      ),
    },
    // received and job dates side by side; the job date also says how long the offer stays on sale
    {
      id: "created",
      header: t("common.fields.created"),
      accessorFn: (o) => o.createdAt,
      cell: (c) => <span className="whitespace-nowrap text-muted-foreground" title={formatDate(c.getValue() as string, lang)}>{shortDate(c.getValue() as string)}</span>,
    },
    {
      id: "execution",
      header: t("admin.leads.execution"),
      accessorFn: (o) => o.executionDate,
      cell: ({ row: { original: o } }) => (
        <div className="whitespace-nowrap">
          <p title={formatDate(o.executionDate, lang)}>{shortDate(o.executionDate)}</p>
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
          viewLabel={t("admin.leads.viewOffer")}
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
            { label: t("admin.leads.survey.openSurvey"), icon: <ExternalLink />, href: `/requests/${o.id}` },
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
        search={(o) => `${o.id} ${o.firstName} ${o.lastName} ${o.email} ${o.from.city} ${o.to?.city ?? ""} ${o.from.zip} ${o.to?.zip ?? ""}`}
        searchPlaceholder={t("admin.shell.search")}
        onRowClick={(o) => router.push(`/admin/leads/${o.id}`)}
        filters={[
          { id: "status", label: t("common.fields.status"), options: STATUSES.map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (o) => o.status },
          {
            id: "attention",
            label: t("admin.leads.attention"),
            options: [
              { value: "review", label: t("admin.leads.needsReview") },
              { value: "expiring", label: t("admin.leads.expiringSoon") },
            ],
            get: (o) => (o.status === "new" ? "review" : isExpiringSoon(o) ? "expiring" : ""),
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
