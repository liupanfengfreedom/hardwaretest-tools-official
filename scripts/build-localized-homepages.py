import html
import json
import re
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ["en", "vi", "ja", "ko", "hi", "es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"]
RTL = {"ar", "ur"}
FIXED_PHRASES = [
    "关于", "诊断工具箱", "效率工具箱", "开始检测", "真实输入日志", "数据可视化",
    "信号示波", "点击输入信号预览（示意演示，非实测数据）", "延迟", "抖动", "状态",
    "待检测", "点击测试", "永久免费", "无需注册", "不记录任何输入数据", "浏览器直接运行",
    "关于 KEYCHECK PRO", "你的外设", "鼠标 / 键盘", "系统与浏览器", "驱动 / 轮询率",
    "未知变量", "延迟 / 抖动 / 消抖", "你的判断", "可验证的结论", "把「感觉不对」，变成看得见的数据",
    "四类核心检测工具，覆盖游戏与开发中最常遇到的外设疑点，全部在浏览器中即时运行，无需安装。",
    "更多工具", "素材处理、数据生成、网络调试，一并整理进效率工具箱。", "开发者工具箱",
    "素材处理", "数据生成", "网络调试", "快速生成", "由玩家与独立开发者打造的输入检测工具",
    "永久 免费 · 无需注册 · 不记录任何输入数据", "检测到抖动", "点击正常"
]


def git_text(path):
    return subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT).decode("utf-8-sig")


def clean(value):
    value = re.sub(r"\s+", " ", value).strip()
    return value


def text_only(value):
    return html.unescape(clean(re.sub(r"<[^>]+>", "", value)))


def one(pattern, source, default="", flags=re.S | re.I):
    match = re.search(pattern, source, flags)
    return clean(match.group(1)) if match else default


def section(source, element_id):
    return one(rf'<section[^>]+id="{re.escape(element_id)}"[^>]*>(.*?)</section>', source)


def replace_once(source, pattern, replacement):
    return re.sub(pattern, lambda match: match.expand(replacement), source, count=1, flags=re.S | re.I)


def replace_sequence(source, pattern, replacements):
    values = iter(replacements)
    def apply(match):
        try:
            value = next(values)
        except StopIteration:
            return match.group(0)
        return match.expand(value)
    return re.sub(pattern, apply, source, flags=re.S | re.I)


def page_info(locale, route):
    source = git_text(f"{locale}/{route}/index.html")
    title = text_only(one(r"<h1[^>]*>(.*?)</h1>", source) or one(r"<title>(.*?)</title>", source))
    description = html.unescape(one(r'<meta\s+name="description"\s+content="([^"]*)"', source))
    if not description:
        description = title
    return title, description


def localized_values(locale):
    old = git_text(f"{locale}/index.html")
    hero = one(r'<div class="hero-content">(.*?)</div>\s*</div>\s*</div>', old)
    hero_ps = re.findall(r"<p[^>]*>(.*?)</p>", hero, re.S | re.I)
    features = [text_only(x) for x in re.findall(r'<div class="feature"[^>]*>(.*?)</div>', hero, re.S | re.I)]
    about = section(old, "about")
    about_ps = re.findall(r"<p[^>]*>(.*?)</p>", about, re.S | re.I)
    utility = section(old, "utility-tools")
    utility_ps = re.findall(r"<p[^>]*>(.*?)</p>", utility, re.S | re.I)
    nav_labels = [text_only(x) for x in re.findall(r'<div class="nav-links">(.*?)</div>', old, re.S | re.I) for x in re.findall(r'<a[^>]*>(.*?)</a>', x, re.S | re.I)]
    footer = one(r"<footer[^>]*>(.*?)</footer>", old)
    footer_links = [text_only(x) for x in re.findall(r'<a[^>]*>(.*?)</a>', footer, re.S | re.I)]
    return {
        "title": text_only(one(r"<title>(.*?)</title>", old)),
        "description": html.unescape(one(r'<meta\s+name="description"\s+content="([^"]*)"', old)),
        "tag": one(r'<span class="tag"[^>]*>(.*?)</span>', hero),
        "h1": one(r"<h1[^>]*>(.*?)</h1>", hero),
        "hero_ps": hero_ps,
        "features": features,
        "cta": text_only(one(rf'<a[^>]+href="/{locale}/toolbox/"[^>]*>(.*?)</a>', hero)),
        "about_h2": one(r"<h2[^>]*>(.*?)</h2>", about),
        "about_ps": about_ps,
        "utility_h2": one(r"<h2[^>]*>(.*?)</h2>", utility),
        "utility_ps": utility_ps,
        "utility_cta": text_only(one(rf'<a[^>]+href="/{locale}/utility-tools/"[^>]*>(.*?)</a>', utility)),
        "nav": nav_labels,
        "footer_links": footer_links,
    }


