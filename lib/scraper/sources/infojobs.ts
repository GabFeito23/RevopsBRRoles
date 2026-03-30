import * as cheerio from "cheerio";
import { INFOJOBS_SEARCH_KEYWORDS } from "@/lib/config";
import { isRelevantJob } from "@/lib/keywords";
import { fetchHtml, delay } from "@/lib/scraper/http";
import type { ScrapedJob } from "@/lib/scraper/types";

const BASE_URL = "https://www.infojobs.com.br";
const SEARCH_URL = `${BASE_URL}/empregos.aspx`;

/**
 * Scrapes InfoJobs.com.br — one of the largest Brazilian job boards.
 * InfoJobs is server-rendered (ASP.NET), making it scrapeable with Cheerio.
 * Each job card has a div with class "js_rowCard" containing:
 *   - data-id: unique vacancy ID
 *   - data-href: job detail URL
 *   - h2: job title
 *   - Company name in text
 *   - Location in text
 */
export async function fetchInfoJobsJobs(): Promise<ScrapedJob[]> {
  const seenIds = new Set<string>();
  const jobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const keyword of INFOJOBS_SEARCH_KEYWORDS) {
    await delay(1500); // Be respectful — InfoJobs is not an API
    try {
      const url = `${SEARCH_URL}?palabra=${encodeURIComponent(keyword)}`;
      const html = await fetchHtml(url);
      if (!html) {
        console.log(`  InfoJobs "${keyword}": no response`);
        continue;
      }

      const $ = cheerio.load(html);

      // Each job card is a div with class js_rowCard and data-id attribute
      const cards = $("div.js_rowCard[data-id]");

      for (let i = 0; i < cards.length; i++) {
        const card = $(cards[i]);

        const vacancyId = card.attr("data-id") || "";
        if (!vacancyId || seenIds.has(vacancyId)) continue;

        const href = card.attr("data-href") || "";

        // Title is in h2 inside the card
        const title = card.find("h2").first().text().trim();
        if (!title) continue;

        // Company: text inside the div after the rating, look for text-body div
        const companyEl = card.find(".text-body").first();
        let company = "";
        if (companyEl.length) {
          // Company name might be "Empresa confidencial" or an actual company link
          const companyLink = companyEl.find("a");
          if (companyLink.length) {
            company = companyLink.text().trim();
          } else {
            company = companyEl.text().replace(/\s+/g, " ").trim();
            // Clean up "Empresa confidencial" and verification text
            company = company.replace(/Este selo indica.*$/, "").trim();
          }
        }

        // Location: look for text containing state abbreviations like "São Paulo - SP"
        const locationEl = card.find(".mb-8").first();
        let location = "";
        if (locationEl.length) {
          location = locationEl.clone().children("span").remove().end().text().trim();
          // Clean up distance text
          location = location.replace(/,\s*\d+\s*Km.*$/, "").trim();
        }

        // Description snippet: look for paragraph text or description text
        const descEl = card.find("p, .description, .text-medium").last();
        let description = "";
        if (descEl.length) {
          description = descEl.text().replace(/\s+/g, " ").trim();
        }

        // Build full description from all text in the card for better classification
        const fullCardText = card.text().replace(/\s+/g, " ").trim();

        if (!isRelevantJob(title, fullCardText)) continue;

        seenIds.add(vacancyId);
        jobs.push({
          title,
          company: company || "Empresa confidencial",
          location,
          description: description || fullCardText.slice(0, 500),
          url: href ? `${BASE_URL}${href}` : url,
          source: "infojobs",
          externalId: `infojobs-${vacancyId}`,
          dateFound: today,
        });
      }

      console.log(`  InfoJobs "${keyword}": ${cards.length} cards, ${jobs.length} relevant so far`);
    } catch (err) {
      console.error(`  InfoJobs "${keyword}": error`, err);
    }
  }

  return jobs;
}
