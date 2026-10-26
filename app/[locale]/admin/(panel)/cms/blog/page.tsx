"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { LANGS, type Blog } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { StatusBadge, useConfirm } from "@/components/shared/bits";
import { RowActions } from "@/components/admin/row-actions";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/ui";

export default function BlogAdmin() {
  const t = useTranslations();
  const tb = useTranslations("admin.cms.blog");
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const blogs = useStore((s) => s.blogs);
  const services = useStore((s) => s.services);
  const patch = useStore((s) => s.patch);
  const add = useStore((s) => s.add);
  const remove = useStore((s) => s.remove);
  const serviceMap = useServiceMap();
  const { confirm, dialog } = useConfirm();
  const duplicate = (b: Blog) => {
    const id = `blog-${Date.now().toString(36)}`;
    add("blogs", { ...b, id, slug: `${b.slug}-copy`, published: false, createdAt: new Date().toISOString(), title: Object.fromEntries(LANGS.map((l) => [l, `${b.title[l]} (copy)`])) as Blog["title"] });
    toast.success(t("admin.rows.duplicated"));
    router.push(`/admin/cms/blog/${id}`);
  };

  const columns: ColumnDef<Blog, unknown>[] = [
    {
      id: "title",
      header: t("common.fields.title"),
      accessorFn: (b) => L(b.title),
      cell: ({ row: { original: b } }) => (
        <span className="flex items-center gap-3">
          <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md bg-surface-2">
            <Image src={b.image} alt="" fill className="object-cover" sizes="64px" unoptimized={b.image.startsWith("data:")} />
          </span>
          <span className="min-w-0">
            <span className="block max-w-sm truncate font-semibold text-ink">{L(b.title)}</span>
            <span className="block text-xs text-muted-foreground" dir="ltr">/{b.slug}</span>
          </span>
        </span>
      ),
    },
    { id: "cat", header: tb("category"), accessorFn: (b) => L(serviceMap[b.serviceId]?.name) },
    { id: "read", meta: { className: "hidden 2xl:table-cell" }, header: tb("readMins"), accessorFn: (b) => b.readMins },
    { id: "date", header: t("common.fields.date"), accessorFn: (b) => b.createdAt, cell: (c) => <span className="text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    { id: "status", header: t("common.fields.status"), accessorFn: (b) => (b.published ? "published" : "draft"), cell: (c) => <StatusBadge status={c.getValue() as string} /> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: b } }) => (
        <div className="flex items-center justify-end gap-2">
          <Switch checked={b.published} onCheckedChange={(v) => { patch("blogs", b.id, { published: v }); toast.success(t("common.toast.updated")); }} aria-label={tb("published")} />
          <RowActions
            viewHref={`/admin/cms/blog/${b.id}`}
            actions={[
              { label: t("common.actions.edit"), icon: <Pencil />, href: `/admin/cms/blog/${b.id}` },
              { label: t("admin.cms.viewOnSite"), icon: <ExternalLink />, onSelect: () => window.open(`/${lang}/blogs/${serviceMap[b.serviceId]?.slug}/${b.slug}`, "_blank"), hidden: !b.published },
              { label: t("admin.rows.duplicate"), icon: <Copy />, onSelect: () => duplicate(b) },
              {
                label: t("common.actions.delete"),
                icon: <Trash2 />,
                tone: "danger",
                separated: true,
                onSelect: () =>
                  confirm({
                    title: t("admin.del.article.title", { title: L(b.title) }),
                    body: t("admin.del.article.body"),
                    tone: "danger",
                    confirmLabel: t("admin.del.article.button"),
                    onConfirm: () => {
                      remove("blogs", b.id);
                      toast.success(t("admin.del.article.done"));
                    },
                  }),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("admin.cms.title"), href: "/admin/cms" }, { label: tb("title") }]}
        title={tb("title")}
        subtitle={tb("subtitle")}
        actions={<Button asChild><Link href="/admin/cms/blog/new"><Plus /> {tb("add")}</Link></Button>}
      />
      <DataTable
        data={blogs}
        columns={columns}
        search={(b) => `${LANGS.map((l) => b.title[l]).join(" ")} ${b.slug}`}
        onRowClick={(b) => router.push(`/admin/cms/blog/${b.id}`)}
        filters={[
          { id: "cat", label: tb("category"), options: services.map((s) => ({ value: s.id, label: L(s.name) })), get: (b) => b.serviceId },
          { id: "st", label: t("common.fields.status"), options: [{ value: "published", label: t("common.status.published") }, { value: "draft", label: t("common.status.draft") }], get: (b) => (b.published ? "published" : "draft") },
        ]}
      />
      {dialog}
    </>
  );
}
