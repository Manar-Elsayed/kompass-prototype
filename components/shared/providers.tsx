"use client";

import { Toaster } from "sonner";
import { useStoreHydration } from "@/lib/mock/hooks";
import { PrototypeDock } from "./prototype-dock";

export function Providers({ children }: { children: React.ReactNode }) {
  useStoreHydration();
  return (
    <>
      {children}
      <PrototypeDock />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ className: "!rounded-xl !font-sans" }}
      />
    </>
  );
}
