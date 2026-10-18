"use client";

import Image from "next/image";
import { notFound, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BlogCard, Prose, SectionHeading } from "@/components/site/sections";

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslations("site");
  const L = useL();
  const lang = useLang();
  const blogs = useStore((s) => s.blogs);
  const serviceMap = useServiceMap();
  const blog = blogs.find((b) => b.slug === slug);
  if (!blog || !blog.published) notFound();
  const category = serviceMap[blog.serviceId];
  const related = blogs.filter((b) => b.published && b.id !== blog.id).slice(0, 3);

  return (
    <>
      <article className="container-page max-w-3xl py-12">
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link href="/blogs" className="hover:text-primary">{t("nav.blogs")}</Link>
          {category && (
            <>
              <span className="mx-2">/</span>
              <Link href={`/blogs/${category.slug}`} className="hover:text-primary">{L(category.name)}</Link>
            </>
          )}
        </nav>
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">{L(blog.title)}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{L(blog.excerpt)}</p>
        <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{formatDate(blog.createdAt, lang)}</span>·
          <span className="inline-flex items-center gap-1"><Clock className="size-4" />{t("blogs.minRead", { mins: blog.readMins })}</span>
        </div>
        <div className="relative my-8 aspect-[16/9] overflow-hidden rounded-3xl bg-surface-2">
          <Image src={blog.image} alt="" fill className="object-cover" sizes="768px" priority />
        </div>
        <Prose html={L(blog.body)} className="text-[16px]" />
        <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-primary-soft p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-ink">{t("blogs.ctaTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("blogs.ctaBody")}</p>
          </div>
          <Button asChild variant="accent">
            <Link href={category ? `/services/${category.slug}#request` : "/#offer-form"}>{t("nav.cta")}</Link>
          </Button>
        </div>
      </article>
      <section className="container-page pb-6">
        <SectionHeading align="start" title={t("blogs.related")} />
        <div className="grid gap-5 md:grid-cols-3">
          {related.map((b) => (
            <BlogCard key={b.id} blog={b} category={serviceMap[b.serviceId]} />
          ))}
        </div>
      </section>
    </>
  );
}
