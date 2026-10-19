"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { LANGS, type Blog } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { StatusBadge } from "@/components/shared/bits";
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
  const serviceMap = useServiceMap();

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
    { id: "read", header: tb("readMins"), accessorFn: (b) => b.readMins },
    { id: "date", header: t("common.fields.date"), accessorFn: (b) => b.createdAt, cell: (c) => <span className="text-muted-foreground">{formatDate(c.getValue() as string, lang)}</span> },
    { id: "status", header: t("common.fields.status"), accessorFn: (b) => (b.published ? "published" : "draft"), cell: (c) => <StatusBadge status={c.getValue() as string} /> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: b } }) => (
        <div className="flex items-center justify-end gap-2">
          <Switch checked={b.published} onCheckedChange={(v) => { patch("blogs", b.id, { published: v }); toast.success(t("common.toast.updated")); }} aria-label={tb("published")} />
          {b.published && (
            <Button asChild variant="ghost" size="icon-sm" aria-label={t("admin.cms.viewOnSite")}>
              <Link href={`/blogs/${serviceMap[b.serviceId]?.slug}/${b.slug}`} target="_blank"><ExternalLink /></Link>
            </Button>
          )}
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
    </>
  );
}
