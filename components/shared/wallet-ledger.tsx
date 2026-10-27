"use client";

import { useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, CreditCard, FileText, HandCoins, Landmark, RotateCcw } from "lucide-react";
import type { LedgerEntry } from "@/lib/mock/selectors";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useLang } from "@/lib/mock/hooks";

const ICON = {
  receipt: ArrowDownLeft,
  online: CreditCard,
  admin: ArrowDownLeft,
  credit: HandCoins,
  purchase: ArrowUpRight,
  refund: RotateCcw,
  payout: Landmark,
} as const;

/**
 * One company's wallet movements, newest first. Shared by the admin Wallets page and the portal.
 * With `receiptOf` / `onReceipt`, lines that have a receipt get a button that opens it.
 */
export function WalletLedger({
  entries,
  limit = 60,
  className,
  receiptOf,
  onReceipt,
}: {
  entries: LedgerEntry[];
  limit?: number;
  className?: string;
  receiptOf?: (e: LedgerEntry) => string | undefined;
  onReceipt?: (e: LedgerEntry) => void;
}) {
  const t = useTranslations("admin.wallets");
  const tr = useTranslations("admin.invoices");
  const lang = useLang();
  if (!entries.length) return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("noMoves")}</p>;
  return (
    <ul className={cn("divide-y", className)}>
      {entries.slice(0, limit).map((e) => {
        const Icon = ICON[e.kind];
        const out = e.amount < 0;
        return (
          <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 px-5 py-2.5 text-sm">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full",
                out ? "bg-muted text-muted-foreground" : e.kind === "credit" ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{t(`kinds.${e.kind}`, { ref: e.reference })}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(e.at, lang)}
                {e.payMethod && ` · ${t(`payMethods.${e.payMethod}`)}`}
                {e.kind !== "purchase" && e.reference && e.reference !== e.id && <span className="font-mono"> · {e.reference}</span>}
              </span>
            </span>
            <span className={cn("whitespace-nowrap font-semibold", out ? "text-ink" : "text-success")}>
              {out ? "−" : "+"}
              {formatCHF(Math.abs(e.amount), lang)}
            </span>
            {onReceipt && (
              <span className="w-24 shrink-0 text-end">
                {receiptOf?.(e) && (
                  <button
                    type="button"
                    onClick={() => onReceipt(e)}
                    title={receiptOf(e)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft"
                  >
                    <FileText className="size-3.5" /> {tr("receipt")}
                  </button>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
