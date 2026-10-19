"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock, ExternalLink, FileText, Info, Upload } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { LANGS, type L10n, type Partner } from "@/lib/types";
import { cn, formatDate, withFallback } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL, useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/shared/icon";
import { DL, PageHeader } from "@/components/admin/ui";

type Editable = Pick<Partner, "email" | "phone" | "mobile" | "website" | "address" | "zip" | "city"> & { about: L10n };

export default function PartnerProfile() {
  const t = useTranslations("portal.profile");
  const tf = useTranslations("common.fields");
  const tp = useTranslations("site.partner");
  const ta = useTranslations("admin.partners");
  const tc = useTranslations("common");
  const tsh = useTranslations("portal.shell");
  const L = useL();
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const services = useStore((s) => s.services);
  const patch = useStore((s) => s.patch);
  const initial: Editable = {
    email: partner.email,
    phone: partner.phone,
    mobile: partner.mobile,
    website: partner.website,
    address: partner.address,
    zip: partner.zip,
    city: partner.city,
    about: { ...partner.about },
  };
  const [form, setForm] = useState<Editable>(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (k: keyof Editable) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    await mock(() => patch("partners", partner.id, { ...form, about: withFallback(form.about) }));
    setBusy(false);
    toast.success(t("saved"));
  };

  const doc = (key: "contract" | "insurance" | "register") => {
    const file = partner.documents[key];
    return (
      <li key={key} className="flex items-center gap-3 rounded-xl border p-3">
        <span className={cn("flex size-10 items-center justify-center rounded-lg", file ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{ta(key)}</p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">{file ?? ta("notUploaded")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            patch("partners", partner.id, { documents: { ...partner.documents, [key]: `${key}-${Date.now().toString().slice(-4)}.pdf` } });
            toast.success(tc("toast.updated"));
          }}
        >
          <Upload /> {file ? tc("actions.replace") : tc("actions.upload")}
        </Button>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Button asChild variant="outline"><Link href={`/companies/${partner.id}`} target="_blank"><ExternalLink /> {tsh("viewProfile")}</Link></Button>
            {dirty && <Button onClick={save} loading={busy}>{tc("actions.save")}</Button>}
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={t("public")} />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label={tp("companyName")}><Input value={partner.name} readOnly className="bg-surface-2" /></Field>
              <Field label={tp("regNumber")}><Input value={partner.regNumber} readOnly dir="ltr" className="bg-surface-2" /></Field>
              <Field label={tf("email")}><Input value={form.email} onChange={set("email")} dir="ltr" /></Field>
              <Field label={tf("website")}><Input value={form.website} onChange={set("website")} dir="ltr" /></Field>
              <Field label={tf("phone")}><Input value={form.phone} onChange={set("phone")} dir="ltr" /></Field>
              <Field label={tf("mobile")}><Input value={form.mobile} onChange={set("mobile")} dir="ltr" /></Field>
              <Field label={tf("street")} className="sm:col-span-2"><Input value={form.address} onChange={set("address")} /></Field>
              <Field label={tf("zip")}><Input value={form.zip} onChange={set("zip")} dir="ltr" /></Field>
              <Field label={tf("city")}><Input value={form.city} onChange={set("city")} /></Field>
              {LANGS.map((l) => (
                <Field key={l} label={`${tp("about")} · ${l.toUpperCase()}`} className="sm:col-span-2">
                  <Textarea rows={3} value={form.about[l] ?? ""} onChange={(e) => setForm((f) => ({ ...f, about: { ...f.about, [l]: e.target.value } }))} />
                </Field>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ta("servicesOffered")} />
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {services.filter((s) => partner.serviceIds.includes(s.id)).map((s) => (
                  <Badge key={s.id} tone="primary" className="px-3 py-1.5 text-sm"><Icon name={s.icon} className="!size-4" /> {L(s.name)}</Badge>
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />{t("servicesHint")}</p>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title={t("contract")} />
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                <CalendarClock className="size-5 text-primary" />
                <span className="flex-1 text-muted-foreground">{t("validUntil")}</span>
                <span className="font-bold">{partner.expiresAt ? formatDate(partner.expiresAt, lang) : "–"}</span>
              </div>
              <ul className="space-y-2">{(["contract", "insurance", "register"] as const).map(doc)}</ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ta("bank")} />
            <CardBody>
              <DL cols={1} items={[{ label: tp("bankName"), value: partner.bank.name }, { label: tp("bankOwner"), value: partner.bank.owner }, { label: "IBAN", value: partner.bank.iban, ltr: true }]} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
