/**
 * Sync portal resources from filesystem (knowledge base) to Supabase.
 * Run: npx tsx scripts/sync-to-supabase.ts [--domain lag]
 *
 * NOTE: Docs/guides are no longer synced here. Users publish them
 * individually via "Publish to Portal" in tv-app's library.
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const KNOWLEDGE_BASE =
  "/Users/melvinwang/Thinkval Dropbox/ThinkVAL team folder/SkyNet/tv-knowledge/0_Platform/domains/production";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const RESOURCE_CONFIGS = [
  { subfolder: "dashboards", prefix: "dashboard_", type: "dashboard" },
  { subfolder: "queries", prefix: "query_", type: "query" },
  { subfolder: "workflows", prefix: "workflow_", type: "workflow" },
  { subfolder: "data_models", prefix: "table_", type: "table" },
];

// --- Resources ---

async function syncResources(domain: string) {
  const domainPath = path.join(KNOWLEDGE_BASE, domain);
  if (!fs.existsSync(domainPath)) {
    console.log(`  Skipping ${domain} — folder not found`);
    return 0;
  }

  const resources: any[] = [];

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

        let name = analysis.meta?.displayName || analysis.suggestedName || entry;
        const defnPath = path.join(folderPath, "definition.json");
        if (fs.existsSync(defnPath)) {
          try {
            const defn = JSON.parse(fs.readFileSync(defnPath, "utf-8"));
            if (defn.name) name = defn.name;
          } catch {}
        }

        // Check for portal-content.md
        const contentPath = path.join(folderPath, "portal-content.md");
        let portalContent: string | null = null;
        if (fs.existsSync(contentPath)) {
          try {
            portalContent = fs.readFileSync(contentPath, "utf-8");
          } catch {}
        }

        resources.push({
          domain,
          resource_id: entry,
          name,
          description: analysis.summary?.short || null,
          resource_type: type,
          resource_url: analysis.resourceUrl || null,
          sitemap_group1: analysis.sitemapGroup1,
          sitemap_group2: analysis.sitemapGroup2 || analysis.sitemapGroup1,
          solution: analysis.solution || null,
          portal_content: portalContent,
          include_sitemap: true,
        });
      } catch {}
    }
  }

  // Get existing resources for this domain to detect removals
  const { data: existing } = await supabase
    .from("portal_resources")
    .select("resource_id")
    .eq("domain", domain);

  const includedIds = new Set(resources.map((r) => r.resource_id));
  const toDelete = (existing || [])
    .map((e: { resource_id: string }) => e.resource_id)
    .filter((id: string) => !includedIds.has(id));

  // Delete removed resources
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("portal_resources")
      .delete()
      .eq("domain", domain)
      .in("resource_id", toDelete);
    if (error) {
      console.error(`  Error deleting resources for ${domain}:`, error.message);
    } else {
      console.log(`  Removed ${toDelete.length} resources`);
    }
  }

  if (resources.length === 0) return 0;

  // Upsert in batches
  for (let i = 0; i < resources.length; i += 50) {
    const batch = resources.slice(i, i + 50);
    const { error } = await supabase
      .from("portal_resources")
      .upsert(batch, { onConflict: "domain,resource_id" });
    if (error) {
      console.error(`  Error upserting resources for ${domain}:`, error.message);
      return 0;
    }
  }

  return resources.length;
}

// --- Portal Config ---

async function syncConfig(domain: string) {
  const configPath = path.join(KNOWLEDGE_BASE, domain, "portal-config.json");
  if (!fs.existsSync(configPath)) return false;

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const { error } = await supabase.from("portal_config").upsert(
      {
        domain,
        tab_order: config.tabOrder || [],
        section_order: config.sectionOrder || {},
      },
      { onConflict: "domain" }
    );
    if (error) {
      console.error(`  Error upserting config for ${domain}:`, error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// --- Helpers ---

function listDomains(): string[] {
  return fs
    .readdirSync(KNOWLEDGE_BASE)
    .filter((e) => {
      const full = path.join(KNOWLEDGE_BASE, e);
      return fs.statSync(full).isDirectory() && !e.startsWith(".");
    });
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const domainFlag = args.indexOf("--domain");
  const specificDomain = domainFlag !== -1 ? args[domainFlag + 1] : null;

  const domains = specificDomain ? [specificDomain] : listDomains();

  console.log(`Syncing ${domains.length} domain(s) to Supabase...\n`);

  let totalResources = 0;

  for (const domain of domains) {
    process.stdout.write(`${domain}: `);

    const resourceCount = await syncResources(domain);
    const hasConfig = await syncConfig(domain);

    totalResources += resourceCount;

    const parts = [];
    if (resourceCount > 0) parts.push(`${resourceCount} resources`);
    if (hasConfig) parts.push("config");
    console.log(parts.length > 0 ? parts.join(", ") : "nothing to sync");
  }

  console.log(`\nDone. ${totalResources} resources synced.`);
}

main().catch(console.error);
