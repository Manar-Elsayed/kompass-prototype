"use client";

import { useTranslations } from "next-intl";
import type { Partner } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useLang } from "@/lib/mock/hooks";
import { documentState, type DocState } from "@/lib/mock/selectors";
import { Badge } from "@/components/ui/badge";

const TONE: Record<DocState, "success" | "warning" | "info" | "danger"> = {
  ok: "success",
  expiring: "warning",
  review: "info",
  expired: "danger",
  missing: "danger",
};

// the date is the first expiry; it only means something for these states
const DATE_KEY: Partial<Record<DocState, string>> = { ok: "dateUntil", expiring: "dateOn", expired: "dateSince" };

/**
 * Overall state of a company's required documents. Under a "Documents" heading (tables, tabs) the
 * short label is enough; on its own (next to the company name) it says "Documents …".
 * withDate adds what the date means: valid until, expires on, expired since.
 */
export function DocStateBadge({ partner, withDate, standalone }: { partner: Pick<Partner, "documents">; withDate?: boolean; standalone?: boolean }) {
  const t = useTranslations("admin.partners.docs");
  const lang = useLang();
  const d = documentState(partner);
  return (
    <span className={withDate ? "flex flex-col items-start gap-0.5 whitespace-nowrap" : "inline-flex items-center whitespace-nowrap"}>
      <Badge tone={TONE[d.state]} dot>
        {t(`${standalone ? "stateLong" : "state"}.${d.state}`)}
      </Badge>
      {withDate && d.next && DATE_KEY[d.state] && (
        <span className="text-xs text-muted-foreground">{t(DATE_KEY[d.state]!, { date: formatDate(d.next.date, lang) })}</span>
      )}
    </span>
  );
}
