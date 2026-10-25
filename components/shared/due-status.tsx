"use client";

import { useTranslations } from "next-intl";
import type { PartnerDue } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const TONE: Record<PartnerDue["status"], "warning" | "success" | "danger"> = { pending: "warning", confirmed: "success", canceled: "danger" };

/**
 * Status of an uploaded payment receipt, in the same words as the admin's buttons:
 * waiting for check → approved / rejected. Kept apart from the shared statuses, where
 * "confirmed" and "canceled" mean other things (e.g. fake-offer reports).
 */
export function DueStatusBadge({ status }: { status: PartnerDue["status"] }) {
  const t = useTranslations("common.dueStatus");
  return (
    <Badge tone={TONE[status]} dot>
      {t(status)}
    </Badge>
  );
}
