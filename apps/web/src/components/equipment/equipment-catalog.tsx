"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { EquipmentStatusBadge } from "./equipment-status-badge";
import type { Equipment } from "@/lib/api/equipments";

export interface EquipmentListItem extends Equipment {
  orderCount: number;
}

interface EquipmentCatalogProps {
  equipments: EquipmentListItem[];
}

export function EquipmentCatalog({ equipments }: EquipmentCatalogProps) {
  const [query, setQuery] = useState("");

  // Filtrado en memoria: el listado de equipos es de tamaño moderado por
  // empresa. Busca por marca, modelo, serial, ubicación o nombre del cliente.
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return equipments;
    return equipments.filter(
      (equipment) =>
        equipment.brand.toLowerCase().includes(normalized) ||
        equipment.model.toLowerCase().includes(normalized) ||
        equipment.serialNumber?.toLowerCase().includes(normalized) ||
        equipment.location?.toLowerCase().includes(normalized) ||
        equipment.client.name.toLowerCase().includes(normalized),
    );
  }, [equipments, query]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por marca, modelo, serial, ubicación o cliente..."
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No se encontraron equipos con esta búsqueda
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Equipo</th>
                  <th className="px-4 py-3 font-medium">Serial</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Órdenes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((equipment) => {
                  const href = `/equipos/${equipment.id}`;
                  return (
                    <tr key={equipment.id} className="hover:bg-muted/50">
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3">
                          <span className="font-medium">
                            {equipment.brand} {equipment.model}
                          </span>
                          {equipment.location && (
                            <span className="block text-xs text-muted-foreground">
                              {equipment.location}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={href}
                          className="block px-4 py-3 text-muted-foreground"
                        >
                          {equipment.serialNumber ?? "—"}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3">
                          {equipment.client.name}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3">
                          <EquipmentStatusBadge status={equipment.status} />
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={href}
                          className="block px-4 py-3 text-muted-foreground"
                        >
                          {equipment.orderCount}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((equipment) => (
              <Link
                key={equipment.id}
                href={`/equipos/${equipment.id}`}
                className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {equipment.brand} {equipment.model}
                  </span>
                  <EquipmentStatusBadge status={equipment.status} />
                </div>
                <span className="text-sm text-muted-foreground">
                  {equipment.client.name}
                </span>
                {equipment.location && (
                  <span className="text-xs text-muted-foreground">
                    {equipment.location}
                  </span>
                )}
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{equipment.serialNumber ?? "Sin serial"}</span>
                  <span>
                    {equipment.orderCount}{" "}
                    {equipment.orderCount === 1 ? "orden" : "órdenes"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
