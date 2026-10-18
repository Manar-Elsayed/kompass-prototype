"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, BadgePercent, Building, Calendar, CheckCircle2, Lock, MapPin, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { Offer } from "@/lib/types";
import { cn, formatCHF, formatDate, timeAgo } from "@/lib/utils";
import { quoteLead, useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";

/** Shop card — the customer's identity stays hidden until the partner buys. */
export function LeadCard({ offer, sold, canBuy, compact }: { offer: Offer; sold: number; canBuy: boolean; compact?: boolean }) {
  const t = useTranslations("portal.shop");
  const tf = useTranslations("common.fields");
  const L = useL();
  const lang = useLang();
  const svc = useServiceMap()[offer.serviceId];
  const [open, setOpen] = useState(false);
  const left = offer.offersWanted - sold;

  return (
    <Card className="flex min-w-0 flex-col p-5 transition hover:border-primary/30 hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon name={svc?.icon ?? "Truck"} className="size-5" />
          </span>
          <div>
            <p className="font-bold text-ink">{L(svc?.name)} · {offer.from.rooms} {tf("rooms")}</p>
            <p className="text-xs text-muted-foreground"><span dir="ltr" className="font-mono">{offer.id}</span> · {timeAgo(offer.createdAt, lang)}</p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-lg font-extrabold text-primary">{formatCHF(svc?.leadPrice ?? 0, lang)}</p>
          <Badge tone={left === 1 ? "danger" : "warning"} className="mt-0.5">{left === 1 ? t("lastSlot") : t("slots", { left, total: offer.offersWanted })}</Badge>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-xl bg-surface-2/70 p-3 text-sm">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><MapPin className="size-4 shrink-0 text-accent" />{offer.from.zip} {offer.from.city} <ArrowRight className="size-3.5 text-muted-foreground flip-rtl" /> {offer.to.zip} {offer.to.city}</p>
        <p className="flex items-center gap-2"><Building className="size-4 shrink-0 text-accent" />{tf("floor")} {offer.from.floor} → {offer.to.floor} · {tf("elevator")}: {offer.from.elevator ? "✓" : "✗"} / {offer.to.elevator ? "✓" : "✗"}</p>
        <p className="flex items-center gap-2"><Calendar className="size-4 shrink-0 text-accent" />{formatDate(offer.executionDate, lang)}</p>
        {!compact && offer.details && <p className="line-clamp-2 border-t pt-2 text-muted-foreground">“{offer.details}”</p>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          <span className="truncate">{offer.firstName} {offer.lastName[0]}. · {t("hidden")}</span>
        </p>
        <Button size="sm" variant="accent" disabled={!canBuy} onClick={() => setOpen(true)} className="shrink-0">
          <ShoppingCart /> {t("buy")}
        </Button>
      </div>
      {open && <CheckoutDialog offer={offer} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function CheckoutDialog({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const t = useTranslations("portal.shop");
  const tc = useTranslations("common");
  const td = useTranslations("portal.dashboard");
  const router = useRouter();
  const L = useL();
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const db = useStore();
  const buyLead = useStore((s) => s.buyLead);
  const svc = useServiceMap()[offer.serviceId];
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const q = quoteLead(db, partner.id, offer.id, applied);
  const after = partner.wallet - q.price;

  const buy = async () => {
    setBusy(true);
    const res = await mock(() => buyLead(partner.id, offer.id, applied), 800);
    setBusy(false);
    if (res.ok) {
      setDone(res.order.offerId);
      // the card leaves the shop list once bought, so the toast carries the next step
      toast.success(t("bought", { id: res.order.offerId }), {
        action: { label: t("viewLead"), onClick: () => router.push(`/portal/leads?open=${res.order.offerId}`) },
      });
    } else toast.error(t(res.error));
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-12 text-success" />
            <DialogTitle>{t("bought", { id: done })}</DialogTitle>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={onClose}>{tc("actions.close")}</Button>
              <Button asChild><Link href={`/portal/leads?open=${done}`}>{t("viewLead")}</Link></Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("checkout")}</DialogTitle>
              <DialogDescription>{L(svc?.name)} · {offer.from.city} → {offer.to.city} · <span dir="ltr">{offer.id}</span></DialogDescription>
            </DialogHeader>

            <div>
              <label className="text-[13px] font-semibold" htmlFor="coupon">{t("coupon")}</label>
              <div className="mt-1.5 flex gap-2">
                <Input id="coupon" value={code} onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setApplied(undefined);
                  }} placeholder="WELCOME20" dir="ltr" className="font-mono" />
                <Button variant="outline" onClick={() => setApplied(code || undefined)} disabled={!code}>{t("apply")}</Button>
              </div>
              {applied && (
                <p className={cn("mt-1.5 flex items-center gap-1.5 text-xs font-semibold", q.couponValid ? "text-success" : "text-danger")}>
                  <BadgePercent className="size-3.5" />
                  {q.couponValid ? t("couponOk", { amount: formatCHF(q.discount, lang) }) : t("couponBad")}
                </p>
              )}
            </div>

            <dl className="space-y-2 rounded-xl bg-surface-2 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("price")}</dt><dd>{formatCHF(q.base, lang)}</dd></div>
              {q.discount > 0 && <div className="flex justify-between text-success"><dt>{t("discount")}</dt><dd>−{formatCHF(q.discount, lang)}</dd></div>}
              <div className="flex justify-between border-t pt-2 text-base font-bold text-ink"><dt>{t("total")}</dt><dd>{formatCHF(q.price, lang)}</dd></div>
              <div className="flex justify-between text-xs"><dt className="text-muted-foreground">{t("walletAfter")}</dt><dd className={cn("font-semibold", after < 0 && "text-danger")}>{formatCHF(after, lang)}</dd></div>
            </dl>

            {after < 0 && (
              <p className="rounded-lg bg-danger-soft p-3 text-sm font-medium text-danger">
                {t("insufficient")}{" "}
                <Link href="/portal/payments" className="underline" onClick={onClose}>{td("topUp")} →</Link>
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t("terms")}</p>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>{tc("actions.cancel")}</Button>
              <Button variant="accent" loading={busy} disabled={after < 0 || q.couponValid === false} onClick={buy}>
                {t("buyFor", { price: formatCHF(q.price, lang) })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
