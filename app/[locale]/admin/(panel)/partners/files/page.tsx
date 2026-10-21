"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/ui";
import { FileManager } from "@/components/admin/file-manager";

/** Every company's files in one place: logos, photos, other documents and the required documents. */
export default function FilesPage() {
  const t = useTranslations("admin.files");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <FileManager />
    </>
  );
}
