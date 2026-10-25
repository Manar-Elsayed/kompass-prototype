"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ExternalLink, Headset, Lock, MapPin, Flag, User, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { BookingType, Offer } from "@/lib/types";
import { CLEANING_TYPES, DISPOSAL_ITEMS, DURATIONS, INSTRUMENTS, JOB_FORMS, PROPERTY_TYPES, jobKind, type JobDetails, type JobKind } from "@/lib/jobs";
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
import { ConfirmationEmail, PriceEstimate, priceRange } from "@/components/site/request-bits";

const ROOMS = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "7+"];
const FLOORS = ["0", "1", "2", "3", "4", "5", "6", "7+"];

const address = z.object({
  zip: z.string(),
  city: z.string(),
  street: z.string(),
  rooms: z.string(),
  floor: z.string(),
  elevator: z.boolean(),
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+\d][\d\s]{7,}$/;

// Fields are lenient on their own; the rules below depend on the service (which questions it asks)
// and on who the request is for, so they all live in one place.
const schema = z
  .object({
    serviceId: z.string(),
    kind: z.string(),
    from: address,
    to: address,
    executionDate: z.string(),
    cleaningDate: z.string(),
    flexibleDate: z.boolean(),
    propertyType: z.string(),
    areaM2: z.string(),
    cleaningType: z.string(),
    instrument: z.string(),
    amount: z.string(),
    duration: z.string(),
    items: z.array(z.string()),
    otherNote: z.string(),
    offersWanted: z.string(),
    details: z.string(),
    booking: z.enum(["personal", "other", "organization"]),
    // the person moving — the one companies serve and call
    gender: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
    // whoever fills in the form for them: the other person, or the organization's contact person
    reqFirstName: z.string(),
    reqLastName: z.string(),
    reqEmail: z.string(),
    reqPhone: z.string(),
    reqAddress: z.string(),
    orgName: z.string(),
    orgAddress: z.string(),
    privacy: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const need = (path: (string | number)[], ok: boolean, message = "required") => {
      if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    };
    const filled = (x: string) => x.trim().length > 0;
    /* step 1: the job */
    need(["serviceId"], filled(v.serviceId));
    if (v.serviceId) {
      const form = JOB_FORMS[(v.kind || "move") as JobKind];
      const place = (key: "from" | "to") => {
        const p = v[key];
        need([key, "zip"], /^\d{4}$/.test(p.zip), "zip");
        need([key, "city"], filled(p.city));
        need([key, "street"], filled(p.street));
        need([key, "floor"], filled(p.floor));
        if (form.rooms) need([key, "rooms"], filled(p.rooms));
      };
      place("from");
      if (form.to) place("to");
      need(["executionDate"], filled(v.executionDate));
      if (form.cleaningDate) need(["cleaningDate"], filled(v.cleaningDate));
      if (form.property) {
        need(["propertyType"], filled(v.propertyType));
        need(["from", "rooms"], filled(v.from.rooms));
      }
      if (form.cleaningType) need(["cleaningType"], filled(v.cleaningType));
      if (form.instrument) need(["instrument"], filled(v.instrument));
      if (form.amounts) need(["amount"], filled(v.amount));
      if (form.duration) need(["duration"], filled(v.duration));
      if (form.items) need(["items"], v.items.length > 0);
      // "Other" needs a few words so the companies know what it is
      if ((form.amounts && v.amount === "other") || (form.items && v.items.includes("other"))) need(["otherNote"], filled(v.otherNote));
    }
    /* step 2: the people */
    need(["gender"], v.gender === "male" || v.gender === "female");
    need(["firstName"], filled(v.firstName));
    need(["lastName"], filled(v.lastName));
    need(["phone"], PHONE.test(v.phone), "phone");
    need(["address"], filled(v.address));
    // booking for someone else: the person moving may have no email; companies then call them
    if (v.booking === "personal" || filled(v.email)) need(["email"], EMAIL.test(v.email), "email");
    if (v.booking !== "personal") {
      need(["reqFirstName"], filled(v.reqFirstName));
      need(["reqLastName"], filled(v.reqLastName));
      need(["reqEmail"], EMAIL.test(v.reqEmail), "email");
      need(["reqPhone"], PHONE.test(v.reqPhone), "phone");
    }
    if (v.booking === "other") need(["reqAddress"], filled(v.reqAddress));
    if (v.booking === "organization") {
      need(["orgName"], filled(v.orgName));
      need(["orgAddress"], filled(v.orgAddress));
    }
    need(["privacy"], v.privacy === true);
  });
type FormValues = z.infer<typeof schema>;

const STEP1: (keyof FormValues)[] = ["serviceId", "from", "to", "executionDate", "cleaningDate", "propertyType", "cleaningType", "instrument", "amount", "duration", "items", "otherNote"];

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
  // Add offer starts on the first bookable service, so the team sees its questions at once
  const firstService = [...services].filter((x) => x.active && !x.comingSoon).sort((a, b) => a.order - b.order)[0]?.id ?? "";
  const startService = defaultServiceId ?? (source === "admin" ? firstService : "");
  const emptyAddr = { zip: "", city: "", street: "", rooms: "", floor: "", elevator: false };
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      serviceId: startService,
      kind: jobKind(services.find((x) => x.id === startService)),
      from: { ...emptyAddr, zip: defaultZip ?? "", city: zipCity },
      to: emptyAddr,
      executionDate: "",
      cleaningDate: "",
      flexibleDate: false,
      propertyType: "",
      areaM2: "",
      cleaningType: "",
      instrument: "",
      amount: "",
      duration: "",
      items: [],
      otherNote: "",
      gender: "",
      offersWanted: "3",
      details: "",
      booking: "personal",
      firstName: defaultContact?.firstName ?? "",
      lastName: defaultContact?.lastName ?? "",
      email: defaultContact?.email ?? "",
      phone: defaultContact?.phone ?? "",
      reqFirstName: "",
      reqLastName: "",
      reqEmail: "",
      reqPhone: "",
      reqAddress: "",
      orgName: "",
      orgAddress: "",
      address: "",
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
  const serviceIdNow = watch("serviceId");
  useEffect(() => {
    setValue("kind", jobKind(services.find((x) => x.id === serviceIdNow)));
  }, [serviceIdNow, services, setValue]);
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
    const form = JOB_FORMS[(v.kind || "move") as JobKind];
    const toAddr = (a: FormValues["from"], rooms: boolean) => ({ ...a, rooms: rooms ? a.rooms : "", country: "CH" });
    const job: JobDetails = {
      ...(form.flexible && v.flexibleDate ? { flexibleDate: true } : {}),
      ...(form.cleaningDate ? { cleaningDate: new Date(v.cleaningDate).toISOString() } : {}),
      ...(form.property ? { propertyType: v.propertyType as JobDetails["propertyType"], ...(Number(v.areaM2) > 0 ? { areaM2: Number(v.areaM2) } : {}) } : {}),
      ...(form.cleaningType ? { cleaningType: v.cleaningType as JobDetails["cleaningType"] } : {}),
      ...(form.instrument ? { instrument: v.instrument as JobDetails["instrument"] } : {}),
      ...(form.amounts ? { amount: v.amount as JobDetails["amount"] } : {}),
      ...(form.duration ? { duration: v.duration as JobDetails["duration"] } : {}),
      ...(form.items ? { items: v.items as JobDetails["items"] } : {}),
      ...((form.amounts && v.amount === "other") || (form.items && v.items.includes("other")) ? { otherNote: v.otherNote.trim() } : {}),
    };
    const booking = v.booking as BookingType;
    const requester =
      booking === "personal"
        ? undefined
        : {
            firstName: v.reqFirstName.trim(),
            lastName: v.reqLastName.trim(),
            email: v.reqEmail.trim(),
            phone: v.reqPhone.trim(),
            address: (booking === "organization" ? v.orgAddress : v.reqAddress).trim(),
          };
    const offer = await mock(
      () =>
        submitOffer({
          serviceId: v.serviceId,
          gender: v.gender as Offer["gender"],
          firstName: v.firstName,
          lastName: v.lastName,
          // without an email for the person moving, companies write to whoever booked
          email: v.email.trim() || requester?.email || "",
          phone: v.phone,
          booking,
          customerAddress: v.address.trim(),
          requester,
          organization: booking === "organization" ? { name: v.orgName.trim(), address: v.orgAddress.trim() } : undefined,
          lang,
          from: toAddr(v.from, form.rooms || !!form.property),
          to: form.to ? toAddr(v.to, form.rooms) : undefined,
          job,
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

  const addressBlock = (prefix: "from" | "to", title: string, icon: React.ReactNode, withRooms: boolean) => (
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
        {withRooms && (
          <Field label={t("common.fields.rooms")} error={err(errors[prefix]?.rooms?.message)} className="sm:col-span-2" required>
            <Controller
              control={control}
              name={`${prefix}.rooms`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} invalid={!!errors[prefix]?.rooms} placeholder="–" options={ROOMS.map((r) => ({ value: r, label: r }))} />
              )}
            />
          </Field>
        )}
        <Field label={t("common.fields.floor")} error={err(errors[prefix]?.floor?.message)} className={withRooms ? "sm:col-span-2" : "sm:col-span-3"} required>
          <Controller
            control={control}
            name={`${prefix}.floor`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} invalid={!!errors[prefix]?.floor} placeholder="–" options={FLOORS.map((r) => ({ value: r, label: r === "0" ? t("site.offerForm.floorPh") : r }))} />
            )}
          />
        </Field>
        <Field label={t("common.fields.elevator")} className={withRooms ? "sm:col-span-2" : "sm:col-span-3"}>
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

  const values = watch();
  const svc = services.find((s) => s.id === values.serviceId);
  const kind = jobKind(svc);
  const jobForm = JOB_FORMS[kind];
  const jt = (key: string, v?: Record<string, string | number>) => t(`site.job.${key}` as "site.job.title", v);
  // small helpers for the service-specific questions
  const choice = (name: "propertyType" | "cleaningType" | "instrument" | "amount", options: readonly string[], cols: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <RadioCards className={cols} value={field.value} onValueChange={field.onChange} options={options.map((o) => ({ value: o, label: jt(`${name}.${o}`) }))} />
      )}
    />
  );
  const multi = (name: "items", options: readonly string[]) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => {
            const on = field.value.includes(o);
            // one toggle per option (a <label> around the checkbox would toggle it twice)
            return (
              <button
                key={o}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => field.onChange(on ? field.value.filter((x: string) => x !== o) : [...field.value, o])}
                className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5 text-start text-sm transition", on ? "border-primary bg-primary-soft/60" : "border-input bg-surface hover:border-primary/40")}
              >
                <span aria-hidden className={cn("flex size-4 shrink-0 items-center justify-center rounded-[5px] border shadow-xs", on ? "border-primary bg-primary text-white" : "border-input bg-surface")}>
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
                {jt(`${name}.${o}`)}
              </button>
            );
          })}
        </div>
      )}
    />
  );
  const booking = values.booking as BookingType;
  const forOther = booking !== "personal";
  // admin enters the request for a customer, so the labels talk about the customer, not "you"
  const isAdmin = source === "admin";
  const bk = (key: string) => t(`site.booking.${key}${source === "admin" ? "Admin" : ""}` as "site.booking.who");
  const whoField = (
    <Field label={t("site.booking.who")} hint={bk(`${booking}Hint`)} required>
      <Controller
        control={control}
        name="booking"
        render={({ field }) => (
          <RadioCards
            className="grid-cols-1 sm:grid-cols-3"
            value={field.value}
            onValueChange={field.onChange}
            options={[
              { value: "personal", label: t("site.booking.personal"), icon: <User className="size-4" /> },
              { value: "other", label: t("site.booking.other"), icon: <Users className="size-4" /> },
              { value: "organization", label: t("site.booking.organization"), icon: <Building2 className="size-4" /> },
            ]}
          />
        )}
      />
    </Field>
  );

  if (done) {
    return shell(
      <div className="mx-auto max-w-xl py-6 text-center" role="status">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-9 text-success" />
        </div>
        <h3 className="text-2xl font-bold text-ink">{L(content.successTitle)}</h3>
        <p className="mt-2 text-muted-foreground">{L(content.successMessage)}</p>
        <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">{t("site.offerForm.reference")}</span>
          <span className="font-mono font-bold text-ink" dir="ltr">{done.id}</span>
        </div>
        <div className="mt-8">
          <p className="mb-3 text-start text-sm font-bold text-ink">{t("site.offerForm.emailSent", { email: done.requester?.email ?? done.email })}</p>
          <ConfirmationEmail offer={done} />
        </div>
        <div className="mt-8 text-start">
          <p className="mb-3 text-sm font-bold text-ink">{t("site.offerForm.whatNext")}</p>
          <ol className="space-y-3">
            {[t("site.offerForm.next1"), t("site.offerForm.next2", { count: done.offersWanted }), t("site.offerForm.next3"), t("site.offerForm.next4")].map((s, i) => (
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
          <h3 className="text-2xl font-bold text-ink">{isAdmin ? t("admin.leads.form.title") : L(content.title)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{isAdmin ? t("admin.leads.form.subtitle") : L(content.subtitle)}</p>
        </div>
        <ol className="flex items-center gap-2" aria-label={t("site.offerForm.stepOf", { step, total: 2 })}>
          {(isAdmin ? [t("admin.leads.form.step1"), t("admin.leads.form.step2")] : [L(content.step1), L(content.step2)]).map((label, i) => {
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
          {/* on Add lead the team first settles who is calling: it decides which contact sections step 2 asks for */}
          {isAdmin && whoField}
          <Field label={t("site.offerForm.serviceLabel")} error={err(errors.serviceId?.message)} required>
            <Controller
              control={control}
              name="serviceId"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup">
                  {services
                    .filter((s) => s.active)
                    .sort((a, b) => a.order - b.order)
                    .map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        role="radio"
                        aria-label={L(s.name)}
                        aria-checked={field.value === s.id}
                        disabled={s.comingSoon}
                        onClick={() => field.onChange(s.id)}
                        className={cn(
                          "flex flex-col items-start gap-2 rounded-xl border p-3 text-start text-sm font-semibold transition",
                          s.comingSoon
                            ? "cursor-not-allowed border-dashed border-input bg-surface-2/50 text-muted-foreground"
                            : field.value === s.id
                              ? "border-primary bg-primary-soft text-primary ring-1 ring-primary"
                              : "border-input bg-surface text-foreground hover:border-primary/40",
                        )}
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <Icon name={s.icon} className="size-5" />
                          {s.comingSoon && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{t("site.estimate.soon")}</span>}
                        </span>
                        <span className="leading-tight">{L(s.name)}</span>
                        {!s.comingSoon && s.estimate.to > 0 && (
                          <span className={cn("text-xs font-medium tabular-nums", field.value === s.id ? "text-primary/80" : "text-muted-foreground")}>
                            {t("site.estimate.from")} {priceRange(s, lang).split(" – ")[0]}
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              )}
            />
          </Field>

          {svc && <PriceEstimate service={svc} />}

          {!svc ? (
            <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{jt("pickService")}</p>
          ) : (
            <>
              {/* Add lead: what to ask the customer on the phone for this service */}
              {isAdmin && (
                <p className="flex items-start gap-2 rounded-xl border border-info/30 bg-info-soft/40 p-3 text-sm text-ink">
                  <Headset className="mt-0.5 size-4 shrink-0 text-info" />
                  <span><strong>{jt("askTitle")}</strong> {jt(`ask.${kind}`)}</span>
                </p>
              )}

              <div className={cn("grid gap-5", jobForm.to && "lg:grid-cols-2")}>
                {addressBlock("from", jt(`from.${kind}`), <MapPin className="size-4 text-accent" />, jobForm.rooms)}
                {jobForm.to && addressBlock("to", jt(`to.${kind}`), <Flag className="size-4 text-primary" />, jobForm.rooms)}
              </div>

              {/* the questions only this service asks */}
              {(jobForm.property || jobForm.cleaningType || jobForm.instrument || jobForm.amounts || jobForm.duration || jobForm.items) && (
                <fieldset className="grid gap-5 rounded-xl border border-border p-4 sm:p-5">
                  <legend className="px-1 text-sm font-bold text-ink">{jt(`about.${kind}`)}</legend>
                  {jobForm.property && (
                    <div className="grid gap-4 sm:grid-cols-6">
                      <Field label={jt("propertyTypeLabel")} error={err(errors.propertyType?.message)} className="sm:col-span-6" required>
                        {choice("propertyType", PROPERTY_TYPES, "grid-cols-3")}
                      </Field>
                      <Field label={t("common.fields.rooms")} error={err(errors.from?.rooms?.message)} className="sm:col-span-3" required>
                        <Controller
                          control={control}
                          name="from.rooms"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} invalid={!!errors.from?.rooms} placeholder="–" options={ROOMS.map((r) => ({ value: r, label: r }))} />
                          )}
                        />
                      </Field>
                      <Field label={jt("areaLabel")} hint={t("common.form.optional")} className="sm:col-span-3">
                        <Input type="number" inputMode="numeric" min={10} dir="ltr" placeholder="80" {...register("areaM2")} />
                      </Field>
                    </div>
                  )}
                  {jobForm.cleaningType && (
                    <Field label={jt("cleaningTypeLabel")} error={err(errors.cleaningType?.message)} required>
                      {choice("cleaningType", CLEANING_TYPES, "grid-cols-1 sm:grid-cols-3")}
                    </Field>
                  )}
                  {jobForm.instrument && (
                    <Field label={jt("instrumentLabel")} error={err(errors.instrument?.message)} required>
                      {choice("instrument", INSTRUMENTS, "grid-cols-3")}
                    </Field>
                  )}
                  {jobForm.items && (
                    <Field label={jt("itemsLabel")} error={err(errors.items?.message)} required>
                      {multi("items", DISPOSAL_ITEMS)}
                    </Field>
                  )}
                  {jobForm.amounts && (
                    <Field label={jt(`amountLabel.${kind}`)} error={err(errors.amount?.message)} required>
                      {choice("amount", jobForm.amounts, "grid-cols-2 sm:grid-cols-5")}
                    </Field>
                  )}
                  {(values.amount === "other" || (jobForm.items && values.items.includes("other"))) && (
                    <Field label={jt(`otherLabel.${kind}`)} error={err(errors.otherNote?.message)} required>
                      <Textarea {...register("otherNote")} rows={2} placeholder={jt(`otherPh.${kind}`)} aria-invalid={!!errors.otherNote} />
                    </Field>
                  )}
                  {jobForm.duration && (
                    <Field label={jt("durationLabel")} error={err(errors.duration?.message)} required>
                      <Controller
                        control={control}
                        name="duration"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} invalid={!!errors.duration} placeholder="–" options={DURATIONS.map((d) => ({ value: d, label: jt(`duration.${d}`) }))} />
                        )}
                      />
                    </Field>
                  )}
                </fieldset>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={jt(`date.${kind}`)} error={err(errors.executionDate?.message)} required>
                  <Input type="date" min="2026-10-19" {...register("executionDate")} aria-invalid={!!errors.executionDate} />
                </Field>
                {jobForm.cleaningDate ? (
                  <Field label={jt("cleaningDateLabel")} hint={jt("cleaningDateHint")} error={err(errors.cleaningDate?.message)} required>
                    <Input type="date" min={values.executionDate || "2026-10-19"} {...register("cleaningDate")} aria-invalid={!!errors.cleaningDate} />
                  </Field>
                ) : jobForm.flexible ? (
                  <Field label={jt("flexibleLabel")}>
                    <Controller
                      control={control}
                      name="flexibleDate"
                      render={({ field }) => (
                        <label className="flex h-10 items-center gap-3 rounded-lg border border-input bg-surface px-3 text-sm">
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                          {jt("flexibleHint")}
                        </label>
                      )}
                    />
                  </Field>
                ) : null}
              </div>

              <Field label={t("site.offerForm.offersCount")} hint={t("site.offerForm.quotaHint", { count: Number(values.offersWanted) })}>
                <Controller
                  control={control}
                  name="offersWanted"
                  render={({ field }) => (
                    <RadioCards
                      className="max-w-md grid-cols-5"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={Array.from({ length: maxOffers }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                    />
                  )}
                />
              </Field>
            </>
          )}

          <Field label={t("site.offerForm.details")} hint={t("common.form.optional")}>
            <Textarea {...register("details")} placeholder={t("site.offerForm.detailsPh")} rows={3} />
          </Field>

          <div className="flex flex-col-reverse items-center justify-between gap-3 border-t pt-5 sm:flex-row">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> {L(content.note)}
            </p>
            <Button type="button" size={isAdmin ? "default" : "lg"} onClick={next} className="w-full sm:w-auto">
              {t("common.actions.next")}
              <ArrowRight className="" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-5">
            {isAdmin ? (
              <p className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2/70 px-4 py-3 text-sm">
                {booking === "organization" ? <Building2 className="size-4 text-primary" /> : forOther ? <Users className="size-4 text-primary" /> : <User className="size-4 text-primary" />}
                <span className="text-muted-foreground">{t("site.booking.who")}</span>
                <span className="font-semibold text-ink">{t(`site.booking.${booking}`)}</span>
                <button type="button" onClick={() => setStep(1)} className="ms-auto font-semibold text-primary hover:underline">
                  {t("common.actions.edit")}
                </button>
              </p>
            ) : (
              whoField
            )}

            <p className="-mb-2 text-sm font-bold text-ink">{forOther ? t("site.booking.movingPerson") : bk("yourDetails")}</p>
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
              <Field
                label={t("common.fields.email")}
                error={err(errors.email?.message)}
                required={!forOther}
                hint={forOther ? t("site.booking.emailOptional") : undefined}
              >
                <Input type="email" dir="ltr" {...register("email", { onBlur: trackContact })} autoComplete={forOther ? "off" : "email"} aria-invalid={!!errors.email} />
              </Field>
              <Field label={t("common.fields.phone")} error={err(errors.phone?.message)} required>
                <Input type="tel" dir="ltr" placeholder="+41 79 123 45 67" {...register("phone", { onBlur: trackContact })} autoComplete="tel" aria-invalid={!!errors.phone} />
              </Field>
              <Field label={t("site.booking.address")} hint={t("site.booking.customerAddressHint")} error={err(errors.address?.message)} className="sm:col-span-2" required>
                <Input {...register("address")} placeholder={t("site.booking.addressPh")} autoComplete={forOther ? "off" : "street-address"} aria-invalid={!!errors.address} />
              </Field>
            </div>
            {booking === "organization" && (
              <fieldset className="grid gap-4 rounded-xl border border-border bg-surface-2/40 p-4 sm:grid-cols-2 sm:p-5">
                <legend className="px-1 text-sm font-bold text-ink">{t("site.booking.orgTitle")}</legend>
                <Field label={t("site.booking.orgName")} error={err(errors.orgName?.message)} required>
                  <Input {...register("orgName")} autoComplete="organization" aria-invalid={!!errors.orgName} />
                </Field>
                <Field label={t("site.booking.address")} error={err(errors.orgAddress?.message)} required>
                  <Input {...register("orgAddress")} placeholder={t("site.booking.addressPh")} autoComplete="street-address" aria-invalid={!!errors.orgAddress} />
                </Field>
              </fieldset>
            )}
            {forOther && (
              <fieldset className="grid gap-4 rounded-xl border border-border bg-surface-2/40 p-4 sm:grid-cols-2 sm:p-5">
                <legend className="px-1 text-sm font-bold text-ink">{booking === "organization" ? bk("contactTitle") : bk("requesterTitle")}</legend>
                <p className="-mt-1 text-xs text-muted-foreground sm:col-span-2">{bk("requesterHint")}</p>
                <Field label={t("common.fields.firstName")} error={err(errors.reqFirstName?.message)} required>
                  <Input {...register("reqFirstName")} autoComplete="given-name" aria-invalid={!!errors.reqFirstName} />
                </Field>
                <Field label={t("common.fields.lastName")} error={err(errors.reqLastName?.message)} required>
                  <Input {...register("reqLastName")} autoComplete="family-name" aria-invalid={!!errors.reqLastName} />
                </Field>
                <Field label={t("common.fields.email")} error={err(errors.reqEmail?.message)} required>
                  <Input type="email" dir="ltr" {...register("reqEmail")} autoComplete="email" aria-invalid={!!errors.reqEmail} />
                </Field>
                <Field label={t("common.fields.phone")} error={err(errors.reqPhone?.message)} required>
                  <Input type="tel" dir="ltr" placeholder="+41 79 123 45 67" {...register("reqPhone")} autoComplete="tel" aria-invalid={!!errors.reqPhone} />
                </Field>
                {booking === "other" && (
                  <Field label={t("site.booking.address")} error={err(errors.reqAddress?.message)} className="sm:col-span-2" required>
                    <Input {...register("reqAddress")} placeholder={t("site.booking.addressPh")} autoComplete="street-address" aria-invalid={!!errors.reqAddress} />
                  </Field>
                )}
              </fieldset>
            )}
            <div className="rounded-xl border border-primary/20 bg-primary-soft/50 p-4 text-sm">
              <p className="flex items-center gap-2 font-bold text-ink">
                <Lock className="size-4 text-primary" /> {bk("privacyTitle")}
              </p>
              <ul className="mt-2 list-disc space-y-1 ps-6 text-foreground/85">
                <li>{t("site.booking.privacy1")}</li>
                <li>{t("site.booking.privacy2", { count: Number(values.offersWanted) })}</li>
                <li>{t("site.booking.privacy3")}</li>
              </ul>
            </div>
            <Controller
              control={control}
              name="privacy"
              render={({ field }) => (
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true ? true : undefined)} className="mt-0.5" aria-invalid={!!errors.privacy} />
                  <span className={cn(errors.privacy && "text-danger")}>
                    {isAdmin ? t("site.booking.privacyAgreeAdmin") : t("site.offerForm.privacyAgree")}{" "}
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
                <dt className="text-muted-foreground">{jt(`from.${kind}`)}</dt>
                <dd className="text-end font-semibold">{values.from.zip} {values.from.city}</dd>
              </div>
              {jobForm.to && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{jt(`to.${kind}`)}</dt>
                  <dd className="text-end font-semibold">{values.to.zip} {values.to.city}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{jt(`date.${kind}`)}</dt>
                <dd className="text-end font-semibold" dir="ltr">{values.executionDate || "–"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("site.offerForm.companiesShort")}</dt>
                <dd className="font-semibold">{values.offersWanted}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("site.booking.who")}</dt>
                <dd className="text-end font-semibold">{t(`site.booking.${booking}`)}</dd>
              </div>
            </dl>
            {svc && svc.estimate.to > 0 && (
              <div className="mt-4 border-t pt-3">
                <p className="text-muted-foreground">{t("site.estimate.title")}</p>
                <p className="font-bold text-ink tabular-nums">{priceRange(svc, lang)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("site.estimate.short")}</p>
              </div>
            )}
          </aside>

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between lg:col-span-2">
            <Button type="button" variant={isAdmin ? "outline" : "ghost"} onClick={() => setStep(1)}>
              <ArrowLeft className="" />
              {t("common.actions.back")}
            </Button>
            {/* the dashboard uses its standard primary button; the website keeps its large orange call to action */}
            <Button type="submit" variant={isAdmin ? "default" : "accent"} size={isAdmin ? "default" : "lg"} loading={formState.isSubmitting}>
              {formState.isSubmitting ? t("site.offerForm.sending") : isAdmin ? t("admin.leads.form.submit") : t("site.offerForm.submit")}
            </Button>
          </div>
        </div>
      )}
    </form>,
  );
}
