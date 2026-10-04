import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { localizeJapanesePage } from "./background-remover-ja.mjs";
import { pidginTranslations } from "./background-remover-pcm.mjs";

const root = process.cwd();
const route = "utility-tools/design-media/background-remover";
const locales = {
  ar: { name: "مزيل الخلفية", description: "أزل خلفية الصورة في متصفحك ونزّل ملف PNG بخلفية شفافة.", eyebrow: "أدوات الصور", heading: "احتفظ بالعنصر. أزل الخلفية.", subtitle: "صورة واحدة ونقرة واحدة. اجعل الأشخاص والمنتجات في موضع التركيز." },
  bn: { name: "ব্যাকগ্রাউন্ড রিমুভার", description: "ব্রাউজারেই ছবির ব্যাকগ্রাউন্ড মুছুন এবং স্বচ্ছ PNG ডাউনলোড করুন।", eyebrow: "ছবির টুল", heading: "বিষয়টি রাখুন। ব্যাকগ্রাউন্ড সরান।", subtitle: "একটি ছবি, একটি ক্লিক। মানুষ ও পণ্যকে ফোকাসে আনুন।" },
  de: { name: "Hintergrund entfernen", description: "Entfernen Sie Bildhintergründe im Browser und laden Sie ein transparentes PNG herunter.", eyebrow: "Bildwerkzeuge", heading: "Motiv behalten. Hintergrund entfernen.", subtitle: "Ein Bild, ein Klick. Menschen und Produkte in den Fokus rücken." },
  es: { name: "Quitar fondo", description: "Elimina fondos de imágenes en tu navegador y descarga un PNG transparente.", eyebrow: "Herramientas de imagen", heading: "Conserva el sujeto. Quita el fondo.", subtitle: "Una imagen, un clic. Da protagonismo a personas y productos." },
  fr: { name: "Suppression d'arrière-plan", description: "Supprimez les arrière-plans d'images dans votre navigateur et téléchargez un PNG transparent.", eyebrow: "Outils d'image", heading: "Gardez le sujet. Supprimez l'arrière-plan.", subtitle: "Une image, un clic. Mettez personnes et produits en valeur." },
  hi: { name: "बैकग्राउंड रिमूवर", description: "ब्राउज़र में तस्वीर की पृष्ठभूमि हटाएँ और पारदर्शी PNG डाउनलोड करें।", eyebrow: "इमेज टूल", heading: "विषय रखें। पृष्ठभूमि हटाएँ।", subtitle: "एक तस्वीर, एक क्लिक। लोगों और उत्पादों को केंद्र में लाएँ।" },
  id: { name: "Penghapus Latar Belakang", description: "Hapus latar belakang gambar di browser dan unduh PNG transparan.", eyebrow: "Alat gambar", heading: "Pertahankan subjek. Hapus latar belakang.", subtitle: "Satu gambar, satu klik. Fokuskan orang dan produk." },
  ja: { name: "背景削除", description: "ブラウザーで画像の背景を削除し、透明な PNG をダウンロードできます。", eyebrow: "画像ツール", heading: "主体を残して、背景を削除。", subtitle: "画像 1 枚、クリック 1 回。人物や商品の主役を引き立てます。" },
  ko: { name: "배경 제거", description: "브라우저에서 이미지 배경을 제거하고 투명한 PNG를 다운로드하세요.", eyebrow: "이미지 도구", heading: "피사체를 남기고 배경을 제거하세요.", subtitle: "이미지 한 장, 클릭 한 번. 사람과 제품에 시선을 모읍니다." },
  mr: { name: "पार्श्वभूमी काढा", description: "ब्राउझरमध्ये चित्राची पार्श्वभूमी काढा आणि पारदर्शक PNG डाउनलोड करा.", eyebrow: "प्रतिमा साधने", heading: "विषय ठेवा. पार्श्वभूमी काढा.", subtitle: "एक चित्र, एक क्लिक. व्यक्ती आणि उत्पादनांवर लक्ष केंद्रित करा." },
  pcm: { name: "Background Remover", description: "Remove image background for your browser and download transparent PNG.", eyebrow: "Image tools", heading: "Keep subject. Remove background.", subtitle: "One image, one click. Make people and product stand out." },
  pt: { name: "Removedor de fundo", description: "Remova fundos de imagens no navegador e baixe um PNG transparente.", eyebrow: "Ferramentas de imagem", heading: "Mantenha o assunto. Remova o fundo.", subtitle: "Uma imagem, um clique. Dê foco a pessoas e produtos." },
  ru: { name: "Удаление фона", description: "Удаляйте фон изображений в браузере и скачивайте прозрачный PNG.", eyebrow: "Инструменты для изображений", heading: "Сохраните объект. Удалите фон.", subtitle: "Одно изображение, один щелчок. Выделите людей и товары." },
  ta: { name: "பின்புல நீக்கி", description: "உலாவியிலேயே படப் பின்புலத்தை நீக்கி, வெளிப்படையான PNG-ஐப் பதிவிறக்குங்கள்.", eyebrow: "படக் கருவிகள்", heading: "முதன்மைப் பொருளை வைத்திருங்கள். பின்புலத்தை நீக்குங்கள்.", subtitle: "ஒரு படம், ஒரு கிளிக். மனிதர்கள் மற்றும் தயாரிப்புகளுக்கு கவனம் கொடுங்கள்." },
  te: { name: "బ్యాక్‌గ్రౌండ్ రిమూవర్", description: "బ్రౌజర్‌లో చిత్ర నేపథ్యాన్ని తొలగించి పారదర్శక PNGని డౌన్‌లోడ్ చేయండి.", eyebrow: "చిత్ర సాధనాలు", heading: "విషయాన్ని ఉంచండి. నేపథ్యాన్ని తొలగించండి.", subtitle: "ఒక చిత్రం, ఒక క్లిక్. వ్యక్తులు మరియు ఉత్పత్తులపై దృష్టి పెట్టండి." },
  tr: { name: "Arka Plan Kaldırıcı", description: "Görüntü arka planlarını tarayıcınızda kaldırın ve şeffaf PNG indirin.", eyebrow: "Görüntü araçları", heading: "Özneyi koruyun. Arka planı kaldırın.", subtitle: "Bir görsel, tek tıklama. Kişileri ve ürünleri öne çıkarın." },
  ur: { name: "پس منظر ہٹائیں", description: "براؤزر میں تصویر کا پس منظر ہٹائیں اور شفاف PNG ڈاؤن لوڈ کریں۔", eyebrow: "تصویری اوزار", heading: "موضوع برقرار رکھیں۔ پس منظر ہٹائیں۔", subtitle: "ایک تصویر، ایک کلک۔ لوگوں اور مصنوعات کو نمایاں کریں۔" },
  vi: { name: "Xóa nền ảnh", description: "Xóa nền ảnh ngay trong trình duyệt và tải xuống PNG trong suốt.", eyebrow: "Công cụ hình ảnh", heading: "Giữ chủ thể. Xóa nền.", subtitle: "Một ảnh, một cú nhấp. Đưa con người và sản phẩm vào trọng tâm." },
};

