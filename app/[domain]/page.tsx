import {
  getSitemapResources,
  groupIntoTabs,
  getDomainInfo,
  getPortalConfig,
  getDomainDocs,
  getGeneralDocs,
} from "@/lib/portal-db";
import { PortalTabs } from "@/components/PortalTabs";

interface PageProps {
  params: Promise<{ domain: string }>;
}

export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: PageProps) {
  const { domain } = await params;
  const domainInfo = getDomainInfo(domain);
  const [resources, config, domainDocs, generalDocs] = await Promise.all([
    getSitemapResources(domain),
    getPortalConfig(domain),
    getDomainDocs(domain),
    getGeneralDocs(),
  ]);
  const tabs = groupIntoTabs(resources, config);

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border-default bg-bg-surface px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-sm font-bold text-white">
          {domainInfo.name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            {domainInfo.name}
          </h1>
          <p className="text-xs text-text-secondary">Resource Portal</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-text-muted">
          <span className="text-[10px] tracking-wider">Powered by</span>
          <span className="text-xs font-bold">VAL</span>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-6">
        <PortalTabs
          tabs={tabs}
          allResources={resources}
          domain={domain}
          domainDocs={domainDocs}
          generalDocs={generalDocs}
        />
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border-default px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <p className="text-[11px] text-text-muted">
            Powered by{" "}
            <a
              href="https://www.thinkval.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-primary hover:underline"
            >
              VAL
            </a>{" "}
            &mdash; Data Platform for F&amp;B and Retail
          </p>
          <p className="text-[11px] text-text-muted">
            {resources.length} resource{resources.length !== 1 ? "s" : ""} &middot;{" "}
            {tabs.length} tab{tabs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </footer>
    </div>
  );
}
