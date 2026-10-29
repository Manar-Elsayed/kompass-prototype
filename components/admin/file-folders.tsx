"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, FolderPlus, LayoutGrid, List, Search, SearchX } from "lucide-react";
import { toast } from "sonner";
import { DOC_KEYS, type Partner } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useLang } from "@/lib/mock/hooks";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompanyLogo } from "@/components/shared/company-logo";

type View = "list" | "board";
const VIEW_KEY = "kompass-files-view";

/** A company's folder: its uploaded files plus the required documents it sent. */
export type Folder = { partner: Partner; count: number; updatedAt?: string };

/** Every company that has a folder: one with files or documents, or one Kompass created. */
export function useFolders() {
  const files = useStore((s) => s.files);
  const partners = useStore((s) => s.partners);
  return useMemo(() => {
    const all: Folder[] = partners
      .filter((p) => p.status !== "rejected")
      .map((p) => {
        const dates = [...files.filter((f) => f.partnerId === p.id).map((f) => f.uploadedAt), ...DOC_KEYS.flatMap((k) => (p.documents[k] ? [p.documents[k]!.uploadedAt] : []))].sort();
        return { partner: p, count: dates.length, updatedAt: dates.at(-1) };
      });
    const has = (f: Folder) => f.count > 0 || !!f.partner.filesFolderAt;
    // most recently updated first; new empty folders at the end
    const folders = all.filter(has).sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.partner.name.localeCompare(b.partner.name));
    return { folders, without: all.filter((f) => !has(f)).map((f) => f.partner) };
  }, [files, partners]);
}

/**
 * The Files home: one folder per company, as a list or a board, with a search for companies and
 * Create folder for a company that has none yet.
 */
export function FileFolders() {
  const t = useTranslations("admin.files");
  const lang = useLang();
  const { folders, without } = useFolders();
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("board");
  const [creating, setCreating] = useState(false);

  // the chosen view is a per-viewer convenience
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "list" || v === "board") setView(v);
    } catch {}
  }, []);
  const pickView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const needle = q.trim().toLowerCase();
  const shown = folders.filter((f) => !needle || `${f.partner.name} ${f.partner.city}`.toLowerCase().includes(needle));
  const href = (f: Folder) => `/admin/partners/files/${f.partner.id}`;
  const updated = (f: Folder) => (f.updatedAt ? t("updated", { date: formatDate(f.updatedAt, lang) }) : t("noFilesYet"));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchFolders")} className="ps-9" />
        </div>
        <Tabs value={view} onValueChange={(v) => pickView(v as View)}>
          <TabsList>
            <TabsTrigger value="list"><List /> {t("viewList")}</TabsTrigger>
            <TabsTrigger value="board"><LayoutGrid /> {t("viewBoard")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setCreating(true)}><FolderPlus /> {t("createFolder")}</Button>
      </div>

      {!shown.length ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          <SearchX className="size-6" /> {t("noFolders")}
        </div>
      ) : view === "board" ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map((f) => (
            <li key={f.partner.id}>
              <Link href={href(f)}>
                <Card className="group flex h-full items-center gap-3 p-4 transition hover:border-primary/30 hover:shadow-pop">
                  <CompanyLogo partnerId={f.partner.id} name={f.partner.name} className="size-12 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink" title={f.partner.name}>{f.partner.name}</span>
                    <span className="block text-xs text-muted-foreground">{t("filesCount", { count: f.count })}</span>
                    <span className="block text-xs text-muted-foreground" title={f.updatedAt && formatDate(f.updatedAt, lang)}>{updated(f)}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface-2/60 text-start text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3 text-start">{t("company")}</th>
                <th className="px-4 py-3 text-start">{t("filesHeader")}</th>
                <th className="hidden px-4 py-3 text-start sm:table-cell">{t("lastUpdate")}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => (
                <tr key={f.partner.id} className="border-b last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3">
                    <Link href={href(f)} className="flex min-w-0 items-center gap-3">
                      <CompanyLogo partnerId={f.partner.id} name={f.partner.name} className="size-9 shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{f.partner.name}</span>
                        <span className="block text-xs text-muted-foreground">{f.partner.city} · {f.partner.canton}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold">{f.count}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {f.updatedAt ? (
                      <>
                        <span className="block text-ink">{formatDate(f.updatedAt, lang)}</span>
                        <span className="text-xs">{timeAgo(f.updatedAt, lang)}</span>
                      </>
                    ) : (
                      t("noFilesYet")
                    )}
                  </td>
                  <td className="px-2">
                    <Link href={href(f)} aria-label={t("openFolder")} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-primary">
                      <ChevronRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {creating && <CreateFolderDialog companies={without} onClose={() => setCreating(false)} />}
    </div>
  );
}

/** A folder for a company that has no files yet; it opens empty, ready for uploads. */
function CreateFolderDialog({ companies, onClose }: { companies: Partner[]; onClose: () => void }) {
  const t = useTranslations("admin.files");
  const tc = useTranslations("common.actions");
  const patch = useStore((s) => s.patch);
  const router = useRouter();
  const [company, setCompany] = useState(companies[0]?.id ?? "");

  const create = () => {
    if (!company) return;
    patch("partners", company, { filesFolderAt: new Date().toISOString() });
    toast.success(t("folderCreated", { name: companies.find((p) => p.id === company)?.name ?? "" }));
    onClose();
    router.push(`/admin/partners/files/${company}`);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createFolder")}</DialogTitle>
          <DialogDescription>{companies.length ? t("createFolderBody") : t("allHaveFolders")}</DialogDescription>
        </DialogHeader>
        {companies.length > 0 && (
          <Field label={t("company")} required>
            <Select value={company} onValueChange={setCompany} options={companies.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          {companies.length > 0 && <Button onClick={create} disabled={!company}><FolderPlus /> {t("createFolder")}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
