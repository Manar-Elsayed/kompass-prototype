"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ExternalLink, Lock, MapPin, Flag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Offer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { CITIES } from "@/lib/mock/seed";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox, RadioCards, Switch } from "@/components/ui/controls";
import { Icon } from "@/components/shared/icon";

const ROOMS = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "7+"];
const FLOORS = ["0", "1", "2", "3", "4", "5", "6", "7+"];

const address = z.object({
  zip: z.string().regex(/^\d{4}$/, "zip"),
  city: z.string().min(1, "required"),
  street: z.string().min(1, "required"),
  rooms: z.string().min(1, "required"),
  floor: z.string().min(1, "required"),
  elevator: z.boolean(),
});

const schema = z.object({
  serviceId: z.string().min(1, "required"),
  from: address,
  to: address,
  executionDate: z.string().min(1, "required"),
  offersWanted: z.string(),
  details: z.string(),
  gender: z.enum(["male", "female"], { message: "required" }),
  firstName: z.string().min(1, "required"),
  lastName: z.string().min(1, "required"),
  email: z.string().email("email"),
  phone: z.string().regex(/^[+\d][\d\s]{7,}$/, "phone"),
  privacy: z.literal(true, { message: "required" }),
});
type FormValues = z.infer<typeof schema>;

const STEP1: (keyof FormValues)[] = ["serviceId", "from", "to", "executionDate", "offersWanted", "details"];

