"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Check, ChevronDown, Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Each language in its own name, so people can find theirs whatever the current UI language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  ar: "العربية",
};

const arabicFont = (l: Locale) => (l === "ar" ? "font-[family-name:var(--font-arabic)]" : "");

/** Language menu (EN · DE · FR · IT · ع). Keeps the current path. */
export function LocaleSwitcher({ className, variant = "ghost" }: { className?: string; variant?: "ghost" | "light" }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common.lang");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, start] = useTransition();

  const go = (next: Locale) =>
    start(() => {
      // @ts-expect-error -- params are passed through untouched
      router.replace({ pathname, params }, { locale: next, scroll: false });
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label={t("switch")}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition",
            variant === "light" ? "text-white/90 hover:bg-white/10" : "text-foreground hover:bg-muted",
            pending && "opacity-60",
            className,
          )}
        >
          <Languages className="size-4" />
          <span className={arabicFont(locale)}>{LOCALE_NAMES[locale]}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {routing.locales.map((l) => (
          <DropdownMenuItem key={l} lang={l} dir={l === "ar" ? "rtl" : "ltr"} onSelect={() => l !== locale && go(l)}>
            <span className={cn("flex-1", arabicFont(l))}>{LOCALE_NAMES[l]}</span>
            {l === locale && <Check className="!text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
