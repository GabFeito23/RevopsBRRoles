import { isRelevantJob } from "@/lib/keywords";
import { fetchJson, delay } from "@/lib/scraper/http";
import type { ScrapedJob } from "@/lib/scraper/types";

const CSE_API = "https://www.googleapis.com/customsearch/v1";

const SEARCH_QUERIES = [
  'site:linkedin.com/jobs "RevOps" OR "Revenue Operations" Brazil',
  'site:linkedin.com/jobs "Sales Ops" OR "Sales Operations" Brazil',
  'site:linkedin.com/jobs "Marketing Ops" OR "Marketing Operations" Brazil',
  'site:linkedin.com/jobs "CRM Admin" OR "Salesforce Admin" Brazil',
  'site:linkedin.com/jobs "GTM Ops" OR "GTM Engineer" Brazil',
];

const MAX_PAGES_PER_QUERY = 3;
const MAX_QUERIES = 15;

interface CseItem {
  link?: string;
  title?: string;
  snippet?: string;
}

interface CseResponse {
  items?: CseItem[];
}

export async function fetchLinkedInJobs(): Promise<ScrapedJob[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    console.log("  LinkedIn skipped (GOOGLE_CSE_API_KEY/GOOGLE_CSE_ID not set)");
    return [];
  }

  const seenUrls = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];
  let queryCount = 0;

  for (const query of SEARCH_QUERIES) {
    if (queryCount >= MAX_QUERIES) break;

    for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
      if (queryCount >= MAX_QUERIES) break;

      await delay();
      const start = page * 10 + 1;
      const params = new URLSearchParams({
        key: apiKey,
        cx: cseId,
        q: query,
        num: "10",
        start: String(start),
      });

      const data = await fetchJson<CseResponse>(`${CSE_API}?${params}`);
      queryCount++;

      if (!data?.items?.length) break;

      for (const item of data.items) {
        const url = item.link || "";
        if (!url || seenUrls.has(url) || !url.includes("linkedin.com/jobs")) continue;

        let title = (item.title || "").replace(" | LinkedIn", "").trim();
        const snippet = item.snippet || "";

        let company = "";
        if (title.includes(" at ")) {
          const parts = title.split(" at ");
          title = parts[0].trim();
          company = parts[parts.length - 1].trim();
        } else if (title.includes(" - ")) {
          const parts = title.split(" - ");
          title = parts[0].trim();
          company = parts[1]?.trim() || "";
        }

        if (!isRelevantJob(title, snippet)) continue;

        seenUrls.add(url);
        jobs.push({
          title,
          company,
          location: "Brazil",
          description: snippet,
          url,
          source: "linkedin",
          externalId: `linkedin-${Math.abs(hashCode(url)) % 10000000}`,
          dateFound: today,
        });
      }
    }
  }

  return jobs;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
