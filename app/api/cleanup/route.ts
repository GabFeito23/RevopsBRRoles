import { NextRequest, NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { isForeignLocation, targetsBrazil } from "@/lib/classifier";
import { isUrlReachable } from "@/lib/scraper/http";

/**
 * POST /api/cleanup
 * Validates existing open jobs:
 *   1. Closes foreign jobs that don't target Brazil/LATAM
 *   2. Reclassifies foreign jobs targeting Brazil as "Remoto"
 *   3. Validates job URLs are still reachable — closes broken ones
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
  let reclassifiedRemoto = 0;
  let closedBrokenUrl = 0;

  for (const job of openJobs) {
    const fullText = `${job.title} ${job.description} ${job.location}`;
    const isForeign = isForeignLocation(fullText);
    const mentionsBrazil = targetsBrazil(fullText);

    // 1. Close foreign jobs that don't mention Brazil/LATAM
    if (isForeign && !mentionsBrazil) {
      await getDb()
        .update(jobs)
        .set({ status: "Fechada", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      closedForeign++;
      continue;
    }

    // 2. Reclassify foreign jobs targeting Brazil as "Remoto"
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

    // 3. Validate URL is still reachable
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

  const summary = {
    totalChecked: openJobs.length,
    closedForeign,
    reclassifiedRemoto,
    closedBrokenUrl,
    remaining: openJobs.length - closedForeign - closedBrokenUrl,
  };

  console.log("Cleanup complete:", summary);
  return NextResponse.json(summary);
}
