import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ["en", "zh", "vi", "ja", "ko", "hi", "es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"]

FIELDS = [
    "Disclaimer",
    "Last updated: August 2026",
    "Please read this disclaimer before using StarryRing. By using the website, you acknowledge the limitations described below.",
    "1. Purpose of the website",
    "StarryRing provides browser-based tools for peripheral checks, input diagnostics, media processing, calculations, and developer utilities. The tools are intended for general information, self-checking, troubleshooting, and convenience.",
    "2. Test results and technical limitations",
    "Results may vary depending on your device, browser, operating system, drivers, permissions, network conditions, display refresh rate, and background processes.",
    "Measurements such as latency, polling rate, frame rate, jitter, and response time are estimates produced in a browser environment and may not match laboratory or manufacturer measurements.",
    "A normal result does not guarantee that hardware is fault-free, and an unusual result does not by itself prove that a device is defective.",
    "3. Not professional or manufacturer advice",
    "Content and results on this website do not constitute legal, financial, medical, engineering, repair, warranty, or other professional advice. For safety-critical issues, persistent faults, warranty claims, or purchasing decisions, consult the device manufacturer or a qualified professional.",
    "4. Accuracy and availability",
    "We work to keep tools and information useful and accurate, but we do not guarantee that every result, explanation, conversion, calculation, or page will always be complete, current, error-free, or available without interruption. Features may change as browsers and web standards evolve.",
    "5. User responsibility",
    "You are responsible for reviewing results, keeping backups, protecting sensitive information, and deciding whether a tool is suitable for your situation. Do not rely on a single browser test when a decision could affect safety, valuable data, equipment, finances, or legal rights.",
    "6. Privacy and local processing",
    "Many tools are designed to process input locally in your browser. However, some functions may depend on browser permissions, third-party libraries, external services, analytics, or network requests. Please review our Privacy Policy for more information and avoid entering confidential data unless you understand how the selected tool works.",
    "7. Third-party content and links",
    "References to third-party products, services, websites, libraries, or trademarks are provided for convenience and do not imply endorsement. We do not control third-party availability, content, security, or privacy practices.",
    "8. Limitation of liability",
    "To the extent permitted by applicable law, StarryRing and its contributors are not liable for indirect, incidental, special, consequential, or data-related loss arising from access to, inability to access, or reliance on this website. Nothing in this disclaimer excludes liability that cannot legally be excluded.",
    "9. Changes and contact",
    "We may update this disclaimer when the website, its tools, or applicable requirements change. The date above shows the latest revision. If you find an error or have a question about this disclaimer, contact us at contact@starryring.com.",
]

ZH = [
    "免责声明", "最后更新：2026年8月",
    "使用 StarryRing 前，请阅读本免责声明。继续使用本网站，即表示您知悉并理解下述限制。",
    "1. 网站用途", "StarryRing 提供基于浏览器的外设检测、输入诊断、媒体处理、计算及开发者工具。这些工具仅用于一般信息、自助检测、故障排查和日常便利。",
    "2. 检测结果与技术限制", "检测结果可能受到设备、浏览器、操作系统、驱动程序、权限设置、网络状况、屏幕刷新率及后台进程等因素影响。",
    "延迟、轮询率、帧率、抖动和响应时间等数据是在浏览器环境中得出的估算值，可能与实验室或设备厂商的测量结果不同。",
    "检测结果正常并不保证硬件完全无故障；结果异常也不能单独证明设备存在缺陷。",
    "3. 不构成专业或厂商建议", "本网站的内容与检测结果不构成法律、财务、医疗、工程、维修、保修或其他专业建议。涉及安全、持续性故障、保修申请或购买决策时，请咨询设备厂商或具备资质的专业人员。",
    "4. 准确性与可用性", "我们会尽力保持工具与信息实用、准确，但不保证所有结果、说明、转换、计算或页面始终完整、最新、无误或持续可用。浏览器和网络标准变化时，部分功能也可能随之调整。",
    "5. 用户责任", "您有责任复核结果、妥善备份、保护敏感信息，并判断工具是否适合自己的使用场景。当相关决定可能影响人身安全、重要数据、设备、财务或法律权益时，请勿仅依赖一次浏览器测试。",
    "6. 隐私与本地处理", "许多工具被设计为在您的浏览器本地处理输入，但部分功能可能依赖浏览器权限、第三方库、外部服务、统计分析或网络请求。请查阅我们的隐私政策；在不了解工具处理方式时，请勿输入机密数据。",
    "7. 第三方内容与链接", "网站中提及的第三方产品、服务、网站、程序库或商标仅为使用便利，不代表认可或背书。我们无法控制第三方服务的可用性、内容、安全性或隐私做法。",
    "8. 责任限制", "在适用法律允许的范围内，StarryRing 及其贡献者不对因访问、无法访问或依赖本网站而产生的间接、附带、特殊、后果性或数据相关损失承担责任。本条款不排除依法不得排除的责任。",
    "9. 更新与联系", "当网站、工具或适用要求发生变化时，我们可能更新本免责声明。页面顶部日期为最近修订日期。如发现错误或对本免责声明有疑问，请发送邮件至 contact@starryring.com。",
]

