"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { OfferForm } from "@/components/site/offer-form";
import { PageHeader } from "@/components/admin/ui";

/**
 * Admin enters a request for a customer (phoned in, or a website form the customer left half-way:
 * ?session=FS-… prefills what they had typed and links the session to the new offer).
 */
export default function NewLeadPage() {
  return (
    <Suspense>
      <NewLead />
    </Suspense>
  );
}

function NewLead() {
  const t = useTranslations("admin");
  const router = useRouter();
  const sessionId = useSearchParams().get("session");
  const session = useStore((s) => (sessionId ? s.formSessions.find((x) => x.id === sessionId) : undefined));
  const trackFormSession = useStore((s) => s.trackFormSession);
  const [firstName, ...rest] = (session?.name ?? "").split(" ");

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("leads.title"), href: "/admin/leads" }, { label: t("leads.add") }]}
        title={t("leads.newTitle")}
        subtitle={session ? t("offerForm.completingFor", { name: session.name ?? session.email ?? "" }) : t("leads.newSub")}
      />
      <OfferForm
        key={session?.id ?? "new"}
        source="admin"
        className="max-w-5xl shadow-card"
        defaultServiceId={session?.serviceId}
        defaultContact={session ? { firstName, lastName: rest.join(" "), email: session.email, phone: session.phone } : undefined}
        onCreated={(o) => {
          if (session) trackFormSession(session.id, { step: "submitted", offerId: o.id, followUp: "completed" });
          toast.success(t("leads.created", { id: o.id }));
          router.push(`/admin/leads/${o.id}`);
        }}
      />
    </>
  );
}
