"use client";

import { useTranslations } from "next-intl";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { PageHero, ServiceCard, CtaBand } from "@/components/site/sections";

export default function ServicesPage() {
  const t = useTranslations("site");
  const L = useL();
  const services = useStore((s) => s.services);
  const partners = useStore((s) => s.partners);
  const home = useStore((s) => s.site.home);
  const live = partners.filter((p) => p.status === "approved" && !p.banned);

  return (
    <>
      <PageHero eyebrow={t("nav.services")} title={t("services.title")} subtitle={t("services.subtitle")} />
      <section className="container-page py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services
            .filter((s) => s.active)
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <ServiceCard key={s.id} service={s} partnerCount={live.filter((p) => p.serviceIds.includes(s.id)).length} />
            ))}
        </div>
      </section>
      <CtaBand title={L(home.heroTitle)} body={L(home.heroDescription)} cta={L(home.heroCta)} href="/#offer-form" />
    </>
  );
}
