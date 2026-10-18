"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Order } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerMap, useServiceMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/controls";
import { Card } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { Mono, PageHeader } from "@/components/admin/ui";

export default function ExecutionsPage() {
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const orders = useStore((s) => s.orders);
  const offers = useStore((s) => s.offers);
  const patch = useStore((s) => s.patch);
  const partnerMap = usePartnerMap();
  const serviceMap = useServiceMap();
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const executed = orders.filter((o) => o.executed).length;
  const rate = orders.length ? Math.round((executed / orders.length) * 100) : 0;

  const columns: ColumnDef<Order, unknown>[] = [
    { id: "lead", header: t("admin.leads.id"), accessorFn: (o) => o.offerId, cell: (c) => <Link href={`/admin/leads/${c.getValue()}`} className="font-mono text-[13px] font-semibold text-primary hover:underline" dir="ltr">{c.getValue() as string}</Link> },
    { id: "company", header: t("admin.shop.company"), accessorFn: (o) => partnerMap[o.partnerId]?.name ?? "–", cell: (c) => <span className="font-semibold text-ink">{c.getValue() as string}</span> },
    { id: "service", header: t("common.fields.service"), accessorFn: (o) => L(serviceMap[offerMap[o.offerId]?.serviceId]?.name) },
    { id: "exec", header: t("admin.leads.execution"), accessorFn: (o) => offerMap[o.offerId]?.executionDate ?? "", cell: (c) => <span className="whitespace-nowrap">{c.getValue() ? formatDate(c.getValue() as string, lang) : "–"}</span> },
    { id: "order", header: t("admin.shop.order"), accessorFn: (o) => o.id, cell: (c) => <Mono className="text-muted-foreground">{c.getValue() as string}</Mono> },
    {
      id: "status",
      header: t("common.fields.status"),
      accessorFn: (o) => (o.executed ? 1 : 0),
      cell: ({ row: { original: o } }) =>
        o.executed ? (
          <Badge tone="success" dot>{t("admin.shop.executed")}</Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              patch("orders", o.id, { executed: true });
              toast.success(t("common.toast.updated"));
            }}
          >
            <CheckCircle2 /> {t("admin.executions.markExecuted")}
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.executions.title")} subtitle={t("admin.executions.subtitle")} />
      <Card className="mb-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <div className="sm:w-56">
          <p className="text-[13px] font-semibold text-muted-foreground">{t("admin.executions.rate")}</p>
          <p className="text-2xl font-bold text-ink">{rate}%</p>
        </div>
        <div className="flex-1">
          <Progress value={rate} tone="success" className="h-3" />
          <p className="mt-2 text-xs text-muted-foreground">{executed} / {orders.length}</p>
        </div>
      </Card>
      <DataTable
        data={orders}
        columns={columns}
        search={(o) => `${o.offerId} ${partnerMap[o.partnerId]?.name}`}
        filters={[
          { id: "ex", label: t("common.fields.status"), options: [{ value: "1", label: t("admin.shop.executed") }, { value: "0", label: t("admin.shop.notExecuted") }], get: (o) => (o.executed ? "1" : "0") },
          { id: "partner", label: t("admin.shop.company"), options: Object.values(partnerMap).filter((p) => p.status === "approved").map((p) => ({ value: p.id, label: p.name })), get: (o) => o.partnerId },
        ]}
      />
    </>
  );
}
