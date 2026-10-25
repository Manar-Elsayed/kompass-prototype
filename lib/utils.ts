import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LANGS, type L10n } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The same text in every language — for new records and free-text fields entered once. */
export const l10n = (text = ""): L10n => ({ en: text, de: text, fr: text, it: text });

/** Fill the languages left blank with the English text. */
export const withFallback = (v: L10n): L10n =>
  Object.fromEntries(LANGS.map((l) => [l, v[l]?.trim() ? v[l] : v.en])) as L10n;

/** BCP 47 tag for date formatting per UI locale (Swiss variants for the national languages). */
export function intlLocale(locale: string) {
  return ({ de: "de-CH", fr: "fr-CH", it: "it-CH" } as Record<string, string>)[locale] ?? "en-GB";
}

/** Swiss grouping (CHF 1’450) in every language: fr-CH/it-CH grouping differs between Node and browser ICU builds, which would break hydration. */
/** Swiss francs, whole by default; documents such as invoices pass 2 decimals for the VAT. */
export function formatCHF(value: number, _locale = "en", decimals = 0) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number, locale = "en") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "de-CH").format(value);
}

export function formatDate(
  iso: string,
  locale = "en",
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
) {
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(new Date(iso));
}

export function formatDateTime(iso: string, locale = "en") {
  return formatDate(iso, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative time from the prototype's fixed "now" so SSR and client match. */
export function timeAgo(iso: string, locale = "en", now = Date.now()) {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
