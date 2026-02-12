import { supabase } from "./supabase";
import type { PortalDomain, PortalCategory, PortalResource } from "./database.types";

export interface PortalData {
  domain: PortalDomain;
  categories: PortalCategory[];
  resources: PortalResource[];
}

export async function getPortalData(domain: string): Promise<PortalData | null> {
  const [domainResult, categoriesResult, resourcesResult] = await Promise.all([
    supabase
      .from("portal_domains")
      .select("*")
      .eq("domain", domain)
      .single(),
    supabase
      .from("portal_categories")
      .select("*")
      .eq("domain", domain)
      .order("sort_order"),
    supabase
      .from("portal_resources")
      .select("*")
      .eq("domain", domain)
      .eq("visibility", "client")
      .order("sort_order"),
  ]);

  if (domainResult.error || !domainResult.data) return null;

  return {
    domain: domainResult.data as PortalDomain,
    categories: (categoriesResult.data ?? []) as PortalCategory[],
    resources: (resourcesResult.data ?? []) as PortalResource[],
  };
}

export interface GroupedResources {
  featured: PortalResource[];
  categorized: {
    category: PortalCategory;
    subcategories: {
      name: string | null;
      byType: Record<string, PortalResource[]>;
    }[];
  }[];
  uncategorized: {
    byType: Record<string, PortalResource[]>;
  };
}

export function groupResources(
  categories: PortalCategory[],
  resources: PortalResource[]
): GroupedResources {
  const featured = resources.filter((r) => r.featured);
  const nonFeatured = resources.filter((r) => !r.featured);

  const categorized = categories
    .map((category) => {
      const categoryResources = nonFeatured.filter(
        (r) => r.category_id === category.id
      );
      if (categoryResources.length === 0) return null;

      const subcategoryNames = [
        ...new Set(categoryResources.map((r) => r.subcategory)),
      ].sort((a, b) => {
        if (a === null) return 1;
        if (b === null) return -1;
        return a.localeCompare(b);
      });

      const subcategories = subcategoryNames.map((subName) => ({
        name: subName,
        byType: groupByType(
          categoryResources.filter((r) => r.subcategory === subName)
        ),
      }));

      return { category, subcategories };
    })
    .filter(Boolean) as GroupedResources["categorized"];

  const uncategorizedResources = nonFeatured.filter(
    (r) => r.category_id === null
  );

  return {
    featured,
    categorized,
    uncategorized: { byType: groupByType(uncategorizedResources) },
  };
}

function groupByType(resources: PortalResource[]): Record<string, PortalResource[]> {
  const result: Record<string, PortalResource[]> = {};
  for (const r of resources) {
    if (!result[r.resource_type]) result[r.resource_type] = [];
    result[r.resource_type].push(r);
  }
  return result;
}
