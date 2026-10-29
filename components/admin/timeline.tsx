"use client";

import { cn, formatDateTime } from "@/lib/utils";
import { useLang } from "@/lib/mock/hooks";

export type TimelineEvent = { at: string; text: string; icon: React.ReactElement };

/**
 * Events in date order on a vertical rail: a line joins each icon to the next, so it reads as one
 * progress, and the latest step is filled to show where things stand now.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  const lang = useLang();
  return (
    <ol>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <li key={i} className={cn("relative flex gap-3", !last && "pb-5")}>
            {!last && <span aria-hidden className="absolute start-[11px] top-7 bottom-1 w-0.5 rounded-full bg-primary/20" />}
            <span className={cn("relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", last ? "bg-primary text-white" : "bg-primary-soft text-primary")}>{e.icon}</span>
            <div>
              <p className="text-sm font-semibold text-ink">{e.text}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(e.at, lang)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
