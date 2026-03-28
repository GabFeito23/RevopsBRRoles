// Tier 1: Title must match at least one of these (case-insensitive)
const TITLE_KEYWORDS = [
  "revops", "revenue operations",
  "operações de receita", "operacoes de receita",
  "sales ops", "sales operations",
  "operações de vendas", "operacoes de vendas",
  "cs ops", "customer success ops", "customer success operations",
  "gtm ops", "go-to-market ops", "go to market ops",
  "gtm engineer",
  "marketing ops", "marketing operations",
  "operações de marketing", "operacoes de marketing",
  "mops",
  "crm admin", "crm administrator", "administrador crm",
  "salesforce admin", "hubspot admin",
];

// Broader title keywords that require Tier 2 confirmation
const BROAD_TITLE_KEYWORDS = [
  "operations analyst",
  "analista de operações", "analista de operacoes",
  "business operations",
  "operações comerciais", "operacoes comerciais",
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

export function isRelevantJob(title: string, description = ""): boolean {
  const titleLower = title.toLowerCase();

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
