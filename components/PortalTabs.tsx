"use client";

import { useState, useMemo, useCallback } from "react";
import {
  BarChart3,
  Zap,
  Table,
  ExternalLink,
  FileText,
  Search,
  X,
  LayoutGrid,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Save,
  BookOpen,
} from "lucide-react";
import Fuse from "fuse.js";
import type { SitemapTab, SitemapResource, DocItem } from "@/lib/portal-db";
import { ContentModal } from "@/components/ContentModal";
import { cn } from "@/lib/cn";

const typeIcons: Record<string, typeof BarChart3> = {
  dashboard: BarChart3,
  workflow: Zap,
  table: Table,
  query: LayoutGrid,
};

const typeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  workflow: "Workflow",
  table: "Workspace",
  query: "Query",
};

interface PortalTabsProps {
  tabs: SitemapTab[];
  allResources: SitemapResource[];
  domain: string;
  domainDocs: DocItem[];
  generalDocs: DocItem[];
}

type NavSection = "resources" | "domain-docs" | "guides";

export function PortalTabs({ tabs: initialTabs, allResources, domain, domainDocs, generalDocs }: PortalTabsProps) {
  const [tabs, setTabs] = useState(initialTabs);
  const [activeTab, setActiveTab] = useState(initialTabs[0]?.name || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modalResource, setModalResource] = useState<SitemapResource | null>(null);
  const [activeSolution, setActiveSolution] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<NavSection>("resources");
  const [docModal, setDocModal] = useState<DocItem | null>(null);

  // Extract unique solutions
  const solutions = useMemo(() => {
    const set = new Set<string>();
    for (const r of allResources) {
      if (r.solution) set.add(r.solution);
    }
    return Array.from(set).sort();
  }, [allResources]);

  // Filter tabs by active solution
  const filteredTabs = useMemo(() => {
    if (!activeSolution) return tabs;
    return tabs
      .map((tab) => ({
        ...tab,
        sections: tab.sections
          .map((section) => ({
            ...section,
            resources: section.resources.filter(
              (r) => r.solution === activeSolution
            ),
          }))
          .filter((section) => section.resources.length > 0),
      }))
      .filter((tab) => tab.sections.length > 0);
  }, [tabs, activeSolution]);

  const fuse = useMemo(
    () =>
      new Fuse(allResources, {
        keys: [
          { name: "name", weight: 2 },
          { name: "description", weight: 1 },
          { name: "sitemapGroup1", weight: 0.5 },
          { name: "sitemapGroup2", weight: 0.5 },
        ],
        threshold: 0.3,
      }),
    [allResources]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return fuse.search(searchQuery).slice(0, 12).map((r) => r.item);
  }, [fuse, searchQuery]);

  const currentTab = filteredTabs.find((t) => t.name === activeTab);

  // Auto-select first visible tab if current is filtered out
  const effectiveTab = currentTab || filteredTabs[0];

  // Tab reordering
  const moveTab = useCallback(
    (index: number, direction: -1 | 1) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= tabs.length) return;
      const newTabs = [...tabs];
      [newTabs[index], newTabs[newIndex]] = [newTabs[newIndex], newTabs[index]];
      setTabs(newTabs);
      setSaved(false);
    },
    [tabs]
  );

  // Section reordering within a tab
  const moveSection = useCallback(
    (tabName: string, sectionIndex: number, direction: -1 | 1) => {
      const newTabs = tabs.map((tab) => {
        if (tab.name !== tabName) return tab;
        const newSections = [...tab.sections];
        const newIndex = sectionIndex + direction;
        if (newIndex < 0 || newIndex >= newSections.length) return tab;
        [newSections[sectionIndex], newSections[newIndex]] = [
          newSections[newIndex],
          newSections[sectionIndex],
        ];
        return { ...tab, sections: newSections };
      });
      setTabs(newTabs);
      setSaved(false);
    },
    [tabs]
  );

  // Save config
  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      const tabOrder = tabs.map((t) => t.name);
      const sectionOrder: Record<string, string[]> = {};
      for (const tab of tabs) {
        sectionOrder[tab.name] = tab.sections.map((s) => s.name);
      }
      await fetch(`/api/${domain}/portal-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabOrder, sectionOrder }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [tabs, domain]);

  return (
    <div className="space-y-0">
      {/* Search bar + admin toggle */}
      <div className="relative mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search resources..."
            className="w-full rounded-lg border border-border-default bg-bg-surface py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}

          {searchOpen && searchQuery.trim() && (
            <div className="absolute top-full z-50 mt-2 w-full rounded-lg border border-border-default bg-bg-surface p-3 shadow-lg">
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {searchResults.map((r) => (
                    <ResourceCard key={r.id} resource={r} onOpenContent={setModalResource} />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-text-muted">
                  No results for &ldquo;{searchQuery}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Admin toggle */}
        <button
          onClick={() => setEditMode(!editMode)}
          className={cn(
            "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border transition-colors",
            editMode
              ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
              : "border-border-default bg-bg-surface text-text-muted hover:text-text-primary"
          )}
          title={editMode ? "Exit edit mode" : "Arrange tabs & sections"}
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Top nav: Resources | Domain Docs | Guides */}
      <div className="mb-5 flex items-center gap-1 rounded-lg bg-bg-section p-1">
        {([
          { key: "resources" as NavSection, label: "Resources", count: allResources.length },
          ...(domainDocs.length > 0
            ? [{ key: "domain-docs" as NavSection, label: "Documentation", count: domainDocs.length }]
            : []),
          ...(generalDocs.length > 0
            ? [{ key: "guides" as NavSection, label: "Guides", count: generalDocs.length }]
            : []),
        ]).map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveNav(item.key)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeNav === item.key
                ? "bg-bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                activeNav === item.key
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "bg-bg-section text-text-muted"
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* ===== RESOURCES VIEW ===== */}
      {activeNav === "resources" && (
        <>
          {/* Edit mode toolbar */}
          {editMode && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-4 py-2.5">
              <span className="text-xs font-medium text-brand-primary">
                Edit Mode
              </span>
              <span className="text-xs text-text-secondary">
                Use arrows to reorder tabs and sections
              </span>
              <div className="ml-auto flex items-center gap-2">
                {saved && (
                  <span className="text-xs text-success">Saved</span>
                )}
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-50"
                >
                  <Save size={12} />
                  {saving ? "Saving..." : "Save Order"}
                </button>
              </div>
            </div>
          )}

          {/* Solution nav */}
          {solutions.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveSolution(null)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeSolution === null
                    ? "bg-brand-primary text-white"
                    : "bg-bg-section text-text-secondary hover:bg-border-default hover:text-text-primary"
                )}
              >
                All
              </button>
              {solutions.map((sol) => (
                <button
                  key={sol}
                  onClick={() =>
                    setActiveSolution(activeSolution === sol ? null : sol)
                  }
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    activeSolution === sol
                      ? "bg-brand-primary text-white"
                      : "bg-bg-section text-text-secondary hover:bg-border-default hover:text-text-primary"
                  )}
                >
                  {sol}
                </button>
              ))}
            </div>
          )}

          {/* Tab bar */}
          <div className="border-b border-border-default">
            <nav className="-mb-px flex gap-0" role="tablist">
              {filteredTabs.map((tab, tabIndex) => {
                const isActive = tab.name === (effectiveTab?.name || activeTab);
                const count = tab.sections.reduce(
                  (sum, s) => sum + s.resources.length,
                  0
                );
                return (
                  <div key={tab.name} className="relative flex items-center">
                    {editMode && (
                      <button
                        onClick={() => moveTab(tabIndex, -1)}
                        disabled={tabIndex === 0}
                        className="px-0.5 text-text-muted hover:text-brand-primary disabled:opacity-20"
                        title="Move left"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}
                    <button
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.name)}
                      className={cn(
                        "relative px-5 py-3 text-sm font-medium transition-colors",
                        "hover:text-text-primary",
                        isActive ? "text-brand-primary" : "text-text-secondary"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {tab.name}
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            isActive
                              ? "bg-brand-primary/10 text-brand-primary"
                              : "bg-bg-section text-text-muted"
                          )}
                        >
                          {count}
                        </span>
                      </span>
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                      )}
                    </button>
                    {editMode && (
                      <button
                        onClick={() => moveTab(tabIndex, 1)}
                        disabled={tabIndex === filteredTabs.length - 1}
                        className="px-0.5 text-text-muted hover:text-brand-primary disabled:opacity-20"
                        title="Move right"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Tab content */}
          {effectiveTab && (
            <div className="space-y-8 pt-6">
              {effectiveTab.sections.map((section, sectionIndex) => (
                <div key={section.name}>
                  <div className="mb-4 flex items-center gap-2">
                    {editMode && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() =>
                            moveSection(effectiveTab.name, sectionIndex, -1)
                          }
                          disabled={sectionIndex === 0}
                          className="text-text-muted hover:text-brand-primary disabled:opacity-20"
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() =>
                            moveSection(effectiveTab.name, sectionIndex, 1)
                          }
                          disabled={
                            sectionIndex === effectiveTab.sections.length - 1
                          }
                          className="text-text-muted hover:text-brand-primary disabled:opacity-20"
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                    <h3 className="text-base font-semibold text-text-primary">
                      {section.name}
                    </h3>
                    <span className="text-xs text-text-muted">
                      ({section.resources.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {section.resources.map((r) => (
                      <ResourceCard key={r.id} resource={r} onOpenContent={setModalResource} />
                    ))}
                  </div>
                </div>
              ))}

              {effectiveTab.sections.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-text-muted">
                    No resources in this tab yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {filteredTabs.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-text-secondary">
                No resources have been tagged for the sitemap yet.
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Tag resources with{" "}
                <code className="rounded bg-bg-section px-1.5 py-0.5 text-xs">
                  includeSitemap: true
                </code>{" "}
                in the review grid.
              </p>
            </div>
          )}
        </>
      )}

      {/* ===== DOMAIN DOCS VIEW ===== */}
      {activeNav === "domain-docs" && (
        <DocsGrid docs={domainDocs} onOpenDoc={setDocModal} />
      )}

      {/* ===== GUIDES VIEW ===== */}
      {activeNav === "guides" && (
        <DocsGrid docs={generalDocs} onOpenDoc={setDocModal} />
      )}

      {/* Content modal (resources) */}
      {modalResource && (
        <ContentModal
          resource={modalResource}
          onClose={() => setModalResource(null)}
        />
      )}

      {/* Doc modal */}
      {docModal && (
        <DocModal doc={docModal} onClose={() => setDocModal(null)} />
      )}
    </div>
  );
}

function ResourceCard({
  resource,
  onOpenContent,
}: {
  resource: SitemapResource;
  onOpenContent: (r: SitemapResource) => void;
}) {
  const Icon = typeIcons[resource.resourceType] ?? Table;
  const typeLabel = typeLabels[resource.resourceType] ?? "Resource";
  const isContentCard = !!resource.portalContent;

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-primary/8 text-brand-primary">
            <Icon size={16} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-text-primary leading-tight">
              {resource.name}
            </h4>
            <span className="text-[10px] uppercase tracking-wider text-text-muted">
              {typeLabel}
            </span>
          </div>
        </div>
        {isContentCard ? (
          <FileText
            size={14}
            className="mt-1 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
          />
        ) : (
          <ExternalLink
            size={14}
            className="mt-1 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>

      {resource.description && (
        <p className="text-xs leading-relaxed text-text-secondary line-clamp-2">
          {resource.description}
        </p>
      )}

      {resource.solution && (
        <span className="inline-flex w-fit rounded-full bg-brand-accent/10 px-2 py-0.5 text-[10px] font-medium text-brand-accent">
          {resource.solution}
        </span>
      )}
    </>
  );

  if (isContentCard) {
    return (
      <button
        onClick={() => onOpenContent(resource)}
        className="group relative flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-4 text-left transition-all hover:border-brand-primary/30 hover:shadow-md"
      >
        {cardContent}
      </button>
    );
  }

  return (
    <a
      href={resource.resourceUrl || "#"}
      target="_blank"
      rel="noopener"
      className="group relative flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-4 transition-all hover:border-brand-primary/30 hover:shadow-md"
    >
      {cardContent}
    </a>
  );
}

/* ===== Documentation Components ===== */

function DocsGrid({
  docs,
  onOpenDoc,
}: {
  docs: DocItem[];
  onOpenDoc: (doc: DocItem) => void;
}) {
  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, DocItem[]>();
    for (const doc of docs) {
      const cat = doc.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(doc);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [docs]);

  if (docs.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-text-secondary">No documentation available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4">
      {grouped.map(([category, categoryDocs]) => (
        <div key={category}>
          <div className="mb-4 flex items-center gap-2">
            <h3 className="text-base font-semibold text-text-primary capitalize">
              {category}
            </h3>
            <span className="text-xs text-text-muted">
              ({categoryDocs.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoryDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onOpenDoc(doc)}
                className="group relative flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-4 text-left transition-all hover:border-brand-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-accent/10 text-brand-accent">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-primary leading-tight">
                        {doc.title}
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider text-text-muted">
                        Guide
                      </span>
                    </div>
                  </div>
                  <FileText
                    size={14}
                    className="mt-1 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
                {doc.summary && (
                  <p className="text-xs leading-relaxed text-text-secondary line-clamp-2">
                    {doc.summary}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocModal({
  doc,
  onClose,
}: {
  doc: DocItem;
  onClose: () => void;
}) {
  // Reuse ContentModal's structure but for DocItem
  // Convert DocItem to a minimal SitemapResource-like shape for ContentModal
  return (
    <ContentModal
      resource={{
        id: doc.id,
        name: doc.title,
        description: doc.summary,
        resourceType: "dashboard",
        resourceUrl: null,
        sitemapGroup1: "",
        sitemapGroup2: "",
        solution: null,
        portalContent: doc.content,
      }}
      onClose={onClose}
    />
  );
}
