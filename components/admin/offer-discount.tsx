"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BadgePercent } from "lucide-react";
import { toast } from "sonner";
import type { Offer, OfferDiscount } from "@/lib/types";
import { formatCHF } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useLang } from "@/lib/mock/hooks";
import { discountedPrice } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioCards } from "@/components/ui/controls";
import { Mono } from "@/components/admin/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PRESETS: Record<OfferDiscount["type"], number[]> = { percent: [10, 20, 30], fixed: [5, 10, 15] };
const PREVIEW_ROWS = 4;

/**
 * Lowering the price of one or more offers so their last slots sell before the customer's deadline.
 * Opened from the Closing soon queue, which only lists offers late in their life (expiring soon or
 * one slot left). Companies see the new price in the shop (under Discounts) and pay it at checkout.
 */
export function DiscountDialog({ offers, base, onClose }: { offers: Offer[]; base: (o: Offer) => number; onClose: () => void }) {
  const t = useTranslations("admin.leads.detail");
  const tq = useTranslations("admin.leads.closing");
  const tc = useTranslations("common.actions");
  const lang = useLang();
  const patch = useStore((s) => s.patch);
  const { user } = useCurrentUser();
  // a single offer starts from its own discount; several start from 20 %
  const first = offers.length === 1 ? offers[0].discount : undefined;
  const [type, setType] = useState<OfferDiscount["type"]>(first?.type ?? "percent");
  const [value, setValue] = useState(String(first?.value ?? 20));
  const n = Number(value);
  const cheapest = Math.min(...offers.map(base));
  const valid = Number.isFinite(n) && n > 0 && (type === "percent" ? n < 100 : n < cheapest);
  const next: OfferDiscount = { type, value: n, at: new Date().toISOString(), byUserId: user?.id };

  const save = () => {
    offers.forEach((o) => patch("offers", o.id, { discount: next }));
    if (offers.length === 1) toast.success(t("discountSaved", { id: offers[0].id, price: formatCHF(discountedPrice(base(offers[0]), next), lang) }));
    else toast.success(tq("saved", { count: offers.length }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{offers.length === 1 ? t(offers[0].discount ? "editDiscount" : "addDiscount") : tq("dialogTitle", { count: offers.length })}</DialogTitle>
          <DialogDescription>{t("discountBody")}</DialogDescription>
        </DialogHeader>
        <Field label={t("discountType")}>
          <RadioCards
            className="grid-cols-2"
            value={type}
            onValueChange={(v) => {
              setType(v as OfferDiscount["type"]);
              setValue(v === "percent" ? "20" : "10");
            }}
            options={[
              { value: "percent", label: t("discountPercent") },
              { value: "fixed", label: t("discountFixed") },
            ]}
          />
        </Field>
        <Field label={t("discountValue")} error={value && !valid ? t("discountInvalid") : undefined}>
          <div className="flex gap-2">
            <Input type="number" inputMode="decimal" min={1} value={value} onChange={(e) => setValue(e.target.value)} className="min-w-0 flex-1" />
            {PRESETS[type].map((p) => (
              <Button key={p} type="button" variant={n === p ? "secondary" : "outline"} onClick={() => setValue(String(p))} className="shrink-0 tabular-nums">
                {type === "percent" ? `${p} %` : `−${p}`}
              </Button>
            ))}
          </div>
        </Field>
        {/* what each offer will cost companies */}
        <ul className="divide-y rounded-xl bg-success-soft/50 text-sm text-ink">
          {offers.slice(0, PREVIEW_ROWS).map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex items-center gap-2"><BadgePercent className="size-4 shrink-0 text-success" /><Mono>{o.id}</Mono></span>
              <span className="tabular-nums">
                {t("discountPreview", { old: formatCHF(base(o), lang), price: formatCHF(valid ? discountedPrice(base(o), next) : base(o), lang) })}
              </span>
            </li>
          ))}
          {offers.length > PREVIEW_ROWS && <li className="px-3 py-2 text-xs text-muted-foreground">{tq("more", { count: offers.length - PREVIEW_ROWS })}</li>}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={save} disabled={!valid}><BadgePercent /> {offers.length === 1 ? tc("save") : tq("apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
