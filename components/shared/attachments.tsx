"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileText, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import type { MessageAttachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { downscaleImage } from "@/lib/image";
import { Button } from "@/components/ui/button";

/** The prototype keeps attachments in localStorage, so each file stays small. */
const MAX_BYTES = 2_000_000;
const MAX_FILES = 5;
const ACCEPT = "image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const isDoc = (f: File) => f.type === "application/pdf" || /\.(pdf|docx?)$/i.test(f.name);

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

const kb = (n: number) => (n < 1_000_000 ? `${Math.max(1, Math.round(n / 1000))} KB` : `${(n / 1_000_000).toFixed(1)} MB`);

/**
 * "Attach file" for a message: images (scaled down), PDF or Word, up to five per message. Shows the
 * picked files as chips that can be removed again before sending.
 */
export function AttachmentPicker({ value, onChange, className }: { value: MessageAttachment[]; onChange: (v: MessageAttachment[]) => void; className?: string }) {
  const t = useTranslations("portal.messages");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const add = async (files: File[]) => {
    setBusy(true);
    const next = [...value];
    for (const file of files) {
      if (next.length >= MAX_FILES) {
        toast.error(t("attachMax", { max: MAX_FILES }));
        break;
      }
      const image = file.type.startsWith("image/");
      if (!image && !isDoc(file)) {
        toast.error(t("attachType", { name: file.name }));
        continue;
      }
      try {
        const { url, size } = image ? await downscaleImage(file, 1600) : { url: await readAsDataUrl(file), size: file.size };
        if (size > MAX_BYTES) {
          toast.error(t("attachTooBig", { name: file.name }));
          continue;
        }
        next.push({ name: file.name, url, type: image ? "image" : "file", size });
      } catch {
        toast.error(t("attachType", { name: file.name }));
      }
    }
    onChange(next);
    setBusy(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void add(files);
        }}
      />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((a, i) => (
            <li key={`${a.name}-${i}`} className="flex max-w-full items-center gap-2 rounded-lg border bg-surface py-1 ps-1 pe-1.5 text-xs">
              {a.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URLs from uploads
                <img src={a.url} alt="" className="size-7 rounded object-cover" />
              ) : (
                <span className="flex size-7 items-center justify-center rounded bg-primary-soft text-primary"><FileText className="size-4" /></span>
              )}
              <span className="min-w-0 truncate font-medium text-ink">{a.name}</span>
              <span className="shrink-0 text-muted-foreground">{kb(a.size)}</span>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t("attachRemove", { name: a.name })}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button type="button" variant="outline" size="sm" loading={busy} disabled={value.length >= MAX_FILES} onClick={() => input.current?.click()}>
          <Paperclip /> {t("attach")}
        </Button>
        <span className="text-xs text-muted-foreground">{t("attachHint")}</span>
      </div>
    </div>
  );
}

/** Attachments inside a sent message: image thumbnails and file chips, each downloadable. */
export function MessageAttachments({ items, mine }: { items: MessageAttachment[]; mine?: boolean }) {
  const t = useTranslations("portal.messages");
  if (!items.length) return null;
  const images = items.filter((a) => a.type === "image");
  const files = items.filter((a) => a.type !== "image");
  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((a, i) => (
            <a key={`${a.name}-${i}`} href={a.url} download={a.name} title={t("attachDownload", { name: a.name })} className="block overflow-hidden rounded-lg border border-white/30">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URLs from uploads */}
              <img src={a.url} alt={a.name} className="h-24 w-32 object-cover" />
            </a>
          ))}
        </div>
      )}
      {files.map((a, i) => (
        <a
          key={`${a.name}-${i}`}
          href={a.url}
          download={a.name}
          className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium", mine ? "bg-white/15 text-white hover:bg-white/25" : "bg-surface-2 text-ink hover:bg-muted")}
        >
          <FileText className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{a.name}</span>
          <span className={cn("shrink-0", mine ? "text-white/70" : "text-muted-foreground")}>{kb(a.size)}</span>
          <Download className="size-3.5 shrink-0" />
        </a>
      ))}
    </div>
  );
}
