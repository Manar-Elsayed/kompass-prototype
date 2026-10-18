import type {
  Complaint,
  ContactMessage,
  Coupon,
  FakeReport,
  FaqQuestion,
  LeadStatus,
  Notification,
  Offer,
  Order,
  Partner,
  PartnerDue,
  RemovalRequest,
  Review,
  Visitor,
} from "@/lib/types";
import { slugify } from "@/lib/utils";
import { services } from "./catalog";
import { createRng, daysAgo, daysAhead } from "./rng";

const rng = createRng();
const l = (en: string, ar: string) => ({ en, ar });

/* ---------- reference data ---------- */
export const CITIES = [
  { city: "Zürich", zip: "8001", canton: "ZH" },
  { city: "Winterthur", zip: "8400", canton: "ZH" },
  { city: "Bern", zip: "3011", canton: "BE" },
  { city: "Basel", zip: "4051", canton: "BS" },
  { city: "Luzern", zip: "6003", canton: "LU" },
  { city: "St. Gallen", zip: "9000", canton: "SG" },
  { city: "Lausanne", zip: "1003", canton: "VD" },
  { city: "Genève", zip: "1201", canton: "GE" },
  { city: "Lugano", zip: "6900", canton: "TI" },
  { city: "Zug", zip: "6300", canton: "ZG" },
  { city: "Aarau", zip: "5000", canton: "AG" },
  { city: "Thun", zip: "3600", canton: "BE" },
  { city: "Chur", zip: "7000", canton: "GR" },
  { city: "Fribourg", zip: "1700", canton: "FR" },
] as const;

const STREETS = ["Bahnhofstrasse", "Seestrasse", "Hauptstrasse", "Dorfstrasse", "Kirchweg", "Bergstrasse", "Schulhausstrasse", "Rue du Lac", "Via Nassa", "Marktgasse"];
const FIRST_M = ["Lukas", "Noah", "David", "Marco", "Jonas", "Ahmed", "Luca", "Daniel", "Elias", "Samir", "Thomas", "Fabian"];
const FIRST_F = ["Anna", "Laura", "Sara", "Mia", "Lea", "Nina", "Yasmin", "Elena", "Julia", "Leila", "Sophie", "Chiara"];
const LAST = ["Müller", "Meier", "Schmid", "Keller", "Weber", "Huber", "Brunner", "Gerber", "Frei", "Baumann", "Haddad", "Rossi", "Fischer", "Moser", "Steiner", "Kaya"];

const PARTNER_NAMES = [
  "Alpen Umzüge AG", "Zürisee Transport GmbH", "Helvetia Moving", "SwissMove Pro", "Bärner Zügelprofis",
  "Rhein Umzug & Reinigung", "Léman Déménagement SA", "Ticino Traslochi", "Blitz Umzüge", "Matterhorn Logistics",
  "CleanHand Reinigung", "Luzern Zügelservice", "Gotthard Transporte", "Edelweiss Relocation", "Easy Move Basel",
  "Säntis Umzüge", "Aare Clean & Move", "PianoPro Schweiz", "Limmat Lagerhaus", "Jura Déménagements",
  "Graubünden Transport", "Fix&Fertig Räumungen", "Rigi Moving Partners", "StadtUmzug Winterthur", "Pilatus Reinigung",
];

const BANKS = ["UBS Switzerland AG", "Credit Suisse (UBS)", "Zürcher Kantonalbank", "PostFinance", "Raiffeisen", "Berner Kantonalbank"];

const ABOUT = [
  l("Family-run moving company with 20 years of experience and a fleet of 12 trucks.", "شركة نقل عائلية بخبرة 20 عاماً وأسطول من 12 شاحنة."),
  l("Specialists in fast city moves with fixed-price guarantees.", "متخصصون في النقل السريع داخل المدن مع ضمان السعر الثابت."),
  l("Combined moving and cleaning with acceptance guarantee.", "نقل وتنظيف معاً مع ضمان القبول."),
  l("Premium relocation services for families and expats.", "خدمات نقل مميزة للعائلات والمغتربين."),
  l("Certified heavy-goods and piano transport across Switzerland.", "نقل معتمد للبضائع الثقيلة والبيانو في جميع أنحاء سويسرا."),
];

