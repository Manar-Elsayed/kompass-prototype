"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Columns3, Download, Search, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/bits";

export type { ColumnDef };

export interface TableFilter<T> {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  get: (row: T) => string | string[];
}

/**
 * The one table used by every admin list.
 * Replaces the legacy per-page TanStack setup (DataTable, toolbar, pagination,
 * row-actions copied into 20+ `columns.tsx` files).
 */
export function DataTable<T>({
  data,
  columns,
  search,
  searchPlaceholder,
  filters = [],
  toolbar,
  onRowClick,
  pageSize = 10,
  rowClassName,
  initialSort,
  emptyState,
  dense,
  initialFilters,
  wideSearch,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  search?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: TableFilter<T>[];
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  rowClassName?: (row: T) => string | undefined;
  initialSort?: SortingState;
  emptyState?: React.ReactNode;
  dense?: boolean;
  /** Filter values to start with, e.g. from the URL so a dashboard link opens a filtered list. */
  initialFilters?: Record<string, string>;
  /** The search box takes the toolbar width the filters leave free. */
  wideSearch?: boolean;
}) {
  const t = useTranslations("common");
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState<Record<string, string>>(initialFilters ?? {});
  const [sorting, setSorting] = React.useState<SortingState>(initialSort ?? []);
  const [visibility, setVisibility] = React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });
  // export works on chosen rows: the download button first switches to choosing them
  const [selecting, setSelecting] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<T>>(() => new Set());

  const rows = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((row) => {
      if (term && search && !search(row).toLowerCase().includes(term)) return false;
      for (const f of filters) {
        const v = active[f.id];
        if (!v || v === "__all") continue;
        const got = f.get(row);
        if (Array.isArray(got) ? !got.includes(v) : got !== v) return false;
      }
      return true;
    });
  }, [data, q, search, filters, active]);

  // jump back to the first page when filters change
  React.useEffect(() => setPagination((p) => ({ ...p, pageIndex: 0 })), [q, active]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility: visibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });

  const hasFilters = q || Object.values(active).some((v) => v && v !== "__all");
  const pages = table.getPageCount() || 1;

  const togglePick = (r: T) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r));
  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Set());
  };

  const exportCsv = () => {
    // in the table's current sort order, only the chosen rows
    const out = table.getSortedRowModel().rows.map((r) => r.original).filter((r) => picked.has(r));
    if (!out.length) return;
    const cols = table.getVisibleLeafColumns().filter((c) => c.id !== "actions");
    const header = cols.map((c) => (typeof c.columnDef.header === "string" ? c.columnDef.header : c.id));
    const lines = out.map((r) =>
      cols
        .map((c) => {
          const v = (c.columnDef as { accessorFn?: (r: T, i: number) => unknown }).accessorFn?.(r, 0) ?? "";
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kompass-export.csv";
    a.click();
    toast.success(t("table.exported", { count: out.length }));
    stopSelecting();
  };

  return (
    <Card className="overflow-hidden">
      {/* toolbar */}
      <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {search && (
            <div className={cn("relative w-full", wideSearch ? "sm:min-w-40 sm:flex-1" : "sm:w-64")}>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder ?? t("actions.search")} className="h-9 ps-9" />
            </div>
          )}
          {filters.map((f) => (
            <div key={f.id} className={cn("w-[calc(50%-4px)]", wideSearch ? "sm:w-40" : "sm:w-44")}>
              <Select
                size="sm"
                className="h-9"
                value={active[f.id] ?? "__all"}
                onValueChange={(v) => setActive((a) => ({ ...a, [f.id]: v }))}
                options={[{ value: "__all", label: `${f.label}: ${t("table.all")}` }, ...f.options]}
              />
            </div>
          ))}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setActive({});
              }}
            >
              <X /> {t("actions.clear")}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Columns3 /> <span className="hidden sm:inline">{t("actions.columns")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("actions.columns")}</DropdownMenuLabel>
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide() && c.id !== "actions")
                .map((c) => (
                  <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)} onSelect={(e) => e.preventDefault()}>
                    {typeof c.columnDef.header === "string" ? c.columnDef.header : c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={selecting ? "secondary" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
            aria-label={t("actions.export")}
            aria-pressed={selecting}
            title={t("actions.export")}
          >
            <Download />
          </Button>
        </div>
      </div>

      {/* choosing rows to export */}
      {selecting && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-primary-soft/50 px-4 py-2.5 text-sm" role="region" aria-label={t("table.exportPick")}>
          <p className="font-semibold text-ink">{t("table.exportPick")}</p>
          <span className="text-muted-foreground">{t("table.selected", { count: picked.size })}</span>
          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setPicked(allPicked ? new Set() : new Set(rows))}>
            {allPicked ? t("actions.clear") : t("table.selectAll", { count: rows.length })}
          </button>
          <div className="ms-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={stopSelecting}>{t("actions.cancel")}</Button>
            <Button size="sm" onClick={exportCsv} disabled={!picked.size}>
              <Download /> {t("table.exportSelected", { count: picked.size })}
            </Button>
          </div>
        </div>
      )}

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/60">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {selecting && (
                  <th className="w-px py-2.5 ps-4 pe-1">
                    <Checkbox checked={allPicked} onCheckedChange={() => setPicked(allPicked ? new Set() : new Set(rows))} aria-label={t("table.selectAll", { count: rows.length })} />
                  </th>
                )}
                {hg.headers.filter((h) => !(selecting && h.column.id === "actions")).map((h) => {
                  const sortable = h.column.getCanSort();
                  const dir = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground first:ps-4 last:pe-4",
                        (h.column.columnDef.meta as { className?: string } | undefined)?.className,
                      )}
                    >
                      {h.isPlaceholder ? null : sortable ? (
                        <button className="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === "asc" ? <ArrowUp className="size-3.5" /> : dir === "desc" ? <ArrowDown className="size-3.5" /> : <ChevronsUpDown className="size-3.5 opacity-40" />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={selecting || onRowClick ? (e) => {
                  // clicks inside menus, selects and dialogs opened from a cell bubble here through their portal
                  if (!e.currentTarget.contains(e.target as Node)) return;
                  if ((e.target as HTMLElement).closest("button,a,[role=switch],[role=combobox],input,label")) return;
                  if (selecting) togglePick(row.original);
                  else onRowClick?.(row.original);
                } : undefined}
                className={cn(
                  "border-t transition-colors",
                  (selecting || onRowClick) && "cursor-pointer hover:bg-surface-2/70",
                  selecting && picked.has(row.original) && "bg-primary-soft/40 hover:bg-primary-soft/60",
                  rowClassName?.(row.original),
                )}
              >
                {selecting && (
                  <td className={cn("w-px ps-4 pe-1 align-middle", dense ? "py-2" : "py-3")}>
                    <Checkbox checked={picked.has(row.original)} onCheckedChange={() => togglePick(row.original)} aria-label={t("table.selectRow")} />
                  </td>
                )}
                {row.getVisibleCells().filter((cell) => !(selecting && cell.column.id === "actions")).map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-3 align-middle first:ps-4 last:pe-4",
                      dense ? "py-2" : "py-3",
                      (cell.column.columnDef.meta as { className?: string } | undefined)?.className,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (emptyState ?? <EmptyState icon={<SearchX />} title={t("table.noResults")} body={t("table.noResultsHint")} />)}
      </div>

      {/* pagination */}
      {rows.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row">
          <p>{t("table.rows", { count: rows.length })}</p>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span>{t("table.perPage")}</span>
              <div className="w-20">
                <Select
                  size="sm"
                  value={String(pagination.pageSize)}
                  onValueChange={(v) => setPagination({ pageIndex: 0, pageSize: Number(v) })}
                  options={[10, 20, 50].map((n) => ({ value: String(n), label: String(n) }))}
                />
              </div>
            </div>
            <span className="tabular-nums">{t("table.page", { page: pagination.pageIndex + 1, pages })}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label={t("actions.previous")}>
                <ChevronLeft className="" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label={t("actions.next")}>
                <ChevronRight className="" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
