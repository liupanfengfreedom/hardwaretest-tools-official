import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_LOCALE = "en";
const EXISTING_LOCALES = ["en", "zh", "vi", "ja", "ko", "hi"];
const NEW_LOCALES = [
  { code: "es", label: "Español", browserPrefixes: ["es"], ogLocale: "es_ES" },
  { code: "fr", label: "Français", browserPrefixes: ["fr"], ogLocale: "fr_FR" },
  { code: "ar", label: "العربية", browserPrefixes: ["ar"], ogLocale: "ar_SA" },
  { code: "bn", label: "বাংলা", browserPrefixes: ["bn"], ogLocale: "bn_BD" },
  { code: "pt", label: "Português", browserPrefixes: ["pt"], ogLocale: "pt_PT" },
  { code: "ru", label: "Русский", browserPrefixes: ["ru"], ogLocale: "ru_RU" },
  { code: "ur", label: "اردو", browserPrefixes: ["ur"], ogLocale: "ur_PK" },
  { code: "id", label: "Bahasa Indonesia", browserPrefixes: ["id"], ogLocale: "id_ID" },
  { code: "de", label: "Deutsch", browserPrefixes: ["de"], ogLocale: "de_DE" },
  { code: "pcm", label: "Naijá", browserPrefixes: ["pcm", "en-ng"], ogLocale: "en_NG" },
  { code: "mr", label: "मराठी", browserPrefixes: ["mr"], ogLocale: "mr_IN" },
  { code: "te", label: "తెలుగు", browserPrefixes: ["te"], ogLocale: "te_IN" },
  { code: "tr", label: "Türkçe", browserPrefixes: ["tr"], ogLocale: "tr_TR" },
  { code: "ta", label: "தமிழ்", browserPrefixes: ["ta"], ogLocale: "ta_IN" },
];

const LOCALE_META = {
  en: { label: "English", browserPrefixes: ["en"], ogLocale: "en_US" },
  zh: { label: "简体中文", browserPrefixes: ["zh"], ogLocale: "zh_CN" },
  vi: { label: "Tiếng Việt", browserPrefixes: ["vi"], ogLocale: "vi_VN" },
  ja: { label: "日本語", browserPrefixes: ["ja"], ogLocale: "ja_JP" },
  ko: { label: "한국어", browserPrefixes: ["ko"], ogLocale: "ko_KR" },
  hi: { label: "हिन्दी", browserPrefixes: ["hi"], ogLocale: "hi_IN" },
};

for (const locale of NEW_LOCALES) {
  LOCALE_META[locale.code] = locale;
}

const ALL_LOCALES = [
  "en",
  "zh",
  "vi",
  "ja",
  "ko",
  "hi",
  ...NEW_LOCALES.map((locale) => locale.code),
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toRoute(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized === "index.html") {
    return "";
  }
  return path.posix.dirname(normalized);
}

function routeToUrl(locale, route) {
  return route ? `/${locale}/${route}/` : `/${locale}/`;
}

function absoluteUrl(locale, route) {
  return `https://starryring.com${routeToUrl(locale, route)}`;
}

function safeReadDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function listHtmlRoutes(locale) {
  const base = path.join(ROOT, locale);
  const routes = [];

  function walk(dir) {
    for (const entry of safeReadDir(dir)) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
        routes.push(toRoute(path.relative(base, full)));
      }
    }
  }

  walk(base);
  return routes.sort();
}

function buildSwitcher(route, currentLocale) {
  const links = ALL_LOCALES.map((locale) => {
    const cls = locale === currentLocale ? " selected" : "";
    return `            <a class="language-option${cls}" href="${routeToUrl(locale, route)}" data-lang="${locale}">${LOCALE_META[locale].label}</a>`;
  }).join("\n");

  return [
    '    <div class="language-switcher">',
    '        <button class="language-trigger" id="languageTrigger" aria-label="Select language" aria-expanded="false">🌐</button>',
    '        <div class="language-dropdown" id="languageDropdown">',
    links,
    "        </div>",
    "    </div>",
  ].join("\n");
}

