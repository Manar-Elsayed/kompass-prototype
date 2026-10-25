"use client";

import { useTranslations } from "next-intl";
import { Clock, FileSignature, Send, XCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { Partner } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/controls";
import { StatusBadge } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { KpiCard, PageHeader } from "@/components/admin/ui";

const STATUSES = ["pending", "contract_sent", "rejected"] as const;

/** Companies that applied on the website. Decisions are made on each application's own page. */
export default function ApplicationsPage() {
  const t = useTranslations();
  const ta = useTranslations("admin.applications");
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const partners = useStore((s) => s.partners);
  const services = useStore((s) => s.services);
  const serviceMap = useServiceMap();

  const apps = partners.filter((p) => p.status !== "approved");
  const count = (s: (typeof STATUSES)[number]) => apps.filter((p) => p.status === s).length;
  const docsCount = (p: Partner) => Object.values(p.documents).filter(Boolean).length;
  const href = (p: Partner) => `/admin/partners/applications/${p.id}`;

  const columns: ColumnDef<Partner, unknown>[] = [
    {
      id: "company",
      header: t("common.fields.company"),
      accessorFn: (p) => p.name,
      cell: ({ row: { original: p } }) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={p.name} square className="size-9 shrink-0" />
          <span className="min-w-0">
            <span className="block max-w-56 truncate font-semibold text-ink">{p.name}</span>
            <span className="block text-xs text-muted-foreground">{p.zip} {p.city} · {p.canton}</span>
          </span>
        </span>
      ),
    },
    {
      id: "services",
      header: t("common.fields.services"),
      enableSorting: false,
      accessorFn: (p) => p.serviceIds.map((id) => L(serviceMap[id]?.name)).join(", "),
      cell: ({ row: { original: p } }) => (
        <div className="flex max-w-56 flex-wrap gap-1">
          {p.serviceIds.slice(0, 2).map((id) => <Badge key={id}>{L(serviceMap[id]?.name)}</Badge>)}
          {p.serviceIds.length > 2 && <Badge tone="outline">+{p.serviceIds.length - 2}</Badge>}
        </div>
      ),
    },
    {
      id: "documents",
      header: t("admin.partners.documents"),
      accessorFn: (p) => docsCount(p) + (p.contractSignedAt ? 1 : 0),
      cell: ({ row: { original: p } }) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">{ta("docsCount", { count: docsCount(p) })}</p>
          {p.contractSignedAt ? (
            <Badge tone="success" className="mt-0.5"><FileSignature /> {ta("signed")}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">{p.status === "contract_sent" ? ta("awaitingSignatureShort") : ta("noContractShort")}</span>
          )}
        </div>
      ),
    },
    {
      id: "received",
      header: ta("received"),
      accessorFn: (p) => p.createdAt,
      cell: ({ row: { original: p } }) => (
        <div className="whitespace-nowrap">
          <p>{formatDate(p.createdAt, lang)}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(p.createdAt, lang)}</p>
        </div>
      ),
    },
    { id: "status", header: t("common.fields.status"), accessorFn: (p) => p.status, cell: (c) => <StatusBadge status={c.getValue() as string} /> },
    actionsColumn<Partner>((p) => <RowActions viewHref={href(p)} viewLabel={ta("view")} />),
  ];

  return (
    <>
      <PageHeader title={ta("title")} subtitle={ta("subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("common.status.pending")} value={count("pending")} icon={<Clock />} tone="warning" footer={ta("pendingHint")} />
        <KpiCard label={t("common.status.contract_sent")} value={count("contract_sent")} icon={<Send />} tone="info" footer={ta("contractSentHint")} />
        <KpiCard label={t("common.status.rejected")} value={count("rejected")} icon={<XCircle />} footer={ta("rejectedHint")} />
      </div>
      <DataTable
        data={apps}
        columns={columns}
        onRowClick={(p) => router.push(href(p))}
        initialSort={[{ id: "received", desc: true }]}
        search={(p) => `${p.name} ${p.ownerName} ${p.city} ${p.canton} ${p.email} ${p.regNumber}`}
        searchPlaceholder={ta("searchPh")}
        wideSearch
        filters={[
          { id: "status", label: t("common.fields.status"), options: STATUSES.map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (p) => p.status },
          {
            id: "service",
            label: t("common.fields.service"),
            options: [...services].sort((a, b) => a.order - b.order).map((s) => ({ value: s.id, label: L(s.name) })),
            get: (p) => p.serviceIds,
          },
          { id: "canton", label: t("admin.applications.canton"), options: [...new Set(apps.map((p) => p.canton))].sort().map((c) => ({ value: c, label: c })), get: (p) => p.canton },
        ]}
      />
    </>
  );
}
