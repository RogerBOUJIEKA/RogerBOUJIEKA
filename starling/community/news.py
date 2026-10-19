"""Veille IA : lecture des flux RSS 2.0 et Atom."""

import html
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime

ATOM = "{http://www.w3.org/2005/Atom}"
DC_DATE = "{http://purl.org/dc/elements/1.1/}date"
MAX_BYTES = 2_000_000

DEFAULT_FEEDS = [
    ("Hugging Face", "https://huggingface.co/blog/feed.xml"),
    ("OpenAI", "https://openai.com/news/rss.xml"),
    ("Google AI", "https://blog.google/technology/ai/rss/"),
    ("TechCrunch IA", "https://techcrunch.com/category/artificial-intelligence/feed/"),
]


def clean(text, limit=280):
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def _text(element):
    return (element.text or "").strip() if element is not None else ""


def _timestamp(value):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return int(parsedate_to_datetime(value).timestamp())
    except (TypeError, ValueError, IndexError):
        pass
    try:
        return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())
    except ValueError:
        return None


def parse_feed(data):
    root = ET.fromstring(data)
    items = []
    for item in root.iter("item"):
        items.append({
            "title": clean(_text(item.find("title")), 200),
            "url": _text(item.find("link")),
            "summary": clean(_text(item.find("description"))),
            "published_at": _timestamp(_text(item.find("pubDate")) or _text(item.find(DC_DATE))),
        })
    for entry in root.iter(ATOM + "entry"):
        links = entry.findall(ATOM + "link")
        url = next((l.get("href", "") for l in links if l.get("rel", "alternate") == "alternate"),
                   links[0].get("href", "") if links else "")
        summary = entry.find(ATOM + "summary")
        items.append({
            "title": clean(_text(entry.find(ATOM + "title")), 200),
            "url": url.strip(),
            "summary": clean(_text(summary if summary is not None else entry.find(ATOM + "content"))),
            "published_at": _timestamp(_text(entry.find(ATOM + "published"))
                                       or _text(entry.find(ATOM + "updated"))),
        })
    return [i for i in items if i["title"] and i["url"].startswith(("http://", "https://"))]


def fetch_feed(url, timeout=10):
    request = urllib.request.Request(url, headers={"User-Agent": "StarlingBot/1.0 (veille IA)"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("flux trop volumineux")
    return parse_feed(data)


def refresh_all(starling, lock, fetch=fetch_feed):
    """Récupère tous les flux (hors verrou) et enregistre les nouveaux articles."""
    with lock:
        feeds = starling.list_feeds()
    added = 0
    for feed in feeds:
        try:
            items, error = fetch(feed["url"]), None
        except Exception as exc:  # flux injoignable ou invalide : on le signale à l'admin
            items, error = [], str(exc)[:200] or exc.__class__.__name__
        with lock:
            added += starling.store_news(feed["id"], items)
            starling.mark_feed(feed["id"], error)
    return added
