"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Eye, FileImage, FileText, FileX, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** A file as the prototype keeps it: a name, and a url when the browser actually has the file. */
export type FileRef = { name: string; url?: string; size?: number };

export const MAX_FILE_BYTES = 1_500_000;
/** "#" and empty urls mean the prototype only knows the file's name. */
const hasData = (f: FileRef) => !!f.url && f.url !== "#";
export const fileKind = (f: FileRef): "image" | "pdf" | "file" =>
  /^data:image\//.test(f.url ?? "") || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f.name) || /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(f.url ?? "")
    ? "image"
    : /^data:application\/pdf/.test(f.url ?? "") || /\.pdf$/i.test(f.name)
      ? "pdf"
      : "file";
export const fmtSize = (b: number) => (b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const save = (href: string, name: string) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

/** Reads a picked file: images and PDFs are kept as data URLs so they can be viewed and downloaded. */
export function readFile(f: File): Promise<FileRef | null> {
  if (f.size > MAX_FILE_BYTES) return Promise.resolve(null);
  if (!f.type.startsWith("image/") && f.type !== "application/pdf") return Promise.resolve({ name: f.name, url: "#", size: f.size });
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve({ name: f.name, url: String(r.result), size: f.size });
    r.onerror = () => resolve(null);
    r.readAsDataURL(f);
  });
}

/**
 * View and Download for any file the dashboard shows. View opens the image or PDF; a file the prototype
 * only knows by name opens a short notice instead. `render` draws a file that is generated rather than
 * stored (a payment confirmation), and Download then saves that drawing as an image.
 */
export function useFileActions() {
  const t = useTranslations("common.files");
  const [open, setOpen] = useState<{ file: FileRef; render?: React.ReactNode; autoDownload?: boolean } | null>(null);
  const drawn = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const downloadDrawn = async (file: FileRef) => {
    const node = drawn.current?.firstElementChild as HTMLElement | null;
    if (!node) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      save(await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff" }), file.name.replace(/\.[^.]+$/, "") + ".png");
    } catch {
      toast.error(t("downloadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const download = async (file: FileRef, render?: React.ReactNode) => {
    if (hasData(file)) return save(file.url!, file.name);
    // a generated file is drawn in the viewer first, then saved from there
    if (render) return setOpen({ file, render, autoDownload: true });
    // only the name is known: hand out a one-page PDF that says so
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      pdf.setFontSize(16);
      pdf.text(file.name, 20, 30);
      pdf.setFontSize(11);
      pdf.text(t("placeholderPdf"), 20, 42, { maxWidth: 170 });
      pdf.save(/\.pdf$/i.test(file.name) ? file.name : `${file.name}.pdf`);
    } catch {
      toast.error(t("downloadFailed"));
    }
  };

  useEffect(() => {
    if (!open?.autoDownload) return;
    const id = setTimeout(() => downloadDrawn(open.file).then(() => setOpen((o) => (o ? { ...o, autoDownload: false } : o))), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const view = (file: FileRef, render?: React.ReactNode) => setOpen({ file, render });

  const kind = open ? fileKind(open.file) : "file";
  const dialog = (
    <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate pe-8">{open?.file.name}</DialogTitle>
        </DialogHeader>
        {open &&
          (open.render ? (
            <div ref={drawn} className="mx-auto w-full max-w-lg">{open.render}</div>
          ) : hasData(open.file) && kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={open.file.url} alt={open.file.name} className="mx-auto max-h-[70vh] rounded-lg border object-contain" />
          ) : hasData(open.file) && kind === "pdf" ? (
            <iframe src={open.file.url} title={open.file.name} className="h-[70vh] w-full rounded-lg border" />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-surface-2/50 px-6 py-10 text-center">
              <FileText className="size-10 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">{t("noPreview")}</p>
            </div>
          ))}
        <div className="flex justify-end">
          <Button variant="outline" loading={busy} onClick={() => open && (open.render && !hasData(open.file) ? downloadDrawn(open.file) : download(open.file))}>
            <Download /> {t("download")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { view, download, dialog };
}

/** Small icon buttons: View and Download, for rows that lay out their own file details. */
export function FileButtons({ file, render, actions }: { file: FileRef; render?: React.ReactNode; actions: ReturnType<typeof useFileActions> }) {
  const t = useTranslations("common.files");
  return (
    <>
      <Button size="icon-sm" variant="ghost" aria-label={t("view")} title={t("view")} onClick={() => actions.view(file, render)}><Eye /></Button>
      <Button size="icon-sm" variant="ghost" aria-label={t("download")} title={t("download")} onClick={() => actions.download(file, render)}><Download /></Button>
    </>
  );
}

/** A hidden file input behind a button: picks, reads and hands back one file. */
export function UploadButton({ onFile, accept = ".pdf,image/*", label, variant = "outline", size = "sm", className }: {
  onFile: (f: FileRef) => void;
  accept?: string;
  label: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const t = useTranslations("common.files");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button type="button" size={size} variant={variant} className={className} onClick={() => ref.current?.click()}>
        <Upload /> {label}
      </Button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={async (e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (!picked) return;
          const f = await readFile(picked);
          if (!f) return toast.error(t("tooBig"));
          onFile(f);
        }}
      />
    </>
  );
}

/**
 * One file as a compact card: type icon, name and details, then View, Download and Upload / Replace.
 * Without a file it says so and offers Upload, so an empty slot never looks broken.
 */
export function FileCard({ file, meta, badge, render, onUpload, accept, emptyText, className }: {
  file?: FileRef | null;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  /** draws a generated file (no stored url) for View and Download */
  render?: React.ReactNode;
  onUpload?: (f: FileRef) => void;
  accept?: string;
  emptyText?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("common.files");
  const actions = useFileActions();

  if (!file)
    return (
      <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3", className)}>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground"><FileX className="size-5" /></span>
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{emptyText ?? t("empty")}</p>
        {onUpload && <UploadButton onFile={onUpload} accept={accept} label={t("upload")} />}
      </div>
    );

  const kind = fileKind(file);
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border bg-surface p-3", className)}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", kind === "pdf" ? "bg-danger-soft text-danger" : kind === "image" ? "bg-info-soft text-info" : "bg-primary-soft text-primary")}>
        {kind === "image" ? <FileImage className="size-5" /> : <FileText className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink" title={file.name}>{file.name}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {badge}
          {[file.size ? fmtSize(file.size) : null, meta].filter(Boolean).map((x, i) => (
            <span key={i}>{i > 0 && "· "}{x}</span>
          ))}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => actions.view(file, render)}><Eye /> {t("view")}</Button>
        <Button size="sm" variant="outline" onClick={() => actions.download(file, render)}><Download /> {t("download")}</Button>
        {onUpload && <UploadButton onFile={onUpload} accept={accept} label={t("replace")} variant="ghost" />}
      </div>
      {actions.dialog}
    </div>
  );
}
