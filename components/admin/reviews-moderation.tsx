"use client";

import { useTranslations } from "next-intl";
import { Check, Clock, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Review } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { Stars, StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "./data-table";
import { KpiCard, PageHeader } from "./ui";

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
  const reviews = all.filter((r) => (scope === "kompass" ? r.target === "kompass" : r.target !== "kompass"));
  const approved = reviews.filter((r) => r.status === "approved");
  const avg = approved.length ? approved.reduce((a, r) => a + r.stars, 0) / approved.length : 0;

  const decide = (r: Review, status: "approved" | "rejected") => {
    patch("reviews", r.id, { status });
    toast.success(t(`common.status.${status}`));
  };

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
            <Link href={`/admin/partners/${r.target}`} className="font-semibold text-primary hover:underline">{partnerMap[r.target]?.name}</Link>
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
          <div className="flex gap-1.5">
            <Button size="sm" variant="success" onClick={() => decide(r, "approved")}><Check /> {t("common.actions.approve")}</Button>
            <Button size="icon-sm" variant="danger-soft" onClick={() => decide(r, "rejected")} aria-label={t("common.actions.reject")}><X /></Button>
          </div>
        ) : (
          <StatusBadge status={r.status} />
        ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: r } }) => (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-danger-soft hover:text-danger"
          aria-label={t("common.actions.delete")}
          onClick={() =>
            confirm({
              title: t("common.confirm.title"),
              body: t("common.confirm.deleteBody"),
              tone: "danger",
              confirmLabel: t("common.actions.delete"),
              onConfirm: () => {
                remove("reviews", r.id);
                toast.success(t("common.toast.deleted"));
              },
            })
          }
        >
          <Trash2 />
        </Button>
      ),
    },
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
        rowClassName={(r) => (r.status === "pending" ? "bg-warning-soft/25" : undefined)}
        filters={[
          { id: "status", label: t("common.fields.status"), options: (["pending", "approved", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (r) => r.status },
          { id: "stars", label: t("common.fields.rating"), options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) })), get: (r) => String(r.stars) },
        ]}
      />
      {dialog}
    </>
  );
}
