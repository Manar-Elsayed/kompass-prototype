/**
 * Domain model for the Kompass ecosystem.
 * Shapes are derived from the legacy front `types/*.ts` and the admin
 * RTK Query endpoints (offers, companies, orders, reviews, complaints …),
 * normalised and made multilingual (EN / DE / FR / IT).
 */

export type Lang = "en" | "de" | "fr" | "it";
export const LANGS: readonly Lang[] = ["en", "de", "fr", "it"];
export type L10n = Record<Lang, string>;
export type ID = string;

/* ---------- Catalogue ---------- */
export interface Service {
  id: ID;
  slug: string;
  icon: string; // lucide icon name
  name: L10n;
  short: L10n;
  body: L10n; // rich text (html)
  image: string;
  features: { id: ID; icon: string; title: L10n; description: L10n }[];
  tips: { id: ID; text: L10n }[];
  leadPrice: number; // CHF a partner pays per lead
  active: boolean;
  order: number;
}

/* ---------- Leads ---------- */
/**
 * Offer lifecycle. New = received and waiting for verification (auto-checks flagged it);
 * In progress = verified and on sale; Completed = sold to as many companies as the customer chose;
 * Expired = the customer's deadline passed before that; Cancelled = fake or withdrawn by the customer.
 */
export type LeadStatus = "new" | "in_progress" | "completed" | "expired" | "cancelled";
/** Why an offer was cancelled — decides the money: fake offers are refunded, customer cancellations are not. */
export type CancelReason = "fake" | "customer";
/** Automatic checks run on every new offer; any hit holds it in New for admin review. */
export type VerificationFlag = "duplicate" | "invalid_phone" | "invalid_email" | "ip_burst";

export interface Address {
  street: string;
  city: string;
  zip: string;
  country: string;
  rooms: string;
  floor: string;
  elevator: boolean;
}

export interface Offer {
  id: ID; // e.g. "KO-10234"
  serviceId: ID;
  gender: "male" | "female";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lang: Lang | "de" | "fr" | "it";
  ip: string;
  device: "desktop" | "mobile" | "tablet";
  from: Address;
  to: Address;
  executionDate: string;
  deadline: string; // last date for submitting offers
  offersWanted: number; // 1-5
  details: string;
  active: boolean;
  status: LeadStatus;
  flags: VerificationFlag[];
  cancelReason?: CancelReason;
  cancelledAt?: string;
  verifiedAt?: string;
  /** Pushed back to the top of the shop shortly before the deadline. */
  repostedAt?: string;
  /** When the customer was emailed the names of the companies that bought the offer. */
  buyersNotifiedAt?: string;
  source: "website" | "admin";
  createdAt: string;
}

export interface Order {
  id: ID;
  offerId: ID;
  partnerId: ID;
  /** shop = bought by the company; dynamic = auto-distributed; manual = assigned by an admin (e.g. urgent request). */
  channel: "shop" | "dynamic" | "manual";
  price: number;
  note?: string;
  couponCode?: string;
  executed: boolean;
  createdAt: string;
}

export type FakeReportStatus = "open" | "testing" | "pending" | "confirmed" | "canceled";
export interface FakeReport {
  id: ID;
  orderId: ID;
  reason: string;
  status: FakeReportStatus;
  createdAt: string;
}

/**
 * Money Kompass gives back to a company, always into its wallet. Policy: a purchase is refunded
 * only when the offer is confirmed fake; a customer cancelling a real request is never refunded.
 * "manual" is the admin exception — a refund to any company, with the reason written down.
 */
export type RefundReason = "fake_lead" | "manual";
export type RefundStatus = "pending" | "refunded" | "rejected";
export interface Refund {
  id: ID;
  partnerId: ID;
  amount: number;
  reason: RefundReason;
  orderId?: ID; // the lead purchase being refunded, when there is one
  note: string;
  status: RefundStatus;
  createdAt: string;
  decidedAt?: string;
}

