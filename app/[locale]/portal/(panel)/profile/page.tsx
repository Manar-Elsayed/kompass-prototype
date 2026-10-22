"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Award, ExternalLink, ImagePlus, Info, Lock, MessageSquarePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useCompanyMedia, useCurrentPartner, useL } from "@/lib/mock/hooks";
import { CANTONS, documentState, partnerCantons, partnerRegions } from "@/lib/mock/selectors";
import { mock } from "@/lib/mock/api";
import { downscaleImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { CompanyFile, NotifyPrefs } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, Switch } from "@/components/ui/controls";
import { Tabs, TabsContent, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@/components/shared/icon";
import { useConfirm } from "@/components/shared/bits";
import { DL, PageHeader } from "@/components/admin/ui";
import { CompanyDocuments } from "@/components/admin/company-docs";
import { DocStateBadge } from "@/components/admin/doc-state";
import { useCompose } from "@/components/portal/compose";

const TABS = ["company", "documents", "media", "area", "notifications"] as const;
type Tab = (typeof TABS)[number];
const MAX_PHOTOS = 8;
const DEFAULT_PREFS: NotifyPrefs = { leads: true, digest: false, finance: true, messages: true };

export default function PartnerProfilePage() {
  return (
    <Suspense>
      <PartnerProfile />
    </Suspense>
  );
}

/**
 * The company sees all its data but may change only its phone number, its photos and logo, where it
 * works and which emails it gets; every other change goes to Kompass as a message ("Request a
 * change"). Documents can be re-uploaded and wait for Kompass to check them.
 */
function PartnerProfile() {
  const t = useTranslations("portal.profile");
  const tsh = useTranslations("portal.shell");
  const ta = useTranslations("admin.partners");
  const params = useSearchParams();
  const partner = useCurrentPartner()!;
  const { compose, dialog } = useCompose();
  const [tab, setTab] = useState<Tab>("company");
  const wanted = params.get("tab");
  useEffect(() => {
    if (wanted && (TABS as readonly string[]).includes(wanted)) setTab(wanted as Tab);
  }, [wanted]);

  const requestChange = () => compose({ topic: "profile", subject: t("requestSubject"), hint: t("requestHint"), body: "" });

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Button asChild variant="outline"><Link href={`/companies/${partner.id}`} target="_blank"><ExternalLink /> {tsh("viewProfile")}</Link></Button>
            <Button variant="outline" onClick={requestChange}><MessageSquarePlus /> {t("requestChange")}</Button>
          </>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <UnderlineTabsList className="mb-4 overflow-x-auto">
          <UnderlineTabsTrigger value="company">{t("tabs.company")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="documents">{ta("docs.title")} {!documentState(partner).ok && <DocStateBadge partner={partner} />}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="media">{t("tabs.media")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="area">{t("tabs.area")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="notifications">{t("tabs.notifications")}</UnderlineTabsTrigger>
        </UnderlineTabsList>
        <TabsContent value="company"><CompanyTab onRequest={requestChange} /></TabsContent>
        <TabsContent value="documents">
          <Card className="max-w-3xl">
            <CardHeader title={ta("docs.title")} description={t("docsHint")} />
            <CardBody>
              <CompanyDocuments partner={partner} as="company" />
            </CardBody>
          </Card>
        </TabsContent>
        <TabsContent value="media"><MediaTab /></TabsContent>
        <TabsContent value="area"><AreaTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
      </Tabs>
      {dialog}
    </>
  );
}

function CompanyTab({ onRequest }: { onRequest: () => void }) {
  const t = useTranslations("portal.profile");
  const tf = useTranslations("common.fields");
  const tp = useTranslations("site.partner");
  const ta = useTranslations("admin.partners");
  const tc = useTranslations("common");
  const L = useL();
  const partner = useCurrentPartner()!;
  const services = useStore((s) => s.services);
  const patch = useStore((s) => s.patch);
  const [phone, setPhone] = useState(partner.phone);
  const [busy, setBusy] = useState(false);
  const dirty = phone.trim() !== partner.phone;

  const save = async () => {
    setBusy(true);
    await mock(() => patch("partners", partner.id, { phone: phone.trim() }));
    setBusy(false);
    toast.success(t("saved"));
  };

  const ro = (label: string, value: string, wide = false) => (
    <Field label={label} className={wide ? "sm:col-span-2" : undefined}>
      <Input value={value} readOnly tabIndex={-1} className="bg-surface-2 text-muted-foreground" />
    </Field>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
      <Card>
        <CardHeader title={t("public")} />
        <CardBody>
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <span>
              {t("readOnly")}{" "}
              <button className="font-semibold text-primary hover:underline" onClick={onRequest}>{t("requestChange")}</button>
            </span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ro(tp("companyName"), partner.name)}
            {ro(tp("regNumber"), partner.regNumber)}
            <Field label={tf("phone")} hint={t("phoneHint")}>
              <div className="flex gap-2">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                {dirty && <Button onClick={save} loading={busy} className="shrink-0">{tc("actions.save")}</Button>}
              </div>
            </Field>
            {ro(tf("mobile"), partner.mobile)}
            {ro(tf("email"), partner.email)}
            {ro(tf("website"), partner.website)}
            {ro(tf("street"), partner.address, true)}
            {ro(tf("zip"), partner.zip)}
            {ro(tf("city"), partner.city)}
            <Field label={tp("about")} className="sm:col-span-2">
              <Textarea value={L(partner.about)} readOnly tabIndex={-1} rows={3} className="bg-surface-2 text-muted-foreground" />
            </Field>
          </div>
        </CardBody>
      </Card>
      <div className="space-y-4">
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
        <Card>
          <CardHeader title={ta("bank")} description={t("bankHint")} />
          <CardBody>
            <DL cols={1} items={[{ label: tp("bankName"), value: partner.bank.name }, { label: tp("bankOwner"), value: partner.bank.owner }, { label: "IBAN", value: partner.bank.iban, ltr: true }]} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/** Logo and photos shown on the public company page; images are scaled down before they are kept. */
function MediaTab() {
  const t = useTranslations("portal.profile.media");
  const partner = useCurrentPartner()!;
  const files = useStore((s) => s.files);
  const add = useStore((s) => s.add);
  const remove = useStore((s) => s.remove);
  const { logo, photos } = useCompanyMedia(partner.id);
  const { confirm, dialog } = useConfirm();
  const logoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"logo" | "photo" | null>(null);

  const nextId = () => `F-${String(Math.max(0, ...files.map((x) => Number(x.id.replace(/\D/g, "")) || 0)) + 1).padStart(4, "0")}`;
  const upload = async (file: File, category: "logo" | "photo") => {
    if (!file.type.startsWith("image/")) return toast.error(t("notImage"));
    if (file.size > 8_000_000) return toast.error(t("tooBig"));
    setBusy(category);
    try {
      const img = await downscaleImage(file, category === "logo" ? 400 : 1200);
      // a new logo replaces the company's previous one; Kompass-added files stay
      if (category === "logo") files.filter((f) => f.partnerId === partner.id && f.category === "logo" && f.uploadedBy === "company").forEach((f) => remove("files", f.id));
      add("files", { id: nextId(), partnerId: partner.id, name: file.name, category, url: img.url, size: img.size, uploadedBy: "company", uploadedAt: new Date().toISOString() });
      toast.success(t(category === "logo" ? "logoSaved" : "photoAdded"));
    } catch {
      toast.error(t("notImage"));
    } finally {
      setBusy(null);
    }
  };
  const del = (f: CompanyFile) =>
    confirm({
      title: t("deleteTitle"),
      body: t("deleteBody"),
      tone: "danger",
      onConfirm: () => {
        remove("files", f.id);
        toast.success(t("deleted"));
      },
    });

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardHeader title={t("logo")} description={t("logoHint")} />
        <CardBody className="flex items-center gap-4">
          <Avatar name={partner.name} src={logo?.url} square className="size-24 text-2xl" />
          <div className="space-y-2">
            <Button variant="outline" size="sm" loading={busy === "logo"} onClick={() => logoInput.current?.click()}>
              <Upload /> {logo ? t("replaceLogo") : t("uploadLogo")}
            </Button>
            {logo?.uploadedBy === "admin" && <p className="text-xs text-muted-foreground">{t("byKompass")}</p>}
            <p className="text-xs text-muted-foreground">{t("formats")}</p>
          </div>
          <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, "logo"); }} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title={t("photos", { count: photos.length, max: MAX_PHOTOS })}
          description={t("photosHint")}
          action={
            <Button size="sm" variant="outline" disabled={photos.length >= MAX_PHOTOS} loading={busy === "photo"} onClick={() => photoInput.current?.click()}>
              <ImagePlus /> {t("addPhoto")}
            </Button>
          }
        />
        <CardBody>
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, "photo"); }} />
          {photos.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <li key={p.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URLs from uploads */}
                  <img src={p.url} alt={p.name} className="size-full object-cover" />
                  {p.uploadedBy === "admin" ? (
                    <span className="absolute inset-x-0 bottom-0 bg-ink/70 px-2 py-1 text-[11px] text-white">{t("byKompass")}</span>
                  ) : (
                    <Button variant="danger" size="icon-sm" className="absolute end-2 top-2 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100" onClick={() => del(p)} aria-label={t("deleteTitle")}>
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <button onClick={() => photoInput.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-primary">
              <ImagePlus className="size-6" /> {t("emptyPhotos")}
            </button>
          )}
        </CardBody>
      </Card>
      {dialog}
    </div>
  );
}

