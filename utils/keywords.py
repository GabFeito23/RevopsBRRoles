import re

# Tier 1: Title must match at least one of these (case-insensitive)
TITLE_KEYWORDS = [
    "revops",
    "revenue operations",
    "operações de receita",
    "operacoes de receita",
    "sales ops",
    "sales operations",
    "operações de vendas",
    "operacoes de vendas",
    "cs ops",
    "customer success ops",
    "customer success operations",
    "gtm ops",
    "go-to-market ops",
    "go to market ops",
    "gtm engineer",
    "marketing ops",
    "marketing operations",
    "operações de marketing",
    "operacoes de marketing",
    "mops",
    "crm admin",
    "crm administrator",
    "administrador crm",
    "salesforce admin",
    "hubspot admin",
]

# Broader title keywords that require Tier 2 confirmation
BROAD_TITLE_KEYWORDS = [
    "operations analyst",
    "analista de operações",
    "analista de operacoes",
    "business operations",
    "operações comerciais",
    "operacoes comerciais",
]

# Tier 2: Description must contain at least 2 of these to confirm relevance
DESCRIPTION_SIGNALS = [
    "funnel", "funil",
    "pipeline",
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
]

MIN_DESCRIPTION_SIGNALS = 2


def matches_title_keywords(title):
    """Check if a job title matches our target keywords. Returns (matches, is_broad)."""
    title_lower = title.lower()

    for kw in TITLE_KEYWORDS:
        if kw in title_lower:
            return True, False

    for kw in BROAD_TITLE_KEYWORDS:
        if kw in title_lower:
            return True, True

    return False, False


def count_description_signals(text):
    """Count how many description signal keywords appear in the text."""
    text_lower = text.lower()
    count = 0
    for signal in DESCRIPTION_SIGNALS:
        if signal in text_lower:
            count += 1
    return count


def is_relevant_job(title, description=""):
    """Two-tier keyword filter. Returns True if the job is relevant to RevOps."""
    title_match, is_broad = matches_title_keywords(title)

    if not title_match:
        return False

    if not is_broad:
        return True

    # Broad title match requires description confirmation
    return count_description_signals(description) >= MIN_DESCRIPTION_SIGNALS
