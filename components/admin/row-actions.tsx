"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Eye, MoreHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "./data-table";

export type RowAction = {
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  href?: string;
  tone?: "danger";
  /** Drawn after a separator, e.g. delete. */
  separated?: boolean;
  hidden?: boolean;
  disabled?: boolean;
};

/**
 * The same end-of-row control on every admin table: one "…" menu whose first item opens the record
 * (the row itself opens it too), followed by what can be done to it. When opening the record is the
 * only thing to do, it is a single eye button instead of a menu with one item. Clicks here never
 * trigger the row's own click.
 */
export function RowActions({
  onView,
  viewHref,
  viewLabel,
  actions = [],
}: {
  onView?: () => void;
  viewHref?: string;
  /** e.g. "View offer"; defaults to "View". */
  viewLabel?: string;
  actions?: RowAction[];
}) {
  const t = useTranslations("common.actions");
  const view: RowAction[] = viewHref || onView ? [{ label: viewLabel ?? t("view"), icon: <Eye />, href: viewHref, onSelect: viewHref ? undefined : onView }] : [];
  const shown = [...view, ...actions.filter((a) => !a.hidden)];
  const only = shown.length === 1 && view.length === 1 ? view[0] : null;
  return (
    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
      {only ? (
        only.href ? (
          <Button asChild variant="ghost" size="icon-sm" aria-label={only.label} title={only.label}>
            <Link href={only.href}><Eye /></Link>
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={only.label} title={only.label} onClick={only.onSelect}>
            <Eye />
          </Button>
        )
      ) : shown.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("more")}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {shown.map((a, i) => (
              <React.Fragment key={a.label}>
                {a.separated && i > 0 && <DropdownMenuSeparator />}
                {a.href ? (
                  <DropdownMenuItem asChild tone={a.tone} disabled={a.disabled}>
                    <Link href={a.href}>
                      {a.icon}
                      {a.label}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem tone={a.tone} disabled={a.disabled} onSelect={a.onSelect}>
                    {a.icon}
                    {a.label}
                  </DropdownMenuItem>
                )}
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/** Column definition for {@link RowActions}, so every table puts it last with the same width. */
export function actionsColumn<T>(render: (row: T) => React.ReactNode): ColumnDef<T, unknown> {
  return { id: "actions", header: "", enableSorting: false, enableHiding: false, meta: { className: "w-px ps-1" }, cell: ({ row }) => render(row.original) };
}

/**
 * Side panel with a record's details: header, scrolling body and an optional sticky footer for
 * the main actions. Opened by clicking a row or its eye button.
 */
export function DetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  footer,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("overflow-y-auto", wide ? "max-w-xl" : "max-w-md")}>
        <div className="flex min-h-full flex-col">
          <div className="space-y-5 p-6">
            <div className="pe-8">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {title}
                {badge}
              </DialogTitle>
              {subtitle ? <DialogDescription className="mt-1">{subtitle}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
            </div>
            {children}
          </div>
          {footer && <div className="sticky bottom-0 mt-auto flex flex-wrap gap-2 border-t bg-surface p-4">{footer}</div>}
        </div>
      </SheetContent>
    </Dialog>
  );
}

/** A titled block inside a {@link DetailSheet}. */
export function SheetSection({ title, children, className }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border p-4", className)}>
      {title && <p className="mb-3 text-sm font-bold text-ink">{title}</p>}
      {children}
    </section>
  );
}
