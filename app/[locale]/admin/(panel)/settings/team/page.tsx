"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, MailX, Pencil, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser, Permission } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useL, useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar, Switch } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type ColumnDef } from "@/components/admin/data-table";
import { RowActions, actionsColumn } from "@/components/admin/row-actions";
import { useConfirm } from "@/components/shared/bits";
import { PageHeader } from "@/components/admin/ui";

const SUPER = "role-super";
const EMAIL = /^\S+@\S+\.\S+$/;
/** Invited people show as Invited until their first sign-in. */
const isInvited = (u: AdminUser) => !!u.invitedAt;

/**
 * The people with admin access: invite them (they show as Invited until they sign in), change their
 * role (with a confirmation that says what they gain and lose), deactivate or remove them. The last
 * active Super admin can't be demoted, deactivated or removed, so nobody is locked out of Settings.
 */
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
  const [form, setForm] = useState<null | { id?: string; name: string; email: string; phone: string; roleId: string }>(null);
  const edit = (u: AdminUser) => setForm({ id: u.id, name: u.name, email: u.email, phone: u.phone, roleId: u.roleId });

  const roleName = (id: string) => L(roles.find((r) => r.id === id)?.name);
  const activeSupers = users.filter((u) => u.roleId === SUPER && u.active && !isInvited(u));
  /** The only active Super admin: keeps Settings reachable for someone. */
  const isLastSuper = (u: AdminUser) => u.roleId === SUPER && u.active && !isInvited(u) && activeSupers.length <= 1;

  const emailTaken = !!form && users.some((u) => u.id !== form.id && u.email.trim().toLowerCase() === form.email.trim().toLowerCase());
  const formValid = !!form && !!form.name.trim() && EMAIL.test(form.email.trim()) && !emailTaken;

  // from the switch or the ⋯ menu: access changes only after a confirmation
  const setActive = (u: AdminUser, active: boolean) =>
    confirm({
      title: tu(active ? "activateTitle" : "deactivateTitle", { name: u.name }),
      body: active ? tu("activateBody", { role: roleName(u.roleId) }) : tu("deactivateBody"),
      tone: active ? "success" : "danger",
      confirmLabel: t(active ? "admin.rows.activate" : "admin.rows.deactivate"),
      onConfirm: () => {
        patch("users", u.id, { active });
        toast.success(t(active ? "admin.rows.memberActivated" : "admin.rows.memberDeactivated", { name: u.name }));
      },
    });
  const resend = (u: AdminUser) => {
    patch("users", u.id, { invitedAt: new Date().toISOString() });
    toast.success(tu("resent", { email: u.email }));
  };

  /** Asks before a role changes and says what the person gains and loses. */
  const confirmRole = (u: Pick<AdminUser, "name" | "roleId">, roleId: string, apply: () => void) => {
    if (roleId === u.roleId) return apply();
    const before = new Set<Permission>(roles.find((r) => r.id === u.roleId)?.permissions ?? []);
    const after = new Set<Permission>(roles.find((r) => r.id === roleId)?.permissions ?? []);
    const gains = [...after].filter((p) => !before.has(p)).map((p) => t(`admin.perm.${p}`));
    const losses = [...before].filter((p) => !after.has(p)).map((p) => t(`admin.perm.${p}`));
    confirm({
      title: tu("roleTitle", { name: u.name, role: roleName(roleId) }),
      body: (
        <span className="block space-y-1.5">
          {gains.length > 0 && <span className="block">{tu("roleGains", { list: gains.join(", ") })}</span>}
          {losses.length > 0 && <span className="block">{tu("roleLoses", { list: losses.join(", ") })}</span>}
          {!gains.length && !losses.length && <span className="block">{tu("roleSame")}</span>}
          <span className="block text-xs">{tu("roleWhen")}</span>
        </span>
      ),
      confirmLabel: tu("roleButton"),
      onConfirm: () => {
        apply();
        toast.success(tu("roleDone", { name: u.name, role: roleName(roleId) }));
      },
    });
  };

  const save = () => {
    if (!form || !formValid) return;
    const values = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), roleId: form.roleId };
    if (form.id) {
      const u = users.find((x) => x.id === form.id)!;
      const write = () => {
        patch("users", u.id, values);
        setForm(null);
      };
      if (values.roleId !== u.roleId) return confirmRole(u, values.roleId, write);
      write();
      toast.success(t("common.toast.saved"));
    } else {
      add("users", { id: `u-${Date.now()}`, ...values, active: true, lastLogin: "", invitedAt: new Date().toISOString() });
      toast.success(tu("invited", { email: values.email }));
      setForm(null);
    }
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
      accessorFn: (u) => roleName(u.roleId),
      cell: ({ row: { original: u } }) => (
        <div className="w-48" onClick={(e) => e.stopPropagation()} title={isLastSuper(u) && u.id !== me?.id ? tu("lastSuper") : undefined}>
          <Select
            size="sm"
            value={u.roleId}
            disabled={u.id === me?.id || isLastSuper(u)}
            onValueChange={(v) => confirmRole(u, v, () => patch("users", u.id, { roleId: v }))}
            options={roles.map((r) => ({ value: r.id, label: L(r.name) }))}
          />
        </div>
      ),
    },
    { id: "phone", header: t("common.fields.phone"), accessorFn: (u) => u.phone, cell: (c) => <span dir="ltr">{(c.getValue() as string) || "–"}</span> },
    {
      id: "login",
      header: tu("lastLogin"),
      accessorFn: (u) => u.lastLogin,
      cell: ({ row: { original: u } }) => <span className="whitespace-nowrap text-muted-foreground">{u.lastLogin ? timeAgo(u.lastLogin, lang) : tu("neverSignedIn")}</span>,
    },
    {
      id: "active",
      header: t("common.fields.status"),
      accessorFn: (u) => (isInvited(u) ? 2 : u.active ? 1 : 0),
      cell: ({ row: { original: u } }) =>
        isInvited(u) ? (
          <span className="flex flex-col items-start gap-0.5">
            <Badge tone="info" dot>{tu("invitedStatus")}</Badge>
            <span className="text-xs text-muted-foreground">{tu("invitedAgo", { when: timeAgo(u.invitedAt!, lang) })}</span>
          </span>
        ) : (
          <label className="flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()} title={isLastSuper(u) && u.id !== me?.id ? tu("lastSuper") : undefined}>
            <Switch checked={u.active} disabled={u.id === me?.id || isLastSuper(u)} onCheckedChange={(v) => setActive(u, v)} />
            {t(u.active ? "common.status.active" : "common.status.inactive")}
          </label>
        ),
    },
    actionsColumn<AdminUser>((u) => (
      <RowActions
        actions={[
          { label: t("common.actions.edit"), icon: <Pencil />, onSelect: () => edit(u) },
          // only people who haven't signed in yet have an invitation to send again
          { label: t("admin.rows.resendInvite"), icon: <Mail />, onSelect: () => resend(u), hidden: !isInvited(u) },
          { label: t(u.active ? "admin.rows.deactivate" : "admin.rows.activate"), icon: u.active ? <UserX /> : <UserCheck />, onSelect: () => setActive(u, !u.active), hidden: u.id === me?.id || isInvited(u) || isLastSuper(u) },
          isInvited(u)
            ? {
                label: tu("cancelInvite"),
                icon: <MailX />,
                tone: "danger",
                separated: true,
                onSelect: () =>
                  confirm({
                    title: tu("cancelInviteTitle", { name: u.name }),
                    body: tu("cancelInviteBody", { email: u.email }),
                    tone: "danger",
                    confirmLabel: tu("cancelInvite"),
                    onConfirm: () => {
                      remove("users", u.id);
                      toast.success(tu("cancelInviteDone", { name: u.name }));
                    },
                  }),
              }
            : {
                label: t("admin.rows.removeMember"),
                icon: <Trash2 />,
                tone: "danger",
                separated: true,
                hidden: u.id === me?.id || isLastSuper(u),
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

  const editing = form?.id ? users.find((u) => u.id === form.id) : undefined;

  return (
    <>
      <PageHeader title={tu("title")} subtitle={tu("subtitle")} actions={<Button onClick={() => setForm({ name: "", email: "", phone: "", roleId: "role-support" })}><UserPlus /> {tu("invite")}</Button>} />
      <DataTable
        data={users}
        columns={columns}
        search={(u) => `${u.name} ${u.email} ${u.phone} ${roleName(u.roleId)}`}
        searchPlaceholder={tu("searchPh")}
        onRowClick={edit}
        filters={[
          { id: "role", label: t("common.fields.role"), options: roles.map((r) => ({ value: r.id, label: L(r.name) })), get: (u) => u.roleId },
          {
            id: "status",
            label: t("common.fields.status"),
            options: [
              { value: "active", label: t("common.status.active") },
              { value: "invited", label: tu("invitedStatus") },
              { value: "inactive", label: t("common.status.inactive") },
            ],
            get: (u) => (isInvited(u) ? "invited" : u.active ? "active" : "inactive"),
          },
        ]}
      />
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? t("admin.rows.editMember") : tu("invite")}</DialogTitle>
            {!form?.id && <DialogDescription>{tu("inviteBody")}</DialogDescription>}
          </DialogHeader>
          {form && (
            <div className="grid gap-4">
              <Field label={t("common.fields.name")} required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label={t("common.fields.email")} required error={emailTaken ? tu("emailTaken") : undefined}>
                <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label={t("common.fields.phone")} hint={tu("phoneHint")}>
                <Input type="tel" dir="ltr" placeholder="+41 79 123 45 67" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field
                label={t("common.fields.role")}
                hint={form.id === me?.id ? t("admin.rows.ownRole") : editing && isLastSuper(editing) ? tu("lastSuper") : undefined}
              >
                <Select
                  disabled={form.id === me?.id || (!!editing && isLastSuper(editing))}
                  value={form.roleId}
                  onValueChange={(v) => setForm({ ...form, roleId: v })}
                  options={roles.map((r) => ({ value: r.id, label: L(r.name) }))}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>{t("common.actions.cancel")}</Button>
            <Button disabled={!formValid} onClick={save}>
              {form?.id ? t("common.actions.save") : <><Mail /> {tu("sendInvite")}</>}
            </Button>
          </DialogFooter>
          {dialog}
        </DialogContent>
      </Dialog>
      {!form && dialog}
    </>
  );
}
