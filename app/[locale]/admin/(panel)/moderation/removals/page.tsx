"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { RemovalRequest } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Stars, StatusBadge, useConfirm } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";

export default function RemovalsPage() {
  const t = useTranslations();
  const tr = useTranslations("admin.reviews");
  const lang = useLang();
  const removals = useStore((s) => s.removals);
  const reviews = useStore((s) => s.reviews);
  const patch = useStore((s) => s.patch);
  const remove = useStore((s) => s.remove);
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();
  const reviewMap = Object.fromEntries(reviews.map((r) => [r.id, r]));

  const approve = (rr: RemovalRequest) =>
    confirm({
      title: t("common.confirm.title"),
      body: tr("removalsSub"),
      tone: "danger",
      confirmLabel: t("common.actions.approve"),
      onConfirm: () => {
        patch("removals", rr.id, { status: "approved" });
        remove("reviews", rr.reviewId);
        toast.success(tr("removed"));
      },
    });

  return (
    <>
      <PageHeader title={tr("removalsTitle")} subtitle={tr("removalsSub")} />
      {removals.length === 0 ? (
        <Card><EmptyState title={t("common.table.noResults")} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {removals.map((rr) => {
            const r = reviewMap[rr.reviewId];
            const p = partnerMap[rr.partnerId];
            return (
              <Card key={rr.id} className="flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <Link href={`/admin/partners/${rr.partnerId}`} className="font-bold text-ink hover:text-primary">{p?.name}</Link>
                  <StatusBadge status={rr.status} />
                </div>
                <div className="mt-4 rounded-xl bg-surface-2 p-4">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{tr("review")}</p>
                  {r ? (
                    <>
                      <Stars value={r.stars} />
                      <p className="mt-1.5 text-sm">“{r.comment}”</p>
                      <p className="mt-1 text-xs text-muted-foreground">{r.name} · {formatDate(r.createdAt, lang)}</p>
                    </>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">{tr("removed")}</p>
                  )}
                </div>
                <div className="mt-3 rounded-xl border border-dashed p-4">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{tr("reason")}</p>
                  <p className="text-sm">{rr.reason}</p>
                </div>
                {rr.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { patch("removals", rr.id, { status: "rejected" }); toast.success(t("common.status.rejected")); }}>
                      <X /> {t("common.actions.reject")}
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={() => approve(rr)}>
                      <Check /> {t("common.actions.approve")}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {dialog}
    </>
  );
}
