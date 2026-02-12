import fs from "fs";
import path from "path";

const KNOWLEDGE_BASE =
  "/Users/melvinwang/Thinkval Dropbox/ThinkVAL team folder/SkyNet/tv-knowledge/0_Platform/domains/production";

const GUIDES_PATH =
  "/Users/melvinwang/Thinkval Dropbox/ThinkVAL team folder/SkyNet/tv-knowledge/0_Platform/guides";

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

const RESOURCE_CONFIGS = [
  { subfolder: "dashboards", prefix: "dashboard_", type: "dashboard" as const },
  { subfolder: "queries", prefix: "query_", type: "query" as const },
  { subfolder: "workflows", prefix: "workflow_", type: "workflow" as const },
  { subfolder: "data_models", prefix: "table_", type: "table" as const },
];

/**
 * Read all sitemap-tagged resources for a domain from definition_analysis.json files.
 */
export function getSitemapResources(domain: string): SitemapResource[] {
  const domainPath = path.join(KNOWLEDGE_BASE, domain);
  if (!fs.existsSync(domainPath)) return [];

  const resources: SitemapResource[] = [];

  for (const { subfolder, prefix, type } of RESOURCE_CONFIGS) {
    const resourcePath = path.join(domainPath, subfolder);
    if (!fs.existsSync(resourcePath)) continue;

    const entries = fs
      .readdirSync(resourcePath)
      .filter(
        (e) =>
          e.startsWith(prefix) &&
          fs.statSync(path.join(resourcePath, e)).isDirectory()
      );

    for (const entry of entries) {
      const folderPath = path.join(resourcePath, entry);
      const analysisPath = path.join(folderPath, "definition_analysis.json");
      if (!fs.existsSync(analysisPath)) continue;

      try {
        const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
        if (!analysis.includeSitemap) continue;
        if (!analysis.sitemapGroup1) continue;

        // Get the display name — try analysis first, then definition.json
        let name =
          analysis.meta?.displayName || analysis.suggestedName || entry;

        const defnPath = path.join(folderPath, "definition.json");
        if (fs.existsSync(defnPath)) {
          try {
            const defn = JSON.parse(fs.readFileSync(defnPath, "utf-8"));
            if (defn.name) name = defn.name;
          } catch {
            // ignore
          }
        }

        // Check for portal-content.md (content card)
        const contentPath = path.join(folderPath, "portal-content.md");
        let portalContent: string | null = null;
        if (fs.existsSync(contentPath)) {
          try {
            portalContent = fs.readFileSync(contentPath, "utf-8");
          } catch {
            // ignore
          }
        }

        resources.push({
          id: entry,
          name,
          description: analysis.summary?.short || null,
          resourceType: type,
          resourceUrl: analysis.resourceUrl || null,
          sitemapGroup1: analysis.sitemapGroup1,
          sitemapGroup2: analysis.sitemapGroup2 || analysis.sitemapGroup1,
          solution: analysis.solution || null,
          portalContent,
        });
      } catch {
        // skip invalid files
      }
    }
  }

  return resources;
}

export interface PortalConfig {
  tabOrder: string[];
  sectionOrder: Record<string, string[]>;
}

/**
 * Read portal-config.json for a domain (tab/section ordering).
 */
export function getPortalConfig(domain: string): PortalConfig {
  const configPath = path.join(KNOWLEDGE_BASE, domain, "portal-config.json");
  if (!fs.existsSync(configPath)) {
    return { tabOrder: [], sectionOrder: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return { tabOrder: [], sectionOrder: {} };
  }
}

/**
 * Group resources into tabs (group1) → sections (group2) → resources.
 * Applies ordering from portal-config.json if available.
 */
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
    // Sort sections: config order first, then alphabetical for any not in config
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

  // Sort tabs: config order first, then alphabetical for any not in config
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

export interface DocItem {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  category: string | null;
}

/**
 * Parse YAML frontmatter from markdown content.
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val) fm[key] = val;
  }
  return { frontmatter: fm, body: match[2] };
}

/**
 * Read markdown docs from a folder. Returns DocItem[] sorted by title.
 * Reads .md files (non-recursive for flat folders, recursive one level for grouped folders).
 */
function readDocsFromFolder(
  folderPath: string,
  options?: { recursive?: boolean }
): DocItem[] {
  if (!fs.existsSync(folderPath)) return [];

  const docs: DocItem[] = [];

  const entries = fs.readdirSync(folderPath);
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isFile() && entry.endsWith(".md") && entry !== "README.md") {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const { frontmatter, body } = parseFrontmatter(raw);
        docs.push({
          id: entry.replace(/\.md$/, ""),
          title: frontmatter.title || entry.replace(/\.md$/, "").replace(/-/g, " "),
          summary: frontmatter.summary || null,
          content: body,
          category: null,
        });
      } catch {
        // skip
      }
    }

    // One level of recursion for grouped guides (e.g., val-workspace/)
    if (stat.isDirectory() && options?.recursive) {
      const subEntries = fs.readdirSync(fullPath);
      const categoryName = entry.replace(/^val-/, "VAL ").replace(/-/g, " ");
      for (const sub of subEntries) {
        if (!sub.endsWith(".md") || sub === "README.md") continue;
        const subPath = path.join(fullPath, sub);
        try {
          const raw = fs.readFileSync(subPath, "utf-8");
          const { frontmatter, body } = parseFrontmatter(raw);
          docs.push({
            id: `${entry}/${sub.replace(/\.md$/, "")}`,
            title: frontmatter.title || sub.replace(/\.md$/, "").replace(/-/g, " "),
            summary: frontmatter.summary || null,
            content: body,
            category: categoryName,
          });
        } catch {
          // skip
        }
      }
    }
  }

  return docs.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Get domain-specific documentation from the domain's documentation/ folder.
 */
export function getDomainDocs(domain: string): DocItem[] {
  const docPath = path.join(KNOWLEDGE_BASE, domain, "documentation");
  return readDocsFromFolder(docPath);
}

/**
 * Get general platform guides from the guides/ folder.
 */
export function getGeneralDocs(): DocItem[] {
  return readDocsFromFolder(GUIDES_PATH, { recursive: true });
}

/**
 * List all domain slugs that have folders in the knowledge base.
 */
export function listDomains(): string[] {
  if (!fs.existsSync(KNOWLEDGE_BASE)) return [];
  return fs
    .readdirSync(KNOWLEDGE_BASE)
    .filter((e) => {
      const full = path.join(KNOWLEDGE_BASE, e);
      return fs.statSync(full).isDirectory() && !e.startsWith(".");
    });
}

/**
 * Get domain display info
 */
export function getDomainInfo(domain: string): {
  name: string;
  baseUrl: string;
} {
  // Could read from a config file; for now, derive from domain slug
  const names: Record<string, string> = {
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

  return {
    name: names[domain] || domain.toUpperCase(),
    baseUrl: `https://${domain}.thinkval.io`,
  };
}
