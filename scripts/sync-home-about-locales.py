import argparse
from copy import deepcopy
import json
import re
import sys
from pathlib import Path

from lxml import etree, html


ROOT = Path(__file__).resolve().parents[1]
LOCALES = {
    "zh": {"lang": "zh", "target": "zh-CN", "og": "zh_CN"},
    "vi": {"lang": "vi", "target": "vi", "og": "vi_VN"},
    "ja": {"lang": "ja", "target": "ja", "og": "ja_JP"},
    "ko": {"lang": "ko", "target": "ko", "og": "ko_KR"},
    "hi": {"lang": "hi", "target": "hi", "og": "hi_IN"},
    "es": {"lang": "es", "target": "es", "og": "es_ES"},
    "fr": {"lang": "fr", "target": "fr", "og": "fr_FR"},
    "ar": {"lang": "ar", "target": "ar", "og": "ar_SA", "rtl": True},
    "bn": {"lang": "bn", "target": "bn", "og": "bn_BD"},
    "pt": {"lang": "pt", "target": "pt", "og": "pt_PT"},
    "ru": {"lang": "ru", "target": "ru", "og": "ru_RU"},
    "ur": {"lang": "ur", "target": "ur", "og": "ur_PK", "rtl": True},
    "id": {"lang": "id", "target": "id", "og": "id_ID"},
    "de": {"lang": "de", "target": "de", "og": "de_DE"},
    "pcm": {"lang": "pcm-NG", "target": "pcm", "og": "en_NG"},
    "mr": {"lang": "mr", "target": "mr", "og": "mr_IN"},
    "te": {"lang": "te", "target": "te", "og": "te_IN"},
    "tr": {"lang": "tr", "target": "tr", "og": "tr_TR"},
    "ta": {"lang": "ta", "target": "ta", "og": "ta_IN"},
}

ROUTES = ("index.html", "about-us/index.html")
SKIP_ABOUT = {"zh"}
IGNORE_EXACT = {
    "English", "简体中文", "Tiếng Việt", "日本語", "한국어", "हिन्दी", "Español",
    "Français", "العربية", "বাংলা", "Português", "Русский", "اردو", "Bahasa Indonesia",
    "Deutsch", "Naijá", "मराठी", "తెలుగు", "Türkçe", "தமிழ்", "🌐", "LIVE",
}
COPY_PATH = ROOT / "scripts" / "home-about-copy.json"


COPY = json.loads(COPY_PATH.read_text(encoding="utf-8")) if COPY_PATH.exists() else {}


def should_translate(text):
    normalized = " ".join(text.split()).strip()
    if not normalized or normalized in IGNORE_EXACT:
        return False
    if normalized.startswith(("http://", "https://", "/")):
        return False
    if re.fullmatch(r"[\d\s:.,\-–—+/|()%©·⌁↑]+", normalized):
        return False
    return bool(re.search(r"[A-Za-z]", normalized))


def translate(text, locale):
    return COPY.get(locale, {}).get(text, text)


def has_ancestor_class(element, class_name):
    return bool(element.xpath(
        f"ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' {class_name} ')]"
    ))


def configure_locale(document, locale, route):
    config = LOCALES[locale]
    document.set("lang", config["lang"])
    if config.get("rtl"):
        document.set("dir", "rtl")
    else:
        document.attrib.pop("dir", None)

    suffix = "" if route == "index.html" else "about-us/"
    page_url = f"https://starryring.com/{locale}/{suffix}"

    canonical = document.xpath("//link[contains(concat(' ', normalize-space(@rel), ' '), ' canonical ')]")
    if canonical:
        canonical[0].set("href", page_url)

    for meta in document.xpath("//meta"):
        if meta.get("property") == "og:url":
            meta.set("content", page_url)
        elif meta.get("property") == "og:locale":
            meta.set("content", config["og"])

    dropdowns = document.xpath(
        "//*[contains(concat(' ', normalize-space(@class), ' '), ' language-dropdown ')]"
    )
    dropdown = dropdowns[0] if dropdowns else None
    if dropdown is not None:
        for option in dropdown.xpath(
            ".//*[contains(concat(' ', normalize-space(@class), ' '), ' language-option ')]"
        ):
            classes = [name for name in option.get("class", "").split() if name != "selected"]
            if option.get("data-lang") == locale:
                classes.append("selected")
            option.set("class", " ".join(classes))

    for tag in document.xpath("//*[@href]"):
        if has_ancestor_class(tag, "language-dropdown"):
            continue
        href = tag.get("href", "")
        if href.startswith("/en/"):
            tag.set("href", f"/{locale}/{href[len('/en/'):]}")

    for script in document.xpath("//script[@type='application/ld+json']"):
        try:
            data = json.loads(script.text or "")
        except json.JSONDecodeError:
            continue
        nodes = data.get("@graph", []) if isinstance(data, dict) else []
        for node in nodes:
            if node.get("@type") == "CollectionPage":
                node["@id"] = f"{page_url}#webpage"
                node["url"] = page_url
                node["inLanguage"] = config["lang"]
                if node.get("name"):
                    node["name"] = translate(node["name"], locale)
                if node.get("description"):
                    node["description"] = translate(node["description"], locale)
        script.text = json.dumps(data, ensure_ascii=False, indent=2)


