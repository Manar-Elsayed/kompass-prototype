"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ClipboardCheck, Clock, ShoppingBag, Star, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatCHF, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL, useLang, usePartnerRatings, useServiceMap } from "@/lib/mock/hooks";
import { availableLeads, inLastDays } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Stars, StatusBadge } from "@/components/shared/bits";
import { KpiCard, Mono, PageHeader } from "@/components/admin/ui";
import { LeadCard } from "@/components/portal/lead-card";
import { useCanBuy } from "@/components/portal/shell";

export default function PortalDashboard() {
  const t = useTranslations("portal.dashboard");
  const tn = useTranslations("portal.nav");
  const tsh = useTranslations("portal.shop");
  const L = useL();
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const dues = useStore((s) => s.dues);
  const invoices = useStore((s) => s.invoices);
  const ratings = usePartnerRatings();
  const serviceMap = useServiceMap();
  const canBuy = useCanBuy();

  const available = availableLeads({ offers, orders }, partner).sort((a, b) => b.offer.createdAt.localeCompare(a.offer.createdAt));
  const mine = orders.filter((o) => o.partnerId === partner.id);
  const bought30 = mine.filter((o) => inLastDays(o.createdAt, 30)).length;
  const pending = dues.filter((d) => d.partnerId === partner.id && d.status === "pending");
  const creditDue = invoices.filter((i) => i.partnerId === partner.id && i.status === "due").reduce((a, i) => a + i.amount, 0);
  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const rating = ratings[partner.id];

  return (
    <>
      <PageHeader
        title={t("hello", { name: partner.ownerName.split(" ")[0] })}
        subtitle={t("subtitle")}
        actions={<Button asChild variant="accent"><Link href="/portal/shop"><ShoppingBag /> {t("goShop")}</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("wallet")}
          value={formatCHF(partner.wallet, lang)}
          icon={<Wallet />}
          href="/portal/payments"
          footer={pending.length ? <span className="flex items-center gap-1 text-warning"><Clock className="size-3.5" />{t("pending", { count: pending.length })}</span> : <span className="font-semibold text-primary">{t("topUp")} →</span>}
        />
        <KpiCard label={t("available")} value={available.length} icon={<ShoppingBag />} tone="accent" href="/portal/shop" />
        <KpiCard label={t("bought30")} value={bought30} icon={<ClipboardCheck />} tone="info" href="/portal/leads" footer={creditDue ? `${t("outstanding")}: ${formatCHF(creditDue, lang)}` : undefined} />
        <KpiCard label={t("rating")} value={rating ? rating.avg.toFixed(1) : "–"} icon={<Star />} tone="warning" href="/portal/reviews" footer={<Stars value={rating?.avg ?? 0} />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <section className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-ink">{t("fresh")}</h2>
              <p className="text-sm text-muted-foreground">{t("freshSub")}</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href="/portal/shop">{tn("shop")} <ArrowRight className="" /></Link></Button>
          </div>
          {available.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {available.slice(0, 4).map((x) => <LeadCard key={x.offer.id} offer={x.offer} sold={x.sold} canBuy={canBuy} compact />)}
            </div>
          ) : (
            <Card><EmptyState icon={<ShoppingBag />} title={tsh("empty")} /></Card>
          )}
        </section>

        <div className="space-y-4">
        <KompassMessages />
        <Card className="h-fit">
          <CardHeader title={t("recent")} action={<Button asChild variant="ghost" size="sm"><Link href="/portal/leads">{tn("leads")}</Link></Button>} />
          <CardBody className="pt-3">
            {mine.length ? (
              <ul className="divide-y">
                {mine.slice(0, 6).map((o) => {
                  const lead = offerMap[o.offerId];
                  return (
                    <li key={o.id}>
                      <Link href={`/portal/leads?open=${o.offerId}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink">{lead?.firstName} {lead?.lastName}</p>
                          <p className="truncate text-xs text-muted-foreground"><Mono className="text-xs font-medium text-muted-foreground">{o.offerId}</Mono> · {L(serviceMap[lead?.serviceId ?? ""]?.name)} · {timeAgo(o.createdAt, lang)}</p>
                        </div>
                        {o.executed ? <StatusBadge status="completed" /> : <span className="font-semibold">{formatCHF(o.price, lang)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title={t("noRecent")} className="py-8" />
            )}
          </CardBody>
        </Card>
        </div>
      </div>
    </>
  );
}

/** Messages Kompass sent this company from the admin. Viewing them here marks them read. */
function KompassMessages() {
  const t = useTranslations("portal.dashboard");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const all = useStore((s) => s.messages);
  const markRead = useStore((s) => s.markMessagesRead);
  const mine = all.filter((m) => m.partnerId === partner.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const unread = mine.some((m) => !m.readAt);
  useEffect(() => {
    if (unread) markRead(partner.id);
  }, [unread, markRead, partner.id]);
  if (!mine.length) return null;
  return (
    <Card className="h-fit">
      <CardHeader title={t("messages")} />
      <CardBody className="pt-3">
        <ul className="divide-y">
          {mine.slice(0, 3).map((m) => (
            <li key={m.id} className="py-2.5 text-sm">
              <p className="flex items-center gap-2 font-semibold text-ink">
                {!m.readAt && <span className="size-2 rounded-full bg-accent" aria-label={t("unread")} />}
                {m.subject}
              </p>
              <p className="mt-0.5 line-clamp-3 text-muted-foreground">{m.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{timeAgo(m.createdAt, lang)}</p>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
