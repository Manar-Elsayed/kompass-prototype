"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownLeft, Building2, HandCoins, Plus, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Partner } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { inLastDays, walletLedger, lowBalance } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { KpiCard, PageHeader } from "@/components/admin/ui";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { CreditDialog, TopUpDialog } from "@/components/admin/wallet-actions";
import { WalletLedger } from "@/components/shared/wallet-ledger";
import { receiptParty, useReceipts } from "@/components/shared/receipts";

type Row = Partner & ReturnType<typeof walletLedger>;

export default function WalletsPage() {
  const t = useTranslations();
  const tw = useTranslations("admin.wallets");
  const lang = useLang();
  const orders = useStore((s) => s.orders);
  const dues = useStore((s) => s.dues);
  const topups = useStore((s) => s.topups);
  const refunds = useStore((s) => s.refunds);
  const invoices = useStore((s) => s.invoices);
  const partners = useStore((s) => s.partners);
  const [history, setHistory] = useState<string | null>(null);
  const [topUp, setTopUp] = useState<string | null>(null);
  const [credit, setCredit] = useState<string | null>(null);

  const payouts = useStore((s) => s.payouts);
  const db = useMemo(() => ({ orders, dues, topups, refunds, invoices, partners, payouts }), [orders, dues, topups, refunds, invoices, partners, payouts]);
  const rows: Row[] = useMemo(() => partners.filter((p) => p.status === "approved").map((p) => ({ ...p, ...walletLedger(db, p.id) })), [partners, db]);
  const total = rows.reduce((a, r) => a + r.wallet, 0);
  const topped30 =
    dues.filter((d) => d.status === "confirmed" && !d.invoiceId && inLastDays(d.decidedAt ?? d.createdAt, 30)).reduce((a, d) => a + d.amount, 0) +
    topups.filter((x) => x.method !== "credit" && inLastDays(x.createdAt, 30)).reduce((a, x) => a + x.amount, 0);
  const creditDue = rows.reduce((a, r) => a + r.creditDue, 0);
  const overdue = rows.reduce((a, r) => a + r.creditOverdue, 0);
  const byId = (id: string | null) => rows.find((r) => r.id === id);
  const receipts = useReceipts();
  const services = useStore((s) => s.services);
  const defaultPrice = useStore((s) => s.config.defaultLeadPrice);
  const isLow = (id: string) => {
    const p = partners.find((x) => x.id === id);
    return !!p && !p.banned && lowBalance(p, services, defaultPrice).low;
  };

  const columns: ColumnDef<Row, unknown>[] = [
    {
      id: "name",
      header: t("common.fields.company"),
      accessorFn: (r) => r.name,
      cell: ({ row: { original: r } }) => (
        <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
          <Avatar name={r.name} square className="size-8 shrink-0" />
          <span className="max-w-48 truncate" title={r.name}>{r.name}</span>
        </span>
      ),
    },
    {
      id: "balance",
      header: tw("balance"),
      accessorFn: (r) => r.wallet,
      // below the cheapest offer the company takes, it can't buy anything: worth a call
      cell: ({ row: { original: r } }) => (
        <span className="flex flex-col items-start gap-0.5">
          <span className="font-bold text-ink">{formatCHF(r.wallet, lang)}</span>
          {isLow(r.id) && <Badge tone="warning" title={tw("lowHint")}>{tw("low")}</Badge>}
        </span>
      ),
    },
    { id: "toppedUp", meta: { className: "hidden 2xl:table-cell" }, header: tw("toppedUp"), accessorFn: (r) => r.toppedUp, cell: (c) => <span className="text-success">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "spent", meta: { className: "hidden 2xl:table-cell" }, header: tw("spent"), accessorFn: (r) => r.spent, cell: (c) => formatCHF(c.getValue() as number, lang) },
    { id: "refunded", meta: { className: "hidden 2xl:table-cell" }, header: tw("refunded"), accessorFn: (r) => r.refunded, cell: (c) => <span className="text-muted-foreground">{formatCHF(c.getValue() as number, lang)}</span> },
    {
      id: "credit",
      header: tw("creditDue"),
      accessorFn: (r) => r.creditDue,
      cell: ({ row: { original: r } }) =>
        r.creditDue ? (
          <span className={cn("font-semibold", r.creditOverdue ? "text-danger" : "text-warning")}>{formatCHF(r.creditDue, lang)}</span>
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
    },
    { id: "last", header: tw("lastMove"), accessorFn: (r) => r.lastAt ?? "", cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{c.getValue() ? formatDate(c.getValue() as string, lang) : "–"}</span> },
    // the same row menu as every table: open the history, then what can be done to the wallet
    actionsColumn<Row>((r) => (
      <RowActions
        onView={() => setHistory(r.id)}
        viewLabel={t("admin.rows.walletHistory")}
        actions={[
          { label: tw("addCredit"), icon: <HandCoins />, onSelect: () => setCredit(r.id) },
          { label: tw("topUp"), icon: <Plus />, onSelect: () => setTopUp(r.id) },
          { label: t("admin.rows.openCompany"), icon: <Building2 />, href: `/admin/partners/${r.id}`, separated: true },
        ]}
      />
    )),
  ];

  const open = byId(history);
  const openPartner = partners.find((p) => p.id === history);
  const topUpRow = byId(topUp);
  const creditRow = byId(credit);

  return (
    <>
      <PageHeader title={tw("title")} subtitle={tw("subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={tw("total")} value={formatCHF(total, lang)} icon={<Wallet />} />
        <KpiCard label={tw("topped30")} value={formatCHF(topped30, lang)} icon={<ArrowDownLeft />} tone="success" />
        <KpiCard
          label={tw("creditDue")}
          value={formatCHF(creditDue, lang)}
          icon={<HandCoins />}
          tone="warning"
          href="/admin/finance/invoices"
          footer={overdue ? tw("overdue", { amount: formatCHF(overdue, lang) }) : undefined}
        />
      </div>
      <DataTable
        data={rows}
        columns={columns}
        search={(r) => `${r.name} ${r.city}`}
        searchPlaceholder={tw("searchPh")}
        initialSort={[{ id: "balance", desc: true }]}
        onRowClick={(r) => setHistory(r.id)}
        filters={[{ id: "low", label: tw("balance"), options: [{ value: "low", label: tw("low") }, { value: "ok", label: tw("enough") }], get: (r) => (isLow(r.id) ? "low" : "ok") }]}
      />

      {open && (
        <Dialog open onOpenChange={(v) => !v && setHistory(null)}>
          <DialogContent className="max-w-xl p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{open.name}</DialogTitle>
              <DialogDescription>
                {tw("balance")}: <strong className="text-ink">{formatCHF(open.wallet, lang)}</strong> · {tw("spent")}: {formatCHF(open.spent, lang)} · {tw("refunded")}: {formatCHF(open.refunded, lang)}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 px-6">
              <Button size="sm" variant="outline" onClick={() => setCredit(open.id)}><HandCoins /> {tw("addCredit")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setTopUp(open.id)}><Plus /> {tw("topUp")}</Button>
              <Button asChild size="sm" variant="link" className="ms-auto">
                <Link href={`/admin/partners/${open.id}`}>{t("admin.nav.partners")}</Link>
              </Button>
            </div>
            <div className="max-h-[60dvh] overflow-y-auto border-t pb-2">
              <WalletLedger entries={open.entries} receiptOf={receipts.numberOf} onReceipt={(e) => openPartner && receipts.open(e, receiptParty(openPartner))} />
            </div>
          </DialogContent>
        </Dialog>
      )}
      {receipts.dialog}
      {topUpRow && <TopUpDialog partner={topUpRow} onClose={() => setTopUp(null)} />}
      {creditRow && <CreditDialog partner={creditRow} onClose={() => setCredit(null)} />}
    </>
  );
}
