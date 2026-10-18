"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/mock/store";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RadioCards } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ComplaintDialog({
  open,
  onOpenChange,
  partnerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partnerId?: string;
}) {
  const t = useTranslations();
  const partners = useStore((s) => s.partners);
  const submitComplaint = useStore((s) => s.submitComplaint);
  const [kind, setKind] = useState<"partner" | "offer">("partner");
  const [form, setForm] = useState({ partnerId: partnerId ?? "", offerId: "", name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = t("common.form.required");
    if (!EMAIL.test(form.email)) err.email = t("common.form.email");
    if (form.message.trim().length < 10) err.message = t("common.form.minLength");
    if (kind === "partner" && !form.partnerId) err.partnerId = t("common.form.required");
    if (kind === "offer" && !form.offerId.trim()) err.offerId = t("common.form.required");
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    await mock(() =>
      submitComplaint({
        kind,
        partnerId: kind === "partner" ? form.partnerId : undefined,
        offerId: kind === "offer" ? form.offerId.trim().toUpperCase() : undefined,
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
      }),
    );
    setBusy(false);
    setDone(true);
    toast.success(t("site.complaint.sent"));
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(() => setDone(false), 300);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-12 text-success" />
            <DialogTitle>{t("site.complaint.title")}</DialogTitle>
            <DialogDescription className="mt-2">{t("site.complaint.sent")}</DialogDescription>
            <Button className="mt-6" onClick={() => close(false)}>
              {t("common.actions.close")}
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("site.complaint.title")}</DialogTitle>
              <DialogDescription>{t("site.complaint.body")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="grid gap-4" noValidate>
              <Field label={t("site.complaint.kind")}>
                <RadioCards
                  className="grid-cols-2"
                  value={kind}
                  onValueChange={(v) => setKind(v as "partner" | "offer")}
                  options={[
                    { value: "partner", label: t("site.complaint.kindPartner") },
                    { value: "offer", label: t("site.complaint.kindOffer") },
                  ]}
                />
              </Field>
              {kind === "partner" ? (
                <Field label={t("common.fields.company")} error={errors.partnerId} required>
                  <Select
                    value={form.partnerId}
                    onValueChange={set("partnerId")}
                    invalid={!!errors.partnerId}
                    placeholder={t("common.form.select")}
                    options={partners.filter((p) => p.status === "approved").map((p) => ({ value: p.id, label: p.name }))}
                  />
                </Field>
              ) : (
                <Field label={t("site.complaint.offerId")} error={errors.offerId} required>
                  <Input value={form.offerId} onChange={(e) => set("offerId")(e.target.value)} placeholder="KO-10400" dir="ltr" aria-invalid={!!errors.offerId} />
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("common.fields.name")} error={errors.name} required>
                  <Input value={form.name} onChange={(e) => set("name")(e.target.value)} aria-invalid={!!errors.name} />
                </Field>
                <Field label={t("common.fields.phone")}>
                  <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} dir="ltr" type="tel" />
                </Field>
              </div>
              <Field label={t("common.fields.email")} error={errors.email} required>
                <Input value={form.email} onChange={(e) => set("email")(e.target.value)} type="email" dir="ltr" aria-invalid={!!errors.email} />
              </Field>
              <Field label={t("common.fields.message")} error={errors.message} required>
                <Textarea value={form.message} onChange={(e) => set("message")(e.target.value)} aria-invalid={!!errors.message} />
              </Field>
              <Button type="submit" loading={busy} className="w-full" size="lg">
                {t("common.actions.submit")}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
