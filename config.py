import os
from dotenv import load_dotenv

load_dotenv()

# --- Required ---
AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY", "")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")
AIRTABLE_TABLE_NAME = "Jobs"

# --- Optional ---
GUPY_API_TOKEN = os.getenv("GUPY_API_TOKEN", "")
GOOGLE_CSE_API_KEY = os.getenv("GOOGLE_CSE_API_KEY", "")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID", "")

# --- Scraping settings ---
REQUEST_TIMEOUT = 15  # seconds
REQUEST_DELAY = 1.0  # seconds between requests (polite crawling)

# --- Deduplication ---
FUZZY_MATCH_THRESHOLD = 85

# --- Staleness ---
STALE_DAYS = 7  # days without being seen before marking as "Fechada"

# --- Company lists for ATS platforms ---

LEVER_COMPANIES = [
    "cloudwalk",
    "vtex",
    "creditas",
    "loggi",
    "loft",
    "merama",
    "olist",
    "gympass",
    "wellhub",
    "jusbrasil",
    "hotmart",
    "involves",
    "pipefy",
    "resultados-digitais",
    "sallve",
    "tractian",
    "unico",
    "zenvia",
]

GREENHOUSE_COMPANIES = [
    "nubank",
    "neon",
    "picpay",
    "xpinc",
    "c6bank",
    "mercadobitcoin",
    "quintoandar",
    "madeiramadeira",
    "dock",
    "cora",
    "cloudhumans",
    "conta-azul",
    "deliverydireto",
    "gusto",
    "ifood",
    "kavak",
    "livelo",
    "pagarme",
    "stone",
    "zup",
]

GUPY_COMPANIES = [
    "ambev",
    "itau",
    "btg",
    "totvs",
    "linx",
    "rdstation",
    "senior",
    "sankhya",
    "omie",
    "bling",
    "conta-azul",
    "pipefy",
    "resultados-digitais",
    "magazineluiza",
    "americanas",
    "locaweb",
    "movidesk",
    "zenvia",
    "blip",
    "take",
]

# --- Industry mapping (company -> industry) ---
COMPANY_INDUSTRY = {
    "nubank": "Fintech",
    "neon": "Fintech",
    "picpay": "Fintech",
    "xpinc": "Fintech",
    "c6bank": "Fintech",
    "stone": "Fintech",
    "pagarme": "Fintech",
    "mercadobitcoin": "Fintech",
    "cora": "Fintech",
    "creditas": "Fintech",
    "dock": "Fintech",
    "vtex": "SaaS/Tech",
    "totvs": "SaaS/Tech",
    "linx": "SaaS/Tech",
    "rdstation": "SaaS/Tech",
    "pipefy": "SaaS/Tech",
    "hotmart": "SaaS/Tech",
    "involves": "SaaS/Tech",
    "tractian": "SaaS/Tech",
    "zenvia": "SaaS/Tech",
    "blip": "SaaS/Tech",
    "movidesk": "SaaS/Tech",
    "locaweb": "SaaS/Tech",
    "ifood": "Marketplace",
    "loggi": "Marketplace",
    "olist": "Marketplace",
    "quintoandar": "Marketplace",
    "madeiramadeira": "E-commerce",
    "magazineluiza": "E-commerce",
    "americanas": "E-commerce",
    "kavak": "E-commerce",
    "ambev": "Other",
    "itau": "Banking",
    "btg": "Banking",
    "gympass": "SaaS/Tech",
    "wellhub": "SaaS/Tech",
    "cloudwalk": "Fintech",
    "loft": "Marketplace",
    "merama": "E-commerce",
}

# --- City to state mapping ---
CITY_STATE_MAP = {
    "sao paulo": "SP", "sp": "SP", "campinas": "SP", "santos": "SP", "sorocaba": "SP",
    "guarulhos": "SP", "osasco": "SP", "barueri": "SP", "alphaville": "SP",
    "rio de janeiro": "RJ", "rj": "RJ", "niteroi": "RJ",
    "belo horizonte": "MG", "bh": "MG", "uberlandia": "MG",
    "curitiba": "PR", "londrina": "PR", "maringa": "PR",
    "florianopolis": "SC", "joinville": "SC", "blumenau": "SC",
    "porto alegre": "RS", "caxias do sul": "RS",
    "salvador": "BA", "recife": "PE", "fortaleza": "CE",
    "brasilia": "DF", "goiania": "GO", "vitoria": "ES",
    "manaus": "AM", "belem": "PA",
}
