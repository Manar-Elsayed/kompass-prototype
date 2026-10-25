"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CancelReason,
  FormSession,
  CompanyMessage,
  DocKey,
  ContactMessage,
  DB,
  FaqQuestion,
  Notification,
  Offer,
  Order,
  MessageTopic,
  Partner,
  PartnerDue,
  Payout,
  Invoice,
  PayMethod,
  Refund,
  Review,
  WalletTopup,
} from "@/lib/types";
import { slugify } from "@/lib/utils";
import { createSeed } from "./seed";
import { documentState, isPurchasable, MIN_PAYOUT, verificationFlags, withdrawable } from "./selectors";

type Collections = {
  [K in keyof DB as DB[K] extends { id: string }[] ? K : never]: DB[K];
};
export type CollectionKey = keyof Collections;
type ItemOf<K extends CollectionKey> = Collections[K][number];

export interface Session {
  userId: string;
}

interface Actions {
  /* generic CRUD */
  add: <K extends CollectionKey>(key: K, item: ItemOf<K>) => void;
  patch: <K extends CollectionKey>(key: K, id: string, partial: Partial<ItemOf<K>>) => void;
  remove: <K extends CollectionKey>(key: K, id: string) => void;
  setSite: (updater: (site: DB["site"]) => DB["site"]) => void;
  setConfig: (partial: Partial<DB["config"]>) => void;

  /* cross-surface flows */
  submitOffer: (input: Omit<Offer, "id" | "createdAt" | "status" | "active" | "ip" | "device" | "source" | "flags" | "cancelReason" | "cancelledAt" | "verifiedAt" | "repostedAt" | "buyersNotifiedAt" | "chosenPartnerId" | "chosenAt"> & { source?: Offer["source"] }) => Offer;
  registerPartner: (input: Omit<Partner, "id" | "slug" | "status" | "banned" | "featured" | "wallet" | "documents" | "lastSeen" | "createdAt">) => Partner;
  /** Approving keeps what the company uploaded and marks it checked; rejecting records the reason it is shown. */
  decideApplication: (id: string, decision: "contract_sent" | "approved" | "rejected", expiresAt?: string, reason?: string) => void;
  /** Applicant signs the partnership contract in the portal; Kompass then checks it with the other documents. */
  signContract: (partnerId: string, name: string) => void;
  decideDue: (id: string, status: "confirmed" | "canceled") => void;
  /** Admin-issued refund: recorded as refunded straight away and applied to the wallet. */
  issueRefund: (input: Pick<Refund, "partnerId" | "amount" | "reason" | "orderId" | "note">) => Refund;
  decideRefund: (id: string, status: "refunded" | "rejected") => void;
  /** Money in: an online card/TWINT payment from the portal, or a payment admin recorded. */
  topUpWallet: (input: Pick<WalletTopup, "partnerId" | "amount" | "payMethod" | "reference" | "note" | "byUserId"> & { method: "online" | "admin" }) => WalletTopup;
  /** Pay later: credit the wallet now and issue an invoice due in `termDays`. */
  addCredit: (input: { partnerId: string; amount: number; termDays: number; note: string; byUserId?: string }) => Invoice;
  markInvoicePaid: (id: string, payMethod: PayMethod, reference: string) => void;
  /** Company pays a credit invoice by card / TWINT in the portal. */
  payInvoiceOnline: (id: string, payMethod: "card" | "twint") => void;
  /** Company asks for unused wallet money to be paid to its bank account (Kompass approves). */
  requestPayout: (partnerId: string, amount: number) => { ok: true; payout: Payout } | { ok: false; error: "minimum" | "available" };
  /** Paid takes the amount out of the wallet; rejected leaves the wallet as it was. */
  decidePayout: (id: string, status: "paid" | "rejected", reference: string, byUserId?: string) => void;

