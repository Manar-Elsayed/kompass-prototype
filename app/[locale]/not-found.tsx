"use client";

import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/bits";

export default function NotFound() {
  const t = useTranslations("common.notFound");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-12" />
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Compass className="size-8" />
      </div>
      <p className="text-sm font-bold text-accent">404</p>
      <h1 className="mt-2 text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">{t("body")}</p>
      <Button asChild className="mt-8">
        <Link href="/">{t("home")}</Link>
      </Button>
    </main>
  );
}
