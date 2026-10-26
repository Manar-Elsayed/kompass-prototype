"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Flag, MessageSquareQuote, Star } from "lucide-react";
import { toast } from "sonner";
import { isLiveReview, type Review } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useLang, usePartnerRatings } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar, Progress } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, Stars, StatusBadge } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";

export default function PartnerReviews() {
  const t = useTranslations("portal.reviews");
  const tc = useTranslations("common");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const reviews = useStore((s) => s.reviews).filter((r) => r.target === partner.id && isLiveReview(r));
  const removals = useStore((s) => s.removals).filter((r) => r.partnerId === partner.id);
  const request = useStore((s) => s.requestReviewRemoval);
  const rating = usePartnerRatings()[partner.id];
  const [target, setTarget] = useState<Review | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const removalOf = (id: string) => removals.find((r) => r.reviewId === id);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.stars === n).length }));
  const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/${lang}/companies/${partner.id}` : "";

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="p-5 text-center">
            <p className="text-5xl font-extrabold text-ink">{rating?.avg.toFixed(1) ?? "–"}</p>
            <Stars value={rating?.avg ?? 0} size="md" className="mt-2" />
            <p className="mt-1 text-sm text-muted-foreground">{t("total")}: {reviews.length}</p>
            <div className="mt-5 space-y-1.5 text-start">
              {dist.map((d) => (
                <div key={d.n} className="flex items-center gap-3 text-sm">
                  <span className="flex w-6 items-center gap-0.5 font-semibold">{d.n}<Star className="size-3 fill-amber-400 text-amber-400" /></span>
                  <Progress value={reviews.length ? (d.c / reviews.length) * 100 : 0} tone="accent" className="h-1.5" />
                  <span className="w-6 text-end text-muted-foreground">{d.c}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <MessageSquareQuote className="mb-2 size-6 text-accent" />
            <p className="font-bold text-ink">{t("shareTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("shareBody")}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                navigator.clipboard?.writeText(profileUrl);
                toast.success(tc("toast.copied"));
              }}
            >
              <Copy /> {t("copyLink")}
            </Button>
          </Card>
        </div>

        <div className="grid content-start gap-3 md:grid-cols-2">
          {reviews.length ? (
            reviews.map((r) => {
              const rr = removalOf(r.id);
              return (
                <Card key={r.id} className="flex flex-col p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.name} className="size-9" />
                      <div>
                        <p className="text-sm font-semibold text-ink">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.createdAt, lang)}</p>
                      </div>
                    </div>
                    <Stars value={r.stars} />
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed">“{r.comment}”</p>
                  <div className="mt-4 flex items-center justify-end border-t pt-3">
                    {rr ? (
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">{t("removalPending")} <StatusBadge status={rr.status} /></span>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setReason(""); setTarget(r); }}>
                        <Flag /> {t("requestRemoval")}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="md:col-span-2"><EmptyState icon={<Star />} title={t("empty")} /></Card>
          )}
        </div>
      </div>

      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removalTitle")}</DialogTitle>
            <DialogDescription>{t("removalBody")}</DialogDescription>
          </DialogHeader>
          {target && (
            <div className="rounded-xl bg-surface-2 p-4 text-sm">
              <Stars value={target.stars} />
              <p className="mt-1.5">“{target.comment}”</p>
              <Badge className="mt-2">{target.name}</Badge>
            </div>
          )}
          <Field label={t("reason")} required error={reason && reason.trim().length < 10 ? tc("form.minLength") : undefined}>
            <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>{tc("actions.cancel")}</Button>
            <Button
              loading={busy}
              disabled={reason.trim().length < 10}
              onClick={async () => {
                setBusy(true);
                await mock(() => request(target!.id, partner.id, reason.trim()));
                setBusy(false);
                setTarget(null);
                toast.success(t("sent"));
              }}
            >
              {tc("actions.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
