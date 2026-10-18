"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Two-language toggle (EN ⇄ ع). Keeps the current path. */
export function LocaleSwitcher({ className, variant = "ghost" }: { className?: string; variant?: "ghost" | "light" }) {
  const locale = useLocale();
  const t = useTranslations("common.lang");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, start] = useTransition();
  const next = locale === "en" ? "ar" : "en";

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={t("switch")}
      onClick={() =>
        start(() => {
          // @ts-expect-error -- params are passed through untouched
          router.replace({ pathname, params }, { locale: next, scroll: false });
        })
      }
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition",
        variant === "light" ? "text-white/90 hover:bg-white/10" : "text-foreground hover:bg-muted",
        pending && "opacity-60",
        className,
      )}
    >
      <Languages className="size-4" />
      <span className={next === "ar" ? "font-[family-name:var(--font-arabic)]" : ""}>{next === "ar" ? "العربية" : "English"}</span>
    </button>
  );
}