/* ---------- Wallet money-in & invoices ---------- */
/**
 * How money reached a wallet besides an uploaded receipt (PartnerDue):
 * online = the company paid by card / TWINT in the portal; admin = Kompass recorded a payment;
 * credit = Kompass advanced the amount now and invoiced it for later ("pay later").
 */
export type TopupMethod = "online" | "admin" | "credit";
export type PayMethod = "card" | "twint" | "bank_transfer" | "cash";
export interface WalletTopup {
  id: ID; // TU-0001
  partnerId: ID;
  amount: number;
  method: TopupMethod;
  payMethod?: PayMethod;
  reference: string;
  note: string;
  byUserId?: ID; // admin who recorded it
  invoiceId?: ID; // credit: the invoice for the amount owed
  createdAt: string;
}

/** Invoice for credit given now and paid later. "Overdue" is derived: due and past dueAt. */
export type InvoiceStatus = "due" | "paid";
export interface Invoice {
  id: ID; // INV-2026-0001
  partnerId: ID;
  topupId: ID;
  amount: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  paidMethod?: PayMethod;
  paidReference?: string;
}

/* ---------- Partners ---------- */
export type PartnerStatus = "pending" | "contract_sent" | "approved" | "rejected";

export interface Partner {
  id: ID;
  name: string;
  slug: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  regNumber: string;
  foundedYear: number;
  ownerName: string;
  address: string;
  city: string;
  zip: string;
  canton: string;
  about: L10n;
  serviceIds: ID[];
  status: PartnerStatus;
  banned: boolean;
  featured: boolean;
  expiresAt?: string;
  wallet: number;
  bank: { name: string; owner: string; iban: string };
  documents: { contract?: string; insurance?: string; register?: string };
  lastSeen: string;
  createdAt: string;
}

export type DueStatus = "pending" | "confirmed" | "canceled";
export interface PartnerDue {
  id: ID;
  partnerId: ID;
  amount: number;
  method: "bank_transfer" | "twint" | "card";
  reference: string;
  receipt: string; // image url
  status: DueStatus;
  createdAt: string;
}

/* ---------- Trust & moderation ---------- */
export type ModerationStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: ID;
  target: "kompass" | ID; // "kompass" or partnerId
  name: string;
  email: string;
  stars: number;
  comment: string;
  status: ModerationStatus;
  createdAt: string;
}

export interface RemovalRequest {
  id: ID;
  reviewId: ID;
  partnerId: ID;
  reason: string;
  status: ModerationStatus;
  createdAt: string;
}

export interface Complaint {
  id: ID;
  kind: "partner" | "offer";
  partnerId?: ID;
  offerId?: ID;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ModerationStatus;
  createdAt: string;
}

/* ---------- Commerce ---------- */
export interface Coupon {
  id: ID;
  code: string;
  serviceId: ID | "all";
  type: "percent" | "fixed";
  discount: number;
  used: number;
  usageLimit: number;
  multiUse: boolean;
  active: boolean;
  startDate: string;
  endDate: string;
}

