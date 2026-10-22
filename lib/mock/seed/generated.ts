import type {
  BookingType,
  ContactMessage,
  Coupon,
  FakeReport,
  FaqQuestion,
  FormSession,
  L10n,
  LeadStatus,
  VerificationFlag,
  Notification,
  Offer,
  Order,
  Partner,
  PartnerDue,
  CompanyDoc,
  DocStatus,
  CompanyFile,
  CompanyMessage,
  Nomination,
  Payout,
  Refund,
  WalletTopup,
  Invoice,
  RemovalRequest,
  Review,
  Visitor,
} from "@/lib/types";
import { slugify } from "@/lib/utils";
import { services } from "./catalog";
import { DAY, NOW, createRng, daysAgo, daysAhead } from "./rng";

const rng = createRng();
/** Build a four-language string: en, de, fr, it. */
const l = (en: string, de: string, fr: string, it: string): L10n => ({ en, de, fr, it });

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
  l(
    "Family-run moving company with 20 years of experience and a fleet of 12 trucks.",
    "Familiengeführtes Umzugsunternehmen mit 20 Jahren Erfahrung und einer Flotte von 12 Lastwagen.",
    "Entreprise de déménagement familiale forte de 20 ans d'expérience et d'une flotte de 12 camions.",
    "Ditta di traslochi a conduzione familiare con 20 anni di esperienza e una flotta di 12 camion.",
  ),
  l(
    "Specialists in fast city moves with fixed-price guarantees.",
    "Spezialisiert auf schnelle Stadtumzüge mit Fixpreisgarantie.",
    "Spécialistes des déménagements urbains rapides avec garantie de prix fixe.",
    "Specialisti in traslochi urbani rapidi con garanzia di prezzo fisso.",
  ),
  l(
    "Combined moving and cleaning with acceptance guarantee.",
    "Umzug und Reinigung aus einer Hand mit Abnahmegarantie.",
    "Déménagement et nettoyage combinés avec garantie de restitution.",
    "Trasloco e pulizia combinati con garanzia di accettazione.",
  ),
  l(
    "Premium relocation services for families and expats.",
    "Premium-Umzugsservice für Familien und Expats.",
    "Services de déménagement haut de gamme pour familles et expatriés.",
    "Servizi di trasloco premium per famiglie ed espatriati.",
  ),
  l(
    "Certified heavy-goods and piano transport across Switzerland.",
    "Zertifizierte Schwer- und Klaviertransporte in der ganzen Schweiz.",
    "Transport certifié de charges lourdes et de pianos dans toute la Suisse.",
    "Trasporto certificato di carichi pesanti e pianoforti in tutta la Svizzera.",
  ),
];

