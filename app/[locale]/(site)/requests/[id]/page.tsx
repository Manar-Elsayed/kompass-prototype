"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useHydrated, useL, useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/bits";
import { ReviewSurveyForm, type SurveyAnswers } from "@/components/site/review-survey-form";
import { routeText } from "@/lib/jobs";

/**
 * The review survey. Customers have no account: the day after the move date they get one email with
 * this link. They say which company did the job (among those that bought the request), rate it, and
 * rate Kompass separately, and can add a private complaint. Nothing else happens here.
 */
export default function ReviewSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("site.survey");
  const L = useL();
  const lang = useLang();
  const hydrated = useHydrated();
  const offer = useStore((s) => s.offers.find((o) => o.id === id));
  const svc = useStore((s) => s.services.find((x) => x.id === offer?.serviceId));
  const reviews = useStore((s) => s.reviews);
  const chooseCompany = useStore((s) => s.chooseCompany);
  const submitReview = useStore((s) => s.submitReview);
  const patch = useStore((s) => s.patch);
  const [done, setDone] = useState(false);
  const [shared, setShared] = useState(false);

  if (!hydrated)
    return (
      <section className="container-page max-w-2xl space-y-4 py-12">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
      </section>
    );
  if (!offer)
    return (
      <section className="container-page py-16">
        <EmptyState title={t("notFound")} body={t("notFoundHint")} action={<Button asChild><Link href="/">{t("home")}</Link></Button>} />
      </section>
    );

  const answered = done || reviews.some((r) => r.offerId === offer.id);
  const person = offer.requester ?? offer;
  const shownAs = `${person.firstName} ${person.lastName.charAt(0)}.`;

  const submit = async (a: SurveyAnswers) => {
    await mock(() => {
      chooseCompany(offer.id, a.companyId);
      submitReview({ target: a.companyId, offerId: offer.id, name: shownAs, email: person.email, stars: a.companyStars, comment: a.companyComment, publishConsent: a.publishConsent });
      submitReview({ target: "kompass", offerId: offer.id, name: shownAs, email: person.email, stars: a.kompassStars, comment: a.kompassComment, publishConsent: a.publishConsent });
      // a complaint stays private: the team sees it on the offer
      if (a.complaint) patch("offers", offer.id, { surveyComplaint: a.complaint });
    });
    setShared(a.publishConsent);
    setDone(true);
  };

  return (
    <section className="container-page max-w-2xl py-10 sm:py-14">
      <p className="text-sm font-semibold text-primary">{t("eyebrow")}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {svc ? L(svc.name) : ""} · {routeText(offer)} · {formatDate(offer.executionDate, lang)}
        <span className="ms-2 font-mono text-xs" dir="ltr">{offer.id}</span>
      </p>

      {answered ? (
        <div className="mt-8 rounded-2xl border border-success/30 bg-success-soft/40 p-8 text-center" role="status">
          <CheckCircle2 className="mx-auto size-12 text-success" />
          <p className="mt-3 text-lg font-bold text-ink">{t("thanksTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t(shared ? "thanksBody" : "thanksBodyPrivate")}</p>
        </div>
      ) : (
        <div className="mt-8">
          <ReviewSurveyForm offer={offer} onSubmit={submit} />
        </div>
      )}
    </section>
  );
}
