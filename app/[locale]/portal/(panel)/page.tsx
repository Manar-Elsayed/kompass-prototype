"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CalendarCheck, CircleCheck, ClipboardCheck, Clock, FileWarning, Headset, MessageSquare, ShoppingBag, Star, Wallet, Receipt, Trophy } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Link, useRouter } from "@/i18n/navigation";
import { cn, formatCHF, formatDate, timeAgo } from "@/lib/utils";
import { C } from "@/lib/chart";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL, useLang, usePartnerRatings, useServiceMap } from "@/lib/mock/hooks";
import { OUTCOME_TONE, availableLeads, documentState, inLastDays, isOverdue, leadOutcome, refNow, winRate } from "@/lib/mock/selectors";
import { DAY } from "@/lib/mock/seed";
import type { DocKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Stars } from "@/components/shared/bits";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";
import { useLowBalance } from "@/components/portal/low-balance";
import { LeadCard } from "@/components/portal/lead-card";
import { useCanBuy } from "@/components/portal/shell";
import { FeedRow, usePartnerFeed } from "@/components/portal/feed";
import { useThreads } from "@/components/shared/message-thread";

const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", fontSize: 12 };

export default function PortalDashboard() {
  const t = useTranslations("portal.dashboard");
  const tn = useTranslations("portal.nav");
  const tsh = useTranslations("portal.shop");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const dues = useStore((s) => s.dues);
  const ratings = usePartnerRatings();
  const canBuy = useCanBuy();

  const available = availableLeads({ offers, orders }, partner).sort((a, b) => b.offer.createdAt.localeCompare(a.offer.createdAt));
  const mine = orders.filter((o) => o.partnerId === partner.id);
  const last30 = mine.filter((o) => inLastDays(o.createdAt, 30));
  const pending = dues.filter((d) => d.partnerId === partner.id && d.status === "pending");
  const rating = ratings[partner.id];
  const fakeReports = useStore((s) => s.fakeReports);
  const refunds = useStore((s) => s.refunds);
  // how often bought offers turn into jobs (from what the company reported)
  const win = winRate({ orders, offers, fakeReports, refunds }, partner.id);

  return (
    <>
      <PageHeader
        title={t("hello", { name: partner.ownerName.split(" ")[0] })}
        subtitle={t("subtitle")}
        actions={<Button asChild variant="accent"><Link href="/portal/shop"><ShoppingBag /> {t("goShop")}</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label={t("wallet")}
          value={formatCHF(partner.wallet, lang)}
          icon={<Wallet />}
          href="/portal/payments"
          footer={pending.length ? <span className="flex items-center gap-1 text-warning"><Clock className="size-3.5" />{t("pending", { count: pending.length })}</span> : <span className="font-semibold text-primary">{t("topUp")} →</span>}
        />
        <KpiCard label={t("available")} value={available.length} icon={<ShoppingBag />} tone="accent" href="/portal/shop" />
        <KpiCard label={t("bought30")} value={last30.length} icon={<ClipboardCheck />} tone="info" href="/portal/leads" footer={t("spent30", { amount: formatCHF(last30.reduce((a, o) => a + o.price, 0), lang) })} />
        <KpiCard
          label={t("winRate")}
          value={win.rate === null ? "–" : `${win.rate}%`}
          icon={<Trophy />}
          tone="success"
          href="/portal/leads"
          footer={win.decided ? t("winRateFoot", { won: win.won, decided: win.decided }) : t("winRateEmpty")}
        />
        <KpiCard label={t("rating")} value={rating ? rating.avg.toFixed(1) : "–"} icon={<Star />} tone="warning" href="/portal/reviews" footer={<Stars value={rating?.avg ?? 0} />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        {/* fresh offers lead the main column; what needs attention heads the side column */}
        <div className="min-w-0 space-y-6">
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-ink">{t("fresh")}</h2>
                <p className="text-sm text-muted-foreground">{t("freshSub")}</p>
              </div>
              <Button asChild variant="ghost" size="sm"><Link href="/portal/shop">{tn("shop")} <ArrowRight /></Link></Button>
            </div>
            {available.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {available.slice(0, 4).map((x) => <LeadCard key={x.offer.id} offer={x.offer} sold={x.sold} canBuy={canBuy} compact />)}
              </div>
            ) : (
              <Card><EmptyState icon={<ShoppingBag />} title={tsh("empty")} body={tsh("emptyHint")} /></Card>
            )}
          </section>
          <SpendChart />
        </div>

        <div className="space-y-4">
          <ToDo />
          <Activity />
          <KompassMessages />
        </div>
      </div>

      {/* the full purchase list lives in My offers; this is the latest few, as a reference at the end */}
      <RecentPurchases />
    </>
  );
}

type Todo = { id: string; tone: "danger" | "warning" | "success" | "info"; icon: React.ReactNode; text: string; cta: string; href: string };

/**
 * Everything waiting on the company, most urgent first, each with one action: documents that stop
 * purchases, invoices to pay, customers who booked them, assigned leads, unread messages, a low wallet.
 */
function ToDo() {
  const t = useTranslations("portal.dashboard.todo");
  const tp = useTranslations("admin.partners");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const wallet = useLowBalance();
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const fakeReports = useStore((s) => s.fakeReports);
  const refunds = useStore((s) => s.refunds);
  const invoices = useStore((s) => s.invoices);
  const services = useStore((s) => s.services);
  const threads = useThreads(partner.id, "company");

  const items: Todo[] = [];
  const docs = documentState(partner);
  const names = (keys: DocKey[]) => keys.map((k) => tp(k)).join(", ");
  if (docs.missing.length || docs.expired.length)
    items.push({ id: "docs", tone: "danger", icon: <FileWarning />, text: t("docsBlocked", { docs: names([...docs.missing, ...docs.expired]) }), cta: t("upload"), href: "/portal/profile?tab=documents" });
  else if (docs.expiring.length && docs.next)
    items.push({ id: "docs", tone: "warning", icon: <FileWarning />, text: t("docsExpiring", { doc: tp(docs.next.key), date: formatDate(docs.next.date, lang) }), cta: t("upload"), href: "/portal/profile?tab=documents" });

  for (const i of invoices.filter((x) => x.partnerId === partner.id && x.status === "due").sort((a, b) => a.dueAt.localeCompare(b.dueAt))) {
    const overdue = isOverdue(i);
    if (!overdue && Date.parse(i.dueAt) - refNow() > 14 * DAY) continue;
    items.push({ id: i.id, tone: overdue ? "danger" : "warning", icon: <Receipt />, text: t(overdue ? "invoiceOverdue" : "invoiceDue", { id: i.id, amount: formatCHF(i.amount, lang), date: formatDate(i.dueAt, lang) }), cta: t("pay"), href: "/portal/payments?tab=invoices" });
  }

  const offerMap = new Map(offers.map((o) => [o.id, o]));
  for (const o of orders.filter((x) => x.partnerId === partner.id)) {
    const out = leadOutcome({ offers, fakeReports, refunds }, o);
    const lead = offerMap.get(o.offerId);
    if (!lead) continue;
    if (out.status === "chosen")
      items.push({ id: `c-${o.id}`, tone: "success", icon: <CalendarCheck />, text: t("chosen", { name: `${lead.firstName} ${lead.lastName}`, date: formatDate(lead.executionDate, lang) }), cta: t("open"), href: `/portal/leads?open=${o.offerId}` });
    else if (out.assigned && out.group === "open" && inLastDays(o.createdAt, 14))
      items.push({ id: `a-${o.id}`, tone: "info", icon: <Headset />, text: t("assigned", { id: o.offerId, city: lead.from.city }), cta: t("call"), href: `/portal/leads?open=${o.offerId}` });
  }

  const unread = threads.filter((x) => x.unread > 0);
  if (unread.length)
    items.push({ id: "msg", tone: "info", icon: <MessageSquare />, text: t("messages", { count: unread.length }), cta: t("read"), href: unread.length === 1 ? `/portal/messages?thread=${unread[0].id}` : "/portal/messages" });

  // same rule as the shop banner and the admin flag: below the cheapest offer the company takes
  if (wallet.low)
    items.push({ id: "wallet", tone: "warning", icon: <Wallet />, text: t("lowWallet", { price: formatCHF(wallet.min, lang) }), cta: t("topUp"), href: "/portal/payments?topup=online" });

  const toneCls = { danger: "bg-danger-soft text-danger", warning: "bg-warning-soft text-warning", success: "bg-success-soft text-success", info: "bg-info-soft text-info" };

  return (
    <Card className="overflow-hidden">
      <CardHeader title={t("title")} description={items.length ? t("subtitle", { count: items.length }) : undefined} />
      {items.length ? (
        <ul className="mt-4 divide-y border-t">
          {items.slice(0, 6).map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", toneCls[i.tone])}>{i.icon}</span>
              <span className="min-w-0 flex-1 text-ink">{i.text}</span>
              <Button asChild size="sm" variant={i.tone === "danger" ? "accent" : "outline"} className="shrink-0">
                <Link href={i.href}>{i.cta}</Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <CardBody className="flex items-center gap-3 pt-3 text-sm text-muted-foreground">
          <CircleCheck className="size-5 text-success" /> {t("allDone")}
        </CardBody>
      )}
    </Card>
  );
}

/** What changed recently: the same notifications as the bell, as a list. */
function Activity() {
  const t = useTranslations("portal.feed");
  const { items, since } = usePartnerFeed();
  return (
    <Card id="activity" className="h-fit scroll-mt-24 overflow-hidden">
      <CardHeader title={t("activity")} />
      {items.length ? (
        <div className="mt-3 max-h-96 divide-y overflow-y-auto border-t">
          {items.slice(0, 12).map((i) => <FeedRow key={i.id} item={i} unread={i.at > since} />)}
        </div>
      ) : (
        <EmptyState title={t("empty")} className="py-8" />
      )}
    </Card>
  );
}

/** Conversations with unread replies from Kompass first; opening one happens on the Messages page. */
function KompassMessages() {
  const t = useTranslations("portal.dashboard");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const threads = useThreads(partner.id, "company").filter((x) => x.messages.some((m) => m.from === "kompass"));
  if (!threads.length) return null;
  return (
    <Card className="h-fit">
      <CardHeader title={t("messages")} action={<Button asChild variant="ghost" size="sm"><Link href="/portal/messages">{t("allMessages")}</Link></Button>} />
      <CardBody className="pt-3">
        <ul className="divide-y">
          {threads.slice(0, 3).map((th) => (
            <li key={th.id}>
              <Link href={`/portal/messages?thread=${th.id}`} className="block py-2.5 text-sm hover:text-primary">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  {th.unread > 0 && <span className="size-2 shrink-0 rounded-full bg-accent" aria-label={t("unread")} />}
                  <span className="truncate">{th.subject}</span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-muted-foreground">{th.last.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(th.last.createdAt, lang)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function RecentPurchases() {
  const t = useTranslations("portal.dashboard");
  const tn = useTranslations("portal.nav");
  const tl = useTranslations("portal.leads");
  const tf = useTranslations("common.fields");
  const ta = useTranslations("admin.leads");
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const partner = useCurrentPartner()!;
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const fakeReports = useStore((s) => s.fakeReports);
  const refunds = useStore((s) => s.refunds);
  const serviceMap = useServiceMap();
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const mine = orders.filter((o) => o.partnerId === partner.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const th = "whitespace-nowrap px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground first:ps-4 last:pe-4";
  const td = "px-3 py-3 align-middle first:ps-4 last:pe-4";
  return (
    <Card className="mt-6 overflow-hidden">
      <CardHeader title={t("recent")} action={<Button asChild variant="ghost" size="sm"><Link href="/portal/leads">{tn("leads")} <ArrowRight /></Link></Button>} />
      {mine.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/60">
              <tr>
                <th className={th}>{ta("customer")}</th>
                <th className={cn(th, "hidden sm:table-cell")}>{tf("reference")}</th>
                <th className={cn(th, "hidden md:table-cell")}>{tf("service")}</th>
                <th className={cn(th, "hidden sm:table-cell")}>{tl("bought")}</th>
                <th className={cn(th, "text-end")}>{tl("paid")}</th>
                <th className={th}>{tf("status")}</th>
              </tr>
            </thead>
            <tbody>
              {mine.slice(0, 6).map((o) => {
                const lead = offerMap[o.offerId];
                const out = leadOutcome({ offers, fakeReports, refunds }, o);
                const open = `/portal/leads?open=${o.offerId}`;
                return (
                  <tr key={o.id} onClick={() => router.push(open)} className="cursor-pointer border-t transition-colors hover:bg-surface-2/70">
                    <td className={td}>
                      <Link href={open} className="font-semibold text-ink hover:text-primary">{lead?.firstName} {lead?.lastName}</Link>
                    </td>
                    <td className={cn(td, "hidden sm:table-cell")}><Mono className="whitespace-nowrap text-xs">{o.offerId}</Mono></td>
                    <td className={cn(td, "hidden md:table-cell")}>{L(serviceMap[lead?.serviceId ?? ""]?.name)}</td>
                    <td className={cn(td, "hidden whitespace-nowrap text-muted-foreground sm:table-cell")}>{timeAgo(o.createdAt, lang)}</td>
                    <td className={cn(td, "whitespace-nowrap text-end font-semibold tabular-nums")}>{formatCHF(o.price, lang)}</td>
                    <td className={td}>
                      <Badge tone={OUTCOME_TONE[out.status]} dot>{tl(`outcome.${out.status}`)}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <CardBody><EmptyState title={t("noRecent")} className="py-8" /></CardBody>
      )}
    </Card>
  );
}

/** Leads bought and money spent per month, last six months. */
function SpendChart() {
  const t = useTranslations("portal.dashboard");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const orders = useStore((s) => s.orders);
  const data = useMemo(() => {
    const now = new Date(refNow());
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
      const key = d.toISOString().slice(0, 7);
      const mine = orders.filter((o) => o.partnerId === partner.id && o.createdAt.startsWith(key));
      return { month: formatDate(d.toISOString(), lang, { month: "short" }), leads: mine.length, spent: mine.reduce((a, o) => a + o.price, 0) };
    });
  }, [orders, partner.id, lang]);
  const total = data.reduce((a, d) => a + d.spent, 0);
  return (
    <Card>
      <CardHeader title={t("chartTitle")} description={t("chartSub", { offers: data.reduce((a, d) => a + d.leads, 0), amount: formatCHF(total, lang) })} />
      <CardBody>
        <div className="h-48" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 0, top: 8 }}>
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke={C.axis} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: C.surface2 }}
                formatter={(value, name) => (name === "spent" ? [formatCHF(Number(value), lang), t("chartSpent")] : [value, t("chartLeads")])}
              />
              <Bar isAnimationActive={false} dataKey="spent" name="spent" fill={C.primary} radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
