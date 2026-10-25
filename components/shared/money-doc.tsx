"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Printer } from "lucide-react";
import type { Partner } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo, StatusBadge } from "@/components/shared/bits";

export const KOMPASS_IBAN = "CH44 0070 0110 0012 3456 7";
/** The company that issues every invoice and receipt. */
const KOMPASS = {
  name: "Kompass Umzug GmbH",
  street: "Bahnhofstrasse 21",
  city: "8001 Zürich",
  vatNo: "CHE-123.456.789 MWST",
  web: "kompassumzug.ch",
};

export interface MoneyDoc {
  kind: "receipt" | "invoice";
  id: string;
  date: string;
  partner: Pick<Partner, "name" | "address" | "zip" | "city"> & Partial<Pick<Partner, "id" | "regNumber">>;
  line: string;
  amount: number;
  /** invoices only */
  status?: "due" | "paid" | "overdue";
  dueAt?: string;
  paidAt?: string;
}

/** A credit invoice or a receipt in a dialog with a print button. Printing prints only the document. */
export function MoneyDocDialog({ doc, onClose }: { doc: MoneyDoc; onClose: () => void }) {
  const t = useTranslations("admin.invoices");
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(doc.kind === "invoice" ? "invoiceNo" : "receiptNo", { id: doc.id })}</DialogTitle>
        </DialogHeader>
        <MoneyDocument doc={doc} />
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> {t("print")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The document as the company receives it: Kompass as the sender, the company, one line with VAT
 * shown, and how to pay while an invoice is open. Amounts include VAT.
 */
export function MoneyDocument({ doc }: { doc: MoneyDoc }) {
  const t = useTranslations("admin.invoices");
  const lang = useLang();
  const vatRate = useStore((s) => s.config.vatRate);
  const billingEmail = useStore((s) => s.config.supportEmail);
  const phone = useStore((s) => s.site.general.phone);
  const invoice = doc.kind === "invoice";
  const net = doc.amount / (1 + vatRate / 100);
  const vat = doc.amount - net;
  const open = invoice && doc.status !== "paid";
  const chf = (n: number) => formatCHF(n, lang, 2);

  const meta: { label: string; value: string }[] = [
    { label: t(invoice ? "invoiceDate" : "receiptDate"), value: formatDate(doc.date, lang) },
    ...(invoice && doc.dueAt ? [{ label: t("due"), value: formatDate(doc.dueAt, lang) }] : []),
    ...(doc.partner.id ? [{ label: t("customerNo"), value: doc.partner.id.toUpperCase() }] : []),
    { label: t("referenceLabel"), value: doc.id },
  ];

  return (
    <article className="print-doc min-w-0 rounded-xl border bg-surface p-4 text-sm sm:p-8">
      {/* sender and document title */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <Logo className="h-7" />
          <address className="mt-3 text-xs not-italic leading-relaxed text-muted-foreground">
            {KOMPASS.name}
            <br />
            {KOMPASS.street}, {KOMPASS.city}
            <br />
            {t("vatNo")} {KOMPASS.vatNo}
            <br />
            <span dir="ltr">{billingEmail} · {phone}</span>
          </address>
        </div>
        <div className="text-end">
          <p className="text-2xl font-bold tracking-tight text-ink">{t(invoice ? "invoiceTitle" : "receiptTitle")}</p>
          <p className="font-mono text-sm font-semibold text-muted-foreground" dir="ltr">{doc.id}</p>
          {doc.status && <StatusBadge status={doc.status} className="mt-2" />}
        </div>
      </header>

      {/* dates and references */}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-surface-2/70 p-4 sm:grid-cols-4">
        {meta.map((m) => (
          <div key={m.label}>
            <dt className="text-xs text-muted-foreground">{m.label}</dt>
            <dd className="font-semibold text-ink" dir="ltr">{m.value}</dd>
          </div>
        ))}
      </dl>

      {/* customer */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(invoice ? "billedTo" : "receivedFrom")}</p>
        <p className="mt-1 font-semibold text-ink">{doc.partner.name}</p>
        <p className="text-muted-foreground">
          {doc.partner.address}, {doc.partner.zip} {doc.partner.city}
        </p>
        {doc.partner.regNumber && <p className="text-xs text-muted-foreground" dir="ltr">{doc.partner.regNumber}</p>}
      </div>

      {/* items */}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-y text-xs text-muted-foreground">
            <th className="py-2.5 text-start font-medium">{t("description")}</th>
            <th className="hidden w-12 py-2.5 text-end font-medium sm:table-cell">{t("qty")}</th>
            <th className="hidden w-28 py-2.5 text-end font-medium sm:table-cell">{t("unitPrice")}</th>
            <th className="w-24 py-2.5 text-end font-medium sm:w-28">{t("amountCol")}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-3 pe-3 text-ink">{doc.line}</td>
            {/* small screens: the amount column alone carries the line */}
            <td className="hidden py-3 text-end tabular-nums sm:table-cell">1</td>
            <td className="hidden py-3 text-end tabular-nums sm:table-cell">{chf(doc.amount)}</td>
            <td className="py-3 text-end tabular-nums">{chf(doc.amount)}</td>
          </tr>
        </tbody>
      </table>

      {/* totals */}
      <dl className="ms-auto mt-3 w-full max-w-64 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4 text-muted-foreground">
          <dt>{t("subtotal")}</dt>
          <dd className="tabular-nums">{chf(net)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-muted-foreground">
          <dt>{t("vatLine", { rate: vatRate })}</dt>
          <dd className="tabular-nums">{chf(vat)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t pt-2 text-base font-bold text-ink">
          <dt>{t("totalIncl")}</dt>
          <dd className="tabular-nums">{chf(doc.amount)}</dd>
        </div>
      </dl>

      {/* how to pay, or proof that it is paid */}
      {open && doc.dueAt ? (
        <section className="mt-6 rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
          <p className="mb-3 font-bold text-ink">{t("payTitle")}</p>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {[
              [t("accountHolder"), KOMPASS.name],
              ["IBAN", KOMPASS_IBAN],
              [t("referenceLabel"), doc.id],
              [t("payAmountBy", { date: formatDate(doc.dueAt, lang) }), chf(doc.amount)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-mono font-semibold text-ink" dir="ltr">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{t("payHint")}</p>
        </section>
      ) : (
        (doc.paidAt || !invoice) && (
          <p className={cn("mt-6 flex items-center gap-2 font-semibold text-success")}>
            <CheckCircle2 className="size-4" />
            {doc.paidAt ? t("paidOn", { date: formatDate(doc.paidAt, lang) }) : t("paidReceipt")}
          </p>
        )
      )}

      <footer className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
        <p className="font-medium text-ink">{t("thanks")}</p>
        <p className="mt-1" dir="ltr">
          {t("questions")} {billingEmail} · {phone} · {KOMPASS.web}
        </p>
      </footer>
    </article>
  );
}
