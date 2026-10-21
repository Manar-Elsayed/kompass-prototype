"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  ClipboardList,
  Clock,
  FileWarning,
  FileX2,
  MessageSquareReply,
  ShieldAlert,
  UserX,
  Star,
  Trophy,
  UserPlus,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useL, useLang } from "@/lib/mock/hooks";
import { canBuyLeads, dashboardStats, isExpiringSoon, isOverdue, needsFollowUp, periodRange, type Period } from "@/lib/mock/selectors";
import { visitorsOnDay } from "@/lib/mock/seed";
import { C } from "@/lib/chart";
import { cn, formatCHF, formatNumber } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/ui";
import { PeriodPicker, currentMonth } from "@/components/admin/period-picker";
import { Funnel } from "@/components/admin/funnel";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-md)",
  fontSize: 12,
  background: "var(--surface)",
};

export default function Dashboard() {
  const t = useTranslations("admin.dashboard");
  const ts = useTranslations("admin.dashboard.stats");
  const L = useL();
  const lang = useLang();
  const { user } = useCurrentUser();
  const db = useStore();
  const [period, setPeriod] = useState<Period>(currentMonth);

  const s = useMemo(() => dashboardStats(db, period, visitorsOnDay), [db, period]);
  const { from, to } = periodRange(period);
  const byService = db.services
    .filter((x) => x.active)
    .map((x) => ({ name: L(x.name), value: db.offers.filter((o) => o.serviceId === x.id && Date.parse(o.createdAt) >= from && Date.parse(o.createdAt) < to).length }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxBought = s.companies.perCompany[0]?.bought ?? 1;
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

  // what needs a human now, most urgent first; empty items are hidden
  const todo = [
    { icon: MessageSquareReply, n: db.contacts.filter(needsFollowUp).length, label: "todoFollowUp", href: "/admin/inbox", urgent: true },
    { icon: UserX, n: db.offers.filter((o) => o.noShow && o.noShow.status !== "resolved").length, label: "todoNoShow", href: "/admin/leads", urgent: true },
    { icon: ShieldAlert, n: db.offers.filter((o) => o.status === "new").length, label: "todoReview", href: "/admin/leads", urgent: true },
    { icon: Clock, n: db.offers.filter(isExpiringSoon).length, label: "todoExpiring", href: "/admin/leads" },
    { icon: FileX2, n: db.partners.filter((p) => p.status === "approved" && !p.banned && !canBuyLeads(p)).length, label: "todoDocs", href: "/admin/partners" },
    { icon: FileWarning, n: db.fakeReports.filter((r) => r.status === "open").length, label: "todoReports", href: "/admin/leads/fake-reports" },
    { icon: Banknote, n: db.dues.filter((d) => d.status === "pending").length, label: "todoDues", href: "/admin/finance/partner-dues" },
    { icon: AlertTriangle, n: db.invoices.filter(isOverdue).length, label: "todoInvoices", href: "/admin/finance/invoices" },
    { icon: UserPlus, n: db.partners.filter((p) => p.status === "pending" || p.status === "contract_sent").length, label: "todoApplications", href: "/admin/partners/applications" },
    { icon: Star, n: db.reviews.filter((r) => r.status === "pending").length, label: "todoReviews", href: "/admin/moderation/partner-reviews" },
  ].filter((x) => x.n > 0);

  return (
    <>
      <PageHeader title={t("hello", { name: user?.name.split(" ")[0] ?? "" })} subtitle={t("subtitle")} actions={<PeriodPicker value={period} onChange={setPeriod} />} />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          {/* A. offers */}
          <Section title={t("sections.offers")} action={<Link href="/admin/leads" className="text-sm font-semibold text-primary hover:underline">{t("open.leads")}</Link>}>
            <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
              <Stat label={ts("received")} value={s.offers.received} />
              <Stat label={ts("sold")} value={s.offers.sold} hint={ts("ofReceived", { pct: pct(s.offers.sold, s.offers.received) })} />
              <Stat label={ts("fake")} value={s.offers.fake} tone={s.offers.fake ? "danger" : undefined} />
              <Stat label={ts("total")} value={s.offers.total} muted />
            </div>
            {byService.length > 0 && (
              <div className="mt-4 h-44" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byService} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} fontSize={11} stroke={C.axis} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: C.surface2 }} />
                    <Bar isAnimationActive={false} dataKey="value" name={ts("received")} fill={C.primary} radius={[0, 6, 6, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* B. companies */}
          <Section title={t("sections.companies")} action={<Link href="/admin/partners/recommendations" className="text-sm font-semibold text-primary hover:underline">{t("open.reco")}</Link>}>
            <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
              <Stat label={ts("registered")} value={s.companies.registered} />
              <Stat label={ts("active")} value={s.companies.active} hint={ts("ofRegistered", { pct: pct(s.companies.active, s.companies.registered) })} />
              <Stat label={ts("buyers")} value={s.companies.buyers} />
            </div>
            <p className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold text-ink"><Trophy className="size-4 text-warning" /> {ts("perCompany")}</p>
            {s.companies.perCompany.length ? (
              <ol className="space-y-2">
                {s.companies.perCompany.slice(0, 8).map((c, i) => (
                  <li key={c.id} className="grid grid-cols-[1.5rem_minmax(0,12rem)_1fr_2.5rem] items-center gap-3 text-sm">
                    <span className={cn("text-center font-bold", i < 3 ? "text-warning" : "text-muted-foreground")}>{i + 1}</span>
                    <Link href={`/admin/partners/${c.id}`} className="truncate font-medium text-ink hover:text-primary">{c.name}</Link>
                    <span className="h-2 rounded-full bg-primary/80" style={{ width: `${Math.max(6, (c.bought / maxBought) * 100)}%` }} aria-hidden />
                    <span className="text-end font-semibold">{c.bought}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">{ts("noBuyers")}</p>
            )}
          </Section>

          {/* C. wallets & money */}
          <Section
            title={t("sections.money")}
            action={
              <span className="flex gap-3 text-sm font-semibold">
                <Link href="/admin/finance/wallets" className="text-primary hover:underline">{t("open.wallets")}</Link>
                <Link href="/admin/finance/refunds" className="text-primary hover:underline">{t("open.refunds")}</Link>
              </span>
            }
          >
            <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
              <Stat label={ts("toppedUpCompanies")} value={s.money.toppedUpCompanies} />
              <Stat label={ts("toppedUp")} value={formatCHF(s.money.toppedUp, lang)} tone="success" />
              <Stat label={ts("refundedFake")} value={formatCHF(s.money.refundedFake, lang)} hint={ts("refunds", { count: s.money.refundedFakeCount })} />
              <Stat label={ts("credit")} value={formatCHF(s.money.credit, lang)} muted />
            </div>
          </Section>

          {/* D. visitors & offer form */}
          <Section title={t("sections.visitors")} action={<Link href="/admin/insights/offer-form" className="text-sm font-semibold text-primary hover:underline">{t("open.funnel")}</Link>}>
            <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-5">
              <Stat label={ts("visitors")} value={formatNumber(s.visitors.visitors, lang)} />
              <Stat label={ts("notStarted")} value={formatNumber(s.visitors.notStarted, lang)} muted />
              <Stat label={ts("notCompleted")} value={s.visitors.notCompleted} tone={s.visitors.notCompleted ? "warning" : undefined} />
              <Stat label={ts("completed")} value={s.visitors.completed} tone="success" />
              <Stat label={ts("fakeSubmitted")} value={s.visitors.fake} tone={s.visitors.fake ? "danger" : undefined} />
            </div>
            <Funnel steps={s.visitors.funnel} />
          </Section>
        </div>

        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader title={t("todo")} />
          <CardBody className="pt-3">
            {todo.length ? (
              <ul className="divide-y">
                {todo.map(({ icon: I, n, label, href, urgent }) => (
                  <li key={label}>
                    <Link href={href} className="group flex items-center gap-3 py-2.5 text-sm">
                      <I className={cn("size-4", urgent ? "text-danger" : "text-muted-foreground")} />
                      <span className={cn("flex-1", urgent ? "font-semibold text-ink" : "font-medium")}>{t(label, { count: n })}</span>
                      <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">{t("allClear")}</p>
            )}
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link href="/admin/leads"><ClipboardList /> {t("open.leads")}</Link>
            </Button>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} action={action} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

/** One figure in a section's stat strip. */
function Stat({ label, value, hint, tone, muted }: { label: string; value: React.ReactNode; hint?: string; tone?: "success" | "warning" | "danger"; muted?: boolean }) {
  return (
    <div className="bg-surface p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : muted ? "text-muted-foreground" : "text-ink",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
