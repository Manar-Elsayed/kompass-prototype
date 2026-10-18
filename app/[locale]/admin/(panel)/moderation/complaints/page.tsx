"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Mail, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Complaint } from "@/lib/types";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/ui";

export default function ComplaintsPage() {
  const t = useTranslations();
  const tc = useTranslations("admin.complaints");
  const lang = useLang();
  const complaints = useStore((s) => s.complaints);
  const patch = useStore((s) => s.patch);
  const partnerMap = usePartnerMap();
  const [kind, setKind] = useState<"all" | "partner" | "offer">("all");
  const [open, setOpen] = useState<Complaint | null>(null);
  const rows = complaints.filter((c) => kind === "all" || c.kind === kind);

  const decide = (c: Complaint, status: "approved" | "rejected") => {
    patch("complaints", c.id, { status });
    setOpen((o) => (o && o.id === c.id ? { ...o, status } : o));
    toast.success(t("common.toast.updated"));
  };

  const about = (c: Complaint) =>
    c.kind === "partner" ? (
      <Link href={`/admin/partners/${c.partnerId}`} className="font-semibold text-primary hover:underline">{partnerMap[c.partnerId!]?.name}</Link>
    ) : (
      <Link href={`/admin/leads/${c.offerId}`} className="font-mono text-[13px] font-semibold text-primary hover:underline" dir="ltr">{c.offerId}</Link>
    );

  const columns: ColumnDef<Complaint, unknown>[] = [
    { id: "kind", header: tc("about"), accessorFn: (c) => c.kind, cell: ({ row: { original: c } }) => <div className="space-y-1"><Badge tone={c.kind === "partner" ? "accent" : "info"}>{tc(c.kind)}</Badge><div>{about(c)}</div></div> },
    { id: "name", header: t("common.fields.name"), accessorFn: (c) => c.name, cell: ({ row: { original: c } }) => <div><p className="font-semibold text-ink">{c.name}</p><p className="text-xs text-muted-foreground" dir="ltr">{c.email}</p></div> },
    { id: "message", header: t("common.fields.message"), accessorFn: (c) => c.message, enableSorting: false, cell: (c) => <p className="line-clamp-2 max-w-sm text-muted-foreground">{c.getValue() as string}</p> },
    { id: "date", header: t("common.fields.created"), accessorFn: (c) => c.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{timeAgo(c.getValue() as string, lang)}</span> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (c) => c.status,
      cell: ({ row: { original: c } }) =>
        c.status === "pending" ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="success" onClick={() => decide(c, "approved")}><Check /> {tc("resolve")}</Button>
            <Button size="icon-sm" variant="danger-soft" onClick={() => decide(c, "rejected")} aria-label={tc("dismiss")}><X /></Button>
          </div>
        ) : (
          <StatusBadge status={c.status} />
        ),
    },
  ];

  return (
    <>
      <PageHeader title={tc("title")} subtitle={tc("subtitle")}>
        <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)} className="mt-5">
          <TabsList>
            <TabsTrigger value="all">{t("common.table.all")} <Badge>{complaints.length}</Badge></TabsTrigger>
            <TabsTrigger value="partner">{tc("partner")} <Badge>{complaints.filter((c) => c.kind === "partner").length}</Badge></TabsTrigger>
            <TabsTrigger value="offer">{tc("offer")} <Badge>{complaints.filter((c) => c.kind === "offer").length}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>
      <DataTable
        data={rows}
        columns={columns}
        search={(c) => `${c.name} ${c.email} ${c.message} ${c.offerId ?? ""} ${partnerMap[c.partnerId ?? ""]?.name ?? ""}`}
        onRowClick={setOpen}
        rowClassName={(c) => (c.status === "pending" ? "bg-warning-soft/25" : undefined)}
        filters={[{ id: "st", label: t("common.fields.status"), options: (["pending", "approved", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (c) => c.status }]}
      />

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="max-w-md">
          {open && (
            <div className="flex h-full flex-col">
              <div className="space-y-5 overflow-y-auto p-6">
                <div>
                  <DialogTitle>{open.id}</DialogTitle>
                  <div className="mt-2 flex items-center gap-2"><StatusBadge status={open.status} /><span className="text-xs text-muted-foreground">{formatDateTime(open.createdAt, lang)}</span></div>
                </div>
                <div className="rounded-xl bg-surface-2 p-4">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{tc("about")} · {tc(open.kind)}</p>
                  {about(open)}
                </div>
                <div>
                  <p className="font-semibold text-ink">{open.name}</p>
                  <a href={`mailto:${open.email}`} className="mt-1 flex items-center gap-2 text-sm hover:text-primary" dir="ltr"><Mail className="size-4 text-muted-foreground" />{open.email}</a>
                  <a href={`tel:${open.phone}`} className="mt-1 flex items-center gap-2 text-sm hover:text-primary" dir="ltr"><Phone className="size-4 text-muted-foreground" />{open.phone}</a>
                </div>
                <p className="whitespace-pre-wrap rounded-xl border p-4 text-sm leading-relaxed">{open.message}</p>
              </div>
              {open.status === "pending" && (
                <div className="mt-auto flex gap-2 border-t p-4">
                  <Button variant="outline" className="flex-1" onClick={() => decide(open, "rejected")}>{tc("dismiss")}</Button>
                  <Button variant="success" className="flex-1" onClick={() => decide(open, "approved")}>{tc("resolve")}</Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Dialog>
    </>
  );
}
