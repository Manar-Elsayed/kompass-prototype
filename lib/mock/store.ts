"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Complaint,
  ContactMessage,
  DB,
  FaqQuestion,
  Notification,
  Offer,
  Order,
  Partner,
  PartnerDue,
  Refund,
  Review,
} from "@/lib/types";
import { slugify } from "@/lib/utils";
import { createSeed } from "./seed";

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
  submitOffer: (input: Omit<Offer, "id" | "createdAt" | "status" | "active" | "ip" | "device" | "source"> & { source?: Offer["source"] }) => Offer;
  registerPartner: (input: Omit<Partner, "id" | "slug" | "status" | "banned" | "featured" | "wallet" | "documents" | "lastSeen" | "createdAt">) => Partner;
  decideApplication: (id: string, decision: "contract_sent" | "approved" | "rejected", expiresAt?: string) => void;
  decideDue: (id: string, status: "confirmed" | "canceled") => void;
  /** Admin-issued refund: recorded as refunded straight away and applied to the wallet. */
  issueRefund: (input: Pick<Refund, "partnerId" | "amount" | "reason" | "method" | "orderId" | "note">) => Refund;
  decideRefund: (id: string, status: "refunded" | "rejected") => void;
  submitReview: (input: Pick<Review, "target" | "name" | "email" | "stars" | "comment">) => void;
  submitComplaint: (input: Omit<Complaint, "id" | "status" | "createdAt">) => void;
  submitContact: (input: Omit<ContactMessage, "id" | "read" | "createdAt">) => void;
  submitFaqQuestion: (input: Pick<FaqQuestion, "name" | "email" | "question">) => void;
  markAllNotificationsRead: () => void;

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
  | { ok: false; error: "unavailable" | "insufficient" | "coupon" | "blocked" };

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

/** How a refund moves the partner wallet: wallet credits add to it, a bank payout of the wallet balance takes from it. */
const walletDelta = (r: Pick<Refund, "amount" | "method" | "reason">) =>
  r.method === "wallet" ? r.amount : r.reason === "wallet_payout" ? -r.amount : 0;
const applyRefund = (partners: Partner[], r: Pick<Refund, "partnerId" | "amount" | "method" | "reason">) =>
  partners.map((p) => (p.id === r.partnerId ? { ...p, wallet: Math.max(0, p.wallet + walletDelta(r)) } : p));

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
          active: true,
          createdAt: nowIso(),
        };
        set({
          offers: [offer, ...s.offers],
          notifications: notify(s, {
            kind: "lead",
            title: { en: `New lead ${offer.id} · ${offer.from.city}`, de: `Neuer Lead ${offer.id} · ${offer.from.city}`, fr: `Nouveau lead ${offer.id} · ${offer.from.city}`, it: `Nuovo lead ${offer.id} · ${offer.from.city}` },
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

      decideApplication: (id, decision, expiresAt) =>
        set((s) => ({
          partners: s.partners.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: decision,
                  expiresAt: decision === "approved" ? expiresAt : p.expiresAt,
                  documents:
                    decision === "approved"
                      ? { contract: "contract-signed.pdf", insurance: p.documents.insurance ?? "insurance.pdf", register: p.documents.register ?? "hr-extract.pdf" }
                      : p.documents,
                }
              : p,
          ),
        })),

      issueRefund: (input) => {
        const at = nowIso();
        const next = Math.max(0, ...get().refunds.map((r) => Number(r.id.slice(3)) || 0)) + 1;
        const refund: Refund = { ...input, id: `RF-${String(next).padStart(3, "0")}`, status: "refunded", createdAt: at, decidedAt: at };
        set((s) => ({ refunds: [refund, ...s.refunds], partners: applyRefund(s.partners, refund) }));
        return refund;
      },

      decideRefund: (id, status) =>
        set((s) => {
          const refund = s.refunds.find((r) => r.id === id);
          if (!refund || refund.status !== "pending") return {};
          return {
            refunds: s.refunds.map((r) => (r.id === id ? { ...r, status, decidedAt: nowIso() } : r)),
            partners: status === "refunded" ? applyRefund(s.partners, refund) : s.partners,
          };
        }),

      decideDue: (id, status) =>
        set((s) => {
          const due = s.dues.find((d) => d.id === id);
          if (!due || due.status !== "pending") return {};
          return {
            dues: s.dues.map((d) => (d.id === id ? { ...d, status } : d)),
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

      submitComplaint: (input) =>
        set((s) => ({
          complaints: [{ ...input, id: uid("CMP"), status: "pending", createdAt: nowIso() }, ...s.complaints],
          notifications: notify(s, {
            kind: "complaint",
            title: { en: `New complaint from ${input.name}`, de: `Neue Beschwerde von ${input.name}`, fr: `Nouvelle réclamation de ${input.name}`, it: `Nuovo reclamo da ${input.name}` },
            href: "/admin/moderation/complaints",
          }),
        })),

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
        const s = get();
        const partner = s.partners.find((p) => p.id === partnerId);
        const offer = s.offers.find((o) => o.id === offerId);
        if (!partner || !offer) return { ok: false, error: "unavailable" };
        if (partner.banned || partner.status !== "approved" || (partner.expiresAt && Date.parse(partner.expiresAt) < Date.now()))
          return { ok: false, error: "blocked" };
        const sold = s.orders.filter((o) => o.offerId === offerId);
        if (!offer.active || Date.parse(offer.executionDate) < Date.now() || sold.length >= offer.offersWanted || sold.some((o) => o.partnerId === partnerId))
          return { ok: false, error: "unavailable" };
        const q = quoteLead(s, partnerId, offerId, couponCode);
        if (q.couponValid === false) return { ok: false, error: "coupon" };
        if (partner.wallet < q.price) return { ok: false, error: "insufficient" };
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
        set({
          orders: [order, ...s.orders],
          partners: s.partners.map((p) => (p.id === partnerId ? { ...p, wallet: p.wallet - q.price } : p)),
          coupons: code ? s.coupons.map((c) => (c.code === code ? { ...c, used: c.used + 1 } : c)) : s.coupons,
          offers: s.offers.map((o) => (o.id === offerId && o.status === "new" ? { ...o, status: "in_progress" } : o)),
        });
        return { ok: true, order, price: q.price, discount: q.discount };
      },

      reportFakeLead: (orderId, reason) =>
        set((s) => {
          const order = s.orders.find((o) => o.id === orderId);
          const partner = s.partners.find((p) => p.id === order?.partnerId);
          return {
            fakeReports: [{ id: `FR-${101 + s.fakeReports.length}`, orderId, reason, status: "open", createdAt: nowIso() }, ...s.fakeReports],
            notifications: notify(s, {
              kind: "report",
              title: { en: `Fake-lead report from ${partner?.name ?? "partner"}`, de: `Fake-Lead-Meldung von ${partner?.name ?? "Partner"}`, fr: `Signalement de faux lead par ${partner?.name ?? "un partenaire"}`, it: `Segnalazione di lead falso da ${partner?.name ?? "partner"}` },
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
      // v2 added German, French and Italian; v3 dropped Arabic. Older saves start again from the
      // current seed (EN/DE/FR/IT), keeping the signed-in sessions.
      version: 3,
      migrate: (persisted, version) => {
        if (version >= 3) return persisted as Store;
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
