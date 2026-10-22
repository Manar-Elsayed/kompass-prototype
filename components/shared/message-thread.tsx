"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import type { CompanyMessage } from "@/lib/types";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/controls";
import { EmptyState } from "@/components/shared/bits";

type Viewer = CompanyMessage["from"];

export interface Thread {
  id: string;
  subject: string;
  topic: CompanyMessage["topic"];
  messages: CompanyMessage[]; // oldest first
  last: CompanyMessage;
  /** Messages from the other side the viewer hasn't read. */
  unread: number;
}

/** Group a company's messages into conversations, most recent activity first. */
export function useThreads(partnerId: string, viewer: Viewer) {
  const all = useStore((s) => s.messages);
  return useMemo(() => {
    const byId = new Map<string, CompanyMessage[]>();
    for (const m of all) {
      if (m.partnerId !== partnerId) continue;
      byId.set(m.threadId, [...(byId.get(m.threadId) ?? []), m]);
    }
    const threads: Thread[] = [...byId.entries()].map(([id, list]) => {
      const messages = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const root = messages.find((m) => m.id === id) ?? messages[0];
      return { id, subject: root.subject, topic: root.topic, messages, last: messages[messages.length - 1], unread: messages.filter((m) => m.from !== viewer && !m.readAt).length };
    });
    return threads.sort((a, b) => b.last.createdAt.localeCompare(a.last.createdAt));
  }, [all, partnerId, viewer]);
}

/**
 * Conversations between Kompass and one company: a list and the open thread with a reply box.
 * The same component serves the portal (viewer "company") and the admin company page (viewer "kompass").
 * On narrow screens the list and the thread take turns.
 */
export function MessageCenter({
  partnerId,
  viewer,
  selected,
  onSelect,
  empty,
  partnerName,
}: {
  partnerId: string;
  viewer: Viewer;
  selected: string | null;
  onSelect: (threadId: string | null) => void;
  empty?: React.ReactNode;
  partnerName: string;
}) {
  const t = useTranslations("portal.messages");
  const lang = useLang();
  const threads = useThreads(partnerId, viewer);
  const open = threads.find((x) => x.id === selected);

  return (
    <div className="grid min-h-[480px] overflow-hidden rounded-xl border bg-surface shadow-card md:grid-cols-[320px_1fr]">
      <ul className={cn("divide-y overflow-y-auto border-e md:max-h-[640px]", open && "hidden md:block")}>
        {threads.length ? (
          threads.map((th) => (
            <li key={th.id}>
              <button
                onClick={() => onSelect(th.id)}
                className={cn("flex w-full flex-col gap-1 px-4 py-3 text-start transition hover:bg-surface-2/70", th.id === selected && "bg-primary-soft/50")}
                aria-current={th.id === selected ? "true" : undefined}
              >
                <span className="flex items-center gap-2">
                  <span className={cn("min-w-0 flex-1 truncate text-sm", th.unread ? "font-bold text-ink" : "font-semibold text-foreground")}>{th.subject}</span>
                  {th.unread > 0 && <span className="size-2 shrink-0 rounded-full bg-accent" aria-label={t("unread")} />}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {th.last.from === viewer ? `${t("you")}: ` : ""}
                  {th.last.body}
                </span>
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">{t(`topics.${th.topic}`)}</Badge>
                  {timeAgo(th.last.createdAt, lang)}
                </span>
              </button>
            </li>
          ))
        ) : (
          <li>{empty ?? <EmptyState icon={<Mail />} title={t("empty")} className="py-12" />}</li>
        )}
      </ul>
      <div className={cn("min-w-0 flex-col", open ? "flex" : "hidden md:flex")}>
        {open ? (
          <ThreadView key={open.id} thread={open} viewer={viewer} partnerId={partnerId} partnerName={partnerName} onBack={() => onSelect(null)} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">{threads.length ? t("pick") : null}</div>
        )}
      </div>
    </div>
  );
}

function ThreadView({ thread, viewer, partnerId, partnerName, onBack }: { thread: Thread; viewer: Viewer; partnerId: string; partnerName: string; onBack: () => void }) {
  const t = useTranslations("portal.messages");
  const lang = useLang();
  const users = useStore((s) => s.users);
  const send = useStore((s) => s.sendMessage);
  const markRead = useStore((s) => s.markThreadRead);
  const { user } = useCurrentUser();
  const [body, setBody] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thread.unread) markRead(thread.id, viewer);
  }, [thread.id, thread.unread, viewer, markRead]);
  // braces matter: newer browsers return a Promise from scrollIntoView, which React would treat as a cleanup
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [thread.messages.length]);

  const author = (m: CompanyMessage) => (m.from === "company" ? partnerName : `${users.find((u) => u.id === m.byUserId)?.name ?? "Kompass"} · Kompass`);
  const reply = () => {
    if (body.trim().length < 2) return;
    send({ partnerId, from: viewer, threadId: thread.id, body, byUserId: viewer === "kompass" ? user?.id : undefined });
    setBody("");
    toast.success(t("sent"));
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onBack} aria-label={t("back")}><ArrowLeft /></Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{thread.subject}</p>
          <p className="text-xs text-muted-foreground">{t(`topics.${thread.topic}`)} · {t("count", { count: thread.messages.length })}</p>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto bg-surface-2/40 p-4 md:max-h-[480px]">
        {thread.messages.map((m) => {
          const mine = m.from === viewer;
          return (
            <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
              <Avatar name={m.from === "company" ? partnerName : "Kompass"} className="size-8" />
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm", mine ? "rounded-se-sm bg-primary text-white" : "rounded-ss-sm border bg-surface")}>
                <p className={cn("mb-0.5 text-xs font-semibold", mine ? "text-white/80" : "text-muted-foreground")}>{author(m)}</p>
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={cn("mt-1 text-[11px]", mine ? "text-white/70" : "text-muted-foreground")}>
                  {formatDateTime(m.createdAt, lang)}
                  {mine && ` · ${m.readAt ? t("seen") : t("delivered")}`}
                  {m.channel === "email" && ` · ${t("alsoEmailed")}`}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) reply();
          }}
          placeholder={t("replyPh")}
          aria-label={t("reply")}
          className="min-h-0 flex-1 resize-none"
        />
        <Button onClick={reply} disabled={body.trim().length < 2}><Send /> <span className="hidden sm:inline">{t("send")}</span></Button>
      </div>
    </>
  );
}
