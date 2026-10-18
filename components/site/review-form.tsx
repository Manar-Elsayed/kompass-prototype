"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/mock/store";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarInput } from "@/components/shared/bits";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ReviewForm({ target: fixedTarget, onDone }: { target?: string; onDone?: () => void }) {
  const t = useTranslations();
  const partners = useStore((s) => s.partners);
  const submitReview = useStore((s) => s.submitReview);
  const [target, setTarget] = useState(fixedTarget ?? "kompass");
  const [stars, setStars] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", comment: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!stars) err.stars = t("common.form.required");
    if (!form.name.trim()) err.name = t("common.form.required");
    if (!EMAIL.test(form.email)) err.email = t("common.form.email");
    if (form.comment.trim().length < 10) err.comment = t("common.form.minLength");
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    await mock(() => submitReview({ target, stars, ...form }));
    setBusy(false);
    setDone(true);
    toast.success(t("site.review.sent"));
  };

  if (done)
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-12 text-success" />
        <p className="font-semibold text-ink">{t("site.review.sent")}</p>
        {onDone && (
          <Button className="mt-6" onClick={onDone}>
            {t("common.actions.close")}
          </Button>
        )}
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      {!fixedTarget && (
        <Field label={t("site.review.about")}>
          <Select
            value={target}
            onValueChange={setTarget}
            options={[
              { value: "kompass", label: t("site.review.kompass") },
              ...partners.filter((p) => p.status === "approved" && !p.banned).map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </Field>
      )}
      <Field label={t("site.review.stars")} error={errors.stars} required>
        <StarInput value={stars} onChange={setStars} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.fields.name")} error={errors.name} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
        </Field>
        <Field label={t("common.fields.email")} error={errors.email} required>
          <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <Field label={t("common.fields.comment")} error={errors.comment} required>
        <Textarea rows={4} value={form.comment} placeholder={t("site.review.commentPh")} onChange={(e) => setForm({ ...form, comment: e.target.value })} aria-invalid={!!errors.comment} />
      </Field>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-success" /> {t("site.review.moderated")}
      </p>
      <Button type="submit" size="lg" loading={busy}>
        {t("common.actions.submit")}
      </Button>
    </form>
  );
}

export function ReviewDialog({ open, onOpenChange, target }: { open: boolean; onOpenChange: (v: boolean) => void; target?: string }) {
  const t = useTranslations("site.review");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("moderated")}</DialogDescription>
        </DialogHeader>
        {open && <ReviewForm target={target} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
