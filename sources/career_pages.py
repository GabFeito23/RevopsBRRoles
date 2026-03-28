import json
import time
from datetime import datetime

from bs4 import BeautifulSoup

import config
from sources.base import BaseSource
from utils.http import get_session
from utils.keywords import is_relevant_job
from utils.logger import setup_logger

logger = setup_logger()

# Companies with direct career pages (not on a major ATS)
CAREER_PAGES = [
    {
        "company": "RD Station",
        "url": "https://www.rdstation.com/careers/",
    },
    {
        "company": "Conta Azul",
        "url": "https://contaazul.com/carreiras/",
    },
    {
        "company": "Omie",
        "url": "https://omie.com.br/carreiras/",
    },
]


class CareerPagesSource(BaseSource):
    name = "career_pages"

    def __init__(self):
        self.session = get_session()
        self.session.headers.update({"Accept": "text/html"})

    def fetch_jobs(self):
        try:
            return self._fetch_all()
        except Exception as e:
            logger.error(f"  Career Pages failed: {e}")
            return []

    def _fetch_all(self):
        all_jobs = []

        for page in CAREER_PAGES:
            try:
                time.sleep(config.REQUEST_DELAY)
                company = page["company"]
                url = page["url"]

                resp = self.session.get(url, timeout=config.REQUEST_TIMEOUT)
                if resp.status_code != 200:
                    logger.warning(f"  Career page {company} returned {resp.status_code}")
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")

                # Strategy 1: Look for JSON-LD JobPosting structured data
                jobs = self._parse_jsonld(soup, company, url)
                if jobs:
                    all_jobs.extend(jobs)
                    continue

                # Strategy 2: Look for job links with common patterns
                jobs = self._parse_generic_links(soup, company, url)
                all_jobs.extend(jobs)

            except Exception as e:
                logger.warning(f"  Career page error for {page.get('company', '?')}: {e}")
                continue

        return all_jobs

    def _parse_jsonld(self, soup, company, page_url):
        """Parse schema.org/JobPosting JSON-LD from the page."""
        jobs = []

        for script in soup.select('script[type="application/ld+json"]'):
            try:
                data = json.loads(script.string)

                # Handle single posting or array
                postings = []
                if isinstance(data, list):
                    postings = data
                elif isinstance(data, dict):
                    if data.get("@type") == "JobPosting":
                        postings = [data]
                    elif "@graph" in data:
                        postings = [item for item in data["@graph"] if item.get("@type") == "JobPosting"]

                for posting in postings:
                    title = posting.get("title", "")
                    description = posting.get("description", "")

                    if not is_relevant_job(title, description):
                        continue

                    location_obj = posting.get("jobLocation", {})
                    location = ""
                    if isinstance(location_obj, dict):
                        address = location_obj.get("address", {})
                        if isinstance(address, dict):
                            location = f"{address.get('addressLocality', '')}, {address.get('addressRegion', '')}".strip(", ")

                    job_url = posting.get("url", "") or page_url

                    jobs.append({
                        "title": title,
                        "company": posting.get("hiringOrganization", {}).get("name", company) if isinstance(posting.get("hiringOrganization"), dict) else company,
                        "location": location,
                        "description": description,
                        "url": job_url,
                        "source": "career_page",
                        "external_id": f"career-{hash(job_url) % 10000000}",
                        "date_found": datetime.now().strftime("%Y-%m-%d"),
                    })

            except (json.JSONDecodeError, TypeError):
                continue

        return jobs

    def _parse_generic_links(self, soup, company, page_url):
        """Fallback: find job links with common patterns."""
        jobs = []
        seen = set()

        # Look for links that look like job postings
        for link in soup.select("a"):
            href = link.get("href", "")
            text = link.get_text(strip=True)

            if not text or not href:
                continue
            if href in seen:
                continue

            # Filter for job-related links
            href_lower = href.lower()
            is_job_link = any(
                pattern in href_lower
                for pattern in ["/job/", "/vaga/", "/career/", "/position/", "/opening/"]
            )

            if not is_job_link:
                continue

            if not is_relevant_job(text):
                continue

            if not href.startswith("http"):
                # Build absolute URL
                from urllib.parse import urljoin
                href = urljoin(page_url, href)

            seen.add(href)
            jobs.append({
                "title": text,
                "company": company,
                "location": "",
                "description": "",
                "url": href,
                "source": "career_page",
                "external_id": f"career-{hash(href) % 10000000}",
                "date_found": datetime.now().strftime("%Y-%m-%d"),
            })

        return jobs
