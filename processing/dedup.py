import unicodedata

from rapidfuzz import fuzz

import config
from utils.logger import setup_logger

logger = setup_logger()


def _normalize_for_dedup(text):
    """Lowercase, strip accents and punctuation for fuzzy matching."""
    text = text.lower().strip()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = "".join(c for c in text if c.isalnum() or c.isspace())
    text = " ".join(text.split())
    return text


def _make_key(company, title):
    return f"{_normalize_for_dedup(company)} | {_normalize_for_dedup(title)}"


def deduplicate(new_jobs, existing_records):
    """
    Compare new scraped jobs against existing Airtable records.

    Returns:
        (new_to_insert, record_ids_to_update)
        - new_to_insert: list of job dicts that are genuinely new
        - record_ids_to_update: list of Airtable record IDs to refresh last_seen
    """
    # Build keys for existing records
    existing_keys = []
    for record in existing_records:
        fields = record.get("fields", {})
        key = _make_key(fields.get("Empresa", ""), fields.get("Titulo", ""))
        existing_keys.append((record["id"], key, fields.get("ID Externo", "")))

    new_to_insert = []
    record_ids_to_update = set()

    for job in new_jobs:
        job_key = _make_key(job.get("company", ""), job.get("title", ""))
        job_ext_id = job.get("external_id", "")

        is_duplicate = False

        for record_id, existing_key, existing_ext_id in existing_keys:
            # Exact external ID match
            if job_ext_id and existing_ext_id and job_ext_id == existing_ext_id:
                record_ids_to_update.add(record_id)
                is_duplicate = True
                break

            # Fuzzy match on company+title
            score = fuzz.token_sort_ratio(job_key, existing_key)
            if score >= config.FUZZY_MATCH_THRESHOLD:
                record_ids_to_update.add(record_id)
                is_duplicate = True
                break

        if not is_duplicate:
            new_to_insert.append(job)

    return new_to_insert, list(record_ids_to_update)
