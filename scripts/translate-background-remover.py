"""Build checked-in translations for the Background Remover's public UI text."""

import json
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from html import unescape
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts/background-remover-source.json"
OUTPUT = ROOT / "scripts/background-remover-translations.json"
LOCALES = ("ar", "bn", "de", "es", "fr", "hi", "id", "ko", "mr", "pt", "ru", "ta", "te", "tr", "ur", "vi")
source_strings = json.loads(SOURCE.read_text(encoding="utf-8"))["strings"]
translations = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}
write_lock = threading.Lock()


def translate(text, locale):
    if len(text.encode("utf-8")) > 450:
        pieces, current = [], ""
        for word in text.split(" "):
            if current and len((current + " " + word).encode("utf-8")) > 420:
                pieces.append(current)
                current = word
            else:
                current = (current + " " + word).strip()
        if current:
            pieces.append(current)
        return " ".join(translate(piece, locale) for piece in pieces)
    query = urlencode({"q": text, "langpair": f"en|{locale}"})
    request = Request("https://api.mymemory.translated.net/get?" + query,
                      headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(5):
        try:
            with urlopen(request, timeout=20) as response:
                data = json.load(response)
            if data.get("responseStatus") != 200:
                raise RuntimeError(f"Translation service: {data.get('responseStatus')} {data.get('responseDetails')}")
            value = unescape(data["responseData"]["translatedText"]).strip()
            if "mymemory warning" in value.lower():
                raise RuntimeError(value)
            return value
        except Exception:
            if attempt == 4:
                raise
            time.sleep(0.5 * (2 ** attempt))


def groups(values):
    group, chars = [], 0
    for value in values:
        if group and (len(group) >= 8 or chars + len(value) > 370):
            yield group
            group, chars = [], 0
        group.append(value)
        chars += len(value)
    if group:
        yield group


def translate_group(group, locale):
    joined = "\n".join(f"__SEG{index}__\n{value}" if index else value
                       for index, value in enumerate(group))
    result = translate(joined, locale)
    parts = re.split(r"__\s*SEG(\d+)\s*__\s*", result)
    output = [None] * len(group)
    if len(parts) == len(group) * 2 - 1:
        output[0] = parts[0].strip()
        for index in range(1, len(parts), 2):
            position = int(parts[index])
            if 0 < position < len(group):
                output[position] = parts[index + 1].strip()
    for index, value in enumerate(output):
        if not value or re.search(r"__\s*SEG\d+\s*__", value):
            output[index] = translate(group[index], locale)
    return output


def save():
    OUTPUT.write_text(json.dumps(translations, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_locale(locale):
    entries = translations.setdefault(locale, {})
    missing = [value for value in source_strings if not entries.get(value)]
    batches = list(groups(missing))
    print(f"{locale}: {len(missing)} strings, {len(batches)} batches", flush=True)
    for number, batch in enumerate(batches, 1):
        try:
            converted = translate_group(batch, locale)
        except Exception as error:
            print(f"{locale}: batch {number} deferred ({error})", flush=True)
            continue
        with write_lock:
            entries.update(zip(batch, converted))
            save()
        print(f"{locale}: {number}/{len(batches)}", flush=True)


with ThreadPoolExecutor(max_workers=2) as executor:
    list(executor.map(build_locale, LOCALES))

print(f"Translated {len(source_strings)} source strings for {len(LOCALES)} languages.", flush=True)
