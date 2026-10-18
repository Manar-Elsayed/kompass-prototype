"use client";
import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn("text-[13px] font-semibold text-foreground leading-none select-none", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  className,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  // Associate the label and message with the control automatically.
  const autoId = React.useId();
  const target = React.isValidElement(children) ? (children as React.ReactElement<Record<string, unknown>>) : null;
  const id = htmlFor ?? (target?.props.id as string | undefined) ?? autoId;
  const msgId = `${id}-msg`;
  const control =
    target && !htmlFor
      ? React.cloneElement(target, {
          id,
          "aria-describedby": error || hint ? msgId : undefined,
          "aria-required": required || undefined,
        })
      : children;

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="ms-0.5 text-accent" aria-hidden>*</span>}
        </Label>
      )}
      {control}
      {error ? (
        <p id={msgId} role="alert" className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p id={msgId} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
