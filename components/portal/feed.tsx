"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, CheckCircle2, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Link, useRouter } from "@/i18n/navigation";
import { cn, formatCHF, formatDate, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useLang } from "@/lib/mock/hooks";
import { feedReadSince, partnerFeed, type FeedItem, type FeedTone } from "@/lib/mock/selectors";
import type { DocKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const TONE: Record<FeedTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "bg-success-soft text-success" },
  warning: { icon: TriangleAlert, className: "bg-warning-soft text-warning" },
  danger: { icon: CircleAlert, className: "bg-danger-soft text-danger" },
  info: { icon: Info, className: "bg-info-soft text-info" },
};

/** The signed-in company's notifications (derived from the data), how many are unread, and a way to clear them. */
export function usePartnerFeed() {
  const partner = useCurrentPartner();
  const db = useStore(
    useShallow((s) => ({
      partners: s.partners,
      offers: s.offers,
      orders: s.orders,
      dues: s.dues,
      topups: s.topups,
      invoices: s.invoices,
      refunds: s.refunds,
      messages: s.messages,
      payouts: s.payouts,
      reviews: s.reviews,
      removals: s.removals,
    })),
  );
  const patch = useStore((s) => s.patch);
  const items = useMemo(() => (partner ? partnerFeed(db, partner.id) : []), [db, partner]);
  const since = partner ? feedReadSince(partner) : "";
  const unread = items.filter((i) => i.at > since).length;
  const markRead = () => partner && patch("partners", partner.id, { feedReadAt: new Date().toISOString() });
  return { items, unread, since, markRead };
}

/** One notification as a sentence in the current language. */
export function useFeedText() {
  const t = useTranslations("portal.feed");
  const tp = useTranslations("admin.partners");
  const lang = useLang();
  return (item: FeedItem) => {
    const v = item.values;
    return t(item.kind, {
      ...v,
      amount: typeof v.amount === "number" ? formatCHF(v.amount, lang) : "",
      date: typeof v.date === "string" ? formatDate(v.date, lang) : "",
      doc: typeof v.doc === "string" ? tp(v.doc as DocKey) : "",
    });
  };
}

export function FeedRow({ item, unread, compact, onClick }: { item: FeedItem; unread?: boolean; compact?: boolean; onClick?: () => void }) {
  const text = useFeedText();
  const lang = useLang();
  const { icon: Icon, className } = TONE[item.tone];
  return (
    <Link href={item.href} onClick={onClick} className={cn("flex items-start gap-3 px-4 py-2.5 text-sm transition hover:bg-muted", unread && "bg-primary-soft/40")}>
      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", className)}>
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-ink", compact ? "line-clamp-2" : "", unread && "font-semibold")}>{text(item)}</span>
        <span className="text-xs text-muted-foreground">{timeAgo(item.at, lang)}</span>
      </span>
      {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-hidden />}
    </Link>
  );
}

/** Top-bar bell: newest notifications; opening it marks them read (still highlighted until it closes). */
export function NotificationBell() {
  const t = useTranslations("portal.feed");
  const router = useRouter();
  const { items, unread, since, markRead } = usePartnerFeed();
  const [open, setOpen] = useState(false);
  const [openedSince, setOpenedSince] = useState<string | null>(null);
  const highlight = openedSince ?? since;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setOpenedSince(since);
          if (unread) markRead();
        } else setOpenedSince(null);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? t("bellUnread", { count: unread }) : t("title")}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-bold text-ink">{t("title")}</p>
          <button className="text-xs font-semibold text-primary hover:underline" onClick={() => { setOpen(false); router.push("/portal#activity"); }}>
            {t("viewAll")}
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length ? (
            items.slice(0, 8).map((i) => <FeedRow key={i.id} item={i} unread={i.at > highlight} compact onClick={() => setOpen(false)} />)
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
