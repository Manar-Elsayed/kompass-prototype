"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, Clock, Copy, CreditCard, ImageUp, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { PartnerDue } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { isOverdue, walletLedger } from "@/lib/mock/selectors";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCards } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, StatusBadge } from "@/components/shared/bits";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";
import { WalletLedger } from "@/components/shared/wallet-ledger";
import { KOMPASS_IBAN, MoneyDocDialog, type MoneyDoc } from "@/components/shared/money-doc";

export default function PaymentsPage() {
  const t = useTranslations("portal.payments");
  const td = useTranslations("admin.dues");
  const ti = useTranslations("admin.invoices");
  const tt = useTranslations("common.table");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const orders = useStore((s) => s.orders);
  const dues = useStore((s) => s.dues);
  const topups = useStore((s) => s.topups);
  const refunds = useStore((s) => s.refunds);
  const invoices = useStore((s) => s.invoices);
  const partners = useStore((s) => s.partners);
  const [upload, setUpload] = useState(false);
  const [online, setOnline] = useState(false);
  const [doc, setDoc] = useState<MoneyDoc | null>(null);

  const ledger = useMemo(() => walletLedger({ orders, dues, topups, refunds, invoices, partners }, partner.id), [orders, dues, topups, refunds, invoices, partners, partner.id]);
  const myDues = dues.filter((d) => d.partnerId === partner.id);
  const myInvoices = invoices.filter((i) => i.partnerId === partner.id);
  const pending = myDues.filter((d) => d.status === "pending").reduce((a, d) => a + d.amount, 0);
  const invStatus = (i: (typeof myInvoices)[number]) => (i.status === "paid" ? "paid" : isOverdue(i) ? "overdue" : "due");

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={() => setUpload(true)}><Upload /> {t("upload")}</Button>
            <Button variant="accent" onClick={() => setOnline(true)}><CreditCard /> {t("topUpOnline")}</Button>
          </>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("balance")} value={formatCHF(partner.wallet, lang)} icon={<Wallet />} />
        <KpiCard label={t("pending")} value={formatCHF(pending, lang)} icon={<Clock />} tone="warning" />
        <KpiCard label={t("spent")} value={formatCHF(ledger.spent, lang)} icon={<Banknote />} tone="accent" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {myInvoices.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title={t("invoices")} />
              <div className="mt-4 divide-y border-t">
                {myInvoices.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => setDoc({ kind: "invoice", id: i.id, date: i.issuedAt, partner, line: ti("creditLine"), amount: i.amount, status: invStatus(i), dueAt: i.dueAt, paidAt: i.paidAt })}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-start text-sm transition hover:bg-surface-2/60"
                  >
                    <Mono>{i.id}</Mono>
                    <span className="flex-1 text-muted-foreground">{ti("creditLine")}</span>
                    <span className="font-bold">{formatCHF(i.amount, lang)}</span>
                    <StatusBadge status={invStatus(i)} />
                    <span className="w-32 text-end text-xs text-muted-foreground">{t("dueOn", { date: formatDate(i.dueAt, lang) })}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
          <Card className="overflow-hidden">
            <CardHeader title={t("history")} />
            <div className="mt-4 divide-y border-t">
              {myDues.length ? (
                myDues.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <Mono>{d.reference}</Mono>
                    <span className="flex-1 text-muted-foreground">{td(d.method)}</span>
                    <span className="font-bold">{formatCHF(d.amount, lang)}</span>
                    <StatusBadge status={d.status} />
                    <span className="w-24 text-end text-xs text-muted-foreground">{formatDate(d.createdAt, lang)}</span>
                  </div>
                ))
              ) : (
                <EmptyState title={tt("noResults")} />
              )}
            </div>
          </Card>
        </div>

        <Card className="h-fit overflow-hidden">
          <CardHeader title={t("statement")} />
          <WalletLedger entries={ledger.entries} className="mt-4 max-h-[520px] overflow-y-auto border-t" />
        </Card>
      </div>
      {upload && <UploadDialog onClose={() => setUpload(false)} />}
      {online && <OnlineTopUpDialog onClose={() => setOnline(false)} onTransfer={() => { setOnline(false); setUpload(true); }} />}
      {doc && <MoneyDocDialog doc={doc} onClose={() => setDoc(null)} />}
    </>
  );
}

