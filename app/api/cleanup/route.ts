import { NextRequest, NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { isForeignLocation, targetsBrazil } from "@/lib/classifier";
import { isRelevantJob } from "@/lib/keywords";
import { isUrlReachable } from "@/lib/scraper/http";

/**
 * POST /api/cleanup
 * Validates existing open jobs:
 *   1. Closes non-Remoto jobs (Presencial, Híbrido, Foreign)
 *   2. Closes jobs that fail keyword relevance (finance ops, logistics, etc.)
 *   3. Closes foreign jobs that don't target Brazil/LATAM
 *   4. Reclassifies foreign jobs targeting Brazil as "Remoto"
 *   5. Closes LinkedIn posts/articles that aren't real job listings
 *   6. Validates job URLs are still reachable — closes broken ones
 * Requires CRON_SECRET authorization.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openJobs = await getDb()
    .select()
    .from(jobs)
    .where(ne(jobs.status, "Fechada"));

  let closedForeign = 0;
  let closedNonRemote = 0;
  let closedIrrelevant = 0;
  let closedLinkedinPosts = 0;
  let reclassifiedRemoto = 0;
  let closedBrokenUrl = 0;

  for (const job of openJobs) {
    const fullText = `${job.title} ${job.description} ${job.location}`;
    const isForeign = isForeignLocation(fullText);
    const mentionsBrazil = targetsBrazil(fullText);

    // 1. Close non-Remoto jobs (only remote jobs allowed)
    if (job.workEnvironment !== "Remoto" && job.workEnvironment !== "Remote") {
      await getDb()
        .update(jobs)
        .set({ status: "Fechada", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      closedNonRemote++;
      continue;
    }

    // 2. Close jobs that no longer pass keyword relevance (finance ops, etc.)
    // Also check each part of pipe-separated titles (e.g. "Analista de Operações | Custódia...")
    const titleParts = job.title.split(/[|–—]/).map((p: string) => p.trim());
    const hasFinanceKeyword = titleParts.some((part: string) => {
      const p = part.toLowerCase();
      return p.includes("custódia") || p.includes("custodia") ||
        p.includes("controladoria") || p.includes("fundos") ||
        p.includes("carteira") || p.includes("carteiras") ||
        p.includes("contábil") || p.includes("contabil") ||
        p.includes("fiscal") || p.includes("tesouraria") ||
        p.includes("faturamento") || p.includes("logística") || p.includes("logistica");
    });
    if (hasFinanceKeyword || !isRelevantJob(job.title, job.description || "")) {
      await getDb()
        .update(jobs)
        .set({ status: "Fechada", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      closedIrrelevant++;
      console.log(`Closed (irrelevant): ${job.title}`);
      continue;
    }

    // 3. Close LinkedIn posts/articles (not real job listings)
    const urlLower = job.url.toLowerCase();
    const titleLower = job.title.toLowerCase();
    if (
      urlLower.includes("linkedin.com/pulse/") ||
      urlLower.includes("linkedin.com/posts/") ||
      urlLower.includes("linkedin.com/feed/") ||
      titleLower.includes("#revops") ||
      titleLower.includes("shift:")
    ) {
      await getDb()
        .update(jobs)
        .set({ status: "Fechada", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      closedLinkedinPosts++;
      console.log(`Closed (LinkedIn post): ${job.title}`);
      continue;
    }

    // 4. Close foreign jobs that don't mention Brazil/LATAM
    if (isForeign && !mentionsBrazil) {
      await getDb()
        .update(jobs)
        .set({ status: "Fechada", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      closedForeign++;
      continue;
    }

    // 5. Reclassify foreign jobs targeting Brazil as "Remoto"
    if (isForeign && mentionsBrazil && job.workEnvironment !== "Remoto") {
      await getDb()
        .update(jobs)
        .set({ workEnvironment: "Remoto", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      reclassifiedRemoto++;
    }

    // Also reclassify "Remote" → "Remoto" (old classification)
    if (job.workEnvironment === "Remote") {
      await getDb()
        .update(jobs)
        .set({ workEnvironment: "Remoto", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      reclassifiedRemoto++;
    }

    // 6. Validate URL is still reachable
    const reachable = await isUrlReachable(job.url);
    if (!reachable) {
      await getDb()
        .update(jobs)
        .set({ status: "Fechada", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      closedBrokenUrl++;
      console.log(`Closed (broken URL): ${job.title} — ${job.url}`);
    }
  }

  const totalClosed = closedForeign + closedNonRemote + closedIrrelevant + closedLinkedinPosts + closedBrokenUrl;
  const summary = {
    totalChecked: openJobs.length,
    closedNonRemote,
    closedIrrelevant,
    closedLinkedinPosts,
    closedForeign,
    reclassifiedRemoto,
    closedBrokenUrl,
    remaining: openJobs.length - totalClosed,
  };

  console.log("Cleanup complete:", summary);
  return NextResponse.json(summary);
}
