"use client";

import { useTranslations } from "next-intl";
import { Columns2, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LangMode } from "./schema-editor";
import { PageHeader } from "./ui";

/** Shared chrome for every CMS editor: header, language mode, sticky save bar. */
export function EditorFrame({
  title,
  subtitle,
  crumbs,
  viewHref,
  mode,
  onMode,
  dirty,
  saving,
  onSave,
  onDiscard,
  children,
  aside,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  crumbs?: { label: React.ReactNode; href?: string }[];
  viewHref?: string;
  mode: LangMode;
  onMode: (m: LangMode) => void;
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const t = useTranslations("admin.cms");
  const tc = useTranslations("common");
  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Tabs value={mode} onValueChange={(v) => onMode(v as LangMode)}>
              <TabsList className="h-9">
                <TabsTrigger value="both" className="h-7 text-xs"><Columns2 /> {t("sideBySide")}</TabsTrigger>
                <TabsTrigger value="en" className="h-7 text-xs">EN</TabsTrigger>
                <TabsTrigger value="ar" className="h-7 text-xs">ع</TabsTrigger>
              </TabsList>
            </Tabs>
            {viewHref && (
              <Button asChild variant="outline">
                <Link href={viewHref} target="_blank">
                  <ExternalLink /> {t("viewOnSite")}
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className={aside ? "grid gap-4 xl:grid-cols-[1fr_300px]" : undefined}>
        <Card className="p-5 sm:p-6">{children}</Card>
        {aside}
      </div>

      {/* sticky save bar */}
      <div
        className={`sticky bottom-4 z-20 mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-ink px-4 py-3 text-white shadow-float transition-all duration-200 ${dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
        role="status"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="size-2 rounded-full bg-accent" /> {t("unsaved")}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={onDiscard}>{t("discard")}</Button>
          <Button variant="accent" size="sm" onClick={onSave} loading={saving}>{tc("actions.save")}</Button>
        </div>
      </div>
    </>
  );
}
