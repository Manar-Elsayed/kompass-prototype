"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Eye, HandCoins } from "lucide-react";
import { toast } from "sonner";
import type { Invoice, PayMethod } from "@/lib/types";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { inLastDays, isOverdue, receiptRows, type ReceiptRow } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar, RadioCards } from "@/components/ui/controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/bits";
import { MoneyDocDialog, type MoneyDoc } from "@/components/shared/money-doc";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";


const invStatus = (i: Invoice) => (i.status === "paid" ? "paid" : isOverdue(i) ? "overdue" : "due");

export default function InvoicesPage() {
  const t = useTranslations();
  const ti = useTranslations("admin.invoices");
  const tw = useTranslations("admin.wallets");
  const lang = useLang();
  const invoices = useStore((s) => s.invoices);
  const dues = useStore((s) => s.dues);
  const topups = useStore((s) => s.topups);
  const orders = useStore((s) => s.orders);
  const partnerMap = usePartnerMap();
  const [doc, setDoc] = useState<MoneyDoc | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);

  const due = invoices.filter((i) => i.status === "due");
  const overdue = due.filter(isOverdue);
  const paid30 = invoices.filter((i) => i.status === "paid" && i.paidAt && inLastDays(i.paidAt, 30));
  const sum = (xs: Invoice[]) => xs.reduce((a, i) => a + i.amount, 0);

  // a receipt for every franc that moved: the same numbers the companies see on their statement
  const prefix = useStore((s) => s.config.invoicePrefix);
  const receipts: ReceiptRow[] = useMemo(() => receiptRows({ dues, topups, orders }, prefix), [dues, topups, orders, prefix]);

  const company = (id: string) => (
    <span className="flex items-center gap-2 font-semibold text-ink">
      <Avatar name={partnerMap[id]?.name ?? "?"} square className="size-7 text-[10px]" />
      {partnerMap[id]?.name ?? "–"}
    </span>
  );

  const openInvoice = (i: Invoice) => {
    const p = partnerMap[i.partnerId];
    if (p) setDoc({ kind: "invoice", id: i.id, date: i.issuedAt, partner: p, line: ti("creditLine"), amount: i.amount, status: invStatus(i), dueAt: i.dueAt, paidAt: i.paidAt });
  };
  const openReceipt = (r: ReceiptRow) => {
    const p = partnerMap[r.partnerId];
    if (p) setDoc({ kind: "receipt", id: r.id, date: r.at, partner: p, line: tw(`kinds.${r.kind}`, { ref: r.ref }), amount: r.amount });
  };

  const invoiceCols: ColumnDef<Invoice, unknown>[] = [
    { id: "id", header: ti("number"), accessorFn: (i) => i.id, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    { id: "company", header: t("common.fields.company"), accessorFn: (i) => partnerMap[i.partnerId]?.name ?? "", cell: ({ row: { original: i } }) => company(i.partnerId) },
    { id: "amount", header: t("common.fields.amount"), accessorFn: (i) => i.amount, cell: (c) => <span className="font-bold">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "issued", header: ti("issued"), accessorFn: (i) => i.issuedAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    { id: "due", header: ti("due"), accessorFn: (i) => i.dueAt, cell: ({ row: { original: i } }) => <span className={isOverdue(i) ? "font-semibold text-danger" : "text-muted-foreground"}>{formatDate(i.dueAt, lang)}</span> },
    { id: "status", header: t("common.fields.status"), accessorFn: (i) => invStatus(i), cell: (c) => <StatusBadge status={c.getValue() as string} /> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: i } }) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {i.status === "due" && (
            <Button size="sm" variant="success" onClick={() => setPaying(i)}><CheckCircle2 /> {ti("markPaid")}</Button>
          )}
          <Button size="icon-sm" variant="ghost" aria-label={ti("view")} onClick={() => openInvoice(i)}><Eye /></Button>
        </div>
      ),
    },
  ];

  const receiptCols: ColumnDef<ReceiptRow, unknown>[] = [
    { id: "id", header: ti("receipt"), accessorFn: (r) => r.id, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    { id: "company", header: t("common.fields.company"), accessorFn: (r) => partnerMap[r.partnerId]?.name ?? "", cell: ({ row: { original: r } }) => company(r.partnerId) },
    { id: "kind", header: ti("type"), accessorFn: (r) => r.kind, cell: ({ row: { original: r } }) => tw(`kinds.${r.kind}`, { ref: r.ref }) },
    { id: "amount", header: t("common.fields.amount"), accessorFn: (r) => r.amount, cell: (c) => <span className="font-semibold">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "date", header: t("common.fields.date"), accessorFn: (r) => r.at, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    {
      id: "view",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: r } }) => <Button size="icon-sm" variant="ghost" aria-label={ti("view")} onClick={() => openReceipt(r)}><Eye /></Button>,
    },
  ];

  return (
    <>
      <PageHeader title={ti("title")} subtitle={ti("subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={ti("toCollect")} value={formatCHF(sum(due), lang)} icon={<HandCoins />} tone="warning" footer={ti("count", { count: due.length })} />
        <KpiCard label={ti("overdue")} value={formatCHF(sum(overdue), lang)} icon={<AlertTriangle />} tone="accent" footer={ti("count", { count: overdue.length })} />
        <KpiCard label={ti("paid30")} value={formatCHF(sum(paid30), lang)} icon={<CheckCircle2 />} tone="success" />
      </div>
      <Tabs defaultValue="credit">
        <TabsList className="mb-3">
          <TabsTrigger value="credit">{ti("creditTab")}</TabsTrigger>
          <TabsTrigger value="receipts">{ti("receiptsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="credit">
          <DataTable
            data={invoices}
            columns={invoiceCols}
            search={(i) => `${i.id} ${partnerMap[i.partnerId]?.name ?? ""}`}
            searchPlaceholder={ti("searchPh")}
            initialSort={[{ id: "due", desc: false }]}
            onRowClick={openInvoice}
            filters={[{ id: "status", label: t("common.fields.status"), options: (["due", "overdue", "paid"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: invStatus }]}
            rowClassName={(i) => (isOverdue(i) ? "bg-danger-soft/25" : undefined)}
          />
        </TabsContent>
        <TabsContent value="receipts">
          <DataTable
            data={receipts}
            columns={receiptCols}
            search={(r) => `${r.id} ${r.ref} ${partnerMap[r.partnerId]?.name ?? ""}`}
            searchPlaceholder={ti("receiptsSearchPh")}
            onRowClick={openReceipt}
            filters={[{ id: "kind", label: ti("type"), options: (["receipt", "online", "admin", "purchase"] as const).map((k) => ({ value: k, label: tw(`kinds.${k}`, { ref: "" }).trim() })), get: (r) => r.kind }]}
          />
        </TabsContent>
      </Tabs>

      {doc && <MoneyDocDialog doc={doc} onClose={() => setDoc(null)} />}
      {paying && <MarkPaidDialog invoice={paying} onClose={() => setPaying(null)} />}
    </>
  );
}

function MarkPaidDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const ti = useTranslations("admin.invoices");
  const tw = useTranslations("admin.wallets");
  const tc = useTranslations("common.actions");
  const markPaid = useStore((s) => s.markInvoicePaid);
  const [method, setMethod] = useState<PayMethod>("bank_transfer");
  const [reference, setReference] = useState("");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ti("markPaidTitle", { id: invoice.id })}</DialogTitle>
        </DialogHeader>
        <Field label={tw("payMethod")}>
          <RadioCards className="grid-cols-2" value={method} onValueChange={(v) => setMethod(v as PayMethod)} options={(["bank_transfer", "twint", "card", "cash"] as const).map((m) => ({ value: m, label: tw(`payMethods.${m}`) }))} />
        </Field>
        <Field label={tw("reference")}>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} className="font-mono" placeholder="BANK-4821" />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            variant="success"
            onClick={() => {
              markPaid(invoice.id, method, reference.trim() || "-");
              toast.success(ti("paidToast", { id: invoice.id }));
              onClose();
            }}
          >
            <CheckCircle2 /> {ti("markPaid")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
