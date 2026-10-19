"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileEdit, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { LANGS, type L10n, type Service } from "@/lib/types";
import { formatCHF, l10n, slugify, withFallback } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon, ICON_NAMES } from "@/components/shared/icon";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/ui";

type Draft = { id?: string; name: L10n; icon: string; leadPrice: string; active: boolean };

export default function ServicesAdmin() {
  const t = useTranslations();
  const L = useL();
  const lang = useLang();
  const services = useStore((s) => s.services);
  const offers = useStore((s) => s.offers);
  const partners = useStore((s) => s.partners);
  const patch = useStore((s) => s.patch);
  const add = useStore((s) => s.add);
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = () => {
    if (!draft || !draft.name.en.trim()) return;
    const price = Number(draft.leadPrice) || 0;
    if (draft.id) {
      const s = services.find((x) => x.id === draft.id)!;
      patch("services", draft.id, { name: withFallback(draft.name), icon: draft.icon, leadPrice: price, active: draft.active, short: s.short });
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
        active: draft.active,
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
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name={s.icon} className="size-4" /></span>
          <span>
            <span className="block font-semibold text-ink">{L(s.name)}</span>
            <span className="block text-xs text-muted-foreground" dir="ltr">/services/{s.slug}</span>
          </span>
        </span>
      ),
    },
    { id: "price", header: t("admin.services.leadPrice"), accessorFn: (s) => s.leadPrice, cell: (c) => <span className="font-semibold">{formatCHF(c.getValue() as number, lang)}</span> },
    { id: "leads", header: t("admin.services.leads"), accessorFn: (s) => offers.filter((o) => o.serviceId === s.id).length },
    { id: "partners", header: t("admin.services.partners"), accessorFn: (s) => partners.filter((p) => p.status === "approved" && p.serviceIds.includes(s.id)).length },
    {
      id: "active",
      header: t("admin.services.visible"),
      accessorFn: (s) => (s.active ? 1 : 0),
      cell: ({ row: { original: s } }) => (
        <Switch
          checked={s.active}
          onCheckedChange={(v) => {
            patch("services", s.id, { active: v });
            toast.success(t("common.toast.updated"));
          }}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: s } }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={t("common.actions.edit")} onClick={() => setDraft({ id: s.id, name: { ...s.name }, icon: s.icon, leadPrice: String(s.leadPrice), active: s.active })}>
            <Pencil />
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/cms/services/${s.id}`}>
              <FileEdit /> {t("admin.services.content")}
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.services.title")}
        subtitle={t("admin.services.subtitle")}
        actions={
          <Button onClick={() => setDraft({ name: l10n(), icon: "Truck", leadPrice: "30", active: true })}>
            <Plus /> {t("admin.services.add")}
          </Button>
        }
      />
      <DataTable data={[...services].sort((a, b) => a.order - b.order)} columns={columns} search={(s) => `${LANGS.map((l) => s.name[l]).join(" ")} ${s.slug}`} />

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
                    <Input value={draft.name[l]} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, [l]: e.target.value } })} dir={l === "ar" ? "rtl" : "ltr"} />
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
                <Field label={`${t("admin.services.leadPrice")} (CHF)`}>
                  <Input type="number" value={draft.leadPrice} onChange={(e) => setDraft({ ...draft, leadPrice: e.target.value })} dir="ltr" />
                </Field>
              </div>
              <label className="flex items-center gap-3 text-sm font-medium">
                <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
                {t("admin.services.visible")}
              </label>
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
