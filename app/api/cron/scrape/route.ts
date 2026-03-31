import { NextRequest, NextResponse } from "next/server";
import { eq, ne, and, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { classifyJob, isForeignLocation, targetsBrazil } from "@/lib/classifier";
import { cleanText } from "@/lib/validator";
import { deduplicate } from "@/lib/dedup";
import { STALE_DAYS } from "@/lib/config";
import { fetchGupyJobs } from "@/lib/scraper/sources/gupy";
import { fetchLeverJobs } from "@/lib/scraper/sources/lever";
import { fetchGreenhouseJobs } from "@/lib/scraper/sources/greenhouse";
import { fetchJoobleJobs } from "@/lib/scraper/sources/jooble";
import { fetchInhireJobs } from "@/lib/scraper/sources/inhire";
import { fetchGoogleSearchJobs } from "@/lib/scraper/sources/google-search";
import { fetchInfoJobsJobs } from "@/lib/scraper/sources/infojobs";
import { fetchExaJobs } from "@/lib/scraper/sources/exa-search";
import type { ScrapedJob } from "@/lib/scraper/types";

const SOURCES: Record<number, { name: string; fetch: () => Promise<ScrapedJob[]> }> = {
  0: { name: "gupy", fetch: fetchGupyJobs },
  1: { name: "lever", fetch: fetchLeverJobs },
  2: { name: "greenhouse", fetch: fetchGreenhouseJobs },
  3: { name: "jooble", fetch: fetchJoobleJobs },
  4: { name: "gupy_batch2", fetch: fetchInhireJobs },
  5: { name: "google_search", fetch: fetchGoogleSearchJobs },
  6: { name: "infojobs", fetch: fetchInfoJobsJobs },
  7: { name: "exa_search", fetch: fetchExaJobs },
};

const CLEANUP_STEP = 8;
const TOTAL_STEPS = 9;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this header for cron invocations)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow Vercel's built-in cron verification
    const vercelCron = request.headers.get("x-vercel-cron");
    if (!vercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const step = parseInt(request.nextUrl.searchParams.get("step") || "0");

  if (step < 0 || step >= TOTAL_STEPS) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  try {
    // Steps 0-4: scrape a source, classify, store, then chain to next step
    if (step in SOURCES) {
      const source = SOURCES[step];
      console.log(`[Step ${step}] Scraping ${source.name}...`);

      const scraped = await source.fetch();
      console.log(`[Step ${step}] ${source.name}: ${scraped.length} relevant jobs found`);

      if (scraped.length > 0) {
        // Clean descriptions
        for (const job of scraped) {
          job.description = cleanText(job.description);
        }

        // Classify
        const allClassified = scraped.map(classifyJob);

        // Filter: remote jobs from foreign locations must target Brazil/LATAM
        const classified = allClassified.filter((job) => {
          if (job.workEnvironment === "Remote" || job.workEnvironment === "Remoto") {
            const fullText = `${job.title} ${job.description} ${job.location}`;
            if (isForeignLocation(fullText) && !targetsBrazil(fullText)) {
              return false; // Remote foreign job that doesn't mention Brazil/LATAM
            }
          }
          return true;
        });
        const filtered = allClassified.length - classified.length;
        if (filtered > 0) {
          console.log(`[Step ${step}] Filtered out ${filtered} remote jobs not targeting Brazil/LATAM`);
        }

        // Get existing open jobs for dedup
        const existing = await getDb()
          .select()
          .from(jobs)
          .where(ne(jobs.status, "Fechada"));

        const { newJobs, updatedIds } = deduplicate(classified, existing);
        console.log(`[Step ${step}] ${newJobs.length} new, ${updatedIds.length} to refresh`);

        // Insert new jobs
        const today = new Date().toISOString().split("T")[0];
        for (const job of newJobs) {
          await getDb().insert(jobs).values({
            externalId: job.externalId,
            title: job.title,
            company: job.company,
            location: job.location,
            description: (job.description || "").slice(0, 100000),
            url: job.url,
            source: job.source,
            roleCategory: job.roleCategory,
            seniority: job.seniority,
            workEnvironment: job.workEnvironment,
            techStack: job.techStack.join(", "),
            contractType: job.contractType,
            state: job.state,
            industry: job.industry,
            status: "Aberta",
            dateFound: today,
            lastVerified: today,
          }).onConflictDoUpdate({
            target: jobs.externalId,
            set: { lastVerified: today, updatedAt: new Date() },
          });
        }

        // Update last verified for existing matches
        for (const id of updatedIds) {
          await getDb()
            .update(jobs)
            .set({ lastVerified: today, updatedAt: new Date() })
            .where(eq(jobs.id, id));
        }
      }

      // Chain to next step
      const nextStep = step + 1;
      if (nextStep < TOTAL_STEPS) {
        const baseUrl = request.nextUrl.origin;
        const nextUrl = `${baseUrl}/api/cron/scrape?step=${nextStep}`;
        fetch(nextUrl, {
          headers: cronSecret
            ? { Authorization: `Bearer ${cronSecret}` }
            : {},
        }).catch((err) => console.error(`Failed to chain to step ${nextStep}:`, err));
      }

      return NextResponse.json({
        step,
        source: source.name,
        jobsFound: scraped.length,
        status: "ok",
      });
    }

    // Step 8: Mark stale jobs as closed
    if (step === CLEANUP_STEP) {
      console.log("[Step 8] Running staleness cleanup...");

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - STALE_DAYS);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      await getDb()
        .update(jobs)
        .set({ status: "Fechada", updatedAt: new Date() })
        .where(
          and(
            ne(jobs.status, "Fechada"),
            lte(jobs.lastVerified, cutoffStr),
          ),
        );

      console.log(`[Step 8] Staleness cleanup complete`);

      return NextResponse.json({
        step,
        action: "cleanup",
        status: "ok",
      });
    }
  } catch (error) {
    console.error(`[Step ${step}] Error:`, error);
    // Still chain to next step even on error (graceful degradation)
    const nextStep = step + 1;
    if (nextStep < TOTAL_STEPS) {
      const baseUrl = request.nextUrl.origin;
      fetch(`${baseUrl}/api/cron/scrape?step=${nextStep}`, {
        headers: cronSecret
          ? { Authorization: `Bearer ${cronSecret}` }
          : {},
      }).catch(() => {});
    }

    return NextResponse.json(
      { step, error: String(error), status: "error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ error: "Unknown step" }, { status: 400 });
}
