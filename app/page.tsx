import { desc, eq, and, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { JobBoard } from "@/components/job-board";
import { STALE_DAYS } from "@/lib/config";

export const revalidate = 300; // Revalidate every 5 minutes

export default async function HomePage() {
  let allJobs: (typeof jobs.$inferSelect)[] = [];
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_DAYS);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    allJobs = await getDb()
      .select()
      .from(jobs)
      .where(and(eq(jobs.status, "Aberta"), eq(jobs.workEnvironment, "Remoto"), gte(jobs.dateFound, cutoffStr)))
      .orderBy(desc(jobs.dateFound));
  } catch {
    // DB not connected yet (first deploy before linking Neon)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          RevOpsBR Roles
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Vagas curadas de Revenue Operations no Brasil — atualizado diariamente
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {allJobs.length} vaga{allJobs.length !== 1 ? "s" : ""} aberta
          {allJobs.length !== 1 ? "s" : ""}
        </p>
      </header>

      <JobBoard jobs={allJobs} />
    </main>
  );
}
