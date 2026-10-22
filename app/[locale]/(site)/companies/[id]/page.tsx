"use client";

import { notFound, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, Briefcase, Calendar, Globe, MapPin, ShieldCheck, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useCompanyMedia, useHydrated, useL, usePartnerRatings } from "@/lib/mock/hooks";
import { documentState } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Avatar, Progress } from "@/components/ui/controls";
import { Icon } from "@/components/shared/icon";
import { Stars, EmptyState } from "@/components/shared/bits";
import { OfferForm } from "@/components/site/offer-form";
import { ReviewCard } from "@/components/site/sections";

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("site.companies");
  const tn = useTranslations("site.nav");
  const tf = useTranslations("common.fields");
  const L = useL();
  const partner = useStore((s) => s.partners.find((p) => p.id === id));
  const services = useStore((s) => s.services);
  const allReviews = useStore((s) => s.reviews);
  const orders = useStore((s) => s.orders);
  const ratings = usePartnerRatings();
  const { logo, photos } = useCompanyMedia(id);

  const hydrated = useHydrated();

  // The server renders the seed data; a company approved since then exists only in the browser's
  // saved state, so only decide "not found" once that state has loaded.
  if (!partner || partner.status !== "approved" || partner.banned) {
    if (!hydrated) return <div className="min-h-[60vh]" aria-busy />;
    notFound();
  }

  const reviews = allReviews.filter((r) => r.target === partner.id && r.status === "approved");
  const rating = ratings[partner.id];
  const jobs = orders.filter((o) => o.partnerId === partner.id).length;
  const svcs = services.filter((s) => partner.serviceIds.includes(s.id));
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.stars === n).length }));
  // "verified" means Kompass checked the contract, insurance and register extract and none has expired
  const verified = documentState(partner).ok;

  return (
    <>
      <section className="bg-surface">
        <div className="container-page py-10">
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/companies" className="hover:text-primary">{tn("companies")}</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{partner.name}</span>
          </nav>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <Avatar name={partner.name} src={logo?.url} square className="size-20 rounded-2xl text-2xl" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-ink">{partner.name}</h1>
                  {verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                      <BadgeCheck className="size-3.5" /> {t("verified")}
                    </span>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-4" /> {partner.zip} {partner.city}, {partner.canton}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Stars value={rating?.avg ?? 0} size="md" />
                  <span className="font-bold text-ink">{rating?.avg.toFixed(1) ?? "–"}</span>
                  <span className="text-sm text-muted-foreground">({t("reviews", { count: rating?.count ?? 0 })})</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="accent">
                <a href="#request">{t("requestOffer")}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-6 py-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-3 text-lg font-bold text-ink">{t("about")}</h2>
            <p className="leading-relaxed text-foreground/90">{L(partner.about)}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {svcs.map((s) => (
                <Link key={s.id} href={`/services/${s.slug}`} className="flex items-start gap-3 rounded-xl bg-surface-2 p-4 transition hover:bg-primary-soft">
                  <Icon name={s.icon} className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="font-semibold text-ink">{L(s.name)}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{L(s.short)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {photos.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="mb-4 text-lg font-bold text-ink">{t("photos")}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.slice(0, 6).map((p) => (
                  <li key={p.id} className="aspect-[4/3] overflow-hidden rounded-xl bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- company uploads are data URLs */}
                    <img src={p.url} alt={t("photoAlt", { name: partner.name })} className="size-full object-cover" loading="lazy" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-ink">{t("customerReviews")}</h2>
            <p className="mb-5 mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-success" /> {t("verifiedReviews")}
            </p>
            {reviews.length ? (
              <>
                <div className="mb-6 grid items-center gap-6 rounded-xl bg-surface-2 p-5 sm:grid-cols-[auto_1fr]">
                  <div className="text-center">
                    <p className="text-5xl font-extrabold text-ink">{rating?.avg.toFixed(1)}</p>
                    <Stars value={rating?.avg ?? 0} className="mt-1" />
                    <p className="mt-1 text-xs text-muted-foreground">{t("reviews", { count: reviews.length })}</p>
                  </div>
                  <div className="space-y-1.5">
                    {dist.map((d) => (
                      <div key={d.n} className="flex items-center gap-3 text-sm">
                        <span className="w-3 font-semibold">{d.n}</span>
                        <Progress value={(d.c / reviews.length) * 100} tone="accent" className="h-1.5" />
                        <span className="w-6 text-end text-muted-foreground">{d.c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {reviews.slice(0, 6).map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title={t("noReviews")} body={t("verifiedReviews")} />
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <dl className="space-y-4 text-sm">
              {[
                { icon: Calendar, label: t("founded"), value: partner.foundedYear },
                { icon: User, label: t("owner"), value: partner.ownerName },
                { icon: Briefcase, label: t("jobs"), value: jobs },
                { icon: MapPin, label: t("location"), value: `${partner.address}, ${partner.zip} ${partner.city}` },
                { icon: Globe, label: tf("website"), value: partner.website.replace("https://", ""), ltr: true },
              ].map(({ icon: I, label, value, ltr }: { icon: typeof Calendar; label: string; value: string | number; ltr?: boolean }) => (
                <div key={label} className="flex items-start gap-3">
                  <I className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-semibold text-ink" dir={ltr ? "ltr" : undefined}>{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl bg-primary p-6 text-white">
            <h3 className="text-lg font-bold">{t("togetherTitle", { name: partner.name })}</h3>
            <p className="mt-2 text-sm text-white/80">{t("togetherBody", { name: partner.name })}</p>
            <Button asChild variant="accent" className="mt-5 w-full">
              <a href="#request">{t("requestOffer")}</a>
            </Button>
          </div>
        </aside>
      </section>

      <section id="request" className="container-page scroll-mt-24 pb-10">
        <OfferForm defaultServiceId={partner.serviceIds[0]} />
      </section>

    </>
  );
}
