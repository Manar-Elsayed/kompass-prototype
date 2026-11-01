import type { DB } from "@/lib/types";
import { DAY, NOW } from "./rng";
import { services } from "./catalog";
import { blogs, config, faqs, modelOffers, roles, site, users } from "./content";
import {
  contacts,
  coupons,
  dues,
  fakeReports,
  faqQuestions,
  notifications,
  offers,
  orders,
  partners,
  refunds,
  removals,
  topups,
  invoices,
  files,
  messages,
  payouts,
  nominations,
  formSessions,
  reviews,
  visitors,
} from "./generated";

/** Fresh deep copy of the demo database. */
export function createSeed(): DB {
  return withLateDiscounts(withFreshActivity(structuredClone({
    services,
    offers,
    orders,
    fakeReports,
    partners,
    dues,
    refunds,
    topups,
    invoices,
    files,
    messages,
    payouts,
    nominations,
    formSessions,
    reviews,
    removals,
    coupons,
    contacts,
    faqQuestions,
    visitors,
    notifications,
    roles,
    users,
    blogs,
    faqs,
    modelOffers,
    site,
    config,
  })));
}

/**
 * Kompass lowers the price of an offer only late (expiring soon or one slot left). Which offers are
 * late depends on today, so when the demo data loads, the two late offers on sale closest to their
 * deadline get a discount (20 % and CHF 10): the shop's Discounts view always has examples.
 */
function withLateDiscounts(db: DB): DB {
  const now = Math.max(NOW, Date.now());
  const sold = (id: string) => db.orders.filter((o) => o.offerId === id).length;
  const late = db.offers
    .filter((o) => {
      // the same rule as canDiscount in selectors (not imported: selectors already import the seed)
      const left = o.offersWanted - sold(o.id);
      const days = (Date.parse(o.deadline) - now) / DAY;
      return o.status === "in_progress" && o.active && left > 0 && days >= 0 && (days <= 3 || left === 1 || !!o.repostedAt);
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 2);
  late.forEach((o, i) => {
    o.discount = i === 0
      ? { type: "percent", value: 20, at: new Date(now - DAY).toISOString(), byUserId: "u-1" }
      : { type: "fixed", value: 10, at: new Date(now - DAY / 4).toISOString(), byUserId: "u-1" };
  });
  return db;
}

/**
 * Partner health (Activity) compares "last seen" with today. The demo data is dated around a fixed
 * day, so as real days pass every company would drift to Dormant. Last seen is set relative to when
 * the demo data loads instead, following how much each company buys: the busiest were here today,
 * the middle a few days ago, and the quietest few have not logged in for weeks. Recent top-ups follow the
 * same order, so Active, Slowing down, Dormant and Inactive all show and none contradicts the offers bought.
 */
function withFreshActivity(db: DB): DB {
  const now = Math.max(NOW, Date.now());
  const recent = (id: string) => db.orders.filter((o) => o.partnerId === id && now - Date.parse(o.createdAt) <= 30 * DAY).length;
  const approved = db.partners.filter((p) => p.status === "approved").sort((a, b) => recent(b.id) - recent(a.id) || a.id.localeCompare(b.id));
  const dormantFrom = approved.length - Math.max(2, Math.round(approved.length * 0.2));
  const days = new Map(approved.map((p, i) => [p.id, i >= dormantFrom ? 16 + (i - dormantFrom) * 6 : 0.1 + (i % 7) * 0.9]));
  db.partners = db.partners.map((p) => (days.has(p.id) ? { ...p, lastSeen: new Date(now - days.get(p.id)! * DAY).toISOString() } : p));
  // a company that keeps buying keeps topping up: the busiest paid in the last two weeks, the middle
  // a few weeks ago, the quietest not recently (Activity: Active / Slowing down / Dormant)
  const busy = Math.round(approved.length * 0.35);
  approved.slice(0, dormantFrom).forEach((p, i) => {
    const ago = i < busy ? 1 + (i % 6) * 2 : 18 + (i % 4) * 7;
    db.topups.push({
      id: `TU-L${String(i + 1).padStart(3, "0")}`,
      partnerId: p.id,
      amount: [150, 200, 300][i % 3],
      method: "online",
      payMethod: i % 2 ? "twint" : "card",
      reference: `PAY-${700000 + i * 137}`,
      note: "",
      createdAt: new Date(now - ago * DAY).toISOString(),
    });
  });
  return db;
}

export { CITIES, KOMPASS_REVIEW_L10N, trafficSeries, visitorsOnDay } from "./generated";
export { NOW, DAY } from "./rng";
