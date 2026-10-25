"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HandCoins, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Partner, PayMethod } from "@/lib/types";
import { formatCHF } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCards } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ADMIN_PAY: PayMethod[] = ["bank_transfer", "cash", "twint", "card"];
const PRESETS = [100, 200, 500, 1000];
const TERMS = [14, 30, 60];

/** Admin records money Kompass received for a company: the wallet is credited at once, with who/how/reference logged. */
export function TopUpDialog({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const t = useTranslations("admin.wallets");
  const tc = useTranslations("common");
  const lang = useLang();
  const { user } = useCurrentUser();
  const topUp = useStore((s) => s.topUpWallet);
  const openInvoices = useStore((s) => s.invoices).filter((i) => i.partnerId === partner.id && i.status === "due").length;
  const [amount, setAmount] = useState("200");
  const [payMethod, setPayMethod] = useState<PayMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const value = Number(amount) || 0;

  const save = async () => {
    setBusy(true);
    await mock(() => topUp({ partnerId: partner.id, amount: value, method: "admin", payMethod, reference: reference.trim() || "-", note: note.trim(), byUserId: user?.id }));
    setBusy(false);
    toast.success(t("toppedUpToast", { amount: value, name: partner.name }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("topUpTitle", { name: partner.name })}</DialogTitle>
          <DialogDescription>{t("topUpHint")}</DialogDescription>
        </DialogHeader>
        {/* paying a credit invoice is recorded on the invoice, not here, or the wallet is credited twice */}
        {openInvoices > 0 && (
          <p className="rounded-xl border border-warning/30 bg-warning-soft/40 p-3 text-sm text-ink">
            {t("openInvoicesHint", { count: openInvoices })}{" "}
            <Link href="/admin/finance/invoices" className="font-semibold text-primary hover:underline">{t("openInvoicesLink")}</Link>
          </p>
        )}
        <Field label={`${tc("fields.amount")} (CHF)`} required hint={`${t("balance")}: ${formatCHF(partner.wallet, lang)} → ${formatCHF(partner.wallet + value, lang)}`}>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="-mt-2 flex flex-wrap gap-2">
          {PRESETS.map((v) => (
            <Button key={v} type="button" size="sm" variant={value === v ? "secondary" : "outline"} onClick={() => setAmount(String(v))}>CHF {v}</Button>
          ))}
        </div>
        <Field label={t("payMethod")}>
          <RadioCards className="grid-cols-2 sm:grid-cols-4" value={payMethod} onValueChange={(v) => setPayMethod(v as PayMethod)} options={ADMIN_PAY.map((m) => ({ value: m, label: t(`payMethods.${m}`) }))} />
        </Field>
        <Field label={t("reference")}>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} className="font-mono" placeholder="BANK-4821" />
        </Field>
        <Field label={t("note")}>
          <Textarea rows={2} value={note} placeholder={t("notePh")} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("actions.cancel")}</Button>
          <Button onClick={save} disabled={value <= 0} loading={busy}><Plus /> {t("topUp")} · {formatCHF(value, lang)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Pay later: the company can spend the amount now; an invoice for it is issued with a payment term. */
export function CreditDialog({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const t = useTranslations("admin.wallets");
  const tc = useTranslations("common");
  const lang = useLang();
  const { user } = useCurrentUser();
  const addCredit = useStore((s) => s.addCredit);
  const [amount, setAmount] = useState("300");
  const [term, setTerm] = useState("30");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const value = Number(amount) || 0;

  const save = async () => {
    setBusy(true);
    const inv = await mock(() => addCredit({ partnerId: partner.id, amount: value, termDays: Number(term), note: note.trim(), byUserId: user?.id }));
    setBusy(false);
    toast.success(t("creditToast", { amount: value, id: inv.id }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("creditTitle", { name: partner.name })}</DialogTitle>
          <DialogDescription>{t("creditHint")}</DialogDescription>
        </DialogHeader>
        <Field label={`${tc("fields.amount")} (CHF)`} required hint={`${t("balance")}: ${formatCHF(partner.wallet, lang)} → ${formatCHF(partner.wallet + value, lang)}`}>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t("term")}>
          <RadioCards className="grid-cols-3" value={term} onValueChange={setTerm} options={TERMS.map((d) => ({ value: String(d), label: t("termDays", { days: d }) }))} />
        </Field>
        <Field label={t("note")}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("actions.cancel")}</Button>
          <Button onClick={save} disabled={value <= 0} loading={busy}><HandCoins /> {t("addCredit")} · {formatCHF(value, lang)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
