import type { Offer, Service } from "./types";

/**
 * What kind of job a service is. It decides which questions the request form asks and how the
 * request is shown to the team and the companies. Admin picks it when adding a service.
 */
export type JobKind = "move" | "moveClean" | "cleaning" | "piano" | "storage" | "disposal";
export const JOB_KINDS: readonly JobKind[] = ["move", "moveClean", "cleaning", "piano", "storage", "disposal"];

export type JobExtra =
  | "packing"
  | "assembly"
  | "heavyItems"
  | "parkingPermit"
  | "handoverGuarantee"
  | "windows"
  | "balcony"
  | "cellarAttic"
  | "appliances"
  | "broomClean";
export type PropertyType = "flat" | "house" | "office";
export type CleaningType = "endOfTenancy" | "deepClean" | "regular";
export type Instrument = "upright" | "grand" | "digital";
export type JobAmount = "fewItems" | "boxes" | "oneRoom" | "rooms" | "home";
export type StorageDuration = "under1" | "1to3" | "3to6" | "6to12" | "over12" | "unsure";
export type DisposalItem = "furniture" | "household" | "electronics" | "garden";

/** The job-specific answers of a request (only the ones its service asks for are set). */
export interface JobDetails {
  /** The customer can move the date by a few days. */
  flexibleDate?: boolean;
  /** Moving & Cleaning: the cleaning / handover day, on or after the moving day. */
  cleaningDate?: string;
  propertyType?: PropertyType;
  areaM2?: number;
  cleaningType?: CleaningType;
  instrument?: Instrument;
  amount?: JobAmount;
  duration?: StorageDuration;
  items?: DisposalItem[];
  extras?: JobExtra[];
}

/** Which questions each kind of job asks. */
export interface JobForm {
  /** Two places (from → to). Otherwise a single address. */
  to: boolean;
  /** Number of rooms at each address (for moving the home's size). */
  rooms: boolean;
  /** The property to clean: type, rooms and living area. */
  property?: boolean;
  flexible?: boolean;
  cleaningDate?: boolean;
  cleaningType?: boolean;
  instrument?: boolean;
  amounts?: JobAmount[];
  duration?: boolean;
  items?: boolean;
  extras: JobExtra[];
}

export const JOB_FORMS: Record<JobKind, JobForm> = {
  move: { to: true, rooms: true, flexible: true, extras: ["packing", "assembly", "heavyItems", "parkingPermit"] },
  moveClean: { to: true, rooms: true, flexible: true, cleaningDate: true, extras: ["packing", "assembly", "handoverGuarantee", "windows"] },
  cleaning: { to: false, rooms: false, property: true, cleaningType: true, extras: ["windows", "balcony", "cellarAttic", "appliances"] },
  piano: { to: true, rooms: false, instrument: true, extras: [] },
  storage: { to: false, rooms: false, amounts: ["boxes", "oneRoom", "rooms", "home"], duration: true, extras: ["packing"] },
  disposal: { to: false, rooms: false, items: true, amounts: ["fewItems", "oneRoom", "rooms", "home"], extras: ["cellarAttic", "broomClean"] },
};

export const PROPERTY_TYPES: readonly PropertyType[] = ["flat", "house", "office"];
export const CLEANING_TYPES: readonly CleaningType[] = ["endOfTenancy", "deepClean", "regular"];
export const INSTRUMENTS: readonly Instrument[] = ["upright", "grand", "digital"];
export const DURATIONS: readonly StorageDuration[] = ["under1", "1to3", "3to6", "6to12", "over12", "unsure"];
export const DISPOSAL_ITEMS: readonly DisposalItem[] = ["furniture", "household", "electronics", "garden"];

export const jobKind = (svc?: Pick<Service, "kind"> | null): JobKind => svc?.kind ?? "move";

/** "Zürich → Bern" for jobs between two places, "Zürich" for jobs at one address. */
export const routeText = (o: Pick<Offer, "from" | "to">) => (o.to ? `${o.from.city} → ${o.to.city}` : o.from.city);
/** Same with postcodes, e.g. for tooltips. */
export const routeFull = (o: Pick<Offer, "from" | "to">) =>
  o.to ? `${o.from.zip} ${o.from.city} → ${o.to.zip} ${o.to.city}` : `${o.from.zip} ${o.from.city}`;
