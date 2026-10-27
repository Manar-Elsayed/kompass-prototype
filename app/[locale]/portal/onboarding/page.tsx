"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Clock, FileSignature, FileText, ImagePlus, LogOut, MapPin, MessageSquare, PenLine, RotateCcw, ShieldCheck, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useHydrated, useL, useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import type { Partner } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Logo, StatusBadge } from "@/components/shared/bits";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { CompanyDocuments } from "@/components/admin/company-docs";
import { useCompose } from "@/components/portal/compose";

type StepState = "done" | "current" | "upcoming";

/**
 * Where an applicant stands: application received → contract signed → documents uploaded →
 * Kompass approval. Approved companies get a welcome screen with first steps; declined ones see why.
 */
export default function OnboardingPage() {
  const t = useTranslations("portal.onboarding");
  const ts = useTranslations("portal.shell");
  const hydrated = useHydrated();
  const router = useRouter();
  const partner = useCurrentPartner();
  const session = useStore((s) => s.partnerSession);
  const logout = useStore((s) => s.partnerLogout);

  useEffect(() => {
    if (hydrated && (!session || !partner)) router.replace("/portal/login");
  }, [hydrated, session, partner, router]);

  if (!hydrated || !partner) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/"><Logo className="h-6" /></Link>
          <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{t("badge")}</span>
          <div className="ms-auto flex items-center gap-1">
            <LocaleSwitcher />
            <Button variant="ghost" size="sm" onClick={() => { logout(); router.replace("/portal/login"); }}>
              <LogOut /> <span className="hidden sm:inline">{ts("logout")}</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        {partner.status === "approved" ? <Welcome partner={partner} /> : partner.status === "rejected" ? <Declined partner={partner} /> : <Progress partner={partner} />}
      </main>
    </div>
  );
}

function Progress({ partner }: { partner: Partner }) {
  const t = useTranslations("portal.onboarding");
  const lang = useLang();
  const { compose, dialog } = useCompose();
  const signed = !!partner.contractSignedAt;
  const docsUploaded = (["insurance", "register"] as const).every((k) => partner.documents[k] && partner.documents[k]!.status !== "rejected");
  const docsRejected = (["insurance", "register"] as const).some((k) => partner.documents[k]?.status === "rejected");

  const contract: StepState = signed ? "done" : partner.status === "contract_sent" ? "current" : "upcoming";
  const docs: StepState = docsUploaded ? "done" : "current";
  const review: StepState = signed && docsUploaded ? "current" : "upcoming";
  const done = 1 + Number(contract === "done") + Number(docs === "done");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t("title", { name: partner.name })}</h1>
            <StatusBadge status={partner.status} />
          </div>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(done / 4) * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{t("progress", { done, total: 4 })}</span>
          </div>
        </div>

        <ol className="space-y-0">
          <Step n={1} state="done" title={t("steps.received")} last={false}>
            <p className="text-sm text-muted-foreground">{t("receivedBody", { date: formatDate(partner.createdAt, lang) })}</p>
          </Step>

          <Step n={2} state={contract} title={t("steps.contract")} last={false}>
            {contract === "upcoming" && <p className="text-sm text-muted-foreground">{t("contractWaiting")}</p>}
            {contract === "current" && <ContractSigner partner={partner} />}
            {contract === "done" && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSignature className="size-4 text-success" />
                {t("signedBy", { name: partner.contractSignedBy ?? partner.ownerName, date: formatDateTime(partner.contractSignedAt!, lang) })}
                {partner.contractVersion && <span className="font-mono text-xs" dir="ltr">· {partner.contractVersion}</span>}
              </p>
            )}
          </Step>

          <Step n={3} state={docs} title={t("steps.documents")} last={false}>
            <p className="mb-3 text-sm text-muted-foreground">{docsRejected ? t("docsRejected") : t("docsBody")}</p>
            <CompanyDocuments partner={partner} as="company" keys={["insurance", "register"]} onboarding />
          </Step>

          <Step n={4} state={review} title={t("steps.review")} badge={review === "current" ? t("state.review") : undefined} last>
            <p className="text-sm text-muted-foreground">{review === "current" ? t("reviewBody") : t("reviewWaiting")}</p>
          </Step>
        </ol>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader title={t("nextTitle")} />
          <CardBody className="space-y-3 pt-3 text-sm">
            {[
              { icon: ShieldCheck, text: t("next1") },
              { icon: Wallet, text: t("next2") },
              { icon: MapPin, text: t("next3") },
            ].map(({ icon: I, text }) => (
              <p key={text} className="flex gap-2.5 text-muted-foreground">
                <I className="mt-0.5 size-4 shrink-0 text-primary" /> {text}
              </p>
            ))}
          </CardBody>
        </Card>
        <Summary partner={partner} />
        <Card>
          <CardBody className="text-sm">
            <p className="font-semibold text-ink">{t("questions")}</p>
            <p className="mt-1 text-muted-foreground">{t("questionsBody")}</p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => compose({ topic: "general", subject: t("questionSubject") })}>
              <MessageSquare /> {t("contact")}
            </Button>
          </CardBody>
        </Card>
      </aside>
      {dialog}
    </div>
  );
}

