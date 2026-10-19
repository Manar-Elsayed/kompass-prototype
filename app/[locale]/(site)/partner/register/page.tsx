"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Building2, Check, Landmark, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn, l10n } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { CITIES } from "@/lib/mock/seed";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/controls";
import { Icon } from "@/components/shared/icon";

type F = {
  name: string; regNumber: string; foundedYear: string; ownerName: string;
  email: string; website: string; phone: string; mobile: string; address: string; zip: string; city: string;
  bankName: string; bankOwner: string; iban: string;
  serviceIds: string[]; about: string; password: string; password2: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS = [
  { key: "company", icon: Building2 },
  { key: "contact", icon: Mail },
  { key: "bank", icon: Landmark },
  { key: "account", icon: UserRound },
] as const;

export default function PartnerRegisterPage() {
  const t = useTranslations();
  const L = useL();
  const router = useRouter();
  const services = useStore((s) => s.services);
  const registerPartner = useStore((s) => s.registerPartner);
  const note = useStore((s) => s.site.offerForm.note);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState<F>({
    name: "", regNumber: "", foundedYear: "", ownerName: "",
    email: "", website: "", phone: "", mobile: "", address: "", zip: "", city: "",
    bankName: "", bankOwner: "", iban: "",
    serviceIds: [], about: "", password: "", password2: "",
  });
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const req = t("common.form.required");

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!f.name.trim()) e.name = req;
      if (!/^CHE-\d{3}\.\d{3}\.\d{3}$/.test(f.regNumber.trim())) e.regNumber = "CHE-123.456.789";
      if (!/^(19|20)\d{2}$/.test(f.foundedYear)) e.foundedYear = req;
      if (!f.ownerName.trim()) e.ownerName = req;
    }
    if (s === 1) {
      if (!EMAIL.test(f.email)) e.email = t("common.form.email");
      if (!/^[+\d][\d\s]{7,}$/.test(f.phone)) e.phone = t("common.form.phone");
      if (!f.address.trim()) e.address = req;
      if (!/^\d{4}$/.test(f.zip)) e.zip = t("common.form.zip");
      if (!f.city.trim()) e.city = req;
    }
    if (s === 2) {
      if (!f.bankName.trim()) e.bankName = req;
      if (!f.bankOwner.trim()) e.bankOwner = req;
      if (!/^CH\d{2}[\s\d]{15,}/i.test(f.iban.replace(/\s+/g, " ").trim())) e.iban = t("common.form.iban");
    }
    if (s === 3) {
      if (!f.serviceIds.length) e.serviceIds = req;
      if (f.about.trim().length < 20) e.about = t("common.form.minLength");
      if (f.password.length < 8) e.password = t("common.form.minLength");
      if (f.password !== f.password2) e.password2 = t("common.form.passwordMatch");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => validate(step) && setStep((s) => s + 1);
  const submit = async () => {
    if (!validate(3)) return;
    setBusy(true);
    const loc = CITIES.find((c) => c.zip === f.zip);
    const p = await mock(
      () =>
        registerPartner({
          name: f.name.trim(),
          email: f.email,
          phone: f.phone,
          mobile: f.mobile,
          website: f.website,
          regNumber: f.regNumber,
          foundedYear: Number(f.foundedYear),
          ownerName: f.ownerName,
          address: f.address,
          city: f.city,
          zip: f.zip,
          canton: loc?.canton ?? "ZH",
          about: l10n(f.about),
          serviceIds: f.serviceIds,
          bank: { name: f.bankName, owner: f.bankOwner, iban: f.iban },
        }),
      900,
    );
    router.push(`/partner/success?name=${encodeURIComponent(p.name)}`);
  };

  const field = (k: keyof F, label: string, opts: { type?: string; ltr?: boolean; ph?: string; span?: string; required?: boolean } = {}) => (
    <Field label={label} error={errors[k]} required={opts.required ?? true} className={opts.span}>
      <Input type={opts.type ?? "text"} value={f[k] as string} onChange={set(k)} dir={opts.ltr ? "ltr" : undefined} placeholder={opts.ph} aria-invalid={!!errors[k]} />
    </Field>
  );

  return (
    <section className="container-page grid gap-8 py-12 lg:grid-cols-[300px_1fr]">
      <aside className="h-fit space-y-6 lg:sticky lg:top-28">
        <div>
          <h1 className="text-3xl font-bold text-ink">{t("site.partner.registerTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("site.partner.registerSub")}</p>
        </div>
        <ol className="space-y-1">
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "current" : "todo";
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition",
                    state === "current" && "bg-primary-soft text-primary",
                    state === "done" && "text-ink hover:bg-muted",
                    state === "todo" && "text-muted-foreground",
                  )}
                >
                  <span className={cn("flex size-8 items-center justify-center rounded-lg", state === "todo" ? "bg-muted" : "bg-primary text-white")}>
                    {state === "done" ? <Check className="size-4" strokeWidth={3} /> : <s.icon className="size-4" />}
                  </span>
                  {t(`site.partner.steps.${s.key}`)}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="flex items-start gap-2 rounded-xl bg-surface p-4 text-xs text-muted-foreground ring-1 ring-border">
          <ShieldCheck className="size-4 shrink-0 text-success" /> {L(note)}
        </p>
      </aside>

      <div className="rounded-3xl border border-border bg-surface p-6 shadow-pop sm:p-8">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">{t("site.offerForm.stepOf", { step: step + 1, total: 4 })}</p>
        <h2 className="mb-6 text-xl font-bold text-ink">{t(`site.partner.steps.${STEPS[step].key}`)}</h2>

        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {field("name", t("site.partner.companyName"), { span: "sm:col-span-2" })}
            {field("regNumber", t("site.partner.regNumber"), { ltr: true, ph: "CHE-123.456.789" })}
            {field("foundedYear", t("site.partner.foundedYear"), { type: "number", ltr: true, ph: "2010" })}
            {field("ownerName", t("site.partner.owner"), { span: "sm:col-span-2" })}
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-5 sm:grid-cols-6">
            {field("email", t("common.fields.email"), { type: "email", ltr: true, span: "sm:col-span-3" })}
            {field("website", t("common.fields.website"), { ltr: true, ph: "https://", span: "sm:col-span-3", required: false })}
            {field("phone", t("common.fields.phone"), { type: "tel", ltr: true, span: "sm:col-span-3" })}
            {field("mobile", t("common.fields.mobile"), { type: "tel", ltr: true, span: "sm:col-span-3", required: false })}
            {field("address", t("common.fields.street"), { span: "sm:col-span-6" })}
            <Field label={t("common.fields.zip")} error={errors.zip} required className="sm:col-span-2">
              <Input
                value={f.zip}
                dir="ltr"
                inputMode="numeric"
                maxLength={4}
                list="partner-zips"
                aria-invalid={!!errors.zip}
                onChange={(e) => {
                  const zip = e.target.value;
                  const c = CITIES.find((x) => x.zip === zip);
                  setF((x) => ({ ...x, zip, city: c ? c.city : x.city }));
                }}
              />
              <datalist id="partner-zips">{CITIES.map((c) => <option key={c.zip} value={c.zip}>{c.city}</option>)}</datalist>
            </Field>
            {field("city", t("common.fields.city"), { span: "sm:col-span-4" })}
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {field("bankName", t("site.partner.bankName"))}
            {field("bankOwner", t("site.partner.bankOwner"))}
            {field("iban", t("site.partner.iban"), { ltr: true, ph: "CH93 0076 2011 6238 5295 7", span: "sm:col-span-2" })}
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-5">
            <Field label={t("common.fields.services")} hint={t("site.partner.servicesHint")} error={errors.serviceIds} required>
              <div className="grid gap-2 sm:grid-cols-2">
                {services
                  .filter((s) => s.active)
                  .map((s) => {
                    const on = f.serviceIds.includes(s.id);
                    return (
                      <label key={s.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold transition", on ? "border-primary bg-primary-soft text-primary" : "border-input hover:border-primary/40")}>
                        <Checkbox
                          checked={on}
                          onCheckedChange={(v) =>
                            setF((x) => ({ ...x, serviceIds: v ? [...x.serviceIds, s.id] : x.serviceIds.filter((id) => id !== s.id) }))
                          }
                        />
                        <Icon name={s.icon} className="size-4" />
                        {L(s.name)}
                      </label>
                    );
                  })}
              </div>
            </Field>
            <Field label={t("site.partner.about")} error={errors.about} required>
              <Textarea rows={4} value={f.about} onChange={set("about")} placeholder={t("site.partner.aboutPh")} aria-invalid={!!errors.about} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              {field("password", t("common.fields.password"), { type: "password", ltr: true })}
              {field("password2", t("common.fields.confirmPassword"), { type: "password", ltr: true })}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="flip-rtl" /> {t("common.actions.back")}
          </Button>
          {step < 3 ? (
            <Button onClick={next} size="lg">
              {t("common.actions.next")} <ArrowRight className="flip-rtl" />
            </Button>
          ) : (
            <Button variant="accent" size="lg" onClick={submit} loading={busy}>
              {t("site.partner.submit")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
