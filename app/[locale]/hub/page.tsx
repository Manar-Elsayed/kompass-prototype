"use client";

import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FileSignature,
  Globe,
  LayoutDashboard,
  MessageSquareWarning,
  PenLine,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/bits";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";

type Actor = "customer" | "staff" | "partner";

export default function HubPage() {
  const t = useTranslations("hub");
  const offers = useStore((s) => s.offers.length);
  const partners = useStore((s) => s.partners.filter((p) => p.status === "approved").length);
  const orders = useStore((s) => s.orders.length);
  const reviews = useStore((s) => s.reviews.length);

  const actor: Record<Actor, { label: string; icon: React.ReactNode; cls: string }> = {
    customer: { label: t("customer"), icon: <UserRound className="size-4" />, cls: "bg-accent-soft text-accent" },
    staff: { label: t("staff"), icon: <ShieldCheck className="size-4" />, cls: "bg-primary text-white" },
    partner: { label: t("partner"), icon: <Building2 className="size-4" />, cls: "bg-success-soft text-success" },
  };

  const flows: { from: Actor; entity: string; icon: React.ReactNode; to: Actor; where: string }[] = [
    { from: "customer", entity: t("f1"), icon: <ClipboardList />, to: "staff", where: "/admin/leads" },
    { from: "staff", entity: t("f2"), icon: <ShoppingCart />, to: "partner", where: "/admin/leads/shop" },
    { from: "partner", entity: t("f3"), icon: <FileSignature />, to: "staff", where: "/admin/partners/applications" },
    { from: "partner", entity: t("f4"), icon: <Receipt />, to: "staff", where: "/admin/finance/partner-dues" },
    { from: "partner", entity: t("f5"), icon: <MessageSquareWarning />, to: "staff", where: "/admin/leads/fake-reports" },
    { from: "customer", entity: t("f6"), icon: <Star />, to: "staff", where: "/admin/moderation/partner-reviews" },
    { from: "staff", entity: t("f7"), icon: <PenLine />, to: "customer", where: "/admin/cms" },
  ];

  const scenarios = [
    { n: 1, title: t("s1"), steps: [[t("s1a"), "/#offer-form"], [t("s1b"), "/admin/leads"], [t("s1c"), "/admin"]] },
    { n: 2, title: t("s2"), steps: [[t("s2a"), "/partner/register"], [t("s2b"), "/admin/partners/applications"], [t("s2c"), "/companies"]] },
    { n: 3, title: t("s3"), steps: [[t("s3a"), "/admin/cms/home"], [t("s3b"), "/"], [t("s3c"), "/admin/cms/blog/new"]] },
    { n: 4, title: t("s4"), steps: [[t("s4a"), "/admin/finance/partner-dues"], [t("s4b"), "/admin/leads/fake-reports"], [t("s4c"), "/admin/moderation/kompass-reviews"]] },
    { n: 5, title: t("s5"), steps: [[t("s5a"), "/admin"], [t("s5b"), "/admin/settings/roles"], [t("s5c"), "/admin/settings/configuration"]] },
    { n: 6, title: t("s6"), steps: [[t("s6a"), "/portal/shop"], [t("s6b"), "/portal/payments"], [t("s6c"), "/portal/leads"]] },
  ] as const;

  const refactor = [1, 2, 3, 4, 5, 6] as const;

  return (
    <div className="min-h-dvh bg-background">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <Badge tone="accent">Prototype</Badge>
          <LocaleSwitcher />
        </div>
      </header>

      {/* hero */}
      <section className="container-page pb-12 pt-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-white sm:px-12">
          <div className="pointer-events-none absolute -top-32 end-[-5%] size-[520px] rounded-full bg-primary/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 start-[10%] size-[380px] rounded-full bg-accent/25 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="mb-4 text-sm font-bold text-accent">{t("eyebrow")}</p>
            <h1 className="text-balance text-4xl font-extrabold leading-tight sm:text-5xl">{t("title")}</h1>
            <p className="mt-5 max-w-2xl text-lg text-white/75">{t("body")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg"><Link href="/"><Globe /> {t("openSite")}</Link></Button>
              <Button asChild size="lg" className="bg-white/10 text-white hover:bg-white/20"><Link href="/admin"><LayoutDashboard /> {t("openAdmin")}</Link></Button>
              <Button asChild size="lg" className="bg-white/10 text-white hover:bg-white/20"><Link href="/portal"><Store /> {t("openPortal")}</Link></Button>
            </div>
          </div>
          <dl className="relative mt-12 grid max-w-2xl grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">
            {[[t("leads"), offers], [t("partners"), partners], [t("orders"), orders], [t("reviews"), reviews]].map(([k, v]) => (
              <div key={String(k)}>
                <dd className="text-3xl font-extrabold">{v}</dd>
                <dt className="text-sm text-white/60">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">{t("resetHint")}</p>
      </section>

      {/* surfaces */}
      <section className="container-page pb-14">
        <h2 className="mb-5 text-xl font-bold text-ink">{t("surfaces")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { href: "/", icon: Globe, title: t("website"), body: t("websiteBody"), tone: "bg-accent-soft text-accent" },
            { href: "/admin", icon: LayoutDashboard, title: t("admin"), body: t("adminBody"), tone: "bg-primary-soft text-primary" },
            { href: "/portal", icon: Store, title: t("portal"), body: t("portalBody"), tone: "bg-success-soft text-success" },
          ].map(({ href, icon: I, title, body, tone }) => {
            const inner = (
              <div className={cn("group flex h-full flex-col rounded-2xl border bg-surface p-6 transition", href ? "hover:border-primary/30 hover:shadow-pop" : "border-dashed")}>
                <span className={cn("mb-4 flex size-12 items-center justify-center rounded-xl", tone)}><I className="size-6" /></span>
                <h3 className="flex items-center gap-2 text-lg font-bold text-ink">{title} {!href && <Badge>{t("next")}</Badge>}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{body}</p>
                {href && <ArrowRight className="mt-4 size-5 text-primary transition group-hover:translate-x-1 flip-rtl" />}
              </div>
            );
            return href ? <Link key={title} href={href}>{inner}</Link> : <div key={title}>{inner}</div>;
          })}
        </div>
      </section>

      {/* ecosystem map */}
      <section className="container-page pb-14">
        <h2 className="text-xl font-bold text-ink">{t("map")}</h2>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">{t("mapSub")}</p>
        <div className="overflow-hidden rounded-2xl border bg-surface">
          <div className="hidden grid-cols-[1fr_1.4fr_1fr] gap-4 border-b bg-surface-2/60 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid">
            <span>{t("from")}</span><span className="text-center">{t("data")}</span><span className="text-end">{t("to")}</span>
          </div>
          <ul className="divide-y">
            {flows.map((f, i) => (
              <li key={i}>
                <Link href={f.where} className="grid items-center gap-3 px-5 py-4 transition hover:bg-surface-2/60 md:grid-cols-[1fr_1.4fr_1fr]">
                  <span className={cn("inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold", actor[f.from].cls)}>{actor[f.from].icon}{actor[f.from].label}</span>
                  <span className="flex items-center gap-3 md:justify-center">
                    <span className="hidden h-px flex-1 bg-border md:block" />
                    <span className="inline-flex items-center gap-2 rounded-xl border bg-surface px-3 py-2 text-sm font-semibold text-ink shadow-sm [&_svg]:size-4 [&_svg]:text-primary" >{f.icon}{f.entity}</span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground flip-rtl" />
                    <span className="hidden h-px flex-1 bg-border md:block" />
                  </span>
                  <span className={cn("inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold md:ms-auto", actor[f.to].cls)}>{actor[f.to].icon}{actor[f.to].label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* scenarios */}
      <section className="container-page pb-14">
        <h2 className="text-xl font-bold text-ink">{t("scenarios")}</h2>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">{t("scenariosSub")}</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scenarios.map((s) => (
            <article key={s.n} className="rounded-2xl border bg-surface p-5">
              <p className="flex items-center gap-2 font-bold text-ink">
                <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-sm text-white">{s.n}</span>
                {s.title}
              </p>
              <ol className="mt-4 space-y-2">
                {s.steps.map(([label, href], i) => (
                  <li key={i}>
                    <Link href={href} className="group flex items-start gap-3 rounded-lg p-2 text-sm transition hover:bg-primary-soft">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold text-muted-foreground group-hover:border-primary group-hover:text-primary">{i + 1}</span>
                      <span className="flex-1 font-medium">{label}</span>
                      <ArrowRight className="mt-0.5 size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100 flip-rtl" />
                    </Link>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      {/* refactor */}
      <section className="container-page pb-24">
        <h2 className="mb-5 text-xl font-bold text-ink">{t("refactor")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {refactor.map((n) => (
            <div key={n} className="rounded-2xl bg-surface p-5 ring-1 ring-border">
              <p className="font-bold text-ink">{t(`r${n}t`)}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(`r${n}b`)}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Users className="size-4" /> Kompass · UI/UX refactor</p>
      </section>
    </div>
  );
}
