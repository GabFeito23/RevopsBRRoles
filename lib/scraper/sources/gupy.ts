import * as cheerio from "cheerio";
import { GUPY_COMPANIES } from "@/lib/config";
import { isRelevantJob } from "@/lib/keywords";
import { fetchJson, fetchHtml, delay } from "@/lib/scraper/http";
import type { ScrapedJob } from "@/lib/scraper/types";

const API_BASE = "https://portal.api.gupy.io/api/job";

const SEARCH_KEYWORDS = [
  "RevOps", "Revenue Operations",
  "Sales Ops", "Sales Operations",
  "CS Ops", "Customer Success Ops",
  "GTM Ops", "GTM Engineer",
  "Marketing Ops", "Marketing Operations",
  "CRM Admin",
  "Operações de Vendas",
  "Operações de Receita",
];

interface GupyApiResult {
  data?: {
    id: number;
    name: string;
    description?: string;
    careerPageName?: string;
    jobUrl?: string;
    city?: string;
    state?: string;
  }[];
}

export async function fetchGupyJobs(): Promise<ScrapedJob[]> {
  const jobs = await fetchViaApi();
  if (jobs.length > 0) return jobs;

  console.log("  Gupy API returned no results, trying HTML fallback...");
  return fetchViaHtml();
}

async function fetchViaApi(): Promise<ScrapedJob[]> {
  const seenIds = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];

  const headers: Record<string, string> = {};
  if (process.env.GUPY_API_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GUPY_API_TOKEN}`;
  }

  for (const keyword of SEARCH_KEYWORDS) {
    await delay();
    const data = await fetchJson<GupyApiResult>(
      `${API_BASE}?name=${encodeURIComponent(keyword)}&limit=400`,
      { headers },
    );
    if (!data?.data) continue;

    for (const item of data.data) {
      const jobId = String(item.id);
      if (seenIds.has(jobId)) continue;

      const title = item.name || "";
      const description = item.description || "";
      if (!isRelevantJob(title, description)) continue;

      seenIds.add(jobId);
      const careerPage = item.careerPageName || "";
      const jobUrl = item.jobUrl || `https://${careerPage}.gupy.io/job/eyJqb2JJZCI6${jobId}`;

      jobs.push({
        title,
        company: (item.careerPageName || careerPage).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        location: [item.city, item.state].filter(Boolean).join(", "),
        description,
        url: jobUrl,
        source: "gupy",
        externalId: `gupy-${jobId}`,
        dateFound: today,
      });
    }
  }

  return jobs;
}

async function fetchViaHtml(): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const company of GUPY_COMPANIES) {
    await delay();
    const html = await fetchHtml(`https://${company}.gupy.io/`);
    if (!html) continue;

    const $ = cheerio.load(html);
    const jobLinks = $("a[href*='/job/']");

    jobLinks.each((_, el) => {
      const link = $(el);
      const titleEl = link.find("[class*='title'], h3, h4");
      const title = titleEl.length ? titleEl.text().trim() : link.text().trim();

      if (!title || !isRelevantJob(title)) return;

      let jobUrl = link.attr("href") || "";
      if (jobUrl && !jobUrl.startsWith("http")) {
        jobUrl = `https://${company}.gupy.io${jobUrl}`;
      }

      const locationEl = link.find("[class*='location'], [class*='place']");
      const location = locationEl.length ? locationEl.text().trim() : "";

      jobs.push({
        title,
        company: company.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        location,
        description: "",
        url: jobUrl,
        source: "gupy",
        externalId: `gupy-html-${company}-${Math.abs(hashCode(title)) % 100000}`,
        dateFound: today,
      });
    });
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
