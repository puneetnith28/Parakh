/**
 * API Client Configuration
 *
 * Provides the configured API base URL from Vite environment variables (VITE_API_BASE_URL),
 * gracefully falling back to http://localhost:3000 for local development.
 */

export function normalizeApiBaseUrl(raw?: string): string {
  if (!raw) return "http://localhost:3000";
  let url = raw.trim().replace(/\/+$/, "");
  const hasHttp = url.startsWith("http://");
  let hostAndPort = url.replace(/^https?:\/\//, "");
  const [hostName, port] = hostAndPort.split(":");

  // If host is a Render bare service name (e.g. 'parakh-api-kyyz' without a domain dot)
  if (!hostName.includes(".") && hostName !== "localhost") {
    hostAndPort = `${hostName}.onrender.com${port ? `:${port}` : ""}`;
  }

  if (hasHttp || hostName === "localhost" || hostName === "127.0.0.1") {
    return `http://${hostAndPort}`;
  }
  return `https://${hostAndPort}`;
}

const rawApiUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL: string = normalizeApiBaseUrl(rawApiUrl);

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
