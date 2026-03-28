import * as cheerio from "cheerio";
import { GUPY_COMPANIES_BATCH1 } from "@/lib/config";
import { isRelevantJob } from "@/lib/keywords";
import { fetchHtml, delay } from "@/lib/scraper/http";
import type { ScrapedJob } from "@/lib/scraper/types";

interface GupyNextDataJob {
  id: number;
  title: string;
  type?: string;
  department?: string;
  workplace?: {
    address?: {
      country?: string;
      stateShortName?: string;
      state?: string;
      city?: string;
      district?: string;
    };
    workplaceType?: string;
  };
}

/**
 * Scrapes Gupy company career pages by extracting __NEXT_DATA__ JSON.
 * Each company's career page (e.g. vempra.gupy.io) embeds all jobs
 * as a JSON array in the Next.js page props.
 */
export async function fetchGupyJobs(): Promise<ScrapedJob[]> {
  return scrapeCompanyPages(GUPY_COMPANIES_BATCH1);
}

export async function scrapeCompanyPages(companies: string[]): Promise<ScrapedJob[]> {
  const seenIds = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const company of companies) {
    await delay(500);
    try {
      const html = await fetchHtml(`https://${company}.gupy.io/`);
      if (!html) continue;

      const $ = cheerio.load(html);
      const scriptTag = $("#__NEXT_DATA__");
      if (!scriptTag.length) continue;

      let nextData: { props?: { pageProps?: { jobs?: GupyNextDataJob[] } } };
      try {
        nextData = JSON.parse(scriptTag.html() || "{}");
      } catch {
        continue;
      }

      const jobList = nextData?.props?.pageProps?.jobs;
      if (!Array.isArray(jobList)) continue;

      for (const item of jobList) {
        const jobId = String(item.id);
        if (seenIds.has(jobId)) continue;

        const title = item.title || "";
        if (!isRelevantJob(title)) continue;

        seenIds.add(jobId);

        const city = item.workplace?.address?.city || "";
        const stateShort = item.workplace?.address?.stateShortName || "";
        const location = [city, stateShort].filter(Boolean).join(", ");
        const workplaceType = item.workplace?.workplaceType || "";

        // Build description from available fields for classification
        const descParts = [
          item.department ? `Departamento: ${item.department}` : "",
          workplaceType ? `Modelo: ${workplaceType}` : "",
        ].filter(Boolean);

        const companyName = company
          .replace(/^carreiras?/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim() || company;

        jobs.push({
          title,
          company: companyName,
          location,
          description: descParts.join(". "),
          url: `https://${company}.gupy.io/jobs/${item.id}`,
          source: "gupy",
          externalId: `gupy-${jobId}`,
          dateFound: today,
        });
      }

      console.log(`  Gupy ${company}: ${jobList.length} total, ${jobs.length} relevant so far`);
    } catch (err) {
      console.error(`  Gupy ${company}: error`, err);
    }
  }

  return jobs;
}
