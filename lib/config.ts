// --- Scraping settings ---
export const REQUEST_TIMEOUT = 15_000; // ms
export const REQUEST_DELAY = 1_000; // ms between requests

// --- Deduplication ---
export const FUZZY_MATCH_THRESHOLD = 85;

// --- Staleness ---
export const STALE_DAYS = 15;

// --- Company lists for ATS platforms ---

export const LEVER_COMPANIES = [
  "cloudwalk", "vtex", "creditas", "loggi", "loft", "merama", "olist",
  "gympass", "wellhub", "jusbrasil", "hotmart", "involves", "pipefy",
  "resultados-digitais", "sallve", "tractian", "unico", "zenvia",
];

export const GREENHOUSE_COMPANIES = [
  "nubank", "neon", "picpay", "xpinc", "c6bank", "mercadobitcoin",
  "quintoandar", "madeiramadeira", "dock", "cora", "cloudhumans",
  "conta-azul", "deliverydireto", "gusto", "ifood", "kavak",
  "livelo", "pagarme", "stone", "zup", "appsflyer",
];

// Batch 1: Companies confirmed to have RevOps/SalesOps/CSOps roles via Google
export const GUPY_COMPANIES_BATCH1 = [
  "vempra", "carreirasomie", "blip", "clicksign", "logcomex",
  "gedanken", "protiviti", "mgitech", "sejahype", "softexpert",
  "takeblip", "aegro", "lwsa", "lumis", "cortex",
  "caju", "clinicorp", "mova", "asaas", "leads2b",
  "appmax", "kamino", "grupoboticario", "cimed", "eduzz",
];

// Batch 2: Large Brazilian companies likely to have RevOps/Ops roles
export const GUPY_COMPANIES_BATCH2 = [
  "ambev", "itau", "btg", "totvs", "linx", "rdstation", "senior",
  "sankhya", "bling", "conta-azul", "pipefy", "vivo", "vivodigital",
  "resultados-digitais", "magazineluiza", "americanas", "locaweb",
  "movidesk", "zenvia", "picpay", "oportunidadesale", "voeazul",
  "corporativogrupocasasbahia", "cacaushow", "gruponexxees",
  "brivia", "gaugecarreiras", "nola", "vemprotime", "eccotalent",
  "grpcom", "nasajon", "neogrid", "paytrack", "nstech",
];

// --- Jooble search keywords (used by Jooble API scraper) ---
export const JOOBLE_SEARCH_KEYWORDS = [
  "revops",
  "revenue operations",
  "sales ops",
  "cs ops",
  "marketing ops",
  "CRM admin",
  "operações comerciais",
  "salesforce admin",
];

// --- Google Custom Search queries (broad web discovery) ---
export const GOOGLE_SEARCH_QUERIES = [
  // RevOps + work model (PT-BR)
  "revops remoto brasil vaga",
  "revops híbrido brasil vaga",
  "revops presencial brasil vaga",
  "revenue operations remoto brasil",
  "revenue operations híbrido brasil",
  // Sales Ops / CS Ops
  "sales ops remoto brasil vaga",
  "sales ops híbrido brasil",
  "cs ops remoto brasil vaga",
  "marketing ops remoto brasil vaga",
  // Portuguese terms
  "operações de receita vaga remoto",
  "operações comerciais vaga remoto brasil",
  // Discover new Gupy companies
  'site:gupy.io revops',
  'site:gupy.io "revenue operations"',
  'site:gupy.io "sales ops"',
  'site:gupy.io "operações comerciais"',
  // Other job platforms
  'site:linkedin.com/jobs revops brasil',
  'site:linkedin.com/jobs "revenue operations" brasil',
  'site:vagas.com.br revops',
  'site:infojobs.com.br revops',
  'site:catho.com.br revops',
  // CRM Admin roles
  "salesforce admin remoto brasil vaga",
  "hubspot admin remoto brasil vaga",
  "CRM admin remoto brasil vaga",
  // GTM
  "gtm ops remoto brasil vaga",
  "gtm engineer remoto brasil",
];

// --- InfoJobs search keywords ---
export const INFOJOBS_SEARCH_KEYWORDS = [
  "revops",
  "revenue operations",
  "sales ops",
  "sales operations",
  "marketing ops",
  "CRM admin",
  "salesforce admin",
  "operações comerciais",
  "cs ops",
];

