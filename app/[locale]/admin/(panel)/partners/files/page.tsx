"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/admin/ui";
import { FileFolders } from "@/components/admin/file-folders";

/** Every company's files in one place, one folder per company. */
export default function FilesPage() {
  const t = useTranslations("admin.files");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <FileFolders />
    </>
  );
}
