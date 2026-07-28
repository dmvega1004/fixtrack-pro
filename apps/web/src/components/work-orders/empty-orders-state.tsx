import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function EmptyOrdersState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="text-sm text-muted-foreground">
        No hay órdenes con estos filtros
      </p>
      <Link href="/ordenes" className={buttonVariants({ variant: "outline" })}>
        Limpiar filtros
      </Link>
    </div>
  );
}
