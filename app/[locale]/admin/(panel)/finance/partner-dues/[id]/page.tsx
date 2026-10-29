"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { formatCHF, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useHydrated, useLang } from "@/lib/mock/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/bits";
import { ProofCard } from "@/components/shared/payment-proof";
import { DL, Mono, PageHeader } from "@/components/admin/ui";

/** One payment a company reported: its proof, what it pays, and the wallet it changes. */
export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const td = useTranslations("admin.dues");
  const lang = useLang();
  const hydrated = useHydrated();
  const due = useStore((s) => s.dues.find((d) => d.id === id));
  const patch = useStore((s) => s.patch);
  const partner = useStore((s) => s.partners.find((p) => p.id === due?.partnerId));

  if (!due) {
    if (!hydrated) return <Skeleton className="h-64" />;
    return (
      <Card>
        <EmptyState title={t("common.notFound.title")} action={<Button asChild variant="outline"><Link href="/admin/finance/partner-dues">{td("title")}</Link></Button>} />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: td("title"), href: "/admin/finance/partner-dues" }, { label: due.id }]}
        title={
<Mono className="text-2xl">{due.id}</Mono>
        }
        subtitle={`${partner?.name ?? "–"} · ${td("uploaded")} ${formatDate(due.createdAt, lang)}`}
        actions={
          <>
            {partner && (
              <Button asChild variant="outline">
                <Link href={`/admin/partners/${partner.id}`}><Building2 /> {t("admin.rows.openCompany")}</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
        {/* what the payment did, across the full width so it's read first */}
        <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft/40 p-4 text-sm font-semibold text-success">
          <CheckCircle2 className="size-4" />
          {due.invoiceId ? td("invoicePaidOn", { id: due.invoiceId, date: formatDate(due.createdAt, lang) }) : td("creditedOn", { date: formatDate(due.createdAt, lang) })}
        </p>

        {/* the payment and the wallet it changes, side by side */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title={td("summaryTitle")} />
            <CardBody>
              <DL
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
                  items={[
                    { label: t("common.fields.company"), value: <Link href={`/admin/partners/${partner.id}`} className="font-semibold text-primary hover:underline">{partner.name}</Link> },
                    { label: t("admin.rows.walletNow"), value: formatCHF(partner.wallet, lang) },
                  ]}
                />
              </CardBody>
            </Card>
          )}
        </div>

        {/* what the company uploaded as proof */}
        <Card>
          <CardHeader title={td("proofTitle")} />
          <CardBody>
            <ProofCard
              due={due}
              partner={partner}
              meta={`${td("uploaded")} ${formatDate(due.createdAt, lang)}`}
              onUpload={(f) => {
                patch("dues", due.id, { receipt: f.url && f.url !== "#" ? f.url : due.receipt });
                toast.success(t("common.files.uploaded"));
              }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
