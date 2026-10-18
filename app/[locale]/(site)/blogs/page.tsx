"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useL, useServiceMap } from "@/lib/mock/hooks";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/shared/icon";
import { EmptyState } from "@/components/shared/bits";
import { BlogCard, CtaBand, PageHero, SectionHeading } from "@/components/site/sections";

export default function BlogsPage() {
  const t = useTranslations("site.blogs");
  const tn = useTranslations("site.nav");
  const L = useL();
  const page = useStore((s) => s.site.blogsPage);
  const blogs = useStore((s) => s.blogs).filter((b) => b.published);
  const services = useStore((s) => s.services);
  const serviceMap = useServiceMap();
  const [q, setQ] = useState("");

  const term = q.trim().toLowerCase();
  const list = blogs.filter((b) => !term || L(b.title).toLowerCase().includes(term) || L(b.excerpt).toLowerCase().includes(term));
  const [lead, ...rest] = list;
  const categories = services.filter((s) => blogs.some((b) => b.serviceId === s.id));

  return (
    <>
      <PageHero title={L(page.title)} subtitle={L(page.subtitle)} image={page.image}>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} className="h-12 ps-9" />
        </div>
      </PageHero>

      <section className="container-page py-14">
        <div className="mb-10 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/blogs/${c.slug}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">
              <Icon name={c.icon} className="size-4" />
              {L(c.name)}
              <span className="text-xs text-muted-foreground">{blogs.filter((b) => b.serviceId === c.id).length}</span>
            </Link>
          ))}
        </div>

        {lead ? (
          <>
            <SectionHeading align="start" title={t("latest")} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[lead, ...rest].map((b) => (
                <BlogCard key={b.id} blog={b} category={serviceMap[b.serviceId]} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState title={t("empty")} />
        )}
      </section>
      <CtaBand title={t("ctaTitle")} body={t("ctaBody")} cta={tn("cta")} href="/#offer-form" />
    </>
  );
}
