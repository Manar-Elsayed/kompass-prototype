"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, CheckCircle2, Circle, ExternalLink, FileSignature, Mail, Phone, Send, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { Partner } from "@/lib/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { applicationStage } from "@/lib/mock/selectors";
import { useHydrated, useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, StatusBadge } from "@/components/shared/bits";
import { Icon } from "@/components/shared/icon";
import { DL, ProfileHeader } from "@/components/admin/ui";
import { ExpiryDialog } from "@/components/admin/expiry-dialog";

/** One application: everything the company submitted, what is still missing, and the decision. */
export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const ta = useTranslations("admin.applications");
  const L = useL();
  const lang = useLang();
  const router = useRouter();
  const hydrated = useHydrated();
  const p = useStore((s) => s.partners.find((x) => x.id === id));
  const decide = useStore((s) => s.decideApplication);
  const serviceMap = useServiceMap();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  if (!p) {
    if (!hydrated) return <Skeleton className="h-64" />;
    return (
      <Card>
        <EmptyState title={t("common.notFound.title")} action={<Button asChild variant="outline"><Link href="/admin/partners/applications">{ta("title")}</Link></Button>} />
      </Card>
    );
  }
  // approved companies live on the partner page
  if (p.status === "approved") {
    return (
      <Card>
        <EmptyState
          icon={<CheckCircle2 />}
          title={ta("alreadyPartner", { name: p.name })}
          action={<Button asChild><Link href={`/admin/partners/${p.id}`}>{ta("openPartner")}</Link></Button>}
        />
      </Card>
    );
  }

  const open = p.status !== "rejected";
  // what the checklist shows; approving with gaps is allowed (e.g. paper contract) but flagged
  const checks: { label: string; ok: boolean; detail: string }[] = [
    {
      label: t("admin.partners.contract"),
      ok: !!p.contractSignedAt,
      detail: p.contractSignedAt
        ? `${ta("signedBy", { name: p.contractSignedBy ?? p.ownerName, date: formatDate(p.contractSignedAt, lang) })}${p.contractVersion ? ` · ${p.contractVersion}` : ""}`
        : p.status === "contract_sent"
          ? ta("awaitingSignature")
          : ta("noContractYet"),
    },
    ...(["insurance", "register"] as const).map((k) => {
      const d = p.documents[k];
      return {
        label: t(`admin.partners.${k}`),
        ok: !!d && d.status !== "rejected",
        detail: d ? `${d.file} · ${t(`admin.partners.docs.status.${d.status}`)}` : t("admin.partners.notUploaded"),
      };
    }),
  ];
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);

  const sendContract = () => {
    decide(p.id, "contract_sent");
    toast.success(ta("contractSent", { name: p.name }));
  };

  return (
    <>
      <ProfileHeader
        crumbs={[{ label: ta("title"), href: "/admin/partners/applications" }, { label: p.name }]}
        avatar={<Avatar name={p.name} square className="size-14 rounded-2xl text-base" />}
        title={p.name}
        badges={<StatusBadge status={applicationStage(p)} />}
        subtitle={`${p.address}, ${p.zip} ${p.city} (${p.canton}) · ${ta("received")} ${formatDate(p.createdAt, lang)} (${timeAgo(p.createdAt, lang)})`}
        primary={
          open ? (
            <>
              {p.status === "pending" && (
                <Button variant="outline" onClick={sendContract}><Send /> {ta("sendContract")}</Button>
              )}
              <Button variant="danger-soft" onClick={() => setRejecting(true)}><X /> {ta("decline")}</Button>
              <Button variant="success" onClick={() => setApproving(true)}><Check /> {t("common.actions.approve")}</Button>
            </>
          ) : undefined
        }
        secondary={
          <>
            <Button asChild variant="outline"><a href={`mailto:${p.email}`}><Mail /> {ta("emailApplicant")}</a></Button>
            <Button asChild variant="outline"><a href={`tel:${p.phone}`}><Phone /> {ta("callApplicant")}</a></Button>
            {p.website && (
              <Button asChild variant="outline"><a href={p.website} target="_blank" rel="noreferrer"><ExternalLink /> {t("common.fields.website")}</a></Button>
            )}
          </>
        }
      />

      {p.status === "rejected" && p.rejectionReason && (
        <Card className="mb-4 flex items-start gap-3 border-danger/20 bg-danger-soft/40 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="font-bold text-ink">{ta("declinedTitle")}</p>
            <p className="text-sm text-muted-foreground">{p.rejectionReason}</p>
          </div>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={t("site.partner.steps.company")} />
            <CardBody>
              <DL
                items={[
                  { label: t("site.partner.regNumber"), value: p.regNumber, ltr: true },
                  { label: t("site.partner.foundedYear"), value: p.foundedYear },
                  { label: t("site.partner.owner"), value: p.ownerName },
                  { label: t("common.fields.website"), value: p.website || "–", ltr: true },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("site.partner.steps.contact")} />
            <CardBody>
              <DL
                items={[
                  { label: t("common.fields.email"), value: p.email, ltr: true },
                  { label: t("common.fields.phone"), value: p.phone, ltr: true },
                  { label: t("common.fields.mobile"), value: p.mobile || "–", ltr: true },
                  { label: t("common.fields.address"), value: `${p.address}, ${p.zip} ${p.city} (${p.canton})` },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ta("aboutTitle")} />
            <CardBody className="space-y-4">
              <p className="text-sm text-foreground/90">{L(p.about)}</p>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("common.fields.services")}</p>
                <div className="flex flex-wrap gap-2">
                  {p.serviceIds.map((sid) => (
                    <Badge key={sid} tone="primary" className="px-3 py-1 text-sm"><Icon name={serviceMap[sid]?.icon ?? "Truck"} className="!size-3.5" /> {L(serviceMap[sid]?.name)}</Badge>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {/* what is still needed before approving */}
          <Card className={cn(open && missing.length > 0 && "border-warning/40")}>
            <CardHeader title={ta("readyTitle")} description={missing.length ? ta("readyMissing", { count: missing.length }) : ta("readyAll")} />
            <CardBody>
              <ul className="space-y-3">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-3">
                    {c.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{c.label}</span>
                      <span className="block text-xs text-muted-foreground">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {open && p.status === "pending" && !p.contractSignedAt && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-info-soft/60 p-3 text-xs text-ink">
                  <FileSignature className="mt-0.5 size-3.5 shrink-0 text-info" /> {ta("sendContractHint")}
                </p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("site.partner.steps.bank")} />
            <CardBody>
              <DL
                cols={1}
                items={[
                  { label: t("site.partner.bankName"), value: p.bank.name },
                  { label: t("site.partner.bankOwner"), value: p.bank.owner },
                  { label: "IBAN", value: p.bank.iban, ltr: true },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {approving && (
        <ExpiryDialog
          open
          onOpenChange={(v) => !v && setApproving(false)}
          title={ta("approveTitle", { name: p.name })}
          body={
            <>
              {ta("approveBody")}
              {missing.length > 0 && (
                <span className="mt-3 flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {ta("approveMissing", { items: missing.join(", ") })}
                </span>
              )}
            </>
          }
          confirmLabel={t("common.actions.approve")}
          onSave={(iso) => {
            decide(p.id, "approved", iso);
            toast.success(ta("approved", { name: p.name }));
            setApproving(false);
            // the new partner is managed on its partner page from now on
            router.push(`/admin/partners/${p.id}`);
          }}
        />
      )}
      {rejecting && (
        <RejectDialog
          partner={p}
          onClose={() => setRejecting(false)}
          onReject={(reason) => {
            decide(p.id, "rejected", undefined, reason);
            toast.success(ta("declined", { name: p.name }));
            setRejecting(false);
          }}
        />
      )}
    </>
  );
}

/** Declining needs a reason: the applicant sees it in the partner portal. */
function RejectDialog({ partner, onClose, onReject }: { partner: Partner; onClose: () => void; onReject: (reason: string) => void }) {
  const t = useTranslations();
  const ta = useTranslations("admin.applications");
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ta("rejectTitle", { name: partner.name })}</DialogTitle>
          <DialogDescription>{ta("rejectBody")}</DialogDescription>
        </DialogHeader>
        <Field label={ta("reasonLabel")} hint={ta("reasonHint")} required>
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={ta("reasonPh")} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.actions.cancel")}</Button>
          <Button variant="danger" disabled={reason.trim().length < 10} onClick={() => onReject(reason)}><X /> {ta("decline")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
