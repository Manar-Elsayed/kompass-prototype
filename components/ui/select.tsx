"use client";
import * as React from "react";
import { Select as SP } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: React.ReactNode };

/** Opinionated single select used across the prototype. */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
  id,
  invalid,
  size = "default",
}: {
  value?: string;
  onValueChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
  size?: "default" | "sm";
}) {
  return (
    <SP.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SP.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:opacity-60 data-[placeholder]:text-muted-foreground/80 aria-invalid:border-danger [&>span]:truncate",
          size === "sm" ? "h-8 text-xs" : "h-10",
          className,
        )}
      >
        <SP.Value placeholder={placeholder} />
        <SP.Icon asChild>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </SP.Icon>
      </SP.Trigger>
      <SP.Portal>
        <SP.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <SP.Viewport className="p-1">
            {options.map((o) => (
              <SP.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2 ps-8 pe-2.5 text-sm outline-none focus:bg-muted data-[state=checked]:font-semibold"
              >
                <span className="absolute start-2.5 flex size-4 items-center justify-center">
                  <SP.ItemIndicator>
                    <Check className="size-4 text-primary" />
                  </SP.ItemIndicator>
                </span>
                <SP.ItemText>{o.label}</SP.ItemText>
              </SP.Item>
            ))}
          </SP.Viewport>
        </SP.Content>
      </SP.Portal>
    </SP.Root>
  );
}
