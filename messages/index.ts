/**
 * UI copy lives in `defs/*` as [English, Arabic] pairs so both languages are
 * edited side by side and can never drift apart. This builds the per-locale
 * message objects that next-intl expects.
 */
import { common } from "./defs/common";
import { site } from "./defs/site";
import { admin } from "./defs/admin";
import { hub } from "./defs/hub";
import { portal } from "./defs/portal";

type Pair = readonly [string, string];
type Tree = { readonly [k: string]: Pair | Tree };
type Built<T> = { [K in keyof T]: T[K] extends Pair ? string : Built<T[K]> };

function pick<T extends Tree>(tree: T, i: 0 | 1): Built<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(tree)) {
    out[k] = Array.isArray(v) ? (v as Pair)[i] : pick(v as Tree, i);
  }
  return out as Built<T>;
}

const all = { common, site, admin, hub, portal } as const;

export const messages = {
  en: pick(all, 0),
  ar: pick(all, 1),
};

export type Messages = (typeof messages)["en"];
