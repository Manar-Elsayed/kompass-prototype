"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, Pencil, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useL, useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar, Switch } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { useConfirm } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";

export default function TeamPage() {
  const t = useTranslations();
  const tu = useTranslations("admin.users");
  const L = useL();
  const lang = useLang();
  const users = useStore((s) => s.users);
  const roles = useStore((s) => s.roles);
  const patch = useStore((s) => s.patch);
  const add = useStore((s) => s.add);
  const remove = useStore((s) => s.remove);
  const { user: me } = useCurrentUser();
  const { confirm, dialog } = useConfirm();
  // one form for inviting a new member (no id) and editing an existing one
  const [invite, setInvite] = useState<null | { id?: string; name: string; email: string; phone: string; roleId: string }>(null);
  const edit = (u: AdminUser) => setInvite({ id: u.id, name: u.name, email: u.email, phone: u.phone, roleId: u.roleId });
  const setActive = (u: AdminUser, active: boolean) => {
    patch("users", u.id, { active });
    toast.success(t(active ? "admin.rows.memberActivated" : "admin.rows.memberDeactivated", { name: u.name }));
  };

  const columns: ColumnDef<AdminUser, unknown>[] = [
    {
      id: "name",
      header: t("common.fields.name"),
      accessorFn: (u) => u.name,
      cell: ({ row: { original: u } }) => (
        <span className="flex items-center gap-3">
          <Avatar name={u.name} className="size-9" />
          <span>
            <span className="flex items-center gap-2 font-semibold text-ink">{u.name}{u.id === me?.id && <Badge tone="primary">{tu("you")}</Badge>}</span>
            <span className="block text-xs text-muted-foreground" dir="ltr">{u.email}</span>
          </span>
        </span>
      ),
    },
    {
      id: "role",
      header: t("common.fields.role"),
      accessorFn: (u) => L(roles.find((r) => r.id === u.roleId)?.name),
      cell: ({ row: { original: u } }) => (
        <div className="w-48" onClick={(e) => e.stopPropagation()}>
          <Select
            size="sm"
            value={u.roleId}
            disabled={u.id === me?.id}
            onValueChange={(v) => {
              patch("users", u.id, { roleId: v });
              toast.success(t("common.toast.updated"));
            }}
            options={roles.map((r) => ({ value: r.id, label: L(r.name) }))}
          />
        </div>
      ),
    },
    { id: "phone", header: t("common.fields.phone"), accessorFn: (u) => u.phone, cell: (c) => <span dir="ltr">{c.getValue() as string}</span> },
    { id: "login", header: tu("lastLogin"), accessorFn: (u) => u.lastLogin, cell: (c) => <span className="text-muted-foreground">{timeAgo(c.getValue() as string, lang)}</span> },
    {
      id: "active",
      header: t("common.fields.status"),
      accessorFn: (u) => (u.active ? 1 : 0),
      cell: ({ row: { original: u } }) => (
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={u.active} disabled={u.id === me?.id} onCheckedChange={(v) => setActive(u, v)} />
          {t(u.active ? "common.status.active" : "common.status.inactive")}
        </label>
      ),
    },
    actionsColumn<AdminUser>((u) => (
      <RowActions
        actions={[
          { label: t("common.actions.edit"), icon: <Pencil />, onSelect: () => edit(u) },
          { label: t("admin.rows.resendInvite"), icon: <Mail />, onSelect: () => toast.success(tu("invited", { email: u.email })) },
          { label: t(u.active ? "admin.rows.deactivate" : "admin.rows.activate"), icon: u.active ? <UserX /> : <UserCheck />, onSelect: () => setActive(u, !u.active), hidden: u.id === me?.id },
          {
            label: t("admin.rows.removeMember"),
            icon: <Trash2 />,
            tone: "danger",
            separated: true,
            hidden: u.id === me?.id,
            onSelect: () =>
              confirm({
                title: t("admin.rows.removeMemberTitle", { name: u.name }),
                body: t("admin.rows.removeMemberBody"),
                tone: "danger",
                confirmLabel: t("admin.rows.removeMember"),
                onConfirm: () => {
                  remove("users", u.id);
                  toast.success(t("admin.del.member.done", { name: u.name }));
                },
              }),
          },
        ]}
      />
    )),
  ];

  return (
    <>
      <PageHeader title={tu("title")} subtitle={tu("subtitle")} actions={<Button onClick={() => setInvite({ name: "", email: "", phone: "", roleId: "role-support" })}><UserPlus /> {tu("invite")}</Button>} />
      <DataTable data={users} columns={columns} search={(u) => `${u.name} ${u.email}`} onRowClick={edit} />
      <Dialog open={!!invite} onOpenChange={(v) => !v && setInvite(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{invite?.id ? t("admin.rows.editMember") : tu("invite")}</DialogTitle></DialogHeader>
          {invite && (
            <div className="grid gap-4">
              <Field label={t("common.fields.name")}><Input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} /></Field>
              <Field label={t("common.fields.email")}><Input type="email" dir="ltr" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></Field>
              {invite.id && <Field label={t("common.fields.phone")}><Input type="tel" dir="ltr" value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} /></Field>}
              <Field label={t("common.fields.role")} hint={invite.id === me?.id ? t("admin.rows.ownRole") : undefined}><Select disabled={invite.id === me?.id} value={invite.roleId} onValueChange={(v) => setInvite({ ...invite, roleId: v })} options={roles.map((r) => ({ value: r.id, label: L(r.name) }))} /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvite(null)}>{t("common.actions.cancel")}</Button>
            <Button
              disabled={!invite?.name.trim() || !/\S+@\S+\.\S+/.test(invite?.email ?? "")}
              onClick={() => {
                if (invite!.id) {
                  patch("users", invite!.id, { name: invite!.name.trim(), email: invite!.email.trim(), phone: invite!.phone.trim(), roleId: invite!.roleId });
                  toast.success(t("common.toast.saved"));
                } else {
                  add("users", { id: `u-${Date.now()}`, name: invite!.name, email: invite!.email, phone: "", roleId: invite!.roleId, active: true, lastLogin: new Date().toISOString() });
                  toast.success(tu("invited", { email: invite!.email }));
                }
                setInvite(null);
              }}
            >
              {invite?.id ? t("common.actions.save") : t("common.actions.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
