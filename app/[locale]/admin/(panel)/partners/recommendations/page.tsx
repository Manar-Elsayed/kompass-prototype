"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Pin, PinOff, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Partner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { canBuyLeads, companyScore } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Stars } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";
import { DocStateBadge } from "@/components/admin/doc-state";

type Ranked = Partner & ReturnType<typeof companyScore> & { nominated: number };

/**
 * Who is offered new leads first in each canton: companies admin nominates (in the order set here),
 * then the rest ranked by performance (leads bought in 90 days, rating, recent activity).
 */
export default function RecommendationsPage() {
  const t = useTranslations("admin.reco");
  const partners = useStore((s) => s.partners);
  const orders = useStore((s) => s.orders);
  const reviews = useStore((s) => s.reviews);
  const nominations = useStore((s) => s.nominations);
  const setNominations = useStore((s) => s.setNominations);
  const approved = partners.filter((p) => p.status === "approved" && !p.banned);
  const cantons = useMemo(() => [...new Set(approved.map((p) => p.canton))].sort(), [approved]);
  const [canton, setCanton] = useState(cantons[0] ?? "ZH");

  const picks = nominations.find((n) => n.canton === canton)?.partnerIds ?? [];
  const score = (p: Partner) => companyScore({ orders, reviews }, p);
  const inRegion: Ranked[] = approved
    .filter((p) => p.canton === canton)
    .map((p) => ({ ...p, ...score(p), nominated: picks.indexOf(p.id) }))
    .sort((a, b) => (a.nominated >= 0 ? a.nominated : 99) - (b.nominated >= 0 ? b.nominated : 99) || b.score - a.score);
  const best: Ranked[] = approved
    .map((p) => ({ ...p, ...score(p), nominated: -1 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const save = (ids: string[]) => {
    setNominations(canton, ids);
    toast.success(t("saved", { canton }));
  };
  const toggle = (id: string) => save(picks.includes(id) ? picks.filter((x) => x !== id) : [...picks, id]);
  const move = (id: string, dir: -1 | 1) => {
    const i = picks.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= picks.length) return;
    const next = [...picks];
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  };

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <CardHeader title={t("byRegion")} description={t("byRegionHint")} />
          <div className="mt-4 flex flex-wrap gap-1.5 border-t px-5 py-3" role="tablist" aria-label={t("canton")}>
            {cantons.map((c) => {
              const n = nominations.find((x) => x.canton === c)?.partnerIds.length ?? 0;
              return (
                <Button key={c} size="sm" role="tab" aria-selected={c === canton} variant={c === canton ? "secondary" : "ghost"} onClick={() => setCanton(c)}>
                  {c}
                  {n > 0 && <Badge tone="primary" className="ms-1">{n}</Badge>}
                </Button>
              );
            })}
          </div>
          {inRegion.length ? (
            <ol className="divide-y border-t">
              {inRegion.map((p, i) => {
                const nominated = p.nominated >= 0;
                return (
                  <li key={p.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-3", nominated && "bg-primary-soft/30")}>
                    <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                    <Avatar name={p.name} square className="size-9" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/partners/${p.id}`} className="font-semibold text-ink hover:text-primary">{p.name}</Link>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{p.city}</span>
                        <span>{t("bought90", { count: p.bought90 })}</span>
                        {p.reviews > 0 && <Stars value={p.rating} />}
                        <span>{t("active", { days: p.idleDays })}</span>
                      </p>
                    </div>
                    {!canBuyLeads(p) && <DocStateBadge partner={p} />}
                    {nominated && <Badge tone="primary"><Pin /> {t("nominated")}</Badge>}
                    <span className="w-16 text-end text-sm font-bold text-ink" title={t("score")}>{p.score}</span>
                    <div className="flex gap-1">
                      {nominated && (
                        <>
                          <Button size="icon-sm" variant="ghost" aria-label={t("up")} disabled={p.nominated === 0} onClick={() => move(p.id, -1)}><ArrowUp /></Button>
                          <Button size="icon-sm" variant="ghost" aria-label={t("down")} disabled={p.nominated === picks.length - 1} onClick={() => move(p.id, 1)}><ArrowDown /></Button>
                        </>
                      )}
                      <Button size="sm" variant={nominated ? "ghost" : "outline"} onClick={() => toggle(p.id)}>
                        {nominated ? <PinOff /> : <Pin />} {t(nominated ? "remove" : "nominate")}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState title={t("none")} />
          )}
        </Card>

        <Card className="h-fit overflow-hidden">
          <CardHeader title={<span className="flex items-center gap-2"><Trophy className="size-4 text-warning" /> {t("best")}</span>} description={t("bestHint")} />
          <ol className="mt-4 divide-y border-t">
            {best.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="w-5 font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/partners/${p.id}`} className="block truncate font-semibold text-ink hover:text-primary">{p.name}</Link>
                  <span className="text-xs text-muted-foreground">{p.canton} · {t("bought90", { count: p.bought90 })}</span>
                </div>
                <span className="font-bold">{p.score}</span>
              </li>
            ))}
          </ol>
          <p className="border-t px-5 py-3 text-xs text-muted-foreground">{t("scoreHint")}</p>
        </Card>
      </div>
    </>
  );
}
