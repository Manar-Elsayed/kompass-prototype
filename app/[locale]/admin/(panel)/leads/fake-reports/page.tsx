"use client";

import { useTranslations } from "next-intl";
import { Building2, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { FakeReport, RefundStatus } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Avatar } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { FAKE_FLOW, FakeStatusSelect, isFinalReport, useFakeReportStatus } from "@/components/admin/fake-report-status";
import { Mono, PageHeader } from "@/components/admin/ui";

/** Reports are worked on the offer page, where the buyers, the customer and the history are. */
export default function FakeReportsPage() {
  const t = useTranslations();
  const lang = useLang();
  const router = useRouter();
  const reports = useStore((s) => s.fakeReports);
  const orders = useStore((s) => s.orders);
  const offers = useStore((s) => s.offers);
  const refunds = useStore((s) => s.refunds);
  const partnerMap = usePartnerMap();
  const { setStatus, dialog } = useFakeReportStatus();
  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const offerHref = (r: FakeReport) => {
    const order = orderMap[r.orderId];
    return order ? `/admin/leads/${order.offerId}#fake-reports` : undefined;
  };
  const companyOf = (r: FakeReport) => partnerMap[orderMap[r.orderId]?.partnerId]?.name ?? "–";
  // the refund of the reported purchase, if Kompass made or decided one
  const refundOf = (r: FakeReport) => refunds.find((x) => x.orderId === r.orderId && x.status === "refunded") ?? refunds.find((x) => x.orderId === r.orderId);
  const REFUND_TONE: Record<RefundStatus | "none", "success" | "warning" | "danger" | "neutral"> = { refunded: "success", pending: "warning", rejected: "danger", none: "neutral" };

  const columns: ColumnDef<FakeReport, unknown>[] = [
    {
      id: "report",
      header: t("admin.fake.report"),
      accessorFn: (r) => r.createdAt,
      cell: ({ row: { original: r } }) => (
        <div className="whitespace-nowrap">
          <Mono>{r.id}</Mono>
          <p className="text-xs text-muted-foreground">{formatDate(r.createdAt, lang)}</p>
        </div>
      ),
    },
    {
      id: "offer",
      header: t("admin.leads.id"),
      accessorFn: (r) => orderMap[r.orderId]?.offerId ?? "",
      cell: ({ row: { original: r } }) => {
        const o = offerMap[orderMap[r.orderId]?.offerId];
        return o ? (
          <div className="w-32 min-w-0">
            <Mono className="text-primary">{o.id}</Mono>
            <p className="truncate text-xs text-muted-foreground">{o.firstName} {o.lastName}</p>
          </div>
        ) : "–";
      },
    },
    {
      id: "by",
      header: t("admin.fake.reportedBy"),
      accessorFn: companyOf,
      cell: (c) => (
        <span className="flex w-40 min-w-0 items-center gap-2 font-semibold text-ink">
          <Avatar name={c.getValue() as string} square className="size-7 shrink-0 text-[10px]" />
          <span className="truncate">{c.getValue() as string}</span>
        </span>
      ),
    },
    { id: "reason", header: t("admin.fake.reason"), accessorFn: (r) => r.reason, cell: (c) => <span className="line-clamp-2 min-w-28 text-muted-foreground">{c.getValue() as string}</span> },
    {
      id: "refund",
      header: t("admin.fake.refundCol"),
      accessorFn: (r) => refundOf(r)?.status ?? "none",
      // the price the company paid, and whether it got it back
      cell: ({ row: { original: r } }) => {
        const x = refundOf(r);
        const state = x?.status ?? "none";
        return (
          <div className="whitespace-nowrap">
            <p className="font-semibold">{formatCHF(orderMap[r.orderId]?.price ?? 0, lang)}</p>
            <Badge tone={REFUND_TONE[state]} dot className="mt-0.5" title={x ? formatDate(x.decidedAt ?? x.createdAt, lang) : undefined}>
              {t(`admin.fake.refundState.${state}`)}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (r) => FAKE_FLOW.indexOf(r.status),
      cell: ({ row: { original: r } }) => <FakeStatusSelect report={r} onChange={(s) => setStatus(r, s)} />,
    },
    actionsColumn<FakeReport>((r) => {
      const order = orderMap[r.orderId];
      const final = isFinalReport(r);
      return (
        <RowActions
          viewHref={offerHref(r)}
          viewLabel={t("admin.leads.viewOffer")}
          actions={[
            { label: t("admin.rows.openCompany"), icon: <Building2 />, href: order ? `/admin/partners/${order.partnerId}` : undefined, hidden: !order },
            { label: t("admin.rows.confirmFake"), icon: <ShieldCheck />, onSelect: () => setStatus(r, "confirmed"), hidden: final, separated: true },
            { label: t("admin.rows.rejectReport"), icon: <XCircle />, tone: "danger", onSelect: () => setStatus(r, "canceled"), hidden: final },
          ]}
        />
      );
    }),
  ];

  return (
    <>
      <PageHeader title={t("admin.fake.title")} subtitle={t("admin.fake.subtitle")} />
      <DataTable
        data={reports}
        columns={columns}
        onRowClick={(r) => {
          const href = offerHref(r);
          if (href) router.push(href);
        }}
        initialSort={[{ id: "report", desc: true }]}
        search={(r) => {
          const o = offerMap[orderMap[r.orderId]?.offerId];
          return `${r.id} ${o?.id ?? ""} ${o ? `${o.firstName} ${o.lastName}` : ""} ${companyOf(r)} ${r.reason}`;
        }}
        searchPlaceholder={t("admin.fake.searchPh")}
        filters={[
          { id: "status", label: t("common.fields.status"), options: FAKE_FLOW.map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (r) => r.status },
          { id: "refund", label: t("admin.fake.refundCol"), options: (["refunded", "pending", "rejected", "none"] as const).map((s) => ({ value: s, label: t(`admin.fake.refundState.${s}`) })), get: (r) => refundOf(r)?.status ?? "none" },
        ]}
      />
      {dialog}
    </>
  );
}
