"use client";

import { useStore } from "@/lib/mock/store";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { PopupAd } from "./popup-ad";
import { ComingSoon } from "./coming-soon";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const comingSoon = useStore((s) => s.config.comingSoonMode);
  if (comingSoon) return <ComingSoon />;
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <PopupAd />
    </div>
  );
}
