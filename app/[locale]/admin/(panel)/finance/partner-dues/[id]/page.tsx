"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Check, CheckCircle2, Clock, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useHydrated, useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/bits";
import { DueStatusBadge } from "@/components/shared/due-status";
import { PaymentProof } from "@/components/shared/payment-proof";
import { DL, Mono, PageHeader } from "@/components/admin/ui";
import { useDueDecision } from "@/components/admin/due-actions";

/** One payment a company reported: its proof, what it pays, and the wallet it changes. */
export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const td = useTranslations("admin.dues");
  const lang = useLang();
  const hydrated = useHydrated();
  const due = useStore((s) => s.dues.find((d) => d.id === id));
  const partner = useStore((s) => s.partners.find((p) => p.id === due?.partnerId));
  const { approve, reject, dialog } = useDueDecision();

  if (!due) {
    if (!hydrated) return <Skeleton className="h-64" />;
    return (
      <Card>
        <EmptyState title={t("common.notFound.title")} action={<Button asChild variant="outline"><Link href="/admin/finance/partner-dues">{td("title")}</Link></Button>} />
      </Card>
    );
  }
  const pending = due.status === "pending";

  return (
    <>
      <PageHeader
        crumbs={[{ label: td("title"), href: "/admin/finance/partner-dues" }, { label: due.id }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Mono className="text-2xl">{due.id}</Mono>
            <DueStatusBadge status={due.status} />
          </span>
        }
        subtitle={`${partner?.name ?? "–"} · ${td("uploaded")} ${formatDate(due.createdAt, lang)}`}
        actions={
          <>
            {partner && (
              <Button asChild variant="outline">
                <Link href={`/admin/partners/${partner.id}`}><Building2 /> {t("admin.rows.openCompany")}</Link>
              </Button>
            )}
            {pending && (
              <>
                <Button variant="danger-soft" onClick={() => reject(due)}><X /> {t("common.actions.reject")}</Button>
                <Button variant="success" onClick={() => approve(due)}><Check /> {t("common.actions.approve")}</Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* what the company uploaded as proof */}
        <Card>
          <CardHeader title={td("proofTitle")} />
          <CardBody>
            <div className="mx-auto max-w-xl">
              <PaymentProof due={due} partner={partner} />
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {/* where the check stands */}
          {pending ? (
            <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft/50 p-4 text-sm text-ink">
              <Clock className="mt-0.5 size-4 shrink-0 text-warning" /> {td("noteWaiting")}
            </p>
          ) : (
            <p className={due.status === "confirmed" ? "flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft/40 p-4 text-sm font-semibold text-success" : "flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft/40 p-4 text-sm font-semibold text-danger"}>
              {due.status === "confirmed" ? <CheckCircle2 className="size-4" /> : <X className="size-4" />}
              {td(due.status === "confirmed" ? "noteApproved" : "noteRejected", { date: formatDate(due.decidedAt ?? due.createdAt, lang) })}
            </p>
          )}

          <Card>
            <CardHeader title={td("summaryTitle")} />
            <CardBody>
              <DL
                cols={1}
                items={[
                  { label: t("common.fields.amount"), value: <span className="text-lg font-bold text-ink">{formatCHF(due.amount, lang)}</span> },
                  { label: td("forLabel"), value: due.invoiceId ? td("forInvoice", { id: due.invoiceId }) : td("forWallet") },
                  { label: td("method"), value: td(due.method) },
                  { label: t("common.fields.reference"), value: <Mono>{due.reference}</Mono> },
                  { label: td("uploaded"), value: formatDate(due.createdAt, lang) },
                ]}
              />
            </CardBody>
          </Card>

          {partner && (
            <Card>
              <CardHeader title={t("admin.rows.walletImpact")} />
              <CardBody>
                <DL
                  cols={1}
                  items={[
                    { label: t("common.fields.company"), value: <Link href={`/admin/partners/${partner.id}`} className="font-semibold text-primary hover:underline">{partner.name}</Link> },
                    { label: t("admin.rows.walletNow"), value: formatCHF(partner.wallet, lang) },
                    ...(pending
                      ? [
                          {
                            label: t("admin.rows.walletAfter"),
                            value: due.invoiceId ? (
                              <span className="text-muted-foreground">{formatCHF(partner.wallet, lang)} · {td("walletUnchanged")}</span>
                            ) : (
                              <span className="font-bold text-success">{formatCHF(partner.wallet + due.amount, lang)}</span>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
      {dialog}
    </>
  );
}
