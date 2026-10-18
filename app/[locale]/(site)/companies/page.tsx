"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, SearchX } from "lucide-react";
import { useStore } from "@/lib/mock/store";
import { useL, usePartnerRatings } from "@/lib/mock/hooks";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/bits";
import { CompanyCard, PageHero } from "@/components/site/sections";

const PER_PAGE = 9;

export default function CompaniesPage() {
  const t = useTranslations("site.companies");
  const tc = useTranslations("common");
  const L = useL();
  const page = useStore((s) => s.site.companiesPage);
  const partners = useStore((s) => s.partners);
  const services = useStore((s) => s.services);
  const ratings = usePartnerRatings();

  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("all");
  const [canton, setCanton] = useState("all");
  const [sort, setSort] = useState("rating");
  const [p, setP] = useState(1);

  const live = partners.filter((x) => x.status === "approved" && !x.banned);
  const cantons = [...new Set(live.map((x) => x.canton))].sort();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return partners
      .filter((x) => x.status === "approved" && !x.banned)
      .filter((x) => (svc === "all" ? true : x.serviceIds.includes(svc)))
      .filter((x) => (canton === "all" ? true : x.canton === canton))
      .filter((x) => !term || x.name.toLowerCase().includes(term) || x.city.toLowerCase().includes(term))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "reviews") return (ratings[b.id]?.count ?? 0) - (ratings[a.id]?.count ?? 0);
        return (ratings[b.id]?.avg ?? 0) - (ratings[a.id]?.avg ?? 0);
      });
  }, [partners, q, svc, canton, sort, ratings]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(p, pages);
  const shown = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setP(1);
  };

  return (
    <>
      <PageHero eyebrow={L(page.subtitle)} title={L(page.title)} image={page.image} />
      <section className="container-page py-10">
        <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-3 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => resetPage(setQ)(e.target.value)} placeholder={t("searchPh")} className="ps-9" />
          </div>
          <Select
            value={svc}
            onValueChange={resetPage(setSvc)}
            options={[{ value: "all", label: t("allServices") }, ...services.filter((s) => s.active).map((s) => ({ value: s.id, label: L(s.name) }))]}
          />
          <Select value={canton} onValueChange={resetPage(setCanton)} options={[{ value: "all", label: t("allCantons") }, ...cantons.map((c) => ({ value: c, label: c }))]} />
          <Select
            value={sort}
            onValueChange={setSort}
            options={[
              { value: "rating", label: t("sortRating") },
              { value: "reviews", label: t("sortReviews") },
              { value: "name", label: t("sortName") },
            ]}
          />
        </div>

        <p className="mb-4 text-sm font-medium text-muted-foreground" aria-live="polite">{t("results", { count: filtered.length })}</p>

        {shown.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((x) => (
              <CompanyCard key={x.id} partner={x} rating={ratings[x.id]} services={services.filter((s) => x.serviceIds.includes(s.id))} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-surface">
            <EmptyState icon={<SearchX />} title={t("empty")} body={tc("table.noResultsHint")} action={<Button variant="outline" onClick={() => { setQ(""); setSvc("all"); setCanton("all"); }}>{tc("actions.reset")}</Button>} />
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Button key={n} size="icon-sm" variant={n === current ? "default" : "ghost"} onClick={() => { setP(n); window.scrollTo({ top: 300, behavior: "smooth" }); }} aria-current={n === current ? "page" : undefined}>
                {n}
              </Button>
            ))}
          </nav>
        )}
      </section>
    </>
  );
}
