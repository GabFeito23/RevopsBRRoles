import { JOOBLE_SEARCH_KEYWORDS } from "@/lib/config";
import { isRelevantJob } from "@/lib/keywords";
import { delay } from "@/lib/scraper/http";
import type { ScrapedJob } from "@/lib/scraper/types";

const API_BASE = "https://jooble.org/api";

interface JoobleJob {
  title: string;
  location: string;
  snippet: string;
  salary: string;
  source: string;
  type: string;
  link: string;
  company: string;
  updated: string; // ISO date
  id: number;
}

interface JoobleResponse {
  totalCount: number;
  jobs: JoobleJob[];
}

/**
 * Fetches jobs from the Jooble aggregator API.
 * Jooble indexes Indeed, LinkedIn, Glassdoor, Gupy and 70+ other sources.
 * Requires JOOBLE_API_KEY environment variable (free at https://jooble.org/api/about).
 */
export async function fetchJoobleJobs(): Promise<ScrapedJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) {
    console.log("  Jooble: JOOBLE_API_KEY not set, skipping");
    return [];
  }

  const seenIds = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const keyword of JOOBLE_SEARCH_KEYWORDS) {
    await delay(500);
    try {
      const resp = await fetch(`${API_BASE}/${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keyword,
          location: "Brasil",
          page: 1,
          ResultOnPage: 50,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!resp.ok) {
        console.log(`  Jooble "${keyword}": HTTP ${resp.status}`);
        continue;
      }

      const data = (await resp.json()) as JoobleResponse;
      if (!data.jobs?.length) continue;

      for (const item of data.jobs) {
        const id = String(item.id || item.link);
        if (seenIds.has(id)) continue;

        const title = item.title || "";
        const description = item.snippet || "";
        if (!isRelevantJob(title, description)) continue;

        // Skip jobs older than 30 days
        if (item.updated) {
          const jobDate = new Date(item.updated);
          if (jobDate < thirtyDaysAgo) continue;
        }

        seenIds.add(id);
        jobs.push({
          title: title.replace(/<[^>]*>/g, "").trim(),
          company: item.company || "",
          location: item.location || "",
          description: description.replace(/<[^>]*>/g, "").trim(),
          url: item.link || "",
          source: "jooble",
          externalId: `jooble-${item.id || Math.abs(hashCode(item.link)) % 10000000}`,
          dateFound: today,
        });
      }

      console.log(`  Jooble "${keyword}": ${data.jobs.length} results, ${jobs.length} relevant so far`);
    } catch (err) {
      console.error(`  Jooble "${keyword}": error`, err);
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
