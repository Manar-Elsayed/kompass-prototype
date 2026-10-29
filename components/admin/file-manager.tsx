"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, ImageIcon, Lock, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DOC_KEYS, type CompanyFile, type FileCategory } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioCards } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, useConfirm } from "@/components/shared/bits";
import { FileButtons, readFile, useFileActions } from "@/components/shared/file-card";

const CATEGORIES: FileCategory[] = ["logo", "photo", "document", "other"];
const MAX_BYTES = 1_500_000;

/** A row in the manager: an uploaded file, or one of the company's required documents (read-only here). */
type Entry = CompanyFile & { required?: boolean };

const fmtSize = (b: number) => (b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const isImage = (e: Entry) => e.category === "logo" || e.category === "photo";

/**
 * One company's folder: logos, photos and other documents, plus its required documents (managed on
 * its Documents tab), with a search, a category filter and Upload.
 */
export function FileManager({ partnerId }: { partnerId: string }) {
  const t = useTranslations("admin.files");
  const tp = useTranslations("admin.partners");
  const lang = useLang();
  const files = useStore((s) => s.files);
  const partners = useStore((s) => s.partners);
  const remove = useStore((s) => s.remove);
  const { confirm, dialog } = useConfirm();
  const fileActions = useFileActions();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<"all" | FileCategory | "required">("all");
  const [uploading, setUploading] = useState(false);

  const entries: Entry[] = useMemo(() => {
    const scope = partners.filter((p) => p.id === partnerId);
    const required: Entry[] = scope.flatMap((p) =>
      DOC_KEYS.flatMap((k) => {
        const d = p.documents[k];
        return d ? [{ id: `${p.id}-${k}`, partnerId: p.id, name: `${tp(k)} · ${d.file}`, category: "document" as const, url: "#", size: 0, uploadedBy: "company" as const, uploadedAt: d.uploadedAt, required: true }] : [];
      }),
    );
    // uploaded files first (newest first), then the required documents
    const byDate = (a: Entry, b: Entry) => b.uploadedAt.localeCompare(a.uploadedAt);
    return [...files.filter((f) => f.partnerId === partnerId).sort(byDate), ...required.sort(byDate)];
  }, [files, partners, partnerId, tp]);

  const shown = entries.filter(
    (e) =>
      (!q.trim() || e.name.toLowerCase().includes(q.trim().toLowerCase())) &&
      (category === "all" || (category === "required" ? e.required : !e.required && e.category === category)),
  );

  const del = (e: Entry) =>
    confirm({
      title: t("deleteTitle", { name: e.name }),
      body: t("deleteBody"),
      tone: "danger",
      confirmLabel: t("delete"),
      onConfirm: () => {
        remove("files", e.id);
        toast.success(t("deleted"));
      },
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchFiles")} className="ps-9" />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as typeof category)}
            options={[{ value: "all", label: t("allCategories") }, ...CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) })), { value: "required", label: t("categories.required") }]}
          />
        </div>
        <Button onClick={() => setUploading(true)}>
          <Upload /> {t("upload")}
        </Button>
      </div>

      {shown.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((e) => (
            <li key={e.id} className="flex gap-3 rounded-xl border bg-surface p-3">
              <span className={cn("flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg", isImage(e) ? "bg-surface-2" : "bg-primary-soft text-primary")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {isImage(e) ? <img src={e.url} alt="" className="size-full object-cover" /> : <FileText className="size-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink" title={e.name}>{e.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge tone={e.required ? "primary" : "neutral"}>{e.required ? t("categories.required") : t(`categories.${e.category}`)}</Badge>
                  {e.size > 0 && fmtSize(e.size)} · {formatDate(e.uploadedAt, lang)} · {t(`by.${e.uploadedBy}`)}
                </p>
              </div>
              <div className="flex items-start gap-0.5">
                <FileButtons file={{ name: e.name, url: e.url, size: e.size }} actions={fileActions} />
                {e.required ? (
                  <span className="flex size-8 items-center justify-center text-muted-foreground" title={t("requiredHint")}><Lock className="size-4" /></span>
                ) : (
                  <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => del(e)}><Trash2 /></Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<ImageIcon />} title={t("empty")} />
      )}
      {uploading && <UploadFileDialog partnerId={partnerId} fixed onClose={() => setUploading(false)} />}
      {dialog}
      {fileActions.dialog}
    </div>
  );
}

function UploadFileDialog({ partnerId, fixed, onClose }: { partnerId?: string; fixed: boolean; onClose: () => void }) {
  const t = useTranslations("admin.files");
  const tc = useTranslations("common.actions");
  const partners = useStore((s) => s.partners).filter((p) => p.status !== "rejected");
  const files = useStore((s) => s.files);
  const add = useStore((s) => s.add);
  const ref = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState(partnerId ?? partners[0]?.id ?? "");
  const [category, setCategory] = useState<FileCategory>("photo");
  const [file, setFile] = useState<{ name: string; url: string; size: number } | null>(null);

  const pick = async (f: File) => {
    if (f.size > MAX_BYTES) return toast.error(t("tooBig"));
    // images and PDFs are kept as data URLs so they can be viewed and downloaded; other files keep their name only
    const read = await readFile(f);
    if (read) setFile({ name: read.name, url: read.url ?? "#", size: read.size ?? f.size });
  };

  const save = () => {
    if (!file || !company) return;
    const next = Math.max(0, ...files.map((x) => Number(x.id.replace(/\D/g, "")) || 0)) + 1;
    add("files", { id: `F-${String(next).padStart(4, "0")}`, partnerId: company, name: file.name, category, url: file.url, size: file.size, uploadedBy: "admin", uploadedAt: new Date().toISOString() });
    toast.success(t("uploaded"));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("upload")}</DialogTitle>
        </DialogHeader>
        {!fixed && (
          <Field label={t("company")} required>
            <Select value={company} onValueChange={setCompany} options={partners.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
        )}
        <Field label={t("category")}>
          <RadioCards className="grid-cols-2" value={category} onValueChange={(v) => setCategory(v as FileCategory)} options={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))} />
        </Field>
        <Field label={t("file")} hint={t("maxSize")}>
          <div className="flex items-center gap-3 rounded-xl border border-dashed p-3">
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{file?.name ?? t("noFile")}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>{t("choose")}</Button>
            <Input ref={ref} type="file" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          </div>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={save} disabled={!file || !company}><Upload /> {t("upload")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