  /* company documents, contact, regions */
  /** Company uploads → waits for Kompass to check it; admin uploads → valid straight away. */
  uploadDocument: (partnerId: string, key: DocKey, file: string, expiresAt: string | undefined, by: "company" | "admin") => void;
  reviewDocument: (partnerId: string, key: DocKey, approve: boolean, expiresAt?: string) => void;
  setDocumentExpiry: (partnerId: string, key: DocKey, expiresAt: string) => void;
  /** Kompass starts a conversation with a company. */
  sendCompanyMessage: (input: Pick<CompanyMessage, "partnerId" | "subject" | "body" | "channel" | "byUserId"> & { topic?: MessageTopic }) => void;
  /**
   * A message in a thread, or a new thread when `threadId` is missing. Company messages notify
   * admin; that is also how a company asks to change details it can't edit itself (topic "profile").
   */
  sendMessage: (input: { partnerId: string; from: CompanyMessage["from"]; body: string; threadId?: string; subject?: string; topic?: MessageTopic; byUserId?: string }) => CompanyMessage;
  /** The reader has seen every message the other side wrote in this thread. */
  markThreadRead: (threadId: string, reader: CompanyMessage["from"]) => void;
  setNominations: (canton: string, partnerIds: string[]) => void;
  submitReview: (input: Pick<Review, "target" | "name" | "email" | "stars" | "comment" | "offerId">) => void;
  /** Customer, from the review survey: the company that did the job, among those that bought the request. */
  chooseCompany: (offerId: string, partnerId: string) => void;
  /** Website offer form progress (created on first input, updated per step, closed on submit). */
  trackFormSession: (id: string, patch: Partial<Omit<FormSession, "id" | "startedAt" | "updatedAt">>) => void;
  /** Kompass replied to / called back a Contact Us request: it no longer counts toward the 24-hour follow-up. */
  markContactHandled: (id: string, handled: boolean) => void;
  submitContact: (input: Omit<ContactMessage, "id" | "read" | "createdAt">) => void;
  submitFaqQuestion: (input: Pick<FaqQuestion, "name" | "email" | "question">) => void;
  markAllNotificationsRead: () => void;

  /* offer lifecycle (admin) */
  /** Verified by admin after the auto-checks flagged it: New → In progress (goes on sale). */
  approveOffer: (id: string) => void;
  /** Fake → refunds the listed purchases to the buyers' wallets; customer → nobody is refunded. */
  cancelOffer: (id: string, reason: CancelReason, refundOrderIds?: string[]) => void;
  /** Close to the deadline: back to the top of the shop and companies are notified again. */
  repostOffer: (id: string) => void;
  /** Manual / urgent assignment: charges the company the agreed price straight from its wallet. */
  assignLead: (offerId: string, partnerId: string, price: number, note?: string) => BuyResult;
  /** Records that the customer was emailed the names of the companies that bought the offer. */
  notifyCustomerOfBuyers: (offerId: string) => void;
  /** Offers on sale whose deadline has passed become Expired. Run on load. */
  sweepExpired: () => void;

  /* partner portal flows */
  buyLead: (partnerId: string, offerId: string, couponCode?: string) => BuyResult;
  reportFakeLead: (orderId: string, reason: string) => void;
  uploadPayment: (input: Pick<PartnerDue, "partnerId" | "amount" | "method" | "reference" | "receipt">) => PartnerDue;
  requestReviewRemoval: (reviewId: string, partnerId: string, reason: string) => void;

  /* session */
  login: (userId: string) => void;
  logout: () => void;
  partnerLogin: (partnerId: string) => void;
  partnerLogout: () => void;

  /* demo */
  resetDemo: () => void;
}

export type BuyResult =
  | { ok: true; order: Order; price: number; discount: number }
  | { ok: false; error: "unavailable" | "insufficient" | "coupon" | "blocked" | "owned" | "documents" };

export type Store = DB & { session: Session | null; partnerSession: PartnerSession | null } & Actions;

export interface PartnerSession {
  partnerId: string;
}

