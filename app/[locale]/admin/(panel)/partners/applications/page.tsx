"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, FileSignature, FileText, MapPin, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { Partner } from "@/lib/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL, useLang, useServiceMap } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/controls";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { EmptyState, StatusBadge, useConfirm } from "@/components/shared/bits";
import { DL, PageHeader } from "@/components/admin/ui";
import { ExpiryDialog } from "@/components/admin/expiry-dialog";

const COLUMNS = ["pending", "contract_sent", "rejected"] as const;

export default function ApplicationsPage() {
  const t = useTranslations();
  const ta = useTranslations("admin.applications");
  const L = useL();
  const lang = useLang();
  const partners = useStore((s) => s.partners);
  const decide = useStore((s) => s.decideApplication);
  const serviceMap = useServiceMap();
  const { confirm, dialog } = useConfirm();
  const [approving, setApproving] = useState<Partner | null>(null);
  const [open, setOpen] = useState<Partner | null>(null);

  const apps = partners.filter((p) => p.status !== "approved");
  const docsCount = (p: Partner) => Object.values(p.documents).filter(Boolean).length;

  const sendContract = (p: Partner) => {
    decide(p.id, "contract_sent");
    toast.success(ta("contractSent", { name: p.name }));
  };
  const reject = (p: Partner) =>
    confirm({
      title: ta("rejectTitle", { name: p.name }),
      body: ta("rejectBody"),
      tone: "danger",
      confirmLabel: t("common.actions.reject"),
      onConfirm: () => {
        decide(p.id, "rejected");
        setOpen(null);
        toast.success(t("common.toast.updated"));
      },
    });

  const actions = (p: Partner, full?: boolean) =>
    p.status === "rejected" ? null : (
      <div className={cn("flex gap-2", full ? "flex-col sm:flex-row" : "")}>
        {p.status === "pending" && (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => sendContract(p)}>
            <Send /> {ta("sendContract")}
          </Button>
        )}
        <Button size="sm" variant="success" className="flex-1" onClick={() => setApproving(p)}>
          <Check /> {t("common.actions.approve")}
        </Button>
        <Button size={full ? "sm" : "icon-sm"} variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => reject(p)} aria-label={t("common.actions.reject")}>
          <X /> {full && t("common.actions.reject")}
        </Button>
      </div>
    );

  return (
    <>
      <PageHeader title={ta("title")} subtitle={ta("subtitle")} />

      {apps.filter((p) => p.status !== "rejected").length === 0 && (
        <Card className="mb-4">
          <EmptyState icon={<FileSignature />} title={ta("empty")} />
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = apps.filter((p) => p.status === col);
          return (
            <section key={col} className={cn("rounded-2xl bg-surface-2/70 p-3", col === "rejected" && "opacity-80")}>
              <header className="mb-3 flex items-center justify-between px-1">
                <StatusBadge status={col} />
                <span className="text-xs font-bold text-muted-foreground">{items.length}</span>
              </header>
              <div className="space-y-3">
                {items.map((p) => (
                  <Card key={p.id} className="cursor-pointer p-4 transition hover:shadow-pop" onClick={() => setOpen(p)}>
                    <div className="flex items-start gap-3">
                      <Avatar name={p.name} square className="size-10" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{p.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{p.city} · {timeAgo(p.createdAt, lang)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.serviceIds.map((id) => <Badge key={id}>{L(serviceMap[id]?.name)}</Badge>)}
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="size-3.5" /> {docsCount(p)}/3 {t("admin.partners.documents")}
                    </p>
                    {col !== "rejected" && (
                      <div className="mt-3 border-t pt-3" onClick={(e) => e.stopPropagation()}>
                        {actions(p)}
                      </div>
                    )}
                  </Card>
                ))}
                {items.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted-foreground">–</p>}
              </div>
            </section>
          );
        })}
      </div>

      {/* application detail drawer */}
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="max-w-xl overflow-y-auto">
          {open && (
            <div className="space-y-5 p-6">
              <div className="flex items-center gap-3">
                <Avatar name={open.name} square className="size-12" />
                <div>
                  <DialogTitle>{open.name}</DialogTitle>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge status={open.status} /> {ta("received")} {formatDate(open.createdAt, lang)}
                  </div>
                </div>
              </div>
              <section className="rounded-xl border p-4">
                <p className="mb-3 text-sm font-bold text-ink">{t("site.partner.steps.company")}</p>
                <DL items={[
                  { label: t("site.partner.regNumber"), value: open.regNumber, ltr: true },
                  { label: t("site.partner.foundedYear"), value: open.foundedYear },
                  { label: t("site.partner.owner"), value: open.ownerName },
                  { label: t("common.fields.website"), value: open.website || "–", ltr: true },
                ]} />
              </section>
              <section className="rounded-xl border p-4">
                <p className="mb-3 text-sm font-bold text-ink">{t("site.partner.steps.contact")}</p>
                <DL items={[
                  { label: t("common.fields.email"), value: open.email, ltr: true },
                  { label: t("common.fields.phone"), value: open.phone, ltr: true },
                  { label: t("common.fields.mobile"), value: open.mobile || "–", ltr: true },
                  { label: t("common.fields.address"), value: `${open.address}, ${open.zip} ${open.city}` },
                ]} />
              </section>
              <section className="rounded-xl border p-4">
                <p className="mb-3 text-sm font-bold text-ink">{t("site.partner.steps.bank")}</p>
                <DL items={[
                  { label: t("site.partner.bankName"), value: open.bank.name },
                  { label: t("site.partner.bankOwner"), value: open.bank.owner },
                  { label: "IBAN", value: open.bank.iban, ltr: true },
                ]} />
              </section>
              <section className="rounded-xl border p-4">
                <p className="mb-2 text-sm font-bold text-ink">{t("site.partner.about")}</p>
                <p className="text-sm text-foreground/90">{L(open.about)}</p>
                <div className="mt-3 flex flex-wrap gap-1">{open.serviceIds.map((id) => <Badge key={id} tone="primary">{L(serviceMap[id]?.name)}</Badge>)}</div>
              </section>
              <section className="rounded-xl border p-4">
                <p className="mb-3 text-sm font-bold text-ink">{t("admin.partners.documents")}</p>
                <ul className="space-y-2 text-sm">
                  {(["contract", "insurance", "register"] as const).map((k) => (
                    <li key={k} className="flex items-center justify-between">
                      <span>{t(`admin.partners.${k}`)}</span>
                      {open.documents[k] ? <Badge tone="success"><Check /> {open.documents[k]}</Badge> : <Badge>{t("admin.partners.notUploaded")}</Badge>}
                    </li>
                  ))}
                </ul>
              </section>
              <div className="sticky bottom-0 -mx-6 border-t bg-surface px-6 py-4">{actions(open, true)}</div>
            </div>
          )}
        </SheetContent>
      </Dialog>

      {approving && (
        <ExpiryDialog
          open
          onOpenChange={(v) => !v && setApproving(null)}
          title={ta("approveTitle", { name: approving.name })}
          body={ta("approveBody")}
          confirmLabel={t("common.actions.approve")}
          onSave={(iso) => {
            decide(approving.id, "approved", iso);
            toast.success(ta("approved", { name: approving.name }));
            setApproving(null);
            setOpen(null);
          }}
        />
      )}
      {dialog}
    </>
  );
}
