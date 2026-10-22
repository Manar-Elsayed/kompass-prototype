"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, CircleSlash, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useHydrated, useL, useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StarInput } from "@/components/shared/bits";

const NONE = "none";

/**
 * The review survey. Customers have no account: the day after the move date they get one email with
 * this link. They say which company did the job (among those that bought the request), rate it, and
 * rate Kompass separately. Nothing else happens here.
 */
export default function ReviewSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("site.survey");
  const L = useL();
  const lang = useLang();
  const hydrated = useHydrated();
  const offer = useStore((s) => s.offers.find((o) => o.id === id));
  const svc = useStore((s) => s.services.find((x) => x.id === offer?.serviceId));
  const allOrders = useStore((s) => s.orders);
  const partners = useStore((s) => s.partners);
  const reviews = useStore((s) => s.reviews);
  const chooseCompany = useStore((s) => s.chooseCompany);
  const submitReview = useStore((s) => s.submitReview);
  const [company, setCompany] = useState("");
  const [companyStars, setCompanyStars] = useState(0);
  const [companyComment, setCompanyComment] = useState("");
  const [kompassStars, setKompassStars] = useState(0);
  const [kompassComment, setKompassComment] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

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

  const companies = allOrders
    .filter((o) => o.offerId === offer.id)
    .map((o) => partners.find((p) => p.id === o.partnerId))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const answered = done || reviews.some((r) => r.offerId === offer.id);
  const person = offer.requester ?? offer;
  const shownAs = `${person.firstName} ${person.lastName.charAt(0)}.`;
  const chosen = partners.find((p) => p.id === company);
  const missing = {
    company: !company,
    companyStars: !!chosen && !companyStars,
    kompassStars: !kompassStars,
  };
  const valid = !missing.company && !missing.companyStars && !missing.kompassStars;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    setBusy(true);
    await mock(() => {
      if (chosen) {
        chooseCompany(offer.id, chosen.id);
        submitReview({ target: chosen.id, offerId: offer.id, name: shownAs, email: person.email, stars: companyStars, comment: companyComment.trim() });
      }
      submitReview({ target: "kompass", offerId: offer.id, name: shownAs, email: person.email, stars: kompassStars, comment: kompassComment.trim() });
    });
    setBusy(false);
    setDone(true);
  };

  return (
    <section className="container-page max-w-2xl py-10 sm:py-14">
      <p className="text-sm font-semibold text-primary">{t("eyebrow")}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {svc ? L(svc.name) : ""} · {offer.from.city} → {offer.to.city} · {formatDate(offer.executionDate, lang)}
        <span className="ms-2 font-mono text-xs" dir="ltr">{offer.id}</span>
      </p>

      {answered ? (
        <div className="mt-8 rounded-2xl border border-success/30 bg-success-soft/40 p-8 text-center" role="status">
          <CheckCircle2 className="mx-auto size-12 text-success" />
          <p className="mt-3 text-lg font-bold text-ink">{t("thanksTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("thanksBody")}</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-8 grid gap-6">
          {/* 1. which company did the job */}
          <fieldset className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <legend className="px-1 font-bold text-ink">{t("q1")}</legend>
            <p className="mb-4 text-sm text-muted-foreground">{t("q1Hint")}</p>
            <div className="grid gap-2" role="radiogroup" aria-invalid={tried && missing.company}>
              {[...companies.map((p) => ({ id: p.id, name: p.name, city: p.city })), { id: NONE, name: t("none"), city: "" }].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={company === c.id}
                  onClick={() => setCompany(c.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-start text-sm transition",
                    company === c.id ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-input bg-surface hover:border-primary/40",
                  )}
                >
                  {c.id === NONE ? (
                    <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><CircleSlash className="size-5" /></span>
                  ) : (
                    <CompanyLogo partnerId={c.id} name={c.name} className="size-10 rounded-xl" />
                  )}
                  <span>
                    <span className="block font-semibold text-ink">{c.name}</span>
                    {c.city && <span className="block text-xs text-muted-foreground">{c.city}</span>}
                  </span>
                </button>
              ))}
            </div>
            {tried && missing.company && <p className="mt-2 text-sm text-danger">{t("pickOne")}</p>}
          </fieldset>

          {/* 2. the company — only when one of them did the job */}
          {chosen && (
            <fieldset className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <legend className="px-1 font-bold text-ink">{t("q2", { name: chosen.name })}</legend>
              <p className="mb-4 text-sm text-muted-foreground">{t("q2Hint")}</p>
              <Field label={t("stars")} error={tried && missing.companyStars ? t("starsRequired") : undefined} required>
                <StarInput value={companyStars} onChange={setCompanyStars} />
              </Field>
              <Field label={t("comment")} hint={t("optional")} className="mt-4">
                <Textarea rows={3} value={companyComment} placeholder={t("companyPh")} onChange={(e) => setCompanyComment(e.target.value)} />
              </Field>
            </fieldset>
          )}

          {/* 3. Kompass, rated separately */}
          <fieldset className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <legend className="px-1 font-bold text-ink">{t("q3")}</legend>
            <p className="mb-4 text-sm text-muted-foreground">{t("q3Hint")}</p>
            <Field label={t("stars")} error={tried && missing.kompassStars ? t("starsRequired") : undefined} required>
              <StarInput value={kompassStars} onChange={setKompassStars} />
            </Field>
            <Field label={t("comment")} hint={t("optional")} className="mt-4">
              <Textarea rows={3} value={kompassComment} placeholder={t("kompassPh")} onChange={(e) => setKompassComment(e.target.value)} />
            </Field>
          </fieldset>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> {t("publishedAs", { name: shownAs })}
            </p>
            <Button type="submit" size="lg" loading={busy}>{t("send")}</Button>
          </div>
        </form>
      )}
    </section>
  );
}
