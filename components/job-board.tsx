"use client";

import { useState, useMemo } from "react";
import type { Job } from "@/lib/db/schema";
import { JobCard } from "@/components/job-card";

interface JobBoardProps {
  jobs: Job[];
}

const ROLE_OPTIONS = [
  "Todas", "RevOps", "Sales Ops", "CS Ops", "GTM Ops",
  "GTM Engineer", "Marketing Ops", "CRM Admin",
];

const SENIORITY_OPTIONS = [
  "Todas", "Estagio", "Junior", "Pleno", "Senior",
  "Especialista", "Coordenador", "Gerente", "Head/Diretor",
];

const ENVIRONMENT_OPTIONS = ["Todos", "Remoto", "Hibrido", "Presencial"];

const STATE_OPTIONS = [
  "Todos", "SP", "RJ", "MG", "PR", "SC", "RS", "BA", "DF",
  "CE", "PE", "GO", "ES", "Remoto", "Other",
];

const SOURCE_OPTIONS = [
  "Todas", "gupy", "lever", "greenhouse", "linkedin", "inhire", "career_page",
];

export function JobBoard({ jobs }: JobBoardProps) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("Todas");
  const [seniority, setSeniority] = useState("Todas");
  const [environment, setEnvironment] = useState("Todos");
  const [state, setState] = useState("Todos");
  const [source, setSource] = useState("Todas");

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          (job.techStack || "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (role !== "Todas" && job.roleCategory !== role) return false;
      if (seniority !== "Todas" && job.seniority !== seniority) return false;
      if (environment !== "Todos" && job.workEnvironment !== environment) return false;
      if (state !== "Todos" && job.state !== state) return false;
      if (source !== "Todas" && job.source !== source) return false;
      return true;
    });
  }, [jobs, search, role, seniority, environment, state, source]);

  const activeFilters =
    (role !== "Todas" ? 1 : 0) +
    (seniority !== "Todas" ? 1 : 0) +
    (environment !== "Todos" ? 1 : 0) +
    (state !== "Todos" ? 1 : 0) +
    (source !== "Todas" ? 1 : 0);

  function clearFilters() {
    setSearch("");
    setRole("Todas");
    setSeniority("Todas");
    setEnvironment("Todos");
    setState("Todos");
    setSource("Todas");
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por cargo, empresa ou tech stack..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <FilterSelect label="Categoria" value={role} options={ROLE_OPTIONS} onChange={setRole} />
        <FilterSelect label="Senioridade" value={seniority} options={SENIORITY_OPTIONS} onChange={setSeniority} />
        <FilterSelect label="Modelo" value={environment} options={ENVIRONMENT_OPTIONS} onChange={setEnvironment} />
        <FilterSelect label="Estado" value={state} options={STATE_OPTIONS} onChange={setState} />
        <FilterSelect label="Fonte" value={source} options={SOURCE_OPTIONS} onChange={setSource} />
        {activeFilters > 0 && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Limpar filtros ({activeFilters})
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        {filtered.length} vaga{filtered.length !== 1 ? "s" : ""} encontrada
        {filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">Nenhuma vaga encontrada com esses filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      aria-label={label}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt === options[0] ? `${label}: ${opt}` : opt}
        </option>
      ))}
    </select>
  );
}