export function OfferForm({
  defaultServiceId,
  defaultZip,
  className,
  bare,
  source = "website",
  defaultContact,
  onCreated,
}: {
  defaultServiceId?: string;
  defaultZip?: string;
  className?: string;
  bare?: boolean;
  source?: Offer["source"];
  /** Prefill from an abandoned website form when admin completes the request for the customer. */
  defaultContact?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  onCreated?: (offer: Offer) => void;
}) {
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const services = useStore((s) => s.services);
  const content = useStore((s) => s.site.offerForm);
  const maxOffers = useStore((s) => s.config.maxOffersPerLead);
  const submitOffer = useStore((s) => s.submitOffer);
  const trackFormSession = useStore((s) => s.trackFormSession);
  const [step, setStep] = useState(1);
  const [done, setDone] = useState<Offer | null>(null);

  const zipCity = defaultZip ? CITIES.find((c) => c.zip === defaultZip)?.city ?? "" : "";
  const emptyAddr = { zip: "", city: "", street: "", rooms: "", floor: "", elevator: false };
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      serviceId: defaultServiceId ?? "",
      from: { ...emptyAddr, zip: defaultZip ?? "", city: zipCity },
      to: emptyAddr,
      executionDate: "",
      offersWanted: "3",
      details: "",
      firstName: defaultContact?.firstName ?? "",
      lastName: defaultContact?.lastName ?? "",
      email: defaultContact?.email ?? "",
      phone: defaultContact?.phone ?? "",
    } as Partial<FormValues> as FormValues,
  });
  const { register, control, handleSubmit, formState, setValue, watch, trigger, reset } = form;

  // Website only: record how far this visitor gets, so admin sees who started and who left.
  const sessionId = useRef<string | null>(null);
  const track = (patch: Parameters<typeof trackFormSession>[1]) => {
    if (source !== "website") return;
    if (!sessionId.current) sessionId.current = `FS-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    trackFormSession(sessionId.current, patch);
  };
  useEffect(() => {
    if (source !== "website") return;
    const sub = watch((v) => {
      if (!sessionId.current) {
        const device = typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop";
        track({ step: "started", device, serviceId: v.serviceId || undefined });
      }
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, source]);
  const trackContact = () => {
    const v = form.getValues();
    if (!sessionId.current || !(v.email || v.phone)) return;
    track({ step: "contact", name: `${v.firstName} ${v.lastName}`.trim() || undefined, email: v.email || undefined, phone: v.phone || undefined, serviceId: v.serviceId || undefined });
  };
  const errors = formState.errors;
  const err = (msg?: string) => (msg ? t(`common.form.${msg}` as "common.form.required") : undefined);

  const next = async () => {
    const ok = await trigger(STEP1);
    if (ok) {
      track({ step: "details", serviceId: form.getValues("serviceId") });
      setStep(2);
      document.getElementById("offer-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const onSubmit = handleSubmit(async (v) => {
    const toAddr = (a: FormValues["from"]) => ({ ...a, country: "CH" });
    const offer = await mock(
      () =>
        submitOffer({
          serviceId: v.serviceId,
          gender: v.gender,
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          phone: v.phone,
          lang,
          from: toAddr(v.from),
          to: toAddr(v.to),
          executionDate: new Date(v.executionDate).toISOString(),
          deadline: new Date(new Date(v.executionDate).getTime() - 5 * 86_400_000).toISOString(),
          offersWanted: Number(v.offersWanted),
          details: v.details,
          source,
        }),
      900,
    );
    track({ step: "submitted", offerId: offer.id, serviceId: offer.serviceId, name: `${offer.firstName} ${offer.lastName}`, email: offer.email, phone: offer.phone });
    sessionId.current = null;
    if (onCreated) return onCreated(offer);
    setDone(offer);
  });

  const zipField = (prefix: "from" | "to") => {
    const reg = register(`${prefix}.zip`);
    return (
      <Input
        {...reg}
        inputMode="numeric"
        maxLength={4}
        dir="ltr"
        placeholder="8001"
        list="ch-zips"
        aria-invalid={!!errors[prefix]?.zip}
        onChange={(e) => {
          reg.onChange(e);
          const c = CITIES.find((x) => x.zip === e.target.value);
          if (c) setValue(`${prefix}.city`, c.city, { shouldValidate: true });
        }}
      />
    );
  };

  const addressBlock = (prefix: "from" | "to", title: string, icon: React.ReactNode) => (
    <fieldset className="rounded-xl border border-border bg-surface-2/40 p-4 sm:p-5">
      <legend className="flex items-center gap-2 px-1 text-sm font-bold text-ink">
        {icon}
        {title}
      </legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-6">
        <Field label={t("common.fields.zip")} error={err(errors[prefix]?.zip?.message)} className="sm:col-span-2" required>
          {zipField(prefix)}
        </Field>
        <Field label={t("common.fields.city")} error={err(errors[prefix]?.city?.message)} className="sm:col-span-4" required>
          <Input {...register(`${prefix}.city`)} aria-invalid={!!errors[prefix]?.city} />
        </Field>
        <Field label={t("common.fields.street")} error={err(errors[prefix]?.street?.message)} className="sm:col-span-6" required>
          <Input {...register(`${prefix}.street`)} aria-invalid={!!errors[prefix]?.street} />
        </Field>
        <Field label={t("common.fields.rooms")} error={err(errors[prefix]?.rooms?.message)} className="sm:col-span-2" required>
          <Controller
            control={control}
            name={`${prefix}.rooms`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} invalid={!!errors[prefix]?.rooms} placeholder="–" options={ROOMS.map((r) => ({ value: r, label: r }))} />
            )}
          />
        </Field>
        <Field label={t("common.fields.floor")} error={err(errors[prefix]?.floor?.message)} className="sm:col-span-2" required>
          <Controller
            control={control}
            name={`${prefix}.floor`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} invalid={!!errors[prefix]?.floor} placeholder="–" options={FLOORS.map((r) => ({ value: r, label: r === "0" ? t("site.offerForm.floorPh") : r }))} />
            )}
          />
        </Field>
        <Field label={t("common.fields.elevator")} className="sm:col-span-2">
          <Controller
            control={control}
            name={`${prefix}.elevator`}
            render={({ field }) => (
              <label className="flex h-10 items-center gap-3 rounded-lg border border-input bg-surface px-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {field.value ? t("common.form.yes") : t("common.form.no")}
              </label>
            )}
          />
        </Field>
      </div>
    </fieldset>
  );

  const shell = (children: React.ReactNode) =>
    bare ? (
      <div className={className}>{children}</div>
    ) : (
      <div className={cn("rounded-3xl border border-border bg-surface p-5 shadow-pop sm:p-8", className)}>{children}</div>
    );

  if (done) {
    return shell(
      <div className="mx-auto max-w-lg py-6 text-center" role="status">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-9 text-success" />
        </div>
        <h3 className="text-2xl font-bold text-ink">{L(content.successTitle)}</h3>
        <p className="mt-2 text-muted-foreground">{L(content.successMessage)}</p>
        <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">{t("site.offerForm.reference")}</span>
          <span className="font-mono font-bold text-ink" dir="ltr">{done.id}</span>
        </div>
        <div className="mt-8 text-start">
          <p className="mb-3 text-sm font-bold text-ink">{t("site.offerForm.whatNext")}</p>
          <ol className="space-y-3">
            {[t("site.offerForm.next1"), t("site.offerForm.next2", { count: done.offersWanted }), t("site.offerForm.next3")].map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
                <span className="pt-0.5 text-foreground/90">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              setStep(1);
              setDone(null);
            }}
          >
            {t("site.offerForm.newRequest")}
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/admin/leads/${done.id}`}>
              <ExternalLink />
              {t("site.offerForm.seeInAdmin")}
            </Link>
          </Button>
        </div>
      </div>,
    );
  }

  const values = watch();
  const svc = services.find((s) => s.id === values.serviceId);

  return shell(
    <form onSubmit={onSubmit} noValidate>
      <datalist id="ch-zips">
        {CITIES.map((c) => (
          <option key={c.zip} value={c.zip}>
            {c.city}
          </option>
        ))}
      </datalist>

      {/* header + steps */}
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-ink">{L(content.title)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{L(content.subtitle)}</p>
        </div>
        <ol className="flex items-center gap-2" aria-label={t("site.offerForm.stepOf", { step, total: 2 })}>
          {[L(content.step1), L(content.step2)].map((label, i) => {
            const n = i + 1;
            const state = step > n ? "done" : step === n ? "current" : "todo";
            return (
              <li key={n} className="flex items-center gap-2">
                {i > 0 && <span className={cn("h-0.5 w-6 rounded", step > 1 ? "bg-primary" : "bg-border")} />}
                <button
                  type="button"
                  onClick={() => (n === 1 ? setStep(1) : next())}
                  className={cn(
                    "flex items-center gap-2 rounded-full py-1 pe-3 ps-1 text-xs font-bold transition",
                    state === "current" && "bg-primary-soft text-primary",
                    state === "done" && "text-primary",
                    state === "todo" && "text-muted-foreground",
                  )}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-[11px]",
                      state === "todo" ? "bg-muted text-muted-foreground" : "bg-primary text-white",
                    )}
                  >
                    {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : n}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {step === 1 ? (
        <div className="grid gap-5">
          <Field label={t("site.offerForm.serviceLabel")} error={err(errors.serviceId?.message)} required>
            <Controller
              control={control}
              name="serviceId"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
                  {services
                    .filter((s) => s.active)
                    .map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        role="radio"
                        aria-label={L(s.name)}
                        aria-checked={field.value === s.id}
                        onClick={() => field.onChange(s.id)}
                        className={cn(
                          "flex flex-col items-start gap-2 rounded-xl border p-3 text-start text-sm font-semibold transition",
                          field.value === s.id
                            ? "border-primary bg-primary-soft text-primary ring-1 ring-primary"
                            : "border-input bg-surface text-foreground hover:border-primary/40",
                        )}
                      >
                        <Icon name={s.icon} className="size-5" />
                        <span className="leading-tight">{L(s.name)}</span>
                      </button>
                    ))}
                </div>
              )}
            />
          </Field>

          <div className="grid gap-5 lg:grid-cols-2">
            {addressBlock("from", t("site.offerForm.movingFrom"), <MapPin className="size-4 text-accent" />)}
            {addressBlock("to", t("site.offerForm.movingTo"), <Flag className="size-4 text-primary" />)}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("site.offerForm.date")} error={err(errors.executionDate?.message)} required>
              <Input type="date" min="2026-10-19" {...register("executionDate")} aria-invalid={!!errors.executionDate} />
            </Field>
            <Field label={t("site.offerForm.offersCount")}>
              <Controller
                control={control}
                name="offersWanted"
                render={({ field }) => (
                  <RadioCards
                    className="grid-cols-5"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={Array.from({ length: maxOffers }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                  />
                )}
              />
            </Field>
          </div>

          <Field label={t("site.offerForm.details")} hint={t("common.form.optional")}>
            <Textarea {...register("details")} placeholder={t("site.offerForm.detailsPh")} rows={3} />
          </Field>

          <div className="flex flex-col-reverse items-center justify-between gap-3 border-t pt-5 sm:flex-row">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> {L(content.note)}
            </p>
            <Button type="button" size="lg" onClick={next} className="w-full sm:w-auto">
              {t("common.actions.next")}
              <ArrowRight className="" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-5">
            <Field label={t("common.fields.salutation")} error={err(errors.gender?.message)} required>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <RadioCards
                    className="max-w-xs grid-cols-2"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: "male", label: t("common.form.mr") },
                      { value: "female", label: t("common.form.ms") },
                    ]}
                  />
                )}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("common.fields.firstName")} error={err(errors.firstName?.message)} required>
                <Input {...register("firstName", { onBlur: trackContact })} autoComplete="given-name" aria-invalid={!!errors.firstName} />
              </Field>
              <Field label={t("common.fields.lastName")} error={err(errors.lastName?.message)} required>
                <Input {...register("lastName")} autoComplete="family-name" aria-invalid={!!errors.lastName} />
              </Field>
              <Field label={t("common.fields.email")} error={err(errors.email?.message)} required>
                <Input type="email" dir="ltr" {...register("email", { onBlur: trackContact })} autoComplete="email" aria-invalid={!!errors.email} />
              </Field>
              <Field label={t("common.fields.phone")} error={err(errors.phone?.message)} required>
                <Input type="tel" dir="ltr" placeholder="+41 79 123 45 67" {...register("phone", { onBlur: trackContact })} autoComplete="tel" aria-invalid={!!errors.phone} />
              </Field>
            </div>
            <Controller
              control={control}
              name="privacy"
              render={({ field }) => (
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true ? true : undefined)} className="mt-0.5" aria-invalid={!!errors.privacy} />
                  <span className={cn(errors.privacy && "text-danger")}>
                    {t("site.offerForm.privacyAgree")}{" "}
                    <Link href="/privacy" className="font-semibold text-primary underline-offset-2 hover:underline" target="_blank">
                      ↗
                    </Link>
                  </span>
                </label>
              )}
            />
          </div>

          {/* summary */}
          <aside className="h-fit rounded-xl bg-surface-2 p-4 text-sm">
            <p className="mb-3 font-bold text-ink">{t("site.offerForm.summary")}</p>
            <dl className="space-y-2.5">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("common.fields.service")}</dt>
                <dd className="text-end font-semibold">{svc ? L(svc.name) : "–"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("site.offerForm.movingFrom")}</dt>
                <dd className="text-end font-semibold">{values.from.zip} {values.from.city}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("site.offerForm.movingTo")}</dt>
                <dd className="text-end font-semibold">{values.to.zip} {values.to.city}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("site.offerForm.date")}</dt>
                <dd className="text-end font-semibold" dir="ltr">{values.executionDate || "–"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("site.offerForm.offersCount")}</dt>
                <dd className="font-semibold">{values.offersWanted}</dd>
              </div>
            </dl>
          </aside>

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between lg:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="" />
              {t("common.actions.back")}
            </Button>
            <Button type="submit" variant="accent" size="lg" loading={formState.isSubmitting}>
              {formState.isSubmitting ? t("site.offerForm.sending") : t("site.offerForm.submit")}
            </Button>
          </div>
        </div>
      )}
    </form>,
  );
}
