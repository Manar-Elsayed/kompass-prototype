"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, BadgeCheck, CheckCircle2, Star, TrendingDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useL, usePartnerRatings, useServiceMap } from "@/lib/mock/hooks";
import { CITIES } from "@/lib/mock/seed";
import { formatCHF } from "@/lib/utils";
import { useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Avatar } from "@/components/ui/controls";
import { Icon } from "@/components/shared/icon";
import { Stars } from "@/components/shared/bits";
import { OfferForm } from "@/components/site/offer-form";
import { BlogCard, CtaBand, ReviewCard, SectionHeading, ServiceCard } from "@/components/site/sections";
import { isLiveReview } from "@/lib/types";

export default function HomePage() {
  const t = useTranslations("site");
  const L = useL();
  const lang = useLang();
  const home = useStore((s) => s.site.home);
  const services = useStore((s) => s.services);
  const partners = useStore((s) => s.partners);
  const reviews = useStore((s) => s.reviews);
  const faqs = useStore((s) => s.faqs);
  const blogs = useStore((s) => s.blogs);
  const modelOffers = useStore((s) => s.modelOffers);
  const ratings = usePartnerRatings();
  const serviceMap = useServiceMap();

  const [quick, setQuick] = useState({ serviceId: "", zip: "" });
  const [prefill, setPrefill] = useState<{ serviceId?: string; zip?: string; n: number }>({ n: 0 });

  const active = services.filter((s) => s.active).sort((a, b) => a.order - b.order);
  const livePartners = partners.filter((p) => p.status === "approved" && !p.banned);
  const featured = livePartners.filter((p) => p.featured);
  const kompassReviews = reviews.filter((r) => r.target === "kompass" && isLiveReview(r)).slice(0, 3);
  const latestBlogs = blogs.filter((b) => b.published).slice(0, 3);
  const avgSite = useMemo(() => {
    const k = reviews.filter((r) => r.target === "kompass" && isLiveReview(r));
    return k.length ? k.reduce((a, r) => a + r.stars, 0) / k.length : 5;
  }, [reviews]);

  const startQuick = (e: React.FormEvent) => {
    e.preventDefault();
    setPrefill((p) => ({ serviceId: quick.serviceId || undefined, zip: quick.zip || undefined, n: p.n + 1 }));
    document.getElementById("offer-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-surface">
        <div className="pointer-events-none absolute -top-32 end-[-8%] size-[560px] rounded-full bg-primary-soft blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-30%] start-[-10%] size-[420px] rounded-full bg-accent-soft blur-3xl" />
        <div className="container-page relative grid items-center gap-12 pb-16 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-16">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              <BadgeCheck className="size-3.5" />
              {L(home.heroEyebrow)}
            </p>
            <h1 className="text-balance text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {L(home.heroTitle)}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">{L(home.heroDescription)}</p>

            {/* quick start */}
            <form
              onSubmit={startQuick}
              className="mt-8 grid gap-2 rounded-2xl border border-border bg-surface p-2 shadow-pop sm:grid-cols-[1.3fr_0.8fr_auto]"
            >
              <Select
                value={quick.serviceId}
                onValueChange={(v) => setQuick((q) => ({ ...q, serviceId: v }))}
                placeholder={t("offerForm.serviceLabel")}
                className="h-12 border-0 shadow-none"
                options={active.filter((s) => !s.comingSoon).map((s) => ({ value: s.id, label: L(s.name) }))}
              />
              <Input
                value={quick.zip}
                onChange={(e) => setQuick((q) => ({ ...q, zip: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                placeholder={`${t("offerForm.movingFrom")} · ZIP`}
                inputMode="numeric"
                className="h-12 border-0 shadow-none sm:border-s sm:rounded-none"
                list="hero-zips"
                dir="auto"
              />
              <datalist id="hero-zips">
                {CITIES.map((c) => (
                  <option key={c.zip} value={c.zip}>{c.city}</option>
                ))}
              </datalist>
              <Button type="submit" variant="accent" size="lg" className="h-12">
                {L(home.heroCta)}
                <ArrowRight className="" />
              </Button>
            </form>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-success" />
              {t("home.trustLine")}
            </p>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t pt-6">
              {home.stats.map((s, i) => (
                <div key={i}>
                  <dt className="sr-only">{L(s.label)}</dt>
                  <dd className="text-2xl font-extrabold text-ink" dir="ltr">{s.value}</dd>
                  <dd className="text-xs text-muted-foreground">{L(s.label)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="relative aspect-[550/367] overflow-hidden rounded-[2rem] shadow-float ring-1 ring-black/5">
              <Image src={home.heroImage} alt="" fill priority className="object-cover" sizes="(min-width:1024px) 560px, 100vw" />
            </div>
            {/* floating proof cards */}
            <div className="absolute -bottom-6 start-[-4%] flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 pe-5 shadow-float">
              <div className="flex size-10 items-center justify-center rounded-xl bg-success-soft text-success">
                <TrendingDown className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("home.fromChf")}</p>
                <p className="text-sm font-bold text-ink">{t("home.offersReceived")}</p>
              </div>
            </div>
            <div className="absolute -top-5 end-[-3%] rounded-2xl border border-border bg-surface p-3 shadow-float">
              <div className="flex items-center gap-2">
                <Star className="size-5 fill-amber-400 text-amber-400" />
                <span className="text-lg font-extrabold text-ink">{avgSite.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
              <div className="mt-1 flex -space-x-2">
                {kompassReviews.map((r) => (
                  <Avatar key={r.id} name={r.name} className="size-7 ring-2 ring-surface" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TRUSTED ---------- */}
      <section className="border-y bg-surface-2/50 py-8">
        <div className="container-page">
          <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">{L(home.trustedTitle)}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {featured.map((p) => (
              <Link key={p.id} href={`/companies/${p.id}`} className="flex items-center gap-2 text-sm font-bold text-foreground/60 transition hover:text-primary">
                <Avatar name={p.name} square className="size-7 rounded-md text-[10px]" />
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- SERVICES ---------- */}
      <section className="container-page py-20">
        <SectionHeading title={L(home.servicesTitle)} subtitle={L(home.servicesSubtitle)} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((s) => (
            <ServiceCard key={s.id} service={s} partnerCount={livePartners.filter((p) => p.serviceIds.includes(s.id)).length} />
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="bg-surface py-20">
        <div className="container-page">
          <SectionHeading title={L(home.howTitle)} subtitle={L(home.howSubtitle)} />
          <ol className="relative grid gap-6 md:grid-cols-3">
            <div className="pointer-events-none absolute inset-x-[16%] top-8 hidden h-0.5 border-t-2 border-dashed border-primary/20 md:block" />
            {home.steps.map((s, i) => (
              <li key={i} className="relative flex flex-col items-center text-center">
                <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary text-white shadow-pop">
                  <Icon name={s.icon} className="size-7" />
                  <span className="absolute -end-2 -top-2 flex size-6 items-center justify-center rounded-full bg-accent text-xs font-bold ring-4 ring-surface">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-ink">{L(s.title)}</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">{L(s.description)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- OFFER FORM ---------- */}
      <section id="offer-form" className="scroll-mt-24 py-20">
        <div className="container-page">
          <OfferForm key={prefill.n} defaultServiceId={prefill.serviceId} defaultZip={prefill.zip} />
        </div>
      </section>

      {/* ---------- EXAMPLE OFFERS ---------- */}
      {modelOffers.some((m) => m.active) && (
        <section className="container-page pb-20">
          <SectionHeading align="start" title={t("home.sampleOffers")} subtitle={t("home.sampleOffersSub")} />
          <div className="grid gap-4 md:grid-cols-3">
            {modelOffers
              .filter((m) => m.active)
              .map((m) => (
                <div key={m.id} className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-surface p-5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon name={serviceMap[m.serviceId]?.icon ?? "Truck"} className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{L(m.title)}</p>
                    <p className="truncate text-sm text-muted-foreground">{L(m.route)}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-muted-foreground">{t("home.from")}</p>
                    <p className="font-extrabold text-primary">{formatCHF(m.price, lang)}</p>
                  </div>
                </div>
              ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("estimate.examples")}</p>
        </section>
      )}

      {/* ---------- TESTIMONIALS ---------- */}
      <section className="bg-surface py-20">
        <div className="container-page">
          <SectionHeading
            align="start"
            title={L(home.testimonialsTitle)}
            subtitle={L(home.testimonialsSubtitle)}
            action={
              <Button asChild variant="outline">
                <Link href="/ratings">
                  <Star className="text-amber-500" /> {t("home.leaveReview")}
                </Link>
              </Button>
            }
          />
          <div className="grid gap-4 md:grid-cols-3">
            {kompassReviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading align="start" className="mb-6" title={L(home.faqTitle)} subtitle={L(home.faqSubtitle)} />
          <Button asChild variant="outline">
            <Link href="/faqs">
              {t("home.allFaqs")} <ArrowRight className="" />
            </Link>
          </Button>
        </div>
        <Accordion type="single" collapsible defaultValue={faqs[0]?.id} className="rounded-2xl border border-border bg-surface px-6">
          {[...faqs]
            .sort((a, b) => a.order - b.order)
            .slice(0, 5)
            .map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger>{L(f.question)}</AccordionTrigger>
                <AccordionContent>{L(f.answer)}</AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </section>

      {/* ---------- TOP COMPANIES + GUIDES ---------- */}
      <section className="container-page pb-20">
        <SectionHeading
          align="start"
          title={t("home.latestGuides")}
          subtitle={t("home.latestGuidesSub")}
          action={
            <Button asChild variant="ghost">
              <Link href="/blogs">
                {t("nav.blogs")} <ArrowRight className="" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-5 md:grid-cols-3">
          {latestBlogs.map((b) => (
            <BlogCard key={b.id} blog={b} category={serviceMap[b.serviceId]} />
          ))}
        </div>
      </section>

      <section className="container-page pb-4">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-bold text-ink">{t("companies.sortRating")}</h2>
          <Link href="/companies" className="text-sm font-semibold text-primary hover:underline">
            {t("home.allCompanies")}
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...livePartners]
            .sort((a, b) => (ratings[b.id]?.avg ?? 0) - (ratings[a.id]?.avg ?? 0))
            .slice(0, 4)
            .map((p) => (
              <Link key={p.id} href={`/companies/${p.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-primary/30 hover:shadow-pop">
                <Avatar name={p.name} square className="size-11 rounded-lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Stars value={ratings[p.id]?.avg ?? 0} />
                    {ratings[p.id]?.avg.toFixed(1) ?? "–"} · {p.city}
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* ---------- PARTNER CTA ---------- */}
      <div className="pt-20">
        <CtaBand
          variant="ink"
          title={L(home.partnerCtaTitle)}
          body={L(home.partnerCtaDescription)}
          cta={L(home.partnerCtaButton)}
          href="/partner"
        />
      </div>
    </>
  );
}