/** Price a lead for a partner, applying a coupon if valid. Shared by the shop UI and buyLead. */
export function quoteLead(
  db: Pick<DB, "services" | "coupons" | "orders" | "offers">,
  partnerId: string,
  offerId: string,
  couponCode?: string,
): { base: number; discount: number; price: number; couponValid: boolean | null } {
  const offer = db.offers.find((o) => o.id === offerId);
  const base = db.services.find((s) => s.id === offer?.serviceId)?.leadPrice ?? 0;
  const code = couponCode?.trim().toUpperCase();
  if (!code) return { base, discount: 0, price: base, couponValid: null };
  const c = db.coupons.find((x) => x.code === code);
  const now = Date.now();
  const valid =
    !!c &&
    c.active &&
    c.used < c.usageLimit &&
    Date.parse(c.startDate) <= now &&
    Date.parse(c.endDate) >= now &&
    (c.serviceId === "all" || c.serviceId === offer?.serviceId) &&
    (c.multiUse || !db.orders.some((o) => o.partnerId === partnerId && o.couponCode === code));
  if (!valid || !c) return { base, discount: 0, price: base, couponValid: false };
  const discount = Math.min(base, c.type === "percent" ? Math.round((base * c.discount) / 100) : c.discount);
  return { base, discount, price: base - discount, couponValid: true };
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const nowIso = () => new Date().toISOString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

/** Money into (or, negative, out of) one company's wallet. */
const credit = (partners: Partner[], partnerId: string, amount: number) =>
  partners.map((p) => (p.id === partnerId ? { ...p, wallet: Math.max(0, p.wallet + amount) } : p));

/**
 * Book a purchase: charge the wallet and, when this fills the customer's quota, close the offer
 * as Completed so it leaves the shop and no further purchase is possible.
 */
function recordPurchase(s: DB, order: Order, offer: Offer, soldBefore: number): Partial<DB> {
  const full = soldBefore + 1 >= offer.offersWanted;
  return {
    orders: [order, ...s.orders],
    partners: s.partners.map((p) => (p.id === order.partnerId ? { ...p, wallet: p.wallet - order.price } : p)),
    offers: s.offers.map((o) =>
      o.id === offer.id ? { ...o, status: full ? "completed" : "in_progress", verifiedAt: o.verifiedAt ?? (o.status === "new" ? nowIso() : undefined) } : o,
    ),
  };
}

function notify(state: Store, n: Omit<Notification, "id" | "read" | "createdAt">): Notification[] {
  return [{ ...n, id: uid("n"), read: false, createdAt: nowIso() }, ...state.notifications];
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createSeed(),
      session: null,
      partnerSession: null,

      add: (key, item) => set((s) => ({ [key]: [item, ...(s[key] as unknown[])] }) as Partial<Store>),
      patch: (key, id, partial) =>
        set(
          (s) =>
            ({
              [key]: (s[key] as { id: string }[]).map((it) => (it.id === id ? { ...it, ...partial } : it)),
            }) as Partial<Store>,
        ),
      remove: (key, id) =>
        set((s) => ({ [key]: (s[key] as { id: string }[]).filter((it) => it.id !== id) }) as Partial<Store>),
      setSite: (updater) => set((s) => ({ site: updater(s.site) })),
      setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),

      submitOffer: (input) => {
        const s = get();
        const maxId = Math.max(...s.offers.map((o) => Number(o.id.replace(/\D/g, "")) || 0), 10400);
        const offer: Offer = {
          ...input,
          id: `KO-${maxId + 1}`,
          ip: "185.12.64.21",
          device: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
          source: input.source ?? "website",
          status: "new",
          flags: [],
          active: true,
          createdAt: nowIso(),
        };
        // auto-checks: a clean offer goes on sale at once, a flagged one waits in New for review.
        // An offer entered by admin for a customer on the phone is verified by that person.
        if (offer.source === "admin") offer.verifiedAt = offer.createdAt;
        else offer.flags = verificationFlags(offer, s.offers);
        if (!offer.flags.length) offer.status = "in_progress";
        const review = offer.flags.length > 0;
        set({
          offers: [offer, ...s.offers],
          notifications: notify(s, {
            kind: "lead",
            title: review
              ? { en: `Offer ${offer.id} needs review · ${offer.from.city}`, de: `Anfrage ${offer.id} muss geprüft werden · ${offer.from.city}`, fr: `La demande ${offer.id} doit être vérifiée · ${offer.from.city}`, it: `Il lead ${offer.id} va verificato · ${offer.from.city}` }
              : { en: `New offer ${offer.id} · ${offer.from.city}`, de: `Neue Anfrage ${offer.id} · ${offer.from.city}`, fr: `Nouvelle demande ${offer.id} · ${offer.from.city}`, it: `Nuova richiesta ${offer.id} · ${offer.from.city}` },
            href: `/admin/leads/${offer.id}`,
          }),
        });
        return offer;
      },

      registerPartner: (input) => {
        const s = get();
        const partner: Partner = {
          ...input,
          id: uid("p"),
          slug: slugify(input.name),
          status: "pending",
          banned: false,
          featured: false,
          wallet: 0,
          documents: {},
          lastSeen: nowIso(),
          createdAt: nowIso(),
        };
        set({
          partners: [partner, ...s.partners],
          notifications: notify(s, {
            kind: "application",
            title: { en: `New partner application: ${partner.name}`, de: `Neue Partnerbewerbung: ${partner.name}`, fr: `Nouvelle candidature partenaire : ${partner.name}`, it: `Nuova candidatura partner: ${partner.name}` },
            href: `/admin/partners/applications`,
          }),
        });
        return partner;
      },

      decideApplication: (id, decision, expiresAt, reason) =>
        set((s) => ({
          partners: s.partners.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: decision,
                  rejectionReason: decision === "rejected" ? reason?.trim() || undefined : undefined,
                  documents:
                    decision === "approved"
                      ? {
                          contract: { file: "contract-signed.pdf", uploadedAt: p.contractSignedAt ?? nowIso(), ...p.documents.contract, status: "valid", expiresAt },
                          insurance: { file: "insurance.pdf", uploadedAt: nowIso(), ...p.documents.insurance, status: "valid", expiresAt: p.documents.insurance?.expiresAt ?? inDays(365) },
                          register: { file: "hr-extract.pdf", uploadedAt: nowIso(), ...p.documents.register, status: "valid", expiresAt: p.documents.register?.expiresAt ?? inDays(365) },
                        }
                      : p.documents,
                }
              : p,
          ),
        })),

      signContract: (partnerId, name) =>
        set((s) => {
          const at = nowIso();
          const partner = s.partners.find((p) => p.id === partnerId);
          if (!partner || partner.status !== "contract_sent") return {};
          return {
            partners: s.partners.map((p) =>
              p.id === partnerId
                ? { ...p, contractSignedAt: at, contractSignedBy: name.trim(), documents: { ...p.documents, contract: { file: "contract-signed.pdf", uploadedAt: at, status: "pending_review" } } }
                : p,
            ),
            notifications: notify(s, {
              kind: "application",
              title: { en: `Contract signed: ${partner.name}`, de: `Vertrag unterschrieben: ${partner.name}`, fr: `Contrat signé : ${partner.name}`, it: `Contratto firmato: ${partner.name}` },
              href: "/admin/partners/applications",
            }),
          };
        }),

      issueRefund: (input) => {
        const at = nowIso();
        const next = Math.max(0, ...get().refunds.map((r) => Number(r.id.slice(3)) || 0)) + 1;
        const refund: Refund = { ...input, id: `RF-${String(next).padStart(3, "0")}`, status: "refunded", createdAt: at, decidedAt: at };
        set((s) => ({ refunds: [refund, ...s.refunds], partners: credit(s.partners, refund.partnerId, refund.amount) }));
        return refund;
      },

      decideRefund: (id, status) =>
        set((s) => {
          const refund = s.refunds.find((r) => r.id === id);
          if (!refund || refund.status !== "pending") return {};
          return {
            refunds: s.refunds.map((r) => (r.id === id ? { ...r, status, decidedAt: nowIso() } : r)),
            partners: status === "refunded" ? credit(s.partners, refund.partnerId, refund.amount) : s.partners,
          };
        }),

      topUpWallet: ({ method, ...input }) => {
        const s = get();
        const topup: WalletTopup = { ...input, method, id: `TU-${String(s.topups.length + 1).padStart(4, "0")}`, createdAt: nowIso() };
        set({ topups: [topup, ...s.topups], partners: credit(s.partners, topup.partnerId, topup.amount) });
        return topup;
      },

      addCredit: ({ partnerId, amount, termDays, note, byUserId }) => {
        const s = get();
        const at = nowIso();
        const year = new Date(at).getFullYear();
        const next = Math.max(0, ...s.invoices.map((i) => Number(i.id.split("-").pop()) || 0)) + 1;
        const invoiceId = `INV-${year}-${String(next).padStart(4, "0")}`;
        const topupId = `TU-${String(s.topups.length + 1).padStart(4, "0")}`;
        const invoice: Invoice = { id: invoiceId, partnerId, topupId, amount, status: "due", issuedAt: at, dueAt: new Date(Date.now() + termDays * 86_400_000).toISOString() };
        const topup: WalletTopup = { id: topupId, partnerId, amount, method: "credit", reference: invoiceId, note, byUserId, invoiceId, createdAt: at };
        set({ topups: [topup, ...s.topups], invoices: [invoice, ...s.invoices], partners: credit(s.partners, partnerId, amount) });
        return invoice;
      },

      markInvoicePaid: (id, payMethod, reference) =>
        set((s) => ({
          invoices: s.invoices.map((i) => (i.id === id && i.status === "due" ? { ...i, status: "paid", paidAt: nowIso(), paidMethod: payMethod, paidReference: reference } : i)),
        })),

      payInvoiceOnline: (id, payMethod) => {
        const s = get();
        const inv = s.invoices.find((i) => i.id === id);
        if (!inv || inv.status !== "due") return;
        s.markInvoicePaid(id, payMethod, `${payMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`);
        const partner = s.partners.find((p) => p.id === inv.partnerId);
        set((st) => ({
          notifications: notify(st, {
            kind: "due",
            title: { en: `Invoice ${id} paid online by ${partner?.name}`, de: `Rechnung ${id} online bezahlt von ${partner?.name}`, fr: `Facture ${id} payée en ligne par ${partner?.name}`, it: `Fattura ${id} pagata online da ${partner?.name}` },
            href: "/admin/finance/invoices",
          }),
        }));
      },

      requestPayout: (partnerId, amount) => {
        const s = get();
        const partner = s.partners.find((p) => p.id === partnerId);
        if (amount < MIN_PAYOUT) return { ok: false, error: "minimum" };
        if (!partner || amount > withdrawable(s, partnerId).available) return { ok: false, error: "available" };
        const next = Math.max(0, ...s.payouts.map((x) => Number(x.id.slice(3)) || 0)) + 1;
        const payout: Payout = { id: `PO-${String(next).padStart(4, "0")}`, partnerId, amount, iban: partner.bank.iban, status: "requested", createdAt: nowIso() };
        set({
          payouts: [payout, ...s.payouts],
          notifications: notify(s, {
            kind: "payout",
            title: { en: `Payout request CHF ${amount} from ${partner.name}`, de: `Auszahlungsantrag CHF ${amount} von ${partner.name}`, fr: `Demande de versement CHF ${amount} de ${partner.name}`, it: `Richiesta di pagamento CHF ${amount} da ${partner.name}` },
            href: "/admin/finance/payouts",
          }),
        });
        return { ok: true, payout };
      },

      decidePayout: (id, status, reference, byUserId) =>
        set((s) => {
          const payout = s.payouts.find((x) => x.id === id);
          if (!payout || payout.status !== "requested") return {};
          return {
            payouts: s.payouts.map((x) => (x.id === id ? { ...x, status, reference: reference.trim() || undefined, byUserId, decidedAt: nowIso() } : x)),
            partners: status === "paid" ? credit(s.partners, payout.partnerId, -payout.amount) : s.partners,
          };
        }),

      uploadDocument: (partnerId, key, file, expiresAt, by) =>
        set((s) => ({
          partners: s.partners.map((p) =>
            p.id === partnerId
              ? { ...p, documents: { ...p.documents, [key]: { file, uploadedAt: nowIso(), expiresAt, status: by === "admin" ? "valid" : "pending_review" } } }
              : p,
          ),
          notifications:
            by === "company"
              ? notify(s, {
                  kind: "application",
                  title: {
                    en: `Document to check: ${s.partners.find((p) => p.id === partnerId)?.name}`,
                    de: `Dokument prüfen: ${s.partners.find((p) => p.id === partnerId)?.name}`,
                    fr: `Document à vérifier : ${s.partners.find((p) => p.id === partnerId)?.name}`,
                    it: `Documento da verificare: ${s.partners.find((p) => p.id === partnerId)?.name}`,
                  },
                  href: `/admin/partners/${partnerId}`,
                })
              : s.notifications,
        })),

      reviewDocument: (partnerId, key, approve, expiresAt) =>
        set((s) => ({
          partners: s.partners.map((p) => {
            const d = p.documents[key];
            if (p.id !== partnerId || !d) return p;
            return { ...p, documents: { ...p.documents, [key]: { ...d, status: approve ? "valid" : "rejected", expiresAt: expiresAt ?? d.expiresAt, reviewedAt: nowIso() } } };
          }),
        })),

      setDocumentExpiry: (partnerId, key, expiresAt) =>
        set((s) => ({
          partners: s.partners.map((p) => {
            const d = p.documents[key];
            return p.id === partnerId && d ? { ...p, documents: { ...p.documents, [key]: { ...d, expiresAt } } } : p;
          }),
        })),

      sendCompanyMessage: ({ topic, ...input }) => {
        const id = uid("MSG");
        set((s) => ({ messages: [{ ...input, id, threadId: id, from: "kompass", topic: topic ?? "general", createdAt: nowIso() }, ...s.messages] }));
      },

      sendMessage: ({ partnerId, from, body, threadId, subject, topic, byUserId }) => {
        const s = get();
        const root = threadId ? s.messages.find((m) => m.id === threadId) : undefined;
        const id = uid("MSG");
        const message: CompanyMessage = {
          id,
          partnerId,
          threadId: root?.id ?? id,
          from,
          topic: root?.topic ?? topic ?? "general",
          subject: root?.subject ?? subject?.trim() ?? "",
          body: body.trim(),
          channel: "portal",
          byUserId,
          createdAt: nowIso(),
        };
        const partner = s.partners.find((p) => p.id === partnerId);
        set({
          messages: [message, ...s.messages],
          notifications:
            from === "company"
              ? notify(s, {
                  kind: "contact",
                  title: { en: `Message from ${partner?.name}: ${message.subject}`, de: `Nachricht von ${partner?.name}: ${message.subject}`, fr: `Message de ${partner?.name} : ${message.subject}`, it: `Messaggio da ${partner?.name}: ${message.subject}` },
                  href: `/admin/partners/${partnerId}?tab=messages`,
                })
              : s.notifications,
        });
        return message;
      },

      markThreadRead: (threadId, reader) =>
        set((s) => {
          if (!s.messages.some((m) => m.threadId === threadId && m.from !== reader && !m.readAt)) return {};
          const at = nowIso();
          return { messages: s.messages.map((m) => (m.threadId === threadId && m.from !== reader && !m.readAt ? { ...m, readAt: at } : m)) };
        }),

      setNominations: (canton, partnerIds) =>
        set((s) => ({
          nominations: [...s.nominations.filter((n) => n.canton !== canton), ...(partnerIds.length ? [{ canton, partnerIds }] : [])],
        })),

      decideDue: (id, status) =>
        set((s) => {
          const due = s.dues.find((d) => d.id === id);
          if (!due || due.status !== "pending") return {};
          return {
            dues: s.dues.map((d) => (d.id === id ? { ...d, status, decidedAt: nowIso() } : d)),
            partners:
              status === "confirmed"
                ? s.partners.map((p) => (p.id === due.partnerId ? { ...p, wallet: p.wallet + due.amount } : p))
                : s.partners,
          };
        }),

      submitReview: (input) =>
        set((s) => ({
          reviews: [{ ...input, id: uid("RV"), status: "pending", createdAt: nowIso() }, ...s.reviews],
          notifications: notify(s, {
            kind: "review",
            title: { en: `New ${input.stars}★ review awaiting moderation`, de: `Neue ${input.stars}★-Bewertung wartet auf Prüfung`, fr: `Nouvel avis ${input.stars}★ en attente de modération`, it: `Nuova recensione ${input.stars}★ in attesa di moderazione` },
            href: input.target === "kompass" ? "/admin/moderation/kompass-reviews" : "/admin/moderation/partner-reviews",
          }),
        })),

      chooseCompany: (offerId, partnerId) =>
        set((s) => ({ offers: s.offers.map((o) => (o.id === offerId ? { ...o, chosenPartnerId: partnerId, chosenAt: nowIso() } : o)) })),

      trackFormSession: (id, patch) =>
        set((s) => {
          const at = nowIso();
          const existing = s.formSessions.find((x) => x.id === id);
          if (!existing) {
            const created: FormSession = { device: "desktop", step: "started", ...patch, id, startedAt: at, updatedAt: at };
            return { formSessions: [created, ...s.formSessions] };
          }
          return { formSessions: s.formSessions.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: at } : x)) };
        }),

      markContactHandled: (id, handled) =>
        set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, read: true, handledAt: handled ? nowIso() : undefined } : c)) })),

      submitContact: (input) =>
        set((s) => ({
          contacts: [{ ...input, id: uid("MSG"), read: false, createdAt: nowIso() }, ...s.contacts],
          notifications: notify(s, {
            kind: "contact",
            title: { en: `New message: ${input.subject}`, de: `Neue Nachricht: ${input.subject}`, fr: `Nouveau message : ${input.subject}`, it: `Nuovo messaggio: ${input.subject}` },
            href: "/admin/inbox",
          }),
        })),

      submitFaqQuestion: (input) =>
        set((s) => ({
          faqQuestions: [{ ...input, id: uid("fq"), answered: false, createdAt: nowIso() }, ...s.faqQuestions],
        })),

      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      login: (userId) =>
        set((s) => ({
          session: { userId },
          users: s.users.map((u) => (u.id === userId ? { ...u, lastLogin: nowIso() } : u)),
        })),
      logout: () => set({ session: null }),
      partnerLogin: (partnerId) =>
        set((s) => ({
          partnerSession: { partnerId },
          partners: s.partners.map((p) => (p.id === partnerId ? { ...p, lastSeen: nowIso() } : p)),
        })),
      partnerLogout: () => set({ partnerSession: null }),

      buyLead: (partnerId, offerId, couponCode) => {
        // The slot check and the purchase happen inside one synchronous state update, so two
        // companies buying the last slot at the same moment can never oversell the offer.
        let result: BuyResult = { ok: false, error: "unavailable" };
        set((s) => {
          const partner = s.partners.find((p) => p.id === partnerId);
          const offer = s.offers.find((o) => o.id === offerId);
          if (!partner || !offer) return {};
          if (partner.banned || partner.status !== "approved") {
            result = { ok: false, error: "blocked" };
            return {};
          }
          if (!documentState(partner).ok) {
            result = { ok: false, error: "documents" };
            return {};
          }
          const sold = s.orders.filter((o) => o.offerId === offerId);
          if (sold.some((o) => o.partnerId === partnerId)) {
            result = { ok: false, error: "owned" };
            return {};
          }
          if (!isPurchasable(offer, sold.length)) return {};
          const q = quoteLead(s, partnerId, offerId, couponCode);
          if (q.couponValid === false) {
            result = { ok: false, error: "coupon" };
            return {};
          }
          if (partner.wallet < q.price) {
            result = { ok: false, error: "insufficient" };
            return {};
          }
          const code = q.couponValid ? couponCode!.trim().toUpperCase() : undefined;
          const order: Order = {
            id: `ORD-${String(5001 + s.orders.length).padStart(5, "0")}`,
            offerId,
            partnerId,
            channel: "shop",
            price: q.price,
            couponCode: code,
            executed: false,
            createdAt: nowIso(),
          };
          result = { ok: true, order, price: q.price, discount: q.discount };
          return {
            ...recordPurchase(s, order, offer, sold.length),
            coupons: code ? s.coupons.map((c) => (c.code === code ? { ...c, used: c.used + 1 } : c)) : s.coupons,
          };
        });
        return result;
      },

      assignLead: (offerId, partnerId, price, note) => {
        let result: BuyResult = { ok: false, error: "unavailable" };
        set((s) => {
          const partner = s.partners.find((p) => p.id === partnerId);
          const offer = s.offers.find((o) => o.id === offerId);
          if (!partner || !offer) return {};
          if (partner.banned || partner.status !== "approved") {
            result = { ok: false, error: "blocked" };
            return {};
          }
          if (!documentState(partner).ok) {
            result = { ok: false, error: "documents" };
            return {};
          }
          const sold = s.orders.filter((o) => o.offerId === offerId);
          if (sold.some((o) => o.partnerId === partnerId)) {
            result = { ok: false, error: "owned" };
            return {};
          }
          // admin may assign a New offer it has just checked by phone, but never past the quota
          if (!["new", "in_progress"].includes(offer.status) || sold.length >= offer.offersWanted) return {};
          if (partner.wallet < price) {
            result = { ok: false, error: "insufficient" };
            return {};
          }
          const order: Order = {
            id: `ORD-${String(5001 + s.orders.length).padStart(5, "0")}`,
            offerId,
            partnerId,
            channel: "manual",
            price,
            note: note?.trim() || undefined,
            executed: false,
            createdAt: nowIso(),
          };
          result = { ok: true, order, price, discount: 0 };
          return recordPurchase(s, order, offer, sold.length);
        });
        return result;
      },

      approveOffer: (id) =>
        set((s) => ({
          offers: s.offers.map((o) => (o.id === id && o.status === "new" ? { ...o, status: "in_progress", verifiedAt: nowIso() } : o)),
        })),

      cancelOffer: (id, reason, refundOrderIds = []) => {
        const offer = get().offers.find((o) => o.id === id);
        if (!offer || offer.status === "cancelled") return;
        const at = nowIso();
        set((s) => ({
          offers: s.offers.map((o) => (o.id === id ? { ...o, status: "cancelled", cancelReason: reason, cancelledAt: at, active: false } : o)),
          // the company reports about this offer are settled by the decision
          fakeReports:
            reason === "fake"
              ? s.fakeReports.map((r) => (s.orders.find((o) => o.id === r.orderId)?.offerId === id && !["confirmed", "canceled"].includes(r.status) ? { ...r, status: "confirmed" } : r))
              : s.fakeReports,
        }));
        // money only moves for fake offers: a customer changing their mind is not refundable
        if (reason !== "fake") return;
        const { orders, fakeReports, refunds, issueRefund, decideRefund } = get();
        for (const order of orders.filter((o) => o.offerId === id && refundOrderIds.includes(o.id))) {
          // a company that had already claimed this purchase gets its waiting claim paid, not a second refund
          const claim = refunds.find((r) => r.orderId === order.id && r.status === "pending");
          if (claim) {
            decideRefund(claim.id, "refunded");
            continue;
          }
          if (refunds.some((r) => r.orderId === order.id && r.status === "refunded")) continue;
          const report = fakeReports.find((r) => r.orderId === order.id);
          issueRefund({ partnerId: order.partnerId, amount: order.price, reason: "fake_lead", orderId: order.id, note: report?.reason ?? "Offer cancelled as fake by Kompass." });
        }
      },

      repostOffer: (id) =>
        set((s) => ({ offers: s.offers.map((o) => (o.id === id && o.status === "in_progress" ? { ...o, repostedAt: nowIso(), active: true } : o)) })),

      notifyCustomerOfBuyers: (offerId) =>
        set((s) => ({ offers: s.offers.map((o) => (o.id === offerId ? { ...o, buyersNotifiedAt: nowIso() } : o)) })),

      sweepExpired: () =>
        set((s) => {
          const now = Date.now();
          if (!s.offers.some((o) => o.status === "in_progress" && Date.parse(o.deadline) < now)) return {};
          return { offers: s.offers.map((o) => (o.status === "in_progress" && Date.parse(o.deadline) < now ? { ...o, status: "expired" } : o)) };
        }),

      reportFakeLead: (orderId, reason) =>
        set((s) => {
          const order = s.orders.find((o) => o.id === orderId);
          const partner = s.partners.find((p) => p.id === order?.partnerId);
          return {
            fakeReports: [{ id: `FR-${101 + s.fakeReports.length}`, orderId, reason, status: "open", createdAt: nowIso() }, ...s.fakeReports],
            notifications: notify(s, {
              kind: "report",
              title: { en: `Fake-offer report from ${partner?.name ?? "partner"}`, de: `Meldung einer gefälschten Anfrage von ${partner?.name ?? "Partner"}`, fr: `Signalement de fausse demande par ${partner?.name ?? "un partenaire"}`, it: `Segnalazione di richiesta falsa da ${partner?.name ?? "partner"}` },
              href: "/admin/leads/fake-reports",
            }),
          };
        }),

      uploadPayment: (input) => {
        const s = get();
        const due: PartnerDue = { ...input, id: `DUE-${String(301 + s.dues.length).padStart(4, "0")}`, status: "pending", createdAt: nowIso() };
        const partner = s.partners.find((p) => p.id === input.partnerId);
        set({
          dues: [due, ...s.dues],
          notifications: notify(s, {
            kind: "due",
            title: { en: `Payment receipt CHF ${input.amount} from ${partner?.name}`, de: `Zahlungsbeleg CHF ${input.amount} von ${partner?.name}`, fr: `Justificatif de paiement CHF ${input.amount} de ${partner?.name}`, it: `Ricevuta di pagamento CHF ${input.amount} da ${partner?.name}` },
            href: "/admin/finance/partner-dues",
          }),
        });
        return due;
      },

      requestReviewRemoval: (reviewId, partnerId, reason) =>
        set((s) => {
          const partner = s.partners.find((p) => p.id === partnerId);
          return {
            removals: [{ id: `RR-${s.removals.length + 1}`, reviewId, partnerId, reason, status: "pending", createdAt: nowIso() }, ...s.removals],
            notifications: notify(s, {
              kind: "review",
              title: { en: `Review removal requested by ${partner?.name}`, de: `Löschung einer Bewertung beantragt von ${partner?.name}`, fr: `Suppression d’avis demandée par ${partner?.name}`, it: `Rimozione recensione richiesta da ${partner?.name}` },
              href: "/admin/moderation/removals",
            }),
          };
        }),

      resetDemo: () => set((s) => ({ ...createSeed(), session: s.session, partnerSession: s.partnerSession })),
    }),
    {
      name: "kompass-prototype-v1",
      // v2 added German, French and Italian; v3 dropped Arabic; v4 moved offers to the five-status
      // lifecycle; v5 added wallet top-ups, credit invoices and the fake-only refund policy; v6 dated
      // company documents, files, messages and regional nominations; v7 removed complaints and added
      // offer-form sessions and contact follow-up; v8 the six services, booking types, chosen
      // companies and no-shows; v9 the partner portal flows (onboarding contract, message threads,
      // payouts, service areas); v10 two booking types (same / other person); v11 no-shows removed
      // (customers only answer a review survey); v12 service-specific request details; v13 organizations and the customer's address; v14 fake-offer reports whose
      // status matches the refunds. Older saves start again from the current seed,
      // keeping the signed-in sessions.
      version: 14,
      migrate: (persisted, version) => {
        if (version >= 14) return persisted as Store;
        const { session, partnerSession } = (persisted ?? {}) as Partial<Store>;
        return { ...createSeed(), session: session ?? null, partnerSession: partnerSession ?? null } as Store;
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // persist data + sessions, never the action functions
      partialize: (s) =>
        Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")) as Partial<Store>,
    },
  ),
);
