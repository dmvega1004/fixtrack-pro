"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { EquipmentCover } from "./equipment-cover";
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
                        <Link
                          href={href}
                          className="flex max-w-md items-center gap-3 px-4 py-3"
                        >
                          <EquipmentCover
                            url={equipment.coverPhoto?.url}
                            alt={`Foto de ${equipment.brand} ${equipment.model}`}
                            sizeClassName="size-10"
                            preset="listThumbnail"
                            iconClassName="size-4"
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="line-clamp-2 font-medium break-words">
                              {equipment.brand} {equipment.model}
                            </span>
                            {equipment.location && (
                              <span className="truncate text-xs text-muted-foreground">
                                {equipment.location}
                              </span>
                            )}
                          </span>
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
            {/* Todas las tarjetas miden lo mismo: miniatura de tamaño fijo
                (con o sin foto), título reservado a 2 líneas y recortado,
                cliente y ubicación a 1 línea cada uno (la ubicación se pinta
                aunque falte), y la insignia abajo, donde no empuja al título.
                Hay modelos de más de 140 caracteres: la interfaz aguanta. */}
            {filtered.map((equipment) => (
              <Link
                key={equipment.id}
                href={`/equipos/${equipment.id}`}
                className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
              >
                <EquipmentCover
                  url={equipment.coverPhoto?.url}
                  alt={`Foto de ${equipment.brand} ${equipment.model}`}
                  sizeClassName="size-16"
                  preset="listThumbnail"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 min-h-10 text-sm font-medium break-words">
                    {equipment.brand} {equipment.model}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {equipment.client.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {equipment.location ?? "Sin ubicación"}
                  </span>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      {equipment.serialNumber ?? "Sin serial"}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {equipment.orderCount}{" "}
                      {equipment.orderCount === 1 ? "orden" : "órdenes"}
                      <EquipmentStatusBadge status={equipment.status} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
