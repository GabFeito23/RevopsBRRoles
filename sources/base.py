class BaseSource:
    """
    Base class for all job sources.

    Each source must implement fetch_jobs() which returns a list of job dicts:
    {
        "title": str,
        "company": str,
        "location": str,
        "description": str,
        "url": str,
        "source": str,
        "external_id": str,
        "date_found": str (ISO date),
    }

    fetch_jobs() must never raise — it should catch exceptions and return [].
    """

    name = "base"

    def fetch_jobs(self):
        raise NotImplementedError
