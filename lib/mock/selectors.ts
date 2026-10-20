import type { DB, Offer, VerificationFlag } from "@/lib/types";
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

/** Whole days until the customer's deadline (negative once it has passed). */
export const daysLeft = (iso: string) => Math.ceil((Date.parse(iso) - refNow()) / DAY);

/** On sale, inside the deadline window where admin should repost it (2-3 days, per the brief). */
export const EXPIRING_DAYS = 3;
export const isExpiringSoon = (o: Pick<Offer, "status" | "deadline">) => {
  const d = daysLeft(o.deadline);
  return o.status === "in_progress" && d >= 0 && d <= EXPIRING_DAYS;
};

/** An offer can be bought while it is on sale, visible, inside its deadline and has slots left. */
export const isPurchasable = (o: Offer, sold: number) =>
  o.active && o.status === "in_progress" && Date.parse(o.deadline) >= refNow() && sold < o.offersWanted;

/** Leads a partner can buy right now: purchasable, matching services, not already owned. Reposted ones first. */
export function availableLeads(db: Pick<DB, "offers" | "orders">, partner: { id: string; serviceIds: string[] }) {
  const sold: Record<string, number> = {};
  const mine = new Set<string>();
  for (const o of db.orders) {
    sold[o.offerId] = (sold[o.offerId] ?? 0) + 1;
    if (o.partnerId === partner.id) mine.add(o.offerId);
  }
  return db.offers
    .filter((o) => isPurchasable(o, sold[o.id] ?? 0) && partner.serviceIds.includes(o.serviceId) && !mine.has(o.id))
    .map((o) => ({ offer: o, sold: sold[o.id] ?? 0 }))
    .sort((a, b) => (b.offer.repostedAt ?? "").localeCompare(a.offer.repostedAt ?? ""));
}

const PHONE_OK = /^\+?[\d\s()-]{9,}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const DISPOSABLE = /@(mailinator|guerrillamail|10minutemail|tempmail|trashmail|yopmail)\./i;

/**
 * Automatic checks run on every new offer before it is distributed. A clean offer goes on sale
 * straight away; any flag keeps it in New until an admin approves it or cancels it as fake.
 */
export function verificationFlags(offer: Pick<Offer, "id" | "phone" | "email" | "ip" | "createdAt">, existing: Offer[]): VerificationFlag[] {
  const flags: VerificationFlag[] = [];
  const t = Date.parse(offer.createdAt);
  const others = existing.filter((o) => o.id !== offer.id && o.status !== "cancelled");
  const recent = (o: Offer, days: number) => Math.abs(t - Date.parse(o.createdAt)) <= days * DAY;
  const norm = (p: string) => p.replace(/\D/g, "");
  if (others.some((o) => recent(o, 30) && (o.email.toLowerCase() === offer.email.toLowerCase() || norm(o.phone) === norm(offer.phone)))) flags.push("duplicate");
  if (!PHONE_OK.test(offer.phone.trim())) flags.push("invalid_phone");
  if (!EMAIL_OK.test(offer.email.trim()) || DISPOSABLE.test(offer.email)) flags.push("invalid_email");
  if (others.filter((o) => o.ip === offer.ip && recent(o, 1)).length >= 2) flags.push("ip_burst");
  return flags;
}

export function soldCount(db: Pick<DB, "orders">, offerId: string) {
  return db.orders.filter((o) => o.offerId === offerId).length;
}

export function pctDelta(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}
