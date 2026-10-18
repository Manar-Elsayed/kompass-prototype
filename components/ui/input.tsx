import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/80 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-danger/15 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/80 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:opacity-60 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
