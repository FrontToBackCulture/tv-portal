import { BarChart3, Zap, Table } from "lucide-react";
import type { PortalResource } from "@/lib/database.types";
import { getResourceTypeLabel } from "@/lib/val-urls";
import { ResourceCard } from "./ResourceCard";

const typeIcons: Record<string, typeof BarChart3> = {
  dashboard: BarChart3,
  workflow: Zap,
  workspace: Table,
};

const typeOrder = ["dashboard", "workspace", "workflow"];

interface ResourceTypeGroupProps {
  byType: Record<string, PortalResource[]>;
  baseUrl: string;
}

export function ResourceTypeGroup({ byType, baseUrl }: ResourceTypeGroupProps) {
  const types = typeOrder.filter((t) => byType[t]?.length > 0);

  if (types.length === 0) return null;

  return (
    <div className="space-y-4">
      {types.map((type) => {
        const Icon = typeIcons[type] ?? Table;
        const resources = byType[type];
        return (
          <div key={type}>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              <Icon size={13} />
              <span>{getResourceTypeLabel(type)}</span>
              <span className="text-text-muted/60">({resources.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => (
                <ResourceCard key={r.id} resource={r} baseUrl={baseUrl} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
