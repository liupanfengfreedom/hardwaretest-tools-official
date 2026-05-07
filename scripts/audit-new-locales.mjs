import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LOCALES = ["es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "pcm", "mr", "te", "tr", "ta"];

function walk(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      out.push(full);
    }
  }
}

function extractVisible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function h1Of(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function englishScore(text) {
  const words = text.match(/[A-Za-z][A-Za-z'&.-]{2,}/g) || [];
  const uniq = [...new Set(words.map((word) => word.toLowerCase()))];
  return { count: words.length, uniq };
}

const report = {};

for (const locale of LOCALES) {
  const base = path.join(ROOT, locale);
  const files = [];
  walk(base, files);
  const flagged = [];

  for (const file of files) {
    const rel = path.relative(base, file).replace(/\\/g, "/");
    const html = fs.readFileSync(file, "utf8");
    const visible = extractVisible(html);
    const title = titleOf(html);
    const h1 = h1Of(html);
    const titleScore = englishScore(title);
    const h1Score = englishScore(h1);
    const visibleScore = englishScore(visible);

    if (titleScore.count >= 3 || h1Score.count >= 3 || visibleScore.count >= 80) {
      flagged.push({
        route: rel === "index.html" ? "/" : `/${path.posix.dirname(rel)}/`,
        title,
        h1,
        titleEnglishWords: titleScore.uniq.slice(0, 25),
        h1EnglishWords: h1Score.uniq.slice(0, 25),
        visibleEnglishCount: visibleScore.count,
      });
    }
  }

  report[locale] = {
    total: files.length,
    flagged: flagged.length,
    samples: flagged.slice(0, 12),
  };
}

console.log(JSON.stringify(report, null, 2));
