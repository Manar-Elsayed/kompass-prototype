"use client";

import { Direction } from "radix-ui";
import { Toaster } from "sonner";
import { useStoreHydration } from "@/lib/mock/hooks";
import { PrototypeDock } from "./prototype-dock";

export function Providers({ dir, children }: { dir: "ltr" | "rtl"; children: React.ReactNode }) {
  useStoreHydration();
  return (
    <Direction.Provider dir={dir}>
      {children}
      <PrototypeDock />
      <Toaster
        position={dir === "rtl" ? "bottom-left" : "bottom-right"}
        dir={dir}
        richColors
        closeButton
        toastOptions={{ className: "!rounded-xl !font-sans" }}
      />
    </Direction.Provider>
  );
}
