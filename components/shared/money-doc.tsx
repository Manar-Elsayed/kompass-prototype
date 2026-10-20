"use client";

import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import type { Partner } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo, StatusBadge } from "@/components/shared/bits";

export const KOMPASS_IBAN = "CH44 0070 0110 0012 3456 7";

export interface MoneyDoc {
  kind: "receipt" | "invoice";
  id: string;
  date: string;
  partner: Pick<Partner, "name" | "address" | "zip" | "city">;
  line: string;
  amount: number;
  /** invoices only */
  status?: "due" | "paid" | "overdue";
  dueAt?: string;
  paidAt?: string;
}

/** A receipt or credit invoice as the company would receive it. Printing prints only the document. */
export function MoneyDocDialog({ doc, onClose }: { doc: MoneyDoc; onClose: () => void }) {
  const t = useTranslations("admin.invoices");
  const lang = useLang();
  const vatRate = useStore((s) => s.config.vatRate);
  const vat = doc.amount - doc.amount / (1 + vatRate / 100);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t(doc.kind === "invoice" ? "invoiceNo" : "receiptNo", { id: doc.id })}</DialogTitle>
        </DialogHeader>
        <article className="print-doc rounded-xl border bg-surface p-6 text-sm">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <Logo className="h-6" />
              <p className="mt-2 text-xs text-muted-foreground">Kompass Umzug GmbH · Bahnhofstrasse 21 · 8001 Zürich</p>
            </div>
            <div className="text-end">
              <p className="font-bold text-ink">{t(doc.kind === "invoice" ? "invoiceNo" : "receiptNo", { id: doc.id })}</p>
              <p className="text-xs text-muted-foreground">{formatDate(doc.date, lang)}</p>
              {doc.status && <StatusBadge status={doc.status} className="mt-1" />}
            </div>
          </header>
          <p className="text-xs font-semibold text-muted-foreground">{t("billedTo")}</p>
          <p className="mb-5 font-semibold text-ink">
            {doc.partner.name}
            <span className="block font-normal text-muted-foreground">
              {doc.partner.address}, {doc.partner.zip} {doc.partner.city}
            </span>
          </p>
          <div className="flex items-center justify-between border-y py-3">
            <span className="text-muted-foreground">{t("description")}</span>
            <span className="text-muted-foreground">CHF</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span>{doc.line}</span>
            <span>{formatCHF(doc.amount, lang)}</span>
          </div>
          <div className="flex items-center justify-between border-t py-3 font-bold text-ink">
            <span>{t("total")}</span>
            <span>{formatCHF(doc.amount, lang)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("vat", { vat: vat.toFixed(2) })}</p>
          {doc.kind === "invoice" && doc.dueAt && doc.status !== "paid" && (
            <p className="mt-4 rounded-lg bg-surface-2 p-3 text-xs">{t("payBy", { date: formatDate(doc.dueAt, lang), iban: KOMPASS_IBAN, id: doc.id })}</p>
          )}
          {doc.paidAt && <p className="mt-4 text-xs text-success">{t("paidOn", { date: formatDate(doc.paidAt, lang) })}</p>}
        </article>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> {t("print")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
