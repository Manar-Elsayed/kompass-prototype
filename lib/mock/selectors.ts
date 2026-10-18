import type { DB } from "@/lib/types";
import { NOW, DAY } from "./seed";

/** Reference "now": the frozen seed date, or real time if later (for new entries). */
export const refNow = () => Math.max(NOW, Date.now());

export function inLastDays(iso: string, days: number, offsetDays = 0) {
  const t = Date.parse(iso);
  const end = refNow() - offsetDays * DAY;
  return t <= end && t > end - days * DAY;
}

export function partnerLedger(db: Pick<DB, "orders" | "dues">, partnerId: string) {
  const purchased = db.orders.filter((o) => o.partnerId === partnerId).reduce((a, o) => a + o.price, 0);
  const paid = db.dues.filter((d) => d.partnerId === partnerId && d.status === "confirmed").reduce((a, d) => a + d.amount, 0);
  const pending = db.dues.filter((d) => d.partnerId === partnerId && d.status === "pending").reduce((a, d) => a + d.amount, 0);
  const leads = db.orders.filter((o) => o.partnerId === partnerId).length;
  return { purchased, paid, pending, leads, outstanding: Math.max(0, purchased - paid) };
}

export function finance(db: Pick<DB, "orders" | "dues" | "partners">) {
  const totalIncome = db.orders.reduce((a, o) => a + o.price, 0);
  const pendingDues = db.dues.filter((d) => d.status === "pending").reduce((a, d) => a + d.amount, 0);
  const kompassDues = db.partners
    .filter((p) => p.status === "approved")
    .reduce((a, p) => a + partnerLedger(db, p.id).outstanding, 0);
  return { totalIncome, pendingDues, kompassDues };
}

/** Leads a partner can buy right now: active, matching services, slots left, not already owned. */
export function availableLeads(db: Pick<DB, "offers" | "orders">, partner: { id: string; serviceIds: string[] }) {
  const sold: Record<string, number> = {};
  const mine = new Set<string>();
  for (const o of db.orders) {
    sold[o.offerId] = (sold[o.offerId] ?? 0) + 1;
    if (o.partnerId === partner.id) mine.add(o.offerId);
  }
  return db.offers
    .filter(
      (o) =>
        o.active &&
        !["completed", "cancelled", "failed"].includes(o.status) &&
        Date.parse(o.executionDate) >= refNow() &&
        partner.serviceIds.includes(o.serviceId) &&
        (sold[o.id] ?? 0) < o.offersWanted &&
        !mine.has(o.id),
    )
    .map((o) => ({ offer: o, sold: sold[o.id] ?? 0 }));
}

export function soldCount(db: Pick<DB, "orders">, offerId: string) {
  return db.orders.filter((o) => o.offerId === offerId).length;
}

export function pctDelta(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}
