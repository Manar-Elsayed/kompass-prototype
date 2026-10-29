"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Building2, ClipboardList, Flag, Headset, Receipt, ShieldAlert, ShoppingCart, Store as StoreIcon, Undo2, Wallet, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { RefundStatus } from "@/lib/types";
import { formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { receiptRows } from "@/lib/mock/selectors";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerMap, useServiceMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatusBadge } from "@/components/shared/bits";
import { MoneyDocDialog } from "@/components/shared/money-doc";
import { receiptParty } from "@/components/shared/receipts";
import { JobPlaces } from "@/components/shared/job-details";
import { DL, Mono, PageHeader } from "@/components/admin/ui";
import { Timeline } from "@/components/admin/timeline";
import { FakeStatusSelect, useFakeReportStatus } from "@/components/admin/fake-report-status";

const REFUND_TONE: Record<RefundStatus, "success" | "warning" | "danger"> = { refunded: "success", pending: "warning", rejected: "danger" };

/**
 * One purchase: what the company paid and how, the offer and customer it bought, what happened after
 * (the company's outcome, a fake-offer report and its refund), and the receipt.
 */
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const ts = useTranslations("admin.shop");
  const L = useL();
  const lang = useLang();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const offer = useStore((s) => s.offers.find((o) => o.id === order?.offerId));
  const report = useStore((s) => s.fakeReports.find((r) => r.orderId === id));
  const refunds = useStore((s) => s.refunds);
  const dues = useStore((s) => s.dues);
  const topups = useStore((s) => s.topups);
  const orders = useStore((s) => s.orders);
  const prefix = useStore((s) => s.config.invoicePrefix);
  const partnerMap = usePartnerMap();
  const serviceMap = useServiceMap();
  const { setStatus, dialog } = useFakeReportStatus();
  const [receiptOpen, setReceiptOpen] = useState(false);
  // the same receipt number the company sees on its statement
  const receiptNo = useMemo(() => receiptRows({ dues, topups, orders }, prefix).find((r) => r.sourceId === id)?.id, [dues, topups, orders, prefix, id]);

  if (!order) {
    return (
      <Card>
        <EmptyState title={t("common.notFound.title")} action={<Button asChild variant="outline"><Link href="/admin/leads/shop">{ts("title")}</Link></Button>} />
      </Card>
    );
  }

  const partner = partnerMap[order.partnerId];
  const svc = offer && serviceMap[offer.serviceId];
  const refund = refunds.find((x) => x.orderId === order.id && x.status === "refunded") ?? refunds.find((x) => x.orderId === order.id);
  const refundState = refund?.status ?? "pending";
  const outcome = order.outcome && t(`portal.leads.outcome.${order.outcome}`);

  const timeline = [
    {
      at: order.createdAt,
      text: order.channel === "manual" ? t("admin.leads.detail.evAssigned", { name: partner?.name ?? "?" }) : t("admin.leads.detail.purchased", { name: partner?.name ?? "?" }),
      icon: <ShoppingCart className="size-3.5" />,
    },
    order.outcomeAt && outcome && { at: order.outcomeAt, text: ts("evOutcome", { outcome }), icon: <Flag className="size-3.5" /> },
    report && { at: report.createdAt, text: ts("evFake"), icon: <ShieldAlert className="size-3.5" /> },
    refund?.status === "refunded" && { at: refund.decidedAt ?? refund.createdAt, text: t("admin.fake.refunded", { amount: refund.amount, name: partner?.name ?? "?" }), icon: <Undo2 className="size-3.5" /> },
    offer?.cancelledAt && {
      at: offer.cancelledAt,
      text: t("admin.leads.detail.evCancelledFake"),
      icon: <Ban className="size-3.5" />,
    },
  ]
    .filter((e): e is { at: string; text: string; icon: React.ReactElement } => !!e)
    .sort((a, b) => a.at.localeCompare(b.at));

  const channelBadge =
    order.channel === "shop" ? (
      <Badge tone="primary"><StoreIcon /> {ts("shop")}</Badge>
    ) : order.channel === "manual" ? (
      <Badge tone="warning"><Headset /> {ts("manual")}</Badge>
    ) : (
      <Badge tone="accent"><Zap /> {ts("dynamic")}</Badge>
    );

  return (
    <>
      <PageHeader
        crumbs={[{ label: ts("title"), href: "/admin/leads/shop" }, { label: order.id }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Mono className="text-2xl">{order.id}</Mono>
          </span>
        }
        subtitle={partner?.name ?? "–"}
        actions={
          <>
            <Button asChild variant="outline"><Link href={`/admin/partners/${order.partnerId}`}><Building2 /> {t("admin.rows.openCompany")}</Link></Button>
            <Button asChild><Link href={`/admin/leads/${order.offerId}`}><ClipboardList /> {t("admin.rows.openLead")}</Link></Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={ts("order")}
              action={
                receiptNo && (
                  <Button size="sm" variant="outline" onClick={() => setReceiptOpen(true)}>
                    <Receipt /> {t("admin.dues.receipt")} <Mono className="text-xs">{receiptNo}</Mono>
                  </Button>
                )
              }
            />
            <CardBody>
              <DL
                items={[
                  { label: t("common.fields.price"), value: formatCHF(order.price, lang) },
                  { label: ts("channel"), value: channelBadge },
                  { label: t("common.fields.date"), value: formatDateTime(order.createdAt, lang) },
                  { label: ts("coupon"), value: order.couponCode ? <Mono className="text-success">{order.couponCode}</Mono> : "–" },
                  {
                    label: t("admin.leads.detail.companyReported"),
                    value: outcome ? (
                      <Badge tone={order.outcome === "won" ? "success" : order.outcome === "unreachable" ? "warning" : "neutral"}>{outcome}</Badge>
                    ) : (
                      <span className="font-normal text-muted-foreground">{ts("notReported")}</span>
                    ),
                  },
                  { label: ts("jobState"), value: order.executed ? <Badge tone="success">{ts("executed")}</Badge> : ts("notExecuted") },
                ]}
              />
              {order.note && <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm text-ink">{order.note}</p>}
            </CardBody>
          </Card>

          {report && (
            <Card className="border-warning/40">
              <CardHeader title={ts("fakeReport")} description={t("admin.rows.confirmFakeHint")} action={<FakeStatusSelect report={report} onChange={(s) => setStatus(report, s)} />} />
              <CardBody>
                <p className="text-sm text-ink">“{report.reason}”</p>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Mono className="text-xs font-medium text-muted-foreground">{report.id}</Mono> · {formatDateTime(report.createdAt, lang)} · {t("admin.fake.refundCol")}
                  <Badge tone={REFUND_TONE[refundState]} dot>{t(`admin.fake.refundState.${refundState}`)}</Badge>
                </p>
              </CardBody>
            </Card>
          )}

          {offer && (
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    {t("admin.leads.id")} <Link href={`/admin/leads/${offer.id}`} className="font-mono text-primary hover:underline" dir="ltr">{offer.id}</Link>
                  </span>
                }
                description={`${svc ? L(svc.name) : ""} · ${t("admin.leads.execution")}: ${formatDate(offer.executionDate, lang)}`}
                action={<StatusBadge status={offer.status} />}
              />
              <CardBody className="space-y-4">
                <JobPlaces offer={offer} />
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {offer && (
            <Card>
              <CardHeader title={ts("customer")} />
              <CardBody>
                <DL
                  cols={1}
                  items={[
                    { label: t("common.fields.name"), value: `${offer.firstName} ${offer.lastName}` },
                    { label: t("common.fields.phone"), value: offer.phone, ltr: true },
                    { label: t("common.fields.email"), value: offer.email, ltr: true },
                  ]}
                />
              </CardBody>
            </Card>
          )}

          {partner && (
            <Card>
              <CardHeader title={ts("company")} />
              <CardBody>
                <div className="flex items-center gap-3">
                  <Avatar name={partner.name} square className="size-10" />
                  <div className="min-w-0">
                    <Link href={`/admin/partners/${partner.id}`} className="font-semibold text-ink hover:text-primary">{partner.name}</Link>
                    <p className="truncate text-xs text-muted-foreground">{partner.city}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <DL
                    cols={1}
                    items={[
                      { label: t("common.fields.email"), value: partner.email, ltr: true },
                      { label: t("common.fields.phone"), value: partner.phone, ltr: true },
                      { label: t("admin.partners.wallet"), value: <span className="inline-flex items-center gap-1.5"><Wallet className="size-3.5 text-muted-foreground" /> {formatCHF(partner.wallet, lang)}</span> },
                    ]}
                  />
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title={t("admin.leads.detail.timeline")} />
            <CardBody>
              <Timeline events={timeline} />
            </CardBody>
          </Card>
        </div>
      </div>

      {receiptOpen && receiptNo && partner && (
        <MoneyDocDialog
          doc={{ kind: "receipt", id: receiptNo, date: order.createdAt, partner: receiptParty(partner), line: t("admin.wallets.kinds.purchase", { ref: order.offerId }), amount: order.price }}
          onClose={() => setReceiptOpen(false)}
        />
      )}
      {dialog}
    </>
  );
}
