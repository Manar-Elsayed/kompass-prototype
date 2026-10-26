"use client";

import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

/** How far visitors got in the offer form: each bar is the share of those who started. */
export function Funnel({ steps, className }: { steps: { step: "started" | "details" | "contact" | "submitted"; count: number }[]; className?: string }) {
  const t = useTranslations("admin.dashboard.stats");
  const top = steps[0]?.count || 1;
  return (
    <div className={cn("mt-5", className)}>
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink"><Filter className="size-4 text-primary" /> {t("funnel")}</p>
      <ol className="space-y-2">
        {steps.map((s) => (
          <li key={s.step} className="grid grid-cols-[8rem_1fr_5rem] items-center gap-3 text-sm">
            <span className="truncate text-muted-foreground">{t(`steps.${s.step}`)}</span>
            <span className={cn("h-3 rounded-full", s.step === "submitted" ? "bg-success" : "bg-primary/70")} style={{ width: `${Math.max(2, (s.count / top) * 100)}%` }} aria-hidden />
            <span className="text-end font-semibold tabular-nums">
              {s.count} <span className="text-xs font-normal text-muted-foreground">{Math.round((s.count / top) * 100)}%</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
