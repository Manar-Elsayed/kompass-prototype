"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronDown, ExternalLink, LayoutDashboard, LogOut, Menu, MessageSquare, Repeat, ShieldOff, ShoppingBag, Star, Store as StoreIcon, UserCog, Wallet, ClipboardCheck } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCompanyMedia, useCurrentPartner, useHydrated, useLang } from "@/lib/mock/hooks";
import { availableLeads, canBuyLeads, documentState, leadOutcome } from "@/lib/mock/selectors";
import type { DocKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLowBalance } from "@/components/portal/low-balance";
import { Logo } from "@/components/shared/bits";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { PrototypeDock } from "@/components/shared/prototype-dock";
import { NotificationBell } from "./feed";
import { useCompose } from "./compose";

const NAV = [
  { key: "dashboard", href: "/portal", icon: LayoutDashboard },
  { key: "shop", href: "/portal/shop", icon: ShoppingBag },
  { key: "leads", href: "/portal/leads", icon: ClipboardCheck },
  { key: "payments", href: "/portal/payments", icon: Wallet },
  { key: "messages", href: "/portal/messages", icon: MessageSquare },
  { key: "reviews", href: "/portal/reviews", icon: Star },
  { key: "profile", href: "/portal/profile", icon: UserCog },
] as const;

