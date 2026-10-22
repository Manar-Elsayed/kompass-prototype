"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Flag,
  Hand,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingCart,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { CancelReason, Offer, Order } from "@/lib/types";
import { cn, formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { CITIES } from "@/lib/mock/seed";
import { canBuyLeads, companyScore, daysLeft, isExpiringSoon } from "@/lib/mock/selectors";
import { useL, useLang, usePartnerMap, useServiceMap } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar, Checkbox, Progress, RadioCards, Switch } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, StatusBadge, useConfirm } from "@/components/shared/bits";
import { Icon } from "@/components/shared/icon";
import { DL, Mono, PageHeader } from "@/components/admin/ui";
import { NoShowPanel } from "@/components/admin/no-show-panel";

const cantonOf = (city: string) => CITIES.find((c) => c.city === city)?.canton;

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const offer = useStore((s) => s.offers.find((o) => o.id === id));
  const allOrders = useStore((s) => s.orders);
  const orders = useMemo(() => allOrders.filter((o) => o.offerId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [allOrders, id]);
  const patch = useStore((s) => s.patch);
  const approveOffer = useStore((s) => s.approveOffer);
  const repostOffer = useStore((s) => s.repostOffer);
  const partners = useStore((s) => s.partners);
  const serviceMap = useServiceMap();
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  // row menus on the leads list link here with #cancel (open the dialog) or #assign (jump to the panel)
  const hasOffer = !!offer;
  useEffect(() => {
    if (!hasOffer) return;
    const hash = window.location.hash;
    if (hash === "#cancel") setCancelOpen(true);
    else if (hash === "#assign") document.getElementById("assign")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hasOffer]);

  if (!offer) {
    return (
      <Card>
        <EmptyState title={t("common.notFound.title")} action={<Button asChild variant="outline"><Link href="/admin/leads">{t("admin.leads.title")}</Link></Button>} />
      </Card>
    );
  }

  const svc = serviceMap[offer.serviceId];
  const revenue = orders.reduce((a, o) => a + o.price, 0);
  const tl = (k: string, v?: Record<string, string | number>) => t(`admin.leads.detail.${k}`, v);
  const left = Math.max(0, offer.offersWanted - orders.length);
  const days = daysLeft(offer.deadline);
  const expiring = isExpiringSoon(offer);
  const open = offer.status === "new" || offer.status === "in_progress";
  const matching = partners.filter((p) => p.status === "approved" && !p.banned && p.serviceIds.includes(offer.serviceId)).length;

  const approve = () =>
    confirm({
      title: tl("approve"),
      body: tl("checksFlagged"),
      tone: "success",
      confirmLabel: tl("approve"),
      onConfirm: () => {
        approveOffer(offer.id);
        toast.success(tl("approved", { id: offer.id }));
      },
    });

  const repost = () => {
    repostOffer(offer.id);
    toast.success(tl("reposted", { id: offer.id, count: matching }));
  };

  const addr = (a: Offer["from"], icon: React.ReactNode, title: string) => (
    <div className="rounded-xl bg-surface-2/70 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">{icon}{title}</p>
      <DL
        items={[
          { label: t("common.fields.street"), value: a.street },
          { label: t("common.fields.city"), value: `${a.zip} ${a.city}` },
          { label: t("common.fields.rooms"), value: a.rooms },
          { label: t("common.fields.floor"), value: a.floor },
          { label: t("common.fields.elevator"), value: a.elevator ? t("common.form.yes") : t("common.form.no") },
          { label: t("common.fields.country"), value: a.country },
        ]}
      />
    </div>
  );

  const timeline = [
    { at: offer.createdAt, text: t("admin.leads.detail.submitted"), icon: <Flag className="size-3.5" /> },
    offer.verifiedAt && { at: offer.verifiedAt, text: tl("evVerified"), icon: <ShieldCheck className="size-3.5" /> },
    ...orders.map((o) => ({
      at: o.createdAt,
      text: o.channel === "manual" ? tl("evAssigned", { name: partnerMap[o.partnerId]?.name ?? "?" }) : tl("purchased", { name: partnerMap[o.partnerId]?.name ?? "?" }),
      icon: <ShoppingCart className="size-3.5" />,
    })),
    offer.status === "completed" && orders.length && { at: orders[orders.length - 1].createdAt, text: tl("evCompleted"), icon: <CheckCircle2 className="size-3.5" /> },
    offer.repostedAt && { at: offer.repostedAt, text: tl("evReposted"), icon: <RotateCcw className="size-3.5" /> },
    offer.chosenAt && { at: offer.chosenAt, text: tl("evChosen", { name: partnerMap[offer.noShow?.partnerId ?? offer.chosenPartnerId ?? ""]?.name ?? "?" }), icon: <Hand className="size-3.5" /> },
    offer.noShow && { at: offer.noShow.reportedAt, text: tl("evNoShow", { name: partnerMap[offer.noShow.partnerId]?.name ?? "?" }), icon: <AlertTriangle className="size-3.5" /> },
    offer.noShow?.resolvedAt && { at: offer.noShow.resolvedAt, text: tl("evNoShowResolved"), icon: <CheckCircle2 className="size-3.5" /> },
    offer.buyersNotifiedAt && { at: offer.buyersNotifiedAt, text: tl("evNotified"), icon: <Mail className="size-3.5" /> },
    offer.status === "expired" && { at: offer.deadline, text: tl("evExpired"), icon: <Clock className="size-3.5" /> },
    offer.cancelledAt && {
      at: offer.cancelledAt,
      text: tl(offer.cancelReason === "fake" ? "evCancelledFake" : "evCancelledCustomer"),
      icon: <Ban className="size-3.5" />,
    },
  ]
    .filter((e): e is { at: string; text: string; icon: React.ReactElement } => !!e)
    .sort((a, b) => a.at.localeCompare(b.at));

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("admin.leads.title"), href: "/admin/leads" }, { label: offer.id }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Mono className="text-2xl">{offer.id}</Mono>
            <StatusBadge status={offer.status} />
            {offer.source === "admin" && <Badge tone="outline">{t("admin.leads.sourceAdmin")}</Badge>}
          </span>
        }
        subtitle={`${svc ? L(svc.name) : ""} · ${formatDateTime(offer.createdAt, lang)}`}
        actions={
          <>
            {offer.status === "in_progress" && (
              <label className="flex h-10 items-center gap-2 rounded-lg border bg-surface px-3 text-sm font-medium">
                <Switch
                  checked={offer.active}
                  onCheckedChange={() =>
                    confirm({
                      title: t(offer.active ? "admin.leads.deactivateTitle" : "admin.leads.activateTitle"),
                      body: t(offer.active ? "admin.leads.deactivateBody" : "admin.leads.activateBody", { id: offer.id }),
                      tone: offer.active ? "danger" : "success",
                      onConfirm: () => {
                        patch("offers", offer.id, { active: !offer.active });
                        toast.success(t("common.toast.updated"));
                      },
                    })
                  }
                />
                {t("admin.leads.visible")}
              </label>
            )}
            {offer.status === "new" && (
              <Button variant="success" onClick={approve}>
                <ShieldCheck /> {tl("approve")}
              </Button>
            )}
            {offer.status !== "cancelled" && (
              <Button variant="danger-soft" onClick={() => setCancelOpen(true)}>
                <Ban /> {tl("cancel")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {offer.noShow && <NoShowPanel offer={offer} orders={orders} />}
          {/* state panel: what needs attention right now */}
          {offer.status === "cancelled" ? (
            <Card className="flex items-start gap-3 border-danger/20 bg-danger-soft/40 p-4">
              <XCircle className="mt-0.5 size-5 shrink-0 text-danger" />
              <div>
                <p className="font-bold text-ink">{tl(offer.cancelReason === "fake" ? "cancelledFake" : "cancelledCustomer")}</p>
                <p className="text-sm text-muted-foreground">
                  {offer.cancelledAt && formatDateTime(offer.cancelledAt, lang)} · {tl(offer.cancelReason === "fake" ? "cancelFakeHint" : "cancelCustomerHint")}
                </p>
              </div>
            </Card>
          ) : (
            <Card>
              <CardBody className="grid gap-5 md:grid-cols-2">
                {/* verification */}
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                    <ShieldCheck className="size-4 text-primary" /> {tl("verification")}
                  </p>
                  {offer.flags.length && offer.status === "new" ? (
                    <>
                      <p className="mb-2 text-sm text-warning">{tl("checksFlagged")}</p>
                      <ul className="space-y-1.5">
                        {offer.flags.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                            {tl(`flags.${f}`)}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="size-4 text-success" />
                      {offer.verifiedAt ? tl("verifiedOn", { date: formatDate(offer.verifiedAt, lang) }) : tl("checksPassed")}
                    </p>
                  )}
                </div>

                {/* quota + deadline */}
                <div>
                  <p className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span className="font-bold text-ink">{tl("quota", { sold: orders.length, wanted: offer.offersWanted })}</span>
                    <span className="text-muted-foreground">{offer.status === "completed" ? "" : tl("slotsLeft", { left })}</span>
                  </p>
                  <Progress value={(orders.length / offer.offersWanted) * 100} tone={offer.status === "completed" ? "success" : "primary"} className="h-1.5" />
                  <p className={cn("mt-2 text-sm", expiring ? "font-semibold text-warning" : "text-muted-foreground")}>
                    {offer.status === "completed"
                      ? tl("quotaFull")
                      : offer.status === "expired"
                        ? tl("expiredOn", { date: formatDate(offer.deadline, lang) })
                        : tl("expiresOn", { date: formatDate(offer.deadline, lang) })}
                  </p>
                  {expiring && (
                    <div className="mt-3 rounded-lg border border-warning/30 bg-warning-soft/40 p-3">
                      <p className="mb-2 text-xs text-ink">{tl("repostHint", { days: Math.max(0, days), left })}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={repost}>
                          <RotateCcw /> {tl("repost")}
                        </Button>
                        {offer.repostedAt && <span className="text-xs text-muted-foreground">{tl("repostedOn", { date: formatDateTime(offer.repostedAt, lang) })}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title={tl("move")} />
            <CardBody>
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/15 bg-primary-soft/50 p-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
                  <Icon name={svc?.icon ?? "Truck"} className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-ink">{L(svc?.name)}</p>
                  <p className="text-sm text-muted-foreground">{t("admin.leads.execution")}: {formatDate(offer.executionDate, lang)} · {t("admin.leads.deadline")}: {formatDate(offer.deadline, lang)}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {addr(offer.from, <MapPin className="size-4 text-accent" />, t("site.offerForm.movingFrom"))}
                {addr(offer.to, <Flag className="size-4 text-primary" />, t("site.offerForm.movingTo"))}
              </div>
              {offer.details && (
                <div className="mt-4 rounded-xl border border-dashed p-4">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{tl("notes")}</p>
                  <p className="text-sm">{offer.details}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={tl("buyers")}
              description={`${orders.length}/${offer.offersWanted} · ${tl("revenue")} ${formatCHF(revenue, lang)}`}
              action={
                orders.length > 0 && offer.status !== "cancelled" ? (
                  <Button size="sm" variant="outline" onClick={() => setNotifyOpen(true)}>
                    <Send /> {tl("notify")}
                  </Button>
                ) : undefined
              }
            />
            <CardBody>
              {orders.length ? (
                <ul className="divide-y rounded-xl border">
                  {orders.map((o) => {
                    const p = partnerMap[o.partnerId];
                    return (
                      <li key={o.id} className="flex items-center gap-3 p-3">
                        <Avatar name={p?.name ?? "?"} square className="size-9" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/partners/${o.partnerId}`} className="font-semibold text-ink hover:text-primary">{p?.name}</Link>
                          <p className="text-xs text-muted-foreground">
                            <Mono className="text-xs font-medium text-muted-foreground">{o.id}</Mono> · {t(`admin.shop.${o.channel}`)} · {formatDateTime(o.createdAt, lang)}
                          </p>
                          {o.note && <p className="mt-0.5 text-xs text-ink">{o.note}</p>}
                        </div>
                        {o.partnerId === offer.chosenPartnerId && <Badge tone="primary"><Hand /> {tl("chosen")}</Badge>}
                        {o.partnerId === offer.noShow?.partnerId && <Badge tone="danger"><AlertTriangle /> {tl("noShowBadge")}</Badge>}
                        {o.executed && <Badge tone="success">{t("admin.shop.executed")}</Badge>}
                        <span className="font-semibold">{formatCHF(o.price, lang)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={<Building2 />} title={tl("noBuyers")} className="py-8" />
              )}
              {offer.buyersNotifiedAt && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3.5" /> {tl("notifiedOn", { date: formatDateTime(offer.buyersNotifiedAt, lang) })}
                </p>
              )}
              {open && left > 0 && (
                <div id="assign" className="scroll-mt-24">
                  <AssignPanel offer={offer} orders={orders} />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t("admin.leads.customer")} />
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={`${offer.firstName} ${offer.lastName}`} className="size-11" />
                <div>
                  <p className="font-bold text-ink">{t(offer.gender === "male" ? "common.form.mr" : "common.form.ms")} {offer.firstName} {offer.lastName}</p>
                  <p className="text-xs text-muted-foreground">{t(`common.lang.${offer.lang}`)}</p>
                </div>
              </div>
              <Badge tone={offer.booking === "personal" ? "neutral" : "info"}>{t(`site.booking.${offer.booking}`)}</Badge>
              <div className="space-y-2 text-sm">
                <a href={`mailto:${offer.email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="size-4 text-muted-foreground" />{offer.email}</a>
                <a href={`tel:${offer.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="size-4 text-muted-foreground" />{offer.phone}</a>
              </div>
              {offer.requester && (
                <div className="rounded-xl bg-surface-2/70 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{tl("bookedBy")}</p>
                  <p className="font-semibold text-ink">{offer.requester.firstName} {offer.requester.lastName}</p>
                  <a href={`mailto:${offer.requester.email}`} className="block text-muted-foreground hover:text-primary" dir="ltr">{offer.requester.email}</a>
                  <a href={`tel:${offer.requester.phone}`} className="block text-muted-foreground hover:text-primary" dir="ltr">{offer.requester.phone}</a>
                  {offer.requester.address && <p className="text-muted-foreground">{offer.requester.address}</p>}
                </div>
              )}
              <Button asChild size="sm" variant="ghost" className="w-full justify-start">
                <Link href={`/requests/${offer.id}`} target="_blank">
                  <ArrowRight /> {tl("customerPage")}
                </Link>
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={tl("timeline")} />
            <CardBody>
              <ol className="space-y-4">
                {timeline.map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">{e.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{e.text}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(e.at, lang)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={tl("technical")} />
            <CardBody>
              <DL
                cols={1}
                items={[
                  { label: t("common.fields.ip"), value: offer.ip, ltr: true },
                  { label: t("common.fields.device"), value: t(`common.device.${offer.device}`) },
                  { label: t("admin.leads.source"), value: t(offer.source === "admin" ? "admin.leads.sourceAdmin" : "admin.leads.sourceWebsite") },
                  { label: tl("wanted"), value: offer.offersWanted },
                ]}
              />
              <Button asChild variant="ghost" size="sm" className="mt-4 -ms-2">
                <Link href="/admin/leads">
                  {t("admin.leads.title")} <ArrowRight />
                </Link>
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {cancelOpen && <CancelDialog offer={offer} orders={orders} onClose={() => setCancelOpen(false)} />}
      {notifyOpen && <NotifyDialog offer={offer} orders={orders} onClose={() => setNotifyOpen(false)} />}
      {dialog}
    </>
  );
}

/** Manual / urgent assignment: pick a company (same canton first), agree a price, charge its wallet. */
function AssignPanel({ offer, orders }: { offer: Offer; orders: Order[] }) {
  const t = useTranslations("admin.leads.detail");
  const lang = useLang();
  const partners = useStore((s) => s.partners);
  const allOrders = useStore((s) => s.orders);
  const reviews = useStore((s) => s.reviews);
  const nominations = useStore((s) => s.nominations);
  const assignLead = useStore((s) => s.assignLead);
  const svc = useServiceMap()[offer.serviceId];
  const [partnerId, setPartnerId] = useState("");
  const [price, setPrice] = useState(String(svc?.leadPrice ?? 35));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const canton = cantonOf(offer.from.city);
  const picks = nominations.find((n) => n.canton === canton)?.partnerIds ?? [];
  const rank = (id: string) => (picks.includes(id) ? picks.indexOf(id) : 99);
  // nominated for this region first (in admin's order), then same canton by performance, then the rest
  const eligible = partners
    .filter((p) => p.status === "approved" && !p.banned && p.serviceIds.includes(offer.serviceId) && !orders.some((o) => o.partnerId === p.id))
    .map((p) => ({ p, score: companyScore({ orders: allOrders, reviews }, p).score }))
    .sort((a, b) => rank(a.p.id) - rank(b.p.id) || Number(b.p.canton === canton) - Number(a.p.canton === canton) || b.score - a.score)
    .map((x) => x.p);
  const picked = partners.find((p) => p.id === partnerId);
  const amount = Number(price) || 0;

  const assign = async () => {
    if (!picked || amount <= 0) return;
    setBusy(true);
    const res = await mock(() => assignLead(offer.id, picked.id, amount, note));
    setBusy(false);
    if (res.ok) {
      toast.success(t("assignedCharged", { name: picked.name, price: amount }));
      setPartnerId("");
      setNote("");
      setPrice(String(svc?.leadPrice ?? 35));
    } else if (res.error === "insufficient") toast.error(t("errInsufficient", { name: picked.name, balance: picked.wallet }));
    else if (res.error === "owned") toast.error(t("errOwned", { name: picked.name }));
    else if (res.error === "documents") toast.error(t("errDocuments", { name: picked.name }));
    else toast.error(t("errUnavailable"));
  };

  return (
    <div className="mt-4 rounded-xl bg-surface-2/70 p-4">
      <p className="mb-1 flex items-center gap-2 text-sm font-bold text-ink"><UserPlus className="size-4 text-primary" /> {t("assignTitle")}</p>
      <p className="mb-3 text-xs text-muted-foreground">{t("assignHint")}</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label={t("company")} hint={t("matchHint")}>
          <Select
            value={partnerId}
            onValueChange={setPartnerId}
            options={eligible.map((p) => ({
              value: p.id,
              label: `${picks.includes(p.id) ? `${t("nominated")} · ` : ""}${p.name} · ${p.city} (${p.canton})${p.canton === canton ? ` · ${t("sameCanton")}` : ""} · ${t("balance", { amount: p.wallet })}${canBuyLeads(p) ? "" : ` · ${t("docsIssue")}`}`,
            }))}
          />
        </Field>
        <Field label={t("price")}>
          <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={t("note")} className="sm:col-span-2">
          <Textarea rows={2} value={note} placeholder={t("notePh")} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {picked && picked.wallet < amount && (
        <p className="mt-2 text-xs text-danger">{t("errInsufficient", { name: picked.name, balance: picked.wallet })}</p>
      )}
      <div className="mt-3 flex justify-end">
        <Button onClick={assign} disabled={!picked || amount <= 0 || (picked && picked.wallet < amount)} loading={busy}>
          <UserPlus /> {t("assign")} · {formatCHF(amount, lang)}
        </Button>
      </div>
    </div>
  );
}

/** Cancelling needs a reason because it decides the money: fake = refundable, customer = not. */
function CancelDialog({ offer, orders, onClose }: { offer: Offer; orders: Order[]; onClose: () => void }) {
  const t = useTranslations("admin.leads.detail");
  const tc = useTranslations("common.actions");
  const lang = useLang();
  const partnerMap = usePartnerMap();
  const cancelOffer = useStore((s) => s.cancelOffer);
  const [reason, setReason] = useState<CancelReason>("fake");
  const [refund, setRefund] = useState<string[]>(orders.map((o) => o.id));
  const refundTotal = orders.filter((o) => refund.includes(o.id)).reduce((a, o) => a + o.price, 0);

  const submit = () => {
    cancelOffer(offer.id, reason, reason === "fake" ? refund : []);
    toast.success(t("cancelled", { id: offer.id }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("cancelTitle", { id: offer.id })}</DialogTitle>
          <DialogDescription>{t(reason === "fake" ? "cancelFakeHint" : "cancelCustomerHint")}</DialogDescription>
        </DialogHeader>
        <RadioCards
          value={reason}
          onValueChange={(v) => setReason(v as CancelReason)}
          className="grid-cols-2"
          options={[
            { value: "fake", label: t("cancelFake"), icon: <AlertTriangle className="size-4" /> },
            { value: "customer", label: t("cancelCustomer"), icon: <XCircle className="size-4" /> },
          ]}
        />
        {reason === "fake" &&
          (orders.length ? (
            <div className="rounded-xl border p-3">
              <p className="mb-2 text-sm font-semibold text-ink">{t("refundBuyers")}</p>
              <ul className="space-y-2">
                {orders.map((o) => (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <Checkbox
                        checked={refund.includes(o.id)}
                        onCheckedChange={(v) => setRefund((r) => (v ? [...r, o.id] : r.filter((x) => x !== o.id)))}
                      />
                      <span className="flex-1">{partnerMap[o.partnerId]?.name}</span>
                      <span className="font-semibold">{formatCHF(o.price, lang)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t pt-2 text-end text-sm font-bold">{formatCHF(refundTotal, lang)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noBuyersToRefund")}</p>
          ))}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button variant="danger" onClick={submit}><Ban /> {t("cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Prototype of the customer email that lists the companies who bought the request. */
function NotifyDialog({ offer, orders, onClose }: { offer: Offer; orders: Order[]; onClose: () => void }) {
  const t = useTranslations("admin.leads.detail");
  const tc = useTranslations("common.actions");
  const partnerMap = usePartnerMap();
  const notify = useStore((s) => s.notifyCustomerOfBuyers);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    await mock(() => notify(offer.id));
    setBusy(false);
    toast.success(t("notifySent", { email: offer.email }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("notifyTitle", { name: offer.firstName })}</DialogTitle>
          <DialogDescription>{offer.email}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-surface-2/50 p-4 text-sm">
          <p className="mb-3 font-semibold text-ink">{t("notifySubject", { id: offer.id })}</p>
          <p className="mb-3">{t("notifyIntro", { name: offer.firstName })}</p>
          <ul className="mb-3 space-y-2">
            {orders.map((o) => {
              const p = partnerMap[o.partnerId];
              return (
                <li key={o.id} className="rounded-lg bg-surface p-2.5">
                  <p className="font-semibold text-ink">{p?.name}</p>
                  <p className="text-xs text-muted-foreground">{p?.phone} · {p?.email}</p>
                </li>
              );
            })}
          </ul>
          <p className="text-muted-foreground">{t("notifyOutro")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={send} loading={busy}><Send /> {t("notifySend")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
