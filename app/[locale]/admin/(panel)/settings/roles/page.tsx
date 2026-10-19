"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LANGS, PERMISSIONS, type L10n, type Permission } from "@/lib/types";
import { cn, l10n, withFallback } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";

export default function RolesPage() {
  const t = useTranslations();
  const tr = useTranslations("admin.roles");
  const L = useL();
  const roles = useStore((s) => s.roles);
  const users = useStore((s) => s.users);
  const patch = useStore((s) => s.patch);
  const add = useStore((s) => s.add);
  const remove = useStore((s) => s.remove);
  const { confirm, dialog } = useConfirm();
  const [draft, setDraft] = useState<null | L10n>(null);

  const toggle = (roleId: string, perm: Permission, on: boolean) => {
    const r = roles.find((x) => x.id === roleId)!;
    patch("roles", roleId, { permissions: on ? [...r.permissions, perm] : r.permissions.filter((p) => p !== perm) });
  };

  return (
    <>
      <PageHeader title={tr("title")} subtitle={tr("subtitle")} actions={<Button onClick={() => setDraft(l10n())}><Plus /> {tr("add")}</Button>} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-2/60">
              <th className="sticky start-0 bg-surface-2 px-5 py-4 text-start text-xs font-semibold text-muted-foreground">{tr("module")}</th>
              {roles.map((r) => (
                <th key={r.id} className="min-w-40 px-4 py-4 text-start align-top">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 font-bold text-ink">
                        {r.system ? <Lock className="size-3.5 text-muted-foreground" /> : <Shield className="size-3.5 text-primary" />}
                        {L(r.name)}
                      </p>
                      <p className="mt-0.5 text-xs font-normal text-muted-foreground">{tr("members", { count: users.filter((u) => u.roleId === r.id).length })}</p>
                    </div>
                    {!r.system && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-danger"
                        aria-label={t("common.actions.delete")}
                        disabled={users.some((u) => u.roleId === r.id)}
                        onClick={() =>
                          confirm({
                            title: t("common.confirm.title"),
                            body: t("common.confirm.deleteBody"),
                            tone: "danger",
                            onConfirm: () => {
                              remove("roles", r.id);
                              toast.success(t("common.toast.deleted"));
                            },
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm) => (
              <tr key={perm} className="border-b last:border-0">
                <td className="sticky start-0 bg-surface px-5 py-3.5 font-semibold text-ink">{t(`admin.perm.${perm}`)}</td>
                {roles.map((r) => {
                  const on = r.permissions.includes(perm);
                  return (
                    <td key={r.id} className={cn("px-4 py-3.5", on && "bg-primary-soft/30")}>
                      <Checkbox checked={on} disabled={r.system} onCheckedChange={(v) => toggle(r.id, perm, !!v)} aria-label={`${L(r.name)} · ${perm}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Badge tone="outline"><Lock /> {tr("system")}</Badge> {roles.find((r) => r.system) && L(roles.find((r) => r.system)!.description)}
      </p>

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{tr("add")}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-4">
              {LANGS.map((l) => (
                <Field key={l} label={`${t("common.fields.name")} · ${l.toUpperCase()}`}><Input value={draft[l]} onChange={(e) => setDraft({ ...draft, [l]: e.target.value })} dir={l === "ar" ? "rtl" : "ltr"} /></Field>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>{t("common.actions.cancel")}</Button>
            <Button
              disabled={!draft?.en.trim()}
              onClick={() => {
                add("roles", { id: `role-${Date.now()}`, name: withFallback(draft!), description: l10n(), permissions: ["dashboard"] });
                setDraft(null);
                toast.success(t("common.toast.created"));
              }}
            >
              {t("common.actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
