"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function PageHeader({
  title,
  subtitle,
  actions,
  crumbs,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: { label: React.ReactNode; href?: string }[];
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {crumbs && (
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 flip-rtl" />}
              {c.href ? (
                <Link href={c.href} className="hover:text-primary">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.65rem]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  delta,
  deltaLabel,
  tone = "primary",
  href,
  footer,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  delta?: number;
  deltaLabel?: React.ReactNode;
  tone?: "primary" | "accent" | "success" | "warning" | "info";
  href?: string;
  footer?: React.ReactNode;
}) {
  const toneCls = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
  }[tone];
  const body = (
    <Card className={cn("h-full p-5 transition", href && "hover:border-primary/30 hover:shadow-pop")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
        {icon && <span className={cn("flex size-9 items-center justify-center rounded-lg [&_svg]:size-[18px]", toneCls)}>{icon}</span>}
      </div>
      <p className="mt-2 text-[1.75rem] font-bold tracking-tight text-ink">{value}</p>
      {delta !== undefined && (
        <p className="mt-1 flex items-center gap-1 text-xs">
          <span className={cn("inline-flex items-center gap-0.5 font-bold", delta >= 0 ? "text-success" : "text-danger")}>
            {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta)}%
          </span>
          <span className="text-muted-foreground">{deltaLabel}</span>
        </p>
      )}
      {footer && <div className="mt-2 text-xs text-muted-foreground">{footer}</div>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Definition list used on detail pages. */
export function DL({ items, cols = 2 }: { items: { label: React.ReactNode; value: React.ReactNode; ltr?: boolean }[]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 text-sm", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3")}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-medium text-muted-foreground">{it.label}</dt>
          <dd className="mt-0.5 break-words font-semibold text-ink" dir={it.ltr ? "ltr" : undefined}>
            {it.value ?? "–"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap font-mono text-[13px] font-semibold text-ink", className)} dir="ltr">
      {children}
    </span>
  );
}
