/**
 * Centralized URL Generation Utility for Customer QR Menu URLs.
 * 
 * Ensures customer-facing URLs are fully dynamic and deployment-independent:
 * - Uses window.location.origin in the browser by default
 * - Supports custom domains, reverse proxies (HTTPS, standard ports 80/443), and custom ports (:4000)
 * - Safe query parameter encoding for table and token
 * - Server-side fallback to configured environment variables (NEXT_PUBLIC_APP_URL or APP_URL)
 */

export interface CustomerMenuUrlOptions {
  tableId: string;
  token?: string;
  origin?: string;
  cafeSlug?: string;
}

/**
 * Normalizes an origin or base URL:
 * - Ensures valid http/https protocol
 * - Removes trailing slashes
 * - Strips redundant standard ports (:80 for http, :443 for https)
 */
export function normalizeOrigin(rawUrl: string): string {
  if (!rawUrl || !rawUrl.trim()) return '';
  let urlStr = rawUrl.trim();

  // Add protocol if missing
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = `http://${urlStr}`;
  }

  try {
    const parsed = new URL(urlStr);
    return parsed.origin;
  } catch {
    return urlStr.replace(/\/+$/, '');
  }
}

/**
 * Resolves the customer frontend base URL dynamically.
 * 
 * Priority:
 * 1. Explicit override passed in or configured in NEXT_PUBLIC_APP_URL / APP_URL
 * 2. In browser: window.location.origin (automatically matches LAN IP, domain, or localhost)
 * 3. Server-side fallback: http://localhost:PORT
 */
export function getCustomerFrontendBaseUrl(overrideOrigin?: string): string {
  if (overrideOrigin && overrideOrigin.trim()) {
    return normalizeOrigin(overrideOrigin);
  }

  // In browser context: window.location.origin is authoritative
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    // If an explicit public production URL is configured (and not loopback), and user is on production domain
    if (
      envAppUrl &&
      envAppUrl.trim() &&
      !envAppUrl.includes('localhost') &&
      !envAppUrl.includes('127.0.0.1')
    ) {
      return normalizeOrigin(envAppUrl);
    }

    return origin;
  }

  // Server-side context
  const serverEnvUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (serverEnvUrl && serverEnvUrl.trim()) {
    return normalizeOrigin(serverEnvUrl);
  }

  const port = process.env.PORT || '4000';
  return `http://localhost:${port}`;
}

/**
 * Constructs a fully qualified, deployment-independent customer menu URL.
 * 
 * Example:
 * http://192.168.10.9:4000/cafe/van-vibes/menu?table=T01&token=vv_sec_t01_6834
 * https://cafe.example.com/cafe/van-vibes/menu?table=T01&token=vv_sec_t01_6834
 */
export function buildCustomerMenuUrl({
  tableId,
  token,
  origin,
  cafeSlug = 'van-vibes',
}: CustomerMenuUrlOptions): string {
  const base = getCustomerFrontendBaseUrl(origin);
  const path = `/cafe/${encodeURIComponent(cafeSlug)}/menu`;

  try {
    const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
    url.searchParams.set('table', tableId);
    if (token) {
      url.searchParams.set('token', token);
    }
    return url.toString();
  } catch {
    const searchParams = new URLSearchParams();
    searchParams.set('table', tableId);
    if (token) {
      searchParams.set('token', token);
    }
    const cleanBase = base.replace(/\/+$/, '');
    return `${cleanBase}${path}?${searchParams.toString()}`;
  }
}
