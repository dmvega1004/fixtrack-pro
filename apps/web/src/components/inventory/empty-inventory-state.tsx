import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

interface EmptyInventoryStateProps {
  isAdmin: boolean;
}

export function EmptyInventoryState({ isAdmin }: EmptyInventoryStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="text-sm text-muted-foreground">
        Aún no hay repuestos en el catálogo
      </p>
      {isAdmin && (
        <Link
          href="/inventario/nuevo"
          className={buttonVariants({ variant: "default" })}
        >
          Nuevo repuesto
        </Link>
      )}
    </div>
  );
}
