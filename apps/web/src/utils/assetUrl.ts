import { api } from "../api";

/**
 * Centralized utility to resolve database relative attachment paths
 * into fully-qualified absolute URLs pointing to the backend static servers.
 */
export function resolveAssetUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith("http")) return urlOrPath;

  let cleanPath = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  
  // Guard against legacy migration bugs where origin was double-appended
  cleanPath = cleanPath.replace(/^\/uploads\/uploads\//, "/uploads/");
  
  const base = (api.defaults.baseURL as string) || "https://sams-api-vfvj.onrender.com/api";
  const apiBase = base.endsWith("/api") ? base.slice(0, -4) : base.replace(/\/api\/.*$/, "");
  
  return `${apiBase}${cleanPath}`;
}
