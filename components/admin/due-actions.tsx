"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { PartnerDue } from "@/lib/types";
import { formatCHF } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { useConfirm } from "@/components/shared/bits";

/**
 * Approving or rejecting a company's payment, with a confirmation first. A top-up credits the
 * wallet; a payment for a credit invoice marks the invoice paid. Used by the list and the payment page.
 */
export function useDueDecision() {
  const t = useTranslations();
  const td = useTranslations("admin.dues");
  const lang = useLang();
  const decideDue = useStore((s) => s.decideDue);
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();

  const approve = (d: PartnerDue) =>
    confirm({
      title: td("confirmTitle", { amount: d.amount, name: partnerMap[d.partnerId]?.name ?? "" }),
      body: d.invoiceId ? td("confirmInvoiceBody", { id: d.invoiceId }) : td("confirmBody"),
      tone: "success",
      confirmLabel: t("common.actions.approve"),
      onConfirm: () => {
        decideDue(d.id, "confirmed");
        toast.success(d.invoiceId ? td("confirmedInvoice", { id: d.invoiceId }) : td("confirmed"));
      },
    });
  const reject = (d: PartnerDue) =>
    confirm({
      title: t("admin.del.payment.title"),
      body: t("admin.del.payment.body", { id: d.id, amount: formatCHF(d.amount, lang), name: partnerMap[d.partnerId]?.name ?? "" }),
      tone: "danger",
      confirmLabel: t("admin.del.payment.button"),
      onConfirm: () => {
        decideDue(d.id, "canceled");
        toast.success(td("canceled"));
      },
    });

  return { approve, reject, dialog };
}
