"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronDown, FileText, HelpCircle, Layers, Search, SearchX, Tag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/admin/ui";
import { pageSchemas } from "@/components/admin/cms-schemas";

type Group = "pages" | "collections" | "services";

/**
 * Everything on the public website that can be edited: pages, collections and each service's page.
 * One search filters all three groups; each group folds away on its own.
 */
export default function CmsIndex() {
  const t = useTranslations("admin.cms");
  const tn = useTranslations("admin.nav");
  const L = useL();
  const services = useStore((s) => s.services);
  const blogs = useStore((s) => s.blogs);
  const faqs = useStore((s) => s.faqs);
  const modelOffers = useStore((s) => s.modelOffers);
  const schemas = pageSchemas((k) => t(k));
  const [q, setQ] = useState("");
  const [closed, setClosed] = useState<Group[]>([]);

  const needle = q.trim().toLowerCase();
  const hit = (...texts: string[]) => !needle || texts.some((x) => x.toLowerCase().includes(needle));

  const pages = schemas.filter((s) => hit(t(`pages.${s.key}`), t(`pages.${s.key}Desc`)));
  const collections = [
    { href: "/admin/cms/blog", icon: FileText, label: tn("blog"), count: blogs.length },
    { href: "/admin/cms/faqs", icon: HelpCircle, label: tn("faqs"), count: faqs.length },
    { href: "/admin/cms/example-offers", icon: Tag, label: tn("modelOffers"), count: modelOffers.length },
    { href: "/admin/leads/services", icon: Layers, label: tn("offerTypes"), count: services.length },
  ].filter((c) => hit(c.label));
  const serviceLinks = services.filter((s) => hit(L(s.name)));

  // while searching every group with a match is open, so nothing found is hidden in a folded group
  const isOpen = (g: Group) => !!needle || !closed.includes(g);
  const toggle = (g: Group) => setClosed((c) => (c.includes(g) ? c.filter((x) => x !== g) : [...c, g]));

  const section = (g: Group, title: string, count: number, body: React.ReactNode) =>
    count > 0 && (
      <section className="mt-6 first:mt-0">
        <button
          type="button"
          onClick={() => toggle(g)}
          aria-expanded={isOpen(g)}
          className="mb-3 flex w-full items-center gap-2 text-start text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-ink"
        >
          <ChevronDown className={cn("size-4 transition", !isOpen(g) && "-rotate-90")} />
          {title}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold normal-case tracking-normal">{count}</span>
        </button>
        {isOpen(g) && body}
      </section>
    );

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} className="ps-9" />
      </div>

      {section(
        "pages",
        t("pagesGroup"),
        pages.length,
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pages.map((s) => (
            <Link key={s.key} href={`/admin/cms/${s.key}`}>
              <Card className="group flex h-full items-start gap-4 p-5 transition hover:border-primary/30 hover:shadow-pop">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon name={s.icon} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-ink">{t(`pages.${s.key}`)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t(`pages.${s.key}Desc`)}</span>
                </span>
                <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Card>
            </Link>
          ))}
        </div>,
      )}

      {section(
        "collections",
        t("collections"),
        collections.length,
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {collections.map(({ href, icon: I, label, count }) => (
            <Link key={href} href={href}>
              <Card className="flex items-center gap-3 p-4 transition hover:border-primary/30 hover:shadow-pop">
                <I className="size-5 text-accent" />
                <span className="flex-1 font-semibold text-ink">{label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{count}</span>
              </Card>
            </Link>
          ))}
        </div>,
      )}

      {section(
        "services",
        tn("offerTypes"),
        serviceLinks.length,
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {serviceLinks.map((s) => (
            <Link key={s.id} href={`/admin/cms/services/${s.id}`} className="flex items-center gap-2 rounded-xl border bg-surface px-3 py-2.5 text-sm font-medium transition hover:border-primary/30">
              <Icon name={s.icon} className="size-4 text-primary" /> {L(s.name)}
            </Link>
          ))}
        </div>,
      )}

      {!pages.length && !collections.length && !serviceLinks.length && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          <SearchX className="size-6" />
          {t("noMatch", { q: q.trim() })}
        </div>
      )}
    </>
  );
}
