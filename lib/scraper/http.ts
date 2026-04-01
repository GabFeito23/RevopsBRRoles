import { REQUEST_TIMEOUT, REQUEST_DELAY } from "@/lib/config";

const HEADERS = {
  "User-Agent": "RevOpsBR-JobBot/1.0",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

export function delay(ms: number = REQUEST_DELAY): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, {
        ...options,
        headers: { ...HEADERS, Accept: "application/json", ...options?.headers },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (resp.status === 429 || resp.status >= 500) {
        await delay(2000 * (attempt + 1));
        continue;
      }
      if (!resp.ok) return null;
      return (await resp.json()) as T;
    } catch {
      if (attempt === 2) return null;
      await delay(2000 * (attempt + 1));
    }
  }
  return null;
}

/**
 * Validate that a URL is reachable (returns 2xx or 3xx).
 * Uses HEAD with GET fallback. Returns true if the URL is valid.
 */
export async function isUrlReachable(url: string): Promise<boolean> {
  try {
    // Try HEAD first (faster, less bandwidth)
    const resp = await fetch(url, {
      method: "HEAD",
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (resp.ok) return true;

    // Some servers don't support HEAD, try GET
    if (resp.status === 405 || resp.status === 403) {
      const getResp = await fetch(url, {
        method: "GET",
        headers: HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      return getResp.ok;
    }

    return false;
  } catch {
    return false;
  }
}

export async function fetchHtml(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { ...HEADERS, Accept: "text/html" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (resp.status === 429 || resp.status >= 500) {
        await delay(2000 * (attempt + 1));
        continue;
      }
      if (!resp.ok) return null;
      return await resp.text();
    } catch {
      if (attempt === 2) return null;
      await delay(2000 * (attempt + 1));
    }
  }
  return null;
}
