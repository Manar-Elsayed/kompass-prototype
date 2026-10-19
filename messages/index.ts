/**
 * UI copy lives in `defs/*` as [English, Arabic] pairs so both languages are
 * edited side by side and can never drift apart. German, French and Italian
 * live in `de/*`, `fr/*` and `it/*`, typed against the same definitions so a
 * missing or extra key fails the type check. This builds the per-locale
 * message objects that next-intl expects.
 */
import { common } from "./defs/common";
import { site } from "./defs/site";
import { admin } from "./defs/admin";
import { hub } from "./defs/hub";
import { portal } from "./defs/portal";
import { de } from "./de";
import { fr } from "./fr";
import { it } from "./it";
import type { Built, Pair, Tree } from "./types";

function pick<T extends Tree>(tree: T, i: 0 | 1): Built<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(tree)) {
    out[k] = Array.isArray(v) ? (v as Pair)[i] : pick(v as Tree, i);
  }
  return out as Built<T>;
}

const all = { common, site, admin, hub, portal } as const;

export type Messages = Built<typeof all>;

export const messages: Record<"en" | "de" | "fr" | "it" | "ar", Messages> = {
  en: pick(all, 0),
  de,
  fr,
  it,
  ar: pick(all, 1),
};
