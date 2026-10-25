"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import type { Offer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { StarInput } from "@/components/shared/bits";

export interface SurveyAnswers {
  /** The company that did the job: always one of those that bought the request. */
  companyId: string;
  companyStars: number;
  companyComment: string;
  kompassStars: number;
  kompassComment: string;
  complaint: string;
}

/**
 * The review survey form: which company did the job (among those that bought the request), its
 * rating, the Kompass rating (asked first) and an optional complaint. Sending it agrees to publishing. The customer page submits it; the admin
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
    companyStars: !companyStars,
    kompassStars: !kompassStars,
  };
  const valid = !missing.company && !missing.companyStars && !missing.kompassStars;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!valid || !onSubmit || !chosen) return;
    setBusy(true);
    await onSubmit({ companyId: chosen.id, companyStars, companyComment: companyComment.trim(), kompassStars, kompassComment: kompassComment.trim(), complaint: complaint.trim() });
    setBusy(false);
  };

  const fieldset = "rounded-2xl border border-border bg-surface p-5 sm:p-6";

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      {/* 1. Kompass first: every customer can answer it */}
      <fieldset className={fieldset}>
        <legend className="px-1 font-bold text-ink">{t("kompassQ")}</legend>
        <p className="mb-4 text-sm text-muted-foreground">{t("kompassHint")}</p>
        <Field label={t("stars")} error={tried && missing.kompassStars ? t("starsRequired") : undefined} required>
          <StarInput value={kompassStars} onChange={setKompassStars} />
        </Field>
        <Field label={t("comment")} hint={t("optional")} className="mt-4">
          <Textarea rows={3} value={kompassComment} placeholder={t("kompassPh")} onChange={(e) => setKompassComment(e.target.value)} />
        </Field>
      </fieldset>

      {/* 2. which company did the job */}
      <fieldset className={fieldset}>
        <legend className="px-1 font-bold text-ink">{t("companyQ")}</legend>
        <p className="mb-4 text-sm text-muted-foreground">{t("companyHint")}</p>
        <div className="grid gap-2" role="radiogroup" aria-invalid={tried && missing.company}>
          {companies.map((c) => (
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
              <CompanyLogo partnerId={c.id} name={c.name} className="size-10 rounded-xl" />
              <span>
                <span className="block font-semibold text-ink">{c.name}</span>
                {c.city && <span className="block text-xs text-muted-foreground">{c.city}</span>}
              </span>
            </button>
          ))}
        </div>
        {tried && missing.company && <p className="mt-2 text-sm text-danger">{t("pickOne")}</p>}
      </fieldset>

      {/* 3. the company chosen above */}
      <fieldset className={fieldset}>
        <legend className="px-1 font-bold text-ink">{chosen ? t("rateQ", { name: chosen.name }) : t("rateQPick")}</legend>
        <p className="mb-4 text-sm text-muted-foreground">{t("rateHint")}</p>
        <Field label={t("stars")} error={tried && missing.companyStars ? t("starsRequired") : undefined} required>
          <StarInput value={companyStars} onChange={setCompanyStars} />
        </Field>
        <Field label={t("comment")} hint={t("optional")} className="mt-4">
          <Textarea rows={3} value={companyComment} placeholder={t("companyPh")} onChange={(e) => setCompanyComment(e.target.value)} />
        </Field>
      </fieldset>


      {/* 4. a complaint, kept private */}
      <fieldset className={fieldset}>
        <legend className="px-1 font-bold text-ink">{t("problemQ")}</legend>
        <p className="mb-4 text-sm text-muted-foreground">{t("problemHint")}</p>
        <Field label={t("complaint")} hint={t("optional")}>
          <Textarea rows={3} value={complaint} placeholder={t("complaintPh")} onChange={(e) => setComplaint(e.target.value)} />
        </Field>
      </fieldset>

      {/* sending the answers is the agreement to publish them: said plainly, right before the button */}
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>{t("shareNote", { name: shownAs })}</span>
      </p>

      {!preview && (
        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={busy}>{t("send")}</Button>
        </div>
      )}
    </form>
  );
}
