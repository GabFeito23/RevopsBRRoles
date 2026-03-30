import { COMPANY_INDUSTRY, CITY_STATE_MAP } from "@/lib/config";
import type { ScrapedJob } from "@/lib/scraper/types";

// --- Role Category Patterns ---
const ROLE_PATTERNS: [string, RegExp[]][] = [
  ["RevOps", [/revops/i, /revenue\s*operations?/i, /opera[cç][oõ]es?\s*de\s*receita/i]],
  ["Sales Ops", [/sales\s*ops/i, /sales\s*operations?/i, /opera[cç][oõ]es?\s*de\s*vendas?/i]],
  ["CS Ops", [/cs\s*ops/i, /customer\s*success\s*ops/i, /customer\s*success\s*operations?/i]],
  ["GTM Ops", [/gtm\s*ops/i, /go[\s-]?to[\s-]?market\s*ops/i]],
  ["GTM Engineer", [/gtm\s*engineer/i, /growth\s*engineer/i]],
  ["Marketing Ops", [/marketing\s*ops/i, /marketing\s*operations?/i, /opera[cç][oõ]es?\s*de\s*marketing/i, /\bmops\b/i]],
  ["CRM Admin", [/crm\s*admin/i, /administrador.*crm/i, /salesforce\s*admin/i, /hubspot\s*admin/i]],
];

// --- Seniority Patterns (first match wins) ---
const SENIORITY_PATTERNS: [string, RegExp[]][] = [
  ["Head/Diretor", [/\bhead\b/i, /\bdiretor/i, /\bdirector/i, /\bvp\b/i, /vice[\s-]?president/i]],
  ["Gerente", [/\bgerente\b/i, /\bmanager\b/i]],
  ["Coordenador", [/\bcoordenador/i, /\bcoordinator/i]],
  ["Especialista", [/\bespecialista\b/i, /\bspecialist\b/i]],
  ["Senior", [/\bs[eê]nior\b/i, /\bsr\b\.?/i]],
  ["Pleno", [/\bpleno\b/i, /\bmid[\s-]?level\b/i]],
  ["Junior", [/\bj[uú]nior\b/i, /\bjr\b\.?/i]],
  ["Estagio", [/\best[aá]gio\b/i, /\bintern\b/i, /\bestagi[aá]ri[oa]\b/i]],
];

// --- Work Environment Patterns ---
const REMOTE_PATTERNS = [/\bremoto\b/i, /\bremote\b/i, /\bhome\s*office\b/i, /\banywhere\b/i, /\b100%\s*remoto\b/i];
const HYBRID_PATTERNS = [/\bh[ií]brido\b/i, /\bhybrid\b/i];
const ONSITE_PATTERNS = [/\bpresencial\b/i, /\bon[\s-]?site\b/i];

// --- Tech Stack Keywords ---
const TECH_KEYWORDS = [
  "Salesforce", "HubSpot", "Pipedrive", "RD Station", "Clay",
  "Zapier", "Make", "n8n", "SQL", "Tableau", "Power BI", "Looker",
  "Google Sheets", "Excel", "Segment", "Amplitude", "Mixpanel",
  "Outreach", "SalesLoft", "Apollo", "LeanData", "ChiliPiper",
  "Gong", "Chorus", "Clari", "Gainsight", "Totango",
  "Python", "dbt", "BigQuery", "Snowflake", "Metabase",
];

// --- Contract Type Patterns ---
const CONTRACT_PATTERNS: [string, RegExp[]][] = [
  ["CLT Flex", [/clt\s*\+?\s*pj/i, /clt\s*flex/i, /pj\s*\+?\s*clt/i]],
  ["PJ", [/\bpj\b/i, /pessoa\s*jur[ií]dica/i]],
  ["CLT", [/\bclt\b/i]],
];

// --- Industry Signal Words ---
const INDUSTRY_SIGNALS: Record<string, string[]> = {
  Fintech: ["fintech", "financeiro", "banking", "pagamento", "payment", "crédito", "credito"],
  "SaaS/Tech": ["saas", "software", "plataforma", "tech", "tecnologia"],
  "E-commerce": ["e-commerce", "ecommerce", "loja virtual", "varejo", "retail"],
  Healthtech: ["healthtech", "saúde", "saude", "health"],
  Edtech: ["edtech", "educação", "educacao", "education"],
  Consulting: ["consultoria", "consulting"],
  Marketplace: ["marketplace"],
  Banking: ["banco", "bank"],
};

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function classifyRole(title: string, description: string): string {
  const titleLower = title.toLowerCase();
  for (const [role, patterns] of ROLE_PATTERNS) {
    if (matchesAny(titleLower, patterns)) return role;
  }
  const descLower = description.toLowerCase();
  let bestRole = "";
  let bestCount = 0;
  for (const [role, patterns] of ROLE_PATTERNS) {
    const count = patterns.filter((p) => p.test(descLower)).length;
    if (count > bestCount) {
      bestCount = count;
      bestRole = role;
    }
  }
  return bestRole || "RevOps";
}

