import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABELS = {
    "en": "Home", "zh": "返回主页", "vi": "Trang chủ", "ja": "ホームに戻る",
    "ko": "홈으로", "hi": "होम पेज", "es": "Inicio", "fr": "Accueil",
    "ar": "الصفحة الرئيسية", "bn": "হোম", "pt": "Início", "ru": "На главную",
    "ur": "ہوم", "id": "Beranda", "de": "Startseite", "pcm": "Home",
    "mr": "मुख्यपृष्ठ", "te": "హోమ్", "tr": "Ana Sayfa", "ta": "முகப்பு",
}
TOP_BUTTON_PAGES = {"about-us", "contact-us", "disclaimer", "privacy", "terms"}

BUTTON_STYLE = """<style id="global-home-button-style">
.global-home-button{position:fixed;top:16px;left:16px;z-index:2147483000;display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:#ff8a44;color:#17120d!important;box-shadow:0 4px 0 #bd5d24,0 10px 24px rgba(0,0,0,.28);font:700 14px/1.2 Inter,"Segoe UI",sans-serif;text-decoration:none!important;transition:transform .15s,background .15s,box-shadow .15s}.global-home-button:hover{background:#ff9d61;transform:translateY(-1px)}.global-home-button:active{transform:translateY(2px);box-shadow:0 1px 0 #bd5d24}.global-home-button:focus-visible{outline:3px solid #5be8cf;outline-offset:3px}@media(max-width:640px){.global-home-button{top:10px;left:10px;padding:9px 13px;font-size:13px}}
</style>"""


def add_link(locale, source):
    root_href = f'/{locale}/'
    about_href = f'/{locale}/about-us/'

    def update_footer(match):
        footer = match.group(0)
        if re.search(rf'href=["\']{re.escape(root_href)}["\']', footer, re.I):
            return footer
        anchor = re.search(
            rf'<a(?P<attrs>[^>]*?)href=["\']{re.escape(about_href)}["\'](?P<tail>[^>]*)>',
            footer,
            re.I,
        )
        if not anchor:
            return footer
        opening = anchor.group(0).replace(about_href, root_href, 1)
        home = f'{opening}{LABELS[locale]}</a>'
        insert_at = anchor.start()
        return footer[:insert_at] + home + ' · ' + footer[insert_at:]

    return re.sub(r'<footer\b[^>]*>.*?</footer>', update_footer, source, flags=re.S | re.I)


def add_top_button(locale, source, force=False):
    if 'class="global-home-button"' in source:
        return source
    footers = re.findall(r'<footer\b[^>]*>.*?</footer>', source, flags=re.S | re.I)
    if not force and not any(f'/{locale}/about-us/' in footer for footer in footers):
        return source
    if 'id="global-home-button-style"' not in source:
        source = re.sub(r'</head>', BUTTON_STYLE + '\n</head>', source, count=1, flags=re.I)
    button = f'<a class="global-home-button" href="/{locale}/" aria-label="{LABELS[locale]}">← <span>{LABELS[locale]}</span></a>'
    return re.sub(r'(<body\b[^>]*>)', r'\1\n' + button, source, count=1, flags=re.I)


def remove_top_button(source):
    source = re.sub(r'\s*<style id="global-home-button-style">.*?</style>', '', source, count=1, flags=re.S | re.I)
    source = re.sub(r'\s*<a class="global-home-button"[^>]*>.*?</a>', '', source, count=1, flags=re.S | re.I)
    return source


def main():
    changed = 0
    for locale in LABELS:
        locale_root = ROOT / locale
        for path in locale_root.rglob('index.html'):
            if path.parent == locale_root:
                continue
            source = path.read_text(encoding='utf-8-sig')
            updated = add_link(locale, source)
            if path.parent.name in TOP_BUTTON_PAGES:
                updated = add_top_button(locale, updated, force=True)
            else:
                updated = remove_top_button(updated)
            if updated != source:
                path.write_text(updated, encoding='utf-8', newline='\n')
                changed += 1
    print(f'Added localized footer home links to {changed} pages')


if __name__ == '__main__':
    main()
