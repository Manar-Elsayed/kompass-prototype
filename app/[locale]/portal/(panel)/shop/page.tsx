"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search, SearchX } from "lucide-react";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL } from "@/lib/mock/hooks";
import { availableLeads, CANTONS, partnerCantons, takesOffersFor } from "@/lib/mock/selectors";
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
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");

  const all = useMemo(() => availableLeads({ offers, orders }, partner), [offers, orders, partner]);
  const cantonOf = (zip: string) => CITIES.find((c) => c.zip === zip)?.canton ?? "";
  const cantons = [...new Set(all.map((x) => cantonOf(x.offer.from.zip)).filter(Boolean))].sort();
  // "my area" = the cantons the company set in its profile (moves starting or ending there)
  const area = partnerCantons(partner);
  const inArea = (x: (typeof all)[number]) => area.includes(cantonOf(x.offer.from.zip)) || (!!x.offer.to && area.includes(cantonOf(x.offer.to.zip)));
  // start on "my area" when it has leads, otherwise show everything rather than an empty shop
  const canton = pickedCanton ?? (all.some(inArea) ? "mine" : "all");

  const term = q.trim().toLowerCase();
  const list = all
    .filter((x) => !term || [x.offer.id, x.offer.from.city, x.offer.from.zip, x.offer.to?.city ?? "", x.offer.to?.zip ?? ""].some((v) => v.toLowerCase().includes(term)))
    .filter((x) => svc === "all" || x.offer.serviceId === svc)
    .filter((x) => canton === "all" || (canton === "mine" ? inArea(x) : cantonOf(x.offer.from.zip) === canton))
    .sort((a, b) => {
      if (sort === "date") return a.offer.executionDate.localeCompare(b.offer.executionDate);
      if (sort === "slots") return a.offer.offersWanted - a.sold - (b.offer.offersWanted - b.sold);
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
          <Select value={sort} onValueChange={setSort} options={[{ value: "newest", label: t("sortNewest") }, { value: "date", label: t("sortDate") }, { value: "slots", label: t("sortSlots") }]} />
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