STYLE = """<style id="disclaimer-enhanced-style">
.disclaimer-content{margin-top:74px}.disclaimer-content h1{font-size:clamp(2rem,5vw,3rem);margin-bottom:8px}.disclaimer-updated{color:#777;font-size:.95rem}.disclaimer-intro{margin:24px 0 30px;padding:18px 20px;border-left:4px solid #ff8a44;border-radius:8px;background:#fff7f1;color:#4b3427}.disclaimer-section{margin:18px 0;padding:22px 24px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.05)}.disclaimer-section h2{margin:0 0 10px;font-size:1.25rem}.disclaimer-section p{margin:8px 0}.disclaimer-note{margin-top:28px;padding:16px 18px;border-radius:10px;background:#f3f7ff;color:#334155}@media(max-width:640px){.disclaimer-content{margin-top:66px}.disclaimer-section{padding:18px}}
</style>"""


def translate(locale):
    if locale == "en":
        return FIELDS
    if locale == "zh":
        return ZH
    target = "en" if locale == "pcm" else locale
    markers = [f"@@{i}@@" for i in range(len(FIELDS))]
    query = "\n".join(marker + value for marker, value in zip(markers, FIELDS))
    params = urllib.parse.urlencode({"client": "gtx", "sl": "en", "tl": target, "dt": "t", "q": query})
    request = urllib.request.Request("https://translate.googleapis.com/translate_a/single?" + params, headers={"User-Agent": "Mozilla/5.0"})
    payload = json.loads(urllib.request.urlopen(request, timeout=45).read().decode("utf-8"))
    result = "".join(part[0] for part in payload[0] if part and part[0])
    values = []
    for index, marker in enumerate(markers):
        start = result.find(marker) + len(marker)
        end = result.find(markers[index + 1], start) if index + 1 < len(markers) else len(result)
        values.append(result[start:end].strip())
    if len(values) != len(FIELDS) or any(not value for value in values):
        raise RuntimeError(f"Incomplete translation for {locale}")
    return values


def render(values):
    esc = [html.escape(value) for value in values]
    parts = [f'<main class="disclaimer-content"><h1>{esc[0]}</h1>', f'<p class="disclaimer-updated">{esc[1]}</p>', f'<p class="disclaimer-intro">{esc[2]}</p>']
    index = 3
    section_lengths = [1, 3, 1, 1, 1, 1, 1, 1, 1]
    for length in section_lengths:
        parts.append(f'<section class="disclaimer-section"><h2>{esc[index]}</h2>')
        index += 1
        for _ in range(length):
            parts.append(f'<p>{esc[index]}</p>')
            index += 1
        parts.append('</section>')
    parts.append('</main>')
    return "\n".join(parts)


def main():
    for locale in LOCALES:
        path = ROOT / locale / "disclaimer" / "index.html"
        source = path.read_text(encoding="utf-8-sig")
        if 'id="disclaimer-enhanced-style"' not in source:
            source = re.sub(r"</head>", STYLE + "\n</head>", source, count=1, flags=re.I)
        source = re.sub(r"<h1>.*?</h1>.*?(?=<footer\b)", render(translate(locale)) + "\n", source, count=1, flags=re.S | re.I)
        path.write_text(source, encoding="utf-8", newline="\n")
    print(f"Enhanced {len(LOCALES)} disclaimer pages")


if __name__ == "__main__":
    main()