const allLocales = ["en", "zh", ...Object.keys(locales)];
const translationPath = path.join(root, "scripts", "background-remover-translations.json");
const translations = fs.existsSync(translationPath) ? JSON.parse(fs.readFileSync(translationPath, "utf8")) : {};
const sourceText = JSON.parse(fs.readFileSync(path.join(root, "scripts/background-remover-source.json"), "utf8"));
translations.pcm = pidginTranslations(sourceText.strings);
const previewUpdate = 'Edits on the original update this preview instantly';
const pan = '✥ Pan';
const copyCorrections = {
  ar: { [pan]: '✥ تحريك العرض', [previewUpdate]: 'تظهر التعديلات التي تجريها على الصورة الأصلية فورًا في هذه المعاينة.', 'Export a polished transparent PNG': 'تصدير صورة PNG شفافة', 'Fine AI removal (trial)': 'إزالة الخلفية باستخدام Fine AI (تجريبي)' },
  bn: { [pan]: '✥ দৃশ্য সরান', [previewUpdate]: 'মূল ছবিতে করা পরিবর্তন এই প্রিভিউতে সঙ্গে সঙ্গে দেখা যাবে।', 'Clipboard image.[[1]]': 'ক্লিপবোর্ডের ছবি.[[1]]' },
  de: { [pan]: '✥ Ansicht verschieben', [previewUpdate]: 'Änderungen am Originalbild erscheinen sofort in dieser Vorschau.', 'Utility Tools': 'Hilfsprogramme', '01 / Upload': '01 / Hochladen', '03 / Download': '03 / Herunterladen', 'Breadcrumb': 'Navigationspfad' },
  es: { [pan]: '✥ Desplazar vista', [previewUpdate]: 'Los cambios en la imagen original aparecen al instante en esta vista previa.', 'Breadcrumb': 'Ruta de navegación' },
  fr: { [pan]: '✥ Déplacer la vue', [previewUpdate]: 'Les modifications de l’image d’origine apparaissent aussitôt dans cet aperçu.' },
  hi: { [pan]: '✥ दृश्य खिसकाएँ', [previewUpdate]: 'मूल छवि में किए गए बदलाव तुरंत इस पूर्वावलोकन में दिखाई देते हैं।' },
  id: { [pan]: '✥ Geser tampilan', [previewUpdate]: 'Perubahan pada gambar asli langsung muncul di pratinjau ini.' },
  ko: { [pan]: '✥ 화면 이동', [previewUpdate]: '원본 이미지의 수정 사항이 이 미리 보기에 즉시 반영됩니다.' },
  mr: { [pan]: '✥ दृश्य हलवा', [previewUpdate]: 'मूळ प्रतिमेतील बदल या पूर्वावलोकनात लगेच दिसतात.', '[[1]] · [[2]] × [[3]]': '[[1]] · [[2]] × [[3]]' },
  pt: { [pan]: '✥ Mover vista', [previewUpdate]: 'As alterações na imagem original aparecem imediatamente nesta pré-visualização.', 'Utility Tools': 'Ferramentas úteis', '01 / Upload': '01 / Carregar', '03 / Download': '03 / Transferir', 'Background color [[1]]': 'Cor de fundo [[1]]' },
  ru: { [pan]: '✥ Переместить вид', [previewUpdate]: 'Изменения исходного изображения сразу появляются в этом предварительном просмотре.' },
  ta: { [pan]: '✥ காட்சியை நகர்த்து', [previewUpdate]: 'அசல் படத்தில் செய்யும் மாற்றங்கள் உடனடியாக இந்த முன்னோட்டத்தில் தோன்றும்.' },
  te: { [pan]: '✥ వీక్షణను జరపండి', [previewUpdate]: 'అసలు చిత్రంలో చేసిన మార్పులు వెంటనే ఈ ప్రివ్యూలో కనిపిస్తాయి.' },
  tr: { [pan]: '✥ Görünümü kaydır', [previewUpdate]: 'Orijinal görüntüdeki değişiklikler bu önizlemede anında görünür.', 'Breadcrumb': 'Gezinti yolu' },
  ur: { [pan]: '✥ منظر کو حرکت دیں', [previewUpdate]: 'اصل تصویر میں کی گئی تبدیلیاں فوراً اس پیش منظر میں دکھائی دیتی ہیں۔' },
  vi: { [pan]: '✥ Di chuyển khung nhìn', [previewUpdate]: 'Các thay đổi trên ảnh gốc xuất hiện ngay trong bản xem trước này.', 'Breadcrumb': 'Đường dẫn điều hướng' },
};
for (const [locale, corrections] of Object.entries(copyCorrections)) Object.assign(translations[locale] ||= {}, corrections);
const languageNames = {
  en: "English", zh: "简体中文", vi: "Tiếng Việt", ja: "日本語", ko: "한국어", hi: "हिन्दी",
  es: "Español", fr: "Français", ar: "العربية", bn: "বাংলা", pt: "Português", ru: "Русский",
  ur: "اردو", id: "Bahasa Indonesia", de: "Deutsch", pcm: "Naijá", mr: "मराठी", te: "తెలుగు",
  tr: "Türkçe", ta: "தமிழ்",
};
const homeLabels = {
  ar: 'الرئيسية', bn: 'হোম', de: 'Startseite', es: 'Inicio', fr: 'Accueil', hi: 'होम',
  id: 'Beranda', ja: 'ホーム', ko: '홈', mr: 'मुख्यपृष्ठ', pcm: 'Home', pt: 'Início',
  ru: 'Главная', ta: 'முகப்பு', te: 'హోమ్', tr: 'Ana Sayfa', ur: 'ہوم', vi: 'Trang chủ',
};
const panelLabels = {
  ar: ["تتم المعالجة محليًا", "معاينة وتنزيل", "تنزيل PNG", "شفاف دائمًا."],
  bn: ["স্থানীয়ভাবে প্রক্রিয়াকৃত", "প্রিভিউ ও ডাউনলোড", "PNG ডাউনলোড", "সর্বদা স্বচ্ছ।"],
  de: ["Lokal verarbeitet", "Vorschau & Download", "PNG herunterladen", "Immer transparent."],
  es: ["Procesado localmente", "Vista previa y descarga", "Descargar PNG", "Siempre transparente."],
  fr: ["Traité localement", "Aperçu et téléchargement", "Télécharger le PNG", "Toujours transparent."],
  hi: ["स्थानीय रूप से संसाधित", "पूर्वावलोकन और डाउनलोड", "PNG डाउनलोड करें", "हमेशा पारदर्शी।"],
  id: ["Diproses secara lokal", "Pratinjau & unduh", "Unduh PNG", "Selalu transparan."],
  ja: ["ローカルで処理", "プレビューとダウンロード", "PNG をダウンロード", "常に透明です。"],
  ko: ["로컬에서 처리됨", "미리 보기 및 다운로드", "PNG 다운로드", "항상 투명합니다."],
  mr: ["स्थानिक पातळीवर प्रक्रिया", "पूर्वावलोकन व डाउनलोड", "PNG डाउनलोड करा", "नेहमी पारदर्शक."],
  pcm: ["E dey process for your device", "Preview and download", "Download PNG", "E dey transparent always."],
  pt: ["Processado localmente", "Pré-visualizar e baixar", "Baixar PNG", "Sempre transparente."],
  ru: ["Обрабатывается локально", "Предпросмотр и скачивание", "Скачать PNG", "Всегда прозрачно."],
  ta: ["உள்ளூரில் செயலாக்கப்பட்டது", "முன்னோட்டம் மற்றும் பதிவிறக்கம்", "PNG பதிவிறக்கு", "எப்போதும் வெளிப்படையானது."],
  te: ["స్థానికంగా ప్రాసెస్ చేయబడింది", "ప్రివ్యూ మరియు డౌన్‌లోడ్", "PNG డౌన్‌లోడ్ చేయండి", "ఎల్లప్పుడూ పారదర్శకం."],
  tr: ["Yerel olarak işlendi", "Önizleme ve indir", "PNG indir", "Her zaman şeffaf."],
  ur: ["مقامی طور پر پراسیس کیا گیا", "پیش منظر اور ڈاؤن لوڈ", "PNG ڈاؤن لوڈ کریں", "ہمیشہ شفاف۔"],
  vi: ["Xử lý cục bộ", "Xem trước và tải xuống", "Tải PNG", "Luôn trong suốt."],
};
const href = (locale) => `https://starryring.com/${locale}/${route}/`;

