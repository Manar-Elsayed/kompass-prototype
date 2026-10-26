"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import type { Blog } from "@/lib/types";
import { l10n, slugify } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/controls";
import { useConfirm } from "@/components/shared/bits";
import { EditorFrame } from "@/components/admin/editor-frame";
import { SchemaEditor, cloneJson, type FieldDef, type LangMode } from "@/components/admin/schema-editor";

export default function BlogEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const t = useTranslations();
  const tb = useTranslations("admin.cms.blog");
  const L = useL();
  const router = useRouter();
  const blog = useStore((s) => s.blogs.find((b) => b.id === id));
  const services = useStore((s) => s.services);
  const add = useStore((s) => s.add);
  const patch = useStore((s) => s.patch);
  const remove = useStore((s) => s.remove);
  const { confirm, dialog } = useConfirm();
  const [mode, setMode] = useState<LangMode>("both");
  const [saving, setSaving] = useState(false);
  const blank: Blog = {
    id: "",
    slug: "",
    serviceId: services[0]?.id ?? "",
    title: l10n(),
    excerpt: l10n(),
    body: l10n("<p></p>"),
    image: "/images/blog.png",
    readMins: 5,
    published: false,
    createdAt: new Date().toISOString(),
  };
  const [draft, setDraft] = useState<Blog | null>(null);

  useEffect(() => {
    setDraft(isNew ? blank : blog ? cloneJson(blog) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!draft) return null;

  const fields: FieldDef[] = [
    { type: "text", key: "title", label: t("common.fields.title") },
    { type: "textarea", key: "excerpt", label: tb("excerpt"), rows: 2 },
    { type: "image", key: "image", label: t("common.fields.image") },
    { type: "richtext", key: "body", label: tb("body") },
  ];
  const dirty = isNew ? !!draft.title.en : JSON.stringify(draft) !== JSON.stringify(blog);

  const save = async () => {
    if (!draft.title.en.trim()) {
      toast.error(`${t("common.fields.title")} (EN) · ${t("common.form.required")}`);
      return;
    }
    setSaving(true);
    const final = { ...draft, slug: draft.slug || slugify(draft.title.en) };
    if (isNew) {
      const nb = { ...final, id: `blog-${Date.now()}` };
      await mock(() => add("blogs", nb), 500);
      setSaving(false);
      toast.success(t("common.toast.created"));
      router.replace(`/admin/cms/blog/${nb.id}`);
      return;
    }
    await mock(() => patch("blogs", draft.id, final), 500);
    setDraft(final);
    setSaving(false);
    toast.success(t("admin.cms.savedLive"));
  };

  const cat = services.find((s) => s.id === draft.serviceId);

  return (
    <>
      <EditorFrame
        crumbs={[{ label: t("admin.cms.title"), href: "/admin/cms" }, { label: tb("title"), href: "/admin/cms/blog" }, { label: isNew ? tb("add") : L(draft.title) }]}
        title={isNew ? tb("add") : L(draft.title) || tb("title")}
        viewHref={!isNew && draft.published && cat ? `/blogs/${cat.slug}/${draft.slug}` : undefined}
        mode={mode}
        onMode={setMode}
        dirty={dirty}
        saving={saving}
        onDiscard={() => setDraft(isNew ? blank : cloneJson(blog!))}
        onSave={save}
        aside={
          <div className="space-y-4">
            <Card>
              <CardHeader title={t("common.fields.status")} />
              <CardBody className="space-y-4">
                <label className="flex items-center justify-between text-sm font-semibold">
                  {tb("published")}
                  <Switch checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} />
                </label>
                <Field label={tb("category")}>
                  <Select value={draft.serviceId} onValueChange={(v) => setDraft({ ...draft, serviceId: v })} options={services.map((s) => ({ value: s.id, label: L(s.name) }))} />
                </Field>
                <Field label={tb("slug")} hint={!draft.slug && draft.title.en ? slugify(draft.title.en) : undefined}>
                  <Input value={draft.slug} dir="ltr" placeholder={slugify(draft.title.en) || "my-article"} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} />
                </Field>
                <Field label={tb("readMins")}>
                  <Input type="number" dir="ltr" value={draft.readMins} onChange={(e) => setDraft({ ...draft, readMins: Number(e.target.value) })} />
                </Field>
              </CardBody>
            </Card>
            {!isNew && (
              <Button
                variant="danger-soft"
                className="w-full"
                onClick={() =>
                  confirm({
                    title: t("admin.del.article.title", { title: L(draft.title) }),
                    body: t("admin.del.article.body"),
                    tone: "danger",
                    confirmLabel: t("admin.del.article.button"),
                    onConfirm: () => {
                      remove("blogs", draft.id);
                      toast.success(t("admin.del.article.done"));
                      router.replace("/admin/cms/blog");
                    },
                  })
                }
              >
                <Trash2 /> {t("common.actions.delete")}
              </Button>
            )}
          </div>
        }
      >
        <SchemaEditor fields={fields} value={draft as unknown as Record<string, unknown>} onChange={(v) => setDraft(v as unknown as Blog)} mode={mode} />
      </EditorFrame>
      {dialog}
    </>
  );
}
