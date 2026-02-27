#!/usr/bin/env python3
"""Check what fields overview.md has that definition_analysis.json is missing."""

import os
import re

base = "/Users/melvinwang/Thinkval Dropbox/ThinkVAL team folder/SkyNet/tv-knowledge/0_Platform/domains/production"

def parse_overview_table(filepath):
    """Parse the markdown property table from overview.md"""
    result = {}
    try:
        with open(filepath) as f:
            content = f.read()
        for match in re.finditer(r'\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|', content):
            key = match.group(1).strip()
            val = match.group(2).strip().strip('`')
            if val and val != '-' and val != 'N/A':
                result[key] = val
    except Exception:
        pass
    return result

domains = sorted([d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d))])
overview_has_category = 0
overview_has_subcategory = 0
overview_has_source = 0
overview_has_status = 0
overview_has_space = 0
overview_has_zone = 0
checked = 0

for domain in domains:
    dm_path = os.path.join(base, domain, "data_models")
    if not os.path.isdir(dm_path):
        continue
    tables = [t for t in os.listdir(dm_path) if t.startswith("table_")]
    for t in tables:
        ov = os.path.join(dm_path, t, "overview.md")
        if not os.path.exists(ov):
            continue
        checked += 1
        parsed = parse_overview_table(ov)
        if parsed.get("Data Category"): overview_has_category += 1
        if parsed.get("Data Sub Category"): overview_has_subcategory += 1
        if parsed.get("Data Source"): overview_has_source += 1
        if parsed.get("Usage Status"): overview_has_status += 1
        if parsed.get("Space"): overview_has_space += 1
        if parsed.get("Zone"): overview_has_zone += 1

print(f"Checked overview.md files: {checked}")
print(f"Has Data Category: {overview_has_category}")
print(f"Has Data Sub Category: {overview_has_subcategory}")
print(f"Has Data Source: {overview_has_source}")
print(f"Has Usage Status: {overview_has_status}")
print(f"Has Space: {overview_has_space}")
print(f"Has Zone: {overview_has_zone}")
