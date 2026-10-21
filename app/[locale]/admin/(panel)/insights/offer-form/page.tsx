"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FilePlus2, MousePointerClick, Phone, ShieldAlert, Users, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { FormSession } from "@/lib/types";
import { formatNumber, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { dashboardStats, periodRange, type Period } from "@/lib/mock/selectors";
import { visitorsOnDay } from "@/lib/mock/seed";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { KpiCard, PageHeader } from "@/components/admin/ui";
import { PeriodPicker, currentMonth } from "@/components/admin/period-picker";
import { Funnel } from "@/components/admin/funnel";

/**
 * How visitors use the website offer form: how many start, how far they get, how many submit, and
 * which submissions turned out fake. Visitors who left their contact details but never submitted are
 * listed so the team can call them and complete the request for them.
 */
export default function OfferFormInsights() {
  const t = useTranslations("admin.offerForm");
  const ts = useTranslations("admin.dashboard.stats");
  const tf = useTranslations("common.fields");
  const L = useL();
  const lang = useLang();
  const db = useStore();
  const serviceMap = useServiceMap();
  const [period, setPeriod] = useState<Period>(currentMonth);
  const s = useMemo(() => dashboardStats(db, period, visitorsOnDay), [db, period]);
  const { from, to } = periodRange(period);

  const followUp = db.formSessions
    .filter((x) => x.step !== "submitted" && (x.email || x.phone) && Date.parse(x.startedAt) >= from && Date.parse(x.startedAt) < to)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const columns: ColumnDef<FormSession, unknown>[] = [
    { id: "name", header: tf("name"), accessorFn: (x) => x.name ?? "", cell: (c) => <span className="font-semibold text-ink">{(c.getValue() as string) || "–"}</span> },
    {
      id: "contact",
      header: t("contact"),
      accessorFn: (x) => `${x.email ?? ""} ${x.phone ?? ""}`,
      cell: ({ row: { original: x } }) => (
        <div className="text-xs">
          {x.email && <p>{x.email}</p>}
          {x.phone && <a href={`tel:${x.phone}`} className="text-primary hover:underline">{x.phone}</a>}
        </div>
      ),
    },
    { id: "service", header: tf("service"), accessorFn: (x) => (x.serviceId ? L(serviceMap[x.serviceId]?.name) : ""), cell: (c) => (c.getValue() as string) || "–" },
    { id: "step", header: t("reached"), accessorFn: (x) => x.step, cell: (c) => <Badge tone="warning">{ts(`steps.${c.getValue() as string}`)}</Badge> },
    { id: "when", header: t("left"), accessorFn: (x) => x.updatedAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{timeAgo(c.getValue() as string, lang)}</span> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: x } }) => (
        <div className="flex justify-end gap-1.5">
          {x.phone && (
            <Button asChild size="icon-sm" variant="ghost" aria-label={t("call")}>
              <a href={`tel:${x.phone}`}><Phone /></a>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/leads/new?session=${x.id}`}><FilePlus2 /> {t("complete")}</Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} actions={<PeriodPicker value={period} onChange={setPeriod} />} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={ts("visitors")} value={formatNumber(s.visitors.visitors, lang)} icon={<Users />} footer={ts("notStartedHint", { count: formatNumber(s.visitors.notStarted, lang) })} />
        <KpiCard label={ts("started")} value={s.visitors.started} icon={<MousePointerClick />} tone="info" />
        <KpiCard label={ts("completed")} value={s.visitors.completed} icon={<CheckCircle2 />} tone="success" footer={ts("notCompletedHint", { count: s.visitors.notCompleted })} />
        <KpiCard label={ts("fakeSubmitted")} value={s.visitors.fake} icon={<ShieldAlert />} tone="accent" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardBody>
            <Funnel steps={s.visitors.funnel} />
          </CardBody>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title={<span className="flex items-center gap-2"><XCircle className="size-4 text-warning" /> {t("needsCompletion")}</span>} description={t("needsCompletionHint")} />
          <div className="mt-4 border-t p-4">
            <DataTable data={followUp} columns={columns} search={(x) => `${x.name ?? ""} ${x.email ?? ""} ${x.phone ?? ""}`} />
          </div>
        </Card>
      </div>
    </>
  );
}
