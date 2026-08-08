import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/currency";
import type { ClientBalance } from "@/lib/api/billing";

interface ClientBalancesPanelProps {
  balances: ClientBalance[];
  currency: string;
}

/** Saldo por cliente, de mayor a menor (ya viene ordenado del backend). */
export function ClientBalancesPanel({ balances, currency }: ClientBalancesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo por cliente</CardTitle>
      </CardHeader>
      <CardContent>
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin saldos pendientes.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {balances.map((entry) => (
              <Link
                key={entry.clientId}
                href={`/clientes/${entry.clientId}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50"
              >
                <span className="truncate font-medium">{entry.clientName}</span>
                <span className="flex-shrink-0 font-semibold">
                  {formatCurrency(entry.balance, currency)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
