"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageSquarePlus, MessagesSquare } from "lucide-react";
import { useCurrentPartner } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";
import { MessageCenter } from "@/components/shared/message-thread";
import { useCompose } from "@/components/portal/compose";

export default function MessagesPage() {
  return (
    <Suspense>
      <Messages />
    </Suspense>
  );
}

/** Conversations with Kompass: messages from the team, replies, and requests the company starts itself. */
function Messages() {
  const t = useTranslations("portal.messages");
  const partner = useCurrentPartner()!;
  const params = useSearchParams();
  const { compose, dialog } = useCompose();
  const [selected, setSelected] = useState<string | null>(null);

  const wanted = params.get("thread");
  useEffect(() => {
    if (wanted) setSelected(wanted);
  }, [wanted]);

  const newMessage = () => compose({ openThread: true });

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} actions={<Button variant="accent" onClick={newMessage}><MessageSquarePlus /> {t("new")}</Button>} />
      <MessageCenter
        partnerId={partner.id}
        partnerName={partner.name}
        viewer="company"
        selected={selected}
        onSelect={setSelected}
        empty={<EmptyState icon={<MessagesSquare />} title={t("empty")} body={t("emptyBody")} action={<Button variant="outline" size="sm" onClick={newMessage}>{t("new")}</Button>} className="py-12" />}
      />
      {dialog}
    </>
  );
}
