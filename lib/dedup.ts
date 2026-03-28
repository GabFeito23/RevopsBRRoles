import * as fuzzball from "fuzzball";
import { FUZZY_MATCH_THRESHOLD } from "@/lib/config";
import type { ClassifiedJob } from "@/lib/classifier";
import type { Job } from "@/lib/db/schema";

function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeKey(company: string, title: string): string {
  return `${normalizeForDedup(company)} | ${normalizeForDedup(title)}`;
}

export interface DedupResult {
  newJobs: ClassifiedJob[];
  updatedIds: number[];
}

export function deduplicate(
  scrapedJobs: ClassifiedJob[],
  existingJobs: Job[],
): DedupResult {
  const existingEntries = existingJobs.map((record) => ({
    id: record.id,
    key: makeKey(record.company, record.title),
    externalId: record.externalId,
  }));

  const newJobs: ClassifiedJob[] = [];
  const updatedIds = new Set<number>();

  for (const job of scrapedJobs) {
    const jobKey = makeKey(job.company, job.title);
    let isDuplicate = false;

    for (const existing of existingEntries) {
      // Exact external ID match
      if (job.externalId && existing.externalId && job.externalId === existing.externalId) {
        updatedIds.add(existing.id);
        isDuplicate = true;
        break;
      }

      // Fuzzy match on company+title
      const score = fuzzball.token_sort_ratio(jobKey, existing.key);
      if (score >= FUZZY_MATCH_THRESHOLD) {
        updatedIds.add(existing.id);
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      newJobs.push(job);
    }
  }

  return { newJobs, updatedIds: Array.from(updatedIds) };
}
