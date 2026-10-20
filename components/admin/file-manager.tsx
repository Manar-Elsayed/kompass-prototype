"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, ImageIcon, Lock, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DOC_KEYS, type CompanyFile, type FileCategory } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang, usePartnerMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioCards } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, useConfirm } from "@/components/shared/bits";

const CATEGORIES: FileCategory[] = ["logo", "photo", "document", "other"];
const MAX_BYTES = 1_500_000;

/** A row in the manager: an uploaded file, or one of the company's required documents (read-only here). */
type Entry = CompanyFile & { required?: boolean };

const fmtSize = (b: number) => (b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const isImage = (e: Entry) => e.category === "logo" || e.category === "photo";

/**
 * Files kept for companies: logos, photos and other documents, plus each company's three required
 * documents (managed on its Documents tab). Scoped to one company when `partnerId` is given.
 */
export function FileManager({ partnerId }: { partnerId?: string }) {
  const t = useTranslations("admin.files");
  const tp = useTranslations("admin.partners");
  const lang = useLang();
  const files = useStore((s) => s.files);
  const partners = useStore((s) => s.partners);
  const remove = useStore((s) => s.remove);
  const partnerMap = usePartnerMap();
  const { confirm, dialog } = useConfirm();
  const [company, setCompany] = useState("all");
  const [category, setCategory] = useState<"all" | FileCategory | "required">("all");
  const [uploading, setUploading] = useState(false);

  const entries: Entry[] = useMemo(() => {
    const scope = partners.filter((p) => (partnerId ? p.id === partnerId : true));
    const required: Entry[] = scope.flatMap((p) =>
      DOC_KEYS.flatMap((k) => {
        const d = p.documents[k];
        return d ? [{ id: `${p.id}-${k}`, partnerId: p.id, name: `${tp(k)} · ${d.file}`, category: "document" as const, url: "#", size: 0, uploadedBy: "company" as const, uploadedAt: d.uploadedAt, required: true }] : [];
      }),
    );
    // uploaded files first (newest first), then the required documents
    const byDate = (a: Entry, b: Entry) => b.uploadedAt.localeCompare(a.uploadedAt);
    return [...files.filter((f) => (partnerId ? f.partnerId === partnerId : true)).sort(byDate), ...required.sort(byDate)];
  }, [files, partners, partnerId, tp]);

  const shown = entries.filter(
    (e) =>
      (partnerId || company === "all" || e.partnerId === company) &&
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
      <div className="mb-4 flex flex-wrap items-end gap-2">
        {!partnerId && (
          <div className="w-56">
            <Select value={company} onValueChange={setCompany} options={[{ value: "all", label: t("allCompanies") }, ...partners.filter((p) => p.status !== "rejected").map((p) => ({ value: p.id, label: p.name }))]} />
          </div>
        )}
        <div className="w-48">
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as typeof category)}
            options={[{ value: "all", label: t("allCategories") }, ...CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) })), { value: "required", label: t("categories.required") }]}
          />
        </div>
        <Button className="ms-auto" onClick={() => setUploading(true)}>
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
                {!partnerId && <p className="truncate text-xs text-muted-foreground">{partnerMap[e.partnerId]?.name}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge tone={e.required ? "primary" : "neutral"}>{e.required ? t("categories.required") : t(`categories.${e.category}`)}</Badge>
                  {e.size > 0 && fmtSize(e.size)} · {formatDate(e.uploadedAt, lang)} · {t(`by.${e.uploadedBy}`)}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {e.url !== "#" && (
                  <Button asChild size="icon-sm" variant="ghost" aria-label={t("open")}>
                    <a href={e.url} target="_blank" rel="noreferrer"><ExternalLink /></a>
                  </Button>
                )}
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
      {uploading && <UploadFileDialog partnerId={partnerId ?? (company !== "all" ? company : undefined)} fixed={!!partnerId} onClose={() => setUploading(false)} />}
      {dialog}
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

  const pick = (f: File) => {
    if (f.size > MAX_BYTES) return toast.error(t("tooBig"));
    // images are kept as data URLs so they show in the prototype; other files keep their name only
    if (!f.type.startsWith("image/")) return setFile({ name: f.name, url: "#", size: f.size });
    const r = new FileReader();
    r.onload = () => setFile({ name: f.name, url: String(r.result), size: f.size });
    r.readAsDataURL(f);
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
