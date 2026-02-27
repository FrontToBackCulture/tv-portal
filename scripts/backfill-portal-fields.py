#!/usr/bin/env python3
"""
Backfill portal fields into definition_analysis.json across all domains.

For every resource folder (data_models/table_*, dashboards/dashboard_*,
queries/query_*, workflows/workflow_*), ensures these keys exist:

  includeSitemap: false  (default)
  sitemapGroup1:  null
  sitemapGroup2:  null
  solution:       null
  resourceUrl:    auto-generated from domain + resource type + id

URL patterns (matching actual VAL platform routes from val-react):
  table_*       → https://{domain}.thinkval.io/workspace/default/{space}/{zone}/{parentId}/{tableName}
  dashboard_100 → https://{domain}.thinkval.io/dashboard/{category}/{id}
  query_100     → https://{domain}.thinkval.io/admin/querybuilder/{id}
  workflow_123  → https://{domain}.thinkval.io/workflow/detail/{id}

Usage:
  python backfill-portal-fields.py [--dry-run] [--force-urls] [domain1 domain2 ...]
"""

import os
import re
import json
import sys
from datetime import datetime, timezone

BASE = "/Users/melvinwang/Thinkval Dropbox/ThinkVAL team folder/SkyNet/tv-knowledge/0_Platform/domains/production"

DRY_RUN = "--dry-run" in sys.argv
FORCE_URLS = "--force-urls" in sys.argv
DOMAIN_FILTER = None

# Parse optional domain filter from args
args = [a for a in sys.argv[1:] if not a.startswith("--")]
if args:
    DOMAIN_FILTER = args

RESOURCE_TYPES = [
    ("data_models", "table_"),
    ("dashboards", "dashboard_"),
    ("queries", "query_"),
    ("workflows", "workflow_"),
]

PORTAL_FIELDS = ["includeSitemap", "sitemapGroup1", "sitemapGroup2", "solution", "resourceUrl"]

stats = {"domains": 0, "files_updated": 0, "files_skipped": 0, "files_created": 0, "total_scanned": 0, "url_errors": 0}


def load_table_lookup(domain_path: str) -> dict:
    """Load all_tables.json and build a lookup: table_name → {space, zone, parentId}."""
    tables_path = os.path.join(domain_path, "all_tables.json")
    if not os.path.exists(tables_path):
        return {}

    try:
        with open(tables_path, "r") as f:
            tree = json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}

    lookup = {}

    def walk(nodes):
        for node in nodes:
            if node.get("table_name"):
                lookup[node["table_name"]] = {
                    "space": node.get("space"),
                    "zone": node.get("zone"),
                    "parentId": node.get("parentId"),
                }
            if node.get("children"):
                walk(node["children"])

    walk(tree)
    return lookup


def build_table_url(domain: str, folder_name: str, table_lookup: dict) -> str | None:
    """Build table URL: /workspace/default/{space}/{zone}/{parentId}/{tableName}."""
    table_name = folder_name[len("table_"):] if folder_name.startswith("table_") else folder_name
    entry = table_lookup.get(table_name)
    if not entry or entry.get("space") is None or entry.get("zone") is None or entry.get("parentId") is None:
        return None
    return f"https://{domain}.thinkval.io/workspace/default/{entry['space']}/{entry['zone']}/{entry['parentId']}/{table_name}"


def build_dashboard_url(domain: str, folder_path: str, folder_name: str) -> str | None:
    """Build dashboard URL: /dashboard/{category}/{id}."""
    defn_path = os.path.join(folder_path, "definition.json")
    if not os.path.exists(defn_path):
        # Fallback: extract numeric ID from folder name
        m = re.match(r"dashboard_(\d+)", folder_name)
        if m:
            return f"https://{domain}.thinkval.io/dashboard/private/{m.group(1)}"
        return None

    try:
        with open(defn_path, "r") as f:
            defn = json.load(f)
        db_id = defn.get("id")
        category = defn.get("category", "private")
        if db_id is not None:
            return f"https://{domain}.thinkval.io/dashboard/{category}/{db_id}"
    except (json.JSONDecodeError, IOError):
        pass

    # Fallback to folder name
    m = re.match(r"dashboard_(\d+)", folder_name)
    if m:
        return f"https://{domain}.thinkval.io/dashboard/private/{m.group(1)}"
    return None


def build_query_url(domain: str, folder_name: str) -> str | None:
    """Build query URL: /admin/querybuilder/{id}."""
    m = re.match(r"query_(\d+)", folder_name)
    if m:
        return f"https://{domain}.thinkval.io/admin/querybuilder/{m.group(1)}"
    return None


def build_workflow_url(domain: str, folder_name: str) -> str | None:
    """Build workflow URL: /workflow/detail/{id}."""
    m = re.match(r"workflow_(\d+)", folder_name)
    if m:
        return f"https://{domain}.thinkval.io/workflow/detail/{m.group(1)}"
    return None


