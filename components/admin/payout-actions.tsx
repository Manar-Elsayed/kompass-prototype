"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Payout } from "@/lib/types";
import { formatCHF } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useLang } from "@/lib/mock/hooks";
import { withdrawable } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Pay (with the bank reference) or reject (with a reason the company sees) a payout request.
 * Paying takes the amount out of the company's wallet.
 */
export function PayoutDecisionDialog({ payout, decision, onClose }: { payout: Payout; decision: "paid" | "rejected"; onClose: () => void }) {
  const t = useTranslations("admin.payouts");
  const tc = useTranslations("common.actions");
  const tr = useTranslations("common.payoutReasons");
  const lang = useLang();
  const { user } = useCurrentUser();
  const partner = useStore((s) => s.partners.find((p) => p.id === payout.partnerId));
  const partners = useStore((s) => s.partners);
  const payouts = useStore((s) => s.payouts);
  const invoices = useStore((s) => s.invoices);
  const decide = useStore((s) => s.decidePayout);
  const [text, setText] = useState(decision === "paid" ? `EBICS-${Math.floor(100000 + Math.random() * 900000)}` : "");
  // the payout itself is still "requested", so it is already counted in held-back money
  const money = withdrawable({ partners, payouts, invoices }, payout.partnerId);
  const short = decision === "paid" && (partner?.wallet ?? 0) < payout.amount;
  const valid = decision === "paid" ? text.trim().length >= 3 && !short : text.trim().length >= 10;

  const save = () => {
    decide(payout.id, decision, text, user?.id);
    toast.success(t(decision === "paid" ? "paidToast" : "rejectedToast", { amount: formatCHF(payout.amount, lang), name: partner?.name ?? "" }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(decision === "paid" ? "payTitle" : "rejectTitle", { amount: formatCHF(payout.amount, lang), name: partner?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t(decision === "paid" ? "payBody" : "rejectBody")}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3 text-sm">
          {payout.reason && (
            <>
              <dt className="text-muted-foreground">{t("companyReason")}</dt>
              <dd className="font-semibold">{tr(payout.reason)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">IBAN</dt>
          <dd className="font-mono text-xs" dir="ltr">{payout.iban}</dd>
          <dt className="text-muted-foreground">{t("wallet")}</dt>
          <dd className="font-semibold">{formatCHF(partner?.wallet ?? 0, lang)}</dd>
          {money.creditDue > 0 && (
            <>
              <dt className="text-muted-foreground">{t("creditDue")}</dt>
              <dd className="font-semibold text-warning">{formatCHF(money.creditDue, lang)}</dd>
            </>
          )}
        </dl>
        {short && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{t("short")}</p>}
        {decision === "paid" ? (
          <Field label={t("reference")} required>
            <Input value={text} onChange={(e) => setText(e.target.value)} dir="ltr" className="font-mono" />
          </Field>
        ) : (
          <Field label={t("reason")} hint={t("reasonHint")} required>
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          {decision === "paid" ? (
            <Button variant="success" disabled={!valid} onClick={save}><Check /> {t("pay")}</Button>
          ) : (
            <Button variant="danger" disabled={!valid} onClick={save}><X /> {tc("reject")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
