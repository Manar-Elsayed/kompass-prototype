"use client";

import { useTranslations } from "next-intl";
import { Flag, MapPin } from "lucide-react";
import type { Address, Offer } from "@/lib/types";
import { JOB_FORMS, jobKind } from "@/lib/jobs";
import { cn, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { DL } from "@/components/admin/ui";

/** Label on the left, value on the right, one row each: quick to scan in a narrow card. */
function Rows({ items }: { items: { label: React.ReactNode; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-border/60 text-sm">
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-muted-foreground">{it.label}</dt>
          <dd className="min-w-0 text-end font-semibold text-ink [overflow-wrap:anywhere]">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The request's address(es), titled for its service ("Property to clean", "Moving from"…). */
export function JobPlaces({ offer, className }: { offer: Offer; className?: string }) {
  const t = useTranslations();
  const svc = useStore((s) => s.services.find((x) => x.id === offer.serviceId));
  const kind = jobKind(svc);
  const place = (a: Address, title: string, icon: React.ReactNode) => (
    <div className="rounded-xl bg-surface-2/70 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">{icon}{title}</p>
      <Rows
        items={[
          { label: t("common.fields.street"), value: a.street },
          { label: t("common.fields.city"), value: `${a.zip} ${a.city}` },
          ...(a.rooms ? [{ label: t("common.fields.rooms"), value: a.rooms }] : []),
          { label: t("common.fields.floor"), value: a.floor === "0" ? t("site.offerForm.floorPh") : a.floor },
          { label: t("common.fields.elevator"), value: a.elevator ? t("common.form.yes") : t("common.form.no") },
        ]}
      />
    </div>
  );
  return (
    // side by side only when this block itself is wide enough (it also sits in the narrow portal panel)
    <div className={cn("@container", className)}>
      <div className={cn("grid gap-4", offer.to && "@xl:grid-cols-2")}>
        {place(offer.from, t(`site.job.from.${kind}`), <MapPin className="size-4 text-accent" />)}
        {offer.to && place(offer.to, t(`site.job.to.${kind}`), <Flag className="size-4 text-primary" />)}
      </div>
    </div>
  );
}

/** The service-specific answers (property, amount, items…), only those the request has. */
export function JobFacts({ offer, cols = 2 }: { offer: Offer; cols?: 1 | 2 | 3 }) {
  const t = useTranslations("site.job");
  const lang = useLang();
  const svc = useStore((s) => s.services.find((x) => x.id === offer.serviceId));
  const kind = jobKind(svc);
  const j = offer.job ?? {};
  const items: { label: React.ReactNode; value: React.ReactNode }[] = [];
  if (j.propertyType) items.push({ label: t("propertyTypeLabel"), value: t(`propertyType.${j.propertyType}`) });
  if (j.areaM2) items.push({ label: t("areaLabel"), value: `${j.areaM2} m²` });
  if (j.cleaningType) items.push({ label: t("cleaningTypeLabel"), value: t(`cleaningType.${j.cleaningType}`) });
  if (j.instrument) items.push({ label: t("instrumentLabel"), value: t(`instrument.${j.instrument}`) });
  if (j.items?.length) items.push({ label: t("itemsLabel"), value: j.items.map((x) => t(`items.${x}`)).join(", ") });
  if (j.amount) items.push({ label: t(`amountLabel.${kind}`), value: t(`amount.${j.amount}`) });
  if (j.duration) items.push({ label: t("durationLabel"), value: t(`duration.${j.duration}`) });
  if (JOB_FORMS[kind].cleaningDate && j.cleaningDate) items.push({ label: t("cleaningDateLabel"), value: formatDate(j.cleaningDate, lang) });
  if (j.flexibleDate) items.push({ label: t("flexibleLabel"), value: t("flexibleYes") });
  if (j.otherNote) items.push({ label: t(`otherLabel.${kind}`), value: j.otherNote });
  if (!items.length) return null;
  return <DL items={items} cols={cols} />;
}
