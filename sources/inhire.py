import time
from datetime import datetime

from bs4 import BeautifulSoup

import config
from sources.base import BaseSource
from utils.http import get_session
from utils.keywords import TITLE_KEYWORDS, is_relevant_job
from utils.logger import setup_logger

logger = setup_logger()

BASE_URL = "https://inhire.com.br"

SEARCH_KEYWORDS = [
    "RevOps", "Revenue Operations",
    "Sales Ops", "Sales Operations",
    "Marketing Ops", "CRM Admin",
    "GTM Ops",
]


class InhireSource(BaseSource):
    name = "inhire"

    def __init__(self):
        self.session = get_session()
        self.session.headers.update({"Accept": "text/html"})

    def fetch_jobs(self):
        try:
            return self._fetch_all()
        except Exception as e:
            logger.error(f"  Inhire failed: {e}")
            return []

    def _fetch_all(self):
        seen_urls = set()
        jobs = []

        for keyword in SEARCH_KEYWORDS:
            try:
                time.sleep(config.REQUEST_DELAY)
                url = f"{BASE_URL}/vagas"
                params = {"search": keyword}
                resp = self.session.get(url, params=params, timeout=config.REQUEST_TIMEOUT)

                if resp.status_code != 200:
                    logger.warning(f"  Inhire returned {resp.status_code} for '{keyword}'")
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")
                job_cards = soup.select("a[href*='/vaga/'], a[href*='/job/'], .job-card, .vaga-card")

                if not job_cards:
                    # Try broader selectors
                    job_cards = soup.select("article a, .card a, [class*='job'] a, [class*='vaga'] a")

                for card in job_cards:
                    link = card.get("href", "") if card.name == "a" else ""
                    if not link:
                        a_tag = card.select_one("a")
                        link = a_tag.get("href", "") if a_tag else ""

                    if not link or link in seen_urls:
                        continue

                    if not link.startswith("http"):
                        link = f"{BASE_URL}{link}"

                    title_el = card.select_one("h2, h3, h4, [class*='title'], [class*='titulo']")
                    title = title_el.get_text(strip=True) if title_el else card.get_text(strip=True)

                    if not title or not is_relevant_job(title):
                        continue

                    company_el = card.select_one("[class*='company'], [class*='empresa']")
                    company = company_el.get_text(strip=True) if company_el else ""

                    location_el = card.select_one("[class*='location'], [class*='local']")
                    location = location_el.get_text(strip=True) if location_el else ""

                    # Fetch detail page for description
                    description = self._fetch_description(link)

                    seen_urls.add(link)
                    jobs.append({
                        "title": title,
                        "company": company,
                        "location": location,
                        "description": description,
                        "url": link,
                        "source": "inhire",
                        "external_id": f"inhire-{hash(link) % 10000000}",
                        "date_found": datetime.now().strftime("%Y-%m-%d"),
                    })

            except Exception as e:
                logger.warning(f"  Inhire error for '{keyword}': {e}")
                continue

        return jobs

    def _fetch_description(self, url):
        """Fetch the job detail page and extract the description."""
        try:
            time.sleep(config.REQUEST_DELAY)
            resp = self.session.get(url, timeout=config.REQUEST_TIMEOUT)
            if resp.status_code != 200:
                return ""

            soup = BeautifulSoup(resp.text, "html.parser")

            # Try common description containers
            for selector in [
                "[class*='description']", "[class*='descricao']",
                "article", ".job-content", ".vaga-content",
                "main",
            ]:
                desc_el = soup.select_one(selector)
                if desc_el:
                    return desc_el.get_text(separator=" ", strip=True)

            return ""
        except Exception:
            return ""
