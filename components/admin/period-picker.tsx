"use client";

import { useTranslations } from "next-intl";
import { CalendarRange } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLang } from "@/lib/mock/hooks";
import { periodOptions, type Period } from "@/lib/mock/selectors";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** The current month, as a Period. */
export const currentMonth = (): Period => ({ kind: "month", key: periodOptions().months[0] });

/** Month / Year switch plus the month or year itself. Statistics are filtered to this period. */
export function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const t = useTranslations("admin.dashboard.period");
  const lang = useLang();
  const { months, years } = periodOptions();
  const label = (key: string) => formatDate(`${key}-15T12:00:00Z`, lang, { month: "long", year: "numeric" });

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("label")}>
      <CalendarRange className="size-4 text-muted-foreground" aria-hidden />
      <Tabs value={value.kind} onValueChange={(k) => onChange(k === "year" ? { kind: "year", key: value.key.slice(0, 4) } : { kind: "month", key: months.find((m) => m.startsWith(value.key.slice(0, 4))) ?? months[0] })}>
        <TabsList className="h-9">
          <TabsTrigger value="month" className="h-7 text-xs">{t("month")}</TabsTrigger>
          <TabsTrigger value="year" className="h-7 text-xs">{t("year")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="w-44">
        <Select
          value={value.key}
          onValueChange={(key) => onChange({ kind: value.kind, key })}
          options={value.kind === "month" ? months.map((m) => ({ value: m, label: label(m) })) : years.map((y) => ({ value: y, label: y }))}
        />
      </div>
    </div>
  );
}