def build(locale, template):
    v = localized_values(locale)
    out = template
    lang_attr = locale + ("-NG" if locale == "pcm" else "")
    direction = ' dir="rtl"' if locale in RTL else ""
    out = re.sub(r'<html lang="zh-CN">', f'<html lang="{lang_attr}"{direction}>', out, count=1)
    out = replace_once(out, r"<title>.*?</title>", f"<title>{html.escape(v['title'])}</title>")
    if v["description"]:
        out = out.replace("<title>" + html.escape(v["title"]) + "</title>", "<title>" + html.escape(v["title"]) + "</title>\n<meta name=\"description\" content=\"" + html.escape(v["description"], quote=True) + "\">")
    out = out.replace('class="language-option selected" href="/zh/"', 'class="language-option" href="/zh/"')
    out = out.replace(f'class="language-option" href="/{locale}/"', f'class="language-option selected" href="/{locale}/"')
    out = out.replace("/zh/", f"/{locale}/")
    out = out.replace(f'class="language-option" href="/{locale}/" data-lang="zh"', 'class="language-option" href="/zh/" data-lang="zh"')
    out = out.replace(f'class="language-option selected" href="/{locale}/" data-lang="zh"', 'class="language-option" href="/zh/" data-lang="zh"')
    out = out.replace(f'class="language-option" href="/{locale}/" data-lang="{locale}"', f'class="language-option selected" href="/{locale}/" data-lang="{locale}"')

    if v["nav"]:
        out = replace_once(out, r'(<a class="navlink" href="#about">).*?(</a>)', rf'\1{html.escape(v["nav"][0])}\2')
    if len(v["nav"]) > 1:
        out = replace_once(out, r'(<a class="navlink" href="#toolbox">).*?(</a>)', rf'\1{html.escape(v["cta"] or v["nav"][1])}\2')
        out = replace_once(out, r'(<a class="navlink" href="#devtools">).*?(</a>)', rf'\1{html.escape(v["nav"][1])}\2')
    out = replace_once(out, r'<span class="eyebrow">.*?</span>', f'<span class="eyebrow">{v["tag"]}</span>')
    out = replace_once(out, r'(<section class="hero">.*?<h1>).*?(</h1>)', rf'\1{v["h1"]}\2')
    if v["hero_ps"]:
        hero_start = out.index('<section class="hero">')
        scope_start = out.index('<div id="scope"', hero_start)
        left = out[hero_start:scope_start]
        left = replace_sequence(left, r"<p>.*?</p>", [f"<p>{p}</p>" for p in v["hero_ps"][:2]])
        out = out[:hero_start] + left + out[scope_start:]
    if v["features"]:
        out = replace_sequence(out, r'(<span class="feature-tag"><span class="dot"></span>).*?(</span>)', [rf'\1{html.escape(item)}\2' for item in v["features"][:2]])
    if v["cta"]:
        out = replace_once(out, r'(<a class="btn btn-primary" href="#toolbox">).*?(</a>)', rf'\1{html.escape(v["cta"])} →\2')
        out = replace_once(out, r'(<a class="btn btn-primary" href="#scope">).*?(</a>)', rf'\1{html.escape(v["cta"])}\2')

    narrative = one(r'(<section class="narrative".*?</section>)', out)
    if narrative:
        narrative = replace_once(narrative, r"<h2>.*?</h2>", f"<h2>{v['about_h2']}</h2>")
        narrative = replace_sequence(narrative, r"<p(?: class=\"callout\")?>.*?</p>", [f"<p>{p}</p>" for p in v["about_ps"][:2]])
        out = replace_once(out, r'<section class="narrative".*?</section>', narrative)

    tool_routes = [("mouse", "mouse"), ("keyboard", "keyboard"), ("camera", "camera")]
    cards = []
    for route, _ in tool_routes:
        try:
            cards.append(page_info(locale, f"toolbox/{route}"))
        except Exception:
            cards.append((route.title(), v["description"]))
    card_replacements = [rf'\1{html.escape(title)}\2{html.escape(desc)}\3' for title, desc in cards]
    out = replace_sequence(out, r'(<a class="tool-card"[^>]*>.*?<h3>).*?(</h3>\s*<p>).*?(</p>)', card_replacements)

    dev = one(r'(<section class="dev-banner".*?</section>)', out)
    if dev:
        dev = replace_once(dev, r"<h2>.*?</h2>", f"<h2>{v['utility_h2']}</h2>")
        if v["utility_ps"]:
            dev = replace_once(dev, r"<p>.*?</p>", f"<p>{v['utility_ps'][0]}</p>")
        if v["utility_cta"]:
            dev = replace_once(dev, r'(<a class="btn btn-primary"[^>]*>).*?(</a>)', rf'\1{html.escape(v["utility_cta"])} →\2')
        out = replace_once(out, r'<section class="dev-banner".*?</section>', dev)
    for old_label, new_label in zip(["关于我们", "联系我们", "免责声明", "隐私政策", "服务条款"], v["footer_links"]):
        out = out.replace(f">{old_label}</a>", f">{html.escape(new_label)}</a>")
    return out


