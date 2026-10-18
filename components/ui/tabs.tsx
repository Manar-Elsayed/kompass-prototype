"use client";
import * as React from "react";
import { Tabs as TP } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = TP.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TP.List>) {
  return (
    <TP.List
      className={cn("inline-flex h-10 items-center gap-1 rounded-xl bg-muted p-1 text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TP.Trigger>) {
  return (
    <TP.Trigger
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-all outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TP.Content>) {
  return <TP.Content className={cn("outline-none", className)} {...props} />;
}

/* Underline variant for page-level tabs */
export function UnderlineTabsList({ className, ...props }: React.ComponentProps<typeof TP.List>) {
  return <TP.List className={cn("flex gap-6 overflow-x-auto border-b border-border", className)} {...props} />;
}
export function UnderlineTabsTrigger({ className, ...props }: React.ComponentProps<typeof TP.Trigger>) {
  return (
    <TP.Trigger
      className={cn(
        "relative -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent pb-3 pt-1 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary",
        className,
      )}
      {...props}
    />
  );
}
