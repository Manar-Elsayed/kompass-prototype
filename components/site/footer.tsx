"use client";

import { useTranslations } from "next-intl";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Logo } from "@/components/shared/bits";

export function SiteFooter() {
  const t = useTranslations("site");
  const L = useL();
  const general = useStore((s) => s.site.general);
  const services = useStore((s) => s.services);
  const year = 2026;

  const col = "space-y-2.5 text-sm";
  const link = "text-white/70 transition hover:text-white";
  const socials = [
    { href: general.socials.facebook, Icon: Facebook, label: "Facebook" },
    { href: general.socials.instagram, Icon: Instagram, label: "Instagram" },
    { href: general.socials.linkedin, Icon: Linkedin, label: "LinkedIn" },
    { href: general.socials.youtube, Icon: Youtube, label: "YouTube" },
  ];

  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <Logo light />
          <p className="max-w-sm text-sm leading-relaxed text-white/70">{L(general.footerAbout)}</p>
          <div className="flex gap-2">
            {socials.map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex size-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-accent"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t("footer.services")}</h4>
          <ul className={col}>
            {services
              .filter((s) => s.active)
              .sort((a, b) => a.order - b.order)
              .slice(0, 6)
              .map((s) => (
                <li key={s.id}>
                  <Link href={`/services/${s.slug}`} className={link}>
                    {L(s.name)}
                  </Link>
                </li>
              ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t("footer.company")}</h4>
          <ul className={col}>
            <li><Link href="/about" className={link}>{t("nav.about")}</Link></li>
            <li><Link href="/companies" className={link}>{t("nav.companies")}</Link></li>
            <li><Link href="/blogs" className={link}>{t("nav.blogs")}</Link></li>
            <li><Link href="/ratings" className={link}>{t("nav.ratings")}</Link></li>
            <li><Link href="/faqs" className={link}>{t("nav.faqs")}</Link></li>
            <li><Link href="/partner" className={link}>{t("nav.partners")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t("nav.contact")}</h4>
          <ul className={col}>
            <li className="flex items-start gap-2 text-white/70">
              <Phone className="mt-0.5 size-4 shrink-0 text-accent" />
              <a href={`tel:${general.phone}`} dir="ltr" className="hover:text-white">{general.phone}</a>
            </li>
            <li className="flex items-start gap-2 text-white/70">
              <Mail className="mt-0.5 size-4 shrink-0 text-accent" />
              <a href={`mailto:${general.email}`} className="hover:text-white">{general.email}</a>
            </li>
            <li className="flex items-start gap-2 text-white/70">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>{L(general.address)}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.rights", { year })}</p>
          <div className="flex gap-5">
            <Link href="/imprint" className="hover:text-white">{t("footer.imprint")}</Link>
            <Link href="/privacy" className="hover:text-white">{t("footer.privacy")}</Link>
            <Link href="/terms" className="hover:text-white">{t("footer.terms")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
