import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Types ---

export interface SitemapResource {
  id: string;
  name: string;
  description: string | null;
  resourceType: "dashboard" | "query" | "workflow" | "table";
  resourceUrl: string | null;
  sitemapGroup1: string;
  sitemapGroup2: string;
  solution: string | null;
  portalContent: string | null;
}

export interface SitemapTab {
  name: string;
  sections: SitemapSection[];
}

export interface SitemapSection {
  name: string;
  resources: SitemapResource[];
}

export interface DocItem {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  category: string | null;
}

export interface PortalConfig {
  tabOrder: string[];
  sectionOrder: Record<string, string[]>;
}

// --- Data Fetching ---

export async function getSitemapResources(
  domain: string
): Promise<SitemapResource[]> {
  const { data, error } = await supabase
    .from("portal_resources")
    .select("*")
    .eq("domain", domain)
    .eq("include_sitemap", true);

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.resource_id,
    name: r.name,
    description: r.description,
    resourceType: r.resource_type as SitemapResource["resourceType"],
    resourceUrl: r.resource_url,
    sitemapGroup1: r.sitemap_group1,
    sitemapGroup2: r.sitemap_group2,
    solution: r.solution,
    portalContent: r.portal_content,
  }));
}

export async function getPortalConfig(
  domain: string
): Promise<PortalConfig> {
  const { data, error } = await supabase
    .from("portal_config")
    .select("*")
    .eq("domain", domain)
    .single();

  if (error || !data) return { tabOrder: [], sectionOrder: {} };

  return {
    tabOrder: (data.tab_order as string[]) || [],
    sectionOrder: (data.section_order as Record<string, string[]>) || {},
  };
}

export async function getDomainDocs(domain: string): Promise<DocItem[]> {
  const { data, error } = await supabase
    .from("portal_docs")
    .select("*")
    .eq("domain", domain)
    .eq("doc_type", "domain")
    .order("sort_order")
    .order("title");

  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    title: d.title,
    summary: d.summary,
    content: d.content,
    category: d.category,
  }));
}

export async function getGeneralDocs(): Promise<DocItem[]> {
  const { data, error } = await supabase
    .from("portal_docs")
    .select("*")
    .eq("doc_type", "guide")
    .order("category")
    .order("title");

  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    title: d.title,
    summary: d.summary,
    content: d.content,
    category: d.category,
  }));
}

export async function savePortalConfig(
  domain: string,
  config: PortalConfig
): Promise<boolean> {
  const { error } = await supabase.from("portal_config").upsert(
    {
      domain,
      tab_order: config.tabOrder,
      section_order: config.sectionOrder,
    },
    { onConflict: "domain" }
  );
  return !error;
}

// --- Grouping ---

export function groupIntoTabs(
  resources: SitemapResource[],
  config?: PortalConfig
): SitemapTab[] {
  const tabMap = new Map<string, Map<string, SitemapResource[]>>();

  for (const r of resources) {
    if (!tabMap.has(r.sitemapGroup1)) {
      tabMap.set(r.sitemapGroup1, new Map());
    }
    const sectionMap = tabMap.get(r.sitemapGroup1)!;
    if (!sectionMap.has(r.sitemapGroup2)) {
      sectionMap.set(r.sitemapGroup2, []);
    }
    sectionMap.get(r.sitemapGroup2)!.push(r);
  }

  const tabs: SitemapTab[] = [];
  for (const [tabName, sectionMap] of tabMap) {
    const sectionOrderForTab = config?.sectionOrder?.[tabName] || [];
    const sections: SitemapSection[] = [];
    for (const [sectionName, sectionResources] of sectionMap) {
      sections.push({
        name: sectionName,
        resources: sectionResources.sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      });
    }
    sections.sort((a, b) => {
      const ai = sectionOrderForTab.indexOf(a.name);
      const bi = sectionOrderForTab.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
    tabs.push({ name: tabName, sections });
  }

  const tabOrder = config?.tabOrder || [];
  tabs.sort((a, b) => {
    const ai = tabOrder.indexOf(a.name);
    const bi = tabOrder.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return tabs;
}

// --- Domain Info ---

const DOMAIN_NAMES: Record<string, string> = {
  lag: "Les Amis Group",
  koi: "Koi",
  suntec: "Suntec",
  jfh: "JFH Group",
  grain: "Grain",
  fk: "FK Group",
  saladstop: "SaladStop!",
  dapaolo: "Da Paolo",
  ssg: "Select Group",
  seg: "SEG Group",
};

export function getDomainInfo(domain: string) {
  return {
    name: DOMAIN_NAMES[domain] || domain.toUpperCase(),
    baseUrl: `https://${domain}.thinkval.io`,
  };
}