function Step({ n, state, title, badge, last, children }: { n: number; state: StepState; title: string; badge?: string; last: boolean; children: React.ReactNode }) {
  const t = useTranslations("portal.onboarding");
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!last && <span className={cn("absolute start-[17px] top-10 h-[calc(100%-36px)] w-0.5", state === "done" ? "bg-success" : "bg-border")} aria-hidden />}
      <span
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          state === "done" ? "bg-success text-white" : state === "current" ? "bg-primary-soft text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {state === "done" ? <Check className="size-4" strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-1.5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className={cn("font-bold", state === "upcoming" ? "text-muted-foreground" : "text-ink")}>{title}</h2>
          <Badge tone={state === "done" ? "success" : badge ? "info" : state === "current" ? "primary" : "neutral"}>{badge ?? t(`state.${state}`)}</Badge>
        </div>
        {children}
      </div>
    </li>
  );
}

/** The partnership contract filled in with the company's details; signed by typing the full name. */
function ContractSigner({ partner }: { partner: Partner }) {
  const t = useTranslations("portal.onboarding");
  const tc = useTranslations("portal.onboarding.contract");
  const config = useStore((s) => s.config);
  const sign = useStore((s) => s.signContract);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [read, setRead] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const values = { company: partner.name, owner: partner.ownerName, address: `${partner.address}, ${partner.zip} ${partner.city}`, reg: partner.regNumber, vat: config.vatRate, days: config.leadExpiryDays };
  const sections = ["parties", "scope", "leads", "payment", "documents", "conduct", "termination"] as const;
  const valid = read && agree && name.trim().length >= 3;

  const onScroll = () => {
    const el = box.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setRead(true);
  };

  const submit = async () => {
    setBusy(true);
    await mock(() => sign(partner.id, name), 600);
    setBusy(false);
    toast.success(t("signedToast"));
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-surface-2 px-4 py-2.5 text-sm">
        <FileText className="size-4 text-primary" />
        <span className="font-semibold text-ink">{tc("title")}</span>
        <span className="ms-auto font-mono text-xs text-muted-foreground" dir="ltr">{config.contractTemplate}</span>
      </div>
      <div ref={box} onScroll={onScroll} className="max-h-72 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-relaxed" tabIndex={0} aria-label={tc("title")}>
        {sections.map((s, i) => (
          <section key={s}>
            <h3 className="font-bold text-ink">{i + 1}. {tc(`${s}.title`)}</h3>
            <p className="mt-1 text-muted-foreground">{tc(`${s}.body`, values)}</p>
          </section>
        ))}
      </div>
      <div className="space-y-4 border-t p-4">
        {!read && <p className="flex items-center gap-2 text-xs font-medium text-info"><Clock className="size-3.5" /> {t("scrollToRead")}</p>}
        <label className={cn("flex items-start gap-2.5 text-sm", !read && "opacity-50")}>
          <Checkbox checked={agree} disabled={!read} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
          <span>{t("agree", { company: partner.name })}</span>
        </label>
        <Field label={t("signature")} hint={t("signatureHint", { owner: partner.ownerName })} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={partner.ownerName} className="font-serif text-lg italic" disabled={!read} />
        </Field>
        <Button onClick={submit} disabled={!valid} loading={busy} className="w-full sm:w-auto">
          <PenLine /> {t("sign")}
        </Button>
      </div>
    </Card>
  );
}

