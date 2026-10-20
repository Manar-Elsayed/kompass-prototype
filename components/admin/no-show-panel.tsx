"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { NoShowAction, Offer, Order } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RadioCards } from "@/components/ui/controls";

const ACTIONS: NoShowAction[] = ["none", "warning", "suspended", "removed"];

/**
 * A customer said the company they booked did not come. Admin finds another company among those that
 * already bought the request, records the company's explanation and decides what happens to it.
 */
export function NoShowPanel({ offer, orders }: { offer: Offer; orders: Order[] }) {
  const t = useTranslations("admin.leads.noShow");
  const lang = useLang();
  const partnerMap = usePartnerMap();
  const updateNoShow = useStore((s) => s.updateNoShow);
  const ns = offer.noShow!;
  const [replacement, setReplacement] = useState(ns.replacementPartnerId ?? "");
  const [reason, setReason] = useState(ns.companyReason ?? "");
  const [action, setAction] = useState<NoShowAction>(ns.action ?? "none");
  const missing = partnerMap[ns.partnerId];
  const others = orders.filter((o) => o.partnerId !== ns.partnerId).map((o) => partnerMap[o.partnerId]).filter(Boolean);

  if (ns.status === "resolved")
    return (
      <Card className="flex items-start gap-3 border-success/20 bg-success-soft/40 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="text-sm">
          <p className="font-bold text-ink">{t("resolvedTitle", { name: missing?.name ?? "?" })}</p>
          <p className="text-muted-foreground">
            {ns.resolvedAt && formatDateTime(ns.resolvedAt, lang)}
            {ns.replacementPartnerId && ` · ${t("replacedBy", { name: partnerMap[ns.replacementPartnerId]?.name ?? "?" })}`}
            {` · ${t(`action.${ns.action ?? "none"}`)}`}
          </p>
          {ns.companyReason && <p className="mt-1 text-ink">“{ns.companyReason}”</p>}
        </div>
      </Card>
    );

  const save = (resolve: boolean) => {
    updateNoShow(offer.id, {
      replacementPartnerId: replacement || undefined,
      companyReason: reason.trim() || undefined,
      action,
      status: resolve ? "resolved" : replacement ? "replacement" : "open",
    });
    toast.success(t(resolve ? "resolvedToast" : "savedToast"));
  };

  return (
    <Card className="border-warning/40">
      <CardBody className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-bold text-ink">
              {t("title")}{" "}
              <Link href={`/admin/partners/${ns.partnerId}`} className="text-primary hover:underline">{missing?.name}</Link>
            </p>
            <p className="text-muted-foreground">{t("reported", { date: formatDateTime(ns.reportedAt, lang) })}</p>
            {ns.note && <p className="mt-1 text-ink">“{ns.note}”</p>}
          </div>
        </div>
        <ol className="grid gap-4 md:grid-cols-2">
          <li>
            <Field label={t("step1")} hint={others.length ? t("step1Hint") : t("noOthers")}>
              <Select
                value={replacement}
                onValueChange={setReplacement}
                placeholder={t("pick")}
                disabled={!others.length}
                options={others.map((p) => ({ value: p!.id, label: p!.name }))}
              />
            </Field>
          </li>
          <li>
            <Field label={t("step2")} hint={t("step2Hint")}>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </li>
          <li className="md:col-span-2">
            <Field label={t("step3")}>
              <RadioCards
                className="grid-cols-2 sm:grid-cols-4"
                value={action}
                onValueChange={(v) => setAction(v as NoShowAction)}
                options={ACTIONS.map((a) => ({ value: a, label: t(`action.${a}`) }))}
              />
            </Field>
            {(action === "suspended" || action === "removed") && <p className="mt-2 text-xs text-danger">{t(`actionHint.${action}`, { name: missing?.name ?? "" })}</p>}
          </li>
        </ol>
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => save(false)}>{t("save")}</Button>
          <Button variant="success" onClick={() => save(true)}>
            <CheckCircle2 /> {t("resolve")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
