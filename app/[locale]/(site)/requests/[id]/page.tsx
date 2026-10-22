"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, BadgeCheck, CalendarDays, CheckCircle2, Hourglass, MapPin, Phone, ShieldCheck, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { LeadStatus } from "@/lib/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useHydrated, useL, useLang, usePartnerRatings } from "@/lib/mock/hooks";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, Stars } from "@/components/shared/bits";
import { ReviewDialog } from "@/components/site/review-form";
import { PriceEstimate } from "@/components/site/request-bits";

const STATUS_TONE: Record<LeadStatus, "info" | "primary" | "success" | "neutral" | "danger"> = {
  new: "info",
  in_progress: "primary",
  completed: "success",
  expired: "neutral",
  cancelled: "danger",
};

/**
 * The customer's own page for one request, opened from the link in the confirmation email: the companies
 * that received it, which one they booked, a review for that company and one for Kompass (kept apart),
 * and a no-show report.
 */
export default function RequestPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("site.request");
  const L = useL();
  const lang = useLang();
  const hydrated = useHydrated();
  const offer = useStore((s) => s.offers.find((o) => o.id === id));
  const svc = useStore((s) => s.services.find((x) => x.id === offer?.serviceId));
  const allOrders = useStore((s) => s.orders);
  const partners = useStore((s) => s.partners);
  const reviews = useStore((s) => s.reviews);
  const chooseCompany = useStore((s) => s.chooseCompany);
  const reportNoShow = useStore((s) => s.reportNoShow);
  const ratings = usePartnerRatings();
  const [reviewing, setReviewing] = useState<"company" | "kompass" | null>(null);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!hydrated)
    return (
      <section className="container-page max-w-4xl space-y-4 py-12">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40" />
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
  const chosen = partners.find((p) => p.id === offer.chosenPartnerId);
  const companyReviewed = reviews.some((r) => r.offerId === offer.id && r.target === offer.chosenPartnerId);
  const reviewer = offer.requester ?? offer;
  const noShow = offer.noShow;
  const replacement = partners.find((p) => p.id === noShow?.replacementPartnerId);
  const missing = partners.find((p) => p.id === noShow?.partnerId);
  const open = offer.status === "new" || offer.status === "in_progress" || offer.status === "completed";

  return (
    <section className="container-page max-w-4xl py-10 sm:py-14">
      <p className="text-sm font-semibold text-primary">{t("eyebrow")}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{svc ? L(svc.name) : offer.id}</h1>
        <Badge tone={STATUS_TONE[offer.status]} dot>{t(`status.${offer.status}`)}</Badge>
      </div>
      <p className="mt-2 text-muted-foreground">{t(`statusHint.${offer.status}`, { count: offer.offersWanted })}</p>

      <dl className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{t("reference")}</dt>
          <dd className="mt-0.5 font-mono font-bold text-ink" dir="ltr">{offer.id}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-3.5" /> {t("route")}</dt>
          <dd className="mt-0.5 font-semibold text-ink">{offer.from.city} → {offer.to.city}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="size-3.5" /> {t("date")}</dt>
          <dd className="mt-0.5 font-semibold text-ink">{formatDate(offer.executionDate, lang)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground"><Users className="size-3.5" /> {t("quota")}</dt>
          <dd className="mt-0.5 font-semibold text-ink">{t("quotaValue", { sold: companies.length, count: offer.offersWanted })}</dd>
        </div>
        {offer.booking !== "personal" && (
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-muted-foreground">{t("bookedFor")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">
              {offer.firstName} {offer.lastName}
            </dd>
          </div>
        )}
      </dl>

      {/* companies */}
      <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold text-ink">{t("companiesTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("companiesHint")}</p>
        {companies.length ? (
          <ul className="mt-5 divide-y rounded-xl border">
            {companies.map((p) => {
              const isChosen = p.id === offer.chosenPartnerId;
              const r = ratings[p.id];
              return (
                <li key={p.id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", isChosen && "bg-success-soft/40")}>
                  <CompanyLogo partnerId={p.id} name={p.name} className="size-11 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {p.name}
                      {isChosen && <Badge tone="success"><BadgeCheck /> {t("yourCompany")}</Badge>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Stars value={r?.avg ?? 0} /> {r ? `${r.avg.toFixed(1)} (${r.count})` : t("noRating")}</span>
                      <span>{p.city}</span>
                      <a href={`tel:${p.phone}`} className="flex items-center gap-1 hover:text-primary" dir="ltr"><Phone className="size-3" /> {p.phone}</a>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/companies/${p.id}`}>{t("profile")}</Link>
                    </Button>
                    {!isChosen && !noShow && (
                      <Button
                        size="sm"
                        variant={chosen ? "outline" : "default"}
                        onClick={() => {
                          chooseCompany(offer.id, p.id);
                          toast.success(t("chosenToast", { name: p.name }));
                        }}
                      >
                        {t(chosen ? "switchTo" : "choose")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState className="py-10" icon={<Hourglass />} title={t("noCompanies")} body={t("noCompaniesHint")} />
        )}
      </div>

      {/* reviews: the company and Kompass are rated separately */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 font-bold text-ink"><Star className="size-4 text-accent" /> {chosen ? t("rateCompany", { name: chosen.name }) : t("rateCompanyGeneric")}</p>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">{t("rateCompanyHint")}</p>
          {companyReviewed ? (
            <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-success"><CheckCircle2 className="size-4" /> {t("reviewThanks")}</p>
          ) : (
            <Button className="mt-4 w-fit" variant="outline" disabled={!chosen} onClick={() => setReviewing("company")}>
              {chosen ? t("writeReview") : t("chooseFirst")}
            </Button>
          )}
        </div>
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 font-bold text-ink"><ShieldCheck className="size-4 text-primary" /> {t("rateKompass")}</p>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">{t("rateKompassHint")}</p>
          <Button className="mt-4 w-fit" variant="outline" onClick={() => setReviewing("kompass")}>{t("writeReview")}</Button>
        </div>
      </div>

      {/* no-show */}
      {chosen && open && (
        <div className={cn("mt-6 rounded-2xl border p-5 sm:p-6", noShow ? "border-warning/40 bg-warning-soft/40" : "border-border bg-surface")}>
          {noShow ? (
            <>
              <p className="flex items-center gap-2 font-bold text-ink"><AlertTriangle className="size-4 text-warning" /> {t("noShowReported", { name: missing?.name ?? "" })}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(noShow.reportedAt, lang)}</p>
              <p className="mt-3 text-sm text-foreground/90">
                {noShow.status === "open"
                  ? t("noShowOpen")
                  : replacement
                    ? t("noShowReplaced", { name: replacement.name })
                    : t("noShowResolved")}
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-ink">{t("noShowTitle", { name: chosen.name })}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("noShowHint")}</p>
              </div>
              <Button variant="danger-soft" className="shrink-0" onClick={() => setNoShowOpen(true)}>
                <AlertTriangle /> {t("noShowButton")}
              </Button>
            </div>
          )}
        </div>
      )}

      {svc && <PriceEstimate service={svc} className="mt-6" />}

      <Dialog open={noShowOpen} onOpenChange={setNoShowOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("noShowTitle", { name: chosen?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("noShowDialogHint")}</DialogDescription>
          </DialogHeader>
          <Field label={t("noShowNote")} hint={t("noShowNoteHint")}>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoShowOpen(false)}>{t("cancel")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                reportNoShow(offer.id, note.trim());
                setNoShowOpen(false);
                setNote("");
                toast.success(t("noShowToast"));
              }}
            >
              {t("noShowSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewDialog
        open={reviewing === "company"}
        onOpenChange={(v) => !v && setReviewing(null)}
        title={chosen ? t("rateCompany", { name: chosen.name }) : undefined}
        target={offer.chosenPartnerId}
        offerId={offer.id}
        defaults={{ name: `${reviewer.firstName} ${reviewer.lastName}`, email: reviewer.email }}
      />
      <ReviewDialog
        open={reviewing === "kompass"}
        onOpenChange={(v) => !v && setReviewing(null)}
        title={t("rateKompass")}
        target="kompass"
        defaults={{ name: `${reviewer.firstName} ${reviewer.lastName[0] ?? ""}.`, email: reviewer.email }}
      />
    </section>
  );
}
