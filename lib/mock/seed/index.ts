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
  return withFreshActivity(structuredClone({
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
  }));
}

/**
 * Partner health (Activity) compares "last seen" with today. The demo data is dated around a fixed
 * day, so as real days pass every company would drift to Dormant. Last seen is set relative to when
 * the demo data loads instead, following how much each company buys: the busiest were here today,
 * the middle a few days ago, and the quietest few have not logged in for weeks. So Healthy, At risk
 * and Dormant all show, and none of them contradicts the offers bought.
 */
function withFreshActivity(db: DB): DB {
  const now = Math.max(NOW, Date.now());
  const recent = (id: string) => db.orders.filter((o) => o.partnerId === id && now - Date.parse(o.createdAt) <= 30 * DAY).length;
  const approved = db.partners.filter((p) => p.status === "approved").sort((a, b) => recent(b.id) - recent(a.id) || a.id.localeCompare(b.id));
  const dormantFrom = approved.length - Math.max(2, Math.round(approved.length * 0.2));
  const days = new Map(approved.map((p, i) => [p.id, i >= dormantFrom ? 16 + (i - dormantFrom) * 6 : 0.1 + (i % 7) * 0.9]));
  db.partners = db.partners.map((p) => (days.has(p.id) ? { ...p, lastSeen: new Date(now - days.get(p.id)! * DAY).toISOString() } : p));
  return db;
}

export { CITIES, KOMPASS_REVIEW_L10N, trafficSeries, visitorsOnDay } from "./generated";
export { NOW, DAY } from "./rng";
