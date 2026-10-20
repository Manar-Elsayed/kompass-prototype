"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, BadgeCheck, MapPin, Quote } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Blog, Partner, Review, Service } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useL, useLang } from "@/lib/mock/hooks";
import { KOMPASS_REVIEW_L10N } from "@/lib/mock/seed";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { Icon } from "@/components/shared/icon";
import { Stars } from "@/components/shared/bits";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "start";
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn(align === "center" && "max-w-2xl")}>
        {eyebrow && <p className="mb-2 text-sm font-bold text-accent">{eyebrow}</p>}
        <h2 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-[2.25rem] sm:leading-tight">{title}</h2>
        {subtitle && <p className="mt-3 text-pretty text-[15px] text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Compact page header used on inner pages. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-surface">
      <div className="pointer-events-none absolute -top-24 end-[-10%] size-[420px] rounded-full bg-primary-soft blur-3xl" />
      <div className="container-page relative grid items-center gap-8 py-12 md:py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {eyebrow && <p className="mb-3 text-sm font-bold text-accent">{eyebrow}</p>}
          <h1 className="text-balance text-4xl font-bold tracking-tight text-ink sm:text-5xl sm:leading-[1.1]">{title}</h1>
          {subtitle && <p className="mt-4 max-w-xl text-pretty text-lg text-muted-foreground">{subtitle}</p>}
          {children && <div className="mt-7">{children}</div>}
        </div>
        {image && (
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-3xl bg-surface-2 lg:block">
            <Image src={image} alt="" fill className="object-cover" sizes="(min-width:1024px) 520px, 100vw" />
          </div>
        )}
      </div>
    </section>
  );
}

export function ServiceCard({ service, partnerCount }: { service: Service; partnerCount?: number }) {
  const L = useL();
  const t = useTranslations("site.services");
  const te = useTranslations("site.estimate");
  const lang = useLang();
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group relative flex flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-pop"
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <Icon name={service.icon} className="size-6" />
      </div>
      {service.comingSoon && <span className="absolute end-5 top-5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{te("soon")}</span>}
      <h3 className="text-lg font-bold text-ink">{L(service.name)}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{L(service.short)}</p>
      {!service.comingSoon && service.estimate.to > 0 && (
        <p className="mt-4 text-sm">
          <span className="text-muted-foreground">{te("from")} </span>
          <span className="font-bold text-ink tabular-nums">{formatCHF(service.estimate.from, lang)}</span>
          <span className="text-muted-foreground"> · {te("indicative")}</span>
        </p>
      )}
      <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
        {partnerCount !== undefined && !service.comingSoon ? (
          <span className="text-muted-foreground">{t("partnersFor", { count: partnerCount })}</span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 font-semibold text-primary">
          {service.comingSoon ? t("learnMore") : t("request")}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function CompanyCard({
  partner,
  rating,
  services,
}: {
  partner: Partner;
  rating?: { avg: number; count: number };
  services: Service[];
}) {
  const t = useTranslations("site.companies");
  const L = useL();
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/30 hover:shadow-pop">
      <div className="flex items-start gap-4">
        <Avatar name={partner.name} square className="size-14 rounded-xl text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-bold text-ink">{partner.name}</h3>
            <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={t("verified")} />
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {partner.city}, {partner.canton} · {t("since", { year: partner.foundedYear })}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-sm">
            {rating ? (
              <>
                <Stars value={rating.avg} />
                <span className="font-semibold text-ink">{rating.avg.toFixed(1)}</span>
                <span className="text-muted-foreground">({t("reviews", { count: rating.count })})</span>
              </>
            ) : (
              <span className="text-muted-foreground">{t("noReviews")}</span>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{L(partner.about)}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {services.map((s) => (
          <span key={s.id} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-foreground/80">
            {L(s.name)}
          </span>
        ))}
      </div>
      <div className="mt-5 flex gap-2 border-t pt-4">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/companies/${partner.id}`}>{t("viewProfile")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm" className="flex-1">
          <Link href={`/companies/${partner.id}#request`}>{t("requestOffer")}</Link>
        </Button>
      </div>
    </article>
  );
}

export function BlogCard({ blog, category }: { blog: Blog; category?: Service }) {
  const L = useL();
  const lang = useLang();
  const t = useTranslations("site.blogs");
  return (
    <Link
      href={`/blogs/${category?.slug ?? "all"}/${blog.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:shadow-pop"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <Image src={blog.image} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(min-width:1024px) 380px, 100vw" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
          {category && <span className="text-accent">{L(category.name)}</span>}
          <span className="text-muted-foreground">· {t("minRead", { mins: blog.readMins })}</span>
        </div>
        <h3 className="text-lg font-bold leading-snug text-ink group-hover:text-primary">{L(blog.title)}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">{L(blog.excerpt)}</p>
        <p className="mt-4 text-xs text-muted-foreground">{formatDate(blog.createdAt, lang)}</p>
      </div>
    </Link>
  );
}

export function ReviewCard({ review, subtitle }: { review: Review; subtitle?: React.ReactNode }) {
  const lang = useLang();
  const comment = (lang !== "en" && KOMPASS_REVIEW_L10N[review.id]?.[lang]) || review.comment;
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6">
      <Quote className="mb-3 size-7 text-accent/70" />
      <Stars value={review.stars} />
      <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-foreground">“{comment}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t pt-4">
        <Avatar name={review.name} className="size-9" />
        <div>
          <p className="text-sm font-semibold text-ink">{review.name}</p>
          <p className="text-xs text-muted-foreground">{subtitle ?? formatDate(review.createdAt, lang)}</p>
        </div>
      </figcaption>
    </figure>
  );
}

export function CtaBand({
  title,
  body,
  cta,
  href,
  variant = "primary",
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  cta: React.ReactNode;
  href: string;
  variant?: "primary" | "ink";
}) {
  return (
    <section className="container-page">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl px-6 py-12 text-white sm:px-12",
          variant === "primary" ? "bg-primary" : "bg-ink",
        )}
      >
        <div className="pointer-events-none absolute -end-20 -top-20 size-72 rounded-full bg-accent/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 start-1/3 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-balance text-2xl font-bold sm:text-3xl">{title}</h2>
            {body && <p className="mt-2 text-white/75">{body}</p>}
          </div>
          <Button asChild variant="accent" size="lg" className="shrink-0">
            <Link href={href}>
              {cta}
              <ArrowRight className="" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function Prose({ html, className }: { html: string; className?: string }) {
  return <div className={cn("prose-kompass", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
