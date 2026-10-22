"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, FileText, Mail, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { DOC_KEYS, type DocKey, type Partner } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useCurrentUser, useLang } from "@/lib/mock/hooks";
import { documentState, DOC_WARN_DAYS, refNow } from "@/lib/mock/selectors";
import { mock } from "@/lib/mock/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioCards } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const toInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const fromInput = (v: string) => (v ? new Date(`${v}T12:00:00`).toISOString() : undefined);

/**
 * The three required documents with their file, check status and expiry. Admin can accept / reject an
 * upload, set the expiry and upload a replacement; a company can upload a new version, which waits
 * for Kompass to check it. Leads can be bought only while all three are checked and unexpired.
 * During onboarding the portal lists only the documents the applicant uploads (`keys`), without the
 * "blocked" warning, since the company can't buy leads yet anyway.
 */
export function CompanyDocuments({ partner, as, keys = DOC_KEYS, onboarding }: { partner: Partner; as: "admin" | "company"; keys?: readonly DocKey[]; onboarding?: boolean }) {
  const t = useTranslations("admin.partners");
  const td = useTranslations("admin.partners.docs");
  const lang = useLang();
  const review = useStore((s) => s.reviewDocument);
  const setExpiry = useStore((s) => s.setDocumentExpiry);
  const [uploading, setUploading] = useState<DocKey | null>(null);
  const state = documentState(partner);

  return (
    <div>
      {!state.ok && !onboarding && <p className="mb-3 rounded-lg bg-danger-soft/50 px-3 py-2 text-sm font-medium text-danger">{td("blocked")}</p>}
      <ul className="space-y-2">
        {keys.map((key) => {
          const d = partner.documents[key];
          const exp = d?.expiresAt ? Date.parse(d.expiresAt) : undefined;
          const expired = exp !== undefined && exp < refNow();
          const soon = exp !== undefined && !expired && exp - refNow() <= DOC_WARN_DAYS * 86_400_000;
          return (
            <li key={key} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn("flex size-10 items-center justify-center rounded-lg", !d || d.status === "rejected" || expired ? "bg-danger-soft text-danger" : d.status === "pending_review" ? "bg-info-soft text-info" : "bg-success-soft text-success")}>
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t(key)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d ? `${d.file} · ${td("uploaded", { date: formatDate(d.uploadedAt, lang) })}` : t("notUploaded")}
                  </p>
                </div>
                {d && <Badge tone={d.status === "valid" ? "success" : d.status === "rejected" ? "danger" : "info"}>{td(`status.${d.status}`)}</Badge>}
                <Button size="sm" variant="outline" onClick={() => setUploading(key)}>
                  <Upload /> {d ? td("replace") : td("upload")}
                </Button>
              </div>
              {d && d.status !== "rejected" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
                  <span className={cn("me-auto", expired ? "font-semibold text-danger" : soon ? "font-semibold text-warning" : "text-muted-foreground")}>
                    {d.expiresAt ? td(expired ? "expiredOn" : "expires", { date: formatDate(d.expiresAt, lang) }) : td("noExpiry")}
                  </span>
                  {as === "admin" && (
                    <Input
                      type="date"
                      aria-label={td("expiryLabel")}
                      className="h-8 w-40"
                      value={toInput(d.expiresAt)}
                      onChange={(e) => {
                        const iso = fromInput(e.target.value);
                        if (iso) setExpiry(partner.id, key, iso);
                      }}
                    />
                  )}
                  {as === "admin" && d.status === "pending_review" && (
                    <>
                      <Button size="sm" variant="success" onClick={() => { review(partner.id, key, true); toast.success(td("accepted")); }}><Check /> {td("approve")}</Button>
                      <Button size="sm" variant="danger-soft" onClick={() => { review(partner.id, key, false); toast.success(td("rejectedToast")); }}><X /> {td("reject")}</Button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {uploading && <UploadDocDialog partner={partner} docKey={uploading} as={as} onClose={() => setUploading(null)} />}
    </div>
  );
}

function UploadDocDialog({ partner, docKey, as, onClose }: { partner: Partner; docKey: DocKey; as: "admin" | "company"; onClose: () => void }) {
  const t = useTranslations("admin.partners");
  const td = useTranslations("admin.partners.docs");
  const tc = useTranslations("common.actions");
  const upload = useStore((s) => s.uploadDocument);
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState("");
  const [expiry, setExpiryValue] = useState(toInput(partner.documents[docKey]?.expiresAt));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await mock(() => upload(partner.id, docKey, file, fromInput(expiry), as));
    setBusy(false);
    toast.success(as === "admin" ? td("uploadedToast") : td("sentForReview"));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(docKey)}</DialogTitle>
          <DialogDescription>{as === "admin" ? td("adminUploadHint") : td("companyUploadHint")}</DialogDescription>
        </DialogHeader>
        <Field label={td("file")} required>
          <div className="flex items-center gap-3 rounded-xl border border-dashed p-3">
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{file || td("noFile")}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>{td("choose")}</Button>
            <input ref={ref} type="file" accept=".pdf,image/*" hidden onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0].name)} />
          </div>
        </Field>
        <Field label={td("expiryLabel")} required={docKey !== "register"}>
          <Input type="date" value={expiry} onChange={(e) => setExpiryValue(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={save} disabled={!file || (docKey !== "register" && !expiry)} loading={busy}><Upload /> {td("upload")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Admin writes to a company from its profile: shown in the company's portal, and emailed when chosen. */
export function ContactCompanyDialog({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const t = useTranslations("admin.partners.contactCo");
  const tc = useTranslations("common.actions");
  const { user } = useCurrentUser();
  const send = useStore((s) => s.sendCompanyMessage);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<"email" | "portal">("email");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    await mock(() => send({ partnerId: partner.id, subject: subject.trim(), body: body.trim(), channel, byUserId: user?.id }));
    setBusy(false);
    toast.success(t("sent", { name: partner.name }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title", { name: partner.name })}</DialogTitle>
          <DialogDescription>{channel === "email" ? `${partner.email} · ${t("emailHint")}` : t("portalHint")}</DialogDescription>
        </DialogHeader>
        <Field label={t("channel")}>
          <RadioCards className="grid-cols-2" value={channel} onValueChange={(v) => setChannel(v as "email" | "portal")} options={(["email", "portal"] as const).map((c) => ({ value: c, label: t(`channels.${c}`) }))} />
        </Field>
        <Field label={t("subject")} required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label={t("message")} required>
          <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={submit} disabled={!subject.trim() || body.trim().length < 3} loading={busy}><Mail /> {tc("send")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
