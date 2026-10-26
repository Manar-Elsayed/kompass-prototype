"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, ClipboardList, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { RemovalRequest } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Stars, StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DetailSheet, RowActions, SheetSection, actionsColumn } from "@/components/admin/row-actions";
import { PageHeader } from "@/components/admin/ui";

/**
 * Companies asking for a review to be removed. Remove review deletes it from their page and rating;
 * Keep review leaves it. The review, the reason and the decision are in the popup.
 */
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
  const [openId, setOpenId] = useState<string | null>(null);
  const reviewMap = Object.fromEntries(reviews.map((r) => [r.id, r]));
  const open = removals.find((rr) => rr.id === openId);
  const openReview = open ? reviewMap[open.reviewId] : undefined;

  const removeReview = (rr: RemovalRequest) =>
    confirm({
      title: t("admin.del.removal.title"),
      body: t("admin.del.removal.body", { company: partnerMap[rr.partnerId]?.name ?? "" }),
      tone: "danger",
      confirmLabel: t("admin.del.removal.button"),
      onConfirm: () => {
        setOpenId(null);
        patch("removals", rr.id, { status: "approved" });
        remove("reviews", rr.reviewId);
        toast.success(tr("removed"));
      },
    });
  const keepReview = (rr: RemovalRequest) => {
    setOpenId(null);
    patch("removals", rr.id, { status: "rejected" });
    toast.success(tr("keptToast", { company: partnerMap[rr.partnerId]?.name ?? "" }));
  };

  const columns: ColumnDef<RemovalRequest, unknown>[] = [
    {
      id: "company",
      header: t("common.fields.company"),
      accessorFn: (rr) => partnerMap[rr.partnerId]?.name ?? "–",
      cell: ({ row: { original: rr } }) => (
        <Link href={`/admin/partners/${rr.partnerId}?tab=reviews`} onClick={(e) => e.stopPropagation()} className="whitespace-nowrap font-semibold text-ink hover:text-primary hover:underline">
          {partnerMap[rr.partnerId]?.name ?? "–"}
        </Link>
      ),
    },
    {
      id: "review",
      header: tr("review"),
      enableSorting: false,
      accessorFn: (rr) => reviewMap[rr.reviewId]?.comment ?? "",
      cell: ({ row: { original: rr } }) => {
        const r = reviewMap[rr.reviewId];
        // once a request is approved the review is gone; say so instead of an empty cell
        if (!r) return <span className="text-sm italic text-muted-foreground">{tr("removed")}</span>;
        return (
          <span className="block min-w-48">
            <Stars value={r.stars} />
            <span className="mt-1 line-clamp-1 block text-sm text-ink">“{r.comment}”</span>
            <span className="block text-xs text-muted-foreground">{r.name} · {formatDate(r.createdAt, lang)}</span>
          </span>
        );
      },
    },
    { id: "reason", header: tr("reason"), enableSorting: false, accessorFn: (rr) => rr.reason, cell: (c) => <p className="line-clamp-2 min-w-40 max-w-64 text-sm text-muted-foreground">{c.getValue() as string}</p> },
    { id: "date", header: tr("requested"), accessorFn: (rr) => rr.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    { id: "status", header: t("common.fields.status"), accessorFn: (rr) => rr.status, cell: (c) => <StatusBadge status={c.getValue() as string} /> },
    actionsColumn<RemovalRequest>((rr) => (
      <RowActions
        onView={() => setOpenId(rr.id)}
        actions={[
          { label: t("admin.del.removal.button"), icon: <Trash2 />, tone: "danger", onSelect: () => removeReview(rr), hidden: rr.status !== "pending" },
          { label: tr("keepReview"), icon: <ShieldCheck />, onSelect: () => keepReview(rr), hidden: rr.status !== "pending" },
          { label: t("admin.rows.openCompany"), icon: <Building2 />, href: `/admin/partners/${rr.partnerId}?tab=reviews`, separated: rr.status === "pending" },
        ]}
      />
    )),
  ];

  return (
    <>
      <PageHeader title={tr("removalsTitle")} subtitle={tr("removalsSub")} />
      <DataTable
        data={removals}
        columns={columns}
        search={(rr) => {
          const r = reviewMap[rr.reviewId];
          return `${partnerMap[rr.partnerId]?.name ?? ""} ${rr.reason} ${r?.name ?? ""} ${r?.comment ?? ""}`;
        }}
        searchPlaceholder={tr("removalsSearchPh")}
        initialSort={[{ id: "date", desc: true }]}
        onRowClick={(rr) => setOpenId(rr.id)}
        rowClassName={(rr) => (rr.status === "pending" ? "bg-warning-soft/25" : undefined)}
        filters={[
          { id: "status", label: t("common.fields.status"), options: (["pending", "approved", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (rr) => rr.status },
          { id: "stars", label: t("common.fields.rating"), options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) })), get: (rr) => String(reviewMap[rr.reviewId]?.stars ?? "") },
        ]}
      />

      <DetailSheet
        open={!!open}
        onOpenChange={(v) => !v && setOpenId(null)}
        title={open && (partnerMap[open.partnerId]?.name ?? "–")}
        badge={open && <StatusBadge status={open.status} />}
        subtitle={open && tr("requestedOn", { date: formatDate(open.createdAt, lang) })}
        footer={
          open?.status === "pending" ? (
            <>
              <Button variant="outline" onClick={() => keepReview(open)}><ShieldCheck /> {tr("keepReview")}</Button>
              <Button variant="danger" className="flex-1" onClick={() => removeReview(open)}><Trash2 /> {t("admin.del.removal.button")}</Button>
            </>
          ) : open ? (
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/admin/partners/${open.partnerId}?tab=reviews`}><Building2 /> {t("admin.rows.openCompany")}</Link>
            </Button>
          ) : undefined
        }
      >
        {open && (
          <>
            <SheetSection title={tr("review")}>
              {openReview ? (
                <>
                  <Stars value={openReview.stars} size="md" />
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground">“{openReview.comment}”</p>
                  <p className="mt-1 text-xs text-muted-foreground">{openReview.name} · {formatDate(openReview.createdAt, lang)}</p>
                  {openReview.offerId && (
                    <Link href={`/admin/leads/${openReview.offerId}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                      <ClipboardList className="size-3.5" /> {tr("verifiedBooking", { id: openReview.offerId })}
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-sm italic text-muted-foreground">{tr("removed")}</p>
              )}
            </SheetSection>
            <SheetSection title={tr("reason")}>
              <p className="text-sm text-foreground">{open.reason}</p>
            </SheetSection>
            {open.status === "pending" && <p className="text-xs text-muted-foreground">{tr("decideHint")}</p>}
          </>
        )}
      </DetailSheet>
      {dialog}
    </>
  );
}