function Summary({ partner }: { partner: Partner }) {
  const t = useTranslations("portal.onboarding");
  const tf = useTranslations("common.fields");
  const services = useStore((s) => s.services);
  const L = useL();
  const rows = [
    [tf("company"), partner.name],
    [t("owner"), partner.ownerName],
    [tf("email"), partner.email],
    [tf("phone"), partner.phone],
    [tf("address"), `${partner.address}, ${partner.zip} ${partner.city}`],
    [t("regNumber"), partner.regNumber],
  ];
  return (
    <Card>
      <CardHeader title={t("summary")} />
      <CardBody className="pt-3">
        <dl className="space-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="break-words font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {partner.serviceIds.map((id) => {
            const s = services.find((x) => x.id === id);
            return s ? <Badge key={id} tone="outline">{L(s.name)}</Badge> : null;
          })}
        </div>
      </CardBody>
    </Card>
  );
}

function Declined({ partner }: { partner: Partner }) {
  const t = useTranslations("portal.onboarding");
  const { compose, dialog } = useCompose();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 bg-danger-soft px-6 py-4 text-danger">
          <XCircle className="size-6 shrink-0" />
          <div>
            <h1 className="text-lg font-bold">{t("declinedTitle")}</h1>
            <p className="text-sm opacity-90">{t("declinedSubtitle", { name: partner.name })}</p>
          </div>
        </div>
        <CardBody>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("reason")}</p>
          <p className="mt-1 text-ink">{partner.rejectionReason ?? t("noReason")}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => compose({ topic: "general", subject: t("appealSubject"), openThread: false })}>
              <MessageSquare /> {t("contact")}
            </Button>
            <Button asChild variant="outline">
              <Link href="/partner/register"><RotateCcw /> {t("applyAgain")}</Link>
            </Button>
          </div>
        </CardBody>
      </Card>
      <Summary partner={partner} />
      {dialog}
    </div>
  );
}

function Welcome({ partner }: { partner: Partner }) {
  const t = useTranslations("portal.onboarding");
  const first = [
    { icon: Wallet, title: t("first.topUp"), body: t("first.topUpBody"), href: "/portal/payments" },
    { icon: MapPin, title: t("first.area"), body: t("first.areaBody"), href: "/portal/profile?tab=area" },
    { icon: ImagePlus, title: t("first.logo"), body: t("first.logoBody"), href: "/portal/profile?tab=media" },
  ];
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-success-soft">
        <ShieldCheck className="size-9 text-success" />
      </div>
      <h1 className="text-3xl font-bold text-ink">{t("welcomeTitle", { name: partner.name })}</h1>
      <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{t("welcomeBody")}</p>
      <div className="mt-10 grid gap-3 text-start sm:grid-cols-3">
        {first.map(({ icon: I, title, body, href }, i) => (
          <Link key={href} href={href} className="group rounded-2xl border bg-surface p-5 shadow-card transition hover:border-primary/40">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><I className="size-5" /></span>
            <p className="mt-4 text-xs font-semibold text-muted-foreground">{t("firstStep", { n: i + 1 })}</p>
            <p className="font-bold text-ink">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </Link>
        ))}
      </div>
      <Button asChild size="lg" className="mt-10">
        <Link href="/portal">{t("goToPortal")} <ArrowRight /></Link>
      </Button>
    </div>
  );
}
