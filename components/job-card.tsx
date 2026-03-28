import type { Job } from "@/lib/db/schema";

interface JobCardProps {
  job: Job;
}

const ENVIRONMENT_COLORS: Record<string, string> = {
  Remoto: "bg-green-100 text-green-800",
  Hibrido: "bg-yellow-100 text-yellow-800",
  Presencial: "bg-blue-100 text-blue-800",
};

const SOURCE_LABELS: Record<string, string> = {
  gupy: "Gupy",
  lever: "Lever",
  greenhouse: "Greenhouse",
  linkedin: "LinkedIn",
  inhire: "Inhire",
  career_page: "Career Page",
};

export function JobCard({ job }: JobCardProps) {
  const techStack = job.techStack
    ? job.techStack.split(", ").filter(Boolean)
    : [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Title + Link */}
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-blue-700 hover:text-blue-900 hover:underline"
          >
            {job.title}
          </a>

          {/* Company + Location */}
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium">{job.company}</span>
            {job.location && (
              <span className="text-gray-400"> &middot; {job.location}</span>
            )}
          </p>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="bg-purple-100 text-purple-800">
              {job.roleCategory}
            </Badge>
            <Badge className="bg-gray-100 text-gray-800">
              {job.seniority}
            </Badge>
            <Badge className={ENVIRONMENT_COLORS[job.workEnvironment] || "bg-gray-100 text-gray-800"}>
              {job.workEnvironment}
            </Badge>
            {job.contractType && job.contractType !== "CLT" && (
              <Badge className="bg-orange-100 text-orange-800">
                {job.contractType}
              </Badge>
            )}
            {job.state && job.state !== "Other" && (
              <Badge className="bg-indigo-100 text-indigo-800">
                {job.state}
              </Badge>
            )}
          </div>

          {/* Tech Stack */}
          {techStack.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right side: source + date */}
        <div className="shrink-0 text-right text-xs text-gray-400">
          <p>{SOURCE_LABELS[job.source] || job.source}</p>
          <p className="mt-1">{job.dateFound}</p>
        </div>
      </div>
    </div>
  );
}

function Badge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
