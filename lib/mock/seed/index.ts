import type { DB } from "@/lib/types";
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
  return structuredClone({
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
  });
}

export { CITIES, KOMPASS_REVIEW_L10N, trafficSeries, visitorsOnDay } from "./generated";
export { NOW, DAY } from "./rng";
