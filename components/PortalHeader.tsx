import type { PortalDomain } from "@/lib/database.types";

interface PortalHeaderProps {
  domain: PortalDomain;
}

export function PortalHeader({ domain }: PortalHeaderProps) {
  return (
    <header className="flex items-center gap-4 border-b border-border-default bg-bg-surface px-6 py-4">
      {domain.logo_url ? (
        <img
          src={domain.logo_url}
          alt={domain.display_name ?? domain.domain}
          className="h-8 w-auto object-contain"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-sm font-bold text-white">
          {(domain.display_name ?? domain.domain)
            .substring(0, 2)
            .toUpperCase()}
        </div>
      )}
      <div>
        <h1 className="text-lg font-semibold text-text-primary">
          {domain.display_name ?? domain.domain}
        </h1>
        {domain.tagline && (
          <p className="text-xs text-text-secondary">{domain.tagline}</p>
        )}
      </div>

      {/* ThinkVAL branding */}
      <div className="ml-auto flex items-center gap-1.5 text-text-muted">
        <span className="text-[10px] tracking-wider">Powered by</span>
        <svg width="40" height="14" viewBox="0 0 40 14" fill="none">
          <text
            x="0"
            y="11"
            fontSize="10"
            fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
            fill="currentColor"
          >
            VAL
          </text>
        </svg>
      </div>
    </header>
  );
}
