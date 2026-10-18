import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Wallet,
  ShieldCheck,
  MessagesSquare,
  Globe,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/types";
import type { Store } from "@/lib/mock/store";

export interface NavItem {
  key: string; // admin.nav.<key>
  href: string;
  perm: Permission;
  badge?: (s: Store) => number;
}

export interface NavGroup {
  key: string; // admin.groups.<key>
  icon: LucideIcon;
  perm: Permission;
  items: NavItem[];
}

/**
 * Refactored information architecture.
 * Legacy had 15 flat top-level entries (Home, Configurations, Kompass Website,
 * Companies, Offers, Finance, Visitors, Shop, Complains, Coupons, User
 * Management, Roles, Contact Us, Reviews). They are regrouped by job-to-be-done.
 */
export const NAV: NavGroup[] = [
  {
    key: "overview",
    icon: LayoutDashboard,
    perm: "dashboard",
    items: [{ key: "dashboard", href: "/admin", perm: "dashboard" }],
  },
  {
    key: "leads",
    icon: ClipboardList,
    perm: "leads",
    items: [
      { key: "offers", href: "/admin/leads", perm: "leads", badge: (s) => s.offers.filter((o) => o.status === "new").length },
      { key: "shop", href: "/admin/leads/shop", perm: "leads" },
      { key: "executions", href: "/admin/leads/executions", perm: "leads" },
      { key: "fakeReports", href: "/admin/leads/fake-reports", perm: "leads", badge: (s) => s.fakeReports.filter((r) => r.status === "open").length },
      { key: "offerTypes", href: "/admin/leads/services", perm: "leads" },
    ],
  },
  {
    key: "partners",
    icon: Users,
    perm: "partners",
    items: [
      { key: "partners", href: "/admin/partners", perm: "partners" },
      { key: "applications", href: "/admin/partners/applications", perm: "partners", badge: (s) => s.partners.filter((p) => p.status === "pending" || p.status === "contract_sent").length },
      { key: "activity", href: "/admin/partners/activity", perm: "partners" },
    ],
  },
  {
    key: "finance",
    icon: Wallet,
    perm: "finance",
    items: [
      { key: "partnerDues", href: "/admin/finance/partner-dues", perm: "finance", badge: (s) => s.dues.filter((d) => d.status === "pending").length },
      { key: "kompassDues", href: "/admin/finance/kompass-dues", perm: "finance" },
      { key: "coupons", href: "/admin/finance/coupons", perm: "finance" },
    ],
  },
  {
    key: "moderation",
    icon: ShieldCheck,
    perm: "moderation",
    items: [
      { key: "kompassReviews", href: "/admin/moderation/kompass-reviews", perm: "moderation", badge: (s) => s.reviews.filter((r) => r.target === "kompass" && r.status === "pending").length },
      { key: "partnerReviews", href: "/admin/moderation/partner-reviews", perm: "moderation", badge: (s) => s.reviews.filter((r) => r.target !== "kompass" && r.status === "pending").length },
      { key: "removals", href: "/admin/moderation/removals", perm: "moderation", badge: (s) => s.removals.filter((r) => r.status === "pending").length },
      { key: "complaints", href: "/admin/moderation/complaints", perm: "moderation", badge: (s) => s.complaints.filter((c) => c.status === "pending").length },
    ],
  },
  {
    key: "engagement",
    icon: MessagesSquare,
    perm: "inbox",
    items: [
      { key: "inbox", href: "/admin/inbox", perm: "inbox", badge: (s) => s.contacts.filter((c) => !c.read).length + s.faqQuestions.filter((q) => !q.answered).length },
      { key: "visitors", href: "/admin/insights/visitors", perm: "insights" },
    ],
  },
  {
    key: "website",
    icon: Globe,
    perm: "cms",
    items: [
      { key: "cms", href: "/admin/cms", perm: "cms" },
      { key: "blog", href: "/admin/cms/blog", perm: "cms" },
      { key: "faqs", href: "/admin/cms/faqs", perm: "cms" },
      { key: "modelOffers", href: "/admin/cms/example-offers", perm: "cms" },
    ],
  },
  {
    key: "settings",
    icon: Settings,
    perm: "settings",
    items: [
      { key: "users", href: "/admin/settings/team", perm: "settings" },
      { key: "roles", href: "/admin/settings/roles", perm: "settings" },
      { key: "config", href: "/admin/settings/configuration", perm: "settings" },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

/** Most specific nav item matching a pathname (used for permission gating + active state). */
export function matchNav(pathname: string): NavItem | undefined {
  return ALL_ITEMS.filter((i) => (i.href === "/admin" ? pathname === "/admin" : pathname === i.href || pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
