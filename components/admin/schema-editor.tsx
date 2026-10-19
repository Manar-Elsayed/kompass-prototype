"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { LANGS, type L10n, type Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/controls";
import { Icon, ICON_NAMES } from "@/components/shared/icon";
import { RichText } from "./rich-text";

/* ------------------------------------------------------------------
   Schema-driven bilingual editor.
   Legacy admin had ~20 hand-written Formik forms (home/Form 23 KB,
   partners-page/Form 22 KB, about-us/Form 20 KB…). Here every page is a
   declarative field list rendered by one component.
------------------------------------------------------------------- */

export type FieldDef =
  | { type: "text" | "textarea" | "richtext"; key: string; label: string; rows?: number }
  | { type: "plain"; key: string; label: string; ltr?: boolean }
  | { type: "number"; key: string; label: string }
  | { type: "boolean"; key: string; label: string }
  | { type: "image"; key: string; label: string }
  | { type: "icon"; key: string; label: string }
  | { type: "group"; key: string; label: string; fields: FieldDef[] }
  | { type: "list"; key: string; label: string; fields: FieldDef[]; make: () => Record<string, unknown>; itemTitle?: (item: Record<string, unknown>, i: number) => string };

export type LangMode = "both" | Lang;

type Obj = Record<string, unknown>;

const LIBRARY = ["/images/hero.png", "/images/about-hero.png", "/images/about-target.png", "/images/blog.png", "/images/blogs-hero.png", "/images/companies.png", "/images/contact.png", "/images/faq.png", "/images/start-now.png", "/images/hero-illustration.png", "/images/home-faq.png"];

export function SchemaEditor({
  fields,
  value,
  onChange,
  mode,
}: {
  fields: FieldDef[];
  value: Obj;
  onChange: (v: Obj) => void;
  mode: LangMode;
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-5">
      {fields.map((f) => (
        <FieldRenderer key={f.key} def={f} value={value[f.key]} onChange={(v) => set(f.key, v)} mode={mode} />
      ))}
    </div>
  );
}

function L10nInputs({
  value,
  onChange,
  mode,
  kind,
  rows,
}: {
  value: L10n;
  onChange: (v: L10n) => void;
  mode: LangMode;
  kind: "text" | "textarea" | "richtext";
  rows?: number;
}) {
  const langs = mode === "both" ? LANGS : [mode];
  return (
    <div className={cn("grid gap-3", mode === "both" && "xl:grid-cols-2")}>
      {langs.map((l) => {
        const dir = l === "ar" ? "rtl" : "ltr";
        const v = value?.[l] ?? "";
        const missing = !v.trim() || v === "<p></p>";
        return (
          <div key={l} className="relative">
            <span
              className={cn(
                "pointer-events-none absolute -top-2 end-2 z-10 rounded px-1.5 text-[10px] font-bold uppercase leading-4",
                missing ? "bg-warning-soft text-warning" : "bg-surface-2 text-muted-foreground",
              )}
            >
              {l}
            </span>
            {kind === "text" && <Input value={v} dir={dir} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />}
            {kind === "textarea" && <Textarea value={v} dir={dir} rows={rows ?? 3} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />}
            {kind === "richtext" && <RichText value={v} dir={dir} onChange={(html) => onChange({ ...value, [l]: html })} />}
          </div>
        );
      })}
    </div>
  );
}

function FieldRenderer({ def, value, onChange, mode }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void; mode: LangMode }) {
  const t = useTranslations("admin.cms");
  const tc = useTranslations("common.actions");

  switch (def.type) {
    case "text":
    case "textarea":
    case "richtext":
      return (
        <Field label={def.label}>
          <L10nInputs value={value as L10n} onChange={onChange} mode={mode} kind={def.type} rows={def.rows} />
        </Field>
      );
    case "plain":
      return (
        <Field label={def.label}>
          <Input value={(value as string) ?? ""} dir={def.ltr ? "ltr" : undefined} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
    case "number":
      return (
        <Field label={def.label}>
          <Input type="number" className="max-w-40" dir="ltr" value={(value as number) ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
        </Field>
      );
    case "boolean":
      return (
        <label className="flex items-center justify-between gap-4 rounded-xl border p-4 text-sm font-semibold">
          {def.label}
          <Switch checked={!!value} onCheckedChange={onChange} />
        </label>
      );
    case "icon":
      return (
        <Field label={def.label}>
          <Select
            value={value as string}
            onValueChange={onChange}
            options={ICON_NAMES.map((n) => ({ value: n, label: <span className="flex items-center gap-2"><Icon name={n} className="size-4" />{n}</span> }))}
          />
        </Field>
      );
    case "group":
      return (
        <fieldset className="rounded-xl border p-4">
          <legend className="px-1 text-[13px] font-semibold text-foreground">{def.label}</legend>
          <SchemaEditor fields={def.fields} value={(value as Obj) ?? {}} onChange={onChange} mode={mode} />
        </fieldset>
      );
    case "image":
      return <ImageField label={def.label} value={value as string} onChange={onChange} />;
    case "list": {
      const items = (value as Obj[]) ?? [];
      const update = (i: number, v: Obj) => onChange(items.map((x, j) => (j === i ? v : x)));
      const move = (i: number, d: -1 | 1) => {
        const next = [...items];
        const [x] = next.splice(i, 1);
        next.splice(i + d, 0, x);
        onChange(next);
      };
      return (
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-foreground">{def.label}</legend>
          <div className="space-y-3">
            {items.map((item, i) => (
              <Card key={i} className="bg-surface-2/40 p-4 shadow-none">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {def.itemTitle?.(item, i) ?? t("item", { n: i + 1 })}
                  </p>
                  <div className="flex gap-0.5">
                    <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Up"><ArrowUp /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Down"><ArrowDown /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t("removeItem")}><Trash2 /></Button>
                  </div>
                </div>
                <SchemaEditor fields={def.fields} value={item} onChange={(v) => update(i, v)} mode={mode} />
              </Card>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, def.make()])}>
              <Plus /> {t("addItem")}
            </Button>
          </div>
        </fieldset>
      );
    }
    default:
      return <span>{tc("edit")}</span>;
  }
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const t = useTranslations("common.actions");
  const ref = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const onFile = (f: File) => {
    if (f.size > 1_500_000) {
      toast.error("Max 1.5 MB (stored in your browser for the prototype)");
      return;
    }
    const r = new FileReader();
    r.onload = () => onChange(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <Field label={label}>
      <div className="flex items-center gap-4 rounded-xl border p-3">
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          {value ? <Image src={value} alt="" fill className="object-cover" sizes="128px" unoptimized={value.startsWith("data:")} /> : <ImageIcon className="absolute inset-0 m-auto size-6 text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
            <Upload /> {t("upload")}
          </Button>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm"><ImageIcon /> Library</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="start">
              <div className="grid grid-cols-3 gap-2">
                {LIBRARY.map((src) => (
                  <button
                    type="button"
                    key={src}
                    onClick={() => { onChange(src); setOpen(false); }}
                    className={cn("relative aspect-[4/3] overflow-hidden rounded-md ring-offset-2 transition hover:ring-2 hover:ring-primary", value === src && "ring-2 ring-primary")}
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="96px" />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
    </Field>
  );
}

/* ---------- path helpers ---------- */
export function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}
