"use client";

import { useTranslations } from "next-intl";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Stars } from "@/components/shared/bits";
import { ReviewForm } from "@/components/site/review-form";
import { ReviewCard } from "@/components/site/sections";
import { isLiveReview } from "@/lib/types";

export default function RatingsPage() {
  const t = useTranslations("site.review");
  const L = useL();
  const home = useStore((s) => s.site.home);
  const reviews = useStore((s) => s.reviews).filter((r) => r.target === "kompass" && isLiveReview(r));
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.stars, 0) / reviews.length : 0;

  return (
    <section className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_480px]">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-ink">{L(home.testimonialsTitle)}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{L(home.testimonialsSubtitle)}</p>
        <div className="mt-6 flex items-center gap-3">
          <span className="text-4xl font-extrabold text-ink">{avg.toFixed(1)}</span>
          <Stars value={avg} size="md" />
          <span className="text-sm text-muted-foreground">({reviews.length})</span>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      </div>
      <div className="h-fit rounded-3xl border border-border bg-surface p-6 shadow-pop lg:sticky lg:top-28">
        <h2 className="text-xl font-bold text-ink">{t("kompassTitle")}</h2>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">{t("kompassHint")}</p>
        <ReviewForm target="kompass" />
      </div>
    </section>
  );
}
