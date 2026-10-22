"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, Building2, CheckCircle2, ClipboardList, Headset, RotateCcw, ShoppingCart, Store as StoreIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Order } from "@/lib/types";
import { formatCHF, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerMap, useServiceMap } from "@/lib/mock/hooks";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/controls";
import { StatusBadge } from "@/components/shared/bits";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DetailSheet, RowActions, SheetSection, actionsColumn } from "@/components/admin/row-actions";
import { DL, KpiCard, Mono, PageHeader } from "@/components/admin/ui";

export default function ShopPage() {
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const orders = useStore((s) => s.orders);
  const offers = useStore((s) => s.offers);
  const partnerMap = usePartnerMap();
  const serviceMap = useServiceMap();
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const patch = useStore((s) => s.patch);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = orders.find((x) => x.id === openId);
  const setExecuted = (x: Order, executed: boolean) => {
    patch("orders", x.id, { executed });
    toast.success(t(executed ? "admin.rows.markedDone" : "admin.rows.markedNotDone", { id: x.offerId }));
  };

  const shopRev = orders.filter((o) => o.channel === "shop").reduce((a, o) => a + o.price, 0);
  const dynRev = orders.filter((o) => o.channel === "dynamic").reduce((a, o) => a + o.price, 0);

  const columns: ColumnDef<Order, unknown>[] = [
    {
      id: "order",
      header: t("admin.shop.order"),
      accessorFn: (o) => o.createdAt,
      cell: ({ row: { original: o } }) => (
        <div className="whitespace-nowrap">
          <Mono>{o.id}</Mono>
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
    { id: "service", meta: { className: "hidden 2xl:table-cell" }, header: t("common.fields.service"), accessorFn: (o) => L(serviceMap[offerMap[o.offerId]?.serviceId]?.name) },
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
    {
      id: "done",
      header: t("common.fields.status"),
      accessorFn: (o) => (o.executed ? 1 : 0),
      cell: ({ row: { original: x } }) => (x.executed ? <Badge tone="success" dot>{t("admin.shop.executed")}</Badge> : <Badge dot>{t("admin.shop.notExecuted")}</Badge>),
    },
    actionsColumn<Order>((x) => (
      <RowActions
        onView={() => setOpenId(x.id)}
        actions={[
          { label: t(x.executed ? "admin.rows.markNotDone" : "admin.rows.markDone"), icon: x.executed ? <RotateCcw /> : <CheckCircle2 />, onSelect: () => setExecuted(x, !x.executed) },
          { label: t("admin.rows.openLead"), icon: <ClipboardList />, href: `/admin/leads/${x.offerId}`, separated: true },
          { label: t("admin.rows.openCompany"), icon: <Building2 />, href: `/admin/partners/${x.partnerId}` },
        ]}
      />
    )),
  ];

  const o = open ? offerMap[open.offerId] : undefined;
  const p = open ? partnerMap[open.partnerId] : undefined;

  return (
    <>
      <PageHeader title={t("admin.shop.title")} subtitle={t("admin.shop.subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("admin.shop.revenue")} value={formatCHF(shopRev + dynRev, lang)} icon={<Banknote />} />
        <KpiCard label={t("admin.shop.shop")} value={formatCHF(shopRev, lang)} icon={<StoreIcon />} tone="info" footer={`${orders.filter((x) => x.channel === "shop").length} ${t("admin.shop.order")}`} />
        <KpiCard label={t("admin.shop.dynamic")} value={formatCHF(dynRev, lang)} icon={<Zap />} tone="accent" footer={`${orders.filter((x) => x.channel === "dynamic").length} ${t("admin.shop.order")}`} />
      </div>
      <DataTable
        data={orders}
        columns={columns}
        search={(x) => `${x.id} ${x.offerId} ${partnerMap[x.partnerId]?.name}`}
        onRowClick={(x) => setOpenId(x.id)}
        initialSort={[{ id: "order", desc: true }]}
        filters={[
          { id: "channel", label: t("admin.shop.channel"), options: (["shop", "dynamic", "manual"] as const).map((c) => ({ value: c, label: t(`admin.shop.${c}`) })), get: (x) => x.channel },
          { id: "done", label: t("common.fields.status"), options: [{ value: "yes", label: t("admin.shop.executed") }, { value: "no", label: t("admin.shop.notExecuted") }], get: (x) => (x.executed ? "yes" : "no") },
        ]}
      />

      <DetailSheet
        wide
        open={!!open}
        onOpenChange={(v) => !v && setOpenId(null)}
        title={<><ShoppingCart className="size-5 text-primary" /> {t("admin.shop.details")}</>}
        subtitle={open && <Mono>{open.id}</Mono>}
        footer={
          open ? (
            <>
              <Button asChild variant="outline"><Link href={`/admin/leads/${open.offerId}`}><ClipboardList /> {t("admin.rows.openLead")}</Link></Button>
              <Button variant={open.executed ? "outline" : "success"} className="flex-1" onClick={() => setExecuted(open, !open.executed)}>
                {open.executed ? <RotateCcw /> : <CheckCircle2 />} {t(open.executed ? "admin.rows.markNotDone" : "admin.rows.markDone")}
              </Button>
            </>
          ) : undefined
        }
      >
          {open && (
            <>
              <SheetSection title={t("admin.shop.order")}>
                <DL
                  items={[
                    { label: t("common.fields.price"), value: formatCHF(open.price, lang) },
                    { label: t("admin.shop.channel"), value: t(`admin.shop.${open.channel}`) },
                    { label: t("common.fields.date"), value: formatDateTime(open.createdAt, lang) },
                    { label: t("admin.shop.coupon"), value: open.couponCode ?? "–" },
                    { label: t("common.fields.status"), value: open.executed ? t("admin.shop.executed") : t("admin.shop.notExecuted") },
                  ]}
                />
              </SheetSection>
              {o && (
                <section className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-ink">{t("admin.shop.customer")}</p>
                    <StatusBadge status={o.status} />
                  </div>
                  <DL
                    items={[
                      { label: t("common.fields.name"), value: `${o.firstName} ${o.lastName}` },
                      { label: t("common.fields.phone"), value: o.phone, ltr: true },
                      { label: t("common.fields.email"), value: o.email, ltr: true },
                      { label: t("common.fields.service"), value: L(serviceMap[o.serviceId]?.name) },
                      { label: t("site.offerForm.movingFrom"), value: `${o.from.zip} ${o.from.city}` },
                      ...(o.to ? [{ label: t("site.offerForm.movingTo"), value: `${o.to.zip} ${o.to.city}` }] : []),
                    ]}
                  />
                  <Link href={`/admin/leads/${o.id}`} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                    {t("common.actions.view")} {o.id} →
                  </Link>
                </section>
              )}
              {p && (
                <section className="rounded-xl border p-4">
                  <p className="mb-3 text-sm font-bold text-ink">{t("admin.shop.company")}</p>
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} square className="size-10" />
                    <div>
                      <Link href={`/admin/partners/${p.id}`} className="font-semibold text-ink hover:text-primary">{p.name}</Link>
                      <p className="text-xs text-muted-foreground">{p.email} · {p.phone}</p>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
      </DetailSheet>
    </>
  );
}
