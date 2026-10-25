"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Offer } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { surveyDate, surveySent } from "@/lib/mock/selectors";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { useConfirm } from "@/components/shared/bits";

/** Who gets the survey: whoever booked (another person or an organization's contact), else the customer. */
export const surveyRecipient = (o: Offer) => o.requester?.email || o.email || "";

/** The survey rates the company that did the job, so it needs a buyer, an email and a live request. */
export const canSendSurvey = (o: Offer, buyers: number) => o.status !== "cancelled" && buyers > 0 && !!surveyRecipient(o);

/** Send (or resend) the review survey now, after the admin confirms. */
export function useSendSurvey() {
  const t = useTranslations("admin.leads.survey");
  const lang = useLang();
  const sendSurvey = useStore((s) => s.sendSurvey);
  const { confirm, dialog } = useConfirm();

  const ask = (o: Offer) => {
    const email = surveyRecipient(o);
    const sent = surveySent(o);
    confirm({
      title: t(sent ? "resendTitle" : "sendTitle", { id: o.id }),
      body: sent
        ? t("resendBody", { email, date: formatDate(surveyDate(o), lang) })
        : t("sendBody", { email, date: formatDate(surveyDate(o), lang) }),
      confirmLabel: t(sent ? "resend" : "send"),
      onConfirm: () => {
        sendSurvey(o.id);
        toast.success(t("sentTo", { email }));
      },
    });
  };

  return { ask, dialog };
}
