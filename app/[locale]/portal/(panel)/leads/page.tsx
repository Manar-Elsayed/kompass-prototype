"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Flag, Headset, Mail, Phone, PhoneMissed, ShoppingBag, Trophy, UserX } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { ORDER_OUTCOMES, type Order, type OrderOutcome } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { leadOutcome, type LeadGroup } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { Mono, PageHeader } from "@/components/admin/ui";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { LeadStatus, ReportDialog, leadAbilities, useLeadActions } from "@/components/portal/lead-outcome";
import { routeFull, routeText } from "@/lib/jobs";

const GROUPS: LeadGroup[] = ["open", "won", "lost", "executed", "reported", "cancelled"];

export default function MyLeadsPage() {
  return (
    <Suspense>
      <MyLeads />
    </Suspense>
  );
}

/** Every offer the company bought. A row opens the offer's own page (/portal/leads/<offer id>). */
function MyLeads() {
  const t = useTranslations("portal.leads");
  const tf = useTranslations("common.fields");
  const tl = useTranslations("admin.leads");
  const tn = useTranslations("portal.nav");
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const partner = useCurrentPartner()!;
  const orders = useStore((s) => s.orders).filter((o) => o.partnerId === partner.id);
  const offers = useStore((s) => s.offers);
  const reports = useStore((s) => s.fakeReports);
  const refunds = useStore((s) => s.refunds);
  const serviceMap = useServiceMap();
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const outcomeOf = (o: Order) => leadOutcome({ offers, fakeReports: reports, refunds }, o);
  const actions = useLeadActions();
  const [reporting, setReporting] = useState<Order | null>(null);
  const OUTCOME_ICON: Record<OrderOutcome, React.ReactNode> = { won: <Trophy />, lost: <UserX />, unreachable: <PhoneMissed /> };

  // older links (?open=<offerId>) still work: they go to the offer's own page
  const deepLink = params.get("open");
  useEffect(() => {
    if (deepLink) router.replace(`/portal/leads/${deepLink}`);
  }, [deepLink, router]);

  const columns: ColumnDef<Order, unknown>[] = [
    // the reference with the day it was bought (sorting by it = newest purchases first)
    {
      id: "bought",
      header: tf("reference"),
      accessorFn: (o) => o.createdAt,
      cell: ({ row: { original: o } }) => (
        <span className="flex flex-col items-start gap-0.5 whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <Mono>{o.offerId}</Mono>
            {o.channel === "manual" && (
              <Badge tone="accent" className="px-1.5" title={t("assigned")}>
                <Headset aria-label={t("assigned")} />
              </Badge>
            )}
          </span>
          <span className="text-xs text-muted-foreground">{t("boughtOn", { date: formatDate(o.createdAt, lang) })}</span>
        </span>
      ),
    },
    {
      id: "customer",
      header: tl("customer"),
      accessorFn: (o) => `${offerMap[o.offerId]?.firstName} ${offerMap[o.offerId]?.lastName}`,
      cell: ({ row: { original: o } }) => {
        const x = offerMap[o.offerId];
        return (
          <div className="w-32 min-w-0 2xl:w-44">
            <p className="truncate font-semibold text-ink">{x?.firstName} {x?.lastName}</p>
            <p className="truncate text-xs text-muted-foreground" dir="ltr">{x?.phone}</p>
          </div>
        );
      },
    },
    {
      id: "svc",
      header: tf("service"),
      accessorFn: (o) => L(serviceMap[offerMap[o.offerId]?.serviceId ?? ""]?.name),
      cell: (c) => <p className="w-20 font-medium leading-snug text-ink 2xl:w-32">{c.getValue() as string}</p>,
    },
    {
      id: "route",
      header: tl("route"),
      accessorFn: (o) => (offerMap[o.offerId] ? routeText(offerMap[o.offerId]) : ""),
      cell: ({ row: { original: o } }) => {
        const x = offerMap[o.offerId];
        return (
          <p className="w-28 truncate text-muted-foreground 2xl:w-48" title={x ? routeFull(x) : undefined}>
            {x ? routeText(x) : "–"}
          </p>
        );
      },
    },
    { id: "exec", header: tl("execution"), accessorFn: (o) => offerMap[o.offerId]?.executionDate ?? "", cell: (c) => <span className="whitespace-nowrap">{c.getValue() ? formatDate(c.getValue() as string, lang) : "–"}</span> },
    {
      id: "paid",
      header: t("paid"),
      accessorFn: (o) => o.price,
      cell: ({ row: { original: o } }) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">{formatCHF(o.price, lang)}</p>
          {o.couponCode && <p className="font-mono text-xs text-success" dir="ltr">{o.couponCode}</p>}
        </div>
      ),
    },
    { id: "status", header: tf("status"), accessorFn: (o) => outcomeOf(o).status, cell: ({ row: { original: o } }) => <LeadStatus order={o} /> },
    // the same things the offer page offers, without opening it: reach the customer, say how it went, report
    actionsColumn<Order>((o) => {
      const x = offerMap[o.offerId];
      const out = outcomeOf(o);
      const { canReport, canExecute, canSetOutcome } = leadAbilities(out);
      const reachable = !!x && out.group !== "cancelled";
      return (
        <RowActions
          viewHref={`/portal/leads/${o.offerId}`}
          viewLabel={tl("viewOffer")}
          actions={[
            { label: t("call"), icon: <Phone />, onSelect: () => { window.location.href = `tel:${x?.phone}`; }, hidden: !reachable },
            { label: t("email"), icon: <Mail />, onSelect: () => { window.location.href = `mailto:${x?.email}`; }, hidden: !reachable },
            ...(ORDER_OUTCOMES as readonly OrderOutcome[]).map((k, i) => ({
              label: o.outcome === k ? `${t(`set.${k}`)} ✓` : t(`set.${k}`),
              icon: OUTCOME_ICON[k],
              onSelect: () => actions.setOutcome(o, k),
              hidden: !canSetOutcome,
              separated: i === 0,
            })),
            { label: t("markDone"), icon: <CheckCircle2 />, onSelect: () => actions.markExecuted(o), hidden: !canExecute, separated: !canSetOutcome },
            { label: t("report"), icon: <Flag />, tone: "danger" as const, onSelect: () => setReporting(o), hidden: !canReport, separated: true },
          ]}
        />
      );
    }),
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <DataTable
        data={orders}
        columns={columns}
        search={(o) => `${o.offerId} ${offerMap[o.offerId]?.firstName} ${offerMap[o.offerId]?.lastName} ${offerMap[o.offerId]?.from.city}`}
        searchPlaceholder={t("searchPh")}
        onRowClick={(o) => router.push(`/portal/leads/${o.offerId}`)}
        initialSort={[{ id: "bought", desc: true }]}
        emptyState={<EmptyState icon={<ShoppingBag />} title={t("empty")} action={<Button asChild variant="accent"><Link href="/portal/shop">{tn("shop")}</Link></Button>} />}
        filters={[{ id: "st", label: tf("status"), options: GROUPS.map((g) => ({ value: g, label: t(`groups.${g}`) })), get: (o) => outcomeOf(o).group }]}
      />
      {reporting && <ReportDialog order={reporting} onClose={() => setReporting(null)} />}
      {actions.dialog}
    </>
  );
}
