/**
 * Build VAL resource URLs from domain base URL + resource type + ID.
 *
 * URL patterns (to be confirmed with VAL):
 * - Dashboard: {baseUrl}/prism/dashboard/{id}
 * - Workflow:  {baseUrl}/workflow/{id}
 * - Workspace: {baseUrl}/workspace/{id}
 */

export function buildResourceUrl(
  baseUrl: string,
  resourceType: string,
  resourceId: number
): string {
  const base = baseUrl.replace(/\/$/, "");

  switch (resourceType) {
    case "dashboard":
      return `${base}/prism/dashboard/${resourceId}`;
    case "workflow":
      return `${base}/workflow/${resourceId}`;
    case "workspace":
      return `${base}/workspace/${resourceId}`;
    default:
      return base;
  }
}

export function getResourceTypeIcon(resourceType: string): string {
  switch (resourceType) {
    case "dashboard":
      return "bar-chart-3";
    case "workflow":
      return "zap";
    case "workspace":
      return "table";
    default:
      return "file";
  }
}

export function getResourceTypeLabel(resourceType: string): string {
  switch (resourceType) {
    case "dashboard":
      return "Dashboards";
    case "workflow":
      return "Workflows";
    case "workspace":
      return "Workspaces";
    default:
      return "Resources";
  }
}
