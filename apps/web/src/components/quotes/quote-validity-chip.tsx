import type { Quote } from "@/lib/api/quotes";
import { daysUntilDateOnly, formatDateOnly } from "@/lib/format/date-only";
import { QUOTE_VALIDITY_TONE_STYLES, quoteValidityLabel, quoteValidityTone } from "@/lib/quotes";
import { cn } from "@/lib/utils";

interface QuoteValidityChipProps {
  quote: Pick<Quote, "status" | "validUntil">;
}

/** Verde &gt;7 días, ámbar ≤7 días, rojo ya venció. Solo aplica a SENT — un borrador no tiene validez todavía, y una decidida ya no la necesita. */
export function QuoteValidityChip({ quote }: QuoteValidityChipProps) {
  if (quote.validUntil === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (quote.status !== "SENT") {
    return (
      <span className="text-xs text-muted-foreground">{formatDateOnly(quote.validUntil)}</span>
    );
  }

  const days = daysUntilDateOnly(quote.validUntil);
  const tone = quoteValidityTone(days);

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          QUOTE_VALIDITY_TONE_STYLES[tone],
        )}
      >
        {quoteValidityLabel(days)}
      </span>
      <span className="text-xs text-muted-foreground">{formatDateOnly(quote.validUntil)}</span>
    </div>
  );
}
