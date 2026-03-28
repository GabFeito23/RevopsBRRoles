import { GUPY_COMPANIES_BATCH2 } from "@/lib/config";
import { scrapeCompanyPages } from "@/lib/scraper/sources/gupy";
import type { ScrapedJob } from "@/lib/scraper/types";

/**
 * Scrapes a second batch of Gupy company career pages.
 * (Inhire is a B2B recruitment SPA that cannot be scraped without a browser,
 *  so this step is repurposed for additional Gupy companies.)
 */
export async function fetchInhireJobs(): Promise<ScrapedJob[]> {
  return scrapeCompanyPages(GUPY_COMPANIES_BATCH2);
}
