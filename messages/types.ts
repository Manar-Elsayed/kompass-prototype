/** Shared shapes for the message definitions in `defs/*` and the per-locale files. */
export type Pair = readonly [string, string];
export type Tree = { readonly [k: string]: Pair | Tree };
/** The plain-string message tree a definition builds into — what each locale file must match. */
export type Built<T> = { [K in keyof T]: T[K] extends Pair ? string : Built<T[K]> };
