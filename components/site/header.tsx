"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, LogIn, Menu, Phone } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Logo } from "@/components/shared/bits";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";

const NAV = [
  { href: "/services", key: "services" },
  { href: "/companies", key: "companies" },
  { href: "/blogs", key: "blogs" },
  { href: "/about", key: "about" },
  { href: "/faqs", key: "faqs" },
  { href: "/contact", key: "contact" },
] as const;

export function SiteHeader() {
  const t = useTranslations("site.nav");
  const pathname = usePathname();
  const phone = useStore((s) => s.site.general.phone);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-200",
        scrolled ? "border-border bg-surface/90 backdrop-blur-md" : "border-transparent bg-surface",
      )}
    >
      {/* utility bar */}
      <div className="hidden border-b border-border/70 bg-surface-2/60 md:block">
        <div className="container-page flex h-9 items-center justify-between text-xs text-muted-foreground">
          <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
            <Phone className="size-3.5" />
            <span dir="ltr">{phone}</span>
          </a>
          <div className="flex items-center gap-4">
            <Link href="/partner" className="font-medium hover:text-primary">
              {t("partners")}
            </Link>
            <Link href="/portal/login" className="inline-flex items-center gap-1 font-medium hover:text-primary">
              <LogIn className="size-3.5" />
              {t("partnerLogin")}
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-6">
        <Link href="/" aria-label="Kompass home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                isActive(n.href) ? "text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          <LocaleSwitcher className="hidden sm:inline-flex" />
          <Button asChild variant="accent" className="hidden sm:inline-flex">
            <Link href="/#offer-form">
              {t("cta")}
              <ArrowRight className="" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label={t("menu")}>
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <SheetContent className="max-w-xs p-0">
          <DialogTitle className="sr-only">{t("menu")}</DialogTitle>
          <div className="flex h-16 items-center border-b px-5">
            <Logo />
          </div>
          <nav className="flex flex-col p-3" aria-label="Mobile">
            {[{ href: "/", key: "home" } as const, ...NAV].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-3 text-[15px] font-semibold",
                  (n.href === "/" ? pathname === "/" : isActive(n.href)) ? "bg-primary-soft text-primary" : "hover:bg-muted",
                )}
              >
                {t(n.key)}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            <Link href="/partner" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-[15px] font-semibold hover:bg-muted">
              {t("partners")}
            </Link>
            <Link href="/portal/login" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-[15px] font-semibold hover:bg-muted">
              <LogIn className="size-4" />
              {t("partnerLogin")}
            </Link>
            <LocaleSwitcher className="justify-start px-3" />
          </nav>
          <div className="mt-auto border-t p-4">
            <Button asChild variant="accent" className="w-full" size="lg">
              <Link href="/#offer-form" onClick={() => setOpen(false)}>
                {t("cta")}
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </header>
  );
}
