"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Compass, Telescope } from "lucide-react";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Icon } from "@/components/shared/icon";
import { CtaBand, PageHero, SectionHeading } from "@/components/site/sections";

export default function AboutPage() {
  const t = useTranslations("site");
  const L = useL();
  const about = useStore((s) => s.site.about);
  const home = useStore((s) => s.site.home);

  return (
    <>
      <PageHero eyebrow={L(about.subtitle)} title={L(about.title)} subtitle={L(about.body)} image={about.image} />

      <section className="border-y bg-surface">
        <dl className="container-page grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {about.numbers.map((n, i) => (
            <div key={i} className="text-center">
              <dd className="text-4xl font-extrabold text-primary" dir="ltr">{n.value}</dd>
              <dt className="mt-1 text-sm text-muted-foreground">{L(n.label)}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        {[
          { icon: Compass, title: t("about.mission"), body: L(about.mission) },
          { icon: Telescope, title: t("about.vision"), body: L(about.vision) },
        ].map(({ icon: I, title, body }) => (
          <div key={title} className="rounded-2xl border border-border bg-surface p-8">
            <I className="mb-4 size-8 text-accent" />
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            <p className="mt-2 text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="bg-surface py-16">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface-2">
            <Image src="/images/about-target.png" alt="" fill className="object-cover" sizes="600px" />
          </div>
          <div>
            <SectionHeading align="start" className="mb-6" title={t("about.values")} />
            <ul className="space-y-5">
              {about.values.map((v, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon name={v.icon} className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink">{L(v.title)}</h3>
                    <p className="text-sm text-muted-foreground">{L(v.description)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="pt-16">
        <CtaBand title={L(home.heroTitle)} cta={L(home.heroCta)} href="/#offer-form" />
      </div>
    </>
  );
}
