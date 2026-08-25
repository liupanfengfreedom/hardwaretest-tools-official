#!/usr/bin/env python3
"""Build localized secure-key-generator pages, index cards, and sitemap entries."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = Path(__file__).with_name("key-generator-locales.json")
ROUTE = "utility-tools/math/key-generator"
LOCALE_ORDER = [
    "en", "zh", "vi", "ja", "ko", "hi", "es", "fr", "ar", "bn",
    "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta",
]
HREFLANG = {
    "en": "en", "zh": "zh", "vi": "vi", "ja": "ja", "ko": "ko",
    "hi": "hi", "es": "es", "fr": "fr", "ar": "ar", "bn": "bn",
    "pt": "pt", "ru": "ru", "ur": "ur", "id": "id", "de": "de",
    "pcm": "pcm-NG", "mr": "mr", "te": "te", "tr": "tr", "ta": "ta",
}
RUNTIME_KEYS = [
    "unavailable", "input_length", "integer_required", "length_range",
    "input_count", "count_range", "signing_length", "bits",
    "strength_low", "strength_mid", "strength_high", "strength_vhigh",
    "ready", "copy", "copied", "copied_all",
]


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def url(locale: str) -> str:
    return f"https://starryring.com/{locale}/{ROUTE}/"


def path_url(locale: str) -> str:
    return f"/{locale}/{ROUTE}/"


def alternates() -> str:
    links = [
        f'    <link rel="alternate" hreflang="{HREFLANG[locale]}" href="{url(locale)}">'
        for locale in LOCALE_ORDER
    ]
    links.append(f'    <link rel="alternate" hreflang="x-default" href="{url("en")}">')
    return "\n".join(links)


def language_options(data: dict[str, dict], current: str) -> str:
    options = []
    for locale in LOCALE_ORDER:
        selected = " selected" if locale == current else ""
        options.append(
            f'        <a class="language-option{selected}" href="{path_url(locale)}" '
            f'data-lang="{locale}">{esc(data[locale]["language_name"])}</a>'
        )
    return "\n".join(options)


def json_ld(locale: str, item: dict) -> str:
    page = item["page"]
    ui = item["ui"]
    payload = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                "@id": f"{url(locale)}#app",
                "name": page["h1"],
                "description": page["description"],
                "url": url(locale),
                "inLanguage": item["html_lang"],
                "applicationCategory": "SecurityApplication",
                "operatingSystem": "All",
                "browserRequirements": "JavaScript and Web Crypto API",
                "isAccessibleForFree": True,
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD",
                },
                "featureList": [
                    "Cryptographically secure random bytes",
                    "HEX encoding",
                    "Base64 encoding",
                    "Base64URL encoding",
                    "Base32 encoding",
                    "Batch generation",
                    "TXT and binary downloads",
                ],
                "dateModified": "2026-08-26",
            },
            {
                "@type": "FAQPage",
                "@id": f"{url(locale)}#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": question,
                        "acceptedAnswer": {"@type": "Answer", "text": answer},
                    }
                    for question, answer in item["faqs"]
                ],
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{url(locale)}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": ui["home"],
                        "item": f"https://starryring.com/{locale}/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": ui["nav_tools"],
                        "item": f"https://starryring.com/{locale}/utility-tools/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": page["h1"],
                        "item": url(locale),
                    },
                ],
            },
        ],
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def render_formats(item: dict) -> str:
    ui = item["ui"]
    cards = []
    for fmt in item["formats"]:
        cards.append(
            f'''            <article class="doc-card" data-fmt="{esc(fmt["id"])}">
                <div class="doc-card-head"><span class="doc-card-title">{esc(fmt["title"])}</span><span class="doc-card-tag">{esc(fmt["tag"])}</span></div>
                <div class="doc-charset">{esc(fmt["charset"])}</div>
                <p class="doc-desc">{esc(fmt["description"])}</p>
                <p class="doc-use"><b>{esc(ui["suitable"])}</b> {esc(fmt["use"])}</p>
            </article>'''
        )
    return "\n".join(cards)


def render_faqs(item: dict) -> str:
    return "\n".join(
        f'''        <details class="faq-item">
            <summary>{esc(question)}</summary>
            <p>{esc(answer)}</p>
        </details>'''
        for question, answer in item["faqs"]
    )


def social_image(item: dict) -> tuple[str, str]:
    if item["route_locale"] != "zh":
        return "", '    <meta name="twitter:card" content="summary">'
    image_url = "https://starryring.com/static/image/zh/key-generator-og.png"
    og = f'''    <meta property="og:image" content="{image_url}">
    <meta property="og:image:width" content="1731">
    <meta property="og:image:height" content="909">
    <meta property="og:image:alt" content="{esc(item["page"]["og_alt"])}">'''
    twitter = f'''    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="{image_url}">
    <meta name="twitter:image:alt" content="{esc(item["page"]["og_alt"])}">'''
    return og, twitter


def render_page(locale: str, item: dict, all_data: dict[str, dict]) -> str:
    item = dict(item)
    item["route_locale"] = locale
    page = item["page"]
    ui = item["ui"]
    runtime = dict(zip(RUNTIME_KEYS, item["runtime"], strict=True))
    og_image, twitter_card = social_image(item)
    og_alternates = "\n".join(
        f'    <meta property="og:locale:alternate" content="{all_data[other]["og_locale"]}">'
        for other in LOCALE_ORDER if other != locale
    )
    dir_attr = f' dir="{item["dir"]}"' if item.get("dir") else ""
    runtime_json = json.dumps(runtime, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f'''<!DOCTYPE html>
<html lang="{esc(item["html_lang"])}"{dir_attr}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(page["seo_title"])}</title>
    <meta name="description" content="{esc(page["description"])}">
    <meta name="keywords" content="{esc(page["keywords"])}">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <meta name="theme-color" content="#10141a">
    <meta name="application-name" content="StarryRing Key Generator">
    <link rel="canonical" href="{url(locale)}">
{alternates()}

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="StarryRing">
    <meta property="og:title" content="{esc(page["seo_title"])}">
    <meta property="og:description" content="{esc(page["description"])}">
    <meta property="og:url" content="{url(locale)}">
    <meta property="og:locale" content="{esc(item["og_locale"])}">
{og_alternates}
{og_image}
{twitter_card}
    <meta name="twitter:title" content="{esc(page["seo_title"])}">
    <meta name="twitter:description" content="{esc(page["description"])}">

    <script type="application/ld+json">{json_ld(locale, item)}</script>
    <script>window.KEYGEN_I18N={runtime_json};</script>
    <link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg">
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="stylesheet" href="/static/css/utility-tools/math/key-generator/style.css">
    <link rel="stylesheet" href="/static/css/shared/BreadNav.css">
    <link rel="stylesheet" href="/static/css/shared/switchlanguage.css">
    <link rel="preload" href="/static/js/utility-tools/math/key-generator/script.js" as="script">
    <script defer src="/static/js/utility-tools/math/key-generator/script.js"></script>
</head>
<body>
<div class="language-switcher">
    <button class="language-trigger" id="languageTrigger" aria-label="{esc(ui["language"])}" aria-expanded="false">🌐</button>
    <div class="language-dropdown" id="languageDropdown">
{language_options(all_data, locale)}
    </div>
</div>

<nav aria-label="{esc(ui["breadcrumb_label"])}" class="breadcrumb-section">
    <ol class="breadcrumb-modern">
        <li class="breadcrumb-item">
            <a href="/{locale}/" class="breadcrumb-link">{esc(ui["home"])}</a>
        </li>
        <li class="breadcrumb-item">
            <a href="/{locale}/utility-tools/" class="breadcrumb-link">{esc(ui["nav_tools"])}</a>
        </li>
        <li class="breadcrumb-item" aria-current="page">
            <span class="breadcrumb-active">{esc(page["h1"])}</span>
        </li>
    </ol>
</nav>

<div class="app">
    <header>
        <div class="eyebrow">{esc(page["eyebrow"])}</div>
        <h1>{esc(page["h1"])}</h1>
        <p class="tagline">{esc(page["tagline"])}</p>
    </header>

    <div class="callout">
        <span class="callout-icon" aria-hidden="true">⚠</span>
        <span>{esc(page["warning"])}</span>
    </div>

    <div class="callout error" id="cryptoError">
        <span class="callout-icon" aria-hidden="true">⛔</span>
        <span>{esc(page["crypto_error"])}</span>
    </div>

    <div class="entropy-strip" id="entropyStrip" aria-hidden="true">{esc(ui["initializing"])}</div>

    <main>
        <section class="panel" aria-labelledby="generatorTitle">
            <h2 class="sr-only" id="generatorTitle">{esc(ui["generator_panel"])}</h2>
            <section class="field-group">
                <div class="control-row">
                    <label for="lengthInput">{esc(ui["length"])}</label>
                    <div class="stepper">
                        <button type="button" data-step="-1" aria-label="{esc(ui["decrease_length"])}">−</button>
                        <input id="lengthInput" type="number" value="32" min="1" max="1024" inputmode="numeric" autocomplete="off" spellcheck="false">
                        <button type="button" data-step="1" aria-label="{esc(ui["increase_length"])}">+</button>
                    </div>
                    <div class="hint-group">
                        <span class="bit-hint" id="bitHint">256 {esc(runtime["bits"])}</span>
                        <span class="strength-badge" id="strengthBadge">{esc(runtime["strength_vhigh"])}</span>
                    </div>
                </div>
                <div class="field-msg" id="lengthError" role="alert"></div>
            </section>

            <div class="presets" role="group" aria-label="{esc(ui["presets_label"])}">
                <button type="button" class="chip" data-len="16">16 {esc(ui["bytes"])} · AES-128</button>
                <button type="button" class="chip active" data-len="32">32 {esc(ui["bytes"])} · AES-256</button>
                <button type="button" class="chip" data-len="64">64 {esc(ui["bytes"])} · {esc(ui["signing_key"])}</button>
            </div>

            <section class="field-group">
                <div class="control-row">
                    <span class="control-label">{esc(ui["format"])}</span>
                    <div class="segmented" id="formatSeg" role="group" aria-label="{esc(ui["format_label"])}">
                        <button type="button" data-fmt="hex" class="active">HEX</button>
                        <button type="button" data-fmt="base64">Base64</button>
                        <button type="button" data-fmt="base64url">Base64URL</button>
                        <button type="button" data-fmt="base32">Base32</button>
                    </div>
                </div>
            </section>

            <section class="field-group field-group-last">
                <div class="control-row">
                    <label for="countInput">{esc(ui["count"])}</label>
                    <div class="stepper">
                        <button type="button" data-count-step="-1" aria-label="{esc(ui["decrease_count"])}">−</button>
                        <input id="countInput" type="number" value="1" min="1" max="50" inputmode="numeric" autocomplete="off" spellcheck="false">
                        <button type="button" data-count-step="1" aria-label="{esc(ui["increase_count"])}">+</button>
                    </div>
                </div>
                <div class="field-msg" id="countError" role="alert"></div>
            </section>

            <button type="button" class="generate-btn" id="generateBtn">↻ {esc(ui["generate"])}</button>
            <p class="auto-note">{esc(ui["auto_note"])}</p>

            <section class="output" aria-labelledby="outputTitle">
                <div class="output-header">
                    <span id="outputTitle">{esc(ui["generated"])}</span>
                    <button type="button" class="ghost-btn" id="copyAllBtn" disabled>{esc(ui["copy_all"])}</button>
                </div>
                <div class="key-list" id="keyList" aria-live="polite">
                    <div class="empty-state" id="emptyState">{esc(ui["loading"])}</div>
                </div>
                <div class="download-row">
                    <button type="button" class="ghost-btn" id="downloadTxtBtn" disabled>{esc(ui["download_txt"])}</button>
                    <button type="button" class="ghost-btn" id="downloadBinBtn" disabled>{esc(ui["download_bin"])}</button>
                </div>
            </section>
        </section>

        <p class="footnote">{esc(page["source_note"])}</p>

        <section aria-labelledby="formatDocsTitle">
            <h2 class="section-title" id="formatDocsTitle">{esc(page["format_title"])}</h2>
            <p class="section-desc">{esc(page["format_intro"])}</p>
            <div class="docs-grid">
{render_formats(item)}
            </div>
        </section>

        <section aria-labelledby="faqTitle">
            <h2 class="section-title" id="faqTitle">{esc(page["faq_title"])}</h2>
{render_faqs(item)}
        </section>
    </main>
</div>

<footer class="site-footer">
    <span>{esc(page["footer_note"])}</span>
    <nav class="site-footer-links" aria-label="{esc(ui["footer_label"])}">
        <a href="/{locale}/utility-tools/">{esc(ui["all_tools"])}</a>
        <a href="/{locale}/privacy/">{esc(ui["privacy"])}</a>
        <a href="/{locale}/">{esc(ui["home"])}</a>
    </nav>
</footer>
<script src="/static/js/shared/switchlanguage.js"></script>
</body>
</html>
'''


def render_card(locale: str, item: dict) -> str:
    card = item["card"]
    return f'''<a href="{path_url(locale)}" class="tool-card">
                <div class="icon-wrapper"><i data-lucide="key-round"></i></div>
                <h3>{esc(card["title"])}</h3>
                <p>{esc(card["description"])}</p>
                <div class="tool-card-footer">
                    <span class="tool-tag">{esc(card["tag"])}</span>
                    <div class="arrow-icon"><i data-lucide="arrow-right"></i></div>
                </div>
            </a>'''


def update_index(locale: str, item: dict) -> None:
    index_path = ROOT / locale / "utility-tools" / "index.html"
    text = index_path.read_text(encoding="utf-8")
    route_re = re.compile(
        rf'<a(?=[^>]*class="tool-card")(?=[^>]*href="{re.escape(path_url(locale))}")[^>]*>.*?</a>[ \t]*',
        re.DOTALL,
    )
    card = render_card(locale, item)
    if route_re.search(text):
        text = route_re.sub(card, text, count=1)
        count_delta = 0
    else:
        password_re = re.compile(
            rf'(<a(?=[^>]*class="tool-card")(?=[^>]*href="/{locale}/utility-tools/math/password-generator/")[^>]*>.*?</a>[ \t]*)',
            re.DOTALL,
        )
        match = password_re.search(text)
        if not match:
            raise RuntimeError(f"Password-generator card not found in {index_path}")
        text = text[:match.end()] + "\n            " + card + text[match.end():]
        count_delta = 1

    section_start = text.find('<section class="category-section math-section">')
    section_end = text.find("</section>", section_start)
    if section_start < 0 or section_end < 0:
        raise RuntimeError(f"Math section not found in {index_path}")
    section = text[section_start:section_end]
    count_re = re.compile(r'(<span class="category-count">[^<]*?)(\d+)([^<]*</span>)[ \t]*')
    count_match = count_re.search(section)
    if not count_match:
        raise RuntimeError(f"Math tool count not found in {index_path}")
    section = count_re.sub(
        lambda m: f"{m.group(1)}{int(m.group(2)) + count_delta}{m.group(3)}",
        section,
        count=1,
    )
    text = text[:section_start] + section + text[section_end:]
    index_path.write_text(text, encoding="utf-8", newline="\n")


def update_sitemap() -> None:
    sitemap_path = ROOT / "sitemap-utility-tools.xml"
    text = sitemap_path.read_text(encoding="utf-8")
    text = re.sub(r"\s*<url>\s*<loc>[^<]*/key-generator/</loc>.*?</url>", "", text, flags=re.DOTALL)
    blocks = []
    for locale in LOCALE_ORDER:
        lines = [
            "  <url>",
            f"    <loc>{url(locale)}</loc>",
        ]
        for alternate in LOCALE_ORDER:
            lines.append(
                f'    <xhtml:link rel="alternate" hreflang="{HREFLANG[alternate]}" '
                f'href="{url(alternate)}" />'
            )
        lines.append(
            f'    <xhtml:link rel="alternate" hreflang="x-default" href="{url("en")}" />'
        )
        lines.extend([
            "    <lastmod>2026-08-26</lastmod>",
            "    <changefreq>weekly</changefreq>",
            "    <priority>0.7</priority>",
            "  </url>",
        ])
        blocks.append("\n".join(lines))
    payload = "\n".join(blocks)
    text = text.replace("</urlset>", f"{payload}\n</urlset>")
    sitemap_path.write_text(text, encoding="utf-8", newline="\n")


def validate_data(data: dict[str, dict]) -> None:
    if list(data) != LOCALE_ORDER:
        raise RuntimeError("Translation locales must match LOCALE_ORDER exactly")
    for locale, item in data.items():
        if len(item["runtime"]) != len(RUNTIME_KEYS):
            raise RuntimeError(f"{locale}: runtime must contain {len(RUNTIME_KEYS)} strings")
        if len(item["formats"]) != 4:
            raise RuntimeError(f"{locale}: exactly four format cards are required")
        if len(item["faqs"]) != 5:
            raise RuntimeError(f"{locale}: exactly five FAQs are required")


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    validate_data(data)
    for locale in LOCALE_ORDER:
        page_path = ROOT / locale / ROUTE / "index.html"
        page_path.parent.mkdir(parents=True, exist_ok=True)
        page_path.write_text(render_page(locale, data[locale], data), encoding="utf-8", newline="\n")
        update_index(locale, data[locale])
    update_sitemap()
    print(f"Built {len(LOCALE_ORDER)} localized key-generator pages.")


if __name__ == "__main__":
    main()
