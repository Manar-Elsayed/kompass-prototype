"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/ui";
import { FileFolders } from "@/components/admin/file-folders";

/** Every company's files in one place, one folder per company. */
export default function FilesPage() {
  const t = useTranslations("admin.files");
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} actions={<Button onClick={() => setCreating(true)}><FolderPlus /> {t("createFolder")}</Button>} />
      <FileFolders creating={creating} onCreatingChange={setCreating} />
    </>
  );
}
