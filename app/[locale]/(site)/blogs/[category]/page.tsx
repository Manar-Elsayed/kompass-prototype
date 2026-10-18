"use client";

import { notFound, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Icon } from "@/components/shared/icon";
import { EmptyState } from "@/components/shared/bits";
import { BlogCard } from "@/components/site/sections";

export default function BlogCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const t = useTranslations("site");
  const L = useL();
  const service = useStore((s) => s.services.find((x) => x.slug === category));
  const blogs = useStore((s) => s.blogs);
  if (!service) notFound();
  const list = blogs.filter((b) => b.published && b.serviceId === service.id);

  return (
    <section className="container-page py-14">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/blogs" className="hover:text-primary">{t("nav.blogs")}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{L(service.name)}</span>
      </nav>
      <div className="mb-10 flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon name={service.icon} className="size-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-ink">{L(service.name)}</h1>
          <p className="text-muted-foreground">{t("blogs.articles", { count: list.length })}</p>
        </div>
      </div>
      {list.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <BlogCard key={b.id} blog={b} category={service} />
          ))}
        </div>
      ) : (
        <EmptyState title={t("blogs.empty")} />
      )}
    </section>
  );
}
