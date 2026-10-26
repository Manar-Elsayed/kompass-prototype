"use client";

import { useTranslations } from "next-intl";
import { Monitor, MousePointerClick, Smartphone, Tablet, Users } from "lucide-react";
import { LANGS, type Visitor } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";

const DEVICE_ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

export default function VisitorsPage() {
  const t = useTranslations();
  const tv = useTranslations("admin.visitors");
  const lang = useLang();
  const visitors = useStore((s) => s.visitors);
  const conv = visitors.length ? Math.round((visitors.filter((v) => v.converted).length / visitors.length) * 100) : 0;
  const mobile = visitors.length ? Math.round((visitors.filter((v) => v.device !== "desktop").length / visitors.length) * 100) : 0;

  const columns: ColumnDef<Visitor, unknown>[] = [
    { id: "ip", header: t("common.fields.ip"), accessorFn: (v) => v.ip, cell: (c) => <Mono>{c.getValue() as string}</Mono> },
    {
      id: "device",
      header: t("common.fields.device"),
      accessorFn: (v) => v.device,
      cell: (c) => {
        const I = DEVICE_ICON[c.getValue() as Visitor["device"]];
        return <span className="flex items-center gap-2"><I className="size-4 text-muted-foreground" />{t(`common.device.${c.getValue()}`)}</span>;
      },
    },
    { id: "browser", header: tv("browser"), accessorFn: (v) => v.browser },
    { id: "loc", header: tv("location"), accessorFn: (v) => `${v.city}, ${v.country}` },
    { id: "lang", header: t("common.fields.language"), accessorFn: (v) => v.lang, cell: (c) => <Badge tone="outline" className="uppercase">{c.getValue() as string}</Badge> },
    { id: "pages", header: tv("pages"), accessorFn: (v) => v.pages },
    { id: "conv", header: tv("converted"), accessorFn: (v) => (v.converted ? 1 : 0), cell: (c) => (c.getValue() ? <Badge tone="success" dot>{t("common.form.yes")}</Badge> : <span className="text-muted-foreground">–</span>) },
    { id: "seen", header: t("common.fields.lastSeen"), accessorFn: (v) => v.lastSeen, cell: (c) => <span className="text-muted-foreground">{timeAgo(c.getValue() as string, lang)}</span> },
  ];

  return (
    <>
      <PageHeader title={tv("title")} subtitle={tv("subtitle")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label={tv("total")} value={visitors.length} icon={<Users />} />
        <KpiCard label={tv("conversion")} value={`${conv}%`} icon={<MousePointerClick />} tone="success" />
        <KpiCard label={tv("mobileShare")} value={`${mobile}%`} icon={<Smartphone />} tone="info" />
      </div>
      <DataTable
        data={visitors}
        columns={columns}
        dense
        search={(v) => `${v.ip} ${v.city} ${v.country} ${v.browser}`}
        searchPlaceholder={tv("searchPh")}
        filters={[
          { id: "device", label: t("common.fields.device"), options: (["desktop", "mobile", "tablet"] as const).map((d) => ({ value: d, label: t(`common.device.${d}`) })), get: (v) => v.device },
          { id: "lang", label: t("common.fields.language"), options: LANGS.map((l) => ({ value: l, label: t(`common.lang.${l}`) })), get: (v) => v.lang },
          { id: "conv", label: tv("converted"), options: [{ value: "1", label: t("common.form.yes") }, { value: "0", label: t("common.form.no") }], get: (v) => (v.converted ? "1" : "0") },
        ]}
      />
    </>
  );
}
