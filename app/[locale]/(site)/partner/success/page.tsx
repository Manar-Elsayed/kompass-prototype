"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function PartnerSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const t = useTranslations("site.partner");
  const tn = useTranslations("site.nav");
  const params = useSearchParams();
  const name = params.get("name") ?? "";
  const id = params.get("id");
  const steps = [t("timeline1"), t("timeline2"), t("timeline3"), t("timeline4")];

  return (
    <section className="container-page max-w-2xl py-16">
      <div className="rounded-3xl border border-border bg-surface p-8 text-center shadow-pop sm:p-12">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-9 text-success" />
        </div>
        <h1 className="text-3xl font-bold text-ink">{t("successTitle")}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{t("successBody", { name })}</p>

        <ol className="mx-auto mt-10 max-w-sm space-y-0 text-start">
          {steps.map((s, i) => (
            <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {i < steps.length - 1 && <span className={cn("absolute start-[15px] top-8 h-[calc(100%-24px)] w-0.5", i === 0 ? "bg-success" : "bg-border")} />}
              <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", i === 0 ? "bg-success text-white" : i === 1 ? "bg-primary-soft text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground")}>
                {i === 0 ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("pt-1.5 text-sm font-semibold", i > 1 ? "text-muted-foreground" : "text-ink")}>{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/">{tn("home")}</Link>
          </Button>
          {id && (
            <Button asChild>
              <Link href={`/portal/login?as=${id}`}>
                {t("trackApplication")} <ArrowRight />
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href="/admin/partners/applications">
              <ExternalLink /> {t("reviewInAdmin")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
