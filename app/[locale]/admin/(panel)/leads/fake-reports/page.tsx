"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, ClipboardList, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { FakeReport, FakeReportStatus } from "@/lib/types";
import { cn, formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerMap, useServiceMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DetailSheet, RowActions, SheetSection, actionsColumn } from "@/components/admin/row-actions";
import { DL, PageHeader } from "@/components/admin/ui";

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
  const cancelOffer = useStore((s) => s.cancelOffer);
  const partnerMap = usePartnerMap();
  const serviceMap = useServiceMap();
  const L = useL();
  const { confirm, dialog } = useConfirm();
  const [openId, setOpenId] = useState<string | null>(null);
  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));

  const setStatus = (r: FakeReport, status: FakeReportStatus) => {
    const order = orderMap[r.orderId];
    const partner = order && partnerMap[order.partnerId];
    if (status === "confirmed" && order && partner) {
      // A confirmed fake means the offer itself is fake: cancel it and refund every company that bought it.
      const buyers = orders.filter((o) => o.offerId === order.offerId);
      const amount = buyers.reduce((a, o) => a + o.price, 0);
      const names = buyers.map((o) => partnerMap[o.partnerId]?.name).filter(Boolean).join(", ");
      confirm({
        title: t("common.status.confirmed"),
        body: `${t("admin.leads.detail.cancelledFake")} · ${t("admin.fake.refunded", { amount, name: names })}`,
        tone: "success",
        onConfirm: () => {
          cancelOffer(order.offerId, "fake", buyers.map((o) => o.id));
          patch("fakeReports", r.id, { status });
          toast.success(t("admin.fake.refunded", { amount, name: names }));
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
        <div className={cn("w-36 rounded-lg", TONE[r.status])} onClick={(e) => e.stopPropagation()}>
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
    actionsColumn<FakeReport>((r) => {
      const order = orderMap[r.orderId];
      const final = r.status === "confirmed" || r.status === "canceled";
      return (
        <RowActions
          onView={() => setOpenId(r.id)}
          actions={[
            { label: t("admin.rows.openLead"), icon: <ClipboardList />, href: order ? `/admin/leads/${order.offerId}` : undefined, hidden: !order },
            { label: t("admin.rows.openCompany"), icon: <Building2 />, href: order ? `/admin/partners/${order.partnerId}` : undefined, hidden: !order },
            { label: t("admin.rows.confirmFake"), icon: <ShieldCheck />, onSelect: () => setStatus(r, "confirmed"), hidden: final, separated: true },
            { label: t("admin.rows.rejectReport"), icon: <XCircle />, tone: "danger", onSelect: () => setStatus(r, "canceled"), hidden: final },
          ]}
        />
      );
    }),
  ];

  const open = reports.find((r) => r.id === openId);
  const openOrder = open && orderMap[open.orderId];
  const openOffer = openOrder && offerMap[openOrder.offerId];
  const buyers = openOrder ? orders.filter((o) => o.offerId === openOrder.offerId) : [];
  const openFinal = open && (open.status === "confirmed" || open.status === "canceled");

  return (
    <>
      <PageHeader title={t("admin.fake.title")} subtitle={t("admin.fake.subtitle")} />
      <DataTable
        data={reports}
        columns={columns}
        onRowClick={(r) => setOpenId(r.id)}
        search={(r) => `${r.id} ${r.reason} ${partnerMap[orderMap[r.orderId]?.partnerId]?.name}`}
        filters={[{ id: "status", label: t("common.fields.status"), options: FLOW.map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (r) => r.status }]}
      />
      <DetailSheet
        open={!!open}
        onOpenChange={(v) => !v && setOpenId(null)}
        title={<span className="font-mono" dir="ltr">{open?.id}</span>}
        badge={open && <StatusBadge status={open.status} />}
        subtitle={open && `${partnerMap[openOrder?.partnerId ?? ""]?.name ?? "–"} · ${formatDateTime(open.createdAt, lang)}`}
        footer={
          open && !openFinal ? (
            <>
              <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setStatus(open, "canceled")}>
                <XCircle /> {t("admin.rows.rejectReport")}
              </Button>
              <Button variant="success" className="flex-1" onClick={() => setStatus(open, "confirmed")}>
                <ShieldCheck /> {t("admin.rows.confirmFake")}
              </Button>
            </>
          ) : undefined
        }
      >
        {open && (
          <>
            <SheetSection title={t("admin.fake.reason")}>
              <p className="text-sm text-foreground">“{open.reason}”</p>
            </SheetSection>
            {openOffer && (
              <SheetSection title={t("admin.rows.theOffer")}>
                <DL
                  items={[
                    { label: t("admin.leads.id"), value: <Link href={`/admin/leads/${openOffer.id}`} className="font-mono font-semibold text-primary hover:underline">{openOffer.id}</Link> },
                    { label: t("common.fields.service"), value: L(serviceMap[openOffer.serviceId]?.name) },
                    { label: t("admin.leads.customer"), value: `${openOffer.firstName} ${openOffer.lastName}` },
                    { label: t("common.fields.phone"), value: openOffer.phone, ltr: true },
                    { label: t("common.fields.email"), value: openOffer.email, ltr: true },
                    { label: t("common.fields.status"), value: <StatusBadge status={openOffer.status} /> },
                  ]}
                />
              </SheetSection>
            )}
            <SheetSection title={t("admin.rows.allBuyers", { count: buyers.length })}>
              <ul className="divide-y">
                {buyers.map((o) => {
                  const rep = reports.find((x) => x.orderId === o.id);
                  return (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <Link href={`/admin/partners/${o.partnerId}`} className="font-semibold text-ink hover:text-primary">{partnerMap[o.partnerId]?.name}</Link>
                      <span className="flex items-center gap-2">
                        {rep ? <StatusBadge status={rep.status} /> : <span className="text-xs text-muted-foreground">{t("admin.rows.notReported")}</span>}
                        <span className="tabular-nums">{formatCHF(o.price, lang)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {!openFinal && <p className="mt-3 text-xs text-muted-foreground">{t("admin.rows.confirmFakeHint")}</p>}
            </SheetSection>
          </>
        )}
      </DetailSheet>
      {dialog}
    </>
  );
}
