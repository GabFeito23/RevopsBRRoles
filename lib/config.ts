// --- Scraping settings ---
export const REQUEST_TIMEOUT = 15_000; // ms
export const REQUEST_DELAY = 1_000; // ms between requests

// --- Deduplication ---
export const FUZZY_MATCH_THRESHOLD = 85;

// --- Staleness ---
export const STALE_DAYS = 7;

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
  "livelo", "pagarme", "stone", "zup",
];

// Batch 1: Companies confirmed to have RevOps/SalesOps/CSOps roles via Google
export const GUPY_COMPANIES_BATCH1 = [
  "vempra", "carreirasomie", "blip", "clicksign", "logcomex",
  "gedanken", "protiviti", "mgitech", "sejahype", "softexpert",
  "takeblip", "aegro", "lwsa", "lumis", "cortex",
  "caju", "clinicorp", "mova", "asaas", "leads2b",
];

// Batch 2: Large Brazilian companies likely to have RevOps/Ops roles
export const GUPY_COMPANIES_BATCH2 = [
  "ambev", "itau", "btg", "totvs", "linx", "rdstation", "senior",
  "sankhya", "bling", "conta-azul", "pipefy", "vivo", "vivodigital",
  "resultados-digitais", "magazineluiza", "americanas", "locaweb",
  "movidesk", "zenvia", "picpay", "oportunidadesale", "voeazul",
  "corporativogrupocasasbahia", "cacaushow", "gruponexxees",
  "brivia", "gaugecarreiras", "nola", "vemprotime", "eccotalent",
  "recordtv", "portaldevagas", "grpcom",
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
  cacaushow: "Other", brivia: "SaaS/Tech",
};

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

// --- Career pages (companies not on a major ATS) ---
export const CAREER_PAGES = [
  { company: "RD Station", url: "https://www.rdstation.com/careers/" },
  { company: "Conta Azul", url: "https://contaazul.com/carreiras/" },
  { company: "Omie", url: "https://omie.com.br/carreiras/" },
];