function classifySeniority(title: string): string {
  const titleLower = title.toLowerCase();
  for (const [level, patterns] of SENIORITY_PATTERNS) {
    if (matchesAny(titleLower, patterns)) return level;
  }
  return "Pleno";
}

// Non-Brazil locations that indicate the job is based abroad.
// If a job is located outside Brazil, it MUST be remote for BR/LATAM candidates.
const FOREIGN_LOCATION_PATTERNS = [
  // US states & cities
  /\b(?:new york|san francisco|los angeles|chicago|austin|boston|seattle|denver|miami|atlanta|dallas|houston|portland|phoenix|charlotte|nashville|minneapolis|washington\s*d\.?c\.?)\b/i,
  /\b(?:NY|CA|TX|FL|WA|IL|MA|CO|GA|NC|PA|OH|VA|AZ|OR|NV|MN|TN|DC)\b/,
  // Countries / regions
  /\bunited states\b/i, /\busa\b/i, /\bu\.s\.a?\b/i,
  /\bcanada\b/i, /\buk\b/i, /\bunited kingdom\b/i, /\bgermany\b/i,
  /\beurope\b/i, /\beuropa\b/i,
  /\blatam\b/i, /\blatin\s*america\b/i, /\bamérica\s*latina\b/i,
  /\bglobal\b/i, /\bworldwide\b/i,
];

// Signals that a job targets Brazil/LATAM candidates specifically
const BRAZIL_TARGET_PATTERNS = [
  /\bbrasil\b/i, /\bbrazil\b/i, /\bbr\b/i,
  /\blatam\b/i, /\blatin\s*america\b/i, /\bamérica\s*latina\b/i,
];

function isForeignLocation(text: string): boolean {
  return FOREIGN_LOCATION_PATTERNS.some((p) => p.test(text));
}

function targetsBrazil(text: string): boolean {
  return BRAZIL_TARGET_PATTERNS.some((p) => p.test(text));
}

function classifyWorkEnvironment(description: string, location: string): string {
  const text = `${description} ${location}`.toLowerCase();
  const fullText = `${description} ${location}`;

  // If the job is located outside Brazil but targets BR/LATAM,
  // it must be remote — you can't be presencial in the US from Brazil.
  if (isForeignLocation(fullText) && targetsBrazil(fullText)) {
    return "Remoto";
  }

  if (matchesAny(text, REMOTE_PATTERNS)) return "Remoto";
  if (matchesAny(text, HYBRID_PATTERNS)) return "Hibrido";
  if (matchesAny(text, ONSITE_PATTERNS)) return "Presencial";

  // If location is clearly foreign (no Brazil mention), default to Remoto
  if (isForeignLocation(fullText)) return "Remoto";

  return "Presencial";
}

function classifyTechStack(description: string): string[] {
  const descLower = description.toLowerCase();
  return TECH_KEYWORDS.filter((tech) => descLower.includes(tech.toLowerCase()));
}

function classifyContractType(description: string): string {
  const descLower = description.toLowerCase();
  for (const [contract, patterns] of CONTRACT_PATTERNS) {
    if (matchesAny(descLower, patterns)) return contract;
  }
  return "CLT";
}

function classifyState(location: string): string {
  if (!location) return "";
  const loc = normalize(location);

  const states = ["SP", "RJ", "MG", "PR", "SC", "RS", "BA", "DF", "CE", "PE", "GO", "ES", "AM", "PA"];
  for (const state of states) {
    if (new RegExp(`\\b${state.toLowerCase()}\\b`).test(loc)) return state;
  }
  for (const [city, state] of Object.entries(CITY_STATE_MAP)) {
    if (loc.includes(city)) return state;
  }
  if (loc.includes("remoto") || loc.includes("remote")) return "Remoto";
  return "Other";
}

function classifyIndustry(company: string, description: string): string {
  const companyLower = normalize(company);
  for (const [key, industry] of Object.entries(COMPANY_INDUSTRY)) {
    if (companyLower.includes(key)) return industry;
  }
  const descLower = description.toLowerCase();
  for (const [industry, signals] of Object.entries(INDUSTRY_SIGNALS)) {
    for (const signal of signals) {
      if (descLower.includes(signal)) return industry;
    }
  }
  return "Other";
}

export interface ClassifiedJob extends ScrapedJob {
  roleCategory: string;
  seniority: string;
  workEnvironment: string;
  techStack: string[];
  contractType: string;
  state: string;
  industry: string;
}

export function classifyJob(job: ScrapedJob): ClassifiedJob {
  return {
    ...job,
    roleCategory: classifyRole(job.title, job.description),
    seniority: classifySeniority(job.title),
    workEnvironment: classifyWorkEnvironment(job.description, job.location),
    techStack: classifyTechStack(job.description),
    contractType: classifyContractType(job.description),
    state: classifyState(job.location),
    industry: classifyIndustry(job.company, job.description),
  };
}
