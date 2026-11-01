"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BellRing, CheckCircle2, Flag, Headset, Mail, Phone, PhoneMissed, ShoppingBag, Trophy, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { ORDER_OUTCOMES, type OrderOutcome } from "@/lib/types";
import { cn, formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useHydrated, useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { leadOutcome } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, useConfirm } from "@/components/shared/bits";
import { DL, Mono, PageHeader } from "@/components/admin/ui";
import { JobFacts, JobPlaces } from "@/components/shared/job-details";
import { LeadStatus, OutcomeBanner, ReportDialog } from "@/components/portal/lead-outcome";

/**
 * One bought offer on its own page: what happened to it, how the call went, the customer to call
 * and the job itself. Reached from My offers, the overview and notifications (by offer id).
 */
export default function MyOfferPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("portal.leads");
  const tl = useTranslations("admin.leads");
  const tn = useTranslations("portal.nav");
  const tsh = useTranslations("portal.shop");
  const L = useL();
  const lang = useLang();
  const hydrated = useHydrated();
  const partner = useCurrentPartner()!;
  const order = useStore((s) => s.orders.find((o) => o.offerId === id && o.partnerId === partner.id));
  const lead = useStore((s) => s.offers.find((o) => o.id === id));
  const offers = useStore((s) => s.offers);
  const fakeReports = useStore((s) => s.fakeReports);
  const refunds = useStore((s) => s.refunds);
  const patch = useStore((s) => s.patch);
  const serviceMap = useServiceMap();
  const { confirm, dialog } = useConfirm();
  const [reporting, setReporting] = useState(false);

  // the saved purchases load after the first render; only then is a missing offer really missing
  if (!order || !lead) {
    if (!hydrated) return null;
    return (
      <>
        <PageHeader crumbs={[{ label: t("title"), href: "/portal/leads" }, { label: id }]} title={<Mono className="text-2xl">{id}</Mono>} />
        <Card>
          <EmptyState icon={<ShoppingBag />} title={t("notMine")} action={<Button asChild variant="outline"><Link href="/portal/leads">{tn("leads")}</Link></Button>} />
        </Card>
      </>
    );
  }

  const out = leadOutcome({ offers, fakeReports, refunds }, order);
  // after the call: how it went (click the same answer again to clear it)
  const setOutcome = (outcome: OrderOutcome) => {
    const clear = order.outcome === outcome;
    patch("orders", order.id, clear ? { outcome: undefined, outcomeAt: undefined } : { outcome, outcomeAt: new Date().toISOString() });
    toast.success(clear ? t("outcomeCleared") : t("outcomeSaved", { status: t(`outcome.${outcome}`) }));
  };
  const markExecuted = () =>
    confirm({
      title: t("markDoneTitle", { id: order.offerId }),
      body: t("markDoneBody"),
      tone: "success",
      confirmLabel: t("markDone"),
      onConfirm: () => {
        patch("orders", order.id, { executed: true });
        toast.success(t("executed"));
      },
    });
  const canReport = !out.report && out.group === "open";
  const canExecute = out.group === "open" || out.group === "won";
  // the company says how it went until the customer's answer settles it
  const canSetOutcome = ["open", "won", "lost"].includes(out.group) && !out.report && !out.byCustomer;

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("title"), href: "/portal/leads" }, { label: lead.id }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Mono className="text-2xl">{lead.id}</Mono>
            <LeadStatus order={order} withNote={false} />
          </span>
        }
        subtitle={`${L(serviceMap[lead.serviceId]?.name)} · ${t("boughtOn", { date: formatDateTime(order.createdAt, lang) })}`}
        actions={
          (canReport || canExecute) && (
            <>
              {canReport && <Button variant="outline" className="text-danger hover:bg-danger-soft" onClick={() => setReporting(true)}><Flag /> {t("report")}</Button>}
              {canExecute && <Button variant="success" onClick={markExecuted}><CheckCircle2 /> {t("markDone")}</Button>}
            </>
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <OutcomeBanner order={order} />
          {order.channel === "manual" && (
            <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-ink"><Headset className="size-4 text-accent" /> {t("assignedTitle", { price: formatCHF(order.price, lang) })}</p>
              <p className="mt-1 text-muted-foreground">{order.note ? `“${order.note}”` : t("assignedNoNote")}</p>
            </div>
          )}
          {out.byCustomer && (
            <div className={cn("rounded-xl border p-4 text-sm", out.status === "chosen" ? "border-success/30 bg-success-soft/40" : "bg-surface-2/60")}>
              <p className="flex items-center gap-2 font-semibold text-ink"><UserCheck className="size-4 text-success" /> {t("confirmedByCustomer")}</p>
              <p className="mt-1 text-muted-foreground">{t(out.status === "chosen" ? "choiceHint.you" : "choiceHint.other")}</p>
              {out.overridden && order.outcome && <p className="mt-1 text-xs text-muted-foreground">{t("overridden", { status: t(`outcome.${order.outcome}`) })}</p>}
            </div>
          )}
          {canSetOutcome && (
            <Card>
              <CardHeader title={t("outcomeTitle")} description={t("outcomeHint")} />
              <CardBody>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(ORDER_OUTCOMES as readonly OrderOutcome[]).map((x) => (
                    <Button
                      key={x}
                      variant={order.outcome === x ? (x === "won" ? "success" : "secondary") : "outline"}
                      aria-pressed={order.outcome === x}
                      onClick={() => setOutcome(x)}
                      className="h-auto min-h-11 whitespace-normal py-2"
                    >
                      {x === "won" ? <Trophy /> : x === "lost" ? <UserX /> : <PhoneMissed />} {t(`set.${x}`)}
                    </Button>
                  ))}
                </div>
                {/* a number nobody answers may mean a fake request: point to the refund path */}
                {order.outcome === "unreachable" && (
                  <p className="mt-3 rounded-lg bg-warning-soft/60 px-3 py-2 text-xs text-ink">
                    {t("unreachableHint")}{" "}
                    <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setReporting(true)}>{t("report")}</button>
                  </p>
                )}
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={t("jobTitle")} />
            <CardBody className="space-y-4">
              <JobPlaces offer={lead} />
              <JobFacts offer={lead} />
              {lead.details && <p className="rounded-xl border border-dashed p-4 text-sm">“{lead.details}”</p>}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-primary-soft/40 shadow-none">
            <CardHeader title={t("customerTitle")} />
            <CardBody>
              <p className="text-lg font-bold text-ink">{lead.firstName} {lead.lastName}</p>
              {lead.requester && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("bookedBy", { name: `${lead.requester.firstName} ${lead.requester.lastName}` })}
                  {lead.organization ? ` · ${lead.organization.name} · ` : " · "}
                  <span dir="ltr">{lead.requester.phone}</span>
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button asChild className="w-full"><a href={`tel:${lead.phone}`}><Phone /> {t("call")}</a></Button>
                <Button asChild className="w-full" variant="outline"><a href={`mailto:${lead.email}`}><Mail /> {t("email")}</a></Button>
              </div>
              <p className="mt-3 break-all text-sm" dir="ltr">{lead.phone} · {lead.email}</p>
              {lead.buyersNotifiedAt && (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><BellRing className="size-3.5 shrink-0" /> {t("customerNotified", { date: formatDate(lead.buyersNotifiedAt, lang) })}</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("purchaseTitle")} />
            <CardBody>
              <DL
                cols={1}
                items={[
                  { label: tl("execution"), value: formatDate(lead.executionDate, lang) },
                  { label: t("bought"), value: formatDateTime(order.createdAt, lang) },
                  { label: t("paid"), value: formatCHF(order.price, lang) },
                  ...(order.couponCode ? [{ label: tsh("coupon"), value: order.couponCode, ltr: true }] : []),
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {reporting && <ReportDialog order={order} onClose={() => setReporting(false)} />}
      {dialog}
    </>
  );
}
