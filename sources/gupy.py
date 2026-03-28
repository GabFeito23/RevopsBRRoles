import time
from datetime import datetime

from bs4 import BeautifulSoup

import config
from sources.base import BaseSource
from utils.http import get_session
from utils.keywords import TITLE_KEYWORDS, is_relevant_job
from utils.logger import setup_logger

logger = setup_logger()

API_BASE = "https://portal.api.gupy.io/api/job"
SEARCH_KEYWORDS = [
    "RevOps", "Revenue Operations",
    "Sales Ops", "Sales Operations",
    "CS Ops", "Customer Success Ops",
    "GTM Ops", "GTM Engineer",
    "Marketing Ops", "Marketing Operations",
    "CRM Admin",
    "Operações de Vendas",
    "Operações de Receita",
]


class GupySource(BaseSource):
    name = "gupy"

    def __init__(self):
        self.session = get_session()

    def fetch_jobs(self):
        try:
            jobs = self._fetch_via_api()
            if not jobs:
                logger.info("  Gupy API returned no results, trying HTML fallback...")
                jobs = self._fetch_via_html()
            return jobs
        except Exception as e:
            logger.error(f"  Gupy failed completely: {e}")
            return []

    def _fetch_via_api(self):
        """Fetch jobs from Gupy's public search API."""
        seen_ids = set()
        jobs = []

        for keyword in SEARCH_KEYWORDS:
            try:
                time.sleep(config.REQUEST_DELAY)
                url = f"{API_BASE}?name={keyword}&limit=400"

                headers = {"Accept": "application/json"}
                if config.GUPY_API_TOKEN:
                    headers["Authorization"] = f"Bearer {config.GUPY_API_TOKEN}"

                resp = self.session.get(url, headers=headers, timeout=config.REQUEST_TIMEOUT)
                if resp.status_code != 200:
                    logger.warning(f"  Gupy API returned {resp.status_code} for '{keyword}'")
                    continue

                data = resp.json()
                results = data.get("data", [])

                for item in results:
                    job_id = str(item.get("id", ""))
                    if job_id in seen_ids:
                        continue

                    title = item.get("name", "")
                    description = item.get("description", "")

                    if not is_relevant_job(title, description):
                        continue

                    seen_ids.add(job_id)
                    career_page = item.get("careerPageName", "")
                    job_url = item.get("jobUrl", "") or f"https://{career_page}.gupy.io/job/eyJqb2JJZCI6{job_id}"

                    jobs.append({
                        "title": title,
                        "company": item.get("careerPageName", career_page).replace("-", " ").title(),
                        "location": f"{item.get('city', '')}, {item.get('state', '')}".strip(", "),
                        "description": description,
                        "url": job_url,
                        "source": "gupy",
                        "external_id": f"gupy-{job_id}",
                        "date_found": datetime.now().strftime("%Y-%m-%d"),
                    })

            except Exception as e:
                logger.warning(f"  Gupy API error for keyword '{keyword}': {e}")
                continue

        return jobs

    def _fetch_via_html(self):
        """Fallback: scrape Gupy career pages directly."""
        jobs = []

        for company in config.GUPY_COMPANIES:
            try:
                time.sleep(config.REQUEST_DELAY)
                url = f"https://{company}.gupy.io/"
                resp = self.session.get(url, timeout=config.REQUEST_TIMEOUT,
                                        headers={"Accept": "text/html"})
                if resp.status_code != 200:
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")

                # Gupy renders job cards in the HTML
                job_links = soup.select("a[href*='/job/']")

                for link in job_links:
                    title_el = link.select_one("[class*='title'], h3, h4")
                    title = title_el.get_text(strip=True) if title_el else link.get_text(strip=True)

                    if not title or not is_relevant_job(title):
                        continue

                    job_url = link.get("href", "")
                    if job_url and not job_url.startswith("http"):
                        job_url = f"https://{company}.gupy.io{job_url}"

                    location_el = link.select_one("[class*='location'], [class*='place']")
                    location = location_el.get_text(strip=True) if location_el else ""

                    jobs.append({
                        "title": title,
                        "company": company.replace("-", " ").title(),
                        "location": location,
                        "description": "",
                        "url": job_url,
                        "source": "gupy",
                        "external_id": f"gupy-html-{company}-{hash(title) % 100000}",
                        "date_found": datetime.now().strftime("%Y-%m-%d"),
                    })

            except Exception as e:
                logger.warning(f"  Gupy HTML error for {company}: {e}")
                continue

        return jobs
