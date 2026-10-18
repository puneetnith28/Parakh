/**
 * API Client Configuration
 *
 * Provides the configured API base URL from Vite environment variables (VITE_API_BASE_URL),
 * gracefully falling back to http://localhost:3000 for local development.
 */

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, "");

export const API_BASE_URL: string = rawApiUrl
  ? rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")
    ? rawApiUrl
    : `https://${rawApiUrl}`
  : "http://localhost:3000";

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
