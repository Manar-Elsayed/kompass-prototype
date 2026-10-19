"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, FlaskConical, Search, ShieldOff, Star } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { cn, formatCHF } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useHydrated, useLang, usePartnerRatings } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar } from "@/components/ui/controls";
import { Logo } from "@/components/shared/bits";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";

export default function PortalLogin() {
  const t = useTranslations("portal.login");
  const tf = useTranslations("common.fields");
  const ts = useTranslations("portal.shell");
  const lang = useLang();
  const router = useRouter();
  const hydrated = useHydrated();
  const partners = useStore((s) => s.partners).filter((p) => p.status === "approved");
  const session = useStore((s) => s.partnerSession);
  const partnerLogin = useStore((s) => s.partnerLogin);
  const ratings = usePartnerRatings();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(partners[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const partner = partners.find((p) => p.id === selected);

  useEffect(() => {
    if (hydrated && session) router.replace("/portal");
  }, [hydrated, session, router]);

  const term = q.trim().toLowerCase();
  const list = partners.filter((p) => !term || p.name.toLowerCase().includes(term) || p.city.toLowerCase().includes(term));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;
    setBusy(true);
    await mock(() => partnerLogin(partner.id), 700);
    toast.success(partner.name);
    router.replace("/portal");
  };

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <LocaleSwitcher />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <p className="mb-2 inline-flex w-fit rounded-md bg-success-soft px-2 py-0.5 text-xs font-bold text-success">{ts("badge")}</p>
          <h1 className="text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

          <form onSubmit={submit} className="mt-8 grid gap-5">
            <Field label={tf("email")}>
              <Input value={partner?.email ?? ""} readOnly dir="ltr" />
            </Field>
            <Field label={tf("password")}>
              <Input type="password" defaultValue="prototype" dir="ltr" />
            </Field>
            <Button type="submit" size="lg" loading={busy} disabled={!partner}>
              {t("submit")} <ArrowRight className="" />
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-accent/40 bg-accent-soft/40 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <FlaskConical className="size-4 text-accent" /> {t("pick")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("pickHint")}</p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-9 ps-9" />
            </div>
            <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto pe-1">
              {list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-surface px-3 py-2 text-start transition",
                    selected === p.id ? "border-primary ring-1 ring-primary" : "border-transparent hover:border-border",
                  )}
                >
                  <Avatar name={p.name} square className="size-8" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                      {p.name}
                      {p.banned && <ShieldOff className="size-3.5 shrink-0 text-danger" />}
                    </span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {p.city} · {formatCHF(p.wallet, lang)}
                      {ratings[p.id] && <> · <Star className="size-3 fill-amber-400 text-amber-400" />{ratings[p.id].avg.toFixed(1)}</>}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("apply")}{" "}
            <Link href="/partner/register" className="font-semibold text-primary hover:underline">{t("applyCta")}</Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <Image src="/images/companies.png" alt="" fill className="object-cover opacity-30" sizes="50vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-success/30" />
        <div className="absolute inset-x-12 bottom-14 text-white">
          <h2 className="max-w-md text-balance text-3xl font-bold leading-tight">{t("sideTitle")}</h2>
          <p className="mt-3 max-w-md text-white/70">{t("sideBody")}</p>
        </div>
      </div>
    </div>
  );
}
