import time
from datetime import datetime

import config
from sources.base import BaseSource
from utils.http import get_session
from utils.keywords import is_relevant_job
from utils.logger import setup_logger

logger = setup_logger()

CSE_API = "https://www.googleapis.com/customsearch/v1"

SEARCH_QUERIES = [
    'site:linkedin.com/jobs "RevOps" OR "Revenue Operations" Brazil',
    'site:linkedin.com/jobs "Sales Ops" OR "Sales Operations" Brazil',
    'site:linkedin.com/jobs "Marketing Ops" OR "Marketing Operations" Brazil',
    'site:linkedin.com/jobs "CRM Admin" OR "Salesforce Admin" Brazil',
    'site:linkedin.com/jobs "GTM Ops" OR "GTM Engineer" Brazil',
]

MAX_PAGES_PER_QUERY = 3  # 10 results each = 30 per query
MAX_QUERIES = 15  # Stay within 100/day free tier


class LinkedInSource(BaseSource):
    name = "linkedin"

    def __init__(self):
        self.session = get_session()

    def fetch_jobs(self):
        if not config.GOOGLE_CSE_API_KEY or not config.GOOGLE_CSE_ID:
            logger.info("  LinkedIn skipped (GOOGLE_CSE_API_KEY/GOOGLE_CSE_ID not set)")
            return []

        try:
            return self._fetch_all()
        except Exception as e:
            logger.error(f"  LinkedIn failed: {e}")
            return []

    def _fetch_all(self):
        seen_urls = set()
        jobs = []
        query_count = 0

        for query in SEARCH_QUERIES:
            if query_count >= MAX_QUERIES:
                break

            for page in range(MAX_PAGES_PER_QUERY):
                if query_count >= MAX_QUERIES:
                    break

                try:
                    time.sleep(config.REQUEST_DELAY)
                    start = page * 10 + 1

                    params = {
                        "key": config.GOOGLE_CSE_API_KEY,
                        "cx": config.GOOGLE_CSE_ID,
                        "q": query,
                        "num": 10,
                        "start": start,
                    }

                    resp = self.session.get(CSE_API, params=params, timeout=config.REQUEST_TIMEOUT)
                    query_count += 1

                    if resp.status_code == 429:
                        logger.warning("  LinkedIn/CSE rate limit hit, stopping")
                        return jobs
                    if resp.status_code != 200:
                        logger.warning(f"  LinkedIn/CSE returned {resp.status_code}")
                        continue

                    data = resp.json()
                    items = data.get("items", [])

                    if not items:
                        break  # No more results

                    for item in items:
                        url = item.get("link", "")
                        if not url or url in seen_urls:
                            continue
                        if "linkedin.com/jobs" not in url:
                            continue

                        title = item.get("title", "").replace(" | LinkedIn", "").strip()
                        snippet = item.get("snippet", "")

                        # Extract company from title pattern: "Title at Company"
                        company = ""
                        if " at " in title:
                            parts = title.split(" at ")
                            title = parts[0].strip()
                            company = parts[-1].strip()
                        elif " - " in title:
                            parts = title.split(" - ")
                            title = parts[0].strip()
                            company = parts[1].strip() if len(parts) > 1 else ""

                        if not is_relevant_job(title, snippet):
                            continue

                        seen_urls.add(url)
                        jobs.append({
                            "title": title,
                            "company": company,
                            "location": "Brazil",
                            "description": snippet,
                            "url": url,
                            "source": "linkedin",
                            "external_id": f"linkedin-{hash(url) % 10000000}",
                            "date_found": datetime.now().strftime("%Y-%m-%d"),
                        })

                except Exception as e:
                    logger.warning(f"  LinkedIn/CSE error: {e}")
                    continue

        return jobs
