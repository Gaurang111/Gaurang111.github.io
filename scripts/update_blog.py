"""Refresh the Writing section from the Medium RSS feed.

Downloads every post in the feed, saves its first image as a local thumbnail
(assets/img/blog/<slug>.jpg) and writes assets/data/blog.json, which the site
renders. Posts already in blog.json but no longer in the feed (Medium's RSS
only returns the latest 10) are kept, so the archive only grows.

Run:  python scripts/update_blog.py
A GitHub Action (.github/workflows/update-blog.yml) runs it weekly.
"""
from __future__ import annotations

import html
import io
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

FEED = "https://medium.com/feed/@gorangsolanki111"
ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "assets" / "img" / "blog"
OUT = ROOT / "assets" / "data" / "blog.json"
UA = {"User-Agent": "Mozilla/5.0 (portfolio blog sync)"}
NS = {"content": "http://purl.org/rss/1.0/modules/content/",
      "dc": "http://purl.org/dc/elements/1.1/"}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def slugify(link: str) -> str:
    tail = link.rstrip("/").split("/")[-1]
    return re.sub(r"-[0-9a-f]{10,}$", "", tail)[:80]


def plain_text(raw: str) -> str:
    raw = re.sub(r"<figure.*?</figure>", " ", raw, flags=re.S)
    raw = re.sub(r"<h[1-4][^>]*>.*?</h[1-4]>", " ", raw, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    return re.sub(r"\s+", " ", text).strip()


def excerpt(text: str, limit: int = 220) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return cut.rstrip(",.;:") + "…"


def pick_image(body: str) -> str | None:
    """First real content image, preferring wide ones (skips icons and the stat pixel)."""
    srcs = [s for s in re.findall(r'<img[^>]+src="([^"]+)"', body) if "/_/stat" not in s]
    for s in srcs:
        m = re.search(r"/max/(\d+)/", s)
        if m and int(m.group(1)) >= 600:
            return s
    return srcs[0] if srcs else None


def save_thumb(url: str, slug: str) -> str | None:
    dest = IMG_DIR / f"{slug}.jpg"
    if dest.exists():
        return f"assets/img/blog/{dest.name}"
    # Medium serves resized images via /max/<width>/
    url = re.sub(r"/max/\d+/", "/max/1200/", url)
    try:
        data = fetch(url)
        try:
            from PIL import Image  # optional: re-encode smaller
            im = Image.open(io.BytesIO(data)).convert("RGB")
            im.thumbnail((1200, 800))
            im.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
        except ImportError:
            dest.write_bytes(data)
        return f"assets/img/blog/{dest.name}"
    except Exception as exc:  # noqa: BLE001
        print(f"  ! thumbnail failed for {slug}: {exc}", file=sys.stderr)
        return None


def main() -> None:
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    existing = {}
    if OUT.exists():
        existing = {p["url"]: p for p in json.loads(OUT.read_text("utf-8"))["posts"]}

    root = ET.fromstring(fetch(FEED))
    for item in root.iter("item"):
        link = item.findtext("link", "").split("?")[0]
        title = re.sub(r"\s+", " ", html.unescape(item.findtext("title", ""))).strip()
        body = item.findtext("content:encoded", "", NS)
        date = parsedate_to_datetime(item.findtext("pubDate")).date().isoformat()
        tags = [c.text.replace("-", " ") for c in item.findall("category") if c.text]
        slug = slugify(link)
        img = pick_image(body)
        text = plain_text(body)
        words = len(text.split())
        post = {
            "title": title,
            "url": link,
            "date": date,
            "tags": tags[:5],
            "excerpt": excerpt(text),
            "readMinutes": max(1, round(words / 230)),
            "thumbnail": save_thumb(img, slug) if img else None,
        }
        print(f"  {date}  {title}")
        existing[link] = {**existing.get(link, {}), **post}

    posts = sorted(existing.values(), key=lambda p: p["date"], reverse=True)
    OUT.write_text(json.dumps({"source": FEED, "posts": posts}, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(f"Wrote {len(posts)} posts to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
