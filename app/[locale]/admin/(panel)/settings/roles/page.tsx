"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info, Lock, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LANGS, PERMISSIONS, type L10n, type Permission, type Role } from "@/lib/types";
import { cn, l10n, withFallback } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useL } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/shared/bits";
import { RowActions } from "@/components/admin/row-actions";
import { PageHeader } from "@/components/admin/ui";

/**
 * Which modules each role can open. Super admin is a locked system role. Anyone with Settings & access
 * can rename a custom role and tick its modules; only a Super admin can delete one, and only once
 * nobody holds it (invited and inactive members count too), after a confirmation.
 */
export default function RolesPage() {
  const t = useTranslations();
  const tr = useTranslations("admin.roles");
  const L = useL();
  const roles = useStore((s) => s.roles);
  const users = useStore((s) => s.users);
  const patch = useStore((s) => s.patch);
  const add = useStore((s) => s.add);
  const remove = useStore((s) => s.remove);
  const { user: me } = useCurrentUser();
  const canDelete = !!roles.find((r) => r.id === me?.roleId)?.system;
  const { confirm, dialog } = useConfirm();
  // one form for a new role (no id) and for renaming an existing one
  const [draft, setDraft] = useState<null | { id?: string; name: L10n; description: L10n }>(null);

  const memberCount = (roleId: string) => users.filter((u) => u.roleId === roleId).length;
  const nameTaken =
    !!draft && roles.some((r) => r.id !== draft.id && LANGS.some((l) => draft.name[l].trim() && r.name[l].trim().toLowerCase() === draft.name[l].trim().toLowerCase()));

  const setPermissions = (roleId: string, permissions: Permission[]) => patch("roles", roleId, { permissions });
  // every tick applies at once, so say what changed and offer an undo
  const toggle = (r: Role, perm: Permission, on: boolean) => {
    const before = r.permissions;
    setPermissions(r.id, on ? [...before, perm] : before.filter((p) => p !== perm));
    toast.success(tr(on ? "granted" : "revoked", { role: L(r.name), module: t(`admin.perm.${perm}`) }), {
      action: { label: tr("undo"), onClick: () => setPermissions(r.id, before) },
    });
  };
  // you can't take Settings & access away from your own role: you'd lock yourself out of this page
  const locksMeOut = (r: Role, perm: Permission) => perm === "settings" && r.id === me?.roleId && r.permissions.includes("settings");

  const del = (r: Role) =>
    confirm({
      title: t("admin.del.role.title", { name: L(r.name) }),
      body: t("admin.del.role.body"),
      tone: "danger",
      confirmLabel: t("admin.del.role.button"),
      onConfirm: () => {
        remove("roles", r.id);
        toast.success(t("admin.del.role.done"));
      },
    });

  const save = () => {
    if (!draft || !draft.name.en.trim() || nameTaken) return;
    if (draft.id) {
      patch("roles", draft.id, { name: withFallback(draft.name), description: withFallback(draft.description) });
      toast.success(t("common.toast.saved"));
    } else {
      add("roles", { id: `role-${Date.now()}`, name: withFallback(draft.name), description: withFallback(draft.description), permissions: ["dashboard"] });
      toast.success(tr("created", { name: draft.name.en.trim() }));
    }
    setDraft(null);
  };

  return (
    <>
      <PageHeader title={tr("title")} subtitle={tr("subtitle")} actions={<Button onClick={() => setDraft({ name: l10n(), description: l10n() })}><Plus /> {tr("add")}</Button>} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-2/60">
              <th className="sticky start-0 bg-surface-2 px-5 py-4 text-start text-xs font-semibold text-muted-foreground">{tr("module")}</th>
              {roles.map((r) => {
                const count = memberCount(r.id);
                return (
                  <th key={r.id} className="min-w-44 px-4 py-4 text-start align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-bold text-ink">
                          {r.system ? <Lock className="size-3.5 shrink-0 text-muted-foreground" /> : <Shield className="size-3.5 shrink-0 text-primary" />}
                          {L(r.name)}
                        </p>
                        <p className="mt-0.5 text-xs font-normal text-muted-foreground">{tr("members", { count })}</p>
                        {L(r.description) && <p className="mt-1 line-clamp-2 text-xs font-normal text-muted-foreground" title={L(r.description)}>{L(r.description)}</p>}
                      </div>
                      {/* custom roles only: rename always; delete for a Super admin, once nobody holds the role */}
                      {!r.system && (
                        <RowActions
                          actions={[
                            { label: tr("edit"), icon: <Pencil />, onSelect: () => setDraft({ id: r.id, name: { ...r.name }, description: { ...r.description } }) },
                            { label: t("admin.del.role.button"), icon: <Trash2 />, tone: "danger", separated: true, onSelect: () => del(r), hidden: count > 0 || !canDelete },
                          ]}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm) => (
              <tr key={perm} className="border-b last:border-0">
                <td className="sticky start-0 bg-surface px-5 py-3.5 font-semibold text-ink">{t(`admin.perm.${perm}`)}</td>
                {roles.map((r) => {
                  const on = r.permissions.includes(perm);
                  const locked = r.system || locksMeOut(r, perm);
                  return (
                    <td key={r.id} className={cn("px-4 py-3.5", on && "bg-primary-soft/30")} title={!r.system && locksMeOut(r, perm) ? tr("ownSettings") : undefined}>
                      <Checkbox checked={on} disabled={locked} onCheckedChange={(v) => toggle(r, perm, !!v)} aria-label={`${L(r.name)} · ${t(`admin.perm.${perm}`)}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <Badge tone="outline"><Lock /> {tr("system")}</Badge> {tr("systemHint")}
        </p>
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 size-3.5 shrink-0" /> {tr("deleteRule")}
        </p>
      </div>

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? tr("edit") : tr("add")}</DialogTitle>
            {!draft?.id && <DialogDescription>{tr("addBody")}</DialogDescription>}
          </DialogHeader>
          {draft && (
            <div className="grid gap-4">
              {LANGS.map((l) => (
                <Field key={l} label={`${t("common.fields.name")} · ${l.toUpperCase()}`} required={l === "en"} error={l === "en" && nameTaken ? tr("nameTaken") : undefined}>
                  <Input value={draft.name[l]} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, [l]: e.target.value } })} />
                </Field>
              ))}
              <Field label={`${tr("description")} · EN`} hint={tr("descriptionHint")}>
                <Textarea rows={2} value={draft.description.en} onChange={(e) => setDraft({ ...draft, description: { ...draft.description, en: e.target.value } })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>{t("common.actions.cancel")}</Button>
            <Button disabled={!draft?.name.en.trim() || nameTaken} onClick={save}>
              {draft?.id ? t("common.actions.save") : tr("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
