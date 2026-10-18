"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { SiteContent } from "@/lib/types";
import { useStore } from "@/lib/mock/store";
import { mock } from "@/lib/mock/api";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/bits";
import { EditorFrame } from "@/components/admin/editor-frame";
import { SchemaEditor, cloneJson, type LangMode } from "@/components/admin/schema-editor";
import { pageSchemas, type PageKey } from "@/components/admin/cms-schemas";

export default function CmsPageEditor() {
  const { page } = useParams<{ page: string }>();
  const t = useTranslations("admin.cms");
  const site = useStore((s) => s.site);
  const setSite = useStore((s) => s.setSite);
  const schema = pageSchemas((k) => t(k)).find((s) => s.key === page);
  const key = page as PageKey;
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [mode, setMode] = useState<LangMode>("both");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (schema) setDraft(cloneJson(site[key]) as unknown as Record<string, unknown>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (!schema) return <Card><EmptyState title="404" /></Card>;
  if (!draft) return null;

  const dirty = JSON.stringify(draft) !== JSON.stringify(site[key]);

  return (
    <EditorFrame
      crumbs={[{ label: t("title"), href: "/admin/cms" }, { label: t(`pages.${schema.key}`) }]}
      title={t(`pages.${schema.key}`)}
      subtitle={`${t(`pages.${schema.key}Desc`)} · ${t("lastEdited")}`}
      viewHref={schema.viewHref}
      mode={mode}
      onMode={setMode}
      dirty={dirty}
      saving={saving}
      onDiscard={() => setDraft(cloneJson(site[key]) as unknown as Record<string, unknown>)}
      onSave={async () => {
        setSaving(true);
        await mock(() => setSite((s) => ({ ...s, [key]: draft as unknown as SiteContent[typeof key] })), 500);
        setSaving(false);
        toast.success(t("savedLive"));
      }}
    >
      <SchemaEditor fields={schema.fields} value={draft} onChange={setDraft} mode={mode} />
    </EditorFrame>
  );
}
