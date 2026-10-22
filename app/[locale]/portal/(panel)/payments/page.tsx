"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownToLine, Check, Clock, Copy, CreditCard, Download, FileText, HandCoins, ImageUp, Landmark, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Invoice, PartnerDue } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { isOverdue, LEDGER_KINDS, MIN_PAYOUT, walletLedger, withdrawable, type LedgerKind } from "@/lib/mock/selectors";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RadioCards } from "@/components/ui/controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, StatusBadge } from "@/components/shared/bits";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";
import { WalletLedger } from "@/components/shared/wallet-ledger";
import { KOMPASS_IBAN, MoneyDocDialog, type MoneyDoc } from "@/components/shared/money-doc";
import { useCompose } from "@/components/portal/compose";

const TABS = ["overview", "invoices", "payouts", "statement"] as const;
type Tab = (typeof TABS)[number];

export default function PaymentsPage() {
  return (
    <Suspense>
      <Payments />
    </Suspense>
  );
}

/**
 * The company's money in one place: balance and what is held back, invoices to pay, payouts to the
 * bank, and the statement of every movement. Deep links pick the tab (?tab=invoices).
 */
function Payments() {
  const t = useTranslations("portal.payments");
  const td = useTranslations("admin.dues");
  const ti = useTranslations("admin.invoices");
  const lang = useLang();
  const params = useSearchParams();
  const partner = useCurrentPartner()!;
  const orders = useStore((s) => s.orders);
  const dues = useStore((s) => s.dues);
  const topups = useStore((s) => s.topups);
  const refunds = useStore((s) => s.refunds);
  const invoices = useStore((s) => s.invoices);
  const partners = useStore((s) => s.partners);
  const payouts = useStore((s) => s.payouts);
  const [tab, setTab] = useState<Tab>("overview");
  const [upload, setUpload] = useState(false);
  const [online, setOnline] = useState(false);
  const [payout, setPayout] = useState(false);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [doc, setDoc] = useState<MoneyDoc | null>(null);

  const wanted = params.get("tab");
  useEffect(() => {
    if (wanted && (TABS as readonly string[]).includes(wanted)) setTab(wanted as Tab);
  }, [wanted]);

  const ledger = useMemo(
    () => walletLedger({ orders, dues, topups, refunds, invoices, partners, payouts }, partner.id),
    [orders, dues, topups, refunds, invoices, partners, payouts, partner.id],
  );
  const money = withdrawable({ partners, payouts, invoices }, partner.id);
  const myDues = dues.filter((d) => d.partnerId === partner.id);
  const myInvoices = invoices.filter((i) => i.partnerId === partner.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const myPayouts = payouts.filter((p) => p.partnerId === partner.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = myDues.filter((d) => d.status === "pending").reduce((a, d) => a + d.amount, 0);
  const openInvoices = myInvoices.filter((i) => i.status === "due");
  const invStatus = (i: Invoice) => (i.status === "paid" ? "paid" : isOverdue(i) ? "overdue" : "due");
  const openDoc = (i: Invoice) => setDoc({ kind: "invoice", id: i.id, date: i.issuedAt, partner, line: ti("creditLine"), amount: i.amount, status: invStatus(i), dueAt: i.dueAt, paidAt: i.paidAt });

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

      {openInvoices.some(isOverdue) && (
        <button onClick={() => setTab("invoices")} className="mb-4 flex w-full items-center gap-3 rounded-xl bg-danger-soft px-4 py-3 text-start text-sm font-semibold text-danger">
          <FileText className="size-4 shrink-0" />
          <span className="flex-1">{t("overdueBanner", { amount: formatCHF(openInvoices.filter(isOverdue).reduce((a, i) => a + i.amount, 0), lang) })}</span>
          <span className="underline underline-offset-2">{t("payNowShort")}</span>
        </button>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="mb-4 h-auto max-w-full flex-wrap justify-start">
          {TABS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {t(`tabs.${k}`)}
              {k === "invoices" && openInvoices.length > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">{openInvoices.length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t("balance")} value={formatCHF(partner.wallet, lang)} icon={<Wallet />} />
            <KpiCard label={t("withdrawable")} value={formatCHF(money.available, lang)} icon={<Landmark />} tone="success" footer={<button className="font-semibold text-primary hover:underline" onClick={() => setPayout(true)}>{t("requestPayout")}</button>} />
            <KpiCard label={t("pending")} value={formatCHF(pending, lang)} icon={<Clock />} tone="warning" />
            <KpiCard label={t("creditDue")} value={formatCHF(money.creditDue, lang)} icon={<HandCoins />} tone="info" footer={openInvoices.length ? <button className="font-semibold text-primary hover:underline" onClick={() => setTab("invoices")}>{t("openInvoices", { count: openInvoices.length })}</button> : t("noOpenInvoices")} />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <Card className="overflow-hidden">
              <CardHeader title={t("history")} description={t("historyHint")} />
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
                  <EmptyState icon={<ImageUp />} title={t("noReceipts")} body={t("noReceiptsBody")} action={<Button variant="outline" size="sm" onClick={() => setUpload(true)}><Upload /> {t("upload")}</Button>} />
                )}
              </div>
            </Card>
            <Card className="h-fit overflow-hidden">
              <CardHeader title={t("recentMoves")} action={<Button variant="ghost" size="sm" onClick={() => setTab("statement")}>{t("fullStatement")}</Button>} />
              <WalletLedger entries={ledger.entries} limit={6} className="mt-4 border-t" />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="overflow-hidden">
            <CardHeader title={t("invoices")} description={t("invoicesHint")} />
            <div className="mt-4 divide-y border-t">
              {myInvoices.length ? (
                myInvoices.map((i) => (
                  <div key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
                    <button onClick={() => openDoc(i)} className="font-mono text-sm font-semibold text-primary hover:underline">{i.id}</button>
                    <span className="min-w-32 flex-1 text-muted-foreground">
                      {ti("creditLine")}
                      <span className="block text-xs">{i.status === "paid" && i.paidAt ? t("paidOn", { date: formatDate(i.paidAt, lang) }) : t("dueOn", { date: formatDate(i.dueAt, lang) })}</span>
                    </span>
                    <span className="font-bold">{formatCHF(i.amount, lang)}</span>
                    <StatusBadge status={invStatus(i)} />
                    <span className="flex gap-1.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => openDoc(i)} aria-label={t("downloadPdf")}><Download /></Button>
                      {i.status === "due" && <Button size="sm" variant={isOverdue(i) ? "accent" : "outline"} onClick={() => setPaying(i)}>{t("pay")}</Button>}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState icon={<FileText />} title={t("noInvoices")} body={t("noInvoicesBody")} />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardBody className="flex flex-wrap items-center gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success"><Landmark className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">{t("withdrawable")}</p>
                <p className="text-2xl font-bold text-ink">{formatCHF(money.available, lang)}</p>
                <p className="text-xs text-muted-foreground">{t("payoutTo", { iban: partner.bank.iban })}</p>
              </div>
              <Button onClick={() => setPayout(true)} disabled={money.available < MIN_PAYOUT}><ArrowDownToLine /> {t("requestPayout")}</Button>
            </CardBody>
            {money.available < MIN_PAYOUT && <p className="border-t px-5 py-3 text-xs text-muted-foreground">{t("payoutMinimum", { amount: formatCHF(MIN_PAYOUT, lang) })}</p>}
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title={t("payouts")} description={t("payoutsHint")} />
            <div className="mt-4 divide-y border-t">
              {myPayouts.length ? (
                myPayouts.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <Mono>{p.id}</Mono>
                    <span className="min-w-32 flex-1 text-muted-foreground">
                      {t("requestedOn", { date: formatDate(p.createdAt, lang) })}
                      {p.reference && <span className="block text-xs">{p.status === "rejected" ? `“${p.reference}”` : <span className="font-mono" dir="ltr">{p.reference}</span>}</span>}
                    </span>
                    <span className="font-bold">{formatCHF(p.amount, lang)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))
              ) : (
                <EmptyState icon={<Landmark />} title={t("noPayouts")} />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="statement">
          <Statement entries={ledger.entries} />
        </TabsContent>
      </Tabs>

      {upload && <UploadDialog onClose={() => setUpload(false)} />}
      {online && <OnlineTopUpDialog onClose={() => setOnline(false)} onTransfer={() => { setOnline(false); setUpload(true); }} />}
      {payout && <PayoutDialog onClose={() => setPayout(false)} onDone={() => setTab("payouts")} />}
      {paying && <PayInvoiceDialog invoice={paying} onClose={() => setPaying(null)} />}
      {doc && <MoneyDocDialog doc={doc} onClose={() => setDoc(null)} />}
    </>
  );
}

/** Every wallet movement, filterable by type and period, exportable as CSV for the bookkeeping. */
function Statement({ entries }: { entries: ReturnType<typeof walletLedger>["entries"] }) {
  const t = useTranslations("portal.payments");
  const tw = useTranslations("admin.wallets");
  const lang = useLang();
  const [kind, setKind] = useState<LedgerKind | "all">("all");
  const [period, setPeriod] = useState<"all" | "30" | "90" | "365">("all");
  const rows = entries.filter((e) => (kind === "all" || e.kind === kind) && (period === "all" || Date.now() - Date.parse(e.at) <= Number(period) * 86_400_000));
  const total = rows.reduce((a, e) => a + e.amount, 0);

  const exportCsv = () => {
    const head = ["date", "type", "reference", "amount_chf"];
    const lines = rows.map((e) => [e.at.slice(0, 10), tw(`kinds.${e.kind}`, { ref: e.reference }), e.reference, e.amount.toFixed(2)]);
    const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `kompass-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t("statement")}
        description={t("statementHint", { count: rows.length, total: `${total < 0 ? "−" : "+"}${formatCHF(Math.abs(total), lang)}` })}
        action={<Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download /> {t("exportCsv")}</Button>}
      />
      <div className="mt-4 flex flex-wrap gap-2 px-5">
        <Select size="sm" className="w-48" value={kind} onValueChange={(v) => setKind(v as typeof kind)} options={[{ value: "all", label: t("allTypes") }, ...LEDGER_KINDS.map((k) => ({ value: k, label: t(`ledgerKinds.${k}`) }))]} />
        <Select size="sm" className="w-40" value={period} onValueChange={(v) => setPeriod(v as typeof period)} options={(["all", "30", "90", "365"] as const).map((p) => ({ value: p, label: t(`periods.${p}`) }))} />
      </div>
      <WalletLedger entries={rows} limit={500} className="mt-4 border-t" />
    </Card>
  );
}

/** Ask Kompass to pay unused balance to the bank. Shows what is held back and why. */
function PayoutDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useTranslations("portal.payments");
  const tc = useTranslations("common.actions");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const partners = useStore((s) => s.partners);
  const payouts = useStore((s) => s.payouts);
  const invoices = useStore((s) => s.invoices);
  const request = useStore((s) => s.requestPayout);
  const { compose, dialog } = useCompose();
  const money = withdrawable({ partners, payouts, invoices }, partner.id);
  const [amount, setAmount] = useState(String(Math.floor(money.available / 10) * 10 || ""));
  const [busy, setBusy] = useState(false);
  const value = Number(amount) || 0;
  const error = value > money.available ? t("payoutTooHigh", { amount: formatCHF(money.available, lang) }) : value > 0 && value < MIN_PAYOUT ? t("payoutMinimum", { amount: formatCHF(MIN_PAYOUT, lang) }) : undefined;

  const submit = async () => {
    setBusy(true);
    const res = await mock(() => request(partner.id, value), 700);
    setBusy(false);
    if (!res.ok) return toast.error(res.error === "minimum" ? t("payoutMinimum", { amount: formatCHF(MIN_PAYOUT, lang) }) : t("payoutTooHigh", { amount: formatCHF(money.available, lang) }));
    toast.success(t("payoutRequested", { amount: formatCHF(value, lang) }));
    onDone();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("payoutTitle")}</DialogTitle>
          <DialogDescription>{t("payoutBody")}</DialogDescription>
        </DialogHeader>
        <dl className="space-y-1.5 rounded-xl bg-surface-2 p-3 text-sm">
          <Row label={t("balance")} value={formatCHF(money.balance, lang)} />
          {money.requested > 0 && <Row label={t("heldRequested")} value={`− ${formatCHF(money.requested, lang)}`} muted />}
          {money.creditDue > 0 && <Row label={t("heldCredit")} value={`− ${formatCHF(money.creditDue, lang)}`} muted />}
          <Row label={t("withdrawable")} value={formatCHF(money.available, lang)} strong />
        </dl>
        <Field label={`${t("payoutAmount")} (CHF)`} error={error}>
          <Input type="number" min={MIN_PAYOUT} max={money.available} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="rounded-xl border p-3 text-sm">
          <p className="text-xs text-muted-foreground">{t("payoutBank")}</p>
          <p className="font-semibold text-ink">{partner.bank.name} · {partner.bank.owner}</p>
          <p className="font-mono text-sm" dir="ltr">{partner.bank.iban}</p>
          <button type="button" className="mt-1 text-xs font-semibold text-primary hover:underline" onClick={() => compose({ topic: "billing", subject: t("ibanChangeSubject"), hint: t("ibanChangeHint") })}>
            {t("ibanWrong")}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t("payoutTiming")}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={submit} disabled={!value || !!error} loading={busy}><ArrowDownToLine /> {t("requestPayout")}</Button>
        </DialogFooter>
        {dialog}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", muted && "text-muted-foreground", strong && "border-t pt-1.5 font-bold text-ink")}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Pay a credit invoice: online (card / TWINT, settled at once) or by bank transfer with the invoice number as reference. */
function PayInvoiceDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const t = useTranslations("portal.payments");
  const tw = useTranslations("admin.wallets");
  const tc = useTranslations("common");
  const lang = useLang();
  const payOnline = useStore((s) => s.payInvoiceOnline);
  const [how, setHow] = useState<"card" | "twint" | "transfer">("card");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const copy = (v: string) => {
    navigator.clipboard?.writeText(v);
    toast.success(tc("toast.copied"));
  };

  const pay = async () => {
    if (how === "transfer") return onClose();
    setBusy(true);
    await mock(() => payOnline(invoice.id, how), 1200);
    setBusy(false);
    setDone(true);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="py-4 text-center">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-success-soft text-success"><Check className="size-7" /></span>
            <DialogTitle>{t("invoicePaidTitle")}</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">{t("invoicePaidBody", { id: invoice.id, amount: formatCHF(invoice.amount, lang) })}</p>
            <Button className="mt-6" onClick={onClose}>{tc("actions.close")}</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("payInvoiceTitle", { id: invoice.id })}</DialogTitle>
              <DialogDescription>{t("payInvoiceBody", { amount: formatCHF(invoice.amount, lang), date: formatDate(invoice.dueAt, lang) })}</DialogDescription>
            </DialogHeader>
            <RadioCards
              className="grid-cols-3"
              value={how}
              onValueChange={(v) => setHow(v as typeof how)}
              options={[
                { value: "card", label: tw("payMethods.card") },
                { value: "twint", label: tw("payMethods.twint") },
                { value: "transfer", label: tw("payMethods.bank_transfer") },
              ]}
            />
            {how === "transfer" ? (
              <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm">
                {[
                  [t("bankDetails"), KOMPASS_IBAN],
                  [t("transferReference"), invoice.id],
                  [tc("fields.amount"), formatCHF(invoice.amount, lang)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-xs text-muted-foreground">{label}</span>
                      <span className="font-mono font-semibold" dir="ltr">{value}</span>
                    </span>
                    <Button variant="ghost" size="icon-sm" aria-label={tc("actions.copy")} onClick={() => copy(value)}><Copy /></Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">{t("transferHint")}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("payOnlineHint")}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>{tc("actions.cancel")}</Button>
              {how === "transfer" ? (
                <Button onClick={onClose}><Check /> {t("transferDone")}</Button>
              ) : (
                <Button variant="accent" onClick={pay} loading={busy}><CreditCard /> {t("payNow", { amount: invoice.amount })}</Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
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
    if (f.size > 1_500_000) return toast.error(t("maxSize"));
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
