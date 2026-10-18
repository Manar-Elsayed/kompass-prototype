"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Config } from "@/lib/types";
import { useStore } from "@/lib/mock/store";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/controls";
import { PageHeader } from "@/components/admin/ui";

export default function ConfigurationPage() {
  const t = useTranslations();
  const tc = useTranslations("admin.config");
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const [draft, setDraft] = useState<Config>(config);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const num = (k: keyof Config) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: Number(e.target.value) });

  const save = async () => {
    setBusy(true);
    await mock(() => setConfig(draft));
    setBusy(false);
    toast.success(t("common.toast.saved"));
  };

  const toggleRow = (k: "autoDistribute" | "comingSoonMode", label: string, hint: string) => (
    <label className="flex items-start justify-between gap-6 rounded-xl border p-4">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={draft[k]} onCheckedChange={(v) => setDraft({ ...draft, [k]: v })} />
    </label>
  );

  return (
    <>
      <PageHeader
        title={tc("title")}
        subtitle={tc("subtitle")}
        actions={
          dirty && (
            <>
              <Button variant="ghost" onClick={() => setDraft(config)}>{t("admin.cms.discard")}</Button>
              <Button onClick={save} loading={busy}>{t("common.actions.save")}</Button>
            </>
          )
        }
      />
      <div className="grid max-w-4xl gap-4">
        <Card>
          <CardHeader title={tc("leads")} />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Field label={tc("defaultLeadPrice")}><Input type="number" dir="ltr" value={draft.defaultLeadPrice} onChange={num("defaultLeadPrice")} /></Field>
            <Field label={tc("maxOffers")}><Input type="number" dir="ltr" min={1} max={10} value={draft.maxOffersPerLead} onChange={num("maxOffersPerLead")} /></Field>
            <Field label={tc("expiry")}><Input type="number" dir="ltr" value={draft.leadExpiryDays} onChange={num("leadExpiryDays")} /></Field>
            <div className="sm:col-span-3">{toggleRow("autoDistribute", tc("autoDistribute"), tc("autoDistributeHint"))}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tc("billing")} />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Field label={tc("vat")}><Input type="number" step="0.1" dir="ltr" value={draft.vatRate} onChange={num("vatRate")} /></Field>
            <Field label={tc("invoicePrefix")}><Input dir="ltr" value={draft.invoicePrefix} onChange={(e) => setDraft({ ...draft, invoicePrefix: e.target.value })} /></Field>
            <Field label={tc("supportEmail")}><Input type="email" dir="ltr" value={draft.supportEmail} onChange={(e) => setDraft({ ...draft, supportEmail: e.target.value })} /></Field>
            <div className="flex items-center gap-3 rounded-xl border p-4 sm:col-span-3">
              <FileText className="size-8 text-accent" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">{tc("contract")}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{draft.contractTemplate}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, contractTemplate: `partner-contract-v${Number(draft.contractTemplate.match(/v(\d+)/)?.[1] ?? 3) + 1}.pdf` })}>
                <Upload /> {t("common.actions.replace")}
              </Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tc("websiteSection")} />
          <CardBody>{toggleRow("comingSoonMode", tc("comingSoon"), tc("comingSoonHint"))}</CardBody>
        </Card>
      </div>
    </>
  );
}
