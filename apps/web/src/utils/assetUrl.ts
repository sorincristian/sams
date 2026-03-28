/**
 * Centralized utility to resolve database relative attachment paths
 * into fully-qualified absolute URLs pointing to the backend static servers.
 */
const VITE_API = import.meta.env.VITE_API_BASE_URL ?? "https://sams-api-vfvj.onrender.com/api";
// Slice off /api suffix so we can resolve to the root static path, e.g. /uploads/
const API_BASE = VITE_API.endsWith("/api") ? VITE_API.slice(0, -4) : VITE_API.replace(/\/api\/.*$/, "");

export function resolveAssetUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith("http")) return urlOrPath;

  let cleanPath = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  
  // Guard against legacy migration bugs where origin was double-appended
  cleanPath = cleanPath.replace(/^\/uploads\/uploads\//, "/uploads/");
  
  return `${API_BASE}${cleanPath}`;
}
