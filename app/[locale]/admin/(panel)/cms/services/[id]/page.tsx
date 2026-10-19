"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Service } from "@/lib/types";
import { l10n } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/bits";
import { EditorFrame } from "@/components/admin/editor-frame";
import { SchemaEditor, cloneJson, type FieldDef, type LangMode } from "@/components/admin/schema-editor";

const e = () => l10n();

export default function ServiceContentEditor() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("admin");
  const L = useL();
  const service = useStore((s) => s.services.find((x) => x.id === id));
  const patch = useStore((s) => s.patch);
  const [draft, setDraft] = useState<Service | null>(null);
  const [mode, setMode] = useState<LangMode>("both");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (service) setDraft(cloneJson(service));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!service) return <Card><EmptyState title="404" /></Card>;
  if (!draft) return null;

  const f = (k: string) => t(`cms.fields.${k}`);
  const fields: FieldDef[] = [
    { type: "text", key: "name", label: f("title") },
    { type: "textarea", key: "short", label: t("cms.service.short"), rows: 2 },
    { type: "image", key: "image", label: f("image") },
    { type: "richtext", key: "body", label: t("cms.service.body") },
    {
      type: "list",
      key: "features",
      label: t("cms.service.features"),
      make: () => ({ id: `f-${Date.now()}`, icon: "ShieldCheck", title: e(), description: e() }),
      fields: [
        { type: "icon", key: "icon", label: f("icon") },
        { type: "text", key: "title", label: f("title") },
        { type: "textarea", key: "description", label: f("description"), rows: 2 },
      ],
    },
    {
      type: "list",
      key: "tips",
      label: t("cms.service.tips"),
      make: () => ({ id: `t-${Date.now()}`, text: e() }),
      fields: [{ type: "text", key: "text", label: t("cms.service.tip") }],
    },
  ];

  return (
    <EditorFrame
      crumbs={[{ label: t("cms.title"), href: "/admin/cms" }, { label: t("nav.offerTypes"), href: "/admin/leads/services" }, { label: L(service.name) }]}
      title={L(service.name)}
      subtitle={`/services/${service.slug}`}
      viewHref={`/services/${service.slug}`}
      mode={mode}
      onMode={setMode}
      dirty={JSON.stringify(draft) !== JSON.stringify(service)}
      saving={saving}
      onDiscard={() => setDraft(cloneJson(service))}
      onSave={async () => {
        setSaving(true);
        await mock(() => patch("services", service.id, draft), 500);
        setSaving(false);
        toast.success(t("cms.savedLive"));
      }}
    >
      <SchemaEditor fields={fields} value={draft as unknown as Record<string, unknown>} onChange={(v) => setDraft(v as unknown as Service)} mode={mode} />
    </EditorFrame>
  );
}
