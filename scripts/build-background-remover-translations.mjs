import fs from 'node:fs';
import vm from 'node:vm';

const outputPath = 'scripts/background-remover-source.json';
const html = fs.readFileSync('en/utility-tools/design-media/background-remover/index.html', 'utf8');
const body = html.slice(html.indexOf('<header class="topbar">'), html.indexOf('</body>'));
const script = fs.readFileSync('static/js/utility-tools/design-media/background-remover/script-zh.js', 'utf8');
const marker = "const baseUi = language === 'en' ? ";
const start = script.indexOf(marker) + marker.length;
const end = script.indexOf('\n} : {', start) + 2;
if (start < marker.length || end < start) throw new Error('Could not extract English UI copy');
const englishUi = vm.runInNewContext(`(${script.slice(start, end)})`);

export const dynamicSources = {
  syncedView: englishUi.syncedView('[[1]]'),
  reloadImage: englishUi.reloadImage('[[1]]'),
  removeHistory: englishUi.removeHistory('[[1]]'),
  fileInfo: {
    normal: englishUi.fileInfo('[[1]]', '[[2]]', '[[3]]', false),
    resized: englishUi.fileInfo('[[1]]', '[[2]]', '[[3]]', true),
  },
  clipboardName: englishUi.clipboardName('[[1]]'),
  downloadingModel: englishUi.downloadingModel('[[1]]'),
  fineDownloading: englishUi.fineDownloading('[[1]]'),
  detectedBackground: Object.fromEntries(['solid', 'checker', 'stripes'].map(kind => [kind, englishUi.detectedBackground(kind)])),
  exportName: englishUi.exportName('[[1]]'),
};

const technical = new Set(['StarryRing', 'PNG', 'JPG', 'WebP', '50', '100%', '30 px']);
const strings = new Set();
for (const match of body.matchAll(/>([^<>]+)</g)) {
  const value = match[1].trim();
  if (/[A-Za-z]{3}/.test(value) && !technical.has(value)) strings.add(value);
}
for (const match of body.matchAll(/(?:aria-label|title)="([^"]+)"/g)) {
  const value = match[1].trim();
  if (/[A-Za-z]{3}/.test(value) && !technical.has(value)) strings.add(value);
}
strings.add('Select language');
strings.add('Using Original AI to remove the background.');
strings.add('Background color [[1]]');
for (const value of Object.values(englishUi)) if (typeof value === 'string') strings.add(value);
for (const value of Object.values(dynamicSources)) {
  if (typeof value === 'string') strings.add(value);
  else for (const nested of Object.values(value)) strings.add(nested);
}
const sourceStrings = [...strings].filter(value => !['English', 'Naijá'].includes(value));
fs.writeFileSync(outputPath, JSON.stringify({ strings: sourceStrings, dynamicSources }, null, 2) + '\n');
console.log(`Collected ${sourceStrings.length} public UI strings.`);