def collect_translatables(document):
    entries = []
    text_nodes = document.xpath("//text()[not(ancestor::script) and not(ancestor::style)]")
    for node in text_nodes:
        parent = node.getparent()
        if parent is None or has_ancestor_class(parent, "language-dropdown"):
            continue
        original = str(node)
        normalized = " ".join(original.split()).strip()
        if should_translate(normalized):
            slot = "tail" if node.is_tail else "text"
            entries.append(("text", parent, slot, original, normalized))

    for tag in document.xpath("//*"):
        if has_ancestor_class(tag, "language-dropdown"):
            continue
        attributes = []
        if tag.tag == "meta" and (
            tag.get("name") in {"description", "twitter:title", "twitter:description"}
            or tag.get("property") in {"og:title", "og:description"}
        ):
            attributes.append("content")
        attributes.extend(["aria-label", "title", "placeholder", "alt"])
        for attribute in attributes:
            value = tag.get(attribute)
            if value and should_translate(value):
                entries.append(("attr", tag, attribute, value, value))
    return entries


def translate_document(document, locale):
    entries = collect_translatables(document)
    unique = list(dict.fromkeys(entry[4] for entry in entries))
    translations = {source: translate(source, locale) for source in unique}
    for kind, ref, attribute, original, normalized in entries:
        translated = translations[normalized]
        if kind == "text":
            leading = original[: len(original) - len(original.lstrip())]
            trailing = original[len(original.rstrip()):]
            setattr(ref, attribute, f"{leading}{translated}{trailing}")
        else:
            ref.set(attribute, translated)
    return len(unique)


def class_xpath(class_name):
    return f"//*[contains(concat(' ', normalize-space(@class), ' '), ' {class_name} ')]"


def preserve_node(document, existing, xpath, index=0):
    source_nodes = document.xpath(xpath)
    existing_nodes = existing.xpath(xpath)
    if len(source_nodes) <= index or len(existing_nodes) <= index:
        return
    source = source_nodes[index]
    replacement = deepcopy(existing_nodes[index])
    source.getparent().replace(source, replacement)


def preserve_existing_sections(document, existing, route):
    preserve_node(document, existing, class_xpath("language-switcher"))
    if route == "index.html":
        for class_name in ("scope-panel", "trust-inner", "chain", "footer-copy", "footer-links"):
            preserve_node(document, existing, class_xpath(class_name))
    else:
        preserve_node(document, existing, class_xpath("global-home-button"))
        preserve_node(document, existing, "//section[contains(concat(' ', normalize-space(@class), ' '), ' md:grid-cols-2 ')]")
        story_columns = document.xpath("//section[contains(concat(' ', normalize-space(@class), ' '), ' md:grid-cols-2 ')]/div[1]")
        if story_columns and not story_columns[0].xpath(".//*[contains(concat(' ', normalize-space(@class), ' '), ' brand-expansion ')]"):
            expansion = etree.Element("p")
            expansion.set("class", "brand-expansion text-slate-400 leading-relaxed mt-5")
            expansion.text = (
                "StarryRing grew from that foundation. Today it also brings together practical tools "
                "for media conversion, development, networking, calculations, and everyday browser tasks."
            )
            story_columns[0].append(expansion)
        preserve_node(document, existing, class_xpath("md:grid-cols-3"))
        preserve_node(document, existing, "//footer")


def normalize_output(rendered):
    return re.sub(r"[ \t]+(?=\r?\n)", "", rendered)


def sync_route(locale, route):
    source_path = ROOT / "en" / route
    destination_path = ROOT / locale / route
    parser = html.HTMLParser(encoding="utf-8", remove_comments=False)
    document = html.document_fromstring(source_path.read_bytes(), parser=parser)
    existing = html.document_fromstring(destination_path.read_bytes(), parser=parser)
    preserve_existing_sections(document, existing, route)
    configure_locale(document, locale, route)
    count = translate_document(document, locale)
    rendered = html.tostring(
        document,
        encoding="unicode",
        method="html",
        pretty_print=False,
        doctype="<!DOCTYPE html>",
    )
    destination_path.write_text(normalize_output(rendered), encoding="utf-8", newline="")
    print(f"{locale} {route}: {count} strings", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("locales", nargs="*", choices=sorted(LOCALES))
    parser.add_argument("--include-zh-about", action="store_true")
    args = parser.parse_args()
    selected = args.locales or list(LOCALES)
    for locale in selected:
        for route in ROUTES:
            if route == "about-us/index.html" and locale in SKIP_ABOUT and not args.include_zh_about:
                continue
            sync_route(locale, route)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise
