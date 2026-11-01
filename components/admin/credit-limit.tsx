"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Landmark, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { Partner } from "@/lib/types";
import { formatCHF } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { activeCreditLimit, autoTopUpOn } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DL } from "@/components/admin/ui";

/** What admin needs to know about how a company pays: saved method, automatic top-up, credit limit. */
export function CompanyPaymentsCard({ partner, onEditLimit }: { partner: Partner; onEditLimit: () => void }) {
  const t = useTranslations("admin.wallets");
  const lang = useLang();
  const limit = partner.creditLimit ?? 0;
  return (
    <Card className="h-fit overflow-hidden">
      <CardHeader title={t("paymentsTitle")} action={<Button size="sm" variant="outline" onClick={onEditLimit}><Landmark /> {t("creditLimitBtn")}</Button>} />
      <CardBody>
        <DL
          cols={1}
          items={[
            { label: t("savedMethod"), value: partner.paymentMethod?.label ?? <span className="text-muted-foreground">{t("noSavedMethod")}</span> },
            {
              label: t("autoTopUp"),
              value: autoTopUpOn(partner)
                ? t("autoOn", { below: formatCHF(partner.autoTopUp!.below, lang), amount: formatCHF(partner.autoTopUp!.amount, lang) })
                : <span className="text-muted-foreground">{t("autoOff")}</span>,
            },
            {
              label: t("creditLimit"),
              value: limit ? (
                <span className="flex flex-wrap items-center gap-2">
                  {formatCHF(limit, lang)}
                  {!activeCreditLimit(partner) && <Badge tone="warning">{t("autoOff")}</Badge>}
                </span>
              ) : (
                <span className="text-muted-foreground">{t("creditNone")}</span>
              ),
            },
          ]}
        />
        {limit > 0 && !activeCreditLimit(partner) && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning-soft/60 px-3 py-2 text-xs text-ink">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" /> {t("creditLimitInactive")}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

/** Set how far below zero a company may buy; 0 removes the limit. */
export function CreditLimitDialog({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const t = useTranslations("admin.wallets");
  const tc = useTranslations("common.actions");
  const lang = useLang();
  const setLimit = useStore((s) => s.setCreditLimit);
  const [value, setValue] = useState(String(partner.creditLimit ?? 300));
  const n = Math.max(0, Math.round(Number(value) || 0));

  const save = () => {
    setLimit(partner.id, n);
    toast.success(n ? t("creditLimitSaved", { name: partner.name, limit: formatCHF(n, lang) }) : t("creditLimitRemoved", { name: partner.name }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("creditLimitTitle", { name: partner.name })}</DialogTitle>
          <DialogDescription>{t("creditLimitBody")}</DialogDescription>
        </DialogHeader>
        <Field label={`${t("creditLimit")} (CHF)`}>
          <Input type="number" min={0} step={50} value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="-mt-2 flex flex-wrap gap-2">
          {[0, 200, 300, 500, 1000].map((v) => (
            <Button key={v} type="button" size="sm" variant={n === v ? "secondary" : "outline"} onClick={() => setValue(String(v))}>
              {v ? formatCHF(v, lang) : t("creditNone")}
            </Button>
          ))}
        </div>
        {!partner.paymentMethod && n > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-warning-soft/60 px-3 py-2 text-xs text-ink">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" /> {t("creditLimitInactive")}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={save}><Landmark /> {tc("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
