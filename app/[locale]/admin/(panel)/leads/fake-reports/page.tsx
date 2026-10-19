"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { FakeReport, FakeReportStatus } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/ui";

const FLOW: FakeReportStatus[] = ["open", "testing", "pending", "confirmed", "canceled"];
const TONE: Record<FakeReportStatus, string> = {
  open: "bg-info-soft text-info",
  testing: "bg-primary-soft text-primary",
  pending: "bg-warning-soft text-warning",
  confirmed: "bg-success-soft text-success",
  canceled: "bg-muted text-muted-foreground",
};

export default function FakeReportsPage() {
  const t = useTranslations();
  const lang = useLang();
  const reports = useStore((s) => s.fakeReports);
  const orders = useStore((s) => s.orders);
  const offers = useStore((s) => s.offers);
  const patch = useStore((s) => s.patch);
  const issueRefund = useStore((s) => s.issueRefund);
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();
  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));

  const setStatus = (r: FakeReport, status: FakeReportStatus) => {
    const order = orderMap[r.orderId];
    const partner = order && partnerMap[order.partnerId];
    if (status === "confirmed" && order && partner) {
      confirm({
        title: t("common.status.confirmed"),
        body: t("admin.fake.refunded", { amount: order.price, name: partner.name }),
        tone: "success",
        onConfirm: () => {
          patch("fakeReports", r.id, { status });
          issueRefund({ partnerId: partner.id, amount: order.price, reason: "fake_lead", method: "wallet", orderId: order.id, note: r.reason });
          toast.success(t("admin.fake.refunded", { amount: order.price, name: partner.name }));
        },
      });
      return;
    }
    patch("fakeReports", r.id, { status });
    toast.success(t("common.toast.updated"));
  };

  const columns: ColumnDef<FakeReport, unknown>[] = [
    { id: "id", header: "#", accessorFn: (r) => r.id, cell: (c) => <span className="font-mono text-[13px] font-semibold" dir="ltr">{c.getValue() as string}</span> },
    {
      id: "lead",
      header: t("admin.leads.id"),
      accessorFn: (r) => orderMap[r.orderId]?.offerId ?? "",
      cell: ({ row: { original: r } }) => {
        const o = offerMap[orderMap[r.orderId]?.offerId];
        return o ? (
          <div>
            <Link href={`/admin/leads/${o.id}`} className="font-mono text-[13px] font-semibold text-primary hover:underline" dir="ltr">{o.id}</Link>
            <p className="text-xs text-muted-foreground">{o.firstName} {o.lastName} · <span dir="ltr">{o.phone}</span></p>
          </div>
        ) : "–";
      },
    },
    { id: "by", header: t("admin.fake.reportedBy"), accessorFn: (r) => partnerMap[orderMap[r.orderId]?.partnerId]?.name ?? "–", cell: (c) => <span className="font-semibold text-ink">{c.getValue() as string}</span> },
    { id: "reason", header: t("admin.fake.reason"), accessorFn: (r) => r.reason, cell: (c) => <span className="line-clamp-2 max-w-xs text-muted-foreground">{c.getValue() as string}</span> },
    { id: "amount", header: t("common.fields.amount"), accessorFn: (r) => orderMap[r.orderId]?.price ?? 0, cell: (c) => formatCHF(c.getValue() as number, lang) },
    { id: "date", header: t("common.fields.created"), accessorFn: (r) => r.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (r) => r.status,
      cell: ({ row: { original: r } }) => (
        <div className={cn("w-36 rounded-lg", TONE[r.status])}>
          <Select
            size="sm"
            className="border-transparent bg-transparent font-semibold text-inherit shadow-none"
            value={r.status}
            disabled={r.status === "confirmed"}
            onValueChange={(v) => setStatus(r, v as FakeReportStatus)}
            options={FLOW.map((s) => ({ value: s, label: t(`common.status.${s}`) }))}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.fake.title")} subtitle={t("admin.fake.subtitle")} />
      <DataTable
        data={reports}
        columns={columns}
        search={(r) => `${r.id} ${r.reason} ${partnerMap[orderMap[r.orderId]?.partnerId]?.name}`}
        filters={[{ id: "status", label: t("common.fields.status"), options: FLOW.map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (r) => r.status }]}
      />
      {dialog}
    </>
  );
}
