"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { PartnerForm } from "@/components/site/partner-form";

export default function PartnerRegisterPage() {
  const t = useTranslations("site.partner");
  const router = useRouter();

  return (
    <section className="container-page py-12">
      <PartnerForm
        source="website"
        intro={
          <div>
            <h1 className="text-3xl font-bold text-ink">{t("registerTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("registerSub")}</p>
          </div>
        }
        onCreated={(p) => router.push(`/partner/success?name=${encodeURIComponent(p.name)}&id=${p.id}`)}
      />
    </section>
  );
}
