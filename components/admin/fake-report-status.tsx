"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { FakeReport, FakeReportStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { usePartnerMap } from "@/lib/mock/hooks";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/components/shared/bits";

export const FAKE_FLOW: FakeReportStatus[] = ["open", "testing", "pending", "confirmed", "canceled"];
const TONE: Record<FakeReportStatus, string> = {
  open: "bg-info-soft text-info",
  testing: "bg-primary-soft text-primary",
  pending: "bg-warning-soft text-warning",
  confirmed: "bg-success-soft text-success",
  canceled: "bg-muted text-muted-foreground",
};

export const isFinalReport = (r: FakeReport) => r.status === "confirmed" || r.status === "canceled";

/**
 * Moving a fake-offer report through its steps. Used by the reports list and the offer page,
 * so both show and change the same status.
 */
export function useFakeReportStatus() {
  const t = useTranslations();
  const orders = useStore((s) => s.orders);
  const patch = useStore((s) => s.patch);
  const cancelOffer = useStore((s) => s.cancelOffer);
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();

  const setStatus = (r: FakeReport, status: FakeReportStatus) => {
    const order = orders.find((o) => o.id === r.orderId);
    if (status === "confirmed" && order) {
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

  return { setStatus, dialog };
}

/** The coloured status picker; a confirmed report is final. */
export function FakeStatusSelect({ report, onChange, className }: { report: FakeReport; onChange: (s: FakeReportStatus) => void; className?: string }) {
  const t = useTranslations("common.status");
  return (
    <div className={cn("w-36 rounded-lg", TONE[report.status], className)} onClick={(e) => e.stopPropagation()}>
      <Select
        size="sm"
        className="border-transparent bg-transparent font-semibold text-inherit shadow-none"
        value={report.status}
        disabled={report.status === "confirmed"}
        onValueChange={(v) => onChange(v as FakeReportStatus)}
        options={FAKE_FLOW.map((s) => ({ value: s, label: t(s) }))}
      />
    </div>
  );
}
