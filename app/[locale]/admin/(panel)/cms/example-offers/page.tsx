"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ModelOffer } from "@/lib/types";
import { formatCHF } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/shared/bits";
import { Icon } from "@/components/shared/icon";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/ui";

export default function ExampleOffersAdmin() {
  const t = useTranslations();
  const tm = useTranslations("admin.cms.model");
  const L = useL();
  const lang = useLang();
  const items = useStore((s) => s.modelOffers);
  const services = useStore((s) => s.services);
  const add = useStore((s) => s.add);
  const patch = useStore((s) => s.patch);
  const remove = useStore((s) => s.remove);
  const serviceMap = useServiceMap();
  const { confirm, dialog } = useConfirm();
  const [draft, setDraft] = useState<ModelOffer | null>(null);

  const columns: ColumnDef<ModelOffer, unknown>[] = [
    { id: "title", header: t("common.fields.title"), accessorFn: (m) => L(m.title), cell: ({ row: { original: m } }) => <span className="flex items-center gap-2 font-semibold text-ink"><Icon name={serviceMap[m.serviceId]?.icon ?? "Truck"} className="size-4 text-accent" />{L(m.title)}</span> },
    { id: "svc", header: t("common.fields.service"), accessorFn: (m) => L(serviceMap[m.serviceId]?.name) },
    { id: "route", header: tm("route"), accessorFn: (m) => L(m.route) },
    { id: "price", header: t("common.fields.price"), accessorFn: (m) => m.price, cell: (c) => <span className="font-semibold">{formatCHF(c.getValue() as number, lang)}</span> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: m } }) => (
        <div className="flex items-center justify-end gap-1">
          <Switch checked={m.active} onCheckedChange={(v) => patch("modelOffers", m.id, { active: v })} className="me-2" aria-label={t("common.status.active")} />
          <Button variant="ghost" size="icon-sm" onClick={() => setDraft(m)} aria-label={t("common.actions.edit")}><Pencil /></Button>
          <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" aria-label={t("common.actions.delete")} onClick={() => confirm({ title: t("common.confirm.title"), body: L(m.title), tone: "danger", onConfirm: () => { remove("modelOffers", m.id); toast.success(t("common.toast.deleted")); } })}><Trash2 /></Button>
        </div>
      ),
    },
  ];

  const save = () => {
    if (!draft || !draft.title.en.trim()) return;
    if (draft.id) patch("modelOffers", draft.id, draft);
    else add("modelOffers", { ...draft, id: `mo-${Date.now()}` });
    toast.success(t("common.toast.saved"));
    setDraft(null);
  };
  const l10n = (k: "title" | "route", l: "en" | "ar") => (
    <Field label={`${k === "title" ? t("common.fields.title") : tm("route")} · ${l.toUpperCase()}`}>
      <Input dir={l === "ar" ? "rtl" : "ltr"} value={draft![k][l]} onChange={(e) => setDraft({ ...draft!, [k]: { ...draft![k], [l]: e.target.value } })} />
    </Field>
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("admin.cms.title"), href: "/admin/cms" }, { label: tm("title") }]}
        title={tm("title")}
        subtitle={tm("subtitle")}
        actions={<Button onClick={() => setDraft({ id: "", serviceId: services[0].id, title: { en: "", ar: "" }, route: { en: "", ar: "" }, rooms: "3.5", price: 1200, active: true })}><Plus /> {tm("add")}</Button>}
      />
      <DataTable data={items} columns={columns} search={(m) => `${m.title.en} ${m.route.en}`} />
      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{draft?.id ? t("common.actions.edit") : tm("add")}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              {l10n("title", "en")}
              {l10n("title", "ar")}
              {l10n("route", "en")}
              {l10n("route", "ar")}
              <Field label={t("common.fields.service")}><Select value={draft.serviceId} onValueChange={(v) => setDraft({ ...draft, serviceId: v })} options={services.map((s) => ({ value: s.id, label: L(s.name) }))} /></Field>
              <Field label={`${t("common.fields.price")} (CHF)`}><Input type="number" dir="ltr" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>{t("common.actions.cancel")}</Button>
            <Button onClick={save} disabled={!draft?.title.en.trim()}>{t("common.actions.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
