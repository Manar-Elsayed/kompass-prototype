"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, ShoppingCart, Store as StoreIcon, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Order } from "@/lib/types";
import { formatCHF, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerMap, useServiceMap } from "@/lib/mock/hooks";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/controls";
import { StatusBadge } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
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
  const [open, setOpen] = useState<Order | null>(null);

  const shopRev = orders.filter((o) => o.channel === "shop").reduce((a, o) => a + o.price, 0);
  const dynRev = orders.filter((o) => o.channel === "dynamic").reduce((a, o) => a + o.price, 0);

  const columns: ColumnDef<Order, unknown>[] = [
    { id: "order", header: t("admin.shop.order"), accessorFn: (o) => o.id, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    { id: "lead", header: t("admin.leads.id"), accessorFn: (o) => o.offerId, cell: (c) => <Link href={`/admin/leads/${c.getValue()}`} className="font-mono text-[13px] font-semibold text-primary hover:underline" dir="ltr">{c.getValue() as string}</Link> },
    { id: "customer", header: t("admin.shop.customer"), accessorFn: (o) => { const x = offerMap[o.offerId]; return x ? `${x.firstName} ${x.lastName}` : "–"; } },
    {
      id: "company",
      header: t("admin.shop.company"),
      accessorFn: (o) => partnerMap[o.partnerId]?.name ?? "–",
      cell: (c) => (
        <span className="flex items-center gap-2 font-semibold text-ink">
          <Avatar name={c.getValue() as string} square className="size-7 text-[10px]" />
          {c.getValue() as string}
        </span>
      ),
    },
    { id: "service", header: t("common.fields.service"), accessorFn: (o) => L(serviceMap[offerMap[o.offerId]?.serviceId]?.name) },
    {
      id: "channel",
      header: t("admin.shop.channel"),
      accessorFn: (o) => o.channel,
      cell: (c) => (c.getValue() === "shop" ? <Badge tone="primary"><StoreIcon /> {t("admin.shop.shop")}</Badge> : <Badge tone="accent"><Zap /> {t("admin.shop.dynamic")}</Badge>),
    },
    { id: "price", header: t("common.fields.price"), accessorFn: (o) => o.price, cell: (c) => <span className="font-semibold">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "coupon", header: t("admin.shop.coupon"), accessorFn: (o) => o.couponCode ?? "", cell: (c) => (c.getValue() ? <Mono>{c.getValue() as string}</Mono> : <span className="text-muted-foreground">–</span>) },
    { id: "date", header: t("common.fields.date"), accessorFn: (o) => o.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(c.getValue() as string, lang)}</span> },
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
        onRowClick={setOpen}
        initialSort={[{ id: "date", desc: true }]}
        filters={[
          { id: "channel", label: t("admin.shop.channel"), options: [{ value: "shop", label: t("admin.shop.shop") }, { value: "dynamic", label: t("admin.shop.dynamic") }], get: (x) => x.channel },
        ]}
      />

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="max-w-lg overflow-y-auto">
          {open && (
            <div className="space-y-6 p-6">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingCart className="size-5 text-primary" /> {t("admin.shop.details")}
                </DialogTitle>
                <p className="mt-1"><Mono>{open.id}</Mono></p>
              </div>
              <section className="rounded-xl border p-4">
                <p className="mb-3 text-sm font-bold text-ink">{t("admin.shop.order")}</p>
                <DL
                  items={[
                    { label: t("common.fields.price"), value: formatCHF(open.price, lang) },
                    { label: t("admin.shop.channel"), value: t(`admin.shop.${open.channel}`) },
                    { label: t("common.fields.date"), value: formatDateTime(open.createdAt, lang) },
                    { label: t("admin.shop.coupon"), value: open.couponCode ?? "–" },
                    { label: t("admin.executions.title"), value: open.executed ? t("admin.shop.executed") : t("admin.shop.notExecuted") },
                  ]}
                />
              </section>
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
                      { label: t("site.offerForm.movingTo"), value: `${o.to.zip} ${o.to.city}` },
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
            </div>
          )}
        </SheetContent>
      </Dialog>
    </>
  );
}
