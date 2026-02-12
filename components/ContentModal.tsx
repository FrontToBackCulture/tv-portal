"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SitemapResource } from "@/lib/portal-db";
import { cn } from "@/lib/cn";

interface ContentModalProps {
  resource: SitemapResource;
  onClose: () => void;
}

export function ContentModal({ resource, onClose }: ContentModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border-default bg-bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {resource.name}
            </h2>
            {resource.description && (
              <p className="mt-0.5 text-sm text-text-secondary">
                {resource.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-section hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5">
          <div
            className={cn(
              "prose prose-sm max-w-none",
              "prose-headings:text-text-primary prose-headings:font-semibold",
              "prose-p:text-text-secondary prose-p:leading-relaxed",
              "prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline",
              "prose-strong:text-text-primary prose-strong:font-semibold",
              "prose-code:rounded prose-code:bg-bg-section prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:text-text-primary prose-code:before:content-none prose-code:after:content-none",
              "prose-pre:rounded-lg prose-pre:border prose-pre:border-border-default prose-pre:bg-bg-section",
              "prose-table:text-sm",
              "prose-th:border prose-th:border-border-default prose-th:bg-bg-section prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-th:text-text-primary",
              "prose-td:border prose-td:border-border-default prose-td:px-3 prose-td:py-2 prose-td:text-text-secondary",
              "prose-li:text-text-secondary",
              "prose-hr:border-border-default"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {resource.portalContent || ""}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer with link to resource */}
        {resource.resourceUrl && (
          <div className="border-t border-border-default px-6 py-3">
            <a
              href={resource.resourceUrl}
              target="_blank"
              rel="noopener"
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              Open in VAL &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
