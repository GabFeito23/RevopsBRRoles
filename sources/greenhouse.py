import re
import time
from datetime import datetime

from bs4 import BeautifulSoup

import config
from sources.base import BaseSource
from utils.http import get_session
from utils.keywords import is_relevant_job
from utils.logger import setup_logger

logger = setup_logger()

API_BASE = "https://boards-api.greenhouse.io/v1/boards"


class GreenhouseSource(BaseSource):
    name = "greenhouse"

    def __init__(self):
        self.session = get_session()

    def fetch_jobs(self):
        try:
            return self._fetch_all()
        except Exception as e:
            logger.error(f"  Greenhouse failed: {e}")
            return []

    def _fetch_all(self):
        seen_ids = set()
        jobs = []

        for board in config.GREENHOUSE_COMPANIES:
            try:
                time.sleep(config.REQUEST_DELAY)
                url = f"{API_BASE}/{board}/jobs?content=true"
                resp = self.session.get(url, timeout=config.REQUEST_TIMEOUT)

                if resp.status_code == 404:
                    continue
                if resp.status_code != 200:
                    logger.warning(f"  Greenhouse returned {resp.status_code} for {board}")
                    continue

                data = resp.json()
                job_list = data.get("jobs", [])

                for item in job_list:
                    job_id = str(item.get("id", ""))
                    if job_id in seen_ids:
                        continue

                    title = item.get("title", "")

                    # Extract description text from HTML content
                    content_html = item.get("content", "")
                    description = ""
                    if content_html:
                        soup = BeautifulSoup(content_html, "html.parser")
                        description = soup.get_text(separator=" ")

                    # Get location
                    location_obj = item.get("location", {})
                    location = location_obj.get("name", "") if isinstance(location_obj, dict) else ""

                    # Filter for Brazil
                    if not self._is_brazil_location(location):
                        continue

                    if not is_relevant_job(title, description):
                        continue

                    seen_ids.add(job_id)
                    jobs.append({
                        "title": title,
                        "company": board.replace("-", " ").title(),
                        "location": location,
                        "description": description,
                        "url": item.get("absolute_url", ""),
                        "source": "greenhouse",
                        "external_id": f"greenhouse-{job_id}",
                        "date_found": datetime.now().strftime("%Y-%m-%d"),
                    })

            except Exception as e:
                logger.warning(f"  Greenhouse error for {board}: {e}")
                continue

        return jobs

    def _is_brazil_location(self, location):
        if not location:
            return True

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

        if re.search(r"\b(SP|RJ|MG|PR|SC|RS|BA|DF|CE|PE|GO|ES)\b", location):
            return True

        return False
