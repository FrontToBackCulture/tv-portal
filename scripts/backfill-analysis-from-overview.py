#!/usr/bin/env python3
"""
Backfill definition_analysis.json from overview.md across all domains.

Strategy:
- Parse overview.md markdown table for classification fields
- Read definition_analysis.json
- Only fill gaps (don't overwrite existing non-null values)
- Write updated definition_analysis.json

Field mapping (overview.md → definition_analysis.json):
  Data Category     → dataCategory
  Data Sub Category → dataSubCategory
  Data Source        → dataSource
  Usage Status       → usageStatus
  Space              → space
  Zone               → zone
  Table Type         → classification.dataType (only if missing)
"""

import os
import re
import json
import sys
from datetime import datetime, timezone

base = "/Users/melvinwang/Thinkval Dropbox/ThinkVAL team folder/SkyNet/tv-knowledge/0_Platform/domains/production"

DRY_RUN = "--dry-run" in sys.argv
DOMAIN_FILTER = None
for arg in sys.argv[1:]:
    if arg != "--dry-run":
        DOMAIN_FILTER = arg

def parse_overview_table(filepath):
    """Parse the markdown property table from overview.md"""
    result = {}
    try:
        with open(filepath) as f:
            content = f.read()
        for match in re.finditer(r'\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|', content):
            key = match.group(1).strip()
            val = match.group(2).strip().strip('`').strip()
            if val and val != '-' and val != 'N/A' and val != 'None':
                result[key] = val
    except Exception:
        pass
    return result


def backfill_analysis(analysis, overview_fields):
    """Backfill analysis.json with values from overview.md. Returns (updated_dict, changes_made)."""
    changes = []

    # dataCategory
    if not analysis.get("dataCategory") and overview_fields.get("Data Category"):
        analysis["dataCategory"] = overview_fields["Data Category"]
        changes.append(f"dataCategory={overview_fields['Data Category']}")

    # dataSubCategory
    if not analysis.get("dataSubCategory") and overview_fields.get("Data Sub Category"):
        analysis["dataSubCategory"] = overview_fields["Data Sub Category"]
        changes.append(f"dataSubCategory={overview_fields['Data Sub Category']}")

    # dataSource
    if not analysis.get("dataSource") and overview_fields.get("Data Source"):
        analysis["dataSource"] = overview_fields["Data Source"]
        changes.append(f"dataSource={overview_fields['Data Source']}")

    # usageStatus
    if not analysis.get("usageStatus") and overview_fields.get("Usage Status"):
        analysis["usageStatus"] = overview_fields["Usage Status"]
        changes.append(f"usageStatus={overview_fields['Usage Status']}")

    # action
    if not analysis.get("action") and overview_fields.get("Action"):
        analysis["action"] = overview_fields["Action"]
        changes.append(f"action={overview_fields['Action']}")

    # space (new field)
    if not analysis.get("space") and overview_fields.get("Space"):
        analysis["space"] = overview_fields["Space"]
        changes.append(f"space={overview_fields['Space']}")

    # zone (new field)
    if not analysis.get("zone") and overview_fields.get("Zone"):
        analysis["zone"] = overview_fields["Zone"]
        changes.append(f"zone={overview_fields['Zone']}")

    # classification.dataType fallback - only if classification exists and dataType is missing
    classification = analysis.get("classification", {})
    if not classification.get("dataType") and overview_fields.get("Table Type"):
        if "classification" not in analysis:
            analysis["classification"] = {}
        analysis["classification"]["dataType"] = overview_fields["Table Type"]
        changes.append(f"classification.dataType={overview_fields['Table Type']}")

    # Also backfill dataSubCategory from classification if it's there but not at top level
    if not analysis.get("dataSubCategory") and classification.get("dataSubCategory"):
        analysis["dataSubCategory"] = classification["dataSubCategory"]
        changes.append(f"dataSubCategory (from classification)={classification['dataSubCategory']}")

    # Also backfill dataCategory from classification.dataType if dataCategory is still empty
    # (some old files used dataType for what should be dataCategory)
    # Skip this - too risky to assume dataType == dataCategory

    return analysis, changes


def main():
    domains = sorted([d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d))])
    if DOMAIN_FILTER:
        domains = [d for d in domains if d == DOMAIN_FILTER]

    total_updated = 0
    total_skipped = 0
    total_no_overview = 0
    total_no_analysis = 0
    total_already_complete = 0
    domain_stats = {}

    for domain in domains:
        dm_path = os.path.join(base, domain, "data_models")
        if not os.path.isdir(dm_path):
            continue

        updated = 0
        tables = sorted([t for t in os.listdir(dm_path) if t.startswith("table_")])

        for t in tables:
            overview_path = os.path.join(dm_path, t, "overview.md")
            analysis_path = os.path.join(dm_path, t, "definition_analysis.json")

            if not os.path.exists(overview_path):
                total_no_overview += 1
                continue
            if not os.path.exists(analysis_path):
                total_no_analysis += 1
                continue

            overview_fields = parse_overview_table(overview_path)
            if not overview_fields:
                total_skipped += 1
                continue

            with open(analysis_path) as f:
                analysis = json.load(f)

            analysis, changes = backfill_analysis(analysis, overview_fields)

            if changes:
                if not DRY_RUN:
                    # Add backfill metadata
                    if "meta" not in analysis:
                        analysis["meta"] = {}
                    analysis["meta"]["backfilledAt"] = datetime.now(timezone.utc).isoformat()
                    analysis["meta"]["backfilledFields"] = [c.split("=")[0] for c in changes]

                    with open(analysis_path, "w") as f:
                        json.dump(analysis, f, indent=2)

                total_updated += 1
                updated += 1
            else:
                total_already_complete += 1

        domain_stats[domain] = updated
        if updated > 0:
            print(f"  {domain}: {updated} tables updated")

    print(f"\n{'[DRY RUN] ' if DRY_RUN else ''}Summary:")
    print(f"  Total tables updated: {total_updated}")
    print(f"  Already complete: {total_already_complete}")
    print(f"  No overview.md: {total_no_overview}")
    print(f"  No analysis.json: {total_no_analysis}")
    print(f"  Skipped (empty overview): {total_skipped}")


if __name__ == "__main__":
    main()