function alternateLinks(locale) {
  return [
    `  <link rel="canonical" href="${href(locale)}">`,
    ...allLocales.map((code) => `  <link rel="alternate" hreflang="${code === "pcm" ? "pcm-NG" : code}" href="${href(code)}">`),
    `  <link rel="alternate" hreflang="x-default" href="${href("en")}">`,
  ].join("\n");
}

function languageSwitcher(locale) {
  const options = allLocales.map((code) => {
    const selected = code === locale ? ' selected' : '';
    return `      <a class="language-option${selected}" href="/${code}/${route}/" data-lang="${code}">${languageNames[code]}</a>`;
  }).join("\n");
  return `  <div class="language-switcher">\n    <button class="language-trigger" id="languageTrigger" aria-label="Select language" aria-expanded="false">🌐</button>\n    <div class="language-dropdown" id="languageDropdown">\n${options}\n    </div>\n  </div>`;
}

function addLanguageSwitcher(html, locale) {
  let next = html;
  if (!next.includes('/static/css/shared/switchlanguage.css')) {
    next = next.replace('  <link rel="icon"', '  <link rel="stylesheet" href="/static/css/shared/switchlanguage.css">\n  <link rel="icon"');
  }
  const switcherPattern = /\s*<div class="language-switcher">[\s\S]*?<\/div>\s*<\/div>\s*(?=<main>)/;
  next = switcherPattern.test(next)
    ? next.replace(switcherPattern, `\n${languageSwitcher(locale)}\n  `)
    : next.replace('<body>', `<body>\n${languageSwitcher(locale)}`);
  if (!next.includes('/static/js/shared/switchlanguage.js')) {
    next = next.replace('</body>', '  <script src="/static/js/shared/switchlanguage.js"></script>\n</body>');
  }
  return next;
}

