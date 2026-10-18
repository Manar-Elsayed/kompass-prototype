"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useL } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/ui";

export default function ProfilePage() {
  const t = useTranslations();
  const tp = useTranslations("admin.profile");
  const L = useL();
  const { user, role } = useCurrentUser();
  const patch = useStore((s) => s.patch);
  const [form, setForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "" });
  const [pw, setPw] = useState({ a: "", b: "" });
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  return (
    <>
      <PageHeader title={tp("title")} subtitle={tp("subtitle")} />
      <div className="grid max-w-4xl gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-6 text-center">
          <Avatar name={user.name} className="mx-auto size-20 text-xl" />
          <p className="mt-3 font-bold text-ink">{user.name}</p>
          <p className="text-sm text-muted-foreground" dir="ltr">{user.email}</p>
          <Badge tone="primary" className="mt-3">{L(role?.name)}</Badge>
          <div className="mt-4 flex flex-wrap justify-center gap-1">
            {role?.permissions.map((p) => <Badge key={p} tone="neutral">{t(`admin.perm.${p}`)}</Badge>)}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title={tp("title")} />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label={t("common.fields.name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label={t("common.fields.phone")}><Input value={form.phone} dir="ltr" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label={t("common.fields.email")} className="sm:col-span-2"><Input value={user.email} readOnly dir="ltr" className="bg-surface-2" /></Field>
              <div className="sm:col-span-2">
                <Button
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    await mock(() => patch("users", user.id, form));
                    setBusy(false);
                    toast.success(t("common.toast.saved"));
                  }}
                >
                  {t("common.actions.save")}
                </Button>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tp("security")} />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label={tp("newPassword")}><Input type="password" dir="ltr" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></Field>
              <Field label={t("common.fields.confirmPassword")} error={pw.b && pw.a !== pw.b ? t("common.form.passwordMatch") : undefined}>
                <Input type="password" dir="ltr" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Button variant="outline" disabled={pw.a.length < 8 || pw.a !== pw.b} onClick={() => { setPw({ a: "", b: "" }); toast.success(t("common.toast.updated")); }}>
                  {tp("updatePassword")}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
