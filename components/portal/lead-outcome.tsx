"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag, RotateCcw, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { FakeReportStatus, Order } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { OUTCOME_TONE, leadOutcome } from "@/lib/mock/selectors";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCards } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const REASONS = ["phone", "never", "duplicate", "unreachable"] as const;
/** How a fake-lead report moves; the last step is confirmed (refunded) or rejected. */
const REPORT_STEPS: FakeReportStatus[] = ["new", "testing"];

/**
 * One status per bought offer. When the customer named a company in the after-move survey, that
 * answer decides Won / Lost and is marked "Confirmed by customer".
 */
export function LeadStatus({ order, withNote = true }: { order: Order; withNote?: boolean }) {
  const t = useTranslations("portal.leads");
  const offers = useStore((s) => s.offers);
  const fakeReports = useStore((s) => s.fakeReports);
  const refunds = useStore((s) => s.refunds);
  const { status, byCustomer } = leadOutcome({ offers, fakeReports, refunds }, order);
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Badge tone={OUTCOME_TONE[status]} dot>{t(`outcome.${status}`)}</Badge>
      {withNote && byCustomer && (
        <span className="flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
          <UserCheck className="size-3" /> {t("confirmedByCustomer")}
        </span>
      )}
    </span>
  );
}

/**
 * What happened to the purchase, in plain words: refunded because the offer was fake, or where a
 * fake-lead report stands (with its steps).
 */
export function OutcomeBanner({ order }: { order: Order }) {
  const t = useTranslations("portal.leads");
  const tst = useTranslations("common.fakeStatus");
  const lang = useLang();
  const offers = useStore((s) => s.offers);
  const fakeReports = useStore((s) => s.fakeReports);
  const refunds = useStore((s) => s.refunds);
  const { status, report, refund } = leadOutcome({ offers, fakeReports, refunds }, order);

  if (status === "cancelledFake")
    return (
      <div className="rounded-xl border border-info/30 bg-info-soft/50 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-info"><RotateCcw className="size-4" /> {t("cancelledFakeTitle")}</p>
        <p className="mt-1 text-muted-foreground">
          {refund?.status === "refunded"
            ? t("cancelledFakeRefunded", { amount: formatCHF(refund.amount, lang), date: formatDate(refund.decidedAt ?? refund.createdAt, lang) })
            : t("cancelledFakePending")}
        </p>
        {refund?.status === "refunded" && <Link href="/portal/payments?tab=statement" className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">{t("seeStatement")}</Link>}
      </div>
    );
  if (!report) return null;
  const rejected = report.status === "rejected";
  const reached = rejected ? REPORT_STEPS.length : Math.max(0, REPORT_STEPS.indexOf(report.status));
  return (
    <div className={cn("rounded-xl border p-4 text-sm", rejected ? "bg-surface-2/60" : "border-warning/30 bg-warning-soft/40")}>
      <p className="flex items-center gap-2 font-semibold text-ink"><Flag className="size-4 text-warning" /> {rejected ? t("reportRejectedTitle") : t("reportTitleShort", { date: formatDate(report.createdAt, lang) })}</p>
      <p className="mt-1 text-muted-foreground">{rejected ? t("reportRejectedBody") : t("reportProgressBody")}</p>
      <ol className="mt-3 flex items-center gap-1" aria-label={t("reportSteps")}>
        {[...REPORT_STEPS, rejected ? "rejected" : "canceled"].map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1">
            <span className={cn("h-1.5 rounded-full", i <= reached ? (rejected && i === REPORT_STEPS.length ? "bg-muted-foreground" : "bg-warning") : "bg-muted")} />
            <span className={cn("text-[11px]", i === reached ? "font-semibold text-ink" : "text-muted-foreground")}>{tst(s)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">“{report.reason}”</p>
    </div>
  );
}

export function ReportDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const t = useTranslations("portal.leads");
  const tc = useTranslations("common.actions");
  const tform = useTranslations("common.form");
  const report = useStore((s) => s.reportFakeLead);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("phone");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reportTitle", { id: order.offerId })}</DialogTitle>
          <DialogDescription>{t("reportBody")}</DialogDescription>
        </DialogHeader>
        <Field label={t("reason")}>
          <RadioCards className="grid-cols-1 [&>button]:justify-start" value={reason} onValueChange={(v) => setReason(v as typeof reason)} options={REASONS.map((r) => ({ value: r, label: t(`reasons.${r}`) }))} />
        </Field>
        <Field label={t("details")} hint={tform("optional")}>
          <Textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await mock(() => report(order.id, `${t(`reasons.${reason}`)}${details ? ` — ${details}` : ""}`));
              setBusy(false);
              toast.success(t("reportSent"));
              onClose();
            }}
          >
            <Flag /> {tc("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
