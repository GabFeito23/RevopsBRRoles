import { isRelevantJob } from "@/lib/keywords";
import { delay } from "@/lib/scraper/http";
import { EXA_SEARCH_QUERIES } from "@/lib/config";
import type { ScrapedJob } from "@/lib/scraper/types";

const EXA_API = "https://api.exa.ai/search";

/**
 * How many days back to search for jobs.
 * We look at the last 14 days to catch recent postings while allowing
 * some buffer for jobs that were indexed with a slight delay.
 */
const LOOKBACK_DAYS = 14;

interface ExaResult {
  id?: string;
  url?: string;
  title?: string;
  text?: string;
  publishedDate?: string;
  highlights?: string[];
}

interface ExaResponse {
  results?: ExaResult[];
}

/**
 * Uses the Exa AI search API to discover RevOps jobs in Brazil.
 * Exa excels at semantic search and finds listings across many job boards
 * that other scrapers miss (revopscareers.com, sportstechjobs.com, flexionis,
 * workingnomads, himalayas, jobgether, anchorpoint, remocate, etc.)
 *
 * Requires EXA_API_KEY environment variable.
 * Filters by publishedDate to only return recent postings.
 */
export async function fetchExaJobs(): Promise<ScrapedJob[]> {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    console.log("  Exa Search skipped (EXA_API_KEY not set)");
    return [];
  }

  const seenUrls = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Calculate the date cutoff for filtering recent jobs
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);
  const startPublishedDate = cutoffDate.toISOString().split("T")[0];

  for (const queryConfig of EXA_SEARCH_QUERIES) {
    await delay(500); // Small delay between requests to be respectful

    try {
      const body: Record<string, unknown> = {
        query: queryConfig.query,
        type: "auto",
        numResults: queryConfig.numResults || 15,
        contents: {
          text: { maxCharacters: 1500 },
          highlights: {
            numSentences: 3,
            highlightsPerUrl: 2,
            query: "job role responsibilities requirements Brazil",
          },
        },
        // Only get recent postings
        startPublishedDate,
      };

      // Add includeDomains filter if specified (for targeted searches)
      if (queryConfig.includeDomains?.length) {
        body.includeDomains = queryConfig.includeDomains;
      }

      // Add includeText filter to ensure Brazil relevance
      if (queryConfig.includeText?.length) {
        body.includeText = queryConfig.includeText;
      }

      const resp = await fetch(EXA_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });

      if (!resp.ok) {
        console.log(`  Exa "${queryConfig.query}": HTTP ${resp.status}`);
        continue;
      }

      const data = (await resp.json()) as ExaResponse;
      const results = data.results || [];

      for (const r of results) {
        const url = r.url || "";
        if (!url || seenUrls.has(url)) continue;

        // Skip non-job content (salary pages, blog posts, tool pages)
        if (isNonJobResult(url, r.title || "")) continue;

        const rawTitle = r.title || "";
        const { title, company } = parseExaTitle(rawTitle, url);
        if (!title) continue;

        // Combine all available text for relevance checking
        const fullText = [
          r.text || "",
          ...(r.highlights || []),
        ].join(" ");

        if (!isRelevantJob(title, fullText)) continue;

        // Extract location from text content
        const location = extractLocation(fullText, url);

        // Always use today as dateFound (when we discovered it).
        // Exa's publishedDate can be weeks old and would get filtered
        // out by the STALE_DAYS cutoff on the homepage.

        seenUrls.add(url);
        jobs.push({
          title,
          company: company || "Unknown",
          location,
          description: buildDescription(r),
          url,
          source: "exa",
          externalId: `exa-${hashCode(url)}`,
          dateFound: today,
        });
      }

      console.log(
        `  Exa "${queryConfig.query}": ${results.length} results, ${jobs.length} relevant so far`,
      );
    } catch (err) {
      console.error(`  Exa "${queryConfig.query}": error`, err);
    }
  }

  console.log(`  Exa Search: ${EXA_SEARCH_QUERIES.length} queries, ${jobs.length} jobs found`);
  return jobs;
}

/**
 * Filter out URLs that are not actual job listings.
 */
function isNonJobResult(url: string, title: string): boolean {
  const lower = url.toLowerCase();
  const titleLower = title.toLowerCase();

  // Skip salary/compensation pages
  if (titleLower.includes("salary") || titleLower.includes("salário")) return true;
  if (lower.includes("/salaries/") || lower.includes("/salary")) return true;

  // Skip blog/article/guide pages
  if (lower.includes("/blog/") || lower.includes("/article/")) return true;
  if (lower.includes("/guide") || lower.includes("/tutorial")) return true;

  // Skip tool/product pages (not job listings)
  if (lower.includes("/tools/") || lower.includes("/solucoes/")) return true;
  if (lower.includes("/integration")) return true;

  // Skip social media posts (Instagram, Twitter, etc.)
  if (lower.includes("instagram.com") || lower.includes("twitter.com")) return true;
  if (lower.includes("x.com/")) return true;

  // Skip homepage-only URLs
  if (lower.match(/^https?:\/\/[^/]+\/?$/)) return true;

  // Skip dev community / tutorial posts
  if (lower.includes("forem.com") || lower.includes("dev.to")) return true;

  // Skip virtual assistant / freelance service pages
  if (titleLower.includes("virtual assistant")) return true;

  return false;
}

/**
 * Parse the title from Exa search results to extract job title and company.
 * Handles patterns like:
 *   "Job Title at Company - Platform"
 *   "Job Title | Company"
 *   "Job Title - Company - Platform"
 *   "Job Title @ Company"
 */
