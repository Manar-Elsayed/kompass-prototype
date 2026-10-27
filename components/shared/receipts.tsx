"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Partner } from "@/lib/types";
import { receiptRows, type LedgerEntry } from "@/lib/mock/selectors";
import { useStore } from "@/lib/mock/store";
import { MoneyDocDialog, type MoneyDoc } from "@/components/shared/money-doc";

/**
 * Receipts for wallet movements: the number Kompass gave the payment, top-up or purchase, and the
 * document itself (with Download PDF). The admin and the company see the same receipt for the same
 * movement. Refunds, credit and payouts have no receipt.
 */
export function useReceipts() {
  const tw = useTranslations("admin.wallets");
  const dues = useStore((s) => s.dues);
  const topups = useStore((s) => s.topups);
  const orders = useStore((s) => s.orders);
  const prefix = useStore((s) => s.config.invoicePrefix);
  const numbers = useMemo(() => new Map(receiptRows({ dues, topups, orders }, prefix).map((r) => [r.sourceId, r.id])), [dues, topups, orders, prefix]);
  const [doc, setDoc] = useState<MoneyDoc | null>(null);

  const numberOf = (e: LedgerEntry) => numbers.get(e.id);
  const open = (e: LedgerEntry, partner: MoneyDoc["partner"]) => {
    const id = numbers.get(e.id);
    if (id) setDoc({ kind: "receipt", id, date: e.at, partner, line: tw(`kinds.${e.kind}`, { ref: e.reference }), amount: Math.abs(e.amount) });
  };
  const dialog = doc && <MoneyDocDialog doc={doc} onClose={() => setDoc(null)} />;
  return { numberOf, open, dialog };
}

/** What a receipt needs to know about the company it is made out to. */
export const receiptParty = (p: Partner): MoneyDoc["partner"] => ({ id: p.id, name: p.name, address: p.address, zip: p.zip, city: p.city, regNumber: p.regNumber });
