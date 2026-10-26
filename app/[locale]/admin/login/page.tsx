"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useHydrated, useL } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar, Checkbox } from "@/components/ui/controls";
import { Logo } from "@/components/shared/bits";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";

export default function AdminLogin() {
  const t = useTranslations("admin.login");
  const tf = useTranslations("common.fields");
  const L = useL();
  const router = useRouter();
  const hydrated = useHydrated();
  // deactivated members can't sign in
  const users = useStore((s) => s.users).filter((u) => u.active);
  const roles = useStore((s) => s.roles);
  const session = useStore((s) => s.session);
  const login = useStore((s) => s.login);
  const [selected, setSelected] = useState(users[0].id);
  const [busy, setBusy] = useState(false);
  const user = users.find((u) => u.id === selected)!;

  useEffect(() => {
    if (hydrated && session) router.replace("/admin");
  }, [hydrated, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await mock(() => login(selected), 700);
    toast.success(`${t("title")}, ${user.name.split(" ")[0]}`);
    router.replace("/admin");
  };

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Logo />
          <LocaleSwitcher />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

          <form onSubmit={submit} className="mt-8 grid gap-5">
            <Field label={tf("email")}>
              <Input value={user.email} readOnly dir="ltr" />
            </Field>
            <Field label={tf("password")}>
              <Input type="password" defaultValue="prototype" dir="ltr" />
            </Field>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <Checkbox defaultChecked /> {t("remember")}
              </label>
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => toast.info("Prototype")}>
                {t("forgot")}
              </button>
            </div>
            <Button type="submit" size="lg" loading={busy}>
              {t("submit")} <ArrowRight className="" />
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-accent/40 bg-accent-soft/40 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <FlaskConical className="size-4 text-accent" /> {t("demo")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("demoHint")}</p>
            <div className="mt-3 grid gap-1.5">
              {users.map((u) => {
                const r = roles.find((x) => x.id === u.roleId);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelected(u.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border bg-surface px-3 py-2 text-start transition",
                      selected === u.id ? "border-primary ring-1 ring-primary" : "border-transparent hover:border-border",
                    )}
                  >
                    <Avatar name={u.name} className="size-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{u.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{L(r?.name)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <Image src="/images/hero.png" alt="" fill className="object-cover opacity-30" sizes="50vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-primary/40" />
        <div className="absolute inset-x-12 bottom-14 text-white">
          <h2 className="max-w-md text-balance text-3xl font-bold leading-tight">{t("sideTitle")}</h2>
          <p className="mt-3 max-w-md text-white/70">{t("sideBody")}</p>
        </div>
      </div>
    </div>
  );
}
