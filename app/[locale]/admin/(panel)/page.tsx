"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Banknote, ClipboardList, Clock, FileWarning, MessageSquareWarning, Star, UserPlus, Wallet } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { finance, inLastDays, pctDelta, soldCount } from "@/lib/mock/selectors";
import { trafficSeries } from "@/lib/mock/seed";
import { C } from "@/lib/chart";
import { formatCHF, formatDate, timeAgo } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/bits";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-md)",
  fontSize: 12,
  background: "var(--surface)",
};

export default function Dashboard() {
  const t = useTranslations("admin.dashboard");
  const tn = useTranslations("admin.nav");
  const tf = useTranslations("common.fields");
  const ta = useTranslations("common.actions");
  const tl = useTranslations("admin.leads");
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const { user } = useCurrentUser();
  const db = useStore();
  const serviceMap = useServiceMap();
  const [range, setRange] = useState<"7" | "30">("30");

  const fin = finance(db);
  const leads7 = db.offers.filter((o) => inLastDays(o.createdAt, 7)).length;
  const leadsPrev7 = db.offers.filter((o) => inLastDays(o.createdAt, 7, 7)).length;
  const income30 = db.orders.filter((o) => inLastDays(o.createdAt, 30)).reduce((a, o) => a + o.price, 0);
  const incomePrev30 = db.orders.filter((o) => inLastDays(o.createdAt, 30, 30)).reduce((a, o) => a + o.price, 0);

  const paid = db.offers.filter((o) => soldCount(db, o.id) > 0).length;
  const ratio = db.offers.length ? Math.round((paid / db.offers.length) * 100) : 0;

  const series = useMemo(() => {
    const base = trafficSeries(30);
    return base
      .map((d) => {
        const day = d.date.slice(0, 10);
        const leads = db.offers.filter((o) => o.createdAt.slice(0, 10) === day).length;
        return { ...d, offers: leads, label: formatDate(d.date, lang, { day: "2-digit", month: "short" }) };
      })
      .slice(range === "7" ? -7 : 0);
  }, [db.offers, lang, range]);
  const totVisitors = series.reduce((a, d) => a + d.visitors, 0);
  const totLeads = series.reduce((a, d) => a + d.offers, 0);

  const byService = db.services
    .filter((s) => s.active)
    .map((s) => ({ name: L(s.name), value: db.offers.filter((o) => o.serviceId === s.id && inLastDays(o.createdAt, 90)).length }))
    .sort((a, b) => b.value - a.value);

  const todo = [
    { icon: UserPlus, label: t("todoApplications", { count: db.partners.filter((p) => p.status === "pending" || p.status === "contract_sent").length }), href: "/admin/partners/applications" },
    { icon: Banknote, label: t("todoDues", { count: db.dues.filter((d) => d.status === "pending").length }), href: "/admin/finance/partner-dues" },
    { icon: Star, label: t("todoReviews", { count: db.reviews.filter((r) => r.status === "pending").length }), href: "/admin/moderation/partner-reviews" },
    { icon: MessageSquareWarning, label: t("todoComplaints", { count: db.complaints.filter((c) => c.status === "pending").length }), href: "/admin/moderation/complaints" },
    { icon: FileWarning, label: t("todoReports", { count: db.fakeReports.filter((r) => r.status === "open").length }), href: "/admin/leads/fake-reports" },
  ];

  const latest = db.offers.slice(0, 10);

  return (
    <>
      <PageHeader
        title={t("hello", { name: user?.name.split(" ")[0] ?? "" })}
        subtitle={t("subtitle")}
        actions={
          <Button asChild>
            <Link href="/admin/leads">
              <ClipboardList /> {tn("offers")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("totalIncome")} value={formatCHF(fin.totalIncome, lang)} icon={<Banknote />} delta={pctDelta(income30, incomePrev30)} deltaLabel={t("vsLast")} href="/admin/leads/shop" />
        <KpiCard label={t("kompassDues")} value={formatCHF(fin.kompassDues, lang)} icon={<Wallet />} tone="accent" href="/admin/finance/kompass-dues" />
        <KpiCard label={t("partnerDues")} value={formatCHF(fin.pendingDues, lang)} icon={<Clock />} tone="warning" href="/admin/finance/partner-dues" footer={t("todoDues", { count: db.dues.filter((d) => d.status === "pending").length })} />
        <KpiCard label={t("newLeads")} value={leads7} icon={<ClipboardList />} tone="info" delta={pctDelta(leads7, leadsPrev7)} deltaLabel={t("vsLast")} href="/admin/leads" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader
            title={t("traffic")}
            description={t("trafficSub")}
            action={
              <Tabs value={range} onValueChange={(v) => setRange(v as "7" | "30")}>
                <TabsList className="h-9">
                  <TabsTrigger value="7" className="h-7 text-xs">{t("range7")}</TabsTrigger>
                  <TabsTrigger value="30" className="h-7 text-xs">{t("range30")}</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          />
          <CardBody>
            <div className="mb-4 flex flex-wrap gap-6 text-sm">
              <Legend color={C.primary} label={t("visitors")} value={totVisitors.toLocaleString(lang === "ar" ? "ar" : "en")} />
              <Legend color={C.accent} label={t("leads")} value={totLeads} />
              <Legend color={C.success} label={t("conversion")} value={`${totVisitors ? ((totLeads / totVisitors) * 100).toFixed(2) : 0}%`} />
            </div>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: -18, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.primary} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke={C.axis} interval="preserveStartEnd" minTickGap={24} reversed={lang === "ar"} />
                  <YAxis yAxisId="v" tickLine={false} axisLine={false} fontSize={11} stroke={C.axis} orientation={lang === "ar" ? "right" : "left"} />
                  <YAxis yAxisId="o" hide />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area isAnimationActive={false} yAxisId="v" type="monotone" dataKey="visitors" name={t("visitors")} stroke={C.primary} strokeWidth={2} fill="url(#gV)" />
                  <Area isAnimationActive={false} yAxisId="o" type="monotone" dataKey="offers" name={t("leads")} stroke={C.accent} strokeWidth={2} fill="url(#gO)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader title={t("paidRatio")} description={t("paidRatioSub")} />
            <CardBody className="flex items-center gap-5">
              <div className="relative size-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie isAnimationActive={false} data={[{ v: paid }, { v: db.offers.length - paid }]} dataKey="v" innerRadius={44} outerRadius={60} startAngle={90} endAngle={-270} stroke="none">
                      <Cell fill={C.primary} />
                      <Cell fill={C.muted} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-ink">{ratio}%</span>
              </div>
              <div className="space-y-3 text-sm">
                <Legend color={C.primary} label={t("paid")} value={paid} />
                <Legend color={C.muted} label={t("unpaid")} value={db.offers.length - paid} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("todo")} />
            <CardBody className="pt-3">
              <ul className="divide-y">
                {todo.map(({ icon: I, label, href }) => (
                  <li key={href}>
                    <Link href={href} className="group flex items-center gap-3 py-2.5 text-sm">
                      <I className="size-4 text-muted-foreground" />
                      <span className="flex-1 font-medium">{label}</span>
                      <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary flip-rtl" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <CardHeader
            title={t("latest")}
            description={t("latestSub")}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/leads">
                  {ta("viewAll")} <ArrowRight className="flip-rtl" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-start font-semibold">#</th>
                  <th className="px-5 py-2.5 text-start font-semibold">{tf("service")}</th>
                  <th className="px-5 py-2.5 text-start font-semibold">{tl("route")}</th>
                  <th className="px-5 py-2.5 text-start font-semibold">{tf("created")}</th>
                  <th className="px-5 py-2.5 text-start font-semibold">{tf("status")}</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((o) => (
                  <tr key={o.id} className="cursor-pointer border-t hover:bg-surface-2/70" onClick={() => router.push(`/admin/leads/${o.id}`)}>
                    <td className="px-5 py-3"><Mono>{o.id}</Mono></td>
                    <td className="px-5 py-3">{L(serviceMap[o.serviceId]?.name)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.from.city} → {o.to.city}</td>
                    <td className="px-5 py-3 text-muted-foreground">{timeAgo(o.createdAt, lang)}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("byService")} description="90d" />
          <CardBody>
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byService} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} fontSize={11} stroke={C.axis} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: C.surface2 }} />
                  <Bar isAnimationActive={false} dataKey="value" name={t("leads")} fill={C.primary} radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {byService.length === 0 && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="size-4" /> –</p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}
