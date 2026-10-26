import { isLiveReview, DOC_KEYS, type DB, type DocKey, type FakeReport, type Offer, type Order, type Partner, type Refund, type VerificationFlag } from "@/lib/types";
import { NOW, DAY } from "./seed";

/** Reference "now": the frozen seed date, or real time if later (for new entries). */
export const refNow = () => Math.max(NOW, Date.now());

export function inLastDays(iso: string, days: number, offsetDays = 0) {
  const t = Date.parse(iso);
  const end = refNow() - offsetDays * DAY;
  return t <= end && t > end - days * DAY;
}

/* ---------- wallet ledger ---------- */

export type LedgerKind = "receipt" | "online" | "admin" | "credit" | "purchase" | "refund" | "payout";
export const LEDGER_KINDS: readonly LedgerKind[] = ["receipt", "online", "admin", "credit", "purchase", "refund", "payout"];
export interface LedgerEntry {
  id: string; // the source record (due, top-up, order, refund or payout)
  at: string;
  kind: LedgerKind;
  amount: number; // signed: money in > 0, purchases and payouts < 0
  reference: string; // receipt / payment reference, or the lead id for purchases
  payMethod?: string;
}

type LedgerDB = Pick<DB, "orders" | "dues" | "topups" | "refunds" | "invoices" | "partners" | "payouts">;

/** Overdue = an unpaid credit invoice past its due date. */
export const isOverdue = (inv: { status: string; dueAt: string }) => inv.status === "due" && Date.parse(inv.dueAt) < refNow();

/**
 * Every movement of one company's wallet, newest first. The wallet is the single balance:
 * receipts confirmed by admin, online payments, admin top-ups and credit add money; lead
 * purchases take it out; refunds (fake offers or admin exceptions) put it back.
 */
