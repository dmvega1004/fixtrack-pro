import { cn } from "@/lib/utils";
import { formatMarginPercent, marginTone, type MarginTone } from "@/lib/format/margin";

const TONE_STYLES: Record<MarginTone, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  neutral: "bg-muted text-muted-foreground",
};

interface MarginChipProps {
  marginPercent: number | null;
}

/** Semáforo de porcentaje de margen: verde ≥30%, ámbar 0-30%, rojo negativo, gris sin base (income 0). */
export function MarginChip({ marginPercent }: MarginChipProps) {
  const tone = marginTone(marginPercent);

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
        TONE_STYLES[tone],
      )}
    >
      {formatMarginPercent(marginPercent)}
    </span>
  );
}
