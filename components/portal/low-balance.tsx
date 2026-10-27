"use client";

import { useTranslations } from "next-intl";
import { CreditCard, WalletMinimal } from "lucide-react";
import { formatCHF } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/lib/mock/store";
import { useCurrentPartner, useLang } from "@/lib/mock/hooks";
import { lowBalance } from "@/lib/mock/selectors";
import { Button } from "@/components/ui/button";
import { useCanBuy } from "@/components/portal/shell";

/** Whether the wallet can still pay for the cheapest offer the company takes. */
export function useLowBalance() {
  const partner = useCurrentPartner();
  const services = useStore((s) => s.services);
  const fallback = useStore((s) => s.config.defaultLeadPrice);
  const canBuy = useCanBuy();
  if (!partner) return { low: false, min: 0, balance: 0 };
  const { low, min } = lowBalance(partner, services, fallback);
  // a company that can't buy for other reasons (documents, ban) gets those messages instead
  return { low: low && canBuy, min, balance: partner.wallet };
}

/**
 * Shown on the dashboard and in the shop when the wallet can't pay for an offer, so the company
 * tops up before it misses one. Online top-up first; a bank transfer is the slower alternative.
 */
export function LowBalanceBanner() {
  const t = useTranslations("portal.lowBalance");
  const lang = useLang();
  const { low, min, balance } = useLowBalance();
  if (!low) return null;
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning-soft/60 p-4 sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
        <WalletMinimal className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{t("title", { balance: formatCHF(balance, lang) })}</p>
        <p className="text-sm text-muted-foreground">{t("body", { min: formatCHF(min, lang) })}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/portal/payments?topup=transfer">{t("transfer")}</Link>
        </Button>
        <Button asChild variant="accent" size="sm">
          <Link href="/portal/payments?topup=online"><CreditCard /> {t("topUp")}</Link>
        </Button>
      </div>
    </div>
  );
}
