"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * One "Contact" button instead of separate Call / Email (/ Website) buttons: it opens a small menu
 * with each way to reach the person, showing the number or address so it can be checked first.
 * Used wherever a screen offered those buttons side by side, so action rows stay on one line.
 */
export function ContactMenu({
  phone,
  email,
  website,
  label,
  variant = "outline",
  className,
}: {
  phone?: string;
  email?: string;
  website?: string;
  /** Defaults to "Contact". */
  label?: string;
  variant?: "outline" | "default";
  className?: string;
}) {
  const t = useTranslations("common.contactMenu");
  if (!phone && !email && !website) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} className={className}>
          <MessageCircle /> {label ?? t("button")} <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {phone && (
          <DropdownMenuItem onSelect={() => { window.location.href = `tel:${phone}`; }}>
            <Phone />
            <span className="flex flex-col">
              {t("call")}
              <span className="text-xs text-muted-foreground" dir="ltr">{phone}</span>
            </span>
          </DropdownMenuItem>
        )}
        {email && (
          <DropdownMenuItem onSelect={() => { window.location.href = `mailto:${email}`; }}>
            <Mail />
            <span className="flex flex-col">
              {t("email")}
              <span className="text-xs text-muted-foreground" dir="ltr">{email}</span>
            </span>
          </DropdownMenuItem>
        )}
        {website && (
          <>
            {(phone || email) && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={() => window.open(website, "_blank", "noopener,noreferrer")}>
              <ExternalLink /> {t("website")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
