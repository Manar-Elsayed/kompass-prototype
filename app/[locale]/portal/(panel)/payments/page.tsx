"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock, Copy, ImageUp, RotateCcw, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { PartnerDue } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
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

const KOMPASS_IBAN = "CH44 0070 0110 0012 3456 7";

export default function PaymentsPage() {
  const t = useTranslations("portal.payments");
  const td = useTranslations("admin.dues");
  const tt = useTranslations("common.table");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const dues = useStore((s) => s.dues).filter((d) => d.partnerId === partner.id);
  const orders = useStore((s) => s.orders).filter((o) => o.partnerId === partner.id);
  const reports = useStore((s) => s.fakeReports);
  const [upload, setUpload] = useState(false);

  const pending = dues.filter((d) => d.status === "pending").reduce((a, d) => a + d.amount, 0);
  const spent = orders.reduce((a, o) => a + o.price, 0);
  const refunds = reports.filter((r) => r.status === "confirmed" && orders.some((o) => o.id === r.orderId));

  const statement = [
    ...dues.filter((d) => d.status === "confirmed").map((d) => ({ at: d.createdAt, label: t("topup", { ref: d.reference }), amount: d.amount, kind: "in" as const })),
    ...refunds.map((r) => ({ at: r.createdAt, label: t("refund"), amount: orders.find((o) => o.id === r.orderId)!.price, kind: "refund" as const })),
    ...orders.map((o) => ({ at: o.createdAt, label: t("purchase", { id: o.offerId }), amount: -o.price, kind: "out" as const })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} actions={<Button variant="accent" onClick={() => setUpload(true)}><Upload /> {t("upload")}</Button>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("balance")} value={formatCHF(partner.wallet, lang)} icon={<Wallet />} />
        <KpiCard label={t("pending")} value={formatCHF(pending, lang)} icon={<Clock />} tone="warning" />
        <KpiCard label={t("spent")} value={formatCHF(spent, lang)} icon={<Banknote />} tone="accent" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden">
          <CardHeader title={t("history")} />
          <div className="mt-4 divide-y border-t">
            {dues.length ? (
              dues.map((d) => (
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

        <Card className="h-fit overflow-hidden">
          <CardHeader title={t("statement")} />
          <ul className="mt-4 max-h-[480px] divide-y overflow-y-auto border-t">
            {statement.slice(0, 40).map((s, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", s.kind === "out" ? "bg-muted text-muted-foreground" : "bg-success-soft text-success")}>
                  {s.kind === "out" ? <ArrowUpRight className="size-3.5" /> : s.kind === "refund" ? <RotateCcw className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(s.at, lang)}</span>
                </span>
                <span className={cn("font-semibold", s.amount > 0 ? "text-success" : "text-ink")} dir="ltr">{s.amount > 0 ? "+" : "−"}{formatCHF(Math.abs(s.amount), lang)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {upload && <UploadDialog onClose={() => setUpload(false)} />}
    </>
  );
}

function UploadDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("portal.payments");
  const td = useTranslations("admin.dues");
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
