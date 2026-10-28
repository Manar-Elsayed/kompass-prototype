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
import { DataTable, type ColumnDef } from "@/components/admin/data-table";

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

  const columns: ColumnDef<Review, unknown>[] = [
    {
      id: "customer",
      header: tc("fields.name"),
      accessorFn: (r) => r.name,
      cell: ({ row: { original: r } }) => (
        <span className="flex items-center gap-2.5 whitespace-nowrap">
          <Avatar name={r.name} className="size-8" />
          <span className="font-semibold text-ink">{r.name}</span>
        </span>
      ),
    },
    { id: "stars", header: tc("fields.rating"), accessorFn: (r) => r.stars, cell: ({ row: { original: r } }) => <Stars value={r.stars} /> },
    {
      id: "comment",
      header: tc("fields.comment"),
      accessorFn: (r) => r.comment,
      enableSorting: false,
      cell: ({ row: { original: r } }) => <p className="line-clamp-2 min-w-48 max-w-xl text-sm leading-relaxed" title={r.comment}>“{r.comment}”</p>,
    },
    { id: "date", header: tc("fields.date"), accessorFn: (r) => r.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "removal",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: r } }) => {
        const rr = removalOf(r.id);
        return rr ? (
          <span className="flex items-center justify-end gap-2 whitespace-nowrap text-xs text-muted-foreground">{t("removalPending")} <StatusBadge status={rr.status} /></span>
        ) : (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setReason(""); setTarget(r); }}>
              <Flag /> {t("requestRemoval")}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="mb-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Card className="grid items-center gap-6 p-5 sm:grid-cols-[auto_1fr]">
            <div className="text-center sm:border-e sm:pe-8">
              <p className="text-5xl font-extrabold text-ink">{rating?.avg.toFixed(1) ?? "–"}</p>
              <Stars value={rating?.avg ?? 0} size="md" className="mt-2 justify-center" />
              <p className="mt-1 text-sm text-muted-foreground">{t("total")}: {reviews.length}</p>
            </div>
            <div className="space-y-1.5">
              {dist.map((d) => (
                <div key={d.n} className="flex items-center gap-3 text-sm">
                  <span className="flex w-6 items-center gap-0.5 font-semibold">{d.n}<Star className="size-3 fill-amber-400 text-amber-400" /></span>
                  <Progress value={reviews.length ? (d.c / reviews.length) * 100 : 0} tone="accent" className="h-1.5" />
                  <span className="w-6 text-end text-muted-foreground">{d.c}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="flex flex-col p-5">
            <MessageSquareQuote className="mb-2 size-6 text-accent" />
            <p className="font-bold text-ink">{t("shareTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("shareBody")}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 self-start"
              onClick={() => {
                navigator.clipboard?.writeText(profileUrl);
                toast.success(tc("toast.copied"));
              }}
            >
              <Copy /> {t("copyLink")}
            </Button>
          </Card>
      </div>

      <DataTable
        data={reviews}
        columns={columns}
        heading={<p className="font-bold text-ink">{t("allReviews")}</p>}
        search={(r) => `${r.name} ${r.comment}`}
        searchPlaceholder={t("searchPh")}
        initialSort={[{ id: "date", desc: true }]}
        filters={[{ id: "stars", label: tc("fields.rating"), options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ★` })), get: (r) => String(r.stars) }]}
        emptyState={<EmptyState icon={<Star />} title={t("empty")} />}
      />

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
