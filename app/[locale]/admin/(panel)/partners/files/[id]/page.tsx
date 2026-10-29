"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import { useHydrated, useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/bits";
import { CompanyLogo } from "@/components/shared/company-logo";
import { PageHeader } from "@/components/admin/ui";
import { FileManager } from "@/components/admin/file-manager";
import { useFolders } from "@/components/admin/file-folders";
import { useStore } from "@/lib/mock/store";

/** One company's folder: its files and required documents, with search, category filter and upload. */
export default function FolderPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("admin.files");
  const lang = useLang();
  const hydrated = useHydrated();
  const partner = useStore((s) => s.partners.find((p) => p.id === id));
  const folder = useFolders().folders.find((f) => f.partner.id === id);

  if (!partner) {
    if (!hydrated) return <Skeleton className="h-64" />;
    return (
      <Card>
        <EmptyState title={t("noFolders")} action={<Button asChild variant="outline"><Link href="/admin/partners/files">{t("title")}</Link></Button>} />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("title"), href: "/admin/partners/files" }, { label: partner.name }]}
        title={
          <span className="flex items-center gap-3">
            <CompanyLogo partnerId={partner.id} name={partner.name} className="size-10" />
            {partner.name}
          </span>
        }
        subtitle={`${t("filesCount", { count: folder?.count ?? 0 })} · ${folder?.updatedAt ? t("updated", { date: formatDate(folder.updatedAt, lang) }) : t("noFilesYet")}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/partners/${partner.id}`}><Building2 /> {t("openCompany")}</Link>
          </Button>
        }
      />
      <FileManager partnerId={partner.id} />
    </>
  );
}
