import time
from datetime import datetime

import config
from sources.base import BaseSource
from utils.http import get_session
from utils.keywords import is_relevant_job
from utils.logger import setup_logger

logger = setup_logger()

API_BASE = "https://api.lever.co/v0/postings"


class LeverSource(BaseSource):
    name = "lever"

    def __init__(self):
        self.session = get_session()

    def fetch_jobs(self):
        try:
            return self._fetch_all()
        except Exception as e:
            logger.error(f"  Lever failed: {e}")
            return []

    def _fetch_all(self):
        seen_ids = set()
        jobs = []

        for company in config.LEVER_COMPANIES:
            try:
                time.sleep(config.REQUEST_DELAY)
                url = f"{API_BASE}/{company}?mode=json"
                resp = self.session.get(url, timeout=config.REQUEST_TIMEOUT)

                if resp.status_code == 404:
                    continue
                if resp.status_code != 200:
                    logger.warning(f"  Lever returned {resp.status_code} for {company}")
                    continue

                postings = resp.json()
                if not isinstance(postings, list):
                    continue

                for post in postings:
                    post_id = post.get("id", "")
                    if post_id in seen_ids:
                        continue

                    title = post.get("text", "")
                    description = post.get("descriptionPlain", "") or post.get("description", "")

                    # Check location for Brazil
                    categories = post.get("categories", {})
                    location = categories.get("location", "")
                    if not self._is_brazil_location(location):
                        continue

                    if not is_relevant_job(title, description):
                        continue

                    seen_ids.add(post_id)
                    jobs.append({
                        "title": title,
                        "company": company.replace("-", " ").title(),
                        "location": location,
                        "description": description,
                        "url": post.get("hostedUrl", ""),
                        "source": "lever",
                        "external_id": f"lever-{post_id}",
                        "date_found": datetime.now().strftime("%Y-%m-%d"),
                    })

            except Exception as e:
                logger.warning(f"  Lever error for {company}: {e}")
                continue

        return jobs

    def _is_brazil_location(self, location):
        if not location:
            return True  # No location info, include it

        loc_lower = location.lower()
        brazil_indicators = [
            "brazil", "brasil", "br",
            "são paulo", "sao paulo", "rio de janeiro",
            "belo horizonte", "curitiba", "florianópolis", "florianopolis",
            "porto alegre", "recife", "salvador", "brasília", "brasilia",
            "remoto", "remote",
        ]
        for indicator in brazil_indicators:
            if indicator in loc_lower:
                return True

        # Check state abbreviations
        import re
        if re.search(r"\b(SP|RJ|MG|PR|SC|RS|BA|DF|CE|PE|GO|ES)\b", location):
            return True

        return False
