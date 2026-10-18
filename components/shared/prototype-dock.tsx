"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FlaskConical, Globe, LayoutDashboard, LayoutGrid, RotateCcw, Store } from "lucide-react";
import { toast } from "sonner";
import { Link, usePathname } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/controls";
import { ConfirmDialog } from "./bits";
import { LocaleSwitcher } from "./locale-switcher";

/**
 * Floating prototype control: jump between the hub, website and admin,
 * switch language and reset the mock database. Not part of the product UI.
 */
export function PrototypeDock({ inline }: { inline?: boolean }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const resetDemo = useStore((s) => s.resetDemo);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  // Inside the admin panel the control lives in the sidebar footer instead of floating.
  const inPanel =
    (pathname.startsWith("/admin") && pathname !== "/admin/login") ||
    (pathname.startsWith("/portal") && pathname !== "/portal/login");
  if (inPanel && !inline) return null;

  const item = "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground";

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {inline ? (
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-muted"
              aria-label={t("proto.label")}
            >
              <FlaskConical className="size-4 text-accent" />
              {t("proto.label")}
            </button>
          ) : (
            <button
              className="fixed bottom-4 start-4 z-40 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-xs font-bold tracking-wide text-white shadow-float ring-1 ring-white/10 transition hover:bg-ink/90"
              aria-label={t("proto.label")}
            >
              <FlaskConical className="size-4 text-accent" />
              <span className="hidden sm:inline">{t("proto.label")}</span>
            </button>
          )}
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-64 p-2">
          <p className="px-2.5 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("proto.mock")}
          </p>
          <Link href="/hub" className={item} onClick={() => setOpen(false)}>
            <LayoutGrid /> {t("proto.hub")}
          </Link>
          <Link href="/" className={item} onClick={() => setOpen(false)}>
            <Globe /> {t("proto.website")}
          </Link>
          <Link href="/admin" className={item} onClick={() => setOpen(false)}>
            <LayoutDashboard /> {t("proto.admin")}
          </Link>
          <Link href="/portal" className={item} onClick={() => setOpen(false)}>
            <Store /> {t("proto.portal")}
          </Link>
          <div className="my-1 h-px bg-border" />
          <LocaleSwitcher className="w-full justify-start px-2.5 font-medium [&_svg]:text-muted-foreground" />
          <button
            className={cn(item, "w-full text-danger [&_svg]:text-danger")}
            onClick={() => {
              setOpen(false);
              setConfirm(true);
            }}
          >
            <RotateCcw /> {t("proto.reset")}
          </button>
        </PopoverContent>
      </Popover>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("proto.reset")}
        body={t("proto.resetConfirm")}
        tone="danger"
        confirmLabel={t("actions.reset")}
        onConfirm={() => {
          resetDemo();
          toast.success(t("toast.resetDone"));
        }}
      />
    </>
  );
}
