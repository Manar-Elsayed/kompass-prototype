"use client";

import { useStore } from "@/lib/mock/store";
import { Logo } from "@/components/shared/bits";

/** Mirrors the legacy `ComingSoonPage` — toggled from admin › Configuration. */
export function ComingSoon() {
  const email = useStore((s) => s.site.general.email);
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center text-white">
      <div className="pointer-events-none absolute -top-40 start-1/2 size-[640px] -translate-x-1/2 rounded-full bg-primary/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 end-0 size-[420px] rounded-full bg-accent/25 blur-3xl" />
      <div className="relative">
        <Logo light className="mx-auto mb-10 h-9" />
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Coming soon</p>
        <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          The new Kompass is almost here.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-white/70">
          We&apos;re rebuilding Switzerland&apos;s moving marketplace. Questions? <a className="underline" href={`mailto:${email}`}>{email}</a>
        </p>
      </div>
    </main>
  );
}
