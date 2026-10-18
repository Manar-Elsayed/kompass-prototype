"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { OfferForm } from "@/components/site/offer-form";
import { PageHeader } from "@/components/admin/ui";

export default function NewLeadPage() {
  const t = useTranslations("admin");
  const router = useRouter();
  return (
    <>
      <PageHeader
        crumbs={[{ label: t("leads.title"), href: "/admin/leads" }, { label: t("leads.add") }]}
        title={t("leads.newTitle")}
        subtitle={t("leads.newSub")}
      />
      <OfferForm
        source="admin"
        className="max-w-5xl shadow-card"
        onCreated={(o) => {
          toast.success(t("leads.created", { id: o.id }));
          router.push(`/admin/leads/${o.id}`);
        }}
      />
    </>
  );
}
