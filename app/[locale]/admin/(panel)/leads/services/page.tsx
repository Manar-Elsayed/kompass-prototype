"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EyeOff, Globe, Hourglass, Pencil, Plus, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { LANGS, type L10n, type Service } from "@/lib/types";
import { JOB_KINDS, type JobKind } from "@/lib/jobs";
import { formatCHF, l10n, slugify, withFallback } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon, ICON_NAMES } from "@/components/shared/icon";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";

type Visibility = "live" | "soon" | "hidden";
type Draft = { id?: string; name: L10n; icon: string; kind: JobKind; leadPrice: string; estFrom: string; estTo: string; visibility: Visibility };

const visibilityOf = (s: Pick<Service, "active" | "comingSoon">): Visibility => (!s.active ? "hidden" : s.comingSoon ? "soon" : "live");
const fromVisibility = (v: Visibility) => ({ active: v !== "hidden", comingSoon: v === "soon" });
const VISIBILITY_TONE: Record<Visibility, "success" | "warning" | "neutral"> = { live: "success", soon: "warning", hidden: "neutral" };

export default function ServicesAdmin() {
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const services = useStore((s) => s.services);
  const offers = useStore((s) => s.offers);
  const partners = useStore((s) => s.partners);
  const patch = useStore((s) => s.patch);
  const add = useStore((s) => s.add);
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const contentHref = (s: Service) => `/admin/cms/services/${s.id}`;
  const editService = (s: Service) =>
    setDraft({ id: s.id, name: { ...s.name }, icon: s.icon, kind: s.kind, leadPrice: String(s.leadPrice), estFrom: String(s.estimate.from), estTo: String(s.estimate.to), visibility: visibilityOf(s) });
  const setVisibility = (s: Service, v: Visibility) => {
    patch("services", s.id, fromVisibility(v));
    toast.success(t(`admin.services.visibilitySet.${v}`, { name: L(s.name) }));
  };

  const save = () => {
    if (!draft || !draft.name.en.trim()) return;
    const price = Number(draft.leadPrice) || 0;
    const from = Number(draft.estFrom) || 0;
    const to = Math.max(from, Number(draft.estTo) || 0);
    if (draft.id) {
      const s = services.find((x) => x.id === draft.id)!;
      patch("services", draft.id, { name: withFallback(draft.name), icon: draft.icon, leadPrice: price, kind: draft.kind, estimate: { ...s.estimate, from, to }, ...fromVisibility(draft.visibility), short: s.short });
    } else {
      const svc: Service = {
        id: `svc-${slugify(draft.name.en)}`,
        slug: slugify(draft.name.en),
        icon: draft.icon,
        name: withFallback(draft.name),
        short: l10n(),
        body: l10n("<p></p>"),
        image: "/images/hero.png",
        features: [],
        tips: [],
        leadPrice: price,
        kind: draft.kind,
        estimate: { from, to, basis: l10n() },
        ...fromVisibility(draft.visibility),
        order: services.length + 1,
      };
      add("services", svc);
    }
    toast.success(t("common.toast.saved"));
    setDraft(null);
  };

  const columns: ColumnDef<Service, unknown>[] = [
    {
      id: "name",
      header: t("common.fields.name"),
      accessorFn: (s) => L(s.name),
      cell: ({ row: { original: s } }) => (
        <span className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name={s.icon} className="size-4" /></span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap font-semibold text-ink">{L(s.name)}</span>
            <span className="block max-w-44 truncate text-xs text-muted-foreground" dir="ltr" title={`/services/${s.slug}`}>/services/{s.slug}</span>
          </span>
        </span>
      ),
    },
    { id: "price", header: t("admin.services.leadPrice"), accessorFn: (s) => s.leadPrice, cell: (c) => <span className="whitespace-nowrap font-semibold">{formatCHF(c.getValue() as number, lang)}</span> },
    {
      id: "estimate",
      header: t("admin.services.estimate"),
      accessorFn: (s) => s.estimate.from,
      cell: ({ row: { original: s } }) => <span className="whitespace-nowrap tabular-nums">{formatCHF(s.estimate.from, lang)} – {formatCHF(s.estimate.to, lang)}</span>,
    },
    { id: "leads", meta: { className: "hidden xl:table-cell" }, header: t("admin.services.leads"), accessorFn: (s) => offers.filter((o) => o.serviceId === s.id).length },
    { id: "partners", meta: { className: "hidden xl:table-cell" }, header: t("admin.services.partners"), accessorFn: (s) => partners.filter((p) => p.status === "approved" && p.serviceIds.includes(s.id)).length },
    {
      id: "active",
      header: t("admin.services.visible"),
      accessorFn: (s) => visibilityOf(s),
      cell: (c) => {
        const v = c.getValue() as Visibility;
        return <Badge tone={VISIBILITY_TONE[v]} dot>{t(`admin.services.visibility.${v}`)}</Badge>;
      },
    },
    actionsColumn<Service>((s) => {
      const v = visibilityOf(s);
      return (
        <RowActions
          viewHref={contentHref(s)}
          viewLabel={t("admin.services.viewContent")}
          actions={[
            { label: t("admin.services.edit"), icon: <Pencil />, onSelect: () => editService(s) },
            { label: t("admin.cms.viewOnSite"), icon: <SquareArrowOutUpRight />, href: `/services/${s.slug}`, hidden: v === "hidden" },
            { label: t("admin.services.setVisibility.live"), icon: <Globe />, onSelect: () => setVisibility(s, "live"), hidden: v === "live", separated: true },
            { label: t("admin.services.setVisibility.soon"), icon: <Hourglass />, onSelect: () => setVisibility(s, "soon"), hidden: v === "soon", separated: v === "live" },
            { label: t("admin.services.setVisibility.hidden"), icon: <EyeOff />, onSelect: () => setVisibility(s, "hidden"), hidden: v === "hidden" },
          ]}
        />
      );
    }),
  ];

  return (
    <>
      <PageHeader
        title={t("admin.services.title")}
        subtitle={t("admin.services.subtitle")}
        actions={
          <Button onClick={() => setDraft({ name: l10n(), icon: "Truck", kind: "move", leadPrice: "30", estFrom: "", estTo: "", visibility: "soon" })}>
            <Plus /> {t("admin.services.add")}
          </Button>
        }
      />
      <DataTable
        data={[...services].sort((a, b) => a.order - b.order)}
        columns={columns}
        search={(s) => `${LANGS.map((l) => s.name[l]).join(" ")} ${s.slug}`}
        searchPlaceholder={t("admin.services.searchPh")}
        wideSearch
        onRowClick={(s) => router.push(contentHref(s))}
      />

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? t("admin.services.edit") : t("admin.services.add")}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {LANGS.map((l) => (
                  <Field key={l} label={`${t("common.fields.name")} · ${l.toUpperCase()}`} required={l === "en"}>
                    <Input value={draft.name[l]} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, [l]: e.target.value } })} />
                  </Field>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("admin.cms.fields.icon")}>
                  <Select
                    value={draft.icon}
                    onValueChange={(v) => setDraft({ ...draft, icon: v })}
                    options={ICON_NAMES.map((n) => ({ value: n, label: <span className="flex items-center gap-2"><Icon name={n} className="size-4" />{n}</span> }))}
                  />
                </Field>
                <Field label={t("admin.services.kind")} hint={t("admin.services.kindHint")} className="sm:col-span-2">
                  <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as JobKind })} options={JOB_KINDS.map((k) => ({ value: k, label: t(`admin.services.kinds.${k}`) }))} />
                </Field>
                <Field label={`${t("admin.services.leadPrice")} (CHF)`}>
                  <Input type="number" value={draft.leadPrice} onChange={(e) => setDraft({ ...draft, leadPrice: e.target.value })} dir="ltr" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`${t("admin.services.estimateFrom")} (CHF)`}>
                  <Input type="number" value={draft.estFrom} onChange={(e) => setDraft({ ...draft, estFrom: e.target.value })} dir="ltr" />
                </Field>
                <Field label={`${t("admin.services.estimateTo")} (CHF)`}>
                  <Input type="number" value={draft.estTo} onChange={(e) => setDraft({ ...draft, estTo: e.target.value })} dir="ltr" />
                </Field>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">{t("admin.services.estimateHint")}</p>
              <Field label={t("admin.services.visible")} hint={t(`admin.services.visibilityHint.${draft.visibility}`)}>
                <Select
                  value={draft.visibility}
                  onValueChange={(v) => setDraft({ ...draft, visibility: v as Visibility })}
                  options={(["live", "soon", "hidden"] as const).map((v) => ({ value: v, label: t(`admin.services.visibility.${v}`) }))}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>{t("common.actions.cancel")}</Button>
            <Button onClick={save} disabled={!draft?.name.en.trim()}>{t("common.actions.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
