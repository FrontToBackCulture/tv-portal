"use client";

import { BarChart3, Zap, Table, ExternalLink } from "lucide-react";
import type { PortalResource } from "@/lib/database.types";
import { buildResourceUrl } from "@/lib/val-urls";
import { cn } from "@/lib/cn";

const typeIcons: Record<string, typeof BarChart3> = {
  dashboard: BarChart3,
  workflow: Zap,
  workspace: Table,
};

const statusBadge: Record<string, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-brand-primary/10 text-brand-primary",
  },
  maintenance: {
    label: "Maintenance",
    className: "bg-warning/10 text-warning",
  },
};

interface ResourceCardProps {
  resource: PortalResource;
  baseUrl: string;
  featured?: boolean;
}

export function ResourceCard({ resource, baseUrl, featured }: ResourceCardProps) {
  const Icon = typeIcons[resource.resource_type] ?? Table;
  const url = buildResourceUrl(baseUrl, resource.resource_type, resource.resource_id);
  const badge = resource.status !== "active" ? statusBadge[resource.status] : null;
  const name = resource.display_name || resource.resource_name || "Untitled";
  const isMaintenance = resource.status === "maintenance";

  return (
    <a
      href={url}
      target="_top"
      rel="noopener"
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-4 transition-all hover:border-brand-primary/30 hover:shadow-md",
        featured && "p-6",
        isMaintenance && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              "bg-brand-primary/8 text-brand-primary"
            )}
          >
            <Icon size={16} />
          </div>
          <h3
            className={cn(
              "font-medium text-text-primary",
              featured ? "text-base" : "text-sm"
            )}
          >
            {name}
          </h3>
        </div>
        <ExternalLink
          size={14}
          className="mt-1 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>

      {resource.description && (
        <p className="text-xs leading-relaxed text-text-secondary line-clamp-2">
          {resource.description}
        </p>
      )}

      {badge && (
        <span
          className={cn(
            "absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-medium",
            badge.className
          )}
        >
          {badge.label}
        </span>
      )}
    </a>
  );
}
