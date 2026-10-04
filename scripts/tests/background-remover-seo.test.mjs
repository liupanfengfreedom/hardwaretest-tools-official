import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const route = 'utility-tools/design-media/background-remover';
const locales = 'en zh ar bn de es fr hi id ja ko mr pcm pt ru ta te tr ur vi'.split(' ');
const url = locale => `https://starryring.com/${locale}/${route}/`;
const expectedAlternates = new Map([
  ...locales.map(locale => [locale === 'pcm' ? 'pcm-NG' : locale, url(locale)]),
  ['x-default', url('en')],
]);
const matchOne = (content, pattern, label) => {
  const matches = [...content.matchAll(pattern)];
  assert.equal(matches.length, 1, `${label} should appear once`);
  return matches[0][1];
};

test('Background Remover metadata is complete and reciprocal for every language', () => {
  for (const locale of locales) {
    const html = readFileSync(path.join(root, locale, route, 'index.html'), 'utf8');
    const head = html.split('</head>')[0];
    const title = matchOne(head, /<title>([^<]+)<\/title>/g, `${locale} title`);
    const description = matchOne(head, /<meta name="description" content="([^"]+)">/g, `${locale} description`);
    assert.ok(title.length > 3 && description.length > 15, `${locale} needs descriptive metadata`);
    assert.equal(matchOne(head, /<link rel="canonical" href="([^"]+)">/g, `${locale} canonical`), url(locale));
    assert.equal(matchOne(head, /<meta property="og:title" content="([^"]+)">/g, `${locale} Open Graph title`), title);
    assert.equal(matchOne(head, /<meta property="og:description" content="([^"]+)">/g, `${locale} Open Graph description`), description);
    assert.equal(matchOne(head, /<meta property="og:url" content="([^"]+)">/g, `${locale} Open Graph URL`), url(locale));
    assert.equal(matchOne(head, /<meta name="twitter:title" content="([^"]+)">/g, `${locale} Twitter title`), title);
    assert.equal(matchOne(head, /<meta name="twitter:description" content="([^"]+)">/g, `${locale} Twitter description`), description);

    const alternates = [...head.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
    assert.equal(alternates.length, expectedAlternates.size, `${locale} alternate count`);
    for (const [, language, href] of alternates) assert.equal(href, expectedAlternates.get(language), `${locale} ${language} alternate`);

    const schema = JSON.parse(matchOne(head, /<script type="application\/ld\+json">([^<]+)<\/script>/g, `${locale} breadcrumbs`));
    assert.equal(schema['@type'], 'BreadcrumbList');
    assert.deepEqual(schema.itemListElement.map(item => item.position), [1, 2, 3]);
    assert.deepEqual(schema.itemListElement.map(item => item.item), [
      `https://starryring.com/${locale}/`,
      `https://starryring.com/${locale}/utility-tools/`,
      url(locale),
    ]);
    assert.ok(schema.itemListElement.every(item => item.name), `${locale} breadcrumb names`);
  }
});

test('the utility sitemap lists every Background Remover language URL once', () => {
  const sitemap = readFileSync(path.join(root, 'sitemap-utility-tools.xml'), 'utf8');
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(match => match[1]).filter(entry => entry.includes(`/${route}/`));
  assert.equal(entries.length, locales.length);
  const listed = new Set();
  for (const entry of entries) {
    const location = matchOne(entry, /<loc>([^<]+)<\/loc>/g, 'sitemap location');
    assert.ok(locales.some(locale => url(locale) === location));
    assert.ok(!listed.has(location), `${location} is duplicated`);
    listed.add(location);
    const alternates = [...entry.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\s*\/>/g)];
    assert.equal(alternates.length, expectedAlternates.size);
    for (const [, language, href] of alternates) assert.equal(href, expectedAlternates.get(language));
  }
});
