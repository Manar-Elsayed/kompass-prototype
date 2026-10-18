"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Pick a partner contract expiry date (used for approval and renewal). */
export function ExpiryDialog({
  open,
  onOpenChange,
  current,
  onSave,
  title,
  body,
  confirmLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current?: string;
  onSave: (iso: string) => void;
  title?: string;
  body?: string;
  confirmLabel?: string;
}) {
  const t = useTranslations();
  const [d, setD] = useState(current?.slice(0, 10) ?? "2027-10-31");
  const preset = (months: number) => {
    const x = new Date("2026-10-18");
    x.setMonth(x.getMonth() + months);
    setD(x.toISOString().slice(0, 10));
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? t("admin.partners.changeExpiry")}</DialogTitle>
          {body && <p className="text-sm text-muted-foreground">{body}</p>}
        </DialogHeader>
        <Field label={t("admin.partners.expires")}>
          <Input type="date" value={d} onChange={(e) => setD(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          {[6, 12, 24].map((m) => (
            <Button key={m} variant="outline" size="sm" onClick={() => preset(m)}>
              +{m}m
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button
            variant="success"
            onClick={() => {
              onSave(new Date(d).toISOString());
              onOpenChange(false);
              if (!confirmLabel) toast.success(t("common.toast.updated"));
            }}
          >
            {confirmLabel ?? t("common.actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
