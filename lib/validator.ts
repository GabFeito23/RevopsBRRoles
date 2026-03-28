import * as cheerio from "cheerio";

export function cleanText(htmlOrText: string): string {
  if (!htmlOrText) return "";

  const $ = cheerio.load(htmlOrText);
  let text = $.text();

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Truncate to 5000 chars for DB storage
  if (text.length > 5000) {
    text = text.slice(0, 5000) + "...";
  }

  return text;
}

export async function validateUrl(url: string): Promise<boolean> {
  if (!url || !url.startsWith("http")) return false;
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    return resp.status < 400;
  } catch {
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
      });
      return resp.status < 400;
    } catch {
      return false;
    }
  }
}
