from pathlib import Path
import re

from bs4 import BeautifulSoup

ROOT = Path(r"F:\WebTool\toolsite")
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"]
LOCALE_LABELS = {
    "es": "Español",
    "fr": "Français",
    "ar": "العربية",
    "bn": "বাংলা",
    "pt": "Português",
    "ru": "Русский",
    "ur": "اردو",
    "id": "Bahasa Indonesia",
    "de": "Deutsch",
    "pcm": "Naijá",
    "mr": "मराठी",
    "te": "తెలుగు",
    "tr": "Türkçe",
    "ta": "தமிழ்",
}
HREFLANG_SELF = {
    "es": "es",
    "fr": "fr",
    "ar": "ar",
    "bn": "bn",
    "pt": "pt",
    "ru": "ru",
    "ur": "ur",
    "id": "id",
    "de": "de",
    "pcm": "pcm-NG",
    "mr": "mr",
    "te": "te",
    "tr": "tr",
    "ta": "ta",
}


def normalize_file(path: Path, locale: str) -> int:
    original = path.read_text(encoding="utf-8", errors="ignore")
    source = re.sub(r'^(?:\s*<!DOCTYPE html>\s*)+', '', original, flags=re.IGNORECASE)
    soup = BeautifulSoup(source, "html.parser")
    route = "/" + "/".join(path.relative_to(ROOT / locale).parts[:-1]) + "/"
    if route == "//":
        route = f"/{locale}/"
    else:
        route = f"/{locale}{route}"
    english_href = route.replace(f"/{locale}/", "/en/", 1)

    dropdown = soup.find(id="languageDropdown")
    if dropdown:
        locale_links = []
        for a in list(dropdown.find_all("a", class_="language-option")):
            href = a.get("href", "")
            data_lang = a.get("data-lang")
            if href == route:
                locale_links.append(a)
                if data_lang != locale:
                    a.decompose()
        selected = dropdown.find("a", attrs={"data-lang": locale})
        if selected:
            selected["href"] = route
            selected.string = LOCALE_LABELS[locale]
            classes = [c for c in selected.get("class", []) if c != "selected"]
            selected["class"] = classes + ["selected"]
        for a in dropdown.find_all("a", class_="language-option"):
            if a is not selected:
                classes = [c for c in a.get("class", []) if c != "selected"]
                a["class"] = classes

    seen = set()
    for link in list(soup.find_all("link", rel="alternate")):
        if not getattr(link, "attrs", None):
            continue
        href = link.get("href", "")
        hreflang = link.get("hreflang", "")
        if href == route or href == f"https://starryring.com{route}":
            if hreflang != "x-default":
                link["hreflang"] = HREFLANG_SELF[locale]
        if hreflang == "x-default":
            link["href"] = f"https://starryring.com{english_href}"
        key = (link.get("href"), link.get("hreflang"))
        if key in seen:
            link.decompose()
        else:
            seen.add(key)

    if not soup.find("link", rel="alternate", hreflang="x-default"):
        canonical = soup.find("link", rel="canonical")
        x_default = soup.new_tag("link")
        x_default["rel"] = "alternate"
        x_default["hreflang"] = "x-default"
        x_default["href"] = f"https://starryring.com{english_href}"
        if canonical:
            canonical.insert_after(x_default)
        elif soup.head:
            soup.head.append(x_default)

    html = "<!DOCTYPE html>\n" + soup.decode(formatter="html").lstrip()
    html = html.replace("HardwareTest Pro - ", "HardwareTest Pro")
    html = re.sub(r'("name"\s*:\s*")HardwareTest Pro - ("\s*[,}])', r'\1HardwareTest Pro\2', html)
    if html != original:
        path.write_text(html, encoding="utf-8")
        return 1
    return 0


def main():
    total = 0
    for locale in LOCALES:
        changed = 0
        for path in (ROOT / locale).rglob("*.html"):
            changed += normalize_file(path, locale)
        print(locale, "changed-files", changed, flush=True)
        total += changed
    print("total-changed-files", total)


if __name__ == "__main__":
    main()
