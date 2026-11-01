"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Check, X } from "lucide-react";
import type { Payout } from "@/lib/types";
import { formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCompanyMedia, useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { StatusBadge } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DetailSheet, RowActions, SheetSection, actionsColumn } from "@/components/admin/row-actions";
import { DL, Mono } from "@/components/admin/ui";
import { PayoutDecisionDialog } from "@/components/admin/payout-actions";

/**
 * Companies asking for unused wallet money back: pay it (wallet is debited) or reject it with a reason.
 * The table stays narrow; the company's reason, the bank account and the decision are in the View popup.
 * Shown as the "Payouts to bank" tab of Refunds & payouts.
 */
export function PayoutsPanel() {
  const t = useTranslations();
  const tp = useTranslations("admin.payouts");
  const tReason = useTranslations("common.payoutReasons");
  const lang = useLang();
  const payouts = useStore((s) => s.payouts);
  const partnerMap = usePartnerMap();
  const [deciding, setDeciding] = useState<{ payout: Payout; decision: "paid" | "rejected" } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = payouts.find((p) => p.id === openId);
  const decidedBy = useStore((s) => s.users.find((u) => u.id === open?.byUserId)?.name);
  // the decision dialog can open from the popup, so the popup closes first
  const decide = (payout: Payout, decision: "paid" | "rejected") => {
    setOpenId(null);
    setDeciding({ payout, decision });
  };

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
    { id: "date", header: tp("requested"), accessorFn: (p) => p.createdAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (p) => p.status,
      // the bank reference or the reason for rejecting is in the View popup
      cell: (c) => <StatusBadge status={c.getValue() as string} />,
    },
    actionsColumn<Payout>((p) => (
      <RowActions
        onView={() => setOpenId(p.id)}
        // pay and reject are decided in the popup, where the reason and the bank account are
        actions={[{ label: t("admin.rows.openCompany"), icon: <Building2 />, href: `/admin/partners/${p.partnerId}?tab=wallet` }]}
      />
    )),
  ];

  return (
    <>
      <DataTable
        data={payouts}
        columns={columns}
        search={(p) => `${p.id} ${p.iban} ${p.reference ?? ""} ${partnerMap[p.partnerId]?.name} ${p.reason ? tReason(p.reason) : ""} ${p.reasonNote ?? ""}`}
        searchPlaceholder={tp("searchPh")}
        initialSort={[{ id: "date", desc: true }]}
        onRowClick={(p) => setOpenId(p.id)}
        filters={[{ id: "status", label: t("common.fields.status"), options: (["requested", "paid", "rejected"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: (p) => p.status }]}
        rowClassName={(p) => (p.status === "requested" ? "bg-warning-soft/25" : undefined)}
      />
      <DetailSheet
        centered
        open={!!open}
        onOpenChange={(v) => !v && setOpenId(null)}
        title={<Mono className="text-lg">{open?.id}</Mono>}
        badge={open && <StatusBadge status={open.status} />}
        subtitle={open && `${partnerMap[open.partnerId]?.name ?? "–"} · ${formatDateTime(open.createdAt, lang)}`}
        footer={
          open?.status === "requested" ? (
            <>
              <Button variant="danger-soft" onClick={() => decide(open, "rejected")}><X /> {t("common.actions.reject")}</Button>
              <Button variant="success" className="flex-1" onClick={() => decide(open, "paid")}><Check /> {tp("pay")}</Button>
            </>
          ) : open ? (
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/admin/partners/${open.partnerId}?tab=wallet`}><Building2 /> {t("admin.rows.openCompany")}</Link>
            </Button>
          ) : undefined
        }
      >
        {open && (
          <>
            {/* why the company asks for its money */}
            <SheetSection title={tp("companyReason")}>
              <p className="text-sm font-semibold text-ink">{open.reason ? tReason(open.reason) : "–"}</p>
              {open.reasonNote && <p className="mt-1 text-sm text-foreground">“{open.reasonNote}”</p>}
            </SheetSection>
            <SheetSection>
              <DL
                items={[
                  { label: t("common.fields.amount"), value: <span className="font-bold">{formatCHF(open.amount, lang)}</span> },
                  { label: tp("wallet"), value: formatCHF(partnerMap[open.partnerId]?.wallet ?? 0, lang) },
                  { label: t("common.fields.company"), value: <Link href={`/admin/partners/${open.partnerId}?tab=wallet`} className="font-semibold text-primary hover:underline">{partnerMap[open.partnerId]?.name ?? "–"}</Link> },
                  { label: tp("requested"), value: formatDate(open.createdAt, lang) },
                ]}
              />
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">{tp("bankAccount")}</p>
                {partnerMap[open.partnerId]?.bank && <p className="mt-0.5 text-sm font-semibold text-ink">{partnerMap[open.partnerId].bank.name} · {partnerMap[open.partnerId].bank.owner}</p>}
                <p className="font-mono text-sm text-ink" dir="ltr">{open.iban}</p>
              </div>
            </SheetSection>
            {open.status !== "requested" && (
              <SheetSection title={tp("decision")}>
                <DL
                  items={[
                    { label: t("admin.rows.decidedOn"), value: open.decidedAt ? formatDateTime(open.decidedAt, lang) : "–" },
                    { label: tp("decidedBy"), value: decidedBy ?? "–" },
                  ]}
                />
                {open.reference && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground">{tp(open.status === "paid" ? "reference" : "reason")}</p>
                    {open.status === "paid" ? <Mono className="mt-0.5 block">{open.reference}</Mono> : <p className="mt-0.5 text-sm text-foreground">“{open.reference}”</p>}
                  </div>
                )}
              </SheetSection>
            )}
          </>
        )}
      </DetailSheet>
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
