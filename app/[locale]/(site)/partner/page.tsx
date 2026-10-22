"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Calendar, MapPin, Home } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useL, useLang } from "@/lib/mock/hooks";
import { formatCHF, intlLocale } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/shared/icon";
import { CtaBand, SectionHeading } from "@/components/site/sections";
import { routeFull } from "@/lib/jobs";

export default function PartnerLanding() {
  const t = useTranslations("site.partner");
  const tf = useTranslations("common.fields");
  const ts = useTranslations("common.status");
  const L = useL();
  const lang = useLang();
  const page = useStore((s) => s.site.partnerPage);
  const services = useStore((s) => s.services);
  const partnersCount = useStore((s) => s.partners.filter((p) => p.status === "approved").length);
  const sample = useStore((s) => s.offers[3]);
  const svc = services.find((s) => s.id === sample.serviceId);

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -top-40 end-[-10%] size-[600px] rounded-full bg-primary/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 start-[-10%] size-[400px] rounded-full bg-accent/25 blur-3xl" />
        <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-4 text-sm font-bold text-accent">{partnersCount}+ {tf("company")}</p>
            <h1 className="text-balance text-4xl font-extrabold leading-tight sm:text-5xl">{L(page.title)}</h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">{L(page.subtitle)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href="/partner/register">
                  {t("apply")} <ArrowRight className="" />
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-white/10 text-white hover:bg-white/20">
                <a href="#how">{t("howToJoin")}</a>
              </Button>
            </div>
          </div>

          {/* lead preview card */}
          <div className="relative mx-auto w-full max-w-md">
            <p className="mb-3 text-sm font-semibold text-white/60">{t("leadExample")}</p>
            <div className="rounded-3xl bg-surface p-6 text-foreground shadow-float">
              <div className="flex items-start justify-between">
                <div>
                  <Badge tone="info" dot>{ts("new")}</Badge>
                  <p className="mt-3 text-lg font-bold text-ink">{svc ? L(svc.name) : ""} · {sample.from.rooms} {tf("rooms")}</p>
                </div>
                <div className="text-end">
                  <p className="text-xs text-muted-foreground">{t("leadPrice")}</p>
                  <p className="text-xl font-extrabold text-primary">{formatCHF(svc?.leadPrice ?? 35, lang)}</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 rounded-2xl bg-surface-2 p-4 text-sm">
                <p className="flex items-center gap-2"><MapPin className="size-4 text-accent" /> {routeFull(sample)}</p>
                <p className="flex items-center gap-2"><Home className="size-4 text-accent" /> {tf("floor")} {sample.from.floor} · {tf("elevator")}: {sample.from.elevator ? "✓" : "✗"}</p>
                <p className="flex items-center gap-2"><Calendar className="size-4 text-accent" /> {new Date(sample.executionDate).toLocaleDateString(intlLocale(lang))}</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{sample.firstName[0]}. ••••• · ••• •• ••</span>
                <span className="font-semibold text-accent">2 / {sample.offersWanted}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <SectionHeading title={t("benefits")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {page.benefits.map((b, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon name={b.icon} className="size-6" />
              </div>
              <h3 className="font-bold text-ink">{L(b.title)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{L(b.description)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-24 bg-surface py-20">
        <div className="container-page">
          <SectionHeading title={t("howToJoin")} />
          <ol className="grid gap-6 md:grid-cols-3">
            {page.steps.map((s, i) => (
              <li key={i} className="relative rounded-2xl border border-border p-6">
                <span className="absolute end-5 top-5 text-5xl font-extrabold text-primary/10">{i + 1}</span>
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent text-white">
                  <Icon name={s.icon} className="size-6" />
                </div>
                <h3 className="font-bold text-ink">{L(s.title)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{L(s.description)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {services
              .filter((s) => s.active)
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 font-semibold"><Icon name={s.icon} className="size-4 text-primary" />{L(s.name)}</span>
                  <span className="font-bold text-primary">{formatCHF(s.leadPrice, lang)}</span>
                </div>
              ))}
          </div>
        </div>
      </section>

      <div className="pt-20">
        <CtaBand title={L(page.ctaTitle)} body={L(page.ctaDescription)} cta={t("apply")} href="/partner/register" />
      </div>
    </>
  );
}
