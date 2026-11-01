"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BadgePercent, Trash2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Lowering an offer's price so its last slots sell before the customer's deadline. Kompass adds it
 * late, not from the start: the offer page only offers it once the offer expires soon or has one
 * slot left. Companies see the new price in the shop (under Discounts) and pay it at checkout.
 */
export function DiscountDialog({ offer, base, onClose }: { offer: Offer; base: number; onClose: () => void }) {
  const t = useTranslations("admin.leads.detail");
  const tc = useTranslations("common.actions");
  const lang = useLang();
  const patch = useStore((s) => s.patch);
  const { user } = useCurrentUser();
  const [type, setType] = useState<OfferDiscount["type"]>(offer.discount?.type ?? "percent");
  const [value, setValue] = useState(String(offer.discount?.value ?? (type === "percent" ? 20 : 10)));
  const n = Number(value);
  const valid = Number.isFinite(n) && n > 0 && (type === "percent" ? n < 100 : n < base);
  const next: OfferDiscount = { type, value: n, at: new Date().toISOString(), byUserId: user?.id };
  const price = valid ? discountedPrice(base, next) : base;

  const save = () => {
    patch("offers", offer.id, { discount: next });
    toast.success(t("discountSaved", { id: offer.id, price: formatCHF(price, lang) }));
    onClose();
  };
  const remove = () => {
    patch("offers", offer.id, { discount: undefined });
    toast.success(t("discountRemoved", { id: offer.id }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{offer.discount ? t("editDiscount") : t("addDiscount")}</DialogTitle>
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
          <Input type="number" inputMode="decimal" min={1} value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <p className="flex items-center gap-2 rounded-xl bg-success-soft/50 p-3 text-sm text-ink">
          <BadgePercent className="size-4 shrink-0 text-success" />
          {t("discountPreview", { old: formatCHF(base, lang), price: formatCHF(price, lang) })}
        </p>
        <DialogFooter className="sm:justify-between">
          {offer.discount ? (
            <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={remove}><Trash2 /> {t("removeDiscount")}</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
            <Button onClick={save} disabled={!valid}><BadgePercent /> {tc("save")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
