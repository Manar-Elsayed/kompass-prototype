"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useHydrated, useL } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const KEY = "kompass-popup-dismissed";

/** CMS-driven promotional popup (shown once per browser session). */
export function PopupAd() {
  const t = useTranslations("site.popup");
  const L = useL();
  const popup = useStore((s) => s.site.popup);
  const hydrated = useHydrated();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hydrated || !popup.enabled) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      /* storage unavailable */
    }
    const id = setTimeout(() => setOpen(true), popup.delaySec * 1000);
    return () => clearTimeout(id);
  }, [hydrated, popup.enabled, popup.delaySec, pathname]);

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <div className="relative h-40 bg-primary-soft">
          <Image src="/images/hero.png" alt="" fill className="object-cover" sizes="448px" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        </div>
        <div className="grid gap-3 p-6 pt-5">
          <DialogTitle className="text-xl">{L(popup.title)}</DialogTitle>
          <DialogDescription>{L(popup.body)}</DialogDescription>
          <div className="mt-2 flex gap-2">
            <Button asChild variant="accent" className="flex-1" onClick={dismiss}>
              <Link href={popup.href}>{L(popup.cta)}</Link>
            </Button>
            <Button variant="ghost" onClick={dismiss}>
              {t("dismiss")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
