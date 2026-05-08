from pathlib import Path
import re

from bs4 import BeautifulSoup

ROOT = Path(r"F:\WebTool\toolsite")
LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"]
LOCALE_TAGS = {
    "es": ("es", "es_ES", "es"),
    "fr": ("fr", "fr_FR", "fr"),
    "ar": ("ar", "ar_AR", "ar"),
    "bn": ("bn", "bn_BD", "bn"),
    "pt": ("pt", "pt_PT", "pt"),
    "ru": ("ru", "ru_RU", "ru"),
    "ur": ("ur", "ur_PK", "ur"),
    "id": ("id", "id_ID", "id"),
    "de": ("de", "de_DE", "de"),
    "pcm": ("pcm", "pcm_NG", "pcm-NG"),
    "mr": ("mr", "mr_IN", "mr"),
    "te": ("te", "te_IN", "te"),
    "tr": ("tr", "tr_TR", "tr"),
    "ta": ("ta", "ta_IN", "ta"),
}


def process_file(path: Path, locale: str) -> int:
    original = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(original, "html.parser")
    lang_tag, og_locale, hreflang_self = LOCALE_TAGS[locale]

    if soup.html:
        soup.html["lang"] = lang_tag

    for meta in soup.find_all("meta"):
        if meta.get("property") == "og:locale":
            meta["content"] = og_locale

    for link in soup.find_all("link", rel="alternate"):
        href = link.get("href", "")
        if f"https://starryring.com/{locale}/" in href or href.startswith(f"/{locale}/"):
            link["hreflang"] = hreflang_self

    html = str(soup)
    html = re.sub(r'("inLanguage"\s*:\s*")[^"]+(")', rf'\1{lang_tag}\2', html)

    if locale == "pcm":
        html = html.replace(">Toolbox<", ">Tool box<")
        html = html.replace('"Toolbox"', '"Tool box"')
        html = html.replace("> toolbox<", "> tool box<")

    if locale == "fr":
        html = html.replace("Mouse Test du double-clic", "Test du double clic de la souris")
    if locale == "pt":
        html = html.replace("Mouse Teste de duplo clique", "Teste de duplo clique do mouse")

    if html != original:
        path.write_text(html, encoding="utf-8")
        return 1
    return 0


def main():
    total = 0
    for locale in LOCALES:
        changed = 0
        for path in (ROOT / locale).rglob("*.html"):
            changed += process_file(path, locale)
        print(locale, "changed-files", changed, flush=True)
        total += changed
    print("total-changed-files", total)


if __name__ == "__main__":
    main()
