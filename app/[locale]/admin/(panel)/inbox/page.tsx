"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlarmClock, ArrowLeft, CheckCheck, Mail, MailOpen, Phone, Reply, RotateCcw, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LANGS, type ContactMessage, type FaqQuestion } from "@/lib/types";
import { cn, formatDateTime, l10n, timeAgo, withFallback } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { needsFollowUp } from "@/lib/mock/selectors";
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
import { RowActions } from "@/components/admin/row-actions";
import { useConfirm } from "@/components/shared/bits";

export default function InboxPage() {
  const t = useTranslations();
  const ti = useTranslations("admin.inbox");
  const lang = useLang();
  const contacts = useStore((s) => s.contacts);
  const questions = useStore((s) => s.faqQuestions);
  const faqs = useStore((s) => s.faqs);
  const patch = useStore((s) => s.patch);
  const markHandled = useStore((s) => s.markContactHandled);
  const [onlyFollowUp, setOnlyFollowUp] = useState(false);
  const add = useStore((s) => s.add);
  const remove = useStore((s) => s.remove);
  const { confirm, dialog } = useConfirm();
  const [tab, setTab] = useState<"messages" | "questions">("messages");
  const [sel, setSel] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [publish, setPublish] = useState<FaqQuestion | null>(null);
  const [answer, setAnswer] = useState({ q: l10n(), a: l10n() });

  const msg = contacts.find((c) => c.id === sel);
  // requests nobody has answered or called back within 24 hours come first and are flagged
  const overdue = contacts.filter(needsFollowUp);
  const list = (onlyFollowUp ? overdue : contacts).slice().sort((a, b) => Number(needsFollowUp(b)) - Number(needsFollowUp(a)) || b.createdAt.localeCompare(a.createdAt));
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
    markHandled(msg.id, true);
    toast.success(ti("replySent", { email: msg.email }));
  };

  return (
    <>
      <PageHeader title={ti("title")} subtitle={ti("subtitle")}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-5">
          <TabsList>
            <TabsTrigger value="messages">{ti("messages")} <Badge tone={overdue.length ? "danger" : "accent"}>{overdue.length || contacts.filter((c) => !c.read).length}</Badge></TabsTrigger>
            <TabsTrigger value="questions">{ti("questions")} <Badge tone="accent">{questions.filter((q) => !q.answered).length}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      {tab === "messages" ? (
        <Card className="grid min-h-[560px] overflow-hidden lg:grid-cols-[380px_1fr]">
          <ul className={cn("divide-y overflow-y-auto border-e lg:max-h-[680px]", msg && "hidden lg:block")}>
            <li className="flex items-center justify-between gap-2 bg-surface-2/60 px-4 py-2 text-xs">
              <span className={cn("flex items-center gap-1.5 font-semibold", overdue.length ? "text-danger" : "text-muted-foreground")}>
                <AlarmClock className="size-3.5" /> {ti("followUpCount", { count: overdue.length })}
              </span>
              <button onClick={() => setOnlyFollowUp((v) => !v)} className="font-semibold text-primary hover:underline">
                {ti(onlyFollowUp ? "showAll" : "showFollowUp")}
              </button>
            </li>
            {list.map((c) => (
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
                    {needsFollowUp(c) ? (
                      <Badge tone="danger" className="mt-1"><AlarmClock /> {ti("overdue")}</Badge>
                    ) : c.handledAt ? (
                      <span className="mt-1 flex items-center gap-1 text-xs text-success"><CheckCheck className="size-3.5" /> {ti("handled")}</span>
                    ) : null}
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
                    <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setSel(null)}><ArrowLeft className="" /></Button>
                    <Avatar name={msg.name} className="size-11" />
                    <div>
                      <p className="font-bold text-ink">{msg.name}</p>
                      <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                        <a href={`mailto:${msg.email}`} className="flex items-center gap-1 hover:text-primary" dir="ltr"><Mail className="size-3.5" />{msg.email}</a>
                        {msg.phone && <a href={`tel:${msg.phone}`} className="flex items-center gap-1 hover:text-primary" dir="ltr"><Phone className="size-3.5" />{msg.phone}</a>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      variant={msg.handledAt ? "ghost" : "success"}
                      size="sm"
                      onClick={() => {
                        markHandled(msg.id, !msg.handledAt);
                        if (!msg.handledAt) toast.success(ti("handledToast"));
                      }}
                    >
                      <CheckCheck /> {ti(msg.handledAt ? "reopen" : "markHandled")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => patch("contacts", msg.id, { read: !msg.read })}>
                      {msg.read ? <Mail /> : <MailOpen />} <span className="hidden sm:inline">{ti(msg.read ? "markUnread" : "markRead")}</span>
                    </Button>
                  </div>
                </div>
                <div className="flex-1 space-y-2 p-5">
                  <h2 className="text-lg font-bold text-ink">{msg.subject}</h2>
                  <p className="text-xs text-muted-foreground">{formatDateTime(msg.createdAt, lang)}</p>
                  {needsFollowUp(msg) && <p className="flex items-center gap-1.5 text-sm font-semibold text-danger"><AlarmClock className="size-4" /> {ti("overdueHint")}</p>}
                  {msg.handledAt && <p className="flex items-center gap-1.5 text-sm text-success"><CheckCheck className="size-4" /> {ti("handledOn", { date: formatDateTime(msg.handledAt, lang) })}</p>}
                  <p className="whitespace-pre-wrap pt-3 leading-relaxed">{msg.message}</p>
                </div>
                <div className="border-t bg-surface-2/50 p-4">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`${ti("reply")}…`} rows={3} className="bg-surface" />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={sendReply} loading={busy} disabled={reply.trim().length < 2}><Send className="" /> {ti("reply")}</Button>
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
              <div className="flex items-center gap-2">
                {q.answered ? (
                  <StatusBadge status="answered" />
                ) : (
                  <Button variant="secondary" onClick={() => { setPublish(q); setAnswer({ q: { ...l10n(), en: q.question }, a: l10n() }); }}>
                    <Sparkles /> {ti("toFaq")}
                  </Button>
                )}
                <RowActions
                  actions={[
                    { label: t("admin.rows.replyByEmail"), icon: <Mail />, onSelect: () => window.open(`mailto:${q.email}?subject=${encodeURIComponent(q.question)}`) },
                    {
                      label: t(q.answered ? "admin.rows.markUnanswered" : "admin.rows.markAnswered"),
                      icon: q.answered ? <RotateCcw /> : <CheckCheck />,
                      onSelect: () => {
                        patch("faqQuestions", q.id, { answered: !q.answered });
                        toast.success(t("common.toast.updated"));
                      },
                    },
                    {
                      label: t("common.actions.delete"),
                      icon: <Trash2 />,
                      tone: "danger",
                      separated: true,
                      onSelect: () =>
                        confirm({
                          title: t("admin.del.question.title"),
                          body: t("admin.del.question.body", { question: q.question }),
                          tone: "danger",
                          confirmLabel: t("admin.del.question.button"),
                          onConfirm: () => {
                            remove("faqQuestions", q.id);
                            toast.success(t("admin.del.question.done"));
                          },
                        }),
                    },
                  ]}
                />
              </div>
            </Card>
          ))}
          {questions.length === 0 && <Card><EmptyState title={t("common.table.noResults")} /></Card>}
        </div>
      )}

      <Dialog open={!!publish} onOpenChange={(v) => !v && setPublish(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{ti("toFaq")}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {LANGS.map((l) => (
              <div key={l} className="grid gap-3">
                <Field label={`${t("admin.cms.faq.question")} · ${l.toUpperCase()}`}><Input value={answer.q[l]} onChange={(e) => setAnswer({ ...answer, q: { ...answer.q, [l]: e.target.value } })} /></Field>
                <Field label={`${ti("answer")} · ${l.toUpperCase()}`}><Textarea rows={3} value={answer.a[l]} onChange={(e) => setAnswer({ ...answer, a: { ...answer.a, [l]: e.target.value } })} /></Field>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublish(null)}>{t("common.actions.cancel")}</Button>
            <Button
              disabled={!answer.q.en.trim() || !answer.a.en.trim()}
              onClick={() => {
                add("faqs", {
                  id: `faq-${Date.now()}`,
                  order: faqs.length + 1,
                  question: withFallback(answer.q),
                  answer: withFallback(answer.a),
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
      {dialog}
    </>
  );
}
