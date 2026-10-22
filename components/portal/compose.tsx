"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner } from "@/lib/mock/hooks";
import { MESSAGE_TOPICS, type MessageTopic } from "@/lib/types";
import { sleep } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ComposeOptions {
  topic?: MessageTopic;
  subject?: string;
  body?: string;
  /** Shown above the form, e.g. why this message is needed. */
  hint?: string;
  /** Open the new conversation afterwards (default: stay and show a toast). */
  openThread?: boolean;
}

/** `compose(opts)` opens a "new message to Kompass" dialog from anywhere in the portal. */
export function useCompose() {
  const [opts, setOpts] = useState<ComposeOptions | null>(null);
  const dialog = opts ? <ComposeDialog key={JSON.stringify(opts)} {...opts} onClose={() => setOpts(null)} /> : null;
  return { compose: (o: ComposeOptions = {}) => setOpts(o), dialog };
}

function ComposeDialog({ topic: initialTopic = "general", subject: initialSubject = "", body: initialBody = "", hint, openThread, onClose }: ComposeOptions & { onClose: () => void }) {
  const t = useTranslations("portal.messages");
  const tc = useTranslations("common.actions");
  const router = useRouter();
  const partner = useCurrentPartner()!;
  const send = useStore((s) => s.sendMessage);
  const [topic, setTopic] = useState<MessageTopic>(initialTopic);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);
  const valid = subject.trim().length >= 3 && body.trim().length >= 10;

  const submit = async () => {
    setBusy(true);
    await sleep(400);
    const msg = send({ partnerId: partner.id, from: "company", topic, subject, body });
    setBusy(false);
    toast.success(t("sent"), { action: openThread ? undefined : { label: t("open"), onClick: () => router.push(`/portal/messages?thread=${msg.threadId}`) } });
    onClose();
    if (openThread) router.push(`/portal/messages?thread=${msg.threadId}`);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("newTitle")}</DialogTitle>
          <DialogDescription>{hint ?? t("newBody")}</DialogDescription>
        </DialogHeader>
        <Field label={t("topic")}>
          <Select value={topic} onValueChange={(v) => setTopic(v as MessageTopic)} options={MESSAGE_TOPICS.map((x) => ({ value: x, label: t(`topics.${x}`) }))} />
        </Field>
        <Field label={t("subject")} required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
        </Field>
        <Field label={t("message")} required hint={t("messageHint")}>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("messagePh")} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={submit} disabled={!valid} loading={busy}><Send /> {t("send")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
