"use client";
import * as React from "react";
import {
  Switch as SwitchP,
  Checkbox as CheckboxP,
  Avatar as AvatarP,
  Accordion as AccP,
  Popover as PopP,
  Tooltip as TipP,
  Progress as ProgP,
  RadioGroup as RadioP,
} from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchP.Root>) {
  return (
    <SwitchP.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 data-[state=checked]:bg-success data-[state=unchecked]:bg-input",
        className,
      )}
      {...props}
    >
      <SwitchP.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-4" />
    </SwitchP.Root>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxP.Root>) {
  return (
    <CheckboxP.Root
      className={cn(
        "peer size-4 shrink-0 rounded-[5px] border border-input bg-surface shadow-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxP.Indicator className="flex items-center justify-center">
        <Check className="size-3" strokeWidth={3} />
      </CheckboxP.Indicator>
    </CheckboxP.Root>
  );
}

const AVATAR_TONES = [
  "bg-primary-soft text-primary",
  "bg-accent-soft text-accent",
  "bg-success-soft text-success",
  "bg-info-soft text-info",
  "bg-warning-soft text-warning",
];

export function Avatar({
  name,
  src,
  className,
  square,
}: {
  name: string;
  src?: string;
  className?: string;
  square?: boolean;
}) {
  const tone = AVATAR_TONES[(name.charCodeAt(0) + name.length) % AVATAR_TONES.length];
  return (
    <AvatarP.Root
      className={cn(
        "relative inline-flex size-9 shrink-0 select-none items-center justify-center overflow-hidden text-xs font-bold",
        square ? "rounded-lg" : "rounded-full",
        tone,
        className,
      )}
    >
      {src && <AvatarP.Image src={src} alt={name} className="size-full object-cover" />}
      <AvatarP.Fallback>{initials(name)}</AvatarP.Fallback>
    </AvatarP.Root>
  );
}

export const Accordion = AccP.Root;
export function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccP.Item>) {
  return <AccP.Item className={cn("border-b border-border last:border-b-0", className)} {...props} />;
}
export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccP.Trigger>) {
  return (
    <AccP.Header className="flex">
      <AccP.Trigger
        className={cn(
          "flex flex-1 items-center justify-between gap-4 py-4 text-start text-[15px] font-semibold text-ink outline-none transition hover:text-primary [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </AccP.Trigger>
    </AccP.Header>
  );
}
export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccP.Content>) {
  return (
    <AccP.Content
      className="overflow-hidden text-sm text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("pb-4 leading-relaxed", className)}>{children}</div>
    </AccP.Content>
  );
}

export const Popover = PopP.Root;
export const PopoverTrigger = PopP.Trigger;
export function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopP.Content>) {
  return (
    <PopP.Portal>
      <PopP.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-xl border border-border bg-surface p-4 shadow-pop outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </PopP.Portal>
  );
}

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TipP.Provider delayDuration={200}>
      <TipP.Root>
        <TipP.Trigger asChild>{children}</TipP.Trigger>
        <TipP.Portal>
          <TipP.Content
            sideOffset={6}
            className="z-50 rounded-md bg-ink px-2 py-1 text-xs font-medium text-white shadow-pop data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
          >
            {content}
          </TipP.Content>
        </TipP.Portal>
      </TipP.Root>
    </TipP.Provider>
  );
}

export function Progress({
  value,
  className,
  tone = "primary",
}: {
  value: number;
  className?: string;
  tone?: "primary" | "accent" | "success";
}) {
  return (
    <ProgP.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)} value={value}>
      <ProgP.Indicator
        className={cn(
          "h-full rounded-full transition-all",
          tone === "primary" && "bg-primary",
          tone === "accent" && "bg-accent",
          tone === "success" && "bg-success",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </ProgP.Root>
  );
}

export function RadioCards({
  value,
  onValueChange,
  options,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: React.ReactNode; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <RadioP.Root value={value} onValueChange={onValueChange} className={cn("grid gap-2", className)}>
      {options.map((o) => (
        <RadioP.Item
          key={o.value}
          value={o.value}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-input bg-surface px-3 text-sm font-semibold text-foreground outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft data-[state=checked]:text-primary"
        >
          {o.icon}
          {o.label}
        </RadioP.Item>
      ))}
    </RadioP.Root>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full bg-border", className)} />;
}
