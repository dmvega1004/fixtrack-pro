"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { Client } from "@/lib/api/clients";

export interface ClientListItem extends Client {
  equipmentCount: number;
  orderCount: number;
}

interface ClientCatalogProps {
  clients: ClientListItem[];
}

function formatDocument(client: Client): string {
  if (!client.documentType || !client.documentNumber) return "—";
  return `${client.documentType} ${client.documentNumber}`;
}

export function ClientCatalog({ clients }: ClientCatalogProps) {
  const [query, setQuery] = useState("");

  // Filtrado en memoria: el listado de clientes es de tamaño moderado por
  // empresa. Busca por nombre, documento, teléfono o correo.
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(normalized) ||
        client.documentNumber?.toLowerCase().includes(normalized) ||
        client.phone?.toLowerCase().includes(normalized) ||
        client.email?.toLowerCase().includes(normalized),
    );
  }, [clients, query]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre, documento, teléfono o correo..."
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No se encontraron clientes con esta búsqueda
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Equipos</th>
                  <th className="px-4 py-3 font-medium">Órdenes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((client) => {
                  const href = `/clientes/${client.id}`;
                  return (
                    <tr key={client.id} className="hover:bg-muted/50">
                      <td className="p-0">
                        <Link href={href} className="block px-4 py-3 font-medium">
                          {client.name}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={href}
                          className="block px-4 py-3 text-muted-foreground"
                        >
                          {formatDocument(client)}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={href}
                          className="block px-4 py-3 text-muted-foreground"
                        >
                          {client.phone ?? "—"}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={href}
                          className="block px-4 py-3 text-muted-foreground"
                        >
                          {client.equipmentCount}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={href}
                          className="block px-4 py-3 text-muted-foreground"
                        >
                          {client.orderCount}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((client) => (
              <Link
                key={client.id}
                href={`/clientes/${client.id}`}
                className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{client.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDocument(client)}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {client.phone ?? "Sin teléfono"}
                </span>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {client.equipmentCount}{" "}
                    {client.equipmentCount === 1 ? "equipo" : "equipos"}
                  </span>
                  <span>
                    {client.orderCount}{" "}
                    {client.orderCount === 1 ? "orden" : "órdenes"}
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
