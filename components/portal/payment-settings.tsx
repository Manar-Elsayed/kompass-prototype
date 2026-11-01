"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Landmark, RefreshCw, Smartphone, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { PaymentMethod } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useLang } from "@/lib/mock/hooks";
import { activeCreditLimit, autoTopUpOn, nextSettlement, TOP_UP_AMOUNTS, TOP_UP_BELOW } from "@/lib/mock/selectors";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { RadioCards, Switch } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * How the company pays without thinking about it: a saved card or TWINT, automatic top-up when the
 * balance runs low, and - when Kompass gives one - a credit limit whose negative balance is charged
 * to the saved method each month. Shows the one action that fixes a negative balance.
 */
export function PaymentSettingsCard() {
  const t = useTranslations("portal.payments");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const saveMethod = useStore((s) => s.savePaymentMethod);
  const setAuto = useStore((s) => s.setAutoTopUp);
  const settle = useStore((s) => s.settleBalance);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const method = partner.paymentMethod;
  const auto = partner.autoTopUp ?? { enabled: false, below: 50, amount: 200 };
  const limit = partner.creditLimit ?? 0;
  const usable = activeCreditLimit(partner);
  const negative = partner.wallet < 0;
  const settleDate = formatDate(nextSettlement(), lang);

  const updateAuto = (next: Partial<typeof auto>) => {
    setAuto(partner.id, { ...auto, ...next });
    toast.success(t("autoSaved"));
  };
  const remove = () => {
    const res = saveMethod(partner.id, null);
    if (!res.ok) return toast.error(t("methodRemoveBlocked"));
    toast.success(t("methodRemoved"));
  };
  const settleNow = async () => {
    setBusy(true);
    const amount = await mock(() => settle(partner.id), 900);
    setBusy(false);
    if (amount) toast.success(t("settled", { amount: formatCHF(amount, lang), method: method?.label ?? "" }));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader title={t("methodTitle")} description={t("methodHint")} />
      <CardBody className="space-y-4">
        {/* a negative balance (credit limit used) comes first: when it is charged, or settle it now */}
        {negative && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft/50 p-3 text-sm">
            <TriangleAlert className="size-4 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{t("negativeTitle", { balance: formatCHF(partner.wallet, lang) })}</p>
              <p className="text-muted-foreground">{t("negativeBody", { method: method?.label ?? "", date: settleDate })}</p>
            </div>
            {method && <Button size="sm" variant="accent" loading={busy} onClick={settleNow}>{t("settleNow")}</Button>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
            {method?.type === "twint" ? <Smartphone className="size-5" /> : <CreditCard className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{method ? method.label : t("noMethod")}</p>
            {method && <p className="text-xs text-muted-foreground">{t(method.type === "twint" ? "methodTwint" : "methodCard")}</p>}
          </div>
          {method ? (
            <span className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>{t("changeMethod")}</Button>
              <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={remove}>{t("removeMethod")}</Button>
            </span>
          ) : (
            <Button size="sm" onClick={() => setAdding(true)}><CreditCard /> {t("addMethod")}</Button>
          )}
        </div>

        <div className={cn("rounded-xl border p-3", !method && "opacity-60")}>
          <div className="flex items-center gap-3">
            <RefreshCw className="size-4 shrink-0 text-primary" />
            <p className="flex-1 font-semibold text-ink">{t("autoTitle")}</p>
            <Switch checked={autoTopUpOn(partner)} disabled={!method} onCheckedChange={(v) => updateAuto({ enabled: v })} aria-label={t("autoTitle")} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {!method
              ? t("autoNeedsMethod")
              : autoTopUpOn(partner)
                ? t("autoOnText", { below: formatCHF(auto.below, lang), amount: formatCHF(auto.amount, lang), method: method.label })
                : t("autoOffText")}
          </p>
          {autoTopUpOn(partner) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                {t("autoBelow")}
                <Select className="mt-1" value={String(auto.below)} onValueChange={(v) => updateAuto({ below: Number(v) })} options={TOP_UP_BELOW.map((v) => ({ value: String(v), label: formatCHF(v, lang) }))} />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                {t("autoAmount")}
                <Select className="mt-1" value={String(auto.amount)} onValueChange={(v) => updateAuto({ amount: Number(v) })} options={TOP_UP_AMOUNTS.map((v) => ({ value: String(v), label: formatCHF(v, lang) }))} />
              </label>
            </div>
          )}
        </div>

        {limit > 0 && (
          <div className="flex items-start gap-3 rounded-xl border p-3 text-sm">
            <Landmark className="mt-0.5 size-4 shrink-0 text-info" />
            <div>
              <p className="font-semibold text-ink">{t("creditTitle")} · {formatCHF(limit, lang)}</p>
              <p className="text-muted-foreground">
                {usable ? t("creditText", { limit: formatCHF(limit, lang), method: method!.label, date: settleDate }) : t("creditInactive", { limit: formatCHF(limit, lang) })}
              </p>
            </div>
          </div>
        )}
      </CardBody>
      {adding && <MethodDialog current={method} onClose={() => setAdding(false)} />}
    </Card>
  );
}

/** Simulated provider step: the company picks card or TWINT and confirms it on the provider's page. */
function MethodDialog({ current, onClose }: { current?: PaymentMethod; onClose: () => void }) {
  const t = useTranslations("portal.payments");
  const tc = useTranslations("common.actions");
  const partner = useCurrentPartner()!;
  const save = useStore((s) => s.savePaymentMethod);
  const [type, setType] = useState<PaymentMethod["type"]>(current?.type ?? "card");
  const [busy, setBusy] = useState(false);
  // in the prototype the provider returns a masked card, or the company's own phone for TWINT
  const phone = partner.phone.replace(/\s+/g, " ");
  const label = type === "card" ? "Visa •••• 4242" : `TWINT · ${phone.slice(0, 6)} ••• ${phone.slice(-5)}`;

  const submit = async () => {
    setBusy(true);
    await mock(() => save(partner.id, { type, label }), 900);
    setBusy(false);
    toast.success(t("methodSaved", { label }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("methodDialogTitle")}</DialogTitle>
          <DialogDescription>{t("methodDialogBody")}</DialogDescription>
        </DialogHeader>
        <RadioCards className="grid-cols-2" value={type} onValueChange={(v) => setType(v as PaymentMethod["type"])} options={[{ value: "card", label: t("methodCard") }, { value: "twint", label: t("methodTwint") }]} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={submit} loading={busy}><CreditCard /> {t("methodSave")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
