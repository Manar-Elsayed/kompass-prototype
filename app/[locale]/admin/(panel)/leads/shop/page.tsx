"use client";

import { useTranslations } from "next-intl";
import { Banknote, Building2, ClipboardList, Headset, Store as StoreIcon, Zap } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Order } from "@/lib/types";
import { formatCHF, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerMap, useServiceMap } from "@/lib/mock/hooks";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/controls";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";

export default function ShopPage() {
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const orders = useStore((s) => s.orders);
  const offers = useStore((s) => s.offers);
  const partnerMap = usePartnerMap();
  const serviceMap = useServiceMap();
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const services = useStore((s) => s.services);
  const router = useRouter();
  // an order has its own page, like an offer
  const orderHref = (x: Order) => `/admin/leads/shop/${x.id}`;
  // filter choices: only services and companies that have orders
  const serviceOf = (x: Order) => offerMap[x.offerId]?.serviceId ?? "";
  const serviceOptions = [...services]
    .sort((a, b) => a.order - b.order)
    .filter((sv) => orders.some((x) => serviceOf(x) === sv.id))
    .map((sv) => ({ value: sv.id, label: L(sv.name) }));
  const companyOptions = [...new Set(orders.map((x) => x.partnerId))]
    .map((id) => ({ value: id, label: partnerMap[id]?.name ?? id }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));

  const shopRev = orders.filter((o) => o.channel === "shop").reduce((a, o) => a + o.price, 0);
  const dynRev = orders.filter((o) => o.channel === "dynamic").reduce((a, o) => a + o.price, 0);

  const columns: ColumnDef<Order, unknown>[] = [
    {
      id: "order",
      header: t("admin.shop.order"),
      accessorFn: (o) => o.createdAt,
      cell: ({ row: { original: o } }) => (
        <div className="whitespace-nowrap">
          <Link href={orderHref(o)} className="font-mono text-[13px] font-semibold text-primary hover:underline" dir="ltr">{o.id}</Link>
          <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt, lang)}</p>
        </div>
      ),
    },
    {
      id: "lead",
      header: t("admin.leads.id"),
      accessorFn: (o) => o.offerId,
      cell: ({ row: { original: o } }) => {
        const x = offerMap[o.offerId];
        return (
          <div className="w-36 min-w-0">
            <Link href={`/admin/leads/${o.offerId}`} className="font-mono text-[13px] font-semibold text-primary hover:underline" dir="ltr">{o.offerId}</Link>
            <p className="truncate text-xs text-muted-foreground">{x ? `${x.firstName} ${x.lastName}` : "–"}</p>
          </div>
        );
      },
    },
    {
      id: "company",
      header: t("admin.shop.company"),
      accessorFn: (o) => partnerMap[o.partnerId]?.name ?? "–",
      cell: (c) => (
        <span className="flex w-44 min-w-0 items-center gap-2 font-semibold text-ink">
          <Avatar name={c.getValue() as string} square className="size-7 shrink-0 text-[10px]" />
          <span className="truncate">{c.getValue() as string}</span>
        </span>
      ),
    },
    { id: "service", meta: { className: "hidden xl:table-cell" }, header: t("common.fields.service"), accessorFn: (o) => L(serviceMap[offerMap[o.offerId]?.serviceId]?.name) },
    {
      id: "channel",
      header: t("admin.shop.channel"),
      accessorFn: (o) => o.channel,
      cell: (c) =>
        c.getValue() === "shop" ? (
          <Badge tone="primary"><StoreIcon /> {t("admin.shop.shop")}</Badge>
        ) : c.getValue() === "manual" ? (
          <Badge tone="warning"><Headset /> {t("admin.shop.manual")}</Badge>
        ) : (
          <Badge tone="accent"><Zap /> {t("admin.shop.dynamic")}</Badge>
        ),
    },
    {
      id: "price",
      header: t("common.fields.price"),
      accessorFn: (o) => o.price,
      cell: ({ row: { original: o } }) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">{formatCHF(o.price, lang)}</p>
          {o.couponCode && <p className="font-mono text-xs text-success" dir="ltr">{o.couponCode}</p>}
        </div>
      ),
    },
    actionsColumn<Order>((x) => (
      <RowActions
        viewHref={orderHref(x)}
        actions={[
          { label: t("admin.rows.openLead"), icon: <ClipboardList />, href: `/admin/leads/${x.offerId}`, separated: true },
          { label: t("admin.rows.openCompany"), icon: <Building2 />, href: `/admin/partners/${x.partnerId}` },
        ]}
      />
    )),
  ];

  return (
    <>
      <PageHeader title={t("admin.shop.title")} subtitle={t("admin.shop.subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("admin.shop.revenue")} value={formatCHF(shopRev + dynRev, lang)} icon={<Banknote />} />
        <KpiCard label={t("admin.shop.shop")} value={formatCHF(shopRev, lang)} icon={<StoreIcon />} tone="info" footer={t("admin.shop.ordersCount", { count: orders.filter((x) => x.channel === "shop").length })} />
        <KpiCard label={t("admin.shop.dynamic")} value={formatCHF(dynRev, lang)} icon={<Zap />} tone="accent" footer={t("admin.shop.ordersCount", { count: orders.filter((x) => x.channel === "dynamic").length })} />
      </div>
      <DataTable
        data={orders}
        columns={columns}
        search={(x) => {
          const c = offerMap[x.offerId];
          return `${x.id} ${x.offerId} ${partnerMap[x.partnerId]?.name} ${c ? `${c.firstName} ${c.lastName}` : ""}`;
        }}
        searchPlaceholder={t("admin.shop.searchPh")}
        onRowClick={(x) => router.push(orderHref(x))}
        initialSort={[{ id: "order", desc: true }]}
        filters={[
          { id: "channel", label: t("admin.shop.channel"), options: (["shop", "dynamic", "manual"] as const).map((c) => ({ value: c, label: t(`admin.shop.${c}`) })), get: (x) => x.channel },
          { id: "service", label: t("common.fields.service"), options: serviceOptions, get: serviceOf },
          { id: "company", label: t("admin.shop.company"), options: companyOptions, get: (x) => x.partnerId },
        ]}
      />
    </>
  );
}
