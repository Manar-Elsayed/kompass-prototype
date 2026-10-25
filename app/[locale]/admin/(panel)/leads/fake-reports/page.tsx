"use client";

import { useTranslations } from "next-intl";
import { Building2, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { FakeReport } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Avatar } from "@/components/ui/controls";
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
  const partnerMap = usePartnerMap();
  const { setStatus, dialog } = useFakeReportStatus();
  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const offerHref = (r: FakeReport) => {
    const order = orderMap[r.orderId];
    return order ? `/admin/leads/${order.offerId}#fake-reports` : undefined;
  };
  const companyOf = (r: FakeReport) => partnerMap[orderMap[r.orderId]?.partnerId]?.name ?? "–";

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
    { id: "reason", header: t("admin.fake.reason"), accessorFn: (r) => r.reason, cell: (c) => <span className="line-clamp-2 min-w-32 text-muted-foreground">{c.getValue() as string}</span> },
    { id: "amount", header: t("common.fields.amount"), accessorFn: (r) => orderMap[r.orderId]?.price ?? 0, cell: (c) => <span className="whitespace-nowrap font-semibold">{formatCHF(c.getValue() as number, lang)}</span> },
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
        wideSearch
        filters={[{ id: "status", label: t("common.fields.status"), options: FAKE_FLOW.map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (r) => r.status }]}
      />
      {dialog}
    </>
  );
}
