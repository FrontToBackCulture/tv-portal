import * as LucideIcons from "lucide-react";
import type { PortalCategory, PortalResource } from "@/lib/database.types";
import { ResourceTypeGroup } from "./ResourceTypeGroup";

interface CategorySectionProps {
  category: PortalCategory;
  subcategories: {
    name: string | null;
    byType: Record<string, PortalResource[]>;
  }[];
  baseUrl: string;
}

export function CategorySection({
  category,
  subcategories,
  baseUrl,
}: CategorySectionProps) {
  // Dynamic icon lookup from lucide
  const iconName = category.icon
    ? (category.icon.charAt(0).toUpperCase() +
        category.icon
          .slice(1)
          .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))
    : "Folder";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  const Icon = icons[iconName] ?? LucideIcons.Folder;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 border-b border-border-default pb-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            backgroundColor: category.color
              ? `${category.color}15`
              : "var(--thinkval-primary-light)",
            color: category.color ?? "var(--thinkval-primary)",
          }}
        >
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {category.name}
          </h2>
          {category.description && (
            <p className="text-xs text-text-secondary">{category.description}</p>
          )}
        </div>
      </div>

      {subcategories.map((sub) => (
        <div key={sub.name ?? "_none"} className="space-y-3">
          {sub.name && (
            <h3 className="text-sm font-medium text-text-secondary">{sub.name}</h3>
          )}
          <ResourceTypeGroup byType={sub.byType} baseUrl={baseUrl} />
        </div>
      ))}
    </section>
  );
}