const pad = (n: number, len = 2) => String(n).padStart(len, "0");
const phone = () => `+41 7${rng.int(5, 9)} ${rng.int(100, 999)} ${pad(rng.int(0, 99))} ${pad(rng.int(0, 99))}`;
const ip = () => `${rng.int(31, 213)}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;

/* ---------- partners ---------- */
export const partners: Partner[] = PARTNER_NAMES.map((name, i) => {
  const loc = CITIES[i % CITIES.length];
  const status: Partner["status"] = i < 19 ? "approved" : i < 22 ? "pending" : i < 24 ? "contract_sent" : "rejected";
  const nSvc = rng.int(1, 4);
  const serviceIds = rng.sample(services.filter((s) => s.active).map((s) => s.id), nSvc);
  if (name.includes("Clean") || name.includes("Reinigung")) serviceIds.splice(0, serviceIds.length, "svc-cleaning", "svc-private");
  if (name.includes("Piano")) serviceIds.splice(0, serviceIds.length, "svc-piano", "svc-private");
  const owner = `${rng.pick([...FIRST_M, ...FIRST_F])} ${rng.pick(LAST)}`;
  const slug = slugify(name);
  return {
    id: `p-${pad(i + 1, 3)}`,
    name,
    slug,
    email: `info@${slug.replace(/-/g, "")}.ch`,
    phone: `+41 ${rng.int(21, 91)} ${rng.int(200, 999)} ${pad(rng.int(0, 99))} ${pad(rng.int(0, 99))}`,
    mobile: phone(),
    website: `https://www.${slug.replace(/-/g, "")}.ch`,
    regNumber: `CHE-${rng.int(100, 999)}.${rng.int(100, 999)}.${rng.int(100, 999)}`,
    foundedYear: rng.int(1985, 2021),
    ownerName: owner,
    address: `${rng.pick(STREETS)} ${rng.int(1, 120)}`,
    city: loc.city,
    zip: loc.zip,
    canton: loc.canton,
    about: ABOUT[i % ABOUT.length],
    serviceIds,
    status,
    banned: status === "approved" && i === 7,
    featured: i < 8,
    expiresAt: status === "approved" ? daysAhead(rng.int(-10, 360)) : undefined,
    wallet: status === "approved" ? rng.int(0, 60) * 10 : 0,
    bank: { name: rng.pick(BANKS), owner: name, iban: `CH${pad(rng.int(10, 99))} 0${rng.int(100, 999)} ${rng.int(1000, 9999)} ${rng.int(1000, 9999)} ${rng.int(1000, 9999)} ${rng.int(1, 9)}` },
    documents:
      status === "approved"
        ? { contract: "contract-signed.pdf", insurance: "insurance-2026.pdf", register: "hr-extract.pdf" }
        : status === "contract_sent"
          ? { insurance: "insurance.pdf", register: "hr-extract.pdf" }
          : { register: rng.chance(0.5) ? "hr-extract.pdf" : undefined },
    lastSeen: daysAgo(rng.int(0, 20), -rng.int(0, 10)),
    createdAt: status === "approved" ? daysAgo(rng.int(60, 700)) : daysAgo(rng.int(0, 12)),
  };
});

const approved = partners.filter((p) => p.status === "approved" && !p.banned);

/* ---------- offers (leads) ---------- */
const STATUS_POOL: LeadStatus[] = [
  "new", "new", "new", "in_progress", "in_progress", "in_progress", "partially_completed",
  "completed", "completed", "completed", "completed", "partially_critical", "critical", "cancelled", "failed",
];
const DETAILS = [
  "Piano on 2nd floor, needs special handling.",
  "Need packing material for kitchen.",
  "Parking is difficult, narrow street.",
  "Please call after 17:00.",
  "We also need disassembly of 2 wardrobes.",
  "",
  "",
];

