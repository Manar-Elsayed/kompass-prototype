"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Check, ClipboardList, Clock, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { isLiveReview, type Review } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Avatar, Switch } from "@/components/ui/controls";
import { Stars, StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "./data-table";
import { DetailSheet, RowActions, SheetSection, actionsColumn } from "./row-actions";
import { DL, KpiCard, PageHeader } from "./ui";

/**
 * The website switch of an approved review: on = shown on the website, off = hidden but kept.
 * Pending and rejected reviews never show, so they get a dash.
 */
export function ReviewLiveSwitch({ review }: { review: Review }) {
  const t = useTranslations("admin.rows");
  const patch = useStore((s) => s.patch);
  if (review.status !== "approved") return <span className="text-muted-foreground">–</span>;
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <Switch
        checked={!review.hidden}
        aria-label={t("visibleOnWebsite")}
        onCheckedChange={(on) => {
          patch("reviews", review.id, { hidden: !on });
          toast.success(t(on ? "reviewShown" : "reviewHidden"));
        }}
      />
    </span>
  );
}

/** Shared moderation view for platform reviews and partner reviews. */
export function ReviewsModeration({ scope }: { scope: "kompass" | "partner" }) {
  const t = useTranslations();
  const tr = useTranslations("admin.reviews");
  const lang = useLang();
  const all = useStore((s) => s.reviews);
  const patch = useStore((s) => s.patch);
  const remove = useStore((s) => s.remove);
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = all.find((r) => r.id === openId);
  const reviews = all.filter((r) => (scope === "kompass" ? r.target === "kompass" : r.target !== "kompass"));
  // the average counts what visitors see
  const live = reviews.filter(isLiveReview);
  const avg = live.length ? live.reduce((a, r) => a + r.stars, 0) / live.length : 0;

  // approving shows the review on the website straight away
  const decide = (r: Review, status: "approved" | "rejected") => {
    patch("reviews", r.id, { status, hidden: false });
    toast.success(t(`common.status.${status}`));
  };
  const del = (r: Review) =>
    confirm({
      title: t("admin.del.review.title"),
      body: t("admin.del.review.body", { name: r.name }),
      tone: "danger",
      confirmLabel: t("admin.del.review.button"),
      onConfirm: () => {
        setOpenId(null);
        remove("reviews", r.id);
        toast.success(t("admin.del.review.done"));
      },
    });

  const columns: ColumnDef<Review, unknown>[] = [
    {
      id: "reviewer",
      header: tr("reviewer"),
      accessorFn: (r) => r.name,
      cell: ({ row: { original: r } }) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={r.name} className="size-8" />
          <span>
            <span className="block font-semibold text-ink">{r.name}</span>
            <span className="block text-xs text-muted-foreground" dir="ltr">{r.email}</span>
          </span>
        </span>
      ),
    },
    ...(scope === "partner"
      ? [{
          id: "target",
          header: tr("target"),
          accessorFn: (r: Review) => partnerMap[r.target]?.name ?? "–",
          cell: ({ row: { original: r } }: { row: { original: Review } }) => (
            <span>
              <Link href={`/admin/partners/${r.target}`} className="block font-semibold text-primary hover:underline">{partnerMap[r.target]?.name}</Link>
              {r.offerId && (
                <Link href={`/admin/leads/${r.offerId}`} className="text-xs text-muted-foreground hover:text-primary">
                  {tr("verifiedBooking", { id: r.offerId })}
                </Link>
              )}
            </span>
          ),
        } as ColumnDef<Review, unknown>]
      : []),
    { id: "stars", header: t("common.fields.rating"), accessorFn: (r) => r.stars, cell: (c) => <Stars value={c.getValue() as number} /> },
    { id: "comment", header: t("common.fields.comment"), accessorFn: (r) => r.comment, enableSorting: false, cell: (c) => <p className="line-clamp-2 max-w-md text-muted-foreground">{c.getValue() as string}</p> },
    { id: "date", header: t("common.fields.date"), accessorFn: (r) => r.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (r) => r.status,
      // only the state here; Approve / Reject are in the ⋯ menu and the review popup
      cell: (c) => <StatusBadge status={c.getValue() as string} />,
    },
    {
      id: "live",
      header: t("admin.rows.onWebsite"),
      accessorFn: (r) => (isLiveReview(r) ? 1 : 0),
      cell: ({ row: { original: r } }) => <ReviewLiveSwitch review={r} />,
    },
    actionsColumn<Review>((r) => (
      <RowActions
        onView={() => setOpenId(r.id)}
        actions={[
          { label: t("common.actions.approve"), icon: <Check />, onSelect: () => decide(r, "approved"), hidden: r.status === "approved" },
          { label: t("common.actions.reject"), icon: <X />, tone: "danger", onSelect: () => decide(r, "rejected"), hidden: r.status === "rejected" },
          { label: t("admin.rows.openCompany"), icon: <Building2 />, href: `/admin/partners/${r.target}`, hidden: scope !== "partner", separated: true },
          { label: t("admin.rows.openBooking"), icon: <ClipboardList />, href: r.offerId ? `/admin/leads/${r.offerId}` : undefined, hidden: !r.offerId },
          { label: t("common.actions.delete"), icon: <Trash2 />, tone: "danger", onSelect: () => del(r), separated: true },
        ]}
      />
    )),
  ];

  return (
    <>
      <PageHeader title={tr(scope === "kompass" ? "kompassTitle" : "partnerTitle")} subtitle={tr(scope === "kompass" ? "kompassSub" : "partnerSub")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={tr("avg")} value={avg.toFixed(2)} icon={<Star />} tone="warning" footer={<Stars value={avg} />} />
        <KpiCard label={tr("total")} value={reviews.length} icon={<Check />} />
        <KpiCard label={tr("pendingCount")} value={reviews.filter((r) => r.status === "pending").length} icon={<Clock />} tone="accent" />
      </div>
      <DataTable
        data={reviews}
        columns={columns}
        search={(r) => `${r.name} ${r.email} ${r.comment} ${partnerMap[r.target]?.name ?? ""}`}
        searchPlaceholder={tr(scope === "kompass" ? "kompassSearchPh" : "partnerSearchPh")}
        onRowClick={(r) => setOpenId(r.id)}
        rowClassName={(r) => (r.status === "pending" ? "bg-warning-soft/25" : undefined)}
        filters={[
          { id: "status", label: t("common.fields.status"), options: (["pending", "approved", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (r) => r.status },
          { id: "stars", label: t("common.fields.rating"), options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) })), get: (r) => String(r.stars) },
          { id: "live", label: t("admin.rows.onWebsite"), options: [{ value: "shown", label: t("admin.rows.shown") }, { value: "hidden", label: t("admin.rows.hiddenShort") }], get: (r) => (isLiveReview(r) ? "shown" : r.status === "approved" ? "hidden" : "") },
        ]}
      />
      <DetailSheet
        open={!!open}
        onOpenChange={(v) => !v && setOpenId(null)}
        title={open?.name}
        badge={open && <StatusBadge status={open.status} />}
        subtitle={open && formatDateTime(open.createdAt, lang)}
        footer={
          open ? (
            <>
              <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => del(open)}><Trash2 /> {t("common.actions.delete")}</Button>
              {open.status !== "rejected" && (
                <Button variant="danger-soft" onClick={() => decide(open, "rejected")}><X /> {t("common.actions.reject")}</Button>
              )}
              {open.status !== "approved" && (
                <Button variant="success" className="flex-1" onClick={() => decide(open, "approved")}><Check /> {t("common.actions.approve")}</Button>
              )}
            </>
          ) : undefined
        }
      >
        {open && (
          <>
            <SheetSection>
              <Stars value={open.stars} size="md" />
              <p className="mt-3 whitespace-pre-line text-sm text-foreground">“{open.comment}”</p>
            </SheetSection>
            <SheetSection>
              <DL
                items={[
                  { label: tr("reviewer"), value: open.name },
                  { label: t("common.fields.email"), value: open.email, ltr: true },
                  ...(scope === "partner"
                    ? [
                        { label: tr("target"), value: <Link href={`/admin/partners/${open.target}`} className="font-semibold text-primary hover:underline">{partnerMap[open.target]?.name ?? "–"}</Link> },
                        { label: t("admin.rows.booking"), value: open.offerId ? <Link href={`/admin/leads/${open.offerId}`} className="font-mono font-semibold text-primary hover:underline">{open.offerId}</Link> : t("admin.rows.noBooking") },
                      ]
                    : []),
                ]}
              />
            </SheetSection>
            {/* only an approved review can be shown; the switch publishes or unpublishes it */}
            {open.status === "approved" && (
              <SheetSection>
                <label className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
                  {t("admin.rows.visibleOnWebsite")}
                  <ReviewLiveSwitch review={open} />
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {open.hidden ? t("admin.rows.unpublishedNote") : t(scope === "partner" ? "admin.rows.publishedPartner" : "admin.rows.publishedKompass")}
                </p>
              </SheetSection>
            )}
          </>
        )}
      </DetailSheet>
      {dialog}
    </>
  );
}
