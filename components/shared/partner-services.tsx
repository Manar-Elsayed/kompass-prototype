"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CirclePause, CirclePlay, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Partner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mock/store";
import { useL } from "@/lib/mock/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/shared/icon";
import { useConfirm } from "@/components/shared/bits";

/**
 * A company's services. Kompass can only put them on hold and activate them again (e.g. while the company can't take
 * jobs); the company itself also adds and removes them in its portal. A service on hold gets no new
 * offers but stays on the public company page.
 */
export function PartnerServices({ partner, canEdit }: { partner: Partner; canEdit?: boolean }) {
  const t = useTranslations("common.partnerServices");
  const L = useL();
  const services = useStore((s) => s.services);
  const patch = useStore((s) => s.patch);
  const { confirm, dialog } = useConfirm();
  const [adding, setAdding] = useState("");
  const paused = partner.pausedServiceIds ?? [];
  const missing = services.filter((s) => s.active && !partner.serviceIds.includes(s.id));

  const setPaused = (id: string, pause: boolean) => {
    patch("partners", partner.id, { pausedServiceIds: pause ? [...paused, id] : paused.filter((x) => x !== id) });
    const name = L(services.find((s) => s.id === id)?.name);
    toast.success(t(pause ? "pausedToast" : "resumedToast", { name }));
  };
  const remove = (id: string) => {
    const name = L(services.find((s) => s.id === id)?.name);
    confirm({
      title: t("removeTitle", { name }),
      body: t("removeBody"),
      tone: "danger",
      confirmLabel: t("remove"),
      onConfirm: () => {
        patch("partners", partner.id, { serviceIds: partner.serviceIds.filter((x) => x !== id), pausedServiceIds: paused.filter((x) => x !== id) });
        toast.success(t("removedToast", { name }));
      },
    });
  };
  const add = () => {
    if (!adding) return;
    patch("partners", partner.id, { serviceIds: [...partner.serviceIds, adding] });
    toast.success(t("addedToast", { name: L(services.find((s) => s.id === adding)?.name) }));
    setAdding("");
  };

  return (
    <>
      <ul className="grid gap-2">
        {partner.serviceIds.map((id) => {
          const s = services.find((x) => x.id === id);
          const isPaused = paused.includes(id);
          return (
            // One fixed shape per row so every card has the same height and the actions line up:
            // icon | name with its status underneath | actions (never wrap below the name).
            <li key={id} className={cn("flex items-center gap-3 rounded-xl border p-3", isPaused && "bg-surface-2/70")}>
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", isPaused ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary")}>
                <Icon name={s?.icon ?? "Truck"} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-semibold", isPaused ? "text-muted-foreground" : "text-ink")} title={L(s?.name)}>{L(s?.name)}</p>
                {isPaused ? <Badge tone="warning" dot className="mt-1">{t("paused")}</Badge> : <Badge tone="success" dot className="mt-1">{t("active")}</Badge>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPaused(id, !isPaused)}>
                  {isPaused ? <CirclePlay /> : <CirclePause />} {t(isPaused ? "resume" : "pause")}
                </Button>
                {canEdit && (
                  <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" aria-label={t("remove")} onClick={() => remove(id)}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {canEdit && missing.length > 0 && (
        <div className="mt-3 flex gap-2 [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1">
          <Select value={adding} onValueChange={setAdding} placeholder={t("addPh")} options={missing.map((s) => ({ value: s.id, label: L(s.name) }))} />
          <Button variant="outline" disabled={!adding} onClick={add}><Plus /> {t("add")}</Button>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t(canEdit ? "hintPartner" : "hintAdmin")}</p>
      {dialog}
    </>
  );
}
