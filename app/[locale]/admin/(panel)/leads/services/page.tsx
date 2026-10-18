"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileEdit, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Service } from "@/lib/types";
import { formatCHF, slugify } from "@/lib/utils";
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

type Draft = { id?: string; en: string; ar: string; icon: string; leadPrice: string; active: boolean };

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
    if (!draft || !draft.en.trim()) return;
    const price = Number(draft.leadPrice) || 0;
    if (draft.id) {
      const s = services.find((x) => x.id === draft.id)!;
      patch("services", draft.id, { name: { en: draft.en, ar: draft.ar || draft.en }, icon: draft.icon, leadPrice: price, active: draft.active, short: s.short });
    } else {
      const svc: Service = {
        id: `svc-${slugify(draft.en)}`,
        slug: slugify(draft.en),
        icon: draft.icon,
        name: { en: draft.en, ar: draft.ar || draft.en },
        short: { en: "", ar: "" },
        body: { en: "<p></p>", ar: "<p></p>" },
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
          <Button variant="ghost" size="icon-sm" aria-label={t("common.actions.edit")} onClick={() => setDraft({ id: s.id, en: s.name.en, ar: s.name.ar, icon: s.icon, leadPrice: String(s.leadPrice), active: s.active })}>
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
          <Button onClick={() => setDraft({ en: "", ar: "", icon: "Truck", leadPrice: "30", active: true })}>
            <Plus /> {t("admin.services.add")}
          </Button>
        }
      />
      <DataTable data={[...services].sort((a, b) => a.order - b.order)} columns={columns} search={(s) => `${s.name.en} ${s.name.ar} ${s.slug}`} />

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? t("admin.services.edit") : t("admin.services.add")}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("admin.services.nameEn")} required>
                  <Input value={draft.en} onChange={(e) => setDraft({ ...draft, en: e.target.value })} dir="ltr" />
                </Field>
                <Field label={t("admin.services.nameAr")}>
                  <Input value={draft.ar} onChange={(e) => setDraft({ ...draft, ar: e.target.value })} dir="rtl" />
                </Field>
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
            <Button onClick={save} disabled={!draft?.en.trim()}>{t("common.actions.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
