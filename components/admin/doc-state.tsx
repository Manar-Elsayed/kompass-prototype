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

/** Overall state of a company's required documents, with the next expiry date when relevant. */
export function DocStateBadge({ partner, withDate }: { partner: Pick<Partner, "documents">; withDate?: boolean }) {
  const t = useTranslations("admin.partners.docs");
  const lang = useLang();
  const d = documentState(partner);
  return (
    <span className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
      <Badge tone={TONE[d.state]} dot>
        {t(`state.${d.state}`)}
      </Badge>
      {withDate && d.next && d.state !== "missing" && <span className="text-xs text-muted-foreground">{formatDate(d.next.date, lang)}</span>}
    </span>
  );
}
