"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Faq } from "@/lib/types";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, useConfirm } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";

export default function FaqsAdmin() {
  const t = useTranslations();
  const tf = useTranslations("admin.cms.faq");
  const L = useL();
  const faqs = useStore((s) => s.faqs);
  const add = useStore((s) => s.add);
  const patch = useStore((s) => s.patch);
  const remove = useStore((s) => s.remove);
  const { confirm, dialog } = useConfirm();
  const [draft, setDraft] = useState<Faq | null>(null);
  const sorted = [...faqs].sort((a, b) => a.order - b.order);

  const move = (i: number, d: -1 | 1) => {
    const a = sorted[i];
    const b = sorted[i + d];
    patch("faqs", a.id, { order: b.order });
    patch("faqs", b.id, { order: a.order });
  };

  const save = () => {
    if (!draft || !draft.question.en.trim()) return;
    if (draft.id) patch("faqs", draft.id, draft);
    else add("faqs", { ...draft, id: `faq-${Date.now()}`, order: (sorted.at(-1)?.order ?? 0) + 1 });
    toast.success(t("common.toast.saved"));
    setDraft(null);
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("admin.cms.title"), href: "/admin/cms" }, { label: tf("title") }]}
        title={tf("title")}
        subtitle={tf("subtitle")}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/faqs" target="_blank"><ExternalLink /> {t("admin.cms.viewOnSite")}</Link></Button>
            <Button onClick={() => setDraft({ id: "", order: 0, question: { en: "", ar: "" }, answer: { en: "", ar: "" } })}><Plus /> {tf("add")}</Button>
          </>
        }
      />
      <Card className="divide-y">
        {sorted.map((f, i) => (
          <div key={f.id} className="flex items-start gap-4 p-4">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{L(f.question)}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{L(f.answer)}</p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={tf("moveUp")}><ArrowUp /></Button>
              <Button variant="ghost" size="icon-sm" disabled={i === sorted.length - 1} onClick={() => move(i, 1)} aria-label={tf("moveDown")}><ArrowDown /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setDraft(f)} aria-label={t("common.actions.edit")}><Pencil /></Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-danger hover:bg-danger-soft"
                aria-label={t("common.actions.delete")}
                onClick={() => confirm({ title: t("common.confirm.title"), body: L(f.question), tone: "danger", confirmLabel: t("common.actions.delete"), onConfirm: () => { remove("faqs", f.id); toast.success(t("common.toast.deleted")); } })}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        {sorted.length === 0 && <EmptyState title={t("common.table.noResults")} />}
      </Card>

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{draft?.id ? t("common.actions.edit") : tf("add")}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={`${tf("question")} · EN`} required><Input dir="ltr" value={draft.question.en} onChange={(e) => setDraft({ ...draft, question: { ...draft.question, en: e.target.value } })} /></Field>
              <Field label={`${tf("question")} · AR`}><Input dir="rtl" value={draft.question.ar} onChange={(e) => setDraft({ ...draft, question: { ...draft.question, ar: e.target.value } })} /></Field>
              <Field label={`${tf("answer")} · EN`}><Textarea dir="ltr" rows={5} value={draft.answer.en} onChange={(e) => setDraft({ ...draft, answer: { ...draft.answer, en: e.target.value } })} /></Field>
              <Field label={`${tf("answer")} · AR`}><Textarea dir="rtl" rows={5} value={draft.answer.ar} onChange={(e) => setDraft({ ...draft, answer: { ...draft.answer, ar: e.target.value } })} /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>{t("common.actions.cancel")}</Button>
            <Button onClick={save} disabled={!draft?.question.en.trim()}>{t("common.actions.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
