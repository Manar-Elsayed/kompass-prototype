"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, ShoppingCart } from "lucide-react";
import type { Offer } from "@/lib/types";
import { cn, formatCHF, formatDate, timeAgo } from "@/lib/utils";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { discountedPrice, isExpiringSoon } from "@/lib/mock/selectors";
import { routeFull, routeText } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";
import { CheckoutDialog, LeadCard } from "@/components/portal/lead-card";

type Item = { offer: Offer; sold: number };

/**
 * The shop as a table: one offer per row with what decides a purchase (service, route, date, slots,
 * price). A row opens the same card as the Board view in a popup; Buy offer goes straight to checkout.
 */
export function ShopList({ items, canBuy }: { items: Item[]; canBuy: boolean }) {
  const t = useTranslations("portal.shop");
  const tf = useTranslations("common.fields");
  const tl = useTranslations("admin.leads");
  const tc = useTranslations("common.actions");
  const L = useL();
  const lang = useLang();
  const serviceMap = useServiceMap();
  const [open, setOpen] = useState<Item | null>(null);
  const [buying, setBuying] = useState<Offer | null>(null);
  const th = "whitespace-nowrap px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground first:ps-4 last:pe-4";
  const td = "px-3 py-3 align-middle first:ps-4 last:pe-4";

  return (
    <Card className="overflow-hidden">
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/60">
            <tr>
              <th className={th}>{tf("service")}</th>
              <th className={th}>{tl("route")}</th>
              <th className={cn(th, "hidden md:table-cell")}>{tl("execution")}</th>
              <th className={cn(th, "hidden sm:table-cell")}>{t("slotsCol")}</th>
              <th className={cn(th, "text-end")}>{t("price")}</th>
              <th className={th}><span className="sr-only">{tc("view")}</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => {
              const { offer, sold } = x;
              const svc = serviceMap[offer.serviceId];
              const left = offer.offersWanted - sold;
              const listPrice = svc?.leadPrice ?? 0;
              const price = discountedPrice(listPrice, offer.discount);
              const closing = isExpiringSoon(offer);
              return (
                <tr key={offer.id} onClick={() => setOpen(x)} className="cursor-pointer border-t transition-colors hover:bg-surface-2/70">
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name={svc?.icon ?? "Truck"} className="size-4" /></span>
                      <span className="min-w-0">
                        <span className="block whitespace-nowrap font-semibold text-ink">{L(svc?.name)}{offer.from.rooms ? ` · ${offer.from.rooms}` : ""}</span>
                        <span className="block whitespace-nowrap text-xs text-muted-foreground"><span dir="ltr" className="font-mono">{offer.id}</span> · {timeAgo(offer.createdAt, lang)}</span>
                      </span>
                    </span>
                  </td>
                  <td className={cn(td, "text-muted-foreground")}><span className="block max-w-56 truncate" title={routeFull(offer)}>{routeText(offer)}</span></td>
                  <td className={cn(td, "hidden whitespace-nowrap md:table-cell")}>{formatDate(offer.executionDate, lang)}</td>
                  <td className={cn(td, "hidden sm:table-cell")}>
                    <span className="flex flex-wrap gap-1">
                      <Badge tone={left === 1 ? "danger" : "warning"}>{left === 1 ? t("lastSlot") : t("slots", { left, total: offer.offersWanted })}</Badge>
                      {closing && <Badge tone="danger">{t("closingSoon")}</Badge>}
                    </span>
                  </td>
                  <td className={cn(td, "whitespace-nowrap text-end")}>
                    {offer.discount ? (
                      <span className="inline-flex items-baseline gap-1.5">
                        <span className="text-xs text-muted-foreground line-through">{formatCHF(listPrice, lang)}</span>
                        <span className="font-bold text-success">{formatCHF(price, lang)}</span>
                      </span>
                    ) : (
                      <span className="font-bold text-primary">{formatCHF(listPrice, lang)}</span>
                    )}
                  </td>
                  <td className={cn(td, "w-px")}>
                    <span className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon-sm" onClick={() => setOpen(x)} aria-label={tc("view")} title={tc("view")}><Eye /></Button>
                      <Button size="sm" variant="accent" disabled={!canBuy} onClick={() => setBuying(offer)} className="whitespace-nowrap"><ShoppingCart /> {t("buy")}</Button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* the details: the same card the Board view shows, with its own Buy offer */}
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg border-none bg-transparent p-0 shadow-none" hideClose>
          <DialogTitle className="sr-only">{open?.offer.id}</DialogTitle>
          <DialogDescription className="sr-only">{open ? routeText(open.offer) : ""}</DialogDescription>
          {open && <LeadCard offer={open.offer} sold={open.sold} canBuy={canBuy} />}
        </DialogContent>
      </Dialog>
      {buying && <CheckoutDialog offer={buying} onClose={() => setBuying(null)} />}
    </Card>
  );
}