/** Simulated card / TWINT checkout: the wallet is credited as soon as the payment succeeds. */
function OnlineTopUpDialog({ onClose, onTransfer }: { onClose: () => void; onTransfer: () => void }) {
  const t = useTranslations("portal.payments");
  const tw = useTranslations("admin.wallets");
  const tc = useTranslations("common");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const topUp = useStore((s) => s.topUpWallet);
  const [amount, setAmount] = useState("200");
  const [method, setMethod] = useState<"card" | "twint">("card");
  const [busy, setBusy] = useState(false);
  const value = Number(amount) || 0;

  const pay = async () => {
    setBusy(true);
    const reference = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    await mock(() => topUp({ partnerId: partner.id, amount: value, method: "online", payMethod: method, reference, note: "" }), 1200);
    setBusy(false);
    toast.success(t("paidOnline", { amount: value }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("onlineTitle")}</DialogTitle>
          <DialogDescription>{t("onlineBody")}</DialogDescription>
        </DialogHeader>
        <Field label={`${tc("fields.amount")} (CHF)`} hint={`${t("balance")}: ${formatCHF(partner.wallet, lang)} → ${formatCHF(partner.wallet + value, lang)}`}>
          <Input type="number" min={10} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="-mt-2 flex flex-wrap gap-2">
          {[100, 200, 500, 1000].map((v) => (
            <Button key={v} type="button" variant={value === v ? "secondary" : "outline"} size="sm" onClick={() => setAmount(String(v))}>CHF {v}</Button>
          ))}
        </div>
        <Field label={tw("payMethod")}>
          <RadioCards className="grid-cols-2" value={method} onValueChange={(v) => setMethod(v as "card" | "twint")} options={(["card", "twint"] as const).map((m) => ({ value: m, label: tw(`payMethods.${m}`) }))} />
        </Field>
        <button type="button" onClick={onTransfer} className="text-start text-xs font-medium text-primary hover:underline">{t("orTransfer")}</button>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("actions.cancel")}</Button>
          <Button variant="accent" disabled={value < 10} loading={busy} onClick={pay}><CreditCard /> {t("payNow", { amount: value })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("portal.payments");
  const td = useTranslations("admin.dues");
  const tr = useTranslations("admin.refunds");
  const tc = useTranslations("common");
  const partner = useCurrentPartner()!;
  const uploadPayment = useStore((s) => s.uploadPayment);
  const prefix = useStore((s) => s.config.invoicePrefix);
  const ref = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("200");
  const [method, setMethod] = useState<PartnerDue["method"]>("bank_transfer");
  const [reference, setReference] = useState(`${prefix}-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const [receipt, setReceipt] = useState<{ name: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = Number(amount) >= 10;

  const onFile = (f: File) => {
    if (f.size > 1_500_000) return toast.error("Max 1.5 MB");
    const r = new FileReader();
    r.onload = () => setReceipt({ name: f.name, url: String(r.result) });
    r.readAsDataURL(f);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("uploadTitle")}</DialogTitle>
          <DialogDescription>{t("uploadBody")}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3 text-sm">
          <span>
            <span className="block text-xs text-muted-foreground">{t("bankDetails")} · Kompass Umzug GmbH</span>
            <span className="font-mono font-semibold" dir="ltr">{KOMPASS_IBAN}</span>
          </span>
          <Button variant="ghost" size="icon-sm" aria-label={tc("actions.copy")} onClick={() => { navigator.clipboard?.writeText(KOMPASS_IBAN); toast.success(tc("toast.copied")); }}><Copy /></Button>
        </div>
        <Field label={`${tc("fields.amount")} (CHF)`}>
          <Input type="number" min={10} dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="-mt-2 flex flex-wrap gap-2">
          {[100, 200, 500, 1000].map((v) => (
            <Button key={v} type="button" variant={Number(amount) === v ? "secondary" : "outline"} size="sm" onClick={() => setAmount(String(v))}>CHF {v}</Button>
          ))}
        </div>
        <Field label={td("method")}>
          <RadioCards className="grid-cols-3" value={method} onValueChange={(v) => setMethod(v as PartnerDue["method"])} options={(["bank_transfer", "twint", "card"] as const).map((m) => ({ value: m, label: td(m) }))} />
        </Field>
        <Field label={tc("fields.reference")}>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} dir="ltr" className="font-mono" />
        </Field>
        <Field label={t("receipt")}>
          <div className="flex items-center gap-3 rounded-xl border border-dashed p-3">
            <ImageUp className="size-6 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{receipt?.name ?? t("noFile")}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>{t("chooseFile")}</Button>
            <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("actions.cancel")}</Button>
          <Button
            variant="accent"
            disabled={!valid}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await mock(() => uploadPayment({ partnerId: partner.id, amount: Number(amount), method, reference, receipt: receipt?.url ?? "/images/complaint.png" }));
              setBusy(false);
              toast.success(t("sent"));
              onClose();
            }}
          >
            <Upload /> {tc("actions.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
