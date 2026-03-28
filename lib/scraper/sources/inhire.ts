import * as cheerio from "cheerio";
import { isRelevantJob } from "@/lib/keywords";
import { fetchHtml, delay } from "@/lib/scraper/http";
import type { ScrapedJob } from "@/lib/scraper/types";

const BASE_URL = "https://inhire.com.br";

const SEARCH_KEYWORDS = [
  "RevOps", "Revenue Operations",
  "Sales Ops", "Sales Operations",
  "Marketing Ops", "CRM Admin",
  "GTM Ops",
];

export async function fetchInhireJobs(): Promise<ScrapedJob[]> {
  const seenUrls = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const keyword of SEARCH_KEYWORDS) {
    await delay();
    const html = await fetchHtml(`${BASE_URL}/vagas?search=${encodeURIComponent(keyword)}`);
    if (!html) continue;

    const $ = cheerio.load(html);
    let jobCards = $("a[href*='/vaga/'], a[href*='/job/'], .job-card, .vaga-card");

    if (!jobCards.length) {
      jobCards = $("article a, .card a, [class*='job'] a, [class*='vaga'] a");
    }

    for (const el of jobCards.toArray()) {
      const card = $(el);
      let link = card.is("a") ? card.attr("href") || "" : "";
      if (!link) {
        const aTag = card.find("a");
        link = aTag.attr("href") || "";
      }
      if (!link || seenUrls.has(link)) continue;
      if (!link.startsWith("http")) link = `${BASE_URL}${link}`;

      const titleEl = card.find("h2, h3, h4, [class*='title'], [class*='titulo']");
      const title = titleEl.length ? titleEl.text().trim() : card.text().trim();
      if (!title || !isRelevantJob(title)) continue;

      const companyEl = card.find("[class*='company'], [class*='empresa']");
      const company = companyEl.length ? companyEl.text().trim() : "";

      const locationEl = card.find("[class*='location'], [class*='local']");
      const location = locationEl.length ? locationEl.text().trim() : "";

      // Fetch description from detail page
      await delay();
      const description = await fetchDescription(link);

      seenUrls.add(link);
      jobs.push({
        title,
        company,
        location,
        description,
        url: link,
        source: "inhire",
        externalId: `inhire-${Math.abs(hashCode(link)) % 10000000}`,
        dateFound: today,
      });
    }
  }

  return jobs;
}

async function fetchDescription(url: string): Promise<string> {
  const html = await fetchHtml(url);
  if (!html) return "";

  const $ = cheerio.load(html);
  for (const selector of [
    "[class*='description']", "[class*='descricao']",
    "article", ".job-content", ".vaga-content", "main",
  ]) {
    const el = $(selector);
    if (el.length) return el.text().replace(/\s+/g, " ").trim();
  }
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