function localizeWithDictionary(html, dictionary) {
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const bodyStart = html.indexOf('<body>');
  if (bodyStart < 0) throw new Error('Background remover body not found');
  const head = html.slice(0, bodyStart);
  let body = html.slice(bodyStart).replace(/>([^<>]+)</g, (match, value) => {
    const trimmed = value.trim();
    const translated = dictionary[trimmed];
    if (!translated) return match;
    return `>${value.slice(0, value.indexOf(trimmed))}${escape(translated)}${value.slice(value.indexOf(trimmed) + trimmed.length)}<`;
  });
  body = body.replace(/(aria-label|title)="([^"]*)"/g, (match, name, value) =>
    dictionary[value] ? `${name}="${escape(dictionary[value])}"` : match);
  return head + body;
}

function addSeoMetadata(html, locale) {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
  const breadcrumb = html.match(/<nav class="breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  const home = breadcrumb?.match(/<span class="breadcrumb-home-label">([^<]+)<\/span>/)?.[1];
  const utility = breadcrumb?.match(/href="\/[^"]+\/utility-tools\/"[^>]*>[\s\S]*?<span>([^<]+)<\/span><\/a>/)?.[1];
  const current = breadcrumb?.match(/<span class="crumb-current" aria-current="page">([^<]+)<\/span>/)?.[1];
  if (![title, description, home, utility, current].every(Boolean)) throw new Error(`Missing SEO text for ${locale}`);
  const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: decode(home), item: `https://starryring.com/${locale}/` },
      { '@type': 'ListItem', position: 2, name: decode(utility), item: `https://starryring.com/${locale}/utility-tools/` },
      { '@type': 'ListItem', position: 3, name: decode(current), item: href(locale) },
    ],
  };
  const block = [
    '  <!-- Background Remover search and sharing metadata -->',
    '  <meta property="og:type" content="website">',
    '  <meta property="og:site_name" content="StarryRing">',
    `  <meta property="og:title" content="${title}">`,
    `  <meta property="og:description" content="${description}">`,
    `  <meta property="og:url" content="${href(locale)}">`,
    '  <meta name="twitter:card" content="summary">',
    `  <meta name="twitter:title" content="${title}">`,
    `  <meta name="twitter:description" content="${description}">`,
    `  <script type="application/ld+json">${JSON.stringify(breadcrumbData).replaceAll('<', '\\u003c')}</script>`,
    '  <!-- End Background Remover metadata -->',
  ].join('\n');
  const clean = html.replace(/  <!-- Background Remover search and sharing metadata -->[\s\S]*?  <!-- End Background Remover metadata -->\r?\n/, '');
  const descriptionTag = clean.match(/  <meta name="description" content="[^"]+">/)?.[0];
  return clean.replace(descriptionTag, `${descriptionTag}\n${block}`);
}

