"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, Mail, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageHero } from "@/components/site/sections";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage() {
  const t = useTranslations();
  const L = useL();
  const page = useStore((s) => s.site.contact);
  const general = useStore((s) => s.site.general);
  const submitContact = useStore((s) => s.submitContact);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const subjects = (["request", "partner", "date", "other"] as const).map((k) => ({ value: t(`site.contact.subjects.${k}`), label: t(`site.contact.subjects.${k}`) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = t("common.form.required");
    if (!EMAIL.test(form.email)) err.email = t("common.form.email");
    if (!form.subject) err.subject = t("common.form.required");
    if (form.message.trim().length < 10) err.message = t("common.form.minLength");
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    await mock(() => submitContact(form));
    setBusy(false);
    setSent(true);
    toast.success(t("site.contact.sent"));
  };

  const info = [
    { icon: Phone, label: t("site.contact.phone"), value: general.phone, href: `tel:${general.phone}`, ltr: true },
    { icon: Mail, label: t("site.contact.email"), value: general.email, href: `mailto:${general.email}` },
    { icon: MapPin, label: t("site.contact.visit"), value: L(general.address) },
    { icon: Clock, label: t("site.contact.hours"), value: L(general.hours) },
  ];

  return (
    <>
      <PageHero title={L(page.title)} subtitle={L(page.subtitle)} />
      <section className="container-page grid gap-8 py-12 lg:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          {info.map(({ icon: I, label, value, href, ltr }) => (
            <div key={label} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <I className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                {href ? (
                  <a href={href} className="font-semibold text-ink hover:text-primary" dir={ltr ? "ltr" : undefined}>{value}</a>
                ) : (
                  <p className="font-semibold text-ink">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-pop sm:p-8">
          {sent ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-4 size-14 text-success" />
              <p className="text-lg font-semibold text-ink">{t("site.contact.sent")}</p>
              <Button variant="outline" className="mt-6" onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}>
                {t("common.actions.back")}
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-5" noValidate>
              <h2 className="text-xl font-bold text-ink">{L(page.formTitle)}</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t("common.fields.name")} error={errors.name} required>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
                </Field>
                <Field label={t("common.fields.email")} error={errors.email} required>
                  <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
                </Field>
                <Field label={t("common.fields.phone")} hint={t("common.form.optional")}>
                  <Input type="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label={t("common.fields.subject")} error={errors.subject} required>
                  <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })} options={subjects} placeholder={t("common.form.select")} invalid={!!errors.subject} />
                </Field>
              </div>
              <Field label={t("common.fields.message")} error={errors.message} required>
                <Textarea rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-invalid={!!errors.message} />
              </Field>
              <Button type="submit" size="lg" loading={busy} className="sm:w-fit">
                {t("common.actions.send")}
              </Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
