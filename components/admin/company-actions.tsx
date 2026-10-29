"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HandCoins, Lock, LockOpen, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { Partner } from "@/lib/types";
import { useStore } from "@/lib/mock/store";
import { useConfirm } from "@/components/shared/bits";
import { ContactCompanyDialog } from "./company-docs";
import { CreditDialog } from "./wallet-actions";
import type { RowAction } from "./row-actions";

/**
 * The things admin does to a company from any list it appears in (partners, activity, wallets…):
 * contact it, charge credit, ban it. A banned company only offers Unban (next to View). Returns the menu items and the dialogs.
 */
export function useCompanyActions() {
  const t = useTranslations();
  const patch = useStore((s) => s.patch);
  const partners = useStore((s) => s.partners);
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState<{ kind: "contact" | "credit"; id: string } | null>(null);
  const partner = open && partners.find((p) => p.id === open.id);

  const toggleBan = (p: Partner) =>
    confirm({
      title: t(p.banned ? "admin.partners.unbanTitle" : "admin.partners.banTitle", { name: p.name }),
      body: t(p.banned ? "admin.partners.unbanBody" : "admin.partners.banBody"),
      tone: p.banned ? "success" : "danger",
      confirmLabel: t(p.banned ? "admin.partners.unban" : "admin.partners.ban"),
      onConfirm: () => {
        patch("partners", p.id, { banned: !p.banned, ...(p.banned ? {} : { featured: false }) });
        toast.success(t("common.toast.updated"));
      },
    });

  const actionsFor = (p: Partner, opts: { money?: boolean } = {}): RowAction[] =>
    p.banned
      ? [{ label: t("admin.partners.unban"), icon: <LockOpen />, separated: true, onSelect: () => toggleBan(p) }]
      : [
          { label: t("admin.partners.contactCo.button"), icon: <MessageSquare />, onSelect: () => setOpen({ kind: "contact", id: p.id }) },
          { label: t("admin.wallets.addCredit"), icon: <HandCoins />, onSelect: () => setOpen({ kind: "credit", id: p.id }), hidden: opts.money === false },
          { label: t("admin.partners.ban"), icon: <Lock />, tone: "danger", separated: true, onSelect: () => toggleBan(p) },
        ];

  const dialogs = (
    <>
      {partner && open?.kind === "contact" && <ContactCompanyDialog partner={partner} onClose={() => setOpen(null)} />}
      {partner && open?.kind === "credit" && <CreditDialog partner={partner} onClose={() => setOpen(null)} />}
      {dialog}
    </>
  );

  return { actionsFor, dialogs };
}
