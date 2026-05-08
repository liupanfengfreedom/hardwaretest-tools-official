from pathlib import Path
import re

from bs4 import BeautifulSoup

ROOT = Path(r"F:\WebTool\toolsite\pcm")


def cleanup_file(path: Path) -> int:
    original = path.read_text(encoding="utf-8", errors="ignore")
    html = re.sub(r'^(?:\s*<!DOCTYPE html>\s*)+', '', original, flags=re.IGNORECASE)
    soup = BeautifulSoup(html, "html.parser")

    seen = set()
    for link in list(soup.find_all("link", rel="alternate")):
        key = (link.get("href"), link.get("hreflang"))
        if key in seen:
            link.decompose()
        else:
            seen.add(key)

    if soup.title and soup.title.string:
        soup.title.string = soup.title.string.replace("HardwareTest Pro - ", "HardwareTest Pro")

    for meta in soup.find_all("meta"):
        content = meta.get("content")
        if not content:
            continue
        content = content.replace("HardwareTest Pro - ", "HardwareTest Pro")
        content = content.replace("Select language", "Choose language")
        meta["content"] = content

    for tag in soup.find_all(True):
        for attr in ("title", "placeholder", "aria-label"):
            value = tag.get(attr)
            if value:
                value = value.replace("HardwareTest Pro - ", "HardwareTest Pro")
                value = value.replace("Select language", "Choose language")
                tag[attr] = value

    html = "<!DOCTYPE html>\n" + soup.decode(formatter="html").lstrip()
    if html != original:
        path.write_text(html, encoding="utf-8")
        return 1
    return 0


def main():
    changed = 0
    for path in ROOT.rglob("*.html"):
        changed += cleanup_file(path)
    print("changed-files", changed)


if __name__ == "__main__":
    main()
