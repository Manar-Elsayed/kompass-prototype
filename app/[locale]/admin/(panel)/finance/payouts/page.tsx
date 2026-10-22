"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Clock, Landmark, X } from "lucide-react";
import type { Payout } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCompanyMedia, useLang, usePartnerMap } from "@/lib/mock/hooks";
import { inLastDays } from "@/lib/mock/selectors";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { StatusBadge } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";
import { PayoutDecisionDialog } from "@/components/admin/payout-actions";

/** Companies asking for unused wallet money back: pay it (wallet is debited) or reject it with a reason. */
export default function PayoutsPage() {
  const t = useTranslations();
  const tp = useTranslations("admin.payouts");
  const lang = useLang();
  const payouts = useStore((s) => s.payouts);
  const partnerMap = usePartnerMap();
  const [deciding, setDeciding] = useState<{ payout: Payout; decision: "paid" | "rejected" } | null>(null);

  const requested = payouts.filter((p) => p.status === "requested");
  const paid30 = payouts.filter((p) => p.status === "paid" && inLastDays(p.decidedAt ?? p.createdAt, 30));

  const columns: ColumnDef<Payout, unknown>[] = [
    { id: "id", header: tp("payout"), accessorFn: (p) => p.id, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    {
      id: "partner",
      header: t("common.fields.company"),
      accessorFn: (p) => partnerMap[p.partnerId]?.name ?? "–",
      cell: ({ row: { original: p } }) => <CompanyCell partnerId={p.partnerId} name={partnerMap[p.partnerId]?.name ?? "–"} />,
    },
    { id: "amount", header: t("common.fields.amount"), accessorFn: (p) => p.amount, cell: (c) => <span className="font-bold">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "wallet", header: tp("wallet"), accessorFn: (p) => partnerMap[p.partnerId]?.wallet ?? 0, cell: (c) => <span className="text-muted-foreground">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "iban", header: "IBAN", accessorFn: (p) => p.iban, cell: (c) => <span className="whitespace-nowrap font-mono text-xs text-muted-foreground" dir="ltr">{c.getValue() as string}</span> },
    { id: "date", header: tp("requested"), accessorFn: (p) => p.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (p) => p.status,
      cell: ({ row: { original: p } }) =>
        p.status === "requested" ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="success" onClick={() => setDeciding({ payout: p, decision: "paid" })}><Check /> {tp("pay")}</Button>
            <Button size="icon-sm" variant="danger-soft" onClick={() => setDeciding({ payout: p, decision: "rejected" })} aria-label={t("common.actions.reject")}><X /></Button>
          </div>
        ) : (
          <span className="flex flex-col items-start gap-0.5">
            <StatusBadge status={p.status} />
            {p.reference && <span className="max-w-48 truncate text-xs text-muted-foreground" title={p.reference}>{p.reference}</span>}
          </span>
        ),
    },
  ];

  return (
    <>
      <PageHeader title={tp("title")} subtitle={tp("subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={tp("requestedTotal")} value={formatCHF(requested.reduce((a, p) => a + p.amount, 0), lang)} icon={<Clock />} tone="warning" footer={tp("count", { count: requested.length })} />
        <KpiCard label={tp("paid30")} value={formatCHF(paid30.reduce((a, p) => a + p.amount, 0), lang)} icon={<CheckCircle2 />} tone="success" footer={tp("count", { count: paid30.length })} />
        <KpiCard label={t("common.table.all")} value={payouts.length} icon={<Landmark />} />
      </div>
      <DataTable
        data={payouts}
        columns={columns}
        search={(p) => `${p.id} ${p.iban} ${partnerMap[p.partnerId]?.name}`}
        initialSort={[{ id: "date", desc: true }]}
        filters={[{ id: "status", label: t("common.fields.status"), options: (["requested", "paid", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (p) => p.status }]}
        rowClassName={(p) => (p.status === "requested" ? "bg-warning-soft/25" : undefined)}
      />
      {deciding && <PayoutDecisionDialog payout={deciding.payout} decision={deciding.decision} onClose={() => setDeciding(null)} />}
    </>
  );
}

function CompanyCell({ partnerId, name }: { partnerId: string; name: string }) {
  const { logo } = useCompanyMedia(partnerId);
  return (
    <Link href={`/admin/partners/${partnerId}?tab=wallet`} className="flex items-center gap-2 whitespace-nowrap font-semibold text-ink hover:underline">
      <Avatar name={name} src={logo?.url} square className="size-7 text-[10px]" />
      {name}
    </Link>
  );
}
