/**
 * Resilient Backend API Client with Multi-Target Failover & In-Memory Route Caching.
 * Automatically resolves and connects across Docker bridge networks, remote VPS, and local environments.
 */

let cachedWorkingBackendUrl: string | null = null;

function getCandidateUrls(): string[] {
  const envUrl = process.env.FASTAPI_BACKEND_URL?.trim() || '';

  const candidates: string[] = [];

  // 1. Explicit FASTAPI_BACKEND_URL takes priority if configured
  if (envUrl) {
    candidates.push(envUrl);
  }

  // 2. Local development loopback (Port 9000)
  candidates.push('http://127.0.0.1:9000', 'http://localhost:9000');

  // 3. Containerized service discovery (Docker networks)
  candidates.push(
    'http://backend:9000',
    'http://van_vibes_backend:9000',
    'http://host.docker.internal:9000'
  );

  // Deduplicate and strip trailing slashes
  return Array.from(new Set(candidates.filter(Boolean).map((u) => u.trim().replace(/\/+$/, ''))));
}

export async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 1. Try cached working candidate first for 0ms discovery overhead
  if (cachedWorkingBackendUrl) {
    try {
      const response = await fetch(`${cachedWorkingBackendUrl}${cleanEndpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });
      return response;
    } catch {
      // Cached URL failed or backend restarted; invalidate and failover
      cachedWorkingBackendUrl = null;
    }
  }

  // 2. Multi-target candidate probing
  const candidates = getCandidateUrls();
  let lastError: unknown = null;

  for (const base of candidates) {
    try {
      const url = `${base}${cleanEndpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      // Cache this working base URL for subsequent calls
      cachedWorkingBackendUrl = base;
      return response;
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error(`All backend candidate URLs unreachable for ${cleanEndpoint}`);
}
