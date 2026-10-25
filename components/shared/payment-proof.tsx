"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CheckCircle2, Maximize2 } from "lucide-react";
import type { Partner, PartnerDue } from "@/lib/types";
import { cn, formatCHF, formatDateTime } from "@/lib/utils";
import { useLang } from "@/lib/mock/hooks";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { KOMPASS_IBAN } from "@/components/shared/money-doc";

/** Stand-in used by the demo data and by uploads without a file. */
const PLACEHOLDER = "/images/complaint.png";
const KOMPASS_NAME = "Kompass Umzug GmbH";

/** Stable digits from an id, so a payment always shows the same card ending or transaction number. */
const digits = (id: string, n: number) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1_000_000_007;
  return String(h).padStart(n, "0").slice(-n);
};
const maskIban = (iban: string) => {
  const flat = iban.replace(/\s/g, "");
  return `${flat.slice(0, 4)} •••• •••• ${flat.slice(-4)}`;
};

/**
 * The proof of payment a company attached: its own file when it uploaded one, otherwise the
 * confirmation its bank, TWINT or card would show, drawn from the payment itself. Click to enlarge.
 */
export function PaymentProof({ due, partner }: { due: PartnerDue; partner?: Pick<Partner, "name" | "bank"> }) {
  const t = useTranslations("common.proof");
  const [big, setBig] = useState(false);
  const uploaded = due.receipt && due.receipt !== PLACEHOLDER;

  const view = (large: boolean) =>
    uploaded ? (
      <div className={cn("relative overflow-hidden rounded-xl border bg-surface-2", large ? "aspect-[3/4] w-full" : "aspect-[4/3]")}>
        <Image src={due.receipt} alt={t("title")} fill className="object-contain" sizes={large ? "640px" : "480px"} />
      </div>
    ) : (
      <Confirmation due={due} partner={partner} large={large} />
    );

  return (
    <>
      <button type="button" onClick={() => setBig(true)} className="group relative block w-full text-start" aria-label={t("open")} title={t("open")}>
        {view(false)}
        {/* icon only, in the bottom corner, so it never covers the header or the date */}
        <span className="absolute bottom-2 end-2 flex size-8 items-center justify-center rounded-lg border bg-surface/95 text-ink shadow-sm transition group-hover:bg-surface group-hover:text-primary">
          <Maximize2 className="size-4" />
        </span>
      </button>
      <Dialog open={big} onOpenChange={setBig}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogTitle className="sr-only">{t("title")}</DialogTitle>
          {view(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A bank transfer, TWINT or card confirmation for this payment. */
function Confirmation({ due, partner, large }: { due: PartnerDue; partner?: Pick<Partner, "name" | "bank">; large: boolean }) {
  const t = useTranslations("common.proof");
  const lang = useLang();
  const amount = formatCHF(due.amount, lang, 2);
  const when = formatDateTime(due.createdAt, lang);
  const rows: [string, string][] =
    due.method === "bank_transfer"
      ? [
          [t("debitAccount"), `${partner?.bank.owner ?? partner?.name ?? ""} · ${maskIban(partner?.bank.iban ?? "CH00 0000 0000 0000 0000 0")}`],
          [t("beneficiary"), KOMPASS_NAME],
          [t("beneficiaryIban"), KOMPASS_IBAN],
          [t("message"), due.reference],
          [t("executionDate"), when],
        ]
      : due.method === "twint"
        ? [
            [t("to"), KOMPASS_NAME],
            [t("message"), due.reference],
            [t("dateTime"), when],
            [t("transactionId"), `TW${digits(due.id, 10)}`],
          ]
        : [
            [t("card"), `Visa •••• ${digits(due.id, 4)}`],
            [t("merchant"), KOMPASS_NAME],
            [t("message"), due.reference],
            [t("dateTime"), when],
            [t("authCode"), digits(`${due.id}a`, 6)],
          ];
  const head =
    due.method === "bank_transfer"
      ? { brand: `${partner?.bank.name ?? t("bank")} · ${t("eBanking")}`, title: t("orderExecuted"), tone: "bg-ink text-white" }
      : due.method === "twint"
        ? { brand: "TWINT", title: t("twintTitle"), tone: "bg-neutral-900 text-white" }
        : { brand: t("cardBrand"), title: t("cardTitle"), tone: "bg-primary text-white" };

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-surface shadow-sm", large ? "text-sm" : "text-xs")} dir="ltr">
      <div className={cn("flex items-center justify-between px-4 py-2.5 font-semibold", head.tone)}>
        <span>{head.brand}</span>
        <span className="opacity-70">{when}</span>
      </div>
      {/* the small view keeps room at the bottom for the enlarge icon */}
      <div className={cn("px-4", large ? "py-6" : "pb-12 pt-4")}>
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className={large ? "size-6" : "size-5"} />
          <span className="font-semibold">{head.title}</span>
        </div>
        <p className={cn("mt-2 font-bold tracking-tight text-ink", large ? "text-3xl" : "text-2xl")}>{amount}</p>
        <dl className="mt-4 divide-y border-t">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-end font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
