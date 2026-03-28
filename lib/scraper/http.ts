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