/** Partner-facing shell — same design system as the admin, scoped to one company. */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const partner = useCurrentPartner();
  const session = useStore((s) => s.partnerSession);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const t = useTranslations("portal.shell");

  // applicants (and declined companies) see their onboarding status instead of the portal
  const onboarding = !!partner && partner.status !== "approved";
  useEffect(() => {
    if (hydrated && (!session || !partner)) router.replace("/portal/login");
    else if (hydrated && onboarding) router.replace("/portal/onboarding");
  }, [hydrated, session, partner, onboarding, router]);
  useEffect(() => setMobileNav(false), [pathname]);

  if (!hydrated || !partner || onboarding) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-e bg-surface lg:flex">
        <Sidebar />
      </aside>
      <Dialog open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="start" className="max-w-[280px] p-0">
          <DialogTitle className="sr-only">{t("menu")}</DialogTitle>
          <Sidebar />
        </SheetContent>
      </Dialog>
      <div className="flex min-w-0 flex-col">
        <Topbar onMenu={() => setMobileNav(true)} />
        <StatusBanner />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function Sidebar() {
  const t = useTranslations("portal");
  const lang = useLang();
  const pathname = usePathname();
  const partner = useCurrentPartner()!;
  const lowWallet = useLowBalance().low;
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const fakeReports = useStore((s) => s.fakeReports);
  const refunds = useStore((s) => s.refunds);
  const messages = useStore((s) => s.messages);
  const { logo } = useCompanyMedia(partner.id);
  const available = availableLeads({ offers, orders }, partner).length;
  const openLeads = orders.filter((o) => o.partnerId === partner.id && leadOutcome({ offers, fakeReports, refunds }, o).group === "open").length;
  const unread = messages.filter((m) => m.partnerId === partner.id && m.from === "kompass" && !m.readAt).length;
  const badges: Partial<Record<(typeof NAV)[number]["key"], number>> = { shop: available, leads: openLeads, messages: unread };
  const active = (href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-5">
        <Link href="/portal"><Logo className="h-6" /></Link>
        <span className="ms-auto rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">{t("shell.badge")}</span>
      </div>
      <div className="m-3 rounded-xl bg-surface-2 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={partner.name} src={logo?.url} square className="size-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{partner.name}</p>
            <p className="truncate text-xs text-muted-foreground">{partner.city} · {partner.canton}</p>
          </div>
        </div>
        <Link
          href="/portal/payments"
          title={lowWallet ? t("lowBalance.short") : undefined}
          className={cn("mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm ring-1 transition", lowWallet ? "bg-warning-soft/60 ring-warning/40 hover:ring-warning" : "bg-surface ring-border hover:ring-primary/40")}
        >
          <span className="flex items-center gap-1.5 text-muted-foreground"><Wallet className="size-4" />{t("dashboard.wallet")}</span>
          <span className={cn("font-bold", lowWallet ? "text-warning" : "text-ink")}>{formatCHF(partner.wallet, lang)}</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Partner">
        {NAV.map(({ key, href, icon: I }) => (
          <Link
            key={key}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active(href) ? "bg-primary text-white shadow-sm" : "text-foreground/80 hover:bg-muted hover:text-foreground",
            )}
          >
            <I className="size-4" />
            <span className="flex-1">{t(`nav.${key}`)}</span>
            {!!badges[key] && (
              <span className={cn("min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold", active(href) ? "bg-white/20 text-white" : "bg-accent-soft text-accent")}>
                {badges[key]}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="space-y-0.5 border-t p-3">
        <Link href={`/companies/${partner.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <ExternalLink className="size-4" /> {t("shell.viewProfile")}
        </Link>
        <PrototypeDock inline />
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations("portal");
  const lang = useLang();
  const router = useRouter();
  const partner = useCurrentPartner()!;
  const lowWallet = useLowBalance().low;
  const logout = useStore((s) => s.partnerLogout);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-surface/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label={t("shell.menu")}>
        <Menu className="size-5" />
      </Button>
      <Link href="/portal" className="lg:hidden"><Logo className="h-6" /></Link>
      <div className="ms-auto flex items-center gap-1">
        <Button asChild variant="outline" size="sm" className={cn("hidden sm:inline-flex", lowWallet && "border-warning/50 bg-warning-soft/60 text-warning")} title={lowWallet ? t("lowBalance.short") : undefined}>
          <Link href="/portal/payments"><Wallet /> {formatCHF(partner.wallet, lang)}</Link>
        </Button>
        <Button asChild variant="accent" size="sm" className="hidden md:inline-flex">
          <Link href="/portal/shop"><StoreIcon /> {t("nav.shop")}</Link>
        </Button>
        <LocaleSwitcher className="hidden md:inline-flex" />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 pe-2 transition hover:bg-muted">
              <Avatar name={partner.ownerName} className="size-8" />
              <span className="hidden text-start leading-tight md:block">
                <span className="block text-sm font-semibold text-ink">{partner.ownerName}</span>
                <span className="block max-w-40 truncate text-xs text-muted-foreground">{partner.name}</span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel dir="ltr">{partner.email}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => router.push("/portal/profile")}><UserCog /> {t("nav.profile")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { logout(); router.replace("/portal/login"); }}><Repeat /> {t("shell.switch")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger" onSelect={() => { logout(); router.replace("/portal/login"); }}><LogOut /> {t("shell.logout")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/** Account-state banners: suspended, or documents missing / expired / being checked / expiring soon. */
function StatusBanner() {
  const t = useTranslations("portal.shell");
  const tp = useTranslations("admin.partners");
  const lang = useLang();
  const partner = useCurrentPartner()!;
  const { compose, dialog } = useCompose();
  const docs = documentState(partner);
  const names = (keys: DocKey[]) => keys.map((k) => tp(k)).join(", ");
  let tone = "";
  let text = "";
  let Icon = AlertTriangle;
  if (partner.banned) {
    tone = "bg-danger-soft text-danger";
    text = t("banned");
    Icon = ShieldOff;
  } else if (docs.missing.length || docs.expired.length) {
    tone = "bg-danger-soft text-danger";
    text = t("docsBlocked", { docs: names([...docs.missing, ...docs.expired]) });
  } else if (docs.review.length) {
    tone = "bg-info-soft text-info";
    text = t("docsReview", { docs: names(docs.review) });
  } else if (docs.expiring.length && docs.next) {
    tone = "bg-warning-soft text-warning";
    text = t("docsExpiring", { doc: tp(docs.next.key), date: formatDate(docs.next.date, lang) });
  }
  if (!text) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm font-semibold sm:px-6 lg:px-8", tone)} role="status">
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{text}</span>
      {partner.banned ? (
        <button className="underline underline-offset-2" onClick={() => compose({ topic: "general", subject: t("supportSubject"), openThread: true })}>{t("support")}</button>
      ) : (
        <Link href="/portal/profile?tab=documents" className="underline underline-offset-2">{t("updateDocs")}</Link>
      )}
      {dialog}
    </div>
  );
}

/** True when the partner may buy leads: approved, not banned, all documents checked and unexpired. */
export function useCanBuy() {
  const partner = useCurrentPartner();
  return partner ? canBuyLeads(partner) : false;
}
