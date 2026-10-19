/**
 * UI copy: English lives in `defs/*` and is the source of truth. German,
 * French and Italian live in `de/*`, `fr/*` and `it/*`, typed against the same
 * definitions so a missing or extra key fails the type check. This builds the
 * per-locale message objects that next-intl expects.
 */
import { common } from "./defs/common";
import { site } from "./defs/site";
import { admin } from "./defs/admin";
import { hub } from "./defs/hub";
import { portal } from "./defs/portal";
import { de } from "./de";
import { fr } from "./fr";
import { it } from "./it";
import type { Built } from "./types";

const all = { common, site, admin, hub, portal } as const;

export type Messages = Built<typeof all>;

export const messages: Record<"en" | "de" | "fr" | "it", Messages> = {
  en: all,
  de,
  fr,
  it,
};
