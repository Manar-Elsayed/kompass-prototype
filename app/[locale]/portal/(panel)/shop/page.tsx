"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search, SearchX } from "lucide-react";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL } from "@/lib/mock/hooks";
import { availableLeads, CANTONS, isExpiringSoon, partnerCantons, refNow, takesOffersFor } from "@/lib/mock/selectors";
import { DAY } from "@/lib/mock/seed";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";
import { LeadCard } from "@/components/portal/lead-card";
import { LowBalanceBanner } from "@/components/portal/low-balance";
import { useCanBuy } from "@/components/portal/shell";
import { CITIES } from "@/lib/mock/seed";

/**
 * Quick views over the shop. All: everything, newest first. Newest: posted in the last 7 days.
 * Closing soon: 1–2 slots left. Expiring soon: the customer's deadline is close (the card's red badge).
 * Discounts: Kompass lowered the price to sell the last slots (the card shows the old and new price).
 */
const VIEWS = ["all", "newest", "closing", "expiring", "discounts"] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABEL: Record<View, string> = { all: "viewAll", newest: "viewNewest", closing: "viewClosing", expiring: "viewExpiring", discounts: "viewDiscounts" };

export default function LeadShop() {
  const t = useTranslations("portal.shop");
  const L = useL();
  const partner = useCurrentPartner()!;
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const services = useStore((s) => s.services);
  const canBuy = useCanBuy();
  const tsh = useTranslations("portal.shell");
  const [svc, setSvc] = useState("all");
  const [pickedCanton, setCanton] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");

  const all = useMemo(() => availableLeads({ offers, orders }, partner), [offers, orders, partner]);
  const cantonOf = (zip: string) => CITIES.find((c) => c.zip === zip)?.canton ?? "";
  const cantons = [...new Set(all.map((x) => cantonOf(x.offer.from.zip)).filter(Boolean))].sort();
  // "my area" = the cantons the company set in its profile (moves starting or ending there)
  const area = partnerCantons(partner);
  const inArea = (x: (typeof all)[number]) => area.includes(cantonOf(x.offer.from.zip)) || (!!x.offer.to && area.includes(cantonOf(x.offer.to.zip)));
  // start on "my area" when it has leads, otherwise show everything rather than an empty shop
  const canton = pickedCanton ?? (all.some(inArea) ? "mine" : "all");

  const now = refNow();
  const left = (x: (typeof all)[number]) => x.offer.offersWanted - x.sold;
  const inView = (x: (typeof all)[number]) => {
    if (view === "newest") return now - Date.parse(x.offer.createdAt) <= 7 * DAY;
    if (view === "closing") return left(x) <= 2;
    if (view === "expiring") return isExpiringSoon(x.offer);
    if (view === "discounts") return !!x.offer.discount;
    return true;
  };

  const term = q.trim().toLowerCase();
  const list = all
    .filter((x) => !term || [x.offer.id, x.offer.from.city, x.offer.from.zip, x.offer.to?.city ?? "", x.offer.to?.zip ?? ""].some((v) => v.toLowerCase().includes(term)))
    .filter((x) => svc === "all" || x.offer.serviceId === svc)
    .filter((x) => canton === "all" || (canton === "mine" ? inArea(x) : cantonOf(x.offer.from.zip) === canton))
    .filter(inView)
    .sort((a, b) => {
      // the soonest to go first: fewest slots, or the nearest deadline; otherwise newest first
      if (view === "closing") return left(a) - left(b) || b.offer.createdAt.localeCompare(a.offer.createdAt);
      if (view === "expiring") return a.offer.deadline.localeCompare(b.offer.deadline);
      return b.offer.createdAt.localeCompare(a.offer.createdAt);
    });

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <LowBalanceBanner />
      <Card className="mb-2 flex flex-wrap items-center gap-2 p-3">
        <div className="relative w-full sm:min-w-48 sm:flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} className="ps-9" />
        </div>
        <div className="w-full sm:w-auto sm:min-w-44">
          <Select value={svc} onValueChange={setSvc} options={[{ value: "all", label: t("allServices") }, ...services.filter((s) => takesOffersFor(partner, s.id)).map((s) => ({ value: s.id, label: L(s.name) }))]} />
        </div>
        <div className="w-full sm:w-auto sm:min-w-44">
          <Select value={canton} onValueChange={setCanton} options={[{ value: "mine", label: t("myArea", { cantons: area.join(", ") }) }, { value: "all", label: t("allCantons") }, ...cantons.map((c) => ({ value: c, label: `${c} · ${CANTONS[c] ?? c}` }))]} />
        </div>
        <div className="w-full sm:w-auto sm:min-w-40">
          <Select value={view} onValueChange={(v) => setView(v as View)} options={VIEWS.map((v) => ({ value: v, label: t(VIEW_LABEL[v]) }))} />
        </div>
      </Card>
      <p className="mb-4 px-1 text-sm text-muted-foreground">{t("count", { count: list.length })}</p>
      {!canBuy && !partner.banned && (
        <p className="mb-4 rounded-lg bg-danger-soft/50 px-3 py-2 text-sm font-medium text-danger">
          {t("documents")} <Link href="/portal/profile?tab=documents" className="underline underline-offset-2">{tsh("updateDocs")}</Link>
        </p>
      )}
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((x) => (
            <LeadCard key={x.offer.id} offer={x.offer} sold={x.sold} canBuy={canBuy} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<SearchX />}
            title={t("empty")}
            body={canton === "mine" ? t("emptyArea") : t("emptyHint")}
            action={canton === "mine" && all.length > 0 ? <Button variant="outline" size="sm" onClick={() => setCanton("all")}>{t("showAll", { count: all.length })}</Button> : undefined}
          />
        </Card>
      )}
    </>
  );
}
