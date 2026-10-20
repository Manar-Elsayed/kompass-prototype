"use client";

import Image from "next/image";
import { notFound, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, Clock, Lightbulb, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { OfferForm } from "@/components/site/offer-form";
import { BlogCard, Prose, SectionHeading } from "@/components/site/sections";
import { PriceEstimate } from "@/components/site/request-bits";

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslations("site");
  const L = useL();
  const services = useStore((s) => s.services);
  const partners = useStore((s) => s.partners);
  const blogs = useStore((s) => s.blogs);
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();

  const count = partners.filter((p) => p.status === "approved" && !p.banned && p.serviceIds.includes(service.id)).length;
  const related = blogs.filter((b) => b.published && b.serviceId === service.id).slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden bg-surface">
        <div className="pointer-events-none absolute -top-24 end-[-10%] size-[420px] rounded-full bg-primary-soft blur-3xl" />
        <div className="container-page relative grid items-center gap-10 py-12 md:py-16 lg:grid-cols-2">
          <div>
            <nav className="mb-5 text-sm text-muted-foreground">
              <Link href="/services" className="hover:text-primary">{t("nav.services")}</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{L(service.name)}</span>
            </nav>
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-white">
              <Icon name={service.icon} className="size-7" />
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-ink sm:text-5xl">{L(service.name)}</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">{L(service.short)}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-medium text-foreground/80">
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-accent" />{t("services.leadTime")}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-accent" />{t("services.partnersFor", { count })}</span>
            </div>
            {service.comingSoon ? (
              <p className="mt-8 inline-flex rounded-full bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">{t("estimate.soonLong")}</p>
            ) : (
              <>
                <PriceEstimate service={service} className="mt-6 max-w-md bg-surface" />
                <Button asChild variant="accent" size="lg" className="mt-6">
                  <a href="#request">
                    {t("services.request")} <ArrowRight className="" />
                  </a>
                </Button>
              </>
            )}
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface-2">
            <Image src={service.image} alt="" fill className="object-cover" sizes="(min-width:1024px) 600px, 100vw" priority />
          </div>
        </div>
      </section>

      <section className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr]">
        <Prose html={L(service.body)} className="max-w-2xl text-[15px]" />
        {service.tips.length > 0 && (
          <aside className="h-fit rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
              <Lightbulb className="size-5 text-accent" /> {t("services.tips")}
            </h2>
            <ul className="space-y-3">
              {service.tips.map((tip) => (
                <li key={tip.id} className="flex gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  {L(tip.text)}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </section>

      <section className="bg-surface py-16">
        <div className="container-page">
          <SectionHeading title={t("services.features")} />
          <div className="grid gap-5 md:grid-cols-3">
            {service.features.map((f) => (
              <div key={f.id} className="rounded-2xl border border-border p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon name={f.icon} className="size-5" />
                </div>
                <h3 className="font-bold text-ink">{L(f.title)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{L(f.description)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!service.comingSoon && (
        <section id="request" className="container-page scroll-mt-24 py-16">
          <OfferForm defaultServiceId={service.id} />
        </section>
      )}

      {related.length > 0 && (
        <section className="container-page pb-8">
          <SectionHeading align="start" title={t("services.related")} />
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((b) => (
              <BlogCard key={b.id} blog={b} category={service} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
