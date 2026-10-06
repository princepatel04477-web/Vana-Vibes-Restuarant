/**
 * Centralized Environment Configuration for Van Vibes Customer Frontend
 * Single Source of Truth for API, WebSocket, Backend URLs, and Port Settings.
 */
import { getCustomerFrontendBaseUrl } from '@/lib/qr-url';

export const envConfig = {
  // Application Port (Production: 4000)
  port: parseInt(process.env.PORT || '4000', 10),

  // Environment mode
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  /**
   * Resolves the server-side FastAPI backend URL (used by Next.js Server Route Handlers).
   * Backend runs on port 9000.
   */
  getFastApiBackendUrl(): string {
    const envUrl = process.env.FASTAPI_BACKEND_URL;
    if (envUrl && envUrl.trim()) {
      return envUrl.trim().replace(/\/+$/, '');
    }
    return process.env.NODE_ENV === 'production' ? 'http://backend:9000' : 'http://127.0.0.1:9000';
  },

  /**
   * Resolves the public REST API base URL.
   * In browser, dynamically matches current hostname on port 9000 if localhost is configured.
   */
  getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const envUrl = process.env.NEXT_PUBLIC_API_URL;

      if (
        envUrl &&
        envUrl.trim() &&
        !envUrl.includes('localhost') &&
        !envUrl.includes('127.0.0.1')
      ) {
        let resolved = envUrl.trim();
        if (protocol === 'https:' && resolved.startsWith('http://')) {
          resolved = resolved.replace(/^http:\/\//, 'https://');
        }
        return resolved.replace(/\/+$/, '');
      }

      return `${protocol}//${hostname}:9000/api/v1`;
    }

    return 'http://127.0.0.1:9000/api/v1';
  },

  /**
   * Dynamically resolves the live WebSocket Stream URL.
   * - In browser, dynamically matches current hostname on port 9000
   * - Automatically selects wss:// on https: and ws:// on http:
   */
  getWebSocketUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

      if (
        envWsUrl &&
        envWsUrl.trim() &&
        !envWsUrl.includes('localhost') &&
        !envWsUrl.includes('127.0.0.1')
      ) {
        let baseWsUrl = envWsUrl.trim();
        if (protocol === 'wss:' && baseWsUrl.startsWith('ws://')) {
          baseWsUrl = baseWsUrl.replace(/^ws:\/\//, 'wss://');
        }
        return baseWsUrl;
      }

      return `${protocol}//${hostname}:9000/api/v1/ws/orders`;
    }

    return 'ws://127.0.0.1:9000/api/v1/ws/orders';
  },

  /**
   * Resolves public customer app URL for metadata, SEO, and share links.
   */
  getPublicAppUrl(): string {
    return getCustomerFrontendBaseUrl();
  },
};
