import * as cheerio from "cheerio";
import { CAREER_PAGES } from "@/lib/config";
import { isRelevantJob } from "@/lib/keywords";
import { fetchHtml, delay } from "@/lib/scraper/http";
import type { ScrapedJob } from "@/lib/scraper/types";

export async function fetchCareerPageJobs(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const page of CAREER_PAGES) {
    await delay();
    const html = await fetchHtml(page.url);
    if (!html) continue;

    const $ = cheerio.load(html);

    // Strategy 1: JSON-LD structured data
    const jsonLdJobs = parseJsonLd($, page.company, page.url, today);
    if (jsonLdJobs.length) {
      allJobs.push(...jsonLdJobs);
      continue;
    }

    // Strategy 2: Generic link parsing
    const linkJobs = parseGenericLinks($, page.company, page.url, today);
    allJobs.push(...linkJobs);
  }

  return allJobs;
}

function parseJsonLd(
  $: cheerio.CheerioAPI,
  company: string,
  pageUrl: string,
  today: string,
): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "");
      const postings: Record<string, unknown>[] = [];

      if (Array.isArray(data)) {
        postings.push(...data);
      } else if (data?.["@type"] === "JobPosting") {
        postings.push(data);
      } else if (data?.["@graph"]) {
        postings.push(
          ...data["@graph"].filter(
            (item: Record<string, unknown>) => item["@type"] === "JobPosting",
          ),
        );
      }

      for (const posting of postings) {
        const title = String(posting.title || "");
        const description = String(posting.description || "");
        if (!isRelevantJob(title, description)) continue;

        let location = "";
        const locObj = posting.jobLocation as Record<string, unknown> | undefined;
        if (locObj) {
          const address = locObj.address as Record<string, string> | undefined;
          if (address) {
            location = [address.addressLocality, address.addressRegion]
              .filter(Boolean)
              .join(", ");
          }
        }

        const hiringOrg = posting.hiringOrganization as Record<string, string> | undefined;
        const jobUrl = String(posting.url || pageUrl);

        jobs.push({
          title,
          company: hiringOrg?.name || company,
          location,
          description,
          url: jobUrl,
          source: "career_page",
          externalId: `career-${Math.abs(hashCode(jobUrl)) % 10000000}`,
          dateFound: today,
        });
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  return jobs;
}

function parseGenericLinks(
  $: cheerio.CheerioAPI,
  company: string,
  pageUrl: string,
  today: string,
): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const seen = new Set<string>();

  $("a").each((_, el) => {
    const link = $(el);
    let href = link.attr("href") || "";
    const text = link.text().trim();

    if (!text || !href || seen.has(href)) return;

    const hrefLower = href.toLowerCase();
    const isJobLink = ["/job/", "/vaga/", "/career/", "/position/", "/opening/"].some(
      (p) => hrefLower.includes(p),
    );
    if (!isJobLink) return;
    if (!isRelevantJob(text)) return;

    if (!href.startsWith("http")) {
      href = new URL(href, pageUrl).toString();
    }

    seen.add(href);
    jobs.push({
      title: text,
      company,
      location: "",
      description: "",
      url: href,
      source: "career_page",
      externalId: `career-${Math.abs(hashCode(href)) % 10000000}`,
      dateFound: today,
    });
  });

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