/** Where the company works; the shop shows leads there first. Read-only: where Kompass recommends it. */
function AreaTab() {
  const t = useTranslations("portal.profile.area");
  const partner = useCurrentPartner()!;
  const patch = useStore((s) => s.patch);
  const nominations = useStore((s) => s.nominations);
  const [selected, setSelected] = useState<string[]>(partnerCantons(partner));
  const regions = partnerRegions({ nominations }, partner.id);
  const saved = partnerCantons(partner);
  const dirty = selected.length !== saved.length || selected.some((c) => !saved.includes(c));
  const toggle = (c: string) => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c].sort()));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader
          title={t("title")}
          description={t("hint")}
          action={
            <Button
              size="sm"
              disabled={!dirty || !selected.length}
              onClick={() => {
                patch("partners", partner.id, { cantons: selected });
                toast.success(t("saved"));
              }}
            >
              {t("save")}
            </Button>
          }
        />
        <CardBody>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
            {Object.entries(CANTONS).map(([code, name]) => {
              const on = selected.includes(code);
              return (
                <li key={code}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(code)}
                    className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm transition", on ? "border-primary bg-primary-soft/60 text-ink" : "hover:border-primary/40")}
                  >
                    <span className={cn("w-7 shrink-0 font-mono text-xs font-bold", on ? "text-primary" : "text-muted-foreground")}>{code}</span>
                    <span className="truncate">{name}</span>
                    {code === partner.canton && <Badge tone="neutral" className="ms-auto px-1.5 py-0 text-[10px]">{t("home")}</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>
          {!selected.length && <p className="mt-3 text-sm text-danger">{t("pickOne")}</p>}
        </CardBody>
      </Card>
      <Card className="h-fit">
        <CardHeader title={t("recommended")} description={t("recommendedHint")} />
        <CardBody>
          {regions.length ? (
            <ul className="space-y-2">
              {regions.map((r) => (
                <li key={r.canton} className="flex items-center gap-3 rounded-lg bg-success-soft/50 px-3 py-2 text-sm">
                  <Award className="size-4 text-success" />
                  <span className="flex-1 font-semibold text-ink">{CANTONS[r.canton] ?? r.canton}</span>
                  <Badge tone="success">{t("rank", { rank: r.rank, of: r.of })}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("notRecommended")}</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const t = useTranslations("portal.profile.notifications");
  const partner = useCurrentPartner()!;
  const patch = useStore((s) => s.patch);
  const prefs = partner.notifyPrefs ?? DEFAULT_PREFS;
  const set = (k: keyof NotifyPrefs, v: boolean) => {
    patch("partners", partner.id, { notifyPrefs: { ...prefs, [k]: v } });
    toast.success(t("saved"));
  };
  return (
    <Card className="max-w-2xl">
      <CardHeader title={t("title")} description={t("hint", { email: partner.email })} />
      <CardBody>
        <ul className="divide-y">
          {(Object.keys(DEFAULT_PREFS) as (keyof NotifyPrefs)[]).map((k) => (
            <li key={k} className="flex items-start gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t(`${k}.title`)}</p>
                <p className="text-xs text-muted-foreground">{t(`${k}.body`)}</p>
              </div>
              <Switch checked={prefs[k]} disabled={k === "digest" && !prefs.leads} onCheckedChange={(v) => set(k, v)} aria-label={t(`${k}.title`)} />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">{t("always")}</p>
      </CardBody>
    </Card>
  );
}