def translate_fixed(locale, source):
    target = "en" if locale == "pcm" else locale
    markers = [f"@@{i}@@" for i in range(len(FIXED_PHRASES))]
    query = "\n".join(f"{marker}{phrase}" for marker, phrase in zip(markers, FIXED_PHRASES))
    params = urllib.parse.urlencode({"client": "gtx", "sl": "zh-CN", "tl": target, "dt": "t", "q": query})
    request = urllib.request.Request("https://translate.googleapis.com/translate_a/single?" + params, headers={"User-Agent": "Mozilla/5.0"})
    payload = json.loads(urllib.request.urlopen(request, timeout=30).read().decode("utf-8"))
    translated = "".join(part[0] for part in payload[0] if part and part[0])
    values = {}
    for index, marker in enumerate(markers):
        start = translated.find(marker)
        if start < 0:
            continue
        start += len(marker)
        end = translated.find(markers[index + 1], start) if index + 1 < len(markers) else len(translated)
        values[FIXED_PHRASES[index]] = translated[start:end].strip()
    script_marker = "<script>"
    markup, separator, scripts = source.partition(script_marker)
    for original in sorted(values, key=len, reverse=True):
        markup = markup.replace(original, values[original])
    if separator:
        jitter = values.get("检测到抖动", "检测到抖动")
        normal = values.get("点击正常", "点击正常")
        scripts = scripts.replace("statusEl.textContent = '⚠ 检测到抖动';", "statusEl.textContent = " + json.dumps("⚠ " + jitter, ensure_ascii=False) + ";")
        scripts = scripts.replace("statusEl.textContent = '✓ 点击正常';", "statusEl.textContent = " + json.dumps("✓ " + normal, ensure_ascii=False) + ";")
    return markup + separator + scripts


def make_scripts_safe(source):
    pattern = r"statusEl\.textContent = '(.*)';"
    return re.sub(pattern, lambda match: "statusEl.textContent = " + json.dumps(match.group(1), ensure_ascii=False) + ";", source)


def main():
    template = (ROOT / "zh" / "index.html").read_text(encoding="utf-8")
    for locale in LOCALES:
        output = make_scripts_safe(translate_fixed(locale, build(locale, template)))
        (ROOT / locale / "index.html").write_text(output, encoding="utf-8", newline="\n")
    print(f"Built {len(LOCALES)} localized homepages")


if __name__ == "__main__":
    main()
