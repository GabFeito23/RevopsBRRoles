from datetime import datetime, timedelta

from pyairtable import Api

import config
from utils.logger import setup_logger

logger = setup_logger()


class AirtableClient:
    def __init__(self):
        if not config.AIRTABLE_API_KEY:
            raise SystemExit(
                "\n ERROR: AIRTABLE_API_KEY not set.\n"
                " 1. Go to https://airtable.com/create/tokens\n"
                " 2. Create a Personal Access Token\n"
                " 3. Add it to your .env file as AIRTABLE_API_KEY=pat...\n"
            )
        if not config.AIRTABLE_BASE_ID:
            raise SystemExit(
                "\n ERROR: AIRTABLE_BASE_ID not set.\n"
                " 1. Open your Airtable base\n"
                " 2. The Base ID is in the URL: airtable.com/appXXXXXXX/...\n"
                " 3. Add it to your .env file as AIRTABLE_BASE_ID=app...\n"
            )

        api = Api(config.AIRTABLE_API_KEY)
        self.table = api.table(config.AIRTABLE_BASE_ID, config.AIRTABLE_TABLE_NAME)

    def get_all_open_jobs(self):
        """Fetch all jobs with Status != Fechada."""
        try:
            return self.table.all(formula="{Status}!='Fechada'")
        except Exception as e:
            logger.error(f"Failed to fetch jobs from Airtable: {e}")
            return []

    def create_job(self, job):
        """Create a new job record in Airtable."""
        fields = self._to_airtable_fields(job)
        try:
            self.table.create(fields)
        except Exception as e:
            logger.error(f"Failed to create job '{job.get('title', '?')}': {e}")

    def update_last_seen(self, record_id):
        """Update the last verification date on an existing record."""
        today = datetime.now().strftime("%Y-%m-%d")
        try:
            self.table.update(record_id, {"Ultima Verificacao": today})
        except Exception as e:
            logger.error(f"Failed to update record {record_id}: {e}")

    def mark_stale_jobs(self, seen_external_ids):
        """Mark jobs not seen recently as Fechada. Returns count of closed jobs."""
        cutoff = datetime.now() - timedelta(days=config.STALE_DAYS)
        cutoff_str = cutoff.strftime("%Y-%m-%d")
        closed = 0

        all_open = self.get_all_open_jobs()
        for record in all_open:
            fields = record.get("fields", {})
            ext_id = fields.get("ID Externo", "")
            last_seen = fields.get("Ultima Verificacao", "")

            if ext_id in seen_external_ids:
                continue

            if last_seen and last_seen <= cutoff_str:
                try:
                    self.table.update(record["id"], {"Status": "Fechada"})
                    closed += 1
                except Exception as e:
                    logger.error(f"Failed to close stale record {record['id']}: {e}")

        return closed

    def _to_airtable_fields(self, job):
        today = datetime.now().strftime("%Y-%m-%d")
        tech_stack = job.get("tech_stack", [])
        if isinstance(tech_stack, list):
            tech_stack = ", ".join(tech_stack)

        return {
            "Titulo": job.get("title", ""),
            "Empresa": job.get("company", ""),
            "URL": job.get("url", ""),
            "Fonte": job.get("source", ""),
            "ID Externo": job.get("external_id", ""),
            "Descricao": (job.get("description", "") or "")[:100000],
            "Categoria": job.get("role_category", ""),
            "Senioridade": job.get("seniority", ""),
            "Modelo": job.get("work_environment", ""),
            "Tech Stack": tech_stack,
            "Contrato": job.get("contract_type", ""),
            "Estado": job.get("state", ""),
            "Industria": job.get("industry", ""),
            "Status": "Aberta",
            "Data Encontrada": job.get("date_found", today),
            "Ultima Verificacao": today,
        }