function parseExaTitle(
  rawTitle: string,
  url: string,
): { title: string; company: string } {
  // Remove common platform suffixes
  let cleaned = rawTitle
    .replace(/\s*[-|]\s*(?:LinkedIn|Glassdoor|Indeed|Jobs|Working Nomads|RevOps Careers|The Muse|Workable|SportsTechJobs|Flexionis|Hiredock|Arc\.dev|Jobicy|Kerja-Remote|Anchorpoint|JobLeads\.com|Remocate|Jobgether)$/i, "")
    .replace(/\s*[-|]\s*Remote\s*$/i, "")
    .trim();

  let title = "";
  let company = "";

  // "Title @ Company" pattern (Ashby)
  if (cleaned.includes(" @ ")) {
    const parts = cleaned.split(" @ ");
    title = parts[0].trim();
    company = parts.slice(1).join(" @ ").trim();
  }
  // "Title at Company" pattern (LinkedIn, others)
  else if (/ at /i.test(cleaned)) {
    const idx = cleaned.search(/ at /i);
    title = cleaned.slice(0, idx).trim();
    company = cleaned.slice(idx + 4).trim();
  }
  // "Title | Company" pattern
  else if (cleaned.includes(" | ")) {
    const parts = cleaned.split(" | ");
    title = parts[0].trim();
    company = parts.slice(1).join(" | ").trim();
  }
  // "Title - Company" pattern (most common)
  else if (cleaned.includes(" - ")) {
    const parts = cleaned.split(" - ");
    title = parts[0].trim();
    company = parts.slice(1).join(" - ").trim();
  } else {
    title = cleaned;
  }

  // Try to extract company from known URL patterns
  if (!company) {
    company = extractCompanyFromUrl(url);
  }

  // Clean up company: remove location suffixes like "(Remote)" or "(Brazil)"
  company = company
    .replace(/\s*\((?:Remote|Brazil|Brasil|São Paulo|Hybrid|Remoto)\)/gi, "")
    .trim();

  // Clean title: remove prefixes like "Job Page |"
  title = title.replace(/^Job Page\s*\|\s*/i, "").trim();

  return { title, company };
}

/**
 * Try to extract the company name from the URL domain.
 */
function extractCompanyFromUrl(url: string): string {
  const lower = url.toLowerCase();

  // Gupy: https://company.gupy.io/jobs/...
  const gupyMatch = lower.match(/https?:\/\/([^.]+)\.gupy\.io/);
  if (gupyMatch) {
    return gupyMatch[1]
      .replace(/^carreiras?/, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  // Greenhouse: https://boards.greenhouse.io/company/...
  const ghMatch = lower.match(/greenhouse\.io\/([^/]+)/);
  if (ghMatch) {
    return ghMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Lever: https://jobs.lever.co/company/...
  const leverMatch = lower.match(/lever\.co\/([^/]+)/);
  if (leverMatch) {
    return leverMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Ashby: https://jobs.ashbyhq.com/company/...
  const ashbyMatch = lower.match(/ashbyhq\.com\/([^/]+)/);
  if (ashbyMatch) {
    return ashbyMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return "";
}

/**
 * Extract location information from the result text.
 */
function extractLocation(text: string, url: string): string {
  const lower = text.toLowerCase();

  // Check for remote indicators
  if (/\bremoto\b|\bremote\b|\bhome\s*office\b|\bfully remote\b/i.test(text)) {
    // Check if it also mentions a location (hybrid-ish or "Remote, São Paulo")
    const cityMatch = text.match(
      /(?:São Paulo|Rio de Janeiro|Belo Horizonte|Curitiba|Florianópolis|Porto Alegre|Brasília|Recife|Salvador|Fortaleza|Campinas|Goiânia)/i,
    );
    if (cityMatch) return `${cityMatch[0]} (Remoto)`;
    return "Remoto";
  }

  // Check for hybrid
  if (/\bhíbrido\b|\bhybrid\b/i.test(text)) {
    const cityMatch = text.match(
      /(?:São Paulo|Rio de Janeiro|Belo Horizonte|Curitiba|Florianópolis|Porto Alegre|Brasília|Recife|Salvador|Fortaleza|Campinas|Goiânia)/i,
    );
    if (cityMatch) return `${cityMatch[0]} (Híbrido)`;
    return "Híbrido";
  }

  // City + State patterns
  const cityStateMatch = text.match(
    /(?:São Paulo|Rio de Janeiro|Belo Horizonte|Curitiba|Florianópolis|Porto Alegre|Brasília|Recife|Salvador|Fortaleza|Campinas|Goiânia)\s*[-–,]\s*(?:SP|RJ|MG|PR|SC|RS|DF|PE|BA|CE|GO)/i,
  );
  if (cityStateMatch) return cityStateMatch[0];

  // State abbreviations
  const stateMatch = text.match(/\b(SP|RJ|MG|PR|SC|RS|BA|DF|CE|PE|GO|ES)\b/);
  if (stateMatch) return stateMatch[1];

  // "Brazil" or "Brasil"
  if (lower.includes("brasil") || lower.includes("brazil")) return "Brasil";

  // LATAM mention
  if (lower.includes("latam") || lower.includes("latin america")) return "LATAM";

  return "";
}

/**
 * Build a clean description from all available Exa result data.
 */
function buildDescription(result: ExaResult): string {
  const parts: string[] = [];

  if (result.highlights?.length) {
    parts.push(result.highlights.join(" "));
  }

  if (result.text) {
    // Use text but limit length
    const text = result.text.slice(0, 800);
    if (!parts.length || !parts[0].includes(text.slice(0, 50))) {
      parts.push(text);
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 1500);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100000000;
}
