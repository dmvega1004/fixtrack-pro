import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiTone = "default" | "warning" | "danger";

const TONE_TEXT: Record<KpiTone, string> = {
  default: "text-foreground",
  warning: "text-amber-600",
  danger: "text-red-600",
};

interface KpiCardProps {
  href: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: KpiTone;
}

/** Tarjeta de indicador clave: enlaza a su módulo con el filtro ya aplicado. */
export function KpiCard({ href, label, value, icon: Icon, tone = "default" }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <Icon className={cn("size-4", TONE_TEXT[tone])} />
      </div>
      <span className={cn("text-3xl font-semibold", TONE_TEXT[tone])}>{value}</span>
      <span className="text-xs font-medium text-primary">Ver →</span>
    </Link>
  );
}