export function walletLedger(db: LedgerDB, partnerId: string) {
  const entries: LedgerEntry[] = [
    ...db.dues
      // invoice payments don't move the wallet (the credit was added when the invoice was issued)
      .filter((d) => d.partnerId === partnerId && d.status === "confirmed" && !d.invoiceId)
      .map((d) => ({ id: d.id, at: d.createdAt, kind: "receipt" as const, amount: d.amount, reference: d.reference, payMethod: d.method })),
    ...db.topups
      .filter((x) => x.partnerId === partnerId)
      .map((x) => ({ id: x.id, at: x.createdAt, kind: x.method, amount: x.amount, reference: x.reference, payMethod: x.payMethod })),
    ...db.orders
      .filter((o) => o.partnerId === partnerId)
      .map((o) => ({ id: o.id, at: o.createdAt, kind: "purchase" as const, amount: -o.price, reference: o.offerId })),
    ...db.refunds
      .filter((r) => r.partnerId === partnerId && r.status === "refunded")
      .map((r) => ({ id: r.id, at: r.decidedAt ?? r.createdAt, kind: "refund" as const, amount: r.amount, reference: r.orderId ?? r.id })),
    ...db.payouts
      .filter((x) => x.partnerId === partnerId && x.status === "paid")
      .map((x) => ({ id: x.id, at: x.decidedAt ?? x.createdAt, kind: "payout" as const, amount: -x.amount, reference: x.reference ?? x.id, payMethod: "bank_transfer" })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const sum = (kinds: LedgerKind[]) => entries.filter((e) => kinds.includes(e.kind)).reduce((a, e) => a + e.amount, 0);
  const invoices = db.invoices.filter((i) => i.partnerId === partnerId);
  const due = invoices.filter((i) => i.status === "due");
  return {
    entries,
    balance: db.partners.find((p) => p.id === partnerId)?.wallet ?? 0,
    toppedUp: sum(["receipt", "online", "admin"]),
    credit: sum(["credit"]),
    spent: -sum(["purchase"]),
    refunded: sum(["refund"]),
    paidOut: -sum(["payout"]),
    leads: entries.filter((e) => e.kind === "purchase").length,
    creditDue: due.reduce((a, i) => a + i.amount, 0),
    creditOverdue: due.filter(isOverdue).reduce((a, i) => a + i.amount, 0),
    lastAt: entries[0]?.at,
  };
}

/** Smallest payout a company can request, so bank fees stay proportionate. */
export const MIN_PAYOUT = 50;

/**
 * How much of a wallet a company can have paid out: the balance minus payouts already requested and
 * minus unpaid credit, because money Kompass advanced on credit must be repaid, not withdrawn.
 */
export function withdrawable(db: Pick<DB, "partners" | "payouts" | "invoices">, partnerId: string) {
  const balance = db.partners.find((p) => p.id === partnerId)?.wallet ?? 0;
  const requested = db.payouts.filter((x) => x.partnerId === partnerId && x.status === "requested").reduce((a, x) => a + x.amount, 0);
  const creditDue = db.invoices.filter((i) => i.partnerId === partnerId && i.status === "due").reduce((a, i) => a + i.amount, 0);
  return { balance, requested, creditDue, available: Math.max(0, balance - requested - creditDue) };
}

/** Platform money totals for the dashboard. */
export function finance(db: LedgerDB) {
  const totalIncome = db.orders.reduce((a, o) => a + o.price, 0);
  const pendingDues = db.dues.filter((d) => d.status === "pending").reduce((a, d) => a + d.amount, 0);
  const due = db.invoices.filter((i) => i.status === "due");
  return {
    totalIncome,
    pendingDues,
    creditDue: due.reduce((a, i) => a + i.amount, 0),
    creditOverdue: due.filter(isOverdue).reduce((a, i) => a + i.amount, 0),
    walletTotal: db.partners.filter((p) => p.status === "approved").reduce((a, p) => a + p.wallet, 0),
  };
}

/** Whole days until the customer's deadline (negative once it has passed). */
export const daysLeft = (iso: string) => Math.ceil((Date.parse(iso) - refNow()) / DAY);

/**
 * Customers have no account. The day after the move date Kompass emails them a short review survey:
 * which company did the job, how it went, and how Kompass did.
 */
export const SURVEY_DELAY_DAYS = 1;
export const surveyDate = (o: Pick<Offer, "executionDate" | "surveySentAt">) =>
  o.surveySentAt ?? new Date(Date.parse(o.executionDate) + SURVEY_DELAY_DAYS * DAY).toISOString();
export const surveySent = (o: Pick<Offer, "executionDate" | "status" | "surveySentAt">) =>
  o.status !== "cancelled" && (!!o.surveySentAt || Date.parse(surveyDate(o)) <= refNow());

/** On sale, inside the deadline window where admin should repost it (2-3 days, per the brief). */
export const EXPIRING_DAYS = 3;
export const isExpiringSoon = (o: Pick<Offer, "status" | "deadline">) => {
  const d = daysLeft(o.deadline);
  return o.status === "in_progress" && d >= 0 && d <= EXPIRING_DAYS;
};

/** An offer can be bought while it is on sale, visible, inside its deadline and has slots left. */
export const isPurchasable = (o: Offer, sold: number) =>
  o.active && o.status === "in_progress" && Date.parse(o.deadline) >= refNow() && sold < o.offersWanted;

/** The services a company currently takes offers for: the ones it offers, minus the paused ones. */
export const offerServiceIds = (p: { serviceIds: string[]; pausedServiceIds?: string[] }) => p.serviceIds.filter((id) => !p.pausedServiceIds?.includes(id));
/** The company takes new offers for this service (it offers it and hasn't paused it). */
export const takesOffersFor = (p: { serviceIds: string[]; pausedServiceIds?: string[] }, serviceId: string) => offerServiceIds(p).includes(serviceId);

/** Leads a partner can buy right now: purchasable, matching active services, not already owned. Reposted ones first. */
export function availableLeads(db: Pick<DB, "offers" | "orders">, partner: { id: string; serviceIds: string[]; pausedServiceIds?: string[] }) {
  const sold: Record<string, number> = {};
  const mine = new Set<string>();
  for (const o of db.orders) {
    sold[o.offerId] = (sold[o.offerId] ?? 0) + 1;
    if (o.partnerId === partner.id) mine.add(o.offerId);
  }
  return db.offers
    .filter((o) => isPurchasable(o, sold[o.id] ?? 0) && takesOffersFor(partner, o.serviceId) && !mine.has(o.id))
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

/* ---------- company documents & performance ---------- */

/** Days before a document's expiry when admin and the company are warned. */
export const DOC_WARN_DAYS = 30;

export type DocState = "ok" | "expiring" | "review" | "expired" | "missing";

/**
 * Where a company's required documents stand. `ok` means every document is uploaded, checked by
 * Kompass and not expired — the condition for buying leads. `state` is the most urgent problem.
 */
export function documentState(p: Pick<Partner, "documents">) {
  const now = refNow();
  const missing: DocKey[] = [];
  const expired: DocKey[] = [];
  const expiring: DocKey[] = [];
  const review: DocKey[] = [];
  let next: { key: DocKey; date: string } | undefined;
  for (const key of DOC_KEYS) {
    const d = p.documents[key];
    if (!d || d.status === "rejected") {
      missing.push(key);
      continue;
    }
    if (d.status === "pending_review") review.push(key);
    if (d.expiresAt) {
      const t = Date.parse(d.expiresAt);
      if (t < now) expired.push(key);
      else if (t - now <= DOC_WARN_DAYS * DAY) expiring.push(key);
      if (!next || t < Date.parse(next.date)) next = { key, date: d.expiresAt };
    }
  }
  const ok = !missing.length && !expired.length && !review.length;
  const state: DocState = missing.length ? "missing" : expired.length ? "expired" : review.length ? "review" : expiring.length ? "expiring" : "ok";
  return { ok, state, missing, expired, expiring, review, next };
}

/** A company may buy (or be assigned) leads only when approved, not banned and its documents are in order. */
export const canBuyLeads = (p: Pick<Partner, "status" | "banned" | "documents">) => p.status === "approved" && !p.banned && documentState(p).ok;

/**
 * Performance used to rank companies for recommendations: leads bought in the last 90 days,
 * average approved rating and how recently the company was active.
 */
export function companyScore(db: Pick<DB, "orders" | "reviews">, p: Pick<Partner, "id" | "lastSeen">) {
  const bought90 = db.orders.filter((o) => o.partnerId === p.id && inLastDays(o.createdAt, 90)).length;
  const rated = db.reviews.filter((r) => r.target === p.id && isLiveReview(r));
  const rating = rated.length ? rated.reduce((a, r) => a + r.stars, 0) / rated.length : 0;
  const idleDays = Math.max(0, (refNow() - Date.parse(p.lastSeen)) / DAY);
  const score = Math.round(bought90 * 10 + rating * 8 + Math.max(0, 14 - idleDays));
  return { bought90, rating, reviews: rated.length, idleDays: Math.round(idleDays), score };
}

/* ---------- partner portal ---------- */

/** The 26 Swiss cantons (code → official name), for service areas. */
export const CANTONS: Record<string, string> = {
  AG: "Aargau", AI: "Appenzell Innerrhoden", AR: "Appenzell Ausserrhoden", BE: "Bern", BL: "Basel-Landschaft", BS: "Basel-Stadt",
  FR: "Fribourg", GE: "Genève", GL: "Glarus", GR: "Graubünden", JU: "Jura", LU: "Luzern", NE: "Neuchâtel", NW: "Nidwalden",
  OW: "Obwalden", SG: "St. Gallen", SH: "Schaffhausen", SO: "Solothurn", SZ: "Schwyz", TG: "Thurgau", TI: "Ticino", UR: "Uri",
  VD: "Vaud", VS: "Valais", ZG: "Zug", ZH: "Zürich",
};

/** Cantons a company works in: the ones it chose, or its own canton. */
export const partnerCantons = (p: Pick<Partner, "cantons" | "canton">) => (p.cantons?.length ? p.cantons : [p.canton]);

/** Regions where admin nominated the company, with its position in that canton's priority list (1 = first). */
export function partnerRegions(db: Pick<DB, "nominations">, partnerId: string) {
  return db.nominations
    .map((n) => ({ canton: n.canton, rank: n.partnerIds.indexOf(partnerId) + 1, of: n.partnerIds.length }))
    .filter((n) => n.rank > 0)
    .sort((a, b) => a.rank - b.rank || a.canton.localeCompare(b.canton));
}

/**
 * What happened to a lead after the company bought it, most decisive fact first:
 * cancelled (fake → refunded, customer → not refunded), reported as fake and being checked,
 * executed, the customer chose this company / another one, or still open.
 */
export type LeadOutcome = "active" | "chosen" | "chosenOther" | "executed" | "reported" | "cancelledFake" | "cancelledCustomer";
export type LeadGroup = "open" | "executed" | "reported" | "cancelled";
export const LEAD_GROUP: Record<LeadOutcome, LeadGroup> = {
  active: "open",
  chosen: "open",
  chosenOther: "open",
  executed: "executed",
  reported: "reported",
  cancelledFake: "cancelled",
  cancelledCustomer: "cancelled",
};

export function leadOutcome(db: Pick<DB, "offers" | "fakeReports" | "refunds">, order: Order) {
  const offer = db.offers.find((o) => o.id === order.offerId);
  const report: FakeReport | undefined = db.fakeReports.find((r) => r.orderId === order.id);
  const refund: Refund | undefined = db.refunds.find((r) => r.orderId === order.id && r.status !== "rejected");
  let status: LeadOutcome = "active";
  if (offer?.status === "cancelled") status = offer.cancelReason === "fake" ? "cancelledFake" : "cancelledCustomer";
  else if (report?.status === "confirmed") status = "cancelledFake";
  else if (report && report.status !== "canceled") status = "reported";
  else if (order.executed) status = "executed";
  else if (offer?.chosenPartnerId === order.partnerId) status = "chosen";
  else if (offer?.chosenPartnerId) status = "chosenOther";
  return { status, group: LEAD_GROUP[status], offer, report, refund, assigned: order.channel === "manual" };
}

/**
 * The company's notifications, derived from the data rather than stored, so every admin or
 * customer action that concerns the company shows up without extra wiring. Newest first, 60 days.
 * Text comes from `portal.feed.<kind>` with `values`; `href` is a portal route.
 */
export type FeedKind =
  | "docApproved"
  | "docRejected"
  | "docExpiring"
  | "docExpired"
  | "receiptConfirmed"
  | "invoiceReceiptConfirmed"
  | "receiptRejected"
  | "topupAdmin"
  | "credit"
  | "invoiceOverdue"
  | "refund"
  | "refundRejected"
  | "assigned"
  | "cancelledFake"
  | "cancelledCustomer"
  | "chosen"
  | "message"
  | "payoutPaid"
  | "payoutRejected"
  | "review"
  | "removalApproved"
  | "removalRejected";
export type FeedTone = "success" | "warning" | "danger" | "info";
export interface FeedItem {
  id: string;
  at: string;
  kind: FeedKind;
  tone: FeedTone;
  href: string;
  values: Record<string, string | number>;
}

type FeedDB = Pick<DB, "partners" | "offers" | "orders" | "dues" | "topups" | "invoices" | "refunds" | "messages" | "payouts" | "reviews" | "removals">;

export const FEED_DAYS = 60;

export function partnerFeed(db: FeedDB, partnerId: string): FeedItem[] {
  const p = db.partners.find((x) => x.id === partnerId);
  if (!p) return [];
  const now = refNow();
  const items: FeedItem[] = [];
  const push = (id: string, at: string | undefined, kind: FeedKind, tone: FeedTone, href: string, values: FeedItem["values"] = {}) => {
    if (at && Date.parse(at) <= now) items.push({ id: `${kind}:${id}`, at, kind, tone, href, values });
  };

  for (const key of DOC_KEYS) {
    const d = p.documents[key];
    if (!d) continue;
    if (d.status === "rejected") push(key, d.reviewedAt ?? d.uploadedAt, "docRejected", "danger", "/portal/profile?tab=documents", { doc: key });
    else if (d.status === "valid" && d.reviewedAt) push(key, d.reviewedAt, "docApproved", "success", "/portal/profile?tab=documents", { doc: key });
    if (d.expiresAt && d.status !== "rejected") {
      const t = Date.parse(d.expiresAt);
      if (t < now) push(`${key}-x`, d.expiresAt, "docExpired", "danger", "/portal/profile?tab=documents", { doc: key, date: d.expiresAt });
      else if (t - now <= DOC_WARN_DAYS * DAY) push(`${key}-w`, new Date(t - DOC_WARN_DAYS * DAY).toISOString(), "docExpiring", "warning", "/portal/profile?tab=documents", { doc: key, date: d.expiresAt });
    }
  }

  for (const d of db.dues.filter((x) => x.partnerId === partnerId && x.status !== "pending"))
    push(
      d.id,
      d.decidedAt ?? d.createdAt,
      d.status !== "confirmed" ? "receiptRejected" : d.invoiceId ? "invoiceReceiptConfirmed" : "receiptConfirmed",
      d.status === "confirmed" ? "success" : "danger",
      d.invoiceId ? "/portal/payments?tab=invoices" : "/portal/payments?tab=statement",
      { amount: d.amount, ref: d.reference, invoice: d.invoiceId ?? "" },
    );

  for (const x of db.topups.filter((t) => t.partnerId === partnerId && t.method !== "online")) {
    if (x.method === "admin") push(x.id, x.createdAt, "topupAdmin", "success", "/portal/payments?tab=statement", { amount: x.amount });
    else push(x.id, x.createdAt, "credit", "info", "/portal/payments?tab=invoices", { amount: x.amount, invoice: x.invoiceId ?? "" });
  }
  for (const i of db.invoices.filter((x) => x.partnerId === partnerId && isOverdue(x)))
    push(i.id, i.dueAt, "invoiceOverdue", "danger", "/portal/payments?tab=invoices", { amount: i.amount, invoice: i.id });

  for (const r of db.refunds.filter((x) => x.partnerId === partnerId && x.status !== "pending")) {
    const order = r.orderId ? db.orders.find((o) => o.id === r.orderId) : undefined;
    const href = order ? `/portal/leads?open=${order.offerId}` : "/portal/payments?tab=statement";
    push(r.id, r.decidedAt ?? r.createdAt, r.status === "refunded" ? "refund" : "refundRejected", r.status === "refunded" ? "success" : "warning", href, { amount: r.amount });
  }

  const mine = db.orders.filter((o) => o.partnerId === partnerId);
  const offerById = new Map(db.offers.map((o) => [o.id, o]));
  for (const o of mine) {
    const offer = offerById.get(o.offerId);
    const href = `/portal/leads?open=${o.offerId}`;
    if (o.channel === "manual") push(o.id, o.createdAt, "assigned", "info", href, { offer: o.offerId, amount: o.price });
    if (!offer) continue;
    if (offer.status === "cancelled" && offer.cancelledAt && offer.cancelledAt > o.createdAt)
      push(o.id, offer.cancelledAt, offer.cancelReason === "fake" ? "cancelledFake" : "cancelledCustomer", offer.cancelReason === "fake" ? "info" : "warning", href, { offer: o.offerId });
    if (offer.chosenPartnerId === partnerId) push(o.id, offer.chosenAt, "chosen", "success", href, { offer: o.offerId, city: offer.from.city });
  }

  // one notification per conversation: its latest message from Kompass
  const latestByThread = new Map<string, (typeof db.messages)[number]>();
  for (const m of db.messages.filter((x) => x.partnerId === partnerId && x.from === "kompass"))
    if (!latestByThread.has(m.threadId) || m.createdAt > latestByThread.get(m.threadId)!.createdAt) latestByThread.set(m.threadId, m);
  for (const m of latestByThread.values()) push(m.id, m.createdAt, "message", "info", `/portal/messages?thread=${m.threadId}`, { subject: m.subject });

  for (const x of db.payouts.filter((y) => y.partnerId === partnerId && y.status !== "requested"))
    push(x.id, x.decidedAt ?? x.createdAt, x.status === "paid" ? "payoutPaid" : "payoutRejected", x.status === "paid" ? "success" : "warning", "/portal/payments?tab=payouts", { amount: x.amount });

  for (const r of db.reviews.filter((x) => x.target === partnerId && isLiveReview(x)))
    push(r.id, r.createdAt, "review", r.stars >= 4 ? "success" : "warning", "/portal/reviews", { stars: r.stars, name: r.name });
  for (const r of db.removals.filter((x) => x.partnerId === partnerId && x.status !== "pending"))
    push(r.id, r.createdAt, r.status === "approved" ? "removalApproved" : "removalRejected", r.status === "approved" ? "success" : "warning", "/portal/reviews");

  return items.filter((i) => now - Date.parse(i.at) <= FEED_DAYS * DAY).sort((a, b) => b.at.localeCompare(a.at));
}

/** Without a read marker, notifications from the last few days count as unread. */
export const feedReadSince = (p: Pick<Partner, "feedReadAt">) => p.feedReadAt ?? new Date(refNow() - 5 * DAY).toISOString();

/* ---------- dashboard periods & statistics ---------- */

/** A calendar month ("2026-10") or year ("2026") the dashboard is filtered to. */
export interface Period {
  kind: "month" | "year";
  key: string;
}

export function periodRange(p: Period) {
  const [y, m] = p.key.split("-").map(Number);
  const from = p.kind === "year" ? Date.UTC(y, 0, 1) : Date.UTC(y, m - 1, 1);
  const to = p.kind === "year" ? Date.UTC(y + 1, 0, 1) : Date.UTC(y, m, 1);
  return { from, to };
}

/** The current month plus the 11 before it, and every year with data, newest first. */
export function periodOptions() {
  const now = new Date(refNow());
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  return { months, years };
}

/** Contact Us requests nobody has replied to or called back within 24 hours. */
export const FOLLOW_UP_HOURS = 24;
export const needsFollowUp = (c: { handledAt?: string; createdAt: string }) => !c.handledAt && refNow() - Date.parse(c.createdAt) > FOLLOW_UP_HOURS * 3_600_000;

type StatsDB = Pick<DB, "offers" | "orders" | "partners" | "dues" | "topups" | "refunds" | "reviews" | "formSessions">;

/** Everything the admin dashboard shows for one period, grouped like the requirements. */
export function dashboardStats(db: StatsDB, p: Period, visitorsOnDay: (day: string) => number) {
  const { from, to } = periodRange(p);
  const inP = (iso?: string) => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return t >= from && t < to;
  };

  // A. offers
  const received = db.offers.filter((o) => inP(o.createdAt));
  const ordersInP = db.orders.filter((o) => inP(o.createdAt));
  const soldIds = new Set(ordersInP.map((o) => o.offerId));
  const fake = db.offers.filter((o) => o.cancelReason === "fake" && inP(o.cancelledAt));

  // B. companies
  const approved = db.partners.filter((p) => p.status === "approved");
  const buyers = new Map<string, number>();
  for (const o of ordersInP) buyers.set(o.partnerId, (buyers.get(o.partnerId) ?? 0) + 1);
  const toppedUpIds = new Set([
    ...db.dues.filter((d) => d.status === "confirmed" && inP(d.createdAt)).map((d) => d.partnerId),
    ...db.topups.filter((x) => x.method !== "credit" && inP(x.createdAt)).map((x) => x.partnerId),
  ]);
  const active = approved.filter((p) => inP(p.lastSeen) || buyers.has(p.id) || toppedUpIds.has(p.id));
  const perCompany = approved
    .map((p) => ({ id: p.id, name: p.name, bought: buyers.get(p.id) ?? 0, score: companyScore(db, p).score }))
    .filter((x) => x.bought > 0)
    .sort((a, b) => b.bought - a.bought || b.score - a.score);

  // C. money
  const toppedUp =
    db.dues.filter((d) => d.status === "confirmed" && inP(d.createdAt)).reduce((a, d) => a + d.amount, 0) +
    db.topups.filter((x) => x.method !== "credit" && inP(x.createdAt)).reduce((a, x) => a + x.amount, 0);
  const credit = db.topups.filter((x) => x.method === "credit" && inP(x.createdAt)).reduce((a, x) => a + x.amount, 0);
  const fakeRefunds = db.refunds.filter((r) => r.reason === "fake_lead" && r.status === "refunded" && inP(r.decidedAt ?? r.createdAt));

  // D. visitors & offer form
  const end = Math.min(to, refNow() + DAY);
  let visitors = 0;
  for (let t = from; t < end; t += DAY) visitors += visitorsOnDay(new Date(t).toISOString().slice(0, 10));
  const sessions = db.formSessions.filter((s) => inP(s.startedAt));
  const reached = (steps: string[]) => sessions.filter((s) => steps.includes(s.step)).length;
  const submitted = sessions.filter((s) => s.step === "submitted");
  const offerById = new Map(db.offers.map((o) => [o.id, o]));
  const fakeSubmitted = submitted.filter((s) => {
    const o = s.offerId ? offerById.get(s.offerId) : undefined;
    return !!o && (o.cancelReason === "fake" || (o.status === "new" && o.flags.length > 0));
  });

  return {
    offers: { received: received.length, sold: soldIds.size, fake: fake.length, total: db.offers.length },
    companies: { registered: approved.length, active: active.length, buyers: buyers.size, perCompany },
    money: {
      toppedUpCompanies: toppedUpIds.size,
      toppedUp,
      credit,
      refundedFake: fakeRefunds.reduce((a, r) => a + r.amount, 0),
      refundedFakeCount: fakeRefunds.length,
    },
    visitors: {
      visitors,
      started: sessions.length,
      notStarted: Math.max(0, visitors - sessions.length),
      notCompleted: sessions.length - submitted.length,
      completed: submitted.length,
      fake: fakeSubmitted.length,
      funnel: [
        { step: "started" as const, count: sessions.length },
        { step: "details" as const, count: reached(["details", "contact", "submitted"]) },
        { step: "contact" as const, count: reached(["contact", "submitted"]) },
        { step: "submitted" as const, count: submitted.length },
      ],
    },
  };
}
