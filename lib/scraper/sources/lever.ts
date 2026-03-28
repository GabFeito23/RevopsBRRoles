import { LEVER_COMPANIES } from "@/lib/config";
import { isRelevantJob } from "@/lib/keywords";
import { fetchJson, delay } from "@/lib/scraper/http";
import type { ScrapedJob } from "@/lib/scraper/types";

const API_BASE = "https://api.lever.co/v0/postings";

interface LeverPosting {
  id: string;
  text: string;
  descriptionPlain?: string;
  description?: string;
  hostedUrl?: string;
  categories?: { location?: string };
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

export async function fetchLeverJobs(): Promise<ScrapedJob[]> {
  const seenIds = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const company of LEVER_COMPANIES) {
    await delay();
    const postings = await fetchJson<LeverPosting[]>(`${API_BASE}/${company}?mode=json`);
    if (!postings || !Array.isArray(postings)) continue;

    for (const post of postings) {
      if (!post.id || seenIds.has(post.id)) continue;

      const location = post.categories?.location || "";
      if (!isBrazilLocation(location)) continue;

      const title = post.text || "";
      const description = post.descriptionPlain || post.description || "";
      if (!isRelevantJob(title, description)) continue;

      seenIds.add(post.id);
      jobs.push({
        title,
        company: company.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        location,
        description,
        url: post.hostedUrl || "",
        source: "lever",
        externalId: `lever-${post.id}`,
        dateFound: today,
      });
    }
  }

  return jobs;
}
