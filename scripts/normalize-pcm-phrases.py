from pathlib import Path


ROOT = Path(r"F:\WebTool\toolsite\pcm")

REPLACEMENTS = [
    ("Question wey people dey ask well well (FAQ)", "Question people dey ask well well (FAQ)"),
    ("For internet Tool corner", "Browser Tool area"),
    ("Tool corner", "Tool area"),
    ("For internet ", "Browser "),
    (" Online ", " Browser "),
    ("Online keyboard tester", "Browser keyboard checker"),
]


changed = 0
for path in ROOT.rglob("index.html"):
    text = path.read_text(encoding="utf-8", errors="ignore")
    original = text
    for src, dst in REPLACEMENTS:
        text = text.replace(src, dst)
    if text != original:
        path.write_text(text, encoding="utf-8")
        changed += 1

print(f"updated {changed} html files")
