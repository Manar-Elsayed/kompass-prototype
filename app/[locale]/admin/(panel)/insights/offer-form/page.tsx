"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FilePlus2, Mail, MousePointerClick, Phone, PhoneMissed, PhoneOff, RotateCcw, ShieldAlert, Users, XCircle, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { FOLLOW_UPS, type FollowUp, type FormSession } from "@/lib/types";
import { formatDateTime, formatNumber, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { dashboardStats, periodRange, type Period } from "@/lib/mock/selectors";
import { visitorsOnDay } from "@/lib/mock/seed";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { DL, KpiCard, PageHeader } from "@/components/admin/ui";
import { DetailSheet, RowActions, SheetSection, type RowAction } from "@/components/admin/row-actions";
import { PeriodPicker, currentMonth } from "@/components/admin/period-picker";
import { Funnel } from "@/components/admin/funnel";

const FOLLOW_UP_TONE: Record<FollowUp, "info" | "warning" | "neutral" | "success" | "accent"> = {
  new: "accent",
  noAnswer: "warning",
  callBack: "info",
  notInterested: "neutral",
  completed: "success",
};
const followUpOf = (x: FormSession): FollowUp => x.followUp ?? "new";

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
  const [openId, setOpenId] = useState<string | null>(null);
  const open = db.formSessions.find((x) => x.id === openId);
  const s = useMemo(() => dashboardStats(db, period, visitorsOnDay), [db, period]);
  const { from, to } = periodRange(period);
  const patch = useStore((st) => st.patch);

  // visitors who left contact details without submitting, plus the ones the team has since completed
  const followUp = db.formSessions
    .filter((x) => (x.email || x.phone) && (x.step !== "submitted" || x.followUp === "completed") && Date.parse(x.startedAt) >= from && Date.parse(x.startedAt) < to)
    .sort((a, b) => Number(followUpOf(a) === "completed") - Number(followUpOf(b) === "completed") || b.updatedAt.localeCompare(a.updatedAt));
  const setFollowUp = (x: FormSession, value: FollowUp) => {
    // a plain patch keeps updatedAt, so "Left" still says when the visitor left the form
    patch("formSessions", x.id, { followUp: value });
    toast.success(t("followUpSet", { status: t(`followUps.${value}`) }));
  };
  // after a call: record how it went (completing the request sets "completed" by itself)
  const followUpActions = (x: FormSession): RowAction[] => [
    { label: t("followUps.noAnswer"), icon: <PhoneMissed />, onSelect: () => setFollowUp(x, "noAnswer"), hidden: followUpOf(x) === "noAnswer" || followUpOf(x) === "completed" },
    { label: t("followUps.callBack"), icon: <CalendarClock />, onSelect: () => setFollowUp(x, "callBack"), hidden: followUpOf(x) === "callBack" || followUpOf(x) === "completed" },
    { label: t("followUps.notInterested"), icon: <PhoneOff />, onSelect: () => setFollowUp(x, "notInterested"), hidden: followUpOf(x) === "notInterested" || followUpOf(x) === "completed" },
    { label: t("markNew"), icon: <RotateCcw />, onSelect: () => setFollowUp(x, "new"), hidden: followUpOf(x) === "new" || followUpOf(x) === "completed" },
  ];

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
    { id: "followUp", header: t("followUp"), accessorFn: (x) => FOLLOW_UPS.indexOf(followUpOf(x)), cell: ({ row: { original: x } }) => <Badge tone={FOLLOW_UP_TONE[followUpOf(x)]} dot>{t(`followUps.${followUpOf(x)}`)}</Badge> },
    { id: "when", header: t("left"), accessorFn: (x) => x.updatedAt, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{timeAgo(c.getValue() as string, lang)}</span> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: x } }) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {followUpOf(x) === "completed" ? (
            x.offerId && (
              <Button asChild size="sm" variant="ghost">
                <Link href={`/admin/leads/${x.offerId}`}>{x.offerId}</Link>
              </Button>
            )
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/leads/new?session=${x.id}`}><FilePlus2 /> {t("complete")}</Link>
            </Button>
          )}
          <RowActions
            onView={() => setOpenId(x.id)}
            actions={[
              { label: t("call"), icon: <Phone />, onSelect: () => window.open(`tel:${x.phone}`), hidden: !x.phone },
              { label: tf("email"), icon: <Mail />, onSelect: () => window.open(`mailto:${x.email}`), hidden: !x.email },
              ...followUpActions(x).map((a, i) => (i === 0 ? { ...a, separated: true } : a)),
            ]}
          />
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
      <Card className="mb-6">
        <CardBody className="py-4">
          <Funnel steps={s.visitors.funnel} className="mt-0" />
        </CardBody>
      </Card>
      <DataTable
        heading={
          <>
            <h2 className="flex items-center gap-2 font-bold text-ink"><XCircle className="size-4 text-warning" /> {t("needsCompletion")}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("needsCompletionHint")}</p>
          </>
        }
        data={followUp}
        columns={columns}
        search={(x) => `${x.name ?? ""} ${x.email ?? ""} ${x.phone ?? ""}`}
        searchPlaceholder={t("searchPh")}
        onRowClick={(x) => setOpenId(x.id)}
        rowClassName={(x) => (followUpOf(x) === "completed" ? "opacity-70" : undefined)}
        filters={[
          { id: "followUp", label: t("followUp"), options: FOLLOW_UPS.map((v) => ({ value: v, label: t(`followUps.${v}`) })), get: followUpOf },
          { id: "service", label: tf("service"), options: Object.values(serviceMap).map((sv) => ({ value: sv.id, label: L(sv.name) })), get: (x) => x.serviceId ?? "" },
        ]}
      />
      <DetailSheet
        open={!!open}
        onOpenChange={(v) => !v && setOpenId(null)}
        title={open?.name || open?.email || open?.phone || "–"}
        badge={open && <Badge tone={FOLLOW_UP_TONE[followUpOf(open)]} dot>{t(`followUps.${followUpOf(open)}`)}</Badge>}
        subtitle={open && t("leftAgo", { when: timeAgo(open.updatedAt, lang) })}
        footer={
          open ? (
            <>
              {open.phone && (
                <Button asChild variant="outline"><a href={`tel:${open.phone}`}><Phone /> {t("call")}</a></Button>
              )}
              {followUpOf(open) === "completed" ? (
                open.offerId && <Button asChild variant="outline" className="flex-1"><Link href={`/admin/leads/${open.offerId}`}>{t("openRequest", { id: open.offerId })}</Link></Button>
              ) : (
                <Button asChild className="flex-1"><Link href={`/admin/leads/new?session=${open.id}`}><FilePlus2 /> {t("complete")}</Link></Button>
              )}
            </>
          ) : undefined
        }
      >
        {open && (
          <>
            <SheetSection title={t("contact")}>
              <DL
                cols={1}
                items={[
                  { label: tf("name"), value: open.name || "–" },
                  { label: tf("email"), value: open.email ? <a href={`mailto:${open.email}`} className="text-primary hover:underline">{open.email}</a> : "–", ltr: true },
                  { label: tf("phone"), value: open.phone ? <a href={`tel:${open.phone}`} className="text-primary hover:underline">{open.phone}</a> : "–", ltr: true },
                ]}
              />
            </SheetSection>
            <SheetSection title={t("session")}>
              <DL
                items={[
                  { label: tf("service"), value: open.serviceId ? L(serviceMap[open.serviceId]?.name) : "–" },
                  { label: t("reached"), value: ts(`steps.${open.step}`) },
                  { label: t("startedAt"), value: formatDateTime(open.startedAt, lang) },
                  { label: t("left"), value: formatDateTime(open.updatedAt, lang) },
                  { label: t("device"), value: t(`devices.${open.device}`) },
                ]}
              />
            </SheetSection>
            {followUpOf(open) !== "completed" && (
              <SheetSection title={t("followUp")}>
                <Select
                  value={followUpOf(open)}
                  onValueChange={(v) => setFollowUp(open, v as FollowUp)}
                  options={FOLLOW_UPS.filter((v) => v !== "completed").map((v) => ({ value: v, label: t(`followUps.${v}`) }))}
                />
                <p className="mt-2 text-xs text-muted-foreground">{t("completeHint")}</p>
              </SheetSection>
            )}
          </>
        )}
      </DetailSheet>
    </>
  );
}