export const offers: Offer[] = Array.from({ length: 128 }, (_, i) => {
  const gender = rng.chance(0.5) ? "male" : "female";
  const first = gender === "male" ? rng.pick(FIRST_M) : rng.pick(FIRST_F);
  const last = rng.pick(LAST);
  const from = rng.pick(CITIES);
  const to = rng.chance(0.6) ? from : rng.pick(CITIES);
  const age = Math.floor((i / 128) * 180) + rng.int(0, 2); // spread over ~6 months, newest first
  const svc = rng.chance(0.55) ? services[0] : rng.pick(services.filter((s) => s.active));
  const status: LeadStatus = age < 4 ? "new" : rng.pick(STATUS_POOL);
  // open, recent leads move in the future so the partner shop always has stock
  const open = age < 75 && ["new", "in_progress", "partially_completed", "partially_critical"].includes(status);
  const lead = rng.int(14, 60);
  const rooms = rng.pick(["1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5.5"]);
  return {
    id: `KO-${10400 - i}`,
    serviceId: svc.id,
    gender,
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase()}.${last.toLowerCase().replace(/ü/g, "ue")}@${rng.pick(["gmail.com", "bluewin.ch", "outlook.com", "gmx.ch"])}`,
    phone: phone(),
    lang: rng.pick(["de", "de", "de", "en", "fr", "it", "ar"] as const),
    ip: ip(),
    device: rng.pick(["desktop", "mobile", "mobile", "tablet"] as const),
    from: { street: `${rng.pick(STREETS)} ${rng.int(1, 99)}`, city: from.city, zip: from.zip, country: "CH", rooms, floor: String(rng.int(0, 6)), elevator: rng.chance(0.6) },
    to: { street: `${rng.pick(STREETS)} ${rng.int(1, 99)}`, city: to.city, zip: to.zip, country: "CH", rooms: rng.pick(["2", "3", "3.5", "4.5", "5"]), floor: String(rng.int(0, 5)), elevator: rng.chance(0.6) },
    executionDate: daysAhead(open ? Math.max(6, lead - Math.round(age / 3)) : -age + lead),
    deadline: daysAhead(open ? Math.max(2, lead - Math.round(age / 3) - 5) : -age + rng.int(5, 12)),
    offersWanted: rng.int(2, 5),
    details: rng.pick(DETAILS),
    active: !["cancelled", "failed"].includes(status),
    status,
    source: rng.chance(0.93) ? "website" : "admin",
    createdAt: daysAgo(age, -rng.int(0, 12)),
  };
});

/* ---------- orders (leads bought by partners) ---------- */
export const orders: Order[] = [];
offers.forEach((o) => {
  if (o.status === "new" || o.status === "cancelled") return;
  const svc = services.find((s) => s.id === o.serviceId)!;
  const buyers = rng.sample(approved, Math.min(o.offersWanted, rng.int(1, o.offersWanted)));
  buyers.forEach((p, j) => {
    orders.push({
      id: `ORD-${pad(orders.length + 5001, 5)}`,
      offerId: o.id,
      partnerId: p.id,
      channel: rng.chance(0.4) ? "shop" : "dynamic",
      price: svc.leadPrice,
      couponCode: rng.chance(0.08) ? "WELCOME20" : undefined,
      executed: o.status === "completed" ? j === 0 : false,
      createdAt: new Date(new Date(o.createdAt).getTime() + rng.int(1, 30) * 3_600_000).toISOString(),
    });
  });
});

export const fakeReports: FakeReport[] = rng.sample(orders, 9).map((o, i) => ({
  id: `FR-${pad(i + 101, 3)}`,
  orderId: o.id,
  reason: rng.pick([
    "Customer phone number does not exist.",
    "Customer says they never requested a move.",
    "Duplicate of a lead bought last week.",
    "Email bounced, no reply on phone.",
  ]),
  status: (["open", "open", "testing", "pending", "confirmed", "canceled", "open", "pending", "testing"] as const)[i],
  createdAt: daysAgo(rng.int(0, 25)),
}));

/* ---------- partner dues (payments with receipts) ---------- */
export const dues: PartnerDue[] = Array.from({ length: 22 }, (_, i) => {
  const p = rng.pick(approved);
  return {
    id: `DUE-${pad(i + 301, 4)}`,
    partnerId: p.id,
    amount: rng.int(5, 60) * 10,
    method: rng.pick(["bank_transfer", "bank_transfer", "twint", "card"] as const),
    reference: `KMP-${2026}-${pad(rng.int(1, 999), 4)}`,
    receipt: "/images/complaint.png",
    status: i < 6 ? "pending" : rng.chance(0.85) ? "confirmed" : "canceled",
    createdAt: daysAgo(i * 6 + rng.int(0, 4)),
  };
});

/* ---------- reviews ---------- */
const KOMPASS_COMMENTS = [
  l("Super easy! Got 4 offers within a day and saved almost CHF 600.", "سهل جداً! حصلت على 4 عروض خلال يوم ووفرت قرابة 600 فرنك."),
  l("Great overview of companies, the reviews helped a lot.", "نظرة عامة رائعة على الشركات، والتقييمات ساعدتني كثيراً."),
  l("Fast, transparent and free. I'd use Kompass again.", "سريع وشفاف ومجاني. سأستخدم كومباس مجدداً."),
  l("The form was quick and the movers were excellent.", "النموذج سريع وشركة النقل كانت ممتازة."),
  l("Good service, but one company called a bit too often.", "خدمة جيدة، لكن إحدى الشركات اتصلت أكثر من اللازم."),
  l("Helpful support team when I had to change my date.", "فريق دعم متعاون عندما احتجت لتغيير الموعد."),
];

const PARTNER_COMMENTS = [
  "Very professional team, nothing was damaged.",
  "On time, friendly and the price matched the quote.",
  "Cleaning passed the handover without issues!",
  "A bit late but did a careful job.",
  "Excellent piano transport, highly recommended.",
  "Communication could have been better.",
  "Fast and efficient, finished an hour early.",
];

export const reviews: Review[] = [
  ...KOMPASS_COMMENTS.map((c, i) => ({
    id: `RV-K${i + 1}`,
    target: "kompass" as const,
    name: `${rng.pick([...FIRST_F, ...FIRST_M])} ${rng.pick(LAST)[0]}.`,
    email: `customer${i + 1}@mail.ch`,
    stars: i === 4 ? 4 : 5,
    comment: c.en,
    status: i < 5 ? ("approved" as const) : ("pending" as const),
    createdAt: daysAgo(i * 9 + 1),
  })),
  ...Array.from({ length: 46 }, (_, i) => {
    const p = rng.pick(approved);
    const stars = rng.pick([5, 5, 5, 4, 4, 4, 3, 2, 5]);
    return {
      id: `RV-P${i + 1}`,
      target: p.id,
      name: `${rng.pick([...FIRST_F, ...FIRST_M])} ${rng.pick(LAST)}`,
      email: `client${i + 1}@mail.ch`,
      stars,
      comment: rng.pick(PARTNER_COMMENTS),
      status: i < 5 ? ("pending" as const) : rng.chance(0.92) ? ("approved" as const) : ("rejected" as const),
      createdAt: daysAgo(rng.int(0, 160)),
    };
  }),
];

export const KOMPASS_REVIEW_AR: Record<string, string> = Object.fromEntries(
  KOMPASS_COMMENTS.map((c, i) => [`RV-K${i + 1}`, c.ar]),
);

const lowReviews = reviews.filter((r) => r.target !== "kompass" && r.stars <= 3 && r.status === "approved");
export const removals: RemovalRequest[] = lowReviews.slice(0, 4).map((r, i) => ({
  id: `RR-${i + 1}`,
  reviewId: r.id,
  partnerId: r.target,
  reason: rng.pick(["Customer was never our client.", "Review contains false statements about pricing.", "Customer cancelled; we never performed the job."]),
  status: i < 3 ? "pending" : "rejected",
  createdAt: daysAgo(rng.int(0, 15)),
}));

/* ---------- complaints ---------- */
export const complaints: Complaint[] = Array.from({ length: 11 }, (_, i) => {
  const kind = i % 3 === 0 ? "offer" : "partner";
  const p = rng.pick(approved);
  const o = rng.pick(offers.slice(0, 60));
  return {
    id: `CMP-${pad(i + 1, 3)}`,
    kind,
    partnerId: kind === "partner" ? p.id : undefined,
    offerId: kind === "offer" ? o.id : undefined,
    name: `${rng.pick([...FIRST_F, ...FIRST_M])} ${rng.pick(LAST)}`,
    email: `complaint${i + 1}@mail.ch`,
    phone: phone(),
    message: rng.pick([
      "The movers arrived 3 hours late and charged extra.",
      "A wardrobe was damaged and the company does not respond.",
      "I received calls from more companies than I selected.",
      "The final invoice was much higher than the quote.",
      "Nobody contacted me after submitting my request.",
    ]),
    status: i < 4 ? "pending" : rng.chance(0.6) ? "approved" : "rejected",
    createdAt: daysAgo(i * 4 + rng.int(0, 3)),
  };
});

/* ---------- coupons ---------- */
export const coupons: Coupon[] = [
  { id: "cp-1", code: "WELCOME20", serviceId: "all", type: "percent", discount: 20, used: 31, usageLimit: 100, multiUse: false, active: true, startDate: daysAgo(90), endDate: daysAhead(60) },
  { id: "cp-2", code: "CLEAN10", serviceId: "svc-cleaning", type: "fixed", discount: 10, used: 12, usageLimit: 50, multiUse: true, active: true, startDate: daysAgo(30), endDate: daysAhead(30) },
  { id: "cp-3", code: "OFFICE25", serviceId: "svc-office", type: "percent", discount: 25, used: 4, usageLimit: 20, multiUse: false, active: true, startDate: daysAgo(10), endDate: daysAhead(80) },
  { id: "cp-4", code: "SUMMER15", serviceId: "all", type: "percent", discount: 15, used: 80, usageLimit: 80, multiUse: true, active: false, startDate: daysAgo(150), endDate: daysAgo(40) },
];

/* ---------- inbox ---------- */
export const contacts: ContactMessage[] = Array.from({ length: 14 }, (_, i) => {
  const first = rng.pick([...FIRST_F, ...FIRST_M]);
  const last = rng.pick(LAST);
  return {
    id: `MSG-${pad(i + 1, 3)}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}@mail.ch`,
    phone: phone(),
    subject: rng.pick(["Question about my request", "Partnership enquiry", "Change moving date", "Invoice question", "Feedback"]),
    message: rng.pick([
      "Hello, I submitted a request yesterday but haven't heard back yet. Can you check?",
      "We are a cleaning company in Bern and would like to know more about becoming a partner.",
      "Can I change the moving date on my existing request?",
      "Thanks for the great service, the movers were fantastic.",
    ]),
    read: i > 3,
    createdAt: daysAgo(i * 2 + rng.int(0, 1), -rng.int(0, 8)),
  };
});

export const faqQuestions: FaqQuestion[] = [
  { id: "fq-1", name: "Mia Weber", email: "mia@mail.ch", question: "Do partners also offer weekend moves?", answered: false, createdAt: daysAgo(1) },
  { id: "fq-2", name: "Samir Kaya", email: "samir@mail.ch", question: "Can I request offers for a move from Germany?", answered: false, createdAt: daysAgo(3) },
  { id: "fq-3", name: "Elena Frei", email: "elena@mail.ch", question: "Is the cleaning guarantee included automatically?", answered: true, createdAt: daysAgo(9) },
];

/* ---------- visitors ---------- */
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Samsung Internet"];
export const visitors: Visitor[] = Array.from({ length: 64 }, (_, i) => {
  const c = rng.pick(CITIES);
  return {
    id: `v-${i + 1}`,
    ip: ip(),
    device: rng.pick(["desktop", "mobile", "mobile", "tablet"] as const),
    browser: rng.pick(BROWSERS),
    city: c.city,
    country: rng.chance(0.9) ? "Switzerland" : rng.pick(["Germany", "Austria", "France", "Italy"]),
    lang: rng.pick(["de", "de", "en", "fr", "it", "ar"]),
    pages: rng.int(1, 14),
    converted: rng.chance(0.18),
    lastSeen: daysAgo(Math.floor(i / 4), -rng.int(0, 20)),
  };
});

/* ---------- daily traffic series (for charts) ---------- */
export function trafficSeries(days = 30) {
  const r = createRng(777);
  return Array.from({ length: days }, (_, i) => {
    const d = days - 1 - i;
    const weekday = new Date(daysAgo(d)).getUTCDay();
    const base = weekday === 0 || weekday === 6 ? 340 : 520;
    const visitors = base + r.int(-80, 160) + Math.round(i * 4);
    const leads = offers.filter((o) => Math.floor((Date.parse(daysAgo(0)) - Date.parse(o.createdAt)) / 86_400_000) === d).length;
    return { date: daysAgo(d), visitors, offers: leads + r.int(2, 9) };
  });
}

/* ---------- notifications ---------- */
export const notifications: Notification[] = [
  { id: "n-1", kind: "lead", title: l(`New lead ${offers[0].id} · ${offers[0].from.city}`, `طلب جديد ${offers[0].id} · ${offers[0].from.city}`), href: `/admin/leads/${offers[0].id}`, read: false, createdAt: offers[0].createdAt },
  { id: "n-2", kind: "application", title: l("New partner application: Fix&Fertig Räumungen", "طلب شراكة جديد: Fix&Fertig Räumungen"), href: "/admin/partners/applications", read: false, createdAt: daysAgo(0, -3) },
  { id: "n-3", kind: "due", title: l("6 payment receipts waiting for approval", "6 إيصالات دفع بانتظار الموافقة"), href: "/admin/finance/partner-dues", read: false, createdAt: daysAgo(1) },
  { id: "n-4", kind: "report", title: l("Fake-lead report FR-101 opened", "تم فتح بلاغ طلب وهمي FR-101"), href: "/admin/leads/fake-reports", read: true, createdAt: daysAgo(2) },
  { id: "n-5", kind: "complaint", title: l("New complaint about a partner", "شكوى جديدة بخصوص شريك"), href: "/admin/moderation/complaints", read: true, createdAt: daysAgo(3) },
];
