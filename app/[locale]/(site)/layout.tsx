import { setRequestLocale } from "next-intl/server";
import { SiteShell } from "@/components/site/site-shell";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SiteShell>{children}</SiteShell>;
}
