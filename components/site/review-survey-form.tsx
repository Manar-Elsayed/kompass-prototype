"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleSlash, Lock } from "lucide-react";
import type { Offer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { StarInput } from "@/components/shared/bits";

const NONE = "none";

export interface SurveyAnswers {
  /** The company that did the job, or null when none of them did. */
  companyId: string | null;
  companyStars: number;
  companyComment: string;
  kompassStars: number;
  kompassComment: string;
  complaint: string;
}

/**
 * The review survey form: which company did the job (among those that bought the request), its
 * rating, the Kompass rating and an optional complaint. The customer page submits it; the admin
 * shows it as a preview before sending the survey, where nothing is saved.
 */
export function ReviewSurveyForm({ offer, preview, onSubmit }: { offer: Offer; preview?: boolean; onSubmit?: (a: SurveyAnswers) => Promise<void> }) {
  const t = useTranslations("site.survey");
  const allOrders = useStore((s) => s.orders);
  const partners = useStore((s) => s.partners);
  const [company, setCompany] = useState("");
  const [companyStars, setCompanyStars] = useState(0);
  const [companyComment, setCompanyComment] = useState("");
  const [kompassStars, setKompassStars] = useState(0);
  const [kompassComment, setKompassComment] = useState("");
  const [complaint, setComplaint] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  const companies = allOrders
    .filter((o) => o.offerId === offer.id)
    .map((o) => partners.find((p) => p.id === o.partnerId))
    .filter((p): p is NonNullable<typeof p> => !!p);
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
    if (!valid || !onSubmit) return;
    setBusy(true);
    await onSubmit({ companyId: chosen?.id ?? null, companyStars, companyComment: companyComment.trim(), kompassStars, kompassComment: kompassComment.trim(), complaint: complaint.trim() });
    setBusy(false);
  };

  const fieldset = "rounded-2xl border border-border bg-surface p-5 sm:p-6";

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      {/* 1. which company did the job */}
      <fieldset className={fieldset}>
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
        <fieldset className={fieldset}>
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
      <fieldset className={fieldset}>
        <legend className="px-1 font-bold text-ink">{t(chosen ? "q3" : "q3NoCompany")}</legend>
        <p className="mb-4 text-sm text-muted-foreground">{t("q3Hint")}</p>
        <Field label={t("stars")} error={tried && missing.kompassStars ? t("starsRequired") : undefined} required>
          <StarInput value={kompassStars} onChange={setKompassStars} />
        </Field>
        <Field label={t("comment")} hint={t("optional")} className="mt-4">
          <Textarea rows={3} value={kompassComment} placeholder={t("kompassPh")} onChange={(e) => setKompassComment(e.target.value)} />
        </Field>
      </fieldset>

      {/* 4. a complaint, kept private */}
      <fieldset className={fieldset}>
        <legend className="px-1 font-bold text-ink">{t(chosen ? "q4" : "q4NoCompany")}</legend>
        <p className="mb-4 text-sm text-muted-foreground">{t("q4Hint")}</p>
        <Field label={t("complaint")} hint={t("optional")}>
          <Textarea rows={3} value={complaint} placeholder={t("complaintPh")} onChange={(e) => setComplaint(e.target.value)} />
        </Field>
      </fieldset>

      {!preview && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> {t("publishedAs", { name: shownAs })}
          </p>
          <Button type="submit" size="lg" loading={busy}>{t("send")}</Button>
        </div>
      )}
    </form>
  );
}
