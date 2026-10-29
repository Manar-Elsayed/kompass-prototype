"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import type { Partner, PartnerDue } from "@/lib/types";
import { cn, formatCHF, formatDateTime } from "@/lib/utils";
import { useLang } from "@/lib/mock/hooks";
import { KOMPASS_IBAN } from "@/components/shared/money-doc";
import { FileCard, type FileRef } from "@/components/shared/file-card";

/** Stand-in used by the demo payments: their proof is drawn from the payment itself. */
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
 * The proof of payment as a file: what the company uploaded, or for the demo payments the
 * confirmation its bank, TWINT or card would show. `null` when the company sent no file.
 */
export function proofFile(due: PartnerDue): FileRef | null {
  if (!due.receipt) return null;
  if (due.receipt === PLACEHOLDER) return { name: `${due.method === "bank_transfer" ? "ebanking" : due.method}-${due.reference}.png` };
  const pdf = /^data:application\/pdf/.test(due.receipt) || /\.pdf$/i.test(due.receipt);
  return { name: `proof-${due.reference}.${pdf ? "pdf" : "png"}`, url: due.receipt };
}

/** The proof card: View, Download and (for admin) Upload / Replace; an empty slot says nothing was sent. */
export function ProofCard({ due, partner, onUpload, meta }: { due: PartnerDue; partner?: Pick<Partner, "name" | "bank">; onUpload?: (f: FileRef) => void; meta?: React.ReactNode }) {
  const t = useTranslations("common.proof");
  const file = proofFile(due);
  return (
    <FileCard
      file={file}
      meta={meta}
      render={file && !file.url ? <Confirmation due={due} partner={partner} large /> : undefined}
      onUpload={onUpload}
      emptyText={t("none")}
    />
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
      <div className={cn("px-4", large ? "py-6" : "pb-4 pt-4")}>
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
