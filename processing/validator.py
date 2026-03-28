from bs4 import BeautifulSoup

from utils.http import get_session
from utils.logger import setup_logger

logger = setup_logger()

_session = get_session()


def validate_url(url):
    """Check if a URL is reachable. Returns True if valid."""
    if not url or not url.startswith("http"):
        return False

    try:
        resp = _session.head(url, timeout=5, allow_redirects=True)
        return resp.status_code < 400
    except Exception:
        # Fallback to GET for servers that don't support HEAD
        try:
            resp = _session.get(url, timeout=5, allow_redirects=True, stream=True)
            resp.close()
            return resp.status_code < 400
        except Exception:
            return False


def clean_text(html_or_text):
    """Strip HTML tags, normalize whitespace, truncate."""
    if not html_or_text:
        return ""

    soup = BeautifulSoup(html_or_text, "html.parser")
    text = soup.get_text(separator=" ")

    # Normalize whitespace
    text = " ".join(text.split())

    # Truncate to 5000 chars for Airtable
    if len(text) > 5000:
        text = text[:5000] + "..."

    return text


def normalize_company_name(name):
    """Normalize company name for comparison."""
    if not name:
        return ""

    name = name.strip()
    # Remove common suffixes
    for suffix in [" S.A.", " SA", " Ltda", " Ltda.", " Inc", " Inc.", " LLC", " Ltd", " Ltd."]:
        if name.endswith(suffix):
            name = name[: -len(suffix)]

    return name.strip()
