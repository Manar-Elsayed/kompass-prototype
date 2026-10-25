import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

/** Placeholder for a website page while the saved data loads. */
export function PageSkeleton() {
  return (
    <section className="container-page max-w-3xl space-y-4 py-12">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-64" />
    </section>
  );
}
