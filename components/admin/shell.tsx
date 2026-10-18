"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Check,
  ChevronDown,
  ExternalLink,
  Lock,
  LogOut,
  Menu,
  Search,
  UserCog,
  UserRound,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useHydrated, useL, useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Avatar, Popover, PopoverContent, PopoverTrigger } from "@/components/ui/controls";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Logo, EmptyState } from "@/components/shared/bits";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { PrototypeDock } from "@/components/shared/prototype-dock";
import { NAV, matchNav } from "./nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const session = useStore((s) => s.session);
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useCurrentUser();
  const t = useTranslations("admin");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (hydrated && !session) router.replace("/admin/login");
  }, [hydrated, session, router]);

  useEffect(() => setMobileNav(false), [pathname]);

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const current = matchNav(pathname);
  const allowed = !current || role?.permissions.includes(current.perm);

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-e bg-surface lg:flex">
        <Sidebar />
      </aside>
      <Dialog open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="start" className="max-w-[280px] p-0">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <Sidebar />
        </SheetContent>
      </Dialog>

      <div className="flex min-w-0 flex-col">
        <Topbar onMenu={() => setMobileNav(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {allowed ? (
            children
          ) : (
            <div className="rounded-2xl border border-dashed bg-surface">
              <EmptyState
                icon={<Lock />}
                title={t("shell.noAccess")}
                body={t("shell.noAccessBody", { perm: t(`perm.${current!.perm}`) })}
                action={
                  <Button asChild variant="outline">
                    <Link href="/admin">{t("nav.dashboard")}</Link>
                  </Button>
                }
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const store = useStore();
  const { role } = useCurrentUser();
  const current = matchNav(pathname);
  const can = (p: string) => role?.permissions.includes(p as never);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-5">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo className="h-6" />
        </Link>
        <span className="ms-auto rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">Admin</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Admin">
        {NAV.map((g) => {
          const items = g.items.filter((i) => can(i.perm));
          if (!items.length) return null;
          return (
            <div key={g.key}>
              <p className="mb-1.5 flex items-center gap-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <g.icon className="size-3.5" />
                {t(`groups.${g.key}`)}
              </p>
              <ul className="space-y-0.5">
                {items.map((i) => {
                  const active = current?.href === i.href;
                  const count = i.badge?.(store) ?? 0;
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active ? "bg-primary text-white shadow-sm" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {t(`nav.${i.key}`)}
                        {count > 0 && (
                          <span
                            className={cn(
                              "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold",
                              active ? "bg-white/20 text-white" : "bg-accent-soft text-accent",
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t p-3">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <ExternalLink className="size-4" />
          {t("shell.backToSite")}
        </Link>
        <PrototypeDock inline />
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations("admin.shell");
  const tAll = useTranslations();
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const { user, role } = useCurrentUser();
  const roles = useStore((s) => s.roles);
  const users = useStore((s) => s.users);
  const notifications = useStore((s) => s.notifications);
  const markAll = useStore((s) => s.markAllNotificationsRead);
  const patch = useStore((s) => s.patch);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-surface/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Menu">
        <Menu className="size-5" />
      </Button>
      <GlobalSearch />

      <div className="ms-auto flex items-center gap-1">
        <LocaleSwitcher className="hidden md:inline-flex" />

        {/* notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications")}>
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white ring-2 ring-surface">
                  {unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[360px] p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-bold text-ink">{t("notifications")}</p>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs font-semibold text-primary hover:underline">
                  {t("markAllRead")}
                </button>
              )}
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {notifications.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">{t("noNotifications")}</li>}
              {notifications.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => patch("notifications", n.id, { read: true })}
                    className="flex gap-3 border-b px-4 py-3 text-sm last:border-0 hover:bg-surface-2"
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-accent")} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block", !n.read && "font-semibold text-ink")}>{L(n.title)}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt, lang)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        {/* user menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 pe-2 transition hover:bg-muted">
              <Avatar name={user?.name ?? "?"} className="size-8" />
              <span className="hidden text-start leading-tight md:block">
                <span className="block text-sm font-semibold text-ink">{user?.name}</span>
                <span className="block text-xs text-muted-foreground">{L(role?.name)}</span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => router.push("/admin/profile")}>
              <UserRound /> {t("profile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <UserCog className="size-3.5" /> {t("viewAs")}
            </DropdownMenuLabel>
            {roles.map((r) => {
              const u = users.find((x) => x.roleId === r.id && x.active) ?? users.find((x) => x.roleId === r.id);
              if (!u) return null;
              return (
                <DropdownMenuItem key={r.id} onSelect={() => login(u.id)}>
                  <span className="flex w-4 justify-center">{role?.id === r.id && <Check className="!text-primary" />}</span>
                  <span className="flex-1">{L(r.name)}</span>
                  <span className="text-xs text-muted-foreground">{u.name.split(" ")[0]}</span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              tone="danger"
              onSelect={() => {
                logout();
                router.replace("/admin/login");
              }}
            >
              <LogOut /> {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="sr-only">{tAll("common.proto.mock")}</span>
    </header>
  );
}

/** Quick jump to a lead (by id / customer) or partner (by name). */
function GlobalSearch() {
  const t = useTranslations("admin");
  const offers = useStore((s) => s.offers);
  const partners = useStore((s) => s.partners);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const ls = offers
      .filter((o) => o.id.toLowerCase().includes(term) || `${o.firstName} ${o.lastName}`.toLowerCase().includes(term) || o.email.toLowerCase().includes(term))
      .slice(0, 5)
      .map((o) => ({ href: `/admin/leads/${o.id}`, title: `${o.id} · ${o.firstName} ${o.lastName}`, sub: `${o.from.city} → ${o.to.city}`, kind: t("leads.id") }));
    const ps = partners
      .filter((p) => p.name.toLowerCase().includes(term) || p.city.toLowerCase().includes(term))
      .slice(0, 5)
      .map((p) => ({ href: p.status === "approved" ? `/admin/partners/${p.id}` : "/admin/partners/applications", title: p.name, sub: `${p.city} · ${p.status}`, kind: t("groups.partners") }));
    return [...ls, ...ps];
  }, [q, offers, partners, t]);

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) {
            router.push(results[0].href);
            setQ("");
            setOpen(false);
          }
        }}
        placeholder={t("shell.search")}
        className="h-9 border-transparent bg-surface-2 ps-9 shadow-none focus-visible:bg-surface"
      />
      {open && results.length > 0 && (
        <ul className="absolute inset-x-0 top-11 z-50 overflow-hidden rounded-xl border bg-surface p-1 shadow-pop">
          {results.map((r) => (
            <li key={r.href + r.title}>
              <Link
                href={r.href}
                onClick={() => setQ("")}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                </span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{r.kind}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
