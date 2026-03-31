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
 * Fetches remote RevOps jobs from Jooble (USA API) that target Brazil/LATAM candidates.
 * The US API works reliably. We search for remote roles and filter for those
 * that mention Brazil, LATAM, or Latin America in their listing.
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

  // Patterns that indicate the job is open to Brazil/LATAM candidates
  const latamPatterns = [
    /\bbrasil\b/i, /\bbrazil\b/i,
    /\blatam\b/i, /\blatin\s*america\b/i, /\bamérica\s*latina\b/i,
    /\bsouth\s*america\b/i, /\bamericas\b/i,
  ];

  function targetsLatam(text: string): boolean {
    return latamPatterns.some((p) => p.test(text));
  }

  for (const keyword of JOOBLE_SEARCH_KEYWORDS) {
    await delay(500);
    try {
      const resp = await fetch(`${API_BASE}/${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keyword,
          location: "",
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

      let keywordMatches = 0;
      for (const item of data.jobs) {
        const id = String(item.id || item.link);
        if (seenIds.has(id)) continue;

        const title = (item.title || "").replace(/<[^>]*>/g, "").trim();
        const description = (item.snippet || "").replace(/<[^>]*>/g, "").trim();
        const location = item.location || "";

        // Must be relevant to RevOps/SalesOps/etc
        if (!isRelevantJob(title, description)) continue;

        // Must target Brazil/LATAM - check title, description, and location
        const fullText = `${title} ${description} ${location}`;
        if (!targetsLatam(fullText)) continue;

        // Skip jobs older than 30 days
        if (item.updated) {
          const jobDate = new Date(item.updated);
          if (jobDate < thirtyDaysAgo) continue;
        }

        seenIds.add(id);
        keywordMatches++;
        jobs.push({
          title,
          company: item.company || "",
          location,
          description,
          url: item.link || "",
          source: "jooble",
          externalId: `jooble-${item.id || Math.abs(hashCode(item.link)) % 10000000}`,
          dateFound: today,
        });
      }

      console.log(`  Jooble "${keyword}": ${data.jobs.length} results, ${keywordMatches} target LATAM, ${jobs.length} total`);
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
