"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgePercent, Hourglass, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Offer } from "@/lib/types";
import { cn, formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { closingSoon, daysLeft, discountedPrice, EXPIRING_DAYS } from "@/lib/mock/selectors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/controls";
import { Tabs, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/bits";
import { Mono, PageHeader } from "@/components/admin/ui";
import { DiscountDialog } from "@/components/admin/offer-discount";

type Tab = "todo" | "done";

export default function ClosingSoonPage() {
  return (
    <Suspense>
      <ClosingSoon />
    </Suspense>
  );
}

/**
 * The queue for late offers: on sale, ending within 3 days or down to their last slot. Admin picks
 * several and lowers their price in one go, instead of opening each offer.
 */
function ClosingSoon() {
  const t = useTranslations();
  const tq = useTranslations("admin.leads.closing");
  const L = useL();
  const lang = useLang();
  const offers = useStore((s) => s.offers);
  const orders = useStore((s) => s.orders);
  const patch = useStore((s) => s.patch);
  const serviceMap = useServiceMap();
  const queue = useMemo(() => closingSoon({ offers, orders }), [offers, orders]);
  const todo = queue.filter((x) => !x.offer.discount);
  const done = queue.filter((x) => x.offer.discount);

  // ?select=KO-… (from the offer page) opens the right tab with that offer ticked
  const preselect = useSearchParams().get("select");
  const [tab, setTab] = useState<Tab>(() => (done.some((x) => x.offer.id === preselect) ? "done" : "todo"));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(queue.some((x) => x.offer.id === preselect) ? [preselect!] : []));
  const [discounting, setDiscounting] = useState<Offer[] | null>(null);

  const rows = tab === "todo" ? todo : done;
  const chosen = rows.filter((x) => picked.has(x.offer.id)).map((x) => x.offer);
  const allPicked = rows.length > 0 && chosen.length === rows.length;
  const base = (o: Offer) => serviceMap[o.serviceId]?.leadPrice ?? 0;
  const toggle = (id: string) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const switchTab = (v: Tab) => {
    setTab(v);
    setPicked(new Set());
  };
  const remove = (list: Offer[]) => {
    list.forEach((o) => patch("offers", o.id, { discount: undefined }));
    toast.success(list.length === 1 ? t("admin.leads.detail.discountRemoved", { id: list[0].id }) : tq("removed", { count: list.length }));
    setPicked(new Set());
  };

  const th = "whitespace-nowrap px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground last:pe-4";
  const td = "px-3 py-3 align-middle last:pe-4";
  const count = (n: number, tone: string) => n > 0 && <span className={cn("rounded-full px-1.5 text-xs font-bold", tone)}>{n}</span>;

  return (
    <>
      <PageHeader title={tq("title")} subtitle={tq("subtitle")} />
      <Tabs value={tab} onValueChange={(v) => switchTab(v as Tab)}>
        <UnderlineTabsList className="mb-4">
          <UnderlineTabsTrigger value="todo">{tq("tabTodo")} {count(todo.length, "bg-warning-soft text-warning")}</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="done">{tq("tabDone")} {count(done.length, "bg-success-soft text-success")}</UnderlineTabsTrigger>
        </UnderlineTabsList>
      </Tabs>

      <Card className="overflow-hidden">
        {/* what to do with the ticked offers */}
        {chosen.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-primary-soft/50 px-4 py-2.5 text-sm" role="region" aria-label={tq("selected", { count: chosen.length })}>
            <span className="font-semibold text-ink">{tq("selected", { count: chosen.length })}</span>
            <button type="button" className="text-primary hover:underline" onClick={() => setPicked(new Set())}><X className="me-1 inline size-3.5" />{t("common.actions.clear")}</button>
            <div className="ms-auto flex flex-wrap gap-2">
              {tab === "done" && <Button size="sm" variant="outline" className="text-danger" onClick={() => remove(chosen)}><Trash2 /> {tq("remove")}</Button>}
              <Button size="sm" onClick={() => setDiscounting(chosen)}><BadgePercent /> {tab === "todo" ? tq("apply") : tq("change")}</Button>
            </div>
          </div>
        )}

        {rows.length ? (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/60">
                <tr>
                  <th className="w-px py-2.5 ps-4 pe-1">
                    <Checkbox checked={allPicked} onCheckedChange={() => setPicked(new Set(allPicked ? [] : rows.map((x) => x.offer.id)))} aria-label={tq("selectAll")} />
                  </th>
                  <th className={th}>{tq("offer")}</th>
                  <th className={th}>{tq("deadline")}</th>
                  <th className={th}>{tq("slots")}</th>
                  <th className={cn(th, "text-end")}>{tq("price")}</th>
                  <th className={th}><span className="sr-only">{tq("apply")}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ offer: o, sold }) => {
                  const left = o.offersWanted - sold;
                  const days = Math.max(0, daysLeft(o.deadline));
                  const price = base(o);
                  const on = picked.has(o.id);
                  return (
                    <tr key={o.id} onClick={() => toggle(o.id)} className={cn("cursor-pointer border-t transition-colors hover:bg-surface-2/70", on && "bg-primary-soft/40 hover:bg-primary-soft/60")}>
                      <td className="py-3 ps-4 pe-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={on} onCheckedChange={() => toggle(o.id)} aria-label={o.id} />
                      </td>
                      <td className={td}>
                        <Link href={`/admin/leads/${o.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline"><Mono className="text-primary">{o.id}</Mono></Link>
                        <p className="whitespace-nowrap text-xs text-muted-foreground">{L(serviceMap[o.serviceId]?.name)} · {o.from.city}</p>
                      </td>
                      <td className={cn(td, "whitespace-nowrap")}>
                        <Badge tone={days <= 1 ? "danger" : days <= EXPIRING_DAYS ? "warning" : "neutral"}>{t("admin.leads.expiresIn", { days })}</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(o.deadline, lang)}</p>
                      </td>
                      <td className={cn(td, "whitespace-nowrap")}>
                        {left === 1 ? <Badge tone="danger">{tq("lastSlot")}</Badge> : <span className="text-ink">{tq("slotsLeft", { left, total: o.offersWanted })}</span>}
                      </td>
                      <td className={cn(td, "whitespace-nowrap text-end")}>
                        {o.discount ? (
                          <span className="inline-flex items-baseline gap-1.5">
                            <span className="text-xs text-muted-foreground line-through">{formatCHF(price, lang)}</span>
                            <span className="font-bold text-success">{formatCHF(discountedPrice(price, o.discount), lang)}</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-ink">{formatCHF(price, lang)}</span>
                        )}
                      </td>
                      <td className={cn(td, "w-px")} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => setDiscounting([o])} className="whitespace-nowrap">
                          <BadgePercent /> {o.discount ? tq("change") : tq("apply")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Hourglass />} title={tab === "todo" ? tq("emptyTodo") : tq("emptyDone")} body={tab === "todo" ? tq("emptyTodoBody") : undefined} />
        )}
      </Card>

      {discounting && <DiscountDialog offers={discounting} base={base} onClose={() => setDiscounting(null)} />}
    </>
  );
}
