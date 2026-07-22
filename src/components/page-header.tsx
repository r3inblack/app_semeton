import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

type Variant = "primary" | "success" | "warning" | "danger" | "info";

const VARIANT_BG: Record<Variant, string> = {
  primary: "bg-[image:var(--gradient-primary)]",
  success: "bg-[image:var(--gradient-success)]",
  warning: "bg-[image:var(--gradient-warning)]",
  danger:  "bg-[image:var(--gradient-danger)]",
  info:    "bg-[image:var(--gradient-info)]",
};

export function MetricCard({
  label,
  value,
  icon,
  variant,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  variant?: Variant;
  hint?: string;
}) {
  if (variant) {
    return (
      <Card
        className={cn(
          "card-hover relative overflow-hidden border-0 text-white shadow-[var(--shadow-md)]",
          VARIANT_BG[variant],
        )}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        {icon && (
          <div className="pointer-events-none absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
            {icon}
          </div>
        )}
        <div className="relative p-5">
          <div className="pr-14 text-lg font-bold leading-tight tracking-tight xl:text-xl 2xl:text-2xl">
            {value}
          </div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/85">
            {label}
          </div>
          {hint && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-sm">
              {hint}
            </div>
          )}
        </div>
      </Card>
    );
  }


  return (
    <Card className="card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 truncate text-xl font-bold tracking-tight xl:text-2xl">
            {value}
          </div>
        </div>
        {icon && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
