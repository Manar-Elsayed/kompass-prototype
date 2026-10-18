"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Mail, MailOpen, Phone, Reply, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { ContactMessage, FaqQuestion } from "@/lib/types";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, StatusBadge } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";

export default function InboxPage() {
  const t = useTranslations();
  const ti = useTranslations("admin.inbox");
  const lang = useLang();
  const contacts = useStore((s) => s.contacts);
  const questions = useStore((s) => s.faqQuestions);
  const faqs = useStore((s) => s.faqs);
  const patch = useStore((s) => s.patch);
  const add = useStore((s) => s.add);
  const [tab, setTab] = useState<"messages" | "questions">("messages");
  const [sel, setSel] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [publish, setPublish] = useState<FaqQuestion | null>(null);
  const [answer, setAnswer] = useState({ qEn: "", qAr: "", aEn: "", aAr: "" });

  const msg = contacts.find((c) => c.id === sel);
  const open = (c: ContactMessage) => {
    setSel(c.id);
    setReply("");
    if (!c.read) patch("contacts", c.id, { read: true });
  };

  const sendReply = async () => {
    if (!msg) return;
    setBusy(true);
    await mock(() => null);
    setBusy(false);
    setReply("");
    toast.success(ti("replySent", { email: msg.email }));
  };

  return (
    <>
      <PageHeader title={ti("title")} subtitle={ti("subtitle")}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-5">
          <TabsList>
            <TabsTrigger value="messages">{ti("messages")} <Badge tone="accent">{contacts.filter((c) => !c.read).length}</Badge></TabsTrigger>
            <TabsTrigger value="questions">{ti("questions")} <Badge tone="accent">{questions.filter((q) => !q.answered).length}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      {tab === "messages" ? (
        <Card className="grid min-h-[560px] overflow-hidden lg:grid-cols-[380px_1fr]">
          <ul className={cn("divide-y overflow-y-auto border-e lg:max-h-[680px]", msg && "hidden lg:block")}>
            {contacts.map((c) => (
              <li key={c.id}>
                <button onClick={() => open(c)} className={cn("flex w-full gap-3 p-4 text-start transition hover:bg-surface-2", sel === c.id && "bg-primary-soft/60")}>
                  <Avatar name={c.name} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", c.read ? "text-foreground" : "font-bold text-ink")}>{c.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.createdAt, lang)}</span>
                    </span>
                    <span className={cn("block truncate text-sm", c.read ? "text-muted-foreground" : "font-semibold text-foreground")}>{c.subject}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.message}</span>
                  </span>
                  {!c.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
                </button>
              </li>
            ))}
          </ul>
          <div className={cn("flex flex-col", !msg && "hidden lg:flex")}>
            {msg ? (
              <>
                <div className="flex items-start justify-between gap-3 border-b p-5">
                  <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setSel(null)}><ArrowLeft className="flip-rtl" /></Button>
                    <Avatar name={msg.name} className="size-11" />
                    <div>
                      <p className="font-bold text-ink">{msg.name}</p>
                      <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                        <a href={`mailto:${msg.email}`} className="flex items-center gap-1 hover:text-primary" dir="ltr"><Mail className="size-3.5" />{msg.email}</a>
                        {msg.phone && <a href={`tel:${msg.phone}`} className="flex items-center gap-1 hover:text-primary" dir="ltr"><Phone className="size-3.5" />{msg.phone}</a>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => patch("contacts", msg.id, { read: !msg.read })}>
                    {msg.read ? <Mail /> : <MailOpen />} <span className="hidden sm:inline">{ti(msg.read ? "markUnread" : "markRead")}</span>
                  </Button>
                </div>
                <div className="flex-1 space-y-2 p-5">
                  <h2 className="text-lg font-bold text-ink">{msg.subject}</h2>
                  <p className="text-xs text-muted-foreground">{formatDateTime(msg.createdAt, lang)}</p>
                  <p className="whitespace-pre-wrap pt-3 leading-relaxed">{msg.message}</p>
                </div>
                <div className="border-t bg-surface-2/50 p-4">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`${ti("reply")}…`} rows={3} className="bg-surface" />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={sendReply} loading={busy} disabled={reply.trim().length < 2}><Send className="flip-rtl" /> {ti("reply")}</Button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState icon={<Reply />} title={ti("select")} className="my-auto" />
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {questions.map((q) => (
            <Card key={q.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{q.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">{q.name} · <span dir="ltr">{q.email}</span> · {timeAgo(q.createdAt, lang)}</p>
              </div>
              {q.answered ? (
                <StatusBadge status="answered" />
              ) : (
                <Button variant="secondary" onClick={() => { setPublish(q); setAnswer({ qEn: q.question, qAr: "", aEn: "", aAr: "" }); }}>
                  <Sparkles /> {ti("toFaq")}
                </Button>
              )}
            </Card>
          ))}
          {questions.length === 0 && <Card><EmptyState title={t("common.table.noResults")} /></Card>}
        </div>
      )}

      <Dialog open={!!publish} onOpenChange={(v) => !v && setPublish(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{ti("toFaq")}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`${t("admin.cms.faq.question")} · EN`}><Input value={answer.qEn} onChange={(e) => setAnswer({ ...answer, qEn: e.target.value })} dir="ltr" /></Field>
            <Field label={`${t("admin.cms.faq.question")} · AR`}><Input value={answer.qAr} onChange={(e) => setAnswer({ ...answer, qAr: e.target.value })} dir="rtl" /></Field>
            <Field label={`${ti("answer")} · EN`}><Textarea rows={4} value={answer.aEn} onChange={(e) => setAnswer({ ...answer, aEn: e.target.value })} dir="ltr" /></Field>
            <Field label={`${ti("answer")} · AR`}><Textarea rows={4} value={answer.aAr} onChange={(e) => setAnswer({ ...answer, aAr: e.target.value })} dir="rtl" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublish(null)}>{t("common.actions.cancel")}</Button>
            <Button
              disabled={!answer.qEn.trim() || !answer.aEn.trim()}
              onClick={() => {
                add("faqs", {
                  id: `faq-${Date.now()}`,
                  order: faqs.length + 1,
                  question: { en: answer.qEn, ar: answer.qAr || answer.qEn },
                  answer: { en: answer.aEn, ar: answer.aAr || answer.aEn },
                });
                patch("faqQuestions", publish!.id, { answered: true });
                setPublish(null);
                toast.success(ti("published"));
              }}
            >
              {t("common.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
