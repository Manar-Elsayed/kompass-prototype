"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Send } from "lucide-react";
import { toast } from "sonner";
import type { Offer } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { surveyDate, surveySent } from "@/lib/mock/selectors";
import { useStore } from "@/lib/mock/store";
import { useL, useLang } from "@/lib/mock/hooks";
import { routeText } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReviewSurveyForm } from "@/components/site/review-survey-form";

/** Who gets the survey: whoever booked (another person or an organization's contact), else the customer. */
export const surveyRecipient = (o: Offer) => o.requester?.email || o.email || "";

/** The survey rates the company that did the job, so it needs a buyer, an email, a live request and no answer yet. */
export const canSendSurvey = (o: Offer, buyers: number, answered = false) => o.status !== "cancelled" && buyers > 0 && !answered && !!surveyRecipient(o);

/**
 * Send (or resend) the review survey now. The admin first sees the survey form exactly as the
 * customer will, then confirms.
 */
export function useSendSurvey() {
  const [offerId, setOfferId] = useState<string | null>(null);
  const offer = useStore((s) => s.offers.find((o) => o.id === offerId));
  const dialog = offer ? <SendSurveyDialog key={offer.id} offer={offer} onClose={() => setOfferId(null)} /> : null;
  return { ask: (o: Offer) => setOfferId(o.id), dialog };
}

function SendSurveyDialog({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const t = useTranslations("admin.leads.survey");
  const ts = useTranslations("site.survey");
  const tc = useTranslations("common.actions");
  const L = useL();
  const lang = useLang();
  const sendSurvey = useStore((s) => s.sendSurvey);
  const svc = useStore((s) => s.services.find((x) => x.id === offer.serviceId));
  const email = surveyRecipient(offer);
  const sent = surveySent(offer);
  const date = formatDate(surveyDate(offer), lang);

  const send = () => {
    sendSurvey(offer.id);
    toast.success(t("sentTo", { email }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t(sent ? "resendTitle" : "sendTitle", { id: offer.id })}</DialogTitle>
          <DialogDescription>{sent ? t("resendBody", { email, date }) : t("sendBody", { email, date })}</DialogDescription>
        </DialogHeader>

        {/* the survey as the customer sees it; answers typed here are not saved */}
        <div className="max-h-[55vh] overflow-y-auto rounded-xl border bg-surface-2/50 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Eye className="size-3.5" /> {t("previewNote")}
          </p>
          <p className="text-sm font-semibold text-primary">{ts("eyebrow")}</p>
          <p className="mt-0.5 text-xl font-bold text-ink">{ts("title")}</p>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            {svc ? L(svc.name) : ""} · {routeText(offer)} · {formatDate(offer.executionDate, lang)}
          </p>
          <ReviewSurveyForm offer={offer} preview />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={send}><Send /> {t(sent ? "resend" : "send")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
