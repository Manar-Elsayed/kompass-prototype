"use client";

import { useCompanyMedia } from "@/lib/mock/hooks";
import { Avatar } from "@/components/ui/controls";

/** A company's logo from its files, or its initials when it has none. */
export function CompanyLogo({ partnerId, name, className }: { partnerId: string; name: string; className?: string }) {
  const { logo } = useCompanyMedia(partnerId);
  return <Avatar name={name} src={logo?.url} square className={className} />;
}
