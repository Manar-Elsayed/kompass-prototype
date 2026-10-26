"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Check, ClipboardList, Clock, EyeOff, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Review } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { Stars, StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "./data-table";
import { DetailSheet, RowActions, SheetSection, actionsColumn } from "./row-actions";
import { DL, KpiCard, PageHeader } from "./ui";

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
  const approved = reviews.filter((r) => r.status === "approved");
  const avg = approved.length ? approved.reduce((a, r) => a + r.stars, 0) / approved.length : 0;

  const decide = (r: Review, status: "approved" | "rejected") => {
    patch("reviews", r.id, { status });
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
      cell: ({ row: { original: r } }) =>
        r.status === "pending" ? (
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="success" onClick={() => decide(r, "approved")}><Check /> {t("common.actions.approve")}</Button>
            <Button size="icon-sm" variant="danger-soft" onClick={() => decide(r, "rejected")} aria-label={t("common.actions.reject")}><X /></Button>
          </div>
        ) : (
          <StatusBadge status={r.status} />
        ),
    },
    actionsColumn<Review>((r) => (
      <RowActions
        onView={() => setOpenId(r.id)}
        actions={[
          { label: t("common.actions.approve"), icon: <Check />, onSelect: () => decide(r, "approved"), hidden: r.status === "approved" },
          { label: t(r.status === "approved" ? "admin.rows.unpublish" : "common.actions.reject"), icon: r.status === "approved" ? <EyeOff /> : <X />, onSelect: () => decide(r, "rejected"), hidden: r.status === "rejected" },
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
        onRowClick={(r) => setOpenId(r.id)}
        rowClassName={(r) => (r.status === "pending" ? "bg-warning-soft/25" : undefined)}
        filters={[
          { id: "status", label: t("common.fields.status"), options: (["pending", "approved", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (r) => r.status },
          { id: "stars", label: t("common.fields.rating"), options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) })), get: (r) => String(r.stars) },
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
                <Button variant="danger-soft" onClick={() => decide(open, "rejected")}>
                  {open.status === "approved" ? <EyeOff /> : <X />} {t(open.status === "approved" ? "admin.rows.unpublish" : "common.actions.reject")}
                </Button>
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
            {open.status === "approved" && <p className="text-xs text-muted-foreground">{t(scope === "partner" ? "admin.rows.publishedPartner" : "admin.rows.publishedKompass")}</p>}
          </>
        )}
      </DetailSheet>
      {dialog}
    </>
  );
}
