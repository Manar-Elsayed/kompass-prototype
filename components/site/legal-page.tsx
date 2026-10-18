"use client";

import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Prose } from "./sections";

export function LegalPage({ doc }: { doc: "imprint" | "privacy" | "terms" }) {
  const L = useL();
  const html = useStore((s) => s.site.legal[doc]);
  return (
    <section className="container-page max-w-3xl py-14">
      <div className="rounded-3xl border border-border bg-surface p-8 sm:p-12">
        <Prose html={L(html)} />
      </div>
    </section>
  );
}
