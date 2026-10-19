"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, FileText, HelpCircle, Layers, Tag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/admin/ui";
import { pageSchemas } from "@/components/admin/cms-schemas";

export default function CmsIndex() {
  const t = useTranslations("admin.cms");
  const tn = useTranslations("admin.nav");
  const L = useL();
  const services = useStore((s) => s.services);
  const blogs = useStore((s) => s.blogs);
  const faqs = useStore((s) => s.faqs);
  const modelOffers = useStore((s) => s.modelOffers);
  const schemas = pageSchemas((k) => t(k));

  const collections = [
    { href: "/admin/cms/blog", icon: FileText, label: tn("blog"), count: blogs.length },
    { href: "/admin/cms/faqs", icon: HelpCircle, label: tn("faqs"), count: faqs.length },
    { href: "/admin/cms/example-offers", icon: Tag, label: tn("modelOffers"), count: modelOffers.length },
    { href: "/admin/leads/services", icon: Layers, label: tn("offerTypes"), count: services.length },
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {schemas.map((s) => (
          <Link key={s.key} href={`/admin/cms/${s.key}`}>
            <Card className="group flex h-full items-start gap-4 p-5 transition hover:border-primary/30 hover:shadow-pop">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
                <Icon name={s.icon} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-ink">{t(`pages.${s.key}`)}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{t(`pages.${s.key}Desc`)}</span>
              </span>
              <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("collections")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {collections.map(({ href, icon: I, label, count }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-3 p-4 transition hover:border-primary/30 hover:shadow-pop">
              <I className="size-5 text-accent" />
              <span className="flex-1 font-semibold text-ink">{label}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{count}</span>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wider text-muted-foreground">{tn("offerTypes")}</h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((s) => (
          <Link key={s.id} href={`/admin/cms/services/${s.id}`} className="flex items-center gap-2 rounded-xl border bg-surface px-3 py-2.5 text-sm font-medium transition hover:border-primary/30">
            <Icon name={s.icon} className="size-4 text-primary" /> {L(s.name)}
          </Link>
        ))}
      </div>
    </>
  );
}
