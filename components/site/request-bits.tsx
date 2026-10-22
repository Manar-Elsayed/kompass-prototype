"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Info, Lock, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Offer, Service } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang } from "@/lib/mock/hooks";
import { routeFull } from "@/lib/jobs";

/** "CHF 900 – 2,400", the typical range customers see before they get real offers. */
export function priceRange(svc: Pick<Service, "estimate">, lang: string) {
  return `${formatCHF(svc.estimate.from, lang)} – ${formatCHF(svc.estimate.to, lang)}`;
}

/** Typical price for a service, always with what it is based on and that it isn't a quote. */
export function PriceEstimate({ service, className, compact }: { service: Service; className?: string; compact?: boolean }) {
  const t = useTranslations("site.estimate");
  const L = useL();
  const lang = useLang();
  if (!service.estimate.to) return null;
  if (compact)
    return (
      <p className={cn("text-sm", className)}>
        <span className="text-muted-foreground">{t("from")} </span>
        <span className="font-bold text-ink tabular-nums">{formatCHF(service.estimate.from, lang)}</span>
      </p>
    );
  return (
    <div className={cn("rounded-xl border border-border bg-surface-2/60 p-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("title")}</p>
      <p className="mt-1 text-xl font-bold text-ink tabular-nums">{priceRange(service, lang)}</p>
      {L(service.estimate.basis) && <p className="mt-0.5 text-sm text-foreground/80">{L(service.estimate.basis)}</p>}
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" /> {t("disclaimer")}
      </p>
    </div>
  );
}

/** From / To / Subject block of an email preview. */
function EmailHeader({ label, to, subject }: { label: string; to: string; subject: string }) {
  const t = useTranslations("site.confirmEmail");
  return (
    <header className="grid gap-1 border-b bg-surface-2/70 px-5 py-3 text-xs">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Mail className="size-3.5 text-primary" /> {label}
      </p>
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">{t("fromLabel")}</span> Kompass &lt;hello@kompassumzug.ch&gt;
      </p>
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">{t("toLabel")}</span> <span dir="ltr">{to}</span>
      </p>
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">{t("subjectLabel")}</span> {subject}
      </p>
    </header>
  );
}

/** What the customer (or the person who booked for them) receives right after submitting. */
export function ConfirmationEmail({ offer }: { offer: Offer }) {
  const t = useTranslations("site.confirmEmail");
  const L = useL();
  const lang = useLang();
  const svc = useStore((s) => s.services.find((x) => x.id === offer.serviceId));
  const to = offer.requester ?? { firstName: offer.firstName, lastName: offer.lastName, email: offer.email };
  const forOther = offer.booking !== "personal";
  const rows: [string, string][] = [
    [t("service"), svc ? L(svc.name) : "–"],
    [t("route"), routeFull(offer)],
    [t("date"), formatDate(offer.executionDate, lang)],
    [t("companies"), t("companiesValue", { count: offer.offersWanted })],
  ];
  if (forOther) rows.unshift([t("for"), `${offer.firstName} ${offer.lastName}`]);
  if (offer.organization) rows.unshift([t("organization"), offer.organization.name]);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface text-start shadow-card" aria-label={t("label")}>
      <EmailHeader label={t("label")} to={to.email} subject={t("subject", { id: offer.id })} />
      <div className="grid gap-4 px-5 py-5 text-sm">
        <p className="text-foreground">{t("hello", { name: to.firstName })}</p>
        <p className="text-foreground/90">{forOther ? t("introOther", { name: `${offer.firstName} ${offer.lastName}` }) : t("intro")}</p>
        <dl className="divide-y rounded-xl border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-end font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        {svc && svc.estimate.to > 0 && (
          <p className="text-foreground/90">
            {t("estimate", { range: priceRange(svc, lang) })} <span className="text-muted-foreground">{t("estimateNote")}</span>
          </p>
        )}
        <p className="text-foreground/90">{t("choose")}</p>
        <p className="flex items-start gap-1.5 border-t pt-4 text-xs text-muted-foreground">
          <Lock className="mt-px size-3.5 shrink-0" /> {t("privacy", { count: offer.offersWanted })}
        </p>
      </div>
    </article>
  );
}

/** Sent the day after the move date: the customer's only way back to Kompass after the request. */
export function SurveyEmail({ offer }: { offer: Offer }) {
  const t = useTranslations("site.surveyEmail");
  const lang = useLang();
  const to = offer.requester ?? { firstName: offer.firstName, email: offer.email };
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface text-start shadow-card" aria-label={t("label")}>
      <EmailHeader label={t("label")} to={to.email} subject={t("subject", { id: offer.id })} />
      <div className="grid gap-4 px-5 py-5 text-sm">
        <p className="text-foreground">{t("hello", { name: to.firstName })}</p>
        <p className="text-foreground/90">{t("body", { date: formatDate(offer.executionDate, lang) })}</p>
        <ul className="list-disc space-y-1 ps-5 text-foreground/90">
          <li>{t("point1")}</li>
          <li>{t("point2")}</li>
          <li>{t("point3")}</li>
        </ul>
        <Link
          href={`/requests/${offer.id}`}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          {t("cta")} <ArrowRight className="size-4" />
        </Link>
        <p className="border-t pt-4 text-xs text-muted-foreground">{t("footer")}</p>
      </div>
    </article>
  );
}