function buildHreflangBlock(route, currentLocale) {
  const lines = [
    `    <link rel="canonical" href="${absoluteUrl(currentLocale, route)}">`,
    ...ALL_LOCALES.map(
      (locale) =>
        `    <link rel="alternate" hreflang="${locale === "pcm" ? "pcm-NG" : locale}" href="${absoluteUrl(locale, route)}">`
    ),
    `    <link rel="alternate" hreflang="x-default" href="${absoluteUrl("en", route)}">`,
  ];
  return lines.join("\n");
}

function updateCanonicalAndAlternates(html, route, locale) {
  const block = buildHreflangBlock(route, locale);
  const canonicalPattern =
    /<link rel="canonical" href="[^"]*">\s*(?:<link rel="alternate" hreflang="[^"]+" href="[^"]*">\s*)+/;

  if (canonicalPattern.test(html)) {
    return html.replace(canonicalPattern, `${block}\n`);
  }

  return html.replace("</head>", `${block}\n</head>`);
}

function updateSwitcher(html, route, locale) {
  const switcher = buildSwitcher(route, locale);
  const switcherPattern =
    /<div class="language-switcher">[\s\S]*?<div class="language-dropdown" id="languageDropdown">[\s\S]*?<\/div>\s*<\/div>/;

  if (switcherPattern.test(html)) {
    return html.replace(switcherPattern, switcher);
  }

  return html.replace("<body>", `<body>\n${switcher}\n`);
}

function replaceLocaleUrls(html, sourceLocale, targetLocale) {
  if (sourceLocale === targetLocale) {
    return html;
  }

  const pairs = [
    [`https://starryring.com/${sourceLocale}/`, `https://starryring.com/${targetLocale}/`],
    [`href="/${sourceLocale}/`, `href="/${targetLocale}/`],
    [`content="/${sourceLocale}/`, `content="/${targetLocale}/`],
    [`url('/${sourceLocale}/`, `url('/${targetLocale}/`],
    [`url(\"/${sourceLocale}/`, `url(\"/${targetLocale}/`],
    [`"/${sourceLocale}/`, `"/${targetLocale}/`],
    [`'/${sourceLocale}/`, `'/${targetLocale}/`],
  ];

  let next = html;
  for (const [from, to] of pairs) {
    next = next.split(from).join(to);
  }
  return next;
}

function updateLocaleMeta(html, locale) {
  const ogLocale = LOCALE_META[locale].ogLocale;
  let next = html.replace(/<html lang="[^"]+">/, `<html lang="${locale}">`);
  next = next.replace(
    /<meta name="content-language" content="[^"]*"\s*\/?>/g,
    `<meta name="content-language" content="${locale}" />`
  );
  next = next.replace(
    /<meta property="og:locale" content="[^"]*"\s*\/?>/g,
    `<meta property="og:locale" content="${ogLocale}">`
  );
  return next;
}

function updatePageHtml(html, route, sourceLocale, targetLocale) {
  let next = replaceLocaleUrls(html, sourceLocale, targetLocale);
  next = updateLocaleMeta(next, targetLocale);
  next = updateCanonicalAndAlternates(next, route, targetLocale);
  next = updateSwitcher(next, route, targetLocale);
  return next;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeLocalePages(routes) {
  for (const locale of ALL_LOCALES) {
    const sourceBase = path.join(ROOT, locale);
    const targetBase = path.join(ROOT, locale);
    const templateBase = path.join(ROOT, SOURCE_LOCALE);
    const sourceLocale = fs.existsSync(sourceBase) && locale !== SOURCE_LOCALE ? locale : SOURCE_LOCALE;

    for (const route of routes) {
      const relHtml = route ? path.join(route, "index.html") : "index.html";
      const templatePath =
        locale === SOURCE_LOCALE
          ? path.join(templateBase, relHtml)
          : fs.existsSync(path.join(sourceBase, relHtml))
            ? path.join(sourceBase, relHtml)
            : path.join(templateBase, relHtml);

      const outPath = path.join(targetBase, relHtml);
      const sourceHtml = fs.readFileSync(templatePath, "utf8");
      const html = updatePageHtml(sourceHtml, route, sourceLocale, locale);
      ensureDir(path.dirname(outPath));
      fs.writeFileSync(outPath, html, "utf8");
    }
  }
}

function buildSitemapXml(routes, priorityForRoute) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];

  for (const route of routes) {
    for (const locale of ALL_LOCALES) {
      lines.push("  <url>");
      lines.push(`    <loc>${absoluteUrl(locale, route)}</loc>`);
      for (const alt of ALL_LOCALES) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${alt === "pcm" ? "pcm-NG" : alt}" href="${absoluteUrl(alt, route)}" />`
        );
      }
      lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl("en", route)}" />`);
      lines.push(`    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>`);
      lines.push("    <changefreq>weekly</changefreq>");
      lines.push(`    <priority>${priorityForRoute(route)}</priority>`);
      lines.push("  </url>");
    }
  }

  lines.push("</urlset>");
  return lines.join("\n");
}

