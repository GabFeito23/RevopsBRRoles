import { isRelevantJob } from "@/lib/keywords";
import { fetchJson, delay } from "@/lib/scraper/http";
import { GOOGLE_SEARCH_QUERIES } from "@/lib/config";
import type { ScrapedJob } from "@/lib/scraper/types";

const CSE_API = "https://www.googleapis.com/customsearch/v1";

const MAX_PAGES_PER_QUERY = 2; // 2 pages = 20 results per query
const MAX_QUERIES = 30; // Stay well within 100/day free limit

interface CseItem {
  link?: string;
  title?: string;
  snippet?: string;
  pagemap?: {
    metatags?: Array<Record<string, string>>;
  };
}

interface CseResponse {
  items?: CseItem[];
}

/**
 * Uses Google Custom Search API to discover RevOps jobs across the Brazilian web.
 * Searches sites like Gupy, LinkedIn, Vagas.com, and general "revops remoto/híbrido" queries.
 * Requires GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID environment variables.
 * Free tier: 100 searches/day.
 */
export async function fetchGoogleSearchJobs(): Promise<ScrapedJob[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    console.log("  Google Search skipped (GOOGLE_CSE_API_KEY/GOOGLE_CSE_ID not set)");
    return [];
  }

  const seenUrls = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];
  let queryCount = 0;

  for (const query of GOOGLE_SEARCH_QUERIES) {
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
        // Restrict to Portuguese results from Brazil
        lr: "lang_pt",
        cr: "countryBR",
      });

      const data = await fetchJson<CseResponse>(`${CSE_API}?${params}`);
      queryCount++;

      if (!data?.items?.length) break;

      for (const item of data.items) {
        const url = item.link || "";
        if (!url || seenUrls.has(url)) continue;

        // Skip non-job URLs (homepages, blog posts, etc.)
        if (isNonJobUrl(url)) continue;

        const rawTitle = item.title || "";
        const snippet = item.snippet || "";

        // Extract job title and company from Google result title
        const { title, company } = parseGoogleTitle(rawTitle, url);

        if (!title) continue;
        if (!isRelevantJob(title, snippet)) continue;

        // Extract location from snippet if possible
        const location = extractLocation(snippet);

        seenUrls.add(url);
        jobs.push({
          title,
          company,
          location,
          description: snippet,
          url,
          source: "google",
          externalId: `google-${Math.abs(hashCode(url)) % 10000000}`,
          dateFound: today,
        });
      }

      console.log(`  Google "${query}" page ${page + 1}: ${data.items.length} results, ${jobs.length} relevant so far`);
    }
  }

  console.log(`  Google Search: ${queryCount} API calls used, ${jobs.length} jobs found`);
  return jobs;
}

function isNonJobUrl(url: string): boolean {
  const lower = url.toLowerCase();
  // Allow known job listing URL patterns
  if (lower.includes("gupy.io/jobs/")) return false;
  if (lower.includes("linkedin.com/jobs/")) return false;
  if (lower.includes("infojobs.com.br/vaga")) return false;
  if (lower.includes("vagas.com.br/vagas")) return false;
  if (lower.includes("greenhouse.io/")) return false;
  if (lower.includes("lever.co/")) return false;
  if (lower.includes("indeed.com/")) return false;
  if (lower.includes("catho.com.br/vagas")) return false;
  if (lower.includes("trampos.co/oportunidades")) return false;

  // Skip blog posts, about pages, homepages
  if (lower.includes("/blog/")) return true;
  if (lower.includes("/about")) return true;
  if (lower.includes("/article")) return true;
  if (lower.endsWith(".com") || lower.endsWith(".com/") || lower.endsWith(".com.br") || lower.endsWith(".com.br/")) return true;

  return false;
}

function parseGoogleTitle(rawTitle: string, url: string): { title: string; company: string } {
  // Remove common suffixes
  let title = rawTitle
    .replace(/\s*\|\s*LinkedIn$/i, "")
    .replace(/\s*-\s*Glassdoor$/i, "")
    .replace(/\s*\|\s*Gupy$/i, "")
    .replace(/\s*-\s*Indeed\.com$/i, "")
    .replace(/\s*\|\s*InfoJobs$/i, "")
    .replace(/\s*\|\s*Vagas\.com\.br$/i, "")
    .trim();

  let company = "";

  // "Title at Company" pattern (LinkedIn)
  if (title.includes(" at ")) {
    const parts = title.split(" at ");
    title = parts[0].trim();
    company = parts[parts.length - 1].trim();
  }
  // "Title - Company" pattern
  else if (title.includes(" - ")) {
    const parts = title.split(" - ");
    title = parts[0].trim();
    company = parts[1]?.trim() || "";
  }
  // "Title | Company" pattern
  else if (title.includes(" | ")) {
    const parts = title.split(" | ");
    title = parts[0].trim();
    company = parts[1]?.trim() || "";
  }

  // Try to extract company from Gupy URL
  if (!company && url.includes("gupy.io")) {
    const match = url.match(/https?:\/\/([^.]+)\.gupy\.io/);
    if (match) {
      company = match[1]
        .replace(/^carreiras?/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    }
  }

  return { title, company };
}

function extractLocation(snippet: string): string {
  const lower = snippet.toLowerCase();

  // Check for remote
  if (/\bremoto\b|\bremote\b|\bhome\s*office\b/i.test(snippet)) {
    return "Remoto";
  }

  // Try to find city + state patterns
  const cityStateMatch = snippet.match(
    /(?:São Paulo|Rio de Janeiro|Belo Horizonte|Curitiba|Florianópolis|Porto Alegre|Brasília|Recife|Salvador|Fortaleza|Campinas|Goiânia)\s*[-–,]\s*(?:SP|RJ|MG|PR|SC|RS|DF|PE|BA|CE|GO)/i,
  );
  if (cityStateMatch) return cityStateMatch[0];

  // Check for state abbreviations
  const stateMatch = snippet.match(/\b(SP|RJ|MG|PR|SC|RS|BA|DF|CE|PE|GO|ES)\b/);
  if (stateMatch) return stateMatch[1];

  // Check for "Brasil" or "Brazil"
  if (lower.includes("brasil") || lower.includes("brazil")) return "Brasil";

  return "";
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