const pad = (n: number, len = 2) => String(n).padStart(len, "0");
const phone = () => `+41 7${rng.int(5, 9)} ${rng.int(100, 999)} ${pad(rng.int(0, 99))} ${pad(rng.int(0, 99))}`;
const ip = () => `${rng.int(31, 213)}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;

/* ---------- services ---------- */
// The catalog used to have seven bookable services. Draws still sample from that list so the RNG stream
// (and every record after it) stays the same; retired services map onto the closest current one.
const LEGACY_SERVICES = ["svc-private", "svc-office", "svc-cleaning", "svc-clearance", "svc-piano", "svc-storage", "svc-international"];
const RETIRED: Record<string, string> = { "svc-office": "svc-private", "svc-international": "svc-move-clean" };
const current = (id: string) => RETIRED[id] ?? id;

/* ---------- partners ---------- */
// Raw records keep the original shape (contract expiry + file names) so the RNG stream is unchanged;
// they are turned into dated, checked documents below with a separate stream.
type RawPartner = Omit<Partner, "documents"> & { expiresAt?: string; documents: { contract?: string; insurance?: string; register?: string } };
const rawPartners: RawPartner[] = PARTNER_NAMES.map((name, i) => {
  const loc = CITIES[i % CITIES.length];
  const status: Partner["status"] = i < 19 ? "approved" : i < 22 ? "pending" : i < 24 ? "contract_sent" : "rejected";
  const nSvc = rng.int(1, 4);
  const serviceIds = [...new Set(rng.sample(LEGACY_SERVICES, nSvc).map(current))];
  if (name.includes("Clean") || name.includes("Reinigung")) serviceIds.splice(0, serviceIds.length, "svc-cleaning", "svc-private");
  if (name.includes("Piano")) serviceIds.splice(0, serviceIds.length, "svc-piano", "svc-private");
  // a company that moves and cleans can take the combined request too
  if (serviceIds.includes("svc-private") && serviceIds.includes("svc-cleaning") && !serviceIds.includes("svc-move-clean")) serviceIds.push("svc-move-clean");
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

const drng = createRng(20261022);
export const partners: Partner[] = rawPartners.map(({ expiresAt, documents: uploaded, ...p }, i) => {
  const doc = (file: string | undefined, status: DocStatus, expires?: string): CompanyDoc | undefined =>
    file ? { file, uploadedAt: p.createdAt, status, ...(expires ? { expiresAt: expires } : {}) } : undefined;
  if (p.status !== "approved") {
    // still applying: what they uploaded waits for Kompass to check it. Of the two with a contract,
    // one has already signed it in the portal; the declined applicant is told why.
    const signed = i === 22;
    return {
      ...p,
      documents: {
        contract: signed ? { file: "contract-signed.pdf", uploadedAt: daysAgo(1), status: "pending_review" } : undefined,
        insurance: doc(uploaded.insurance, "pending_review"),
        register: doc(uploaded.register, "pending_review"),
      },
      ...(signed ? { contractSignedAt: daysAgo(1), contractSignedBy: p.ownerName } : {}),
      ...(p.status === "rejected"
        ? { rejectionReason: "We could not verify your liability insurance and the commercial register extract does not list moving or cleaning services. You are welcome to apply again with both documents." }
        : {}),
    };
  }
  const demo = i === 0; // the demo portal account must be able to buy
  return {
    ...p,
    documents: {
      contract: doc(uploaded.contract, "valid", demo ? daysAhead(220) : expiresAt),
      // one company has uploaded its renewed insurance, which Kompass still has to check
      insurance:
        i === 4
          ? { file: "insurance-2027.pdf", uploadedAt: daysAgo(1), status: "pending_review", expiresAt: daysAhead(365) }
          : doc(uploaded.insurance, "valid", daysAhead(demo ? 140 : drng.int(-20, 380))),
      register: doc(uploaded.register, "valid", daysAhead(demo ? 300 : drng.int(15, 420))),
    },
  };
});

const approved = partners.filter((p) => p.status === "approved" && !p.banned);

/* ---------- offers (leads) ---------- */
// Status hint for offers older than 4 days, drawn by pool position. The positions keep the
// original 15-slot pool's meaning (which slots were still open, which got no buyers) so the main
// RNG stream, and everything generated after it, stays exactly as before. Final statuses are
// derived from the facts once orders exist (sold out = Completed, past deadline = Expired).
const STATUS_POOL: LeadStatus[] = [
  "in_progress", "in_progress", "in_progress", "in_progress", "in_progress", "in_progress", "in_progress",
  "completed", "completed", "completed", "completed", "in_progress", "expired", "cancelled", "cancelled",
];
const OPEN_SLOTS = new Set([0, 1, 2, 3, 4, 5, 6, 11]); // still on sale when generated
const UNSOLD_SLOTS = new Set([0, 1, 2, 13]); // never bought by anyone
const unsold = new Set<string>();
// Second stream for the lifecycle details added later (flags, cancel reasons, sold-out top-ups).
const lrng = createRng(20261020);
const FLAG_POOL: VerificationFlag[] = ["duplicate", "invalid_phone", "invalid_email", "ip_burst"];
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
  const svcId = current(rng.chance(0.55) ? "svc-private" : rng.pick(LEGACY_SERVICES));
  const svc = services.find((x) => x.id === svcId)!;
  // recent offers: auto-checks flag ~1 in 3, which then wait in New for admin review
  const flags: VerificationFlag[] = age < 4 && lrng.chance(0.35) ? lrng.sample(FLAG_POOL, lrng.int(1, 2)) : [];
  const slot = age < 4 ? -1 : rng.int(0, STATUS_POOL.length - 1);
  const status: LeadStatus = slot < 0 ? (flags.length ? "new" : "in_progress") : STATUS_POOL[slot];
  if (slot < 0 || UNSOLD_SLOTS.has(slot)) unsold.add(`KO-${10400 - i}`);
  // open, recent leads move in the future so the partner shop always has stock
  const open = age < 75 && (slot < 0 || OPEN_SLOTS.has(slot));
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
    lang: rng.pick(["de", "de", "de", "en", "fr", "it"] as const),
    ip: ip(),
    device: rng.pick(["desktop", "mobile", "mobile", "tablet"] as const),
    from: { street: `${rng.pick(STREETS)} ${rng.int(1, 99)}`, city: from.city, zip: from.zip, country: "CH", rooms, floor: String(rng.int(0, 6)), elevator: rng.chance(0.6) },
    to: { street: `${rng.pick(STREETS)} ${rng.int(1, 99)}`, city: to.city, zip: to.zip, country: "CH", rooms: rng.pick(["2", "3", "3.5", "4.5", "5"]), floor: String(rng.int(0, 5)), elevator: rng.chance(0.6) },
    executionDate: daysAhead(open ? Math.max(6, lead - Math.round(age / 3)) : -age + lead),
    deadline: daysAhead(open ? Math.max(2, lead - Math.round(age / 3) - 5) : -age + rng.int(5, 12)),
    offersWanted: rng.int(2, 5),
    details: rng.pick(DETAILS),
    active: status !== "cancelled",
    status,
    flags,
    booking: "personal" as BookingType,
    // slot 13 never sold: either side may have cancelled; slot 14 had buyers, so it was found to be fake
    ...(status === "cancelled"
      ? { cancelReason: slot === 14 || lrng.chance(0.5) ? ("fake" as const) : ("customer" as const), cancelledAt: daysAgo(Math.max(0, age - 2)) }
      : {}),
    source: rng.chance(0.93) ? "website" : "admin",
    createdAt: daysAgo(age, -rng.int(0, 12)),
  };
});

/* ---------- orders (leads bought by partners) ---------- */
export const orders: Order[] = [];
offers.forEach((o) => {
  if (unsold.has(o.id)) return;
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
  // a Completed offer is, by definition, sold to every company the customer allowed
  if (o.status === "completed" && buyers.length < o.offersWanted) {
    const extra = lrng.sample(approved.filter((p) => !buyers.includes(p)), o.offersWanted - buyers.length);
    extra.forEach((p) =>
      orders.push({
        id: `ORD-${pad(orders.length + 5001, 5)}`,
        offerId: o.id,
        partnerId: p.id,
        channel: lrng.chance(0.4) ? "shop" : "dynamic",
        price: svc.leadPrice,
        executed: false,
        createdAt: new Date(new Date(o.createdAt).getTime() + lrng.int(30, 60) * 3_600_000).toISOString(),
      }),
    );
  }
});

// Keep every status consistent with the facts: sold out = Completed, past the deadline unsold = Expired.
for (const o of offers) {
  if (o.status === "cancelled" || o.status === "new") continue;
  const sold = orders.filter((x) => x.offerId === o.id).length;
  if (sold >= o.offersWanted) o.status = "completed";
  else if (Date.parse(o.deadline) < NOW) o.status = "expired";
  else if (o.status !== "in_progress") o.status = "in_progress";
}

/* ---------- who booked, which company the customer chose, no-shows ---------- */
const brng = createRng(20261025);
const ORGANIZATIONS = [
  { name: "Pro Senectute Kanton Zürich", email: "umzug@zh.prosenectute.ch", phone: "+41 58 451 51 00" },
  { name: "Caritas Bern", email: "sozialberatung@caritas-bern.ch", phone: "+41 31 378 60 00" },
  { name: "Heilsarmee Basel", email: "basel@heilsarmee.ch", phone: "+41 61 690 70 70" },
  { name: "Stiftung Wohnhilfe Luzern", email: "info@wohnhilfe-luzern.ch", phone: "+41 41 220 15 15" },
];
for (const o of offers) {
  const r = brng.int(0, 99);
  if (r < 10) {
    o.booking = "other";
    const first = brng.pick([...FIRST_F, ...FIRST_M]);
    o.requester = { firstName: first, lastName: o.lastName, email: `${first.toLowerCase()}.${o.lastName.toLowerCase().replace(/ü/g, "ue")}@bluewin.ch`, phone: phone2(brng) };
  } else if (r < 16) {
    o.booking = "organization";
    const org = brng.pick(ORGANIZATIONS);
    const first = brng.pick([...FIRST_F, ...FIRST_M]);
    const last = brng.pick(LAST);
    o.organization = org;
    o.requester = { firstName: first, lastName: last, email: org.email, phone: org.phone };
  }
  // the company that did the job is the one the customer chose
  const done = orders.find((x) => x.offerId === o.id && x.executed);
  if (done) {
    o.chosenPartnerId = done.partnerId;
    o.chosenAt = new Date(Date.parse(done.createdAt) + brng.int(24, 96) * 3_600_000).toISOString();
  }
}
// two customers reported that the company they chose did not come: one open, one solved with a replacement
{
  const candidates = offers.filter((o) => o.status === "in_progress" && orders.filter((x) => x.offerId === o.id).length >= 2);
  candidates.slice(0, 2).forEach((o, i) => {
    const [chosen, other] = orders.filter((x) => x.offerId === o.id);
    // once a replacement confirms, it becomes the company doing the job
    o.chosenPartnerId = i === 0 ? chosen.partnerId : other.partnerId;
    o.chosenAt = daysAgo(4 + i);
    o.noShow =
      i === 0
        ? { partnerId: chosen.partnerId, note: "Nobody came at 8:00 and the phone goes to voicemail.", reportedAt: daysAgo(0, -3), status: "open" }
        : {
            partnerId: chosen.partnerId,
            note: "The team did not arrive on the agreed morning.",
            reportedAt: daysAgo(3),
            status: "resolved",
            replacementPartnerId: other.partnerId,
            companyReason: "Our truck broke down and we failed to call the customer.",
            action: "warning",
            resolvedAt: daysAgo(2),
          };
  });
}

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
  l(
    "Super easy! Got 4 offers within a day and saved almost CHF 600.",
    "Super einfach! Innert eines Tages 4 Offerten erhalten und fast CHF 600 gespart.",
    "Super simple ! J'ai reçu 4 offres en une journée et économisé près de CHF 600.",
    "Facilissimo! Ho ricevuto 4 offerte in un giorno e risparmiato quasi CHF 600.",
  ),
  l(
    "Great overview of companies, the reviews helped a lot.",
    "Toller Überblick über die Firmen, die Bewertungen haben sehr geholfen.",
    "Excellent aperçu des entreprises, les avis m'ont beaucoup aidé.",
    "Ottima panoramica delle aziende, le recensioni mi hanno aiutato molto.",
  ),
  l(
    "Fast, transparent and free. I'd use Kompass again.",
    "Schnell, transparent und kostenlos. Ich würde Kompass wieder nutzen.",
    "Rapide, transparent et gratuit. J'utiliserais Kompass à nouveau.",
    "Veloce, trasparente e gratuito. Userei di nuovo Kompass.",
  ),
  l(
    "The form was quick and the movers were excellent.",
    "Das Formular war schnell ausgefüllt und das Umzugsteam war hervorragend.",
    "Le formulaire était rapide et les déménageurs excellents.",
    "Il modulo è stato veloce e i traslocatori eccellenti.",
  ),
  l(
    "Good service, but one company called a bit too often.",
    "Guter Service, aber eine Firma hat etwas zu oft angerufen.",
    "Bon service, mais une entreprise a appelé un peu trop souvent.",
    "Buon servizio, ma un'azienda ha chiamato un po' troppo spesso.",
  ),
  l(
    "Helpful support team when I had to change my date.",
    "Hilfsbereites Support-Team, als ich meinen Termin ändern musste.",
    "Équipe d'assistance serviable quand j'ai dû changer ma date.",
    "Team di assistenza disponibile quando ho dovuto cambiare la data.",
  ),
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

{
  const used = new Set<string>();
  for (const r of reviews) {
    if (r.target === "kompass") continue;
    const o = offers.find((x) => x.status === "completed" && !x.noShow && x.chosenPartnerId === r.target && !used.has(x.id));
    if (o) {
      used.add(o.id);
      r.offerId = o.id;
    }
  }
}

/** Translations of the seeded Kompass reviews (stored in English as customers wrote them). */
export const KOMPASS_REVIEW_L10N: Record<string, L10n> = Object.fromEntries(
  KOMPASS_COMMENTS.map((c, i) => [`RV-K${i + 1}`, c]),
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

/* ---------- (retired) complaints ---------- */
// Complaints were removed from the product. Their generator made these RNG draws; keep making them so
// every record generated after this point (contacts, questions, visitors…) stays exactly the same.
for (let i = 0; i < 11; i++) {
  rng.pick(approved);
  rng.pick(offers.slice(0, 60));
  rng.pick([...FIRST_F, ...FIRST_M]);
  rng.pick(LAST);
  phone();
  rng.pick([0, 1, 2, 3, 4]);
  if (i >= 4) rng.chance(0.6);
  rng.int(0, 3);
}

/* ---------- coupons ---------- */
export const coupons: Coupon[] = [
  { id: "cp-1", code: "WELCOME20", serviceId: "all", type: "percent", discount: 20, used: 31, usageLimit: 100, multiUse: false, active: true, startDate: daysAgo(90), endDate: daysAhead(60) },
  { id: "cp-2", code: "CLEAN10", serviceId: "svc-cleaning", type: "fixed", discount: 10, used: 12, usageLimit: 50, multiUse: true, active: true, startDate: daysAgo(30), endDate: daysAhead(30) },
  { id: "cp-3", code: "MOVECLEAN25", serviceId: "svc-move-clean", type: "percent", discount: 25, used: 4, usageLimit: 20, multiUse: false, active: true, startDate: daysAgo(10), endDate: daysAhead(80) },
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
    lang: rng.pick(["de", "de", "en", "fr", "it"]),
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
  {
    id: "n-1",
    kind: "lead",
    title: l(
      `New lead ${offers[0].id} · ${offers[0].from.city}`,
      `Neuer Lead ${offers[0].id} · ${offers[0].from.city}`,
      `Nouveau lead ${offers[0].id} · ${offers[0].from.city}`,
      `Nuovo lead ${offers[0].id} · ${offers[0].from.city}`,
    ),
    href: `/admin/leads/${offers[0].id}`,
    read: false,
    createdAt: offers[0].createdAt,
  },
  {
    id: "n-2",
    kind: "application",
    title: l(
      "New partner application: Fix&Fertig Räumungen",
      "Neue Partnerbewerbung: Fix&Fertig Räumungen",
      "Nouvelle candidature de partenaire : Fix&Fertig Räumungen",
      "Nuova candidatura partner: Fix&Fertig Räumungen",
    ),
    href: "/admin/partners/applications",
    read: false,
    createdAt: daysAgo(0, -3),
  },
  {
    id: "n-3",
    kind: "due",
    title: l(
      "6 payment receipts waiting for approval",
      "6 Zahlungsbelege warten auf Freigabe",
      "6 justificatifs de paiement en attente d'approbation",
      "6 ricevute di pagamento in attesa di approvazione",
    ),
    href: "/admin/finance/partner-dues",
    read: false,
    createdAt: daysAgo(1),
  },
  {
    id: "n-4",
    kind: "report",
    title: l(
      "Fake-lead report FR-101 opened",
      "Meldung zu gefälschtem Lead FR-101 eröffnet",
      "Signalement de faux lead FR-101 ouvert",
      "Segnalazione di lead falso FR-101 aperta",
    ),
    href: "/admin/leads/fake-reports",
    read: true,
    createdAt: daysAgo(2),
  },
  {
    id: "n-5",
    kind: "contact",
    title: l(
      "Customer request waiting more than 24 hours",
      "Kundenanfrage wartet seit über 24 Stunden",
      "Demande client en attente depuis plus de 24 heures",
      "Richiesta cliente in attesa da più di 24 ore",
    ),
    href: "/admin/inbox",
    read: true,
    createdAt: daysAgo(3),
  },
];

/* ---------- company refunds ---------- */
// Own RNG stream so adding refunds doesn't shift any of the data generated above.
const rrng = createRng(20261019);
const orderById = Object.fromEntries(orders.map((o) => [o.id, o]));
export const refunds: Refund[] = [
  // every confirmed fake-lead report was refunded to the partner wallet
  ...fakeReports
    .filter((r) => r.status === "confirmed")
    .map((r, i) => {
      const o = orderById[r.orderId];
      return {
        id: `RF-${pad(i + 1, 3)}`,
        partnerId: o.partnerId,
        amount: o.price,
        reason: "fake_lead" as const,
        orderId: o.id,
        note: r.reason,
        status: "refunded" as const,
        createdAt: r.createdAt,
        decidedAt: r.createdAt,
      };
    }),
  // offers cancelled as fake after companies bought them: every buyer got the price back
  ...offers
    .filter((o) => o.status === "cancelled" && o.cancelReason === "fake")
    .flatMap((o) => orders.filter((x) => x.offerId === o.id && !fakeReports.some((r) => r.orderId === x.id && r.status === "confirmed")))
    .map((x, i) => ({
      id: `RF-${pad(i + 101, 3)}`,
      partnerId: x.partnerId,
      amount: x.price,
      reason: "fake_lead" as const,
      orderId: x.id,
      note: "Offer cancelled as fake by Kompass.",
      status: "refunded" as const,
      createdAt: offers.find((o) => o.id === x.offerId)!.cancelledAt!,
      decidedAt: offers.find((o) => o.id === x.offerId)!.cancelledAt!,
    })),
  // claims still waiting: the company reported the lead as fake and Kompass is still checking
  ...fakeReports
    .filter((r) => r.status === "pending")
    .map((r, i) => {
      const o = orderById[r.orderId];
      return {
        id: `RF-${pad(i + 21, 3)}`,
        partnerId: o.partnerId,
        amount: o.price,
        reason: "fake_lead" as const,
        orderId: o.id,
        note: r.reason,
        status: "pending" as const,
        createdAt: r.createdAt,
      };
    }),
  ...(
    [
      // the customer was real and cancelled: policy says no refund
      ["fake_lead", "rejected", "Customer cancelled after our site visit.", true],
      // admin exceptions, each with its reason written down
      ["manual", "refunded", "Compensation for the shop outage on 2 October.", false],
      ["manual", "refunded", "Coupon WELCOME20 was not applied at checkout.", true],
    ] as const
  ).map(([reason, status, note, withOrder], i) => {
    const o = rrng.pick(orders);
    const age = rrng.int(1, 40);
    return {
      id: `RF-${pad(i + 41, 3)}`,
      partnerId: o.partnerId,
      amount: withOrder ? (reason === "manual" ? Math.round(o.price * 0.2) : o.price) : 50,
      reason,
      orderId: withOrder ? o.id : undefined,
      note,
      status,
      createdAt: daysAgo(age),
      decidedAt: daysAgo(Math.max(0, age - rrng.int(1, 3))),
    };
  }),
];

/* ---------- wallet top-ups & credit invoices ---------- */
// Own stream again, so none of the data above moves.
const wrng = createRng(20261021);
const ADMINS = ["u-1", "u-3"];
export const topups: WalletTopup[] = [];
export const invoices: Invoice[] = [];

// online card / TWINT payments made in the portal, and payments recorded by the finance team
approved.slice(0, 14).forEach((p, i) => {
  const online = i % 2 === 0;
  const age = wrng.int(2, 70);
  topups.push({
    id: `TU-${pad(topups.length + 1, 4)}`,
    partnerId: p.id,
    amount: wrng.pick([100, 150, 200, 300, 500]),
    method: online ? "online" : "admin",
    payMethod: online ? wrng.pick(["card", "twint"] as const) : wrng.pick(["bank_transfer", "cash"] as const),
    reference: online ? `PAY-${wrng.int(100000, 999999)}` : `BANK-${wrng.int(1000, 9999)}`,
    note: online ? "" : "Payment received on the Kompass account.",
    byUserId: online ? undefined : wrng.pick(ADMINS),
    createdAt: daysAgo(age),
  });
});

// credit: amount now, invoice to pay later. One paid, two still due (one of them overdue).
(
  [
    [300, 50, 30, "paid"],
    [250, 12, 30, "due"],
    [400, 41, 30, "due"],
  ] as const
).forEach(([amount, age, term, status], i) => {
  const p = approved[(i * 5 + 2) % approved.length];
  const topupId = `TU-${pad(topups.length + 1, 4)}`;
  const invoiceId = `INV-2026-${pad(i + 31, 4)}`;
  topups.push({
    id: topupId,
    partnerId: p.id,
    amount,
    method: "credit",
    reference: invoiceId,
    note: "Agreed credit for the busy season.",
    byUserId: ADMINS[i % 2],
    invoiceId,
    createdAt: daysAgo(age),
  });
  invoices.push({
    id: invoiceId,
    partnerId: p.id,
    topupId,
    amount,
    status,
    issuedAt: daysAgo(age),
    dueAt: daysAgo(age - term),
    ...(status === "paid" ? { paidAt: daysAgo(age - 21), paidMethod: "bank_transfer" as const, paidReference: `BANK-${wrng.int(1000, 9999)}` } : {}),
  });
});

// Wallet balances must equal their ledger. Money in before the history above (first deposits)
// becomes an opening balance recorded by admin, so every franc is accounted for.
for (const p of partners) {
  const moved =
    dues.filter((d) => d.partnerId === p.id && d.status === "confirmed").reduce((a, d) => a + d.amount, 0) +
    topups.filter((x) => x.partnerId === p.id).reduce((a, x) => a + x.amount, 0) +
    refunds.filter((r) => r.partnerId === p.id && r.status === "refunded").reduce((a, r) => a + r.amount, 0) -
    orders.filter((o) => o.partnerId === p.id).reduce((a, o) => a + o.price, 0);
  const opening = p.wallet - moved;
  if (opening > 0) {
    topups.push({
      id: `TU-${pad(topups.length + 1, 4)}`,
      partnerId: p.id,
      amount: opening,
      method: "admin",
      payMethod: "bank_transfer",
      reference: "OPENING",
      note: "Opening balance carried over from the previous system.",
      byUserId: "u-1",
      createdAt: new Date(Date.parse(p.createdAt) + DAY).toISOString(),
    });
  } else if (opening < 0) {
    p.wallet = moved > 0 ? moved : 0;
    if (moved < 0)
      topups.push({
        id: `TU-${pad(topups.length + 1, 4)}`,
        partnerId: p.id,
        amount: -moved,
        method: "admin",
        payMethod: "bank_transfer",
        reference: "OPENING",
        note: "Opening balance carried over from the previous system.",
        byUserId: "u-1",
        createdAt: new Date(Date.parse(p.createdAt) + DAY).toISOString(),
      });
  }
}

/* ---------- company files, messages, regional nominations ---------- */
const frng = createRng(20261023);
const PHOTOS = ["/images/hero.png", "/images/companies.png", "/images/start-now.png", "/images/about-hero.png"];
// a simple monogram logo per company, so profiles don't all show the Kompass mark
const LOGO_HUES = [212, 152, 12, 268, 32, 188, 336, 96];
const monogram = (name: string, i: number) => {
  const letters = name.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="hsl(${LOGO_HUES[i % LOGO_HUES.length]} 62% 38%)"/><path d="M18 70h60" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/><text x="48" y="58" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">${letters}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
export const files: CompanyFile[] = approved.slice(0, 12).flatMap((p, i) => [
  { id: `F-${pad(i * 3 + 1, 4)}`, partnerId: p.id, name: "logo.svg", category: "logo" as const, url: monogram(p.name, i), size: frng.int(8, 40) * 1024, uploadedBy: "company" as const, uploadedAt: daysAgo(frng.int(30, 200)) },
  { id: `F-${pad(i * 3 + 2, 4)}`, partnerId: p.id, name: "team-truck.jpg", category: "photo" as const, url: frng.pick(PHOTOS), size: frng.int(300, 1400) * 1024, uploadedBy: "company" as const, uploadedAt: daysAgo(frng.int(10, 150)) },
  ...(i % 3 === 0
    ? [{ id: `F-${pad(i * 3 + 3, 4)}`, partnerId: p.id, name: "price-list-2026.pdf", category: "document" as const, url: "#", size: frng.int(80, 400) * 1024, uploadedBy: "admin" as const, uploadedAt: daysAgo(frng.int(5, 60)) }]
    : []),
]);

// conversations: the first message of each thread is its root (threadId = id)
export const messages: CompanyMessage[] = [
  { id: "MSG-0001", threadId: "MSG-0001", from: "kompass", topic: "general", partnerId: "p-001", subject: "Welcome to the new partner portal", body: "Your wallet, invoices and documents are now all in one place. Reply here if anything looks wrong.", channel: "email", byUserId: "u-1", createdAt: daysAgo(6), readAt: daysAgo(5) },
  { id: "MSG-0003", threadId: "MSG-0001", from: "company", topic: "general", partnerId: "p-001", subject: "Welcome to the new partner portal", body: "Thank you! Can we get leads from canton Zug as well? We often work there.", channel: "portal", createdAt: daysAgo(5, 2), readAt: daysAgo(5, 4) },
  { id: "MSG-0004", threadId: "MSG-0001", from: "kompass", topic: "general", partnerId: "p-001", subject: "Welcome to the new partner portal", body: "Of course. Add Zug under Company profile › Service area and the shop will show its leads.", channel: "portal", byUserId: "u-1", createdAt: daysAgo(5, 5), readAt: daysAgo(4) },
  { id: "MSG-0002", threadId: "MSG-0002", from: "kompass", topic: "documents", partnerId: "p-001", subject: "Insurance renewal", body: "Your liability insurance runs out in a few months. Please upload the renewed certificate in your profile when you have it.", channel: "portal", byUserId: "u-3", createdAt: daysAgo(2) },
  { id: "MSG-0005", threadId: "MSG-0005", from: "company", topic: "billing", partnerId: "p-003", subject: "Payout of our balance", body: "We are pausing for the winter. Could you pay out what is left in our wallet?", channel: "portal", createdAt: daysAgo(1, 3) },
];

/* ---------- payouts ---------- */
export const payouts: Payout[] = [
  { id: "PO-0001", partnerId: "p-001", amount: 200, iban: partners[0].bank.iban, status: "paid", reference: "UBS-7781-2209", byUserId: "u-1", createdAt: daysAgo(34), decidedAt: daysAgo(32) },
  { id: "PO-0002", partnerId: "p-003", amount: Math.max(50, partners[2].wallet - (partners[2].wallet % 10)), iban: partners[2].bank.iban, status: "requested", createdAt: daysAgo(1, 3) },
  { id: "PO-0003", partnerId: "p-006", amount: 150, iban: partners[5].bank.iban, status: "rejected", reference: "Open credit invoice must be paid first.", byUserId: "u-3", createdAt: daysAgo(12), decidedAt: daysAgo(11) },
];

// an urgent request admin assigned to the demo company by phone, with the agreed price and a note
{
  const offerById = new Map(offers.map((o) => [o.id, o]));
  const urgent = orders.find((o) => o.partnerId === "p-001" && !o.executed && offerById.get(o.offerId)?.status === "in_progress" && !offerById.get(o.offerId)?.chosenPartnerId);
  if (urgent) Object.assign(urgent, { channel: "manual", note: "Urgent: the customer needs a quote by Friday. Please call them today." });
}

// priority companies per canton chosen by admin (first one is offered new leads there first)
export const nominations: Nomination[] = [
  { canton: "ZH", partnerIds: approved.filter((p) => p.canton === "ZH").slice(0, 2).map((p) => p.id) },
  { canton: "BE", partnerIds: approved.filter((p) => p.canton === "BE").slice(0, 1).map((p) => p.id) },
].filter((n) => n.partnerIds.length);

/* ---------- offer-form sessions & contact follow-up ---------- */
const srng = createRng(20261024);
const STEPS_ABANDONED: FormSession["step"][] = ["started", "started", "started", "details", "details", "details", "contact", "contact"];
const minutes = (iso: string, m: number) => new Date(Date.parse(iso) + m * 60_000).toISOString();

export const formSessions: FormSession[] = [
  // every website offer went through the form
  ...offers
    .filter((o) => o.source === "website")
    .map((o, i) => {
      const startedAt = minutes(o.createdAt, -srng.int(3, 18));
      return {
        id: `FS-${pad(i + 1, 4)}`,
        step: "submitted" as const,
        serviceId: o.serviceId,
        name: `${o.firstName} ${o.lastName}`,
        email: o.email,
        phone: o.phone,
        offerId: o.id,
        device: o.device,
        startedAt,
        updatedAt: o.createdAt,
      };
    }),
  // visitors who started the form and left before submitting (a few very recent ones left contact details)
  ...Array.from({ length: 240 }, (_, i) => {
    const recent = i < 14;
    const step = recent && i % 2 === 0 ? ("contact" as const) : srng.pick(STEPS_ABANDONED);
    const startedAt = daysAgo(recent ? srng.int(0, 9) : srng.int(0, 360), -srng.int(0, 14));
    const first = srng.pick([...FIRST_F, ...FIRST_M]);
    const last = srng.pick(LAST);
    const withContact = step === "contact";
    return {
      id: `FS-${pad(i + 501, 4)}`,
      step,
      serviceId: srng.chance(0.85) ? current(srng.pick(LEGACY_SERVICES)) : undefined,
      ...(withContact
        ? { name: `${first} ${last}`, email: `${first.toLowerCase()}.${last.toLowerCase().replace(/ü/g, "ue")}@${srng.pick(["gmail.com", "bluewin.ch", "gmx.ch"])}`, phone: phone2(srng) }
        : {}),
      device: srng.pick(["desktop", "mobile", "mobile", "tablet"] as const),
      startedAt,
      updatedAt: minutes(startedAt, srng.int(1, step === "started" ? 3 : 12)),
    };
  }),
];
function phone2(r: ReturnType<typeof createRng>) {
  return `+41 7${r.int(5, 9)} ${r.int(100, 999)} ${pad(r.int(0, 99))} ${pad(r.int(0, 99))}`;
}

// Contact Us requests: most were answered within hours; a few have been waiting longer than 24 hours.
contacts.forEach((c, i) => {
  const ageHours = (NOW - Date.parse(c.createdAt)) / 3_600_000;
  if (ageHours > 24 && i % 5 !== 1) c.handledAt = minutes(c.createdAt, srng.int(30, 20 * 60));
});

/** Website visitors on one day (YYYY-MM-DD), deterministic so any month or year can be summed. */
export function visitorsOnDay(day: string) {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const r = createRng(h);
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return (weekday === 0 || weekday === 6 ? 340 : 520) + r.int(-80, 160);
}