// --- Industry mapping (company -> industry) ---
export const COMPANY_INDUSTRY: Record<string, string> = {
  nubank: "Fintech", neon: "Fintech", picpay: "Fintech", xpinc: "Fintech",
  c6bank: "Fintech", stone: "Fintech", pagarme: "Fintech",
  mercadobitcoin: "Fintech", cora: "Fintech", creditas: "Fintech",
  dock: "Fintech", cloudwalk: "Fintech",
  vtex: "SaaS/Tech", totvs: "SaaS/Tech", linx: "SaaS/Tech",
  rdstation: "SaaS/Tech", pipefy: "SaaS/Tech", hotmart: "SaaS/Tech",
  involves: "SaaS/Tech", tractian: "SaaS/Tech", zenvia: "SaaS/Tech",
  blip: "SaaS/Tech", movidesk: "SaaS/Tech", locaweb: "SaaS/Tech",
  gympass: "SaaS/Tech", wellhub: "SaaS/Tech",
  ifood: "Marketplace", loggi: "Marketplace", olist: "Marketplace",
  quintoandar: "Marketplace", loft: "Marketplace",
  madeiramadeira: "E-commerce", magazineluiza: "E-commerce",
  americanas: "E-commerce", kavak: "E-commerce", merama: "E-commerce",
  ambev: "Other", itau: "Banking", btg: "Banking",
  clicksign: "SaaS/Tech", logcomex: "SaaS/Tech", gedanken: "SaaS/Tech",
  protiviti: "Consulting", mgitech: "SaaS/Tech", softexpert: "SaaS/Tech",
  aegro: "SaaS/Tech", lumis: "SaaS/Tech", cortex: "SaaS/Tech",
  caju: "Fintech", clinicorp: "SaaS/Tech", asaas: "Fintech",
  leads2b: "SaaS/Tech", mova: "SaaS/Tech", voeazul: "Other",
  cacaushow: "Other", brivia: "SaaS/Tech", appmax: "SaaS/Tech",
  kamino: "Fintech", grupoboticario: "E-commerce", cimed: "Other",
  eduzz: "SaaS/Tech", appsflyer: "SaaS/Tech", nasajon: "SaaS/Tech",
  neogrid: "SaaS/Tech", paytrack: "SaaS/Tech", nstech: "SaaS/Tech",
};

// --- Exa AI search queries ---
// Each query is a semantic search with optional domain/text filters.
// Exa uses neural search so queries should describe the ideal page, not just keywords.
export interface ExaQueryConfig {
  query: string;
  numResults?: number;
  includeDomains?: string[];
  includeText?: string[];
}

export const EXA_SEARCH_QUERIES: ExaQueryConfig[] = [
  // --- Brazil-focused RevOps roles ---
  {
    query: "RevOps revenue operations job opening in Brazil, remote or hybrid",
    numResults: 20,
  },
  {
    query: "Sales Ops sales operations analyst job in Brazil 2026",
    numResults: 15,
  },
  {
    query: "vaga RevOps revenue operations Brasil remoto",
    numResults: 15,
  },
  {
    query: "CRM admin Salesforce HubSpot job opening Brazil",
    numResults: 15,
  },
  {
    query: "marketing ops GTM operations engineer job Brazil or LATAM",
    numResults: 15,
  },
  {
    query: "CS ops customer success operations job Brazil remote",
    numResults: 10,
  },
  // --- US/global companies hiring from Brazil ---
  {
    query: "RevOps revenue operations remote job hiring from Brazil or LATAM",
    numResults: 15,
    includeText: ["Brazil"],
  },
  {
    query: "Sales operations analyst remote position open to candidates in Brazil",
    numResults: 10,
    includeText: ["Brazil"],
  },
  // --- Targeted job board searches ---
  {
    query: "RevOps revenue operations sales ops job listing on Gupy Brazil",
    numResults: 10,
    includeDomains: ["gupy.io"],
  },
  {
    query: "revenue operations sales ops job posting LinkedIn Brazil",
    numResults: 10,
    includeDomains: ["linkedin.com"],
  },
];

// --- City to state mapping ---
export const CITY_STATE_MAP: Record<string, string> = {
  "sao paulo": "SP", sp: "SP", campinas: "SP", santos: "SP", sorocaba: "SP",
  guarulhos: "SP", osasco: "SP", barueri: "SP", alphaville: "SP",
  "rio de janeiro": "RJ", rj: "RJ", niteroi: "RJ",
  "belo horizonte": "MG", bh: "MG", uberlandia: "MG",
  curitiba: "PR", londrina: "PR", maringa: "PR",
  florianopolis: "SC", joinville: "SC", blumenau: "SC",
  "porto alegre": "RS", "caxias do sul": "RS",
  salvador: "BA", recife: "PE", fortaleza: "CE",
  brasilia: "DF", goiania: "GO", vitoria: "ES",
  manaus: "AM", belem: "PA",
};
