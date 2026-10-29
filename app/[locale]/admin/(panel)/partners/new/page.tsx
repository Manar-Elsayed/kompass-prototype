"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { PartnerForm } from "@/components/site/partner-form";
import { PageHeader } from "@/components/admin/ui";

/**
 * Admin adds a company that signed up by phone or email, with the same steps as the website signup.
 * It starts as an application, so the contract, documents and approval follow the usual path.
 */
export default function NewPartnerPage() {
  const t = useTranslations("admin.partners");
  const router = useRouter();

  return (
    <>
      <PageHeader crumbs={[{ label: t("title"), href: "/admin/partners" }, { label: t("add") }]} title={t("newTitle")} subtitle={t("newSub")} />
      <PartnerForm
        source="admin"
        className="max-w-5xl"
        onCreated={(p) => {
          toast.success(t("added", { name: p.name }));
          router.push(`/admin/partners/applications/${p.id}`);
        }}
      />
    </>
  );
}
