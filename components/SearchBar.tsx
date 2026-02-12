"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import Fuse from "fuse.js";
import type { PortalResource } from "@/lib/database.types";
import { ResourceCard } from "./ResourceCard";

interface SearchBarProps {
  resources: PortalResource[];
  baseUrl: string;
}

export function SearchBar({ resources, baseUrl }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(resources, {
        keys: [
          { name: "display_name", weight: 2 },
          { name: "resource_name", weight: 1.5 },
          { name: "description", weight: 1 },
          { name: "subcategory", weight: 0.5 },
        ],
        threshold: 0.3,
        includeScore: true,
      }),
    [resources]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 12).map((r) => r.item);
  }, [fuse, query]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuery("");
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search dashboards, workflows, workspaces..."
          className="w-full rounded-lg border border-border-default bg-bg-surface py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-lg border border-border-default bg-bg-surface p-3 shadow-lg">
          {results.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {results.map((r) => (
                <ResourceCard key={r.id} resource={r} baseUrl={baseUrl} />
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-text-muted">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
