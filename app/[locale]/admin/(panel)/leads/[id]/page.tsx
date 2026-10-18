"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Building2, Flag, Mail, MapPin, Phone, ShoppingCart, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { LeadStatus } from "@/lib/types";
import { formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, usePartnerMap, useServiceMap } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Avatar, Switch } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatusBadge, useConfirm } from "@/components/shared/bits";
import { Icon } from "@/components/shared/icon";
import { DL, Mono, PageHeader } from "@/components/admin/ui";

const STATUSES: LeadStatus[] = ["new", "in_progress", "partially_completed", "partially_critical", "critical", "completed", "cancelled", "failed"];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const offer = useStore((s) => s.offers.find((o) => o.id === id));
  const orders = useStore((s) => s.orders).filter((o) => o.offerId === id);
  const partners = useStore((s) => s.partners);
  const patch = useStore((s) => s.patch);
  const add = useStore((s) => s.add);
  const serviceMap = useServiceMap();
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();
  const [assignTo, setAssignTo] = useState("");
  const [busy, setBusy] = useState(false);

  if (!offer) {
    return (
      <Card>
        <EmptyState title={t("common.notFound.title")} action={<Button asChild variant="outline"><Link href="/admin/leads">{t("admin.leads.title")}</Link></Button>} />
      </Card>
    );
  }

  const svc = serviceMap[offer.serviceId];
  const revenue = orders.reduce((a, o) => a + o.price, 0);
  const eligible = partners.filter(
    (p) => p.status === "approved" && !p.banned && p.serviceIds.includes(offer.serviceId) && !orders.some((o) => o.partnerId === p.id),
  );
  const tl = (k: string, v?: Record<string, string | number>) => t(`admin.leads.detail.${k}`, v);

  const assign = async () => {
    const p = partnerMap[assignTo];
    if (!p) return;
    setBusy(true);
    await mock(() =>
      add("orders", {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        offerId: offer.id,
        partnerId: p.id,
        channel: "dynamic",
        price: svc?.leadPrice ?? 35,
        executed: false,
        createdAt: new Date().toISOString(),
      }),
    );
    if (offer.status === "new") patch("offers", offer.id, { status: "in_progress" });
    setBusy(false);
    setAssignTo("");
    toast.success(tl("assigned", { name: p.name }));
  };

  const addr = (a: typeof offer.from, icon: React.ReactNode, title: string) => (
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
    { at: offer.createdAt, text: tl("submitted"), icon: <Flag className="size-3.5" /> },
    ...orders.map((o) => ({ at: o.createdAt, text: tl("purchased", { name: partnerMap[o.partnerId]?.name ?? "?" }), icon: <ShoppingCart className="size-3.5" /> })),
  ].sort((a, b) => a.at.localeCompare(b.at));

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
            <div className="w-52">
              <Select
                value={offer.status}
                onValueChange={(v) => {
                  patch("offers", offer.id, { status: v as LeadStatus });
                  toast.success(t("common.toast.updated"));
                }}
                options={STATUSES.map((s) => ({ value: s, label: t(`common.status.${s}`) }))}
              />
            </div>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
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
                        </div>
                        {o.executed && <Badge tone="success">{t("admin.shop.executed")}</Badge>}
                        <span className="font-semibold">{formatCHF(o.price, lang)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={<Building2 />} title={tl("noBuyers")} className="py-8" />
              )}
              {orders.length < offer.offersWanted && (
                <div className="mt-4 rounded-xl bg-surface-2/70 p-4">
                  <p className="mb-1 text-sm font-bold text-ink">{tl("assign")}</p>
                  <p className="mb-3 text-xs text-muted-foreground">{tl("assignHint")}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={assignTo}
                      onValueChange={setAssignTo}
                      placeholder={t("common.form.select")}
                      options={eligible.map((p) => ({ value: p.id, label: `${p.name} · ${p.city}` }))}
                    />
                    <Button onClick={assign} disabled={!assignTo} loading={busy} className="shrink-0">
                      <UserPlus /> {tl("assign")}
                    </Button>
                  </div>
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
              <div className="space-y-2 text-sm">
                <a href={`mailto:${offer.email}`} className="flex items-center gap-2 hover:text-primary" dir="ltr"><Mail className="size-4 text-muted-foreground" />{offer.email}</a>
                <a href={`tel:${offer.phone}`} className="flex items-center gap-2 hover:text-primary" dir="ltr"><Phone className="size-4 text-muted-foreground" />{offer.phone}</a>
              </div>
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
                  {t("admin.leads.title")} <ArrowRight className="flip-rtl" />
                </Link>
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
      {dialog}
    </>
  );
}