function pageFor(locale, copy) {
  let html = fs.readFileSync(path.join(root, "en", route, "index.html"), "utf8");
  html = html.replace('<html lang="en">', `<html lang="${locale}">`);
  html = html.replace(/  <link rel="canonical"[\s\S]*?  <link rel="alternate" hreflang="x-default"[^\n]*\n/, `${alternateLinks(locale)}\n`);
  html = html.replaceAll('href="/en/', `href="/${locale}/`);
  html = html.replace(/style\.css\?v=20261004-header-export-locales\d*|style\.css\?v=20261003-header-export-aligned3/, 'style.css?v=20261004-header-export-locales7');
  html = html.replace('<span class="breadcrumb-home-label">Home</span>', `<span class="breadcrumb-home-label">${homeLabels[locale]}</span>`);
  html = html.replace('Free Background Remover Online | StarryRing', `${copy.name} | StarryRing`);
  html = html.replace('Remove image backgrounds with Fine AI or manual brushes. Preview the cutout and download a transparent PNG. Images are processed in your browser.', copy.description);
  html = html.replace('<p class="eyebrow">Image tools</p><h1>Keep the subject. Remove the background<span>.</span></h1><p class="subtitle">One image, one click. Put people and products in focus.</p>', `<p class="eyebrow">${copy.eyebrow}</p><h1>${copy.heading}</h1><p class="subtitle">${copy.subtitle}</p>`);
  const [local, preview, download, transparent] = panelLabels[locale];
  html = html.replace('◈ Processed locally', `◈ ${local}`)
    .replace('Preview &amp; download', preview)
    .replace('Always transparent.', transparent)
    .replace('↓ Download PNG', `↓ ${download}`);
  html = html.replace('StarryRing · Background Remover', `StarryRing · ${copy.name}`);
  html = addLanguageSwitcher(html, locale);
  if (locale === "ja") {
    html = html.replace(/script-zh\.js\?v=[^"]+/, 'script-zh.js?v=20261004-ja-localized');
    return addSeoMetadata(localizeJapanesePage(html), locale);
  }
  if (translations[locale]) {
    html = html.replace(/script-zh\.js\?v=[^"]+/, 'script-zh.js?v=20261004-all-locales');
    return addSeoMetadata(localizeWithDictionary(html, translations[locale]), locale);
  }
  return addSeoMetadata(html, locale);
}

function writeRuntimeLocales() {
  const script = fs.readFileSync(path.join(root, 'static/js/utility-tools/design-media/background-remover/script-zh.js'), 'utf8');
  const marker = "const baseUi = language === 'en' ? ";
  const start = script.indexOf(marker) + marker.length;
  const end = script.indexOf('\n} : {', start) + 2;
  if (start < marker.length || end < start) throw new Error('Could not extract English Background Remover UI text');
  const englishUi = vm.runInNewContext(`(${script.slice(start, end)})`);
  const source = JSON.parse(fs.readFileSync(path.join(root, 'scripts/background-remover-source.json'), 'utf8'));
  const localized = (text, dictionary) => {
    const target = (dictionary[text] || text).replace(/\[\s*\[\s*(\d+)\s*\]\s*\]/g, '[[$1]]');
    const placeholders = [...text.matchAll(/\[\[(\d+)\]\]/g)].map(match => match[0]);
    return placeholders.every(placeholder => target.includes(placeholder)) ? target : text;
  };
  const messages = {};
  for (const [locale, dictionary] of Object.entries(translations)) {
    const copy = {};
    for (const [key, value] of Object.entries(englishUi)) {
      if (typeof value === 'string') copy[key] = localized(value, dictionary);
      else if (key in source.dynamicSources) {
        const template = source.dynamicSources[key];
        copy[key] = typeof template === 'string'
          ? localized(template, dictionary)
          : Object.fromEntries(Object.entries(template).map(([part, text]) => [part, localized(text, dictionary)]));
      }
    }
    copy.originalAiNotice = localized('Using Original AI to remove the background.', dictionary);
    copy.backgroundColor = localized('Background color [[1]]', dictionary);
    messages[locale] = copy;
  }
  const module = `// Generated from scripts/background-remover-translations.json.\nconst messages = ${JSON.stringify(messages, null, 2)};\nconst fill = (template, values) => template.replace(/\\[\\[(\\d+)\\]\\]/g, (_, index) => String(values[Number(index) - 1] ?? ''));\nexport function getOtherUi(locale) {\n  const copy = messages[locale];\n  if (!copy) return null;\n  return { ...copy,\n    syncedView: percent => fill(copy.syncedView, [percent]),\n    reloadImage: name => fill(copy.reloadImage, [name]),\n    removeHistory: name => fill(copy.removeHistory, [name]),\n    fileInfo: (name, width, height, resized) => fill(copy.fileInfo[resized ? 'resized' : 'normal'], [name, width, height]),\n    clipboardName: extension => fill(copy.clipboardName, [extension]),\n    downloadingModel: percent => fill(copy.downloadingModel, [percent]),\n    fineDownloading: progress => fill(copy.fineDownloading, [progress]),\n    detectedBackground: kind => copy.detectedBackground[kind],\n    exportName: name => fill(copy.exportName, [name]),\n    backgroundColor: hex => fill(copy.backgroundColor, [hex]),\n  };\n}\n`;
  fs.writeFileSync(path.join(root, 'static/js/utility-tools/design-media/background-remover/locale-other.js'), module, 'utf8');
}

function syncSitemap() {
  const lastmod = '2026-10-05'; // Update when this route changes substantially.
  const sitemapPath = path.join(root, 'sitemap-utility-tools.xml');
  let sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const newline = sitemap.includes('\r\n') ? '\r\n' : '\n';
  const lines = ['  <!-- Background Remover route -->'];
  for (const locale of allLocales) {
    lines.push('  <url>', `    <loc>${href(locale)}</loc>`);
    for (const alternate of allLocales) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="${alternate === 'pcm' ? 'pcm-NG' : alternate}" href="${href(alternate)}" />`);
    }
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${href('en')}" />`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`, '    <changefreq>weekly</changefreq>', '    <priority>0.7</priority>', '  </url>');
  }
  lines.push('  <!-- End Background Remover route -->');
  sitemap = sitemap.replace(/  <!-- Background Remover route -->[\s\S]*?  <!-- End Background Remover route -->\r?\n/, '');
  if (sitemap.includes(`<loc>${href('en')}</loc>`)) throw new Error('Unmanaged Background Remover sitemap entries already exist');
  sitemap = sitemap.replace('</urlset>', `${lines.join(newline)}${newline}</urlset>`);
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');

  const indexPath = path.join(root, 'sitemap.xml');
  const index = fs.readFileSync(indexPath, 'utf8').replace(
    /(<loc>https:\/\/starryring\.com\/sitemap-utility-tools\.xml<\/loc>\s*<lastmod>)([^<]+)/,
    (_, prefix, previousDate) => `${prefix}${previousDate > lastmod ? previousDate : lastmod}`,
  );
  fs.writeFileSync(indexPath, index, 'utf8');
}

function addToolCard(locale, copy) {
  const file = path.join(root, locale, "utility-tools", "index.html");
  let html = fs.readFileSync(file, "utf8");
  if (html.includes(`/${locale}/${route}/`)) return;
  const imageConverter = new RegExp(`(<a[^>]+href="/${locale}/utility-tools/design-media/image-converter/"[\\s\\S]*?</a>)`);
  const card = `\n<a class="tool-card" href="/${locale}/${route}/">\n<div class="icon-wrapper"><i data-lucide="wand-sparkles"></i></div>\n<h3>${copy.name}</h3>\n<p>${copy.description}</p>\n<div class="tool-card-footer"><span class="tool-tag">Image</span><div class="arrow-icon"><i data-lucide="arrow-right"></i></div></div>\n</a>`;
  if (!imageConverter.test(html)) throw new Error(`Image converter card not found for ${locale}`);
  html = html.replace(imageConverter, `$1${card}`);
  fs.writeFileSync(file, html, "utf8");
}

for (const [locale, copy] of Object.entries(locales)) {
  const destination = path.join(root, locale, route, "index.html");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, pageFor(locale, copy), "utf8");
  addToolCard(locale, copy);
}

for (const locale of ["en", "zh"]) {
  const file = path.join(root, locale, route, "index.html");
  let html = fs.readFileSync(file, "utf8")
    .replace(/style\.css\?v=20261004-header-export-locales\d*|style\.css\?v=20261003-header-export-aligned3/, 'style.css?v=20261004-header-export-locales7')
    .replace(/script-zh\.js\?v=[^"]+/, 'script-zh.js?v=20261004-all-locales');
  const alternatePattern = /  <link rel="canonical"[\s\S]*?  <link rel="alternate" hreflang="x-default"[^\n]*\n/;
  html = alternatePattern.test(html)
    ? html.replace(alternatePattern, `${alternateLinks(locale)}\n`)
    : html.replace('  <link rel="icon"', `${alternateLinks(locale)}\n  <link rel="icon"`);
  html = addLanguageSwitcher(html, locale);
  fs.writeFileSync(file, addSeoMetadata(html, locale), "utf8");
}

if (Object.keys(translations).length) writeRuntimeLocales();
syncSitemap();

console.log(`Added ${Object.keys(locales).length} localized background remover routes.`);
