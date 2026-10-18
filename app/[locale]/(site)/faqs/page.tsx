"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, MessageCircleQuestion, Search } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/controls";
import { EmptyState } from "@/components/shared/bits";
import { PageHero } from "@/components/site/sections";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FaqPage() {
  const t = useTranslations();
  const L = useL();
  const page = useStore((s) => s.site.faqPage);
  const faqs = useStore((s) => s.faqs);
  const submitFaqQuestion = useStore((s) => s.submitFaqQuestion);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", email: "", question: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const term = q.trim().toLowerCase();
  const list = [...faqs]
    .sort((a, b) => a.order - b.order)
    .filter((f) => !term || L(f.question).toLowerCase().includes(term) || L(f.answer).toLowerCase().includes(term));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = t("common.form.required");
    if (!EMAIL.test(form.email)) err.email = t("common.form.email");
    if (form.question.trim().length < 8) err.question = t("common.form.minLength");
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    await mock(() => submitFaqQuestion(form));
    setBusy(false);
    setSent(true);
    toast.success(t("site.faq.sent"));
  };

  return (
    <>
      <PageHero title={L(page.title)} subtitle={L(page.subtitle)}>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("site.faq.searchPh")} className="h-12 ps-9" />
        </div>
      </PageHero>
      <section className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-border bg-surface px-6">
          {list.length ? (
            <Accordion type="multiple" defaultValue={list[0] ? [list[0].id] : []}>
              {list.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger>{L(f.question)}</AccordionTrigger>
                  <AccordionContent>{L(f.answer)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <EmptyState title={t("common.table.noResults")} body={t("common.table.noResultsHint")} />
          )}
        </div>
        <aside className="h-fit rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-28">
          <MessageCircleQuestion className="mb-3 size-8 text-accent" />
          <h2 className="text-lg font-bold text-ink">{L(page.askTitle)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("site.faq.askBody")}</p>
          {sent ? (
            <p className="mt-6 flex items-center gap-2 rounded-xl bg-success-soft p-4 text-sm font-semibold text-success">
              <CheckCircle2 className="size-5" /> {t("site.faq.sent")}
            </p>
          ) : (
            <form onSubmit={submit} className="mt-5 grid gap-4" noValidate>
              <Field label={t("common.fields.name")} error={errors.name} required>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
              </Field>
              <Field label={t("common.fields.email")} error={errors.email} required>
                <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
              </Field>
              <Field label={t("site.faq.question")} error={errors.question} required>
                <Textarea rows={3} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} aria-invalid={!!errors.question} />
              </Field>
              <Button type="submit" loading={busy}>
                {t("common.actions.send")}
              </Button>
            </form>
          )}
        </aside>
      </section>
    </>
  );
}
