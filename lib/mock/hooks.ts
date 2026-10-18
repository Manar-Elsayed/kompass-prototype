"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import type { L10n, Lang, Permission } from "@/lib/types";
import { useStore } from "./store";

// On the server there is no storage, so the persist API is not attached.
const persistApi = () => (useStore as typeof useStore & { persist?: typeof useStore.persist }).persist;

/** Rehydrate the persisted store once on the client. */
export function useStoreHydration() {
  useEffect(() => {
    const api = persistApi();
    if (api && !api.hasHydrated()) void api.rehydrate();
  }, []);
}

/** True once localStorage state has been applied (always false during SSR). */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    const api = persistApi();
    if (!api || api.hasHydrated()) {
      setH(true);
      return;
    }
    return api.onFinishHydration(() => setH(true));
  }, []);
  return h;
}

/** Translate a bilingual value to the current locale. */
export function useL() {
  const locale = useLocale() as Lang;
  return useMemo(() => (v: L10n | undefined) => (v ? v[locale] || v.en : ""), [locale]);
}

export function useLang() {
  return useLocale() as Lang;
}

/* ---------- selectors ---------- */

export function useServiceMap() {
  const services = useStore((s) => s.services);
  return useMemo(() => Object.fromEntries(services.map((x) => [x.id, x])), [services]);
}

export function usePartnerMap() {
  const partners = useStore((s) => s.partners);
  return useMemo(() => Object.fromEntries(partners.map((x) => [x.id, x])), [partners]);
}

export function usePartnerRatings() {
  const reviews = useStore((s) => s.reviews);
  return useMemo(() => {
    const acc: Record<string, { sum: number; count: number }> = {};
    for (const r of reviews) {
      if (r.target === "kompass" || r.status !== "approved") continue;
      acc[r.target] ??= { sum: 0, count: 0 };
      acc[r.target].sum += r.stars;
      acc[r.target].count += 1;
    }
    return Object.fromEntries(
      Object.entries(acc).map(([k, v]) => [k, { avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count }]),
    ) as Record<string, { avg: number; count: number }>;
  }, [reviews]);
}

export function useCurrentUser() {
  return useStore(
    useShallow((s) => {
      const user = s.session ? s.users.find((u) => u.id === s.session!.userId) : undefined;
      const role = user ? s.roles.find((r) => r.id === user.roleId) : undefined;
      return { user, role };
    }),
  );
}

/** The partner signed in to the portal (if any). */
export function useCurrentPartner() {
  return useStore((s) => (s.partnerSession ? s.partners.find((p) => p.id === s.partnerSession!.partnerId) : undefined));
}

export function useCan() {
  const { role } = useCurrentUser();
  return (p: Permission) => !!role?.permissions.includes(p);
}