function writeSitemaps(routes) {
  const mainRoutes = routes.filter((route) => !route.startsWith("toolbox/") && !route.startsWith("utility-tools/"));
  const toolboxRoutes = routes.filter((route) => route.startsWith("toolbox/"));
  const utilityRoutes = routes.filter((route) => route.startsWith("utility-tools/"));

  fs.writeFileSync(
    path.join(ROOT, "sitemap-main.xml"),
    buildSitemapXml(mainRoutes, (route) => (route === "" ? "1.0" : "0.5")),
    "utf8"
  );
  fs.writeFileSync(
    path.join(ROOT, "sitemap-toolbox.xml"),
    buildSitemapXml(toolboxRoutes, (route) => (route.endsWith("index") ? "0.8" : "0.7")),
    "utf8"
  );
  fs.writeFileSync(
    path.join(ROOT, "sitemap-utility-tools.xml"),
    buildSitemapXml(utilityRoutes, () => "0.7"),
    "utf8"
  );

  const indexXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "   <sitemap>",
    "      <loc>https://starryring.com/sitemap-main.xml</loc>",
    `      <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>`,
    "   </sitemap>",
    "   <sitemap>",
    "      <loc>https://starryring.com/sitemap-toolbox.xml</loc>",
    `      <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>`,
    "   </sitemap>",
    "   <sitemap>",
    "      <loc>https://starryring.com/sitemap-utility-tools.xml</loc>",
    `      <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>`,
    "   </sitemap>",
    "</sitemapindex>",
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), indexXml, "utf8");
}

function writeRootRedirect() {
  const conditions = ALL_LOCALES.flatMap((locale) =>
    LOCALE_META[locale].browserPrefixes.map((prefix, index) => ({
      locale,
      prefix,
      order: index,
    }))
  );

  const lines = [];
  lines.push("<!DOCTYPE html>");
  lines.push('<html lang="en">');
  lines.push("<head>");
  lines.push('    <meta charset="UTF-8">');
  lines.push('    <meta name="robots" content="noindex, follow">');
  lines.push("    <title>Language Redirect</title>");
  lines.push("    <script>");
  lines.push("        (function() {");
  lines.push("            try {");
  lines.push("                var lang = (navigator.language || navigator.browserLanguage || navigator.userLanguage || 'en').toLowerCase();");
  lines.push("                var target = '/en/';");
  for (const { locale, prefix } of conditions) {
    if (locale === "en") {
      continue;
    }
    lines.push(`                if (lang.indexOf('${prefix}') === 0) target = '/${locale}/';`);
  }
  lines.push("                window.location.replace(target);");
  lines.push("            } catch (e) {");
  lines.push("                window.location.replace('/en/');");
  lines.push("            }");
  lines.push("        })();");
  lines.push("    </script>");
  lines.push("</head>");
  lines.push("<body>");
  lines.push('    <p><a href="/en/">Continue to StarryRing</a></p>');
  lines.push("</body>");
  lines.push("</html>");
  fs.writeFileSync(path.join(ROOT, "index.html"), lines.join("\n"), "utf8");
}

const routes = listHtmlRoutes(SOURCE_LOCALE);
writeLocalePages(routes);
writeSitemaps(routes);
writeRootRedirect();

console.log(`Routes processed: ${routes.length}`);
console.log(`Locales available: ${ALL_LOCALES.length}`);
