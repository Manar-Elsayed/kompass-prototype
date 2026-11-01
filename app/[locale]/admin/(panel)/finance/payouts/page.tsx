"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** Payouts are a tab of Refunds & payouts now; old links land there. */
export default function PayoutsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/finance/refunds?tab=payouts");
  }, [router]);
  return null;
}