def build_url(domain: str, folder_path: str, folder_name: str, subfolder: str, table_lookup: dict) -> str | None:
    """Build resource URL based on type."""
    if subfolder == "data_models":
        return build_table_url(domain, folder_name, table_lookup)
    elif subfolder == "dashboards":
        return build_dashboard_url(domain, folder_path, folder_name)
    elif subfolder == "queries":
        return build_query_url(domain, folder_name)
    elif subfolder == "workflows":
        return build_workflow_url(domain, folder_name)
    return None


def process_folder(domain: str, folder_path: str, folder_name: str, subfolder: str, table_lookup: dict):
    """Process a single resource folder — ensure portal fields exist in definition_analysis.json."""
    analysis_path = os.path.join(folder_path, "definition_analysis.json")
    stats["total_scanned"] += 1

    # Read existing or start fresh
    analysis = {}
    file_exists = os.path.exists(analysis_path)
    if file_exists:
        try:
            with open(analysis_path, "r") as f:
                analysis = json.load(f)
        except (json.JSONDecodeError, IOError):
            print(f"  WARN: Could not read {analysis_path}, skipping")
            return

    # Check which fields are missing
    changes = {}

    if "includeSitemap" not in analysis:
        changes["includeSitemap"] = False

    if "sitemapGroup1" not in analysis:
        changes["sitemapGroup1"] = None

    if "sitemapGroup2" not in analysis:
        changes["sitemapGroup2"] = None

    if "solution" not in analysis:
        changes["solution"] = None

    url = build_url(domain, folder_path, folder_name, subfolder, table_lookup)
    if "resourceUrl" not in analysis or not analysis["resourceUrl"] or (FORCE_URLS and url and analysis.get("resourceUrl") != url):
        if url:
            changes["resourceUrl"] = url
        elif "resourceUrl" not in analysis:
            # No URL could be built (e.g., table not in all_tables.json) — set to null
            changes["resourceUrl"] = None
            stats["url_errors"] += 1

    if not changes:
        stats["files_skipped"] += 1
        return

    # Apply changes
    analysis.update(changes)

    if DRY_RUN:
        url_val = changes.get("resourceUrl", "—")
        print(f"  DRY-RUN: {folder_name} → +{list(changes.keys())}  url={url_val}")
        stats["files_updated"] += 1
        return

    with open(analysis_path, "w") as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)
        f.write("\n")

    if file_exists:
        stats["files_updated"] += 1
    else:
        stats["files_created"] += 1


def main():
    if not os.path.isdir(BASE):
        print(f"ERROR: Base path not found: {BASE}")
        sys.exit(1)

    domains = sorted(d for d in os.listdir(BASE) if os.path.isdir(os.path.join(BASE, d)) and not d.startswith("."))

    if DOMAIN_FILTER:
        domains = [d for d in domains if d in DOMAIN_FILTER]

    print(f"{'DRY RUN — ' if DRY_RUN else ''}Backfilling portal fields across {len(domains)} domains")
    print(f"Fields: {PORTAL_FIELDS}")
    print(f"URL patterns: table→/workspace/default/{{s}}/{{z}}/{{p}}/{{t}}, dashboard→/dashboard/{{cat}}/{{id}}, query→/admin/querybuilder/{{id}}, workflow→/workflow/detail/{{id}}")
    print()

    for domain in domains:
        domain_path = os.path.join(BASE, domain)
        domain_touched = False

        # Load table lookup once per domain (for data_models URLs)
        table_lookup = load_table_lookup(domain_path)

        for subfolder, prefix in RESOURCE_TYPES:
            resource_path = os.path.join(domain_path, subfolder)
            if not os.path.isdir(resource_path):
                continue

            entries = sorted(e for e in os.listdir(resource_path)
                           if os.path.isdir(os.path.join(resource_path, e)) and e.startswith(prefix))

            if not entries:
                continue

            if not domain_touched:
                tl_count = len(table_lookup)
                print(f"[{domain}] (table lookup: {tl_count} entries)")
                domain_touched = True
                stats["domains"] += 1

            before = stats["files_updated"] + stats["files_created"]
            for entry in entries:
                process_folder(domain, os.path.join(resource_path, entry), entry, subfolder, table_lookup)
            after = stats["files_updated"] + stats["files_created"]

            count = after - before
            if count > 0:
                print(f"  {subfolder}: {len(entries)} scanned, {count} updated")
            else:
                print(f"  {subfolder}: {len(entries)} scanned, all up to date")

    print()
    print(f"Done! Scanned {stats['total_scanned']} folders across {stats['domains']} domains")
    print(f"  Updated: {stats['files_updated']}")
    print(f"  Created: {stats['files_created']}")
    print(f"  Skipped (already complete): {stats['files_skipped']}")
    if stats["url_errors"]:
        print(f"  URL errors (table not in tree): {stats['url_errors']}")


if __name__ == "__main__":
    main()
