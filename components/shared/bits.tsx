"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Star, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <Image
      src={light ? "/brand/logo-light.svg" : "/brand/logo.svg"}
      alt="Kompass"
      width={135}
      height={30}
      priority
      className={cn("h-7 w-auto", className)}
    />
  );
}

export function Stars({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} / 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        // how much of this star is filled, to the nearest half
        const fill = Math.max(0, Math.min(1, Math.round((value - i) * 2) / 2));
        return (
          <span key={i} className="relative inline-flex">
            <Star className={cn(s, "fill-muted text-muted")} />
            {fill > 0 && (
              <span className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn(s, "fill-amber-400 text-amber-400")} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup">
      {Array.from({ length: 5 }, (_, i) => {
        const v = i + 1;
        const on = (hover || value) >= v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={`${v}`}
            onMouseEnter={() => setHover(v)}
            onClick={() => onChange(v)}
            className="rounded-md p-0.5 transition-transform hover:scale-110"
          >
            <Star className={cn("size-8", on ? "fill-amber-400 text-amber-400" : "fill-muted text-input")} />
          </button>
        );
      })}
    </div>
  );
}

const STATUS_TONE: Record<string, "neutral" | "primary" | "accent" | "success" | "warning" | "danger" | "info"> = {
  new: "info",
  in_progress: "primary",
  completed: "success",
  cancelled: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  confirmed: "success",
  canceled: "neutral",
  open: "info",
  testing: "primary",
  contract_sent: "accent",
  in_review: "info",
  active: "success",
  inactive: "neutral",
  banned: "danger",
  published: "success",
  draft: "neutral",
  expired: "danger",
  read: "neutral",
  unread: "info",
  answered: "success",
  refunded: "success",
  due: "warning",
  paid: "success",
  overdue: "danger",
  requested: "warning",
};

/** Standardised status badge — one vocabulary for the whole ecosystem. */
export function StatusBadge({ status, label, className }: { status: string; label?: React.ReactNode; className?: string }) {
  const t = useTranslations("common.status");
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} dot className={className}>
      {label ?? (t.has(status) ? t(status) : status)}
    </Badge>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-6">
        {icon ?? <Inbox />}
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  tone = "default",
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  body?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  tone?: "default" | "danger" | "success";
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}) {
  const t = useTranslations("common.actions");
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {body && <DialogDescription>{body}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : tone === "success" ? "success" : "default"}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
              onOpenChange(false);
            }}
          >
            {confirmLabel ?? t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Hook-style helper for confirm dialogs triggered from table rows. */
export function useConfirm() {
  const [state, setState] = React.useState<null | {
    title: React.ReactNode;
    body?: React.ReactNode;
    confirmLabel?: React.ReactNode;
    tone?: "default" | "danger" | "success";
    onConfirm: () => void | Promise<void>;
  }>(null);
  const dialog = (
    <ConfirmDialog
      open={!!state}
      onOpenChange={(v) => !v && setState(null)}
      title={state?.title}
      body={state?.body}
      confirmLabel={state?.confirmLabel}
      tone={state?.tone}
      onConfirm={() => state?.onConfirm()}
    />
  );
  return { confirm: setState, dialog };
}
