"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OrderTabsProps {
  detalles: ReactNode;
  repuestos: ReactNode;
  fotos: ReactNode;
  historial: ReactNode;
}

const TABS = [
  { id: "detalles", label: "Detalles" },
  { id: "repuestos", label: "Valores" },
  { id: "fotos", label: "Fotos" },
  { id: "historial", label: "Historial" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function OrderTabs({
  detalles,
  repuestos,
  fotos,
  historial,
}: OrderTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("detalles");

  const content: Record<TabId, ReactNode> = {
    detalles,
    repuestos,
    fotos,
    historial,
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 border-b-2 px-4 py-3 text-sm font-medium transition-colors md:flex-none",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1">{content[activeTab]}</div>
    </div>
  );
}
