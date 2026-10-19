/** Shared shapes for the English definitions in `defs/*` and the per-locale files. */
export type Tree = { readonly [k: string]: string | Tree };
/** The plain-string message tree a definition describes — what each locale file must match. */
export type Built<T> = { [K in keyof T]: T[K] extends string ? string : Built<T[K]> };
