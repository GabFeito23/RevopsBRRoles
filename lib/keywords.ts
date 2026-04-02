// Tier 1: Title must match at least one of these (case-insensitive)
const TITLE_KEYWORDS = [
  "revops", "rev ops", "revenue operations",
  "operações de receita", "operacoes de receita",
  "sales ops", "salesops", "sales operations",
  "cs ops", "csops", "customer success ops", "customer success operations",
  "gtm ops", "go-to-market ops", "go to market ops",
  "gtm engineer",
  "marketing ops", "marketing operations",
  "operações de marketing", "operacoes de marketing",
  "mops",
  "crm admin", "crm administrator", "administrador crm",
  "salesforce admin", "hubspot admin",
  "operações comerciais", "operacoes comerciais",
  "operações estratégicas", "operacoes estrategicas",
  "operações de dados", "operacoes de dados",
];

// Broader title keywords that require Tier 2 confirmation
const BROAD_TITLE_KEYWORDS = [
  "operations analyst",
  "analista de operações", "analista de operacoes",
  "business operations",
];

// Tier 2: Description must contain at least 2 of these to confirm relevance
const DESCRIPTION_SIGNALS = [
  "funnel", "funil", "pipeline",
  "salesforce", "hubspot", "pipedrive", "rd station",
  "crm",
  "lead scoring", "lead routing",
  "lifecycle", "ciclo de vida",
  "handoff", "hand-off",
  "data enrichment", "enriquecimento de dados",
  "integration", "integração", "integracao",
  "zapier", "make", "n8n",
  "automation", "automação", "automacao",
  "dashboard",
  "forecast", "previsão", "previsao",
  "kpi", "okr",
  "quota", "meta de vendas",
  "territory", "território", "territorio",
  "segmentation", "segmentação", "segmentacao",
  "attribution", "atribuição", "atribuicao",
  "revops", "revenue operations",
  "sales ops", "marketing ops", "cs ops",
  "gtm",
];

const MIN_DESCRIPTION_SIGNALS = 2;

function countDescriptionSignals(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const signal of DESCRIPTION_SIGNALS) {
    if (lower.includes(signal)) count++;
  }
  return count;
}

// "operações" alone is too broad (matches logistics, warehouse, etc.)
// Only allow it when paired with qualifying words like comerciais, estratégia, dados
const OPERACOES_QUALIFIERS = [
  "comerciais", "comercial",
  "estratég", "estrateg",  // matches estratégica, estratégicas, estrategia
  "dados",
  "receita",
  "vendas",   // "operações de vendas" is ok when in TITLE_KEYWORDS
  "marketing",
  "revenue",
];

// Title keywords that indicate the job is NOT RevOps (finance, logistics, etc.)
const REJECTION_KEYWORDS = [
  "custódia", "custodia",
  "controladoria",
  "fundos", "fundo de",
  "carteira administrad", "carteiras administrad",
  "back office", "backoffice",
  "tesouraria", "treasury",
  "compliance",
  "auditoria", "audit",
  "contábil", "contabil", "contabilidade",
  "fiscal", "tributár", "tributar",
  "folha de pagamento", "payroll",
  "logística", "logistica", "warehouse", "supply chain",
  "faturamento",
];

function hasGenericOperacoes(titleLower: string): boolean {
  if (!titleLower.includes("operaç") && !titleLower.includes("operac")) return false;
  // Check if any qualifier is present
  for (const q of OPERACOES_QUALIFIERS) {
    if (titleLower.includes(q)) return false;
  }
  // Has "operações" but no qualifier → too generic (e.g. "Auxiliar Operações")
  return true;
}

export function isRelevantJob(title: string, description = ""): boolean {
  const titleLower = title.toLowerCase();

  // Reject jobs from non-RevOps domains (finance, logistics, accounting, etc.)
  for (const rk of REJECTION_KEYWORDS) {
    if (titleLower.includes(rk)) return false;
  }

  // Reject generic "operações" without qualifying words
  if (hasGenericOperacoes(titleLower)) return false;

  // Tier 1: exact title keyword match
  for (const kw of TITLE_KEYWORDS) {
    if (titleLower.includes(kw)) return true;
  }

  // Broad title match requires description confirmation
  for (const kw of BROAD_TITLE_KEYWORDS) {
    if (titleLower.includes(kw)) {
      return countDescriptionSignals(description) >= MIN_DESCRIPTION_SIGNALS;
    }
  }

  return false;
}
