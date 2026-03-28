import * as cheerio from "cheerio";
import { GREENHOUSE_COMPANIES } from "@/lib/config";
import { isRelevantJob } from "@/lib/keywords";
import { fetchJson, delay } from "@/lib/scraper/http";
import type { ScrapedJob } from "@/lib/scraper/types";

const API_BASE = "https://boards-api.greenhouse.io/v1/boards";

interface GreenhouseJob {
  id: number;
  title: string;
  content?: string;
  absolute_url?: string;
  location?: { name?: string };
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

function isBrazilLocation(location: string): boolean {
  if (!location) return true;
  const loc = location.toLowerCase();
  const indicators = [
    "brazil", "brasil", "br",
    "são paulo", "sao paulo", "rio de janeiro",
    "belo horizonte", "curitiba", "florianópolis", "florianopolis",
    "porto alegre", "recife", "salvador", "brasília", "brasilia",
    "remoto", "remote",
  ];
  if (indicators.some((i) => loc.includes(i))) return true;
  return /\b(SP|RJ|MG|PR|SC|RS|BA|DF|CE|PE|GO|ES)\b/.test(location);
}

export async function fetchGreenhouseJobs(): Promise<ScrapedJob[]> {
  const seenIds = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const board of GREENHOUSE_COMPANIES) {
    await delay();
    const data = await fetchJson<GreenhouseResponse>(`${API_BASE}/${board}/jobs?content=true`);
    if (!data?.jobs) continue;

    for (const item of data.jobs) {
      const jobId = String(item.id);
      if (seenIds.has(jobId)) continue;

      const title = item.title || "";
      let description = "";
      if (item.content) {
        const $ = cheerio.load(item.content);
        description = $.text();
      }

      const location = item.location?.name || "";
      if (!isBrazilLocation(location)) continue;
      if (!isRelevantJob(title, description)) continue;

      seenIds.add(jobId);
      jobs.push({
        title,
        company: board.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        location,
        description,
        url: item.absolute_url || "",
        source: "greenhouse",
        externalId: `greenhouse-${jobId}`,
        dateFound: today,
      });
    }
  }

  return jobs;
}
