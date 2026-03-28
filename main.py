"""
RevOpsBR Roles - Brazilian Revenue Operations Job Board Scraper

Scrapes RevOps job listings from multiple sources, classifies them,
and stores them in Airtable. Run daily with: python main.py
"""

from datetime import datetime

from processing.classifier import classify_job
from processing.dedup import deduplicate
from processing.validator import clean_text, validate_url
from sources.career_pages import CareerPagesSource
from sources.greenhouse import GreenhouseSource
from sources.gupy import GupySource
from sources.inhire import InhireSource
from sources.lever import LeverSource
from sources.linkedin import LinkedInSource
from storage.airtable_client import AirtableClient
from utils.logger import setup_logger

logger = setup_logger()

SOURCES = [
    GupySource(),
    LeverSource(),
    GreenhouseSource(),
    LinkedInSource(),
    InhireSource(),
    CareerPagesSource(),
]


def main():
    logger.info("=" * 50)
    logger.info("RevOpsBR Roles - Starting daily scrape")
    logger.info(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    logger.info("=" * 50)

    # Initialize Airtable (will exit with clear message if credentials missing)
    client = AirtableClient()

    # Load existing jobs for deduplication
    existing_jobs = client.get_all_open_jobs()
    logger.info(f"Loaded {len(existing_jobs)} existing open jobs from Airtable")

    # Scrape all sources
    all_scraped = []
    source_stats = {}

    for source in SOURCES:
        logger.info(f"Scraping {source.name}...")
        try:
            jobs = source.fetch_jobs()
            count = len(jobs)
            source_stats[source.name] = count
            logger.info(f"  {source.name}: {count} relevant jobs found")
            all_scraped.extend(jobs)
        except Exception as e:
            source_stats[source.name] = 0
            logger.error(f"  {source.name} FAILED: {e}")

    logger.info(f"Total scraped: {len(all_scraped)} jobs from {len(SOURCES)} sources")

    if not all_scraped:
        logger.info("No jobs found. Checking staleness only.")
        seen_ids = set()
        closed = client.mark_stale_jobs(seen_ids)
        logger.info(f"SUMMARY: 0 new | 0 refreshed | {closed} closed")
        return

    # Clean descriptions
    for job in all_scraped:
        job["description"] = clean_text(job.get("description", ""))

    # Classify all jobs
    for job in all_scraped:
        classify_job(job)

    # Validate URLs (drop invalid ones)
    valid_jobs = []
    invalid_count = 0
    for job in all_scraped:
        if validate_url(job.get("url", "")):
            valid_jobs.append(job)
        else:
            invalid_count += 1
            logger.warning(f"  Dropped invalid URL: {job.get('url', '?')}")

    if invalid_count:
        logger.info(f"Dropped {invalid_count} jobs with invalid URLs")

    # Deduplicate against existing records
    new_jobs, updated_ids = deduplicate(valid_jobs, existing_jobs)
    logger.info(f"After dedup: {len(new_jobs)} new, {len(updated_ids)} to refresh")

    # Insert new jobs
    for job in new_jobs:
        client.create_job(job)

    # Update last seen date on existing matches
    for record_id in updated_ids:
        client.update_last_seen(record_id)

    # Mark stale jobs
    seen_external_ids = {j.get("external_id", "") for j in valid_jobs}
    closed = client.mark_stale_jobs(seen_external_ids)

    # Final summary
    logger.info("=" * 50)
    logger.info("SUMMARY")
    logger.info(f"  Sources: {source_stats}")
    logger.info(f"  {len(new_jobs)} new | {len(updated_ids)} refreshed | {closed} closed")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