/* ---------- Inbox / insights ---------- */
export interface ContactMessage {
  id: ID;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface FaqQuestion {
  id: ID;
  name: string;
  email: string;
  question: string;
  answered: boolean;
  createdAt: string;
}

export interface Visitor {
  id: ID;
  ip: string;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  city: string;
  country: string;
  lang: string;
  pages: number;
  converted: boolean;
  lastSeen: string;
}

export interface Notification {
  id: ID;
  kind: "lead" | "application" | "due" | "review" | "complaint" | "contact" | "report";
  title: L10n;
  href: string;
  read: boolean;
  createdAt: string;
}

/* ---------- Access ---------- */
export const PERMISSIONS = [
  "dashboard",
  "leads",
  "partners",
  "finance",
  "moderation",
  "inbox",
  "insights",
  "cms",
  "settings",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface Role {
  id: ID;
  name: L10n;
  description: L10n;
  permissions: Permission[];
  system?: boolean;
}

export interface AdminUser {
  id: ID;
  name: string;
  email: string;
  phone: string;
  roleId: ID;
  active: boolean;
  lastLogin: string;
}

/* ---------- Content (CMS) ---------- */
export interface Blog {
  id: ID;
  slug: string;
  serviceId: ID; // category
  title: L10n;
  excerpt: L10n;
  body: L10n;
  image: string;
  readMins: number;
  published: boolean;
  createdAt: string;
}

export interface Faq {
  id: ID;
  question: L10n;
  answer: L10n;
  order: number;
}

export interface ModelOffer {
  id: ID;
  serviceId: ID;
  title: L10n;
  route: L10n;
  rooms: string;
  price: number;
  active: boolean;
}

export interface Step {
  icon: string;
  title: L10n;
  description: L10n;
}

export interface SiteContent {
  general: {
    phone: string;
    email: string;
    address: L10n;
    hours: L10n;
    socials: { facebook: string; instagram: string; linkedin: string; youtube: string };
    footerAbout: L10n;
  };
  home: {
    heroEyebrow: L10n;
    heroTitle: L10n;
    heroDescription: L10n;
    heroCta: L10n;
    heroImage: string;
    stats: { value: string; label: L10n }[];
    servicesTitle: L10n;
    servicesSubtitle: L10n;
    howTitle: L10n;
    howSubtitle: L10n;
    steps: Step[];
    testimonialsTitle: L10n;
    testimonialsSubtitle: L10n;
    faqTitle: L10n;
    faqSubtitle: L10n;
    trustedTitle: L10n;
    partnerCtaTitle: L10n;
    partnerCtaDescription: L10n;
    partnerCtaButton: L10n;
  };
  offerForm: {
    title: L10n;
    subtitle: L10n;
    step1: L10n;
    step2: L10n;
    successTitle: L10n;
    successMessage: L10n;
    note: L10n;
  };
  about: {
    title: L10n;
    subtitle: L10n;
    body: L10n;
    image: string;
    mission: L10n;
    vision: L10n;
    values: { title: L10n; description: L10n; icon: string }[];
    numbers: { value: string; label: L10n }[];
  };
  contact: { title: L10n; subtitle: L10n; formTitle: L10n; image: string };
  companiesPage: { title: L10n; subtitle: L10n; image: string };
  blogsPage: { title: L10n; subtitle: L10n; image: string };
  faqPage: { title: L10n; subtitle: L10n; askTitle: L10n };
  partnerPage: {
    title: L10n;
    subtitle: L10n;
    benefits: { icon: string; title: L10n; description: L10n }[];
    steps: Step[];
    ctaTitle: L10n;
    ctaDescription: L10n;
  };
  legal: { imprint: L10n; privacy: L10n; terms: L10n };
  popup: { enabled: boolean; title: L10n; body: L10n; cta: L10n; href: string; delaySec: number };
}

export interface Config {
  defaultLeadPrice: number;
  maxOffersPerLead: number;
  vatRate: number;
  leadExpiryDays: number;
  autoDistribute: boolean;
  comingSoonMode: boolean;
  supportEmail: string;
  invoicePrefix: string;
  contractTemplate: string;
}

/* ---------- Root ---------- */
export interface DB {
  services: Service[];
  offers: Offer[];
  orders: Order[];
  fakeReports: FakeReport[];
  partners: Partner[];
  dues: PartnerDue[];
  refunds: Refund[];
  topups: WalletTopup[];
  invoices: Invoice[];
  reviews: Review[];
  removals: RemovalRequest[];
  complaints: Complaint[];
  coupons: Coupon[];
  contacts: ContactMessage[];
  faqQuestions: FaqQuestion[];
  visitors: Visitor[];
  notifications: Notification[];
  roles: Role[];
  users: AdminUser[];
  blogs: Blog[];
  faqs: Faq[];
  modelOffers: ModelOffer[];
  site: SiteContent;
  config: Config;
}
