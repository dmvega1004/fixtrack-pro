import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/dates";
import { formatOrderNumber } from "@/lib/format/order-number";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-method";
import type { RecentPayment } from "@/lib/api/billing";

interface RecentPaymentsPanelProps {
  payments: RecentPayment[];
  currency: string;
}

export function RecentPaymentsPanel({ payments, currency }: RecentPaymentsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos pagos registrados</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {payments.map((payment) => (
              <Link
                key={payment.id}
                href={`/ordenes/${payment.orderId}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">
                    {formatOrderNumber(payment.orderNumber)} · {payment.clientName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[payment.method]} · {formatDate(payment.paidAt)}
                  </span>
                </div>
                <span className="flex-shrink-0 font-semibold">
                  {formatCurrency(payment.amount, currency)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
