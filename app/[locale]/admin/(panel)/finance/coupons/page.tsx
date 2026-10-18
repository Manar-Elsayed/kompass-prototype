"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Coupon } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress, RadioCards, Switch } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, useConfirm } from "@/components/shared/bits";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { Mono, PageHeader } from "@/components/admin/ui";

const blank = (): Coupon => ({
  id: "",
  code: "",
  serviceId: "all",
  type: "percent",
  discount: 10,
  used: 0,
  usageLimit: 50,
  multiUse: false,
  active: true,
  startDate: "2026-10-18T00:00:00.000Z",
  endDate: "2026-12-31T00:00:00.000Z",
});

export default function CouponsPage() {
  const t = useTranslations();
  const tc = useTranslations("admin.coupons");
  const L = useL();
  const lang = useLang();
  const coupons = useStore((s) => s.coupons);
  const services = useStore((s) => s.services);
  const add = useStore((s) => s.add);
  const patch = useStore((s) => s.patch);
  const remove = useStore((s) => s.remove);
  const serviceMap = useServiceMap();
  const { confirm, dialog } = useConfirm();
  const [draft, setDraft] = useState<Coupon | null>(null);
  const [err, setErr] = useState<string>("");

  const status = (c: Coupon) => (!c.active ? "inactive" : Date.parse(c.endDate) < Date.parse("2026-10-18") || c.used >= c.usageLimit ? "expired" : "active");

  const save = () => {
    if (!draft) return;
    const code = draft.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(code)) return setErr("A–Z, 0–9 · 4–16");
    if (coupons.some((c) => c.code === code && c.id !== draft.id)) return setErr("Duplicate");
    const c = { ...draft, code };
    if (draft.id) patch("coupons", draft.id, c);
    else add("coupons", { ...c, id: `cp-${Date.now()}` });
    toast.success(t(draft.id ? "common.toast.saved" : "common.toast.created"));
    setDraft(null);
  };

  const columns: ColumnDef<Coupon, unknown>[] = [
    {
      id: "code",
      header: t("common.fields.code"),
      accessorFn: (c) => c.code,
      cell: (c) => (
        <button
          className="group inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary-soft/50 px-2 py-1"
          onClick={() => {
            navigator.clipboard?.writeText(c.getValue() as string);
            toast.success(t("common.toast.copied"));
          }}
        >
          <Mono className="text-primary">{c.getValue() as string}</Mono>
          <Copy className="size-3 text-primary/60" />
        </button>
      ),
    },
    { id: "discount", header: tc("discount"), accessorFn: (c) => c.discount, cell: ({ row: { original: c } }) => <span className="font-bold">{c.type === "percent" ? `${c.discount}%` : `CHF ${c.discount}`}</span> },
    { id: "service", header: t("common.fields.service"), accessorFn: (c) => (c.serviceId === "all" ? tc("allServices") : L(serviceMap[c.serviceId]?.name)) },
    {
      id: "usage",
      header: tc("usage"),
      accessorFn: (c) => c.used / c.usageLimit,
      cell: ({ row: { original: c } }) => (
        <div className="w-32">
          <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{c.used}</span><span className="text-muted-foreground">/ {c.usageLimit}</span></div>
          <Progress value={(c.used / c.usageLimit) * 100} className="h-1.5" />
        </div>
      ),
    },
    { id: "multi", header: tc("multiUse"), accessorFn: (c) => (c.multiUse ? 1 : 0), cell: (c) => (c.getValue() ? t("common.form.yes") : t("common.form.no")) },
    { id: "validity", header: tc("validity"), accessorFn: (c) => c.endDate, cell: ({ row: { original: c } }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.startDate, lang)} – {formatDate(c.endDate, lang)}</span> },
    { id: "status", header: t("common.fields.status"), accessorFn: status, cell: (c) => <StatusBadge status={c.getValue() as string} /> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row: { original: c } }) => (
        <div className="flex justify-end gap-1">
          <Switch checked={c.active} onCheckedChange={(v) => patch("coupons", c.id, { active: v })} aria-label={t("common.status.active")} className="me-2" />
          <Button variant="ghost" size="icon-sm" onClick={() => { setErr(""); setDraft(c); }} aria-label={t("common.actions.edit")}><Pencil /></Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-danger hover:bg-danger-soft"
            aria-label={t("common.actions.delete")}
            onClick={() =>
              confirm({
                title: tc("deleteTitle", { code: c.code }),
                body: t("common.confirm.deleteBody"),
                tone: "danger",
                confirmLabel: t("common.actions.delete"),
                onConfirm: () => {
                  remove("coupons", c.id);
                  toast.success(t("common.toast.deleted"));
                },
              })
            }
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={tc("title")}
        subtitle={tc("subtitle")}
        actions={<Button onClick={() => { setErr(""); setDraft(blank()); }}><Plus /> {tc("add")}</Button>}
      />
      <DataTable
        data={coupons}
        columns={columns}
        search={(c) => c.code}
        filters={[{ id: "st", label: t("common.fields.status"), options: (["active", "inactive", "expired"] as const).map((s) => ({ value: s, label: t(`common.status.${s}`) })), get: status }]}
      />

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft?.id ? tc("edit") : tc("add")}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <Field label={t("common.fields.code")} error={err} required>
                <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} dir="ltr" placeholder="WELCOME20" className="font-mono" />
              </Field>
              <Field label={tc("type")}>
                <RadioCards className="grid-cols-2" value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as Coupon["type"] })} options={[{ value: "percent", label: tc("percent") }, { value: "fixed", label: tc("fixed") }]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tc("discount")}><Input type="number" value={draft.discount} onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) })} dir="ltr" /></Field>
                <Field label={tc("limit")}><Input type="number" value={draft.usageLimit} onChange={(e) => setDraft({ ...draft, usageLimit: Number(e.target.value) })} dir="ltr" /></Field>
              </div>
              <Field label={t("common.fields.service")}>
                <Select value={draft.serviceId} onValueChange={(v) => setDraft({ ...draft, serviceId: v })} options={[{ value: "all", label: tc("allServices") }, ...services.map((s) => ({ value: s.id, label: L(s.name) }))]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tc("start")}><Input type="date" value={draft.startDate.slice(0, 10)} onChange={(e) => setDraft({ ...draft, startDate: new Date(e.target.value).toISOString() })} /></Field>
                <Field label={tc("end")}><Input type="date" value={draft.endDate.slice(0, 10)} onChange={(e) => setDraft({ ...draft, endDate: new Date(e.target.value).toISOString() })} /></Field>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm font-medium"><Switch checked={draft.multiUse} onCheckedChange={(v) => setDraft({ ...draft, multiUse: v })} />{tc("multiUse")}</label>
                <label className="flex items-center gap-2 text-sm font-medium"><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />{t("common.status.active")}</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>{t("common.actions.cancel")}</Button>
            <Button onClick={save}>{t("common.actions.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
