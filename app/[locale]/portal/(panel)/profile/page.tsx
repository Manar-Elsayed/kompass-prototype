"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Info, Lock, MessageSquarePlus, Send } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useL } from "@/lib/mock/hooks";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";
import { DL, PageHeader } from "@/components/admin/ui";
import { CompanyDocuments } from "@/components/admin/company-docs";

/**
 * The company sees all its data but may change only its phone number; every other change goes
 * through Kompass ("Request a change" lands in the admin inbox). Documents can be re-uploaded and
 * wait for Kompass to check them.
 */
export default function PartnerProfile() {
  const t = useTranslations("portal.profile");
  const tf = useTranslations("common.fields");
  const tp = useTranslations("site.partner");
  const ta = useTranslations("admin.partners");
  const tc = useTranslations("common");
  const tsh = useTranslations("portal.shell");
  const L = useL();
  const partner = useCurrentPartner()!;
  const services = useStore((s) => s.services);
  const patch = useStore((s) => s.patch);
  const [phone, setPhone] = useState(partner.phone);
  const [busy, setBusy] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const dirty = phone.trim() !== partner.phone;

  const save = async () => {
    setBusy(true);
    await mock(() => patch("partners", partner.id, { phone: phone.trim() }));
    setBusy(false);
    toast.success(t("saved"));
  };

  const ro = (label: string, value: string, wide = false) => (
    <Field label={label} className={wide ? "sm:col-span-2" : undefined}>
      <Input value={value} readOnly tabIndex={-1} className="bg-surface-2 text-muted-foreground" />
    </Field>
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Button asChild variant="outline"><Link href={`/companies/${partner.id}`} target="_blank"><ExternalLink /> {tsh("viewProfile")}</Link></Button>
            <Button variant="outline" onClick={() => setRequesting(true)}><MessageSquarePlus /> {t("requestChange")}</Button>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={t("public")} />
            <CardBody>
              <p className="mb-4 flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0" /> {t("readOnly")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {ro(tp("companyName"), partner.name)}
                {ro(tp("regNumber"), partner.regNumber)}
                <Field label={tf("phone")} hint={t("phoneHint")}>
                  <div className="flex gap-2">
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    {dirty && <Button onClick={save} loading={busy} className="shrink-0">{tc("actions.save")}</Button>}
                  </div>
                </Field>
                {ro(tf("mobile"), partner.mobile)}
                {ro(tf("email"), partner.email)}
                {ro(tf("website"), partner.website)}
                {ro(tf("street"), partner.address, true)}
                {ro(tf("zip"), partner.zip)}
                {ro(tf("city"), partner.city)}
                <Field label={tp("about")} className="sm:col-span-2">
                  <Textarea value={L(partner.about)} readOnly tabIndex={-1} rows={3} className="bg-surface-2 text-muted-foreground" />
                </Field>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ta("servicesOffered")} />
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {services.filter((s) => partner.serviceIds.includes(s.id)).map((s) => (
                  <Badge key={s.id} tone="primary" className="px-3 py-1.5 text-sm"><Icon name={s.icon} className="!size-4" /> {L(s.name)}</Badge>
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />{t("servicesHint")}</p>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title={ta("docs.title")} description={t("docsHint")} />
            <CardBody>
              <CompanyDocuments partner={partner} as="company" />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ta("bank")} />
            <CardBody>
              <DL cols={1} items={[{ label: tp("bankName"), value: partner.bank.name }, { label: tp("bankOwner"), value: partner.bank.owner }, { label: "IBAN", value: partner.bank.iban, ltr: true }]} />
            </CardBody>
          </Card>
        </div>
      </div>
      {requesting && <RequestChangeDialog onClose={() => setRequesting(false)} />}
    </>
  );
}

function RequestChangeDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("portal.profile");
  const tc = useTranslations("common.actions");
  const partner = useCurrentPartner()!;
  const request = useStore((s) => s.requestProfileChange);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("requestChange")}</DialogTitle>
          <DialogDescription>{t("requestHint")}</DialogDescription>
        </DialogHeader>
        <Textarea rows={5} value={message} placeholder={t("requestPh")} onChange={(e) => setMessage(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            disabled={message.trim().length < 5}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await mock(() => request(partner.id, message.trim()));
              setBusy(false);
              toast.success(t("requestSent"));
              onClose();
            }}
          >
            <Send /> {tc("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
