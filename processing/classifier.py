import re
import unicodedata

import config


# --- Role Category Patterns ---
ROLE_PATTERNS = [
    ("RevOps", [r"revops", r"revenue\s*operations?", r"opera[cç][oõ]es?\s*de\s*receita"]),
    ("Sales Ops", [r"sales\s*ops", r"sales\s*operations?", r"opera[cç][oõ]es?\s*de\s*vendas?"]),
    ("CS Ops", [r"cs\s*ops", r"customer\s*success\s*ops", r"customer\s*success\s*operations?"]),
    ("GTM Ops", [r"gtm\s*ops", r"go[\s\-]?to[\s\-]?market\s*ops"]),
    ("GTM Engineer", [r"gtm\s*engineer", r"growth\s*engineer"]),
    ("Marketing Ops", [r"marketing\s*ops", r"marketing\s*operations?", r"opera[cç][oõ]es?\s*de\s*marketing", r"\bmops\b"]),
    ("CRM Admin", [r"crm\s*admin", r"administrador.*crm", r"salesforce\s*admin", r"hubspot\s*admin"]),
]

# --- Seniority Patterns (checked in order, first match wins) ---
SENIORITY_PATTERNS = [
    ("Head/Diretor", [r"\bhead\b", r"\bdiretor", r"\bdirector", r"\bvp\b", r"vice[\s\-]?president"]),
    ("Gerente", [r"\bgerente\b", r"\bmanager\b"]),
    ("Coordenador", [r"\bcoordenador", r"\bcoordinator"]),
    ("Especialista", [r"\bespecialista\b", r"\bspecialist\b"]),
    ("Senior", [r"\bs[eê]nior\b", r"\bsr\b\.?"]),
    ("Pleno", [r"\bpleno\b", r"\bmid[\s\-]?level\b"]),
    ("Junior", [r"\bj[uú]nior\b", r"\bjr\b\.?"]),
    ("Estagio", [r"\best[aá]gio\b", r"\bintern\b", r"\bestagi[aá]ri[oa]\b"]),
]

# --- Work Environment Patterns ---
REMOTE_PATTERNS = [r"\bremoto\b", r"\bremote\b", r"\bhome\s*office\b", r"\banywhere\b", r"\b100%\s*remoto\b"]
HYBRID_PATTERNS = [r"\bh[ií]brido\b", r"\bhybrid\b"]
ONSITE_PATTERNS = [r"\bpresencial\b", r"\bon[\s\-]?site\b"]

# --- Tech Stack Keywords ---
TECH_KEYWORDS = [
    "Salesforce", "HubSpot", "Pipedrive", "RD Station", "Clay",
    "Zapier", "Make", "n8n", "SQL", "Tableau", "Power BI", "Looker",
    "Google Sheets", "Excel", "Segment", "Amplitude", "Mixpanel",
    "Outreach", "SalesLoft", "Apollo", "LeanData", "ChiliPiper",
    "Gong", "Chorus", "Clari", "Gainsight", "Totango",
    "Python", "dbt", "BigQuery", "Snowflake", "Metabase",
]

# --- Contract Type Patterns ---
CONTRACT_PATTERNS = [
    ("CLT Flex", [r"clt\s*\+?\s*pj", r"clt\s*flex", r"pj\s*\+?\s*clt"]),
    ("PJ", [r"\bpj\b", r"pessoa\s*jur[ií]dica"]),
    ("CLT", [r"\bclt\b"]),
]

# --- Industry Signal Words ---
INDUSTRY_SIGNALS = {
    "Fintech": ["fintech", "financeiro", "banking", "pagamento", "payment", "crédito", "credito"],
    "SaaS/Tech": ["saas", "software", "plataforma", "tech", "tecnologia"],
    "E-commerce": ["e-commerce", "ecommerce", "loja virtual", "varejo", "retail"],
    "Healthtech": ["healthtech", "saúde", "saude", "health"],
    "Edtech": ["edtech", "educação", "educacao", "education"],
    "Consulting": ["consultoria", "consulting"],
    "Marketplace": ["marketplace"],
    "Banking": ["banco", "bank"],
}


def _normalize(text):
    """Lowercase and strip accents for matching."""
    text = text.lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return text


def _match_patterns(text, patterns):
    """Check if text matches any regex pattern in the list."""
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def classify_role(title, description):
    title_lower = title.lower()
    for role, patterns in ROLE_PATTERNS:
        if _match_patterns(title_lower, patterns):
            return role

    # Fallback: check description
    desc_lower = description.lower()
    best_role = ""
    best_count = 0
    for role, patterns in ROLE_PATTERNS:
        count = sum(1 for p in patterns if re.search(p, desc_lower, re.IGNORECASE))
        if count > best_count:
            best_count = count
            best_role = role

    return best_role if best_count > 0 else "RevOps"


def classify_seniority(title):
    title_lower = title.lower()
    for level, patterns in SENIORITY_PATTERNS:
        if _match_patterns(title_lower, patterns):
            return level
    return "Pleno"  # Default


def classify_work_environment(description, location=""):
    text = f"{description} {location}".lower()

    if _match_patterns(text, REMOTE_PATTERNS):
        return "Remoto"
    if _match_patterns(text, HYBRID_PATTERNS):
        return "Hibrido"
    if _match_patterns(text, ONSITE_PATTERNS):
        return "Presencial"

    return "Presencial"  # Conservative default


def classify_tech_stack(description):
    found = []
    desc_lower = description.lower()
    for tech in TECH_KEYWORDS:
        if tech.lower() in desc_lower:
            found.append(tech)
    return found


def classify_contract_type(description):
    desc_lower = description.lower()
    for contract, patterns in CONTRACT_PATTERNS:
        if _match_patterns(desc_lower, patterns):
            return contract
    return "CLT"  # Default


def classify_state(location):
    if not location:
        return ""

    loc = _normalize(location)

    # Check for two-letter state codes
    states = ["SP", "RJ", "MG", "PR", "SC", "RS", "BA", "DF", "CE", "PE", "GO", "ES", "AM", "PA"]
    for state in states:
        if re.search(rf"\b{state.lower()}\b", loc):
            return state

    # Check city names
    for city, state in config.CITY_STATE_MAP.items():
        if city in loc:
            return state

    if "remoto" in loc or "remote" in loc:
        return "Remoto"

    return "Other"


def classify_industry(company, description=""):
    company_lower = _normalize(company)

    # Check known companies
    for key, industry in config.COMPANY_INDUSTRY.items():
        if key in company_lower:
            return industry

    # Check description signals
    desc_lower = description.lower()
    for industry, signals in INDUSTRY_SIGNALS.items():
        for signal in signals:
            if signal in desc_lower:
                return industry

    return "Other"


def classify_job(job):
    """Classify a job dict in-place, adding all classification fields."""
    title = job.get("title", "")
    description = job.get("description", "")
    location = job.get("location", "")
    company = job.get("company", "")

    job["role_category"] = classify_role(title, description)
    job["seniority"] = classify_seniority(title)
    job["work_environment"] = classify_work_environment(description, location)
    job["tech_stack"] = classify_tech_stack(description)
    job["contract_type"] = classify_contract_type(description)
    job["state"] = classify_state(location)
    job["industry"] = classify_industry(company, description)
