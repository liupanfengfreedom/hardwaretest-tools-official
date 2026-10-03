import fs from "node:fs";
import path from "node:path";

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

function pageFor(locale, copy) {
  let html = fs.readFileSync(path.join(root, "en", route, "index.html"), "utf8");
  html = html.replace('<html lang="en">', `<html lang="${locale}">`);
  html = html.replace(/  <link rel="canonical"[\s\S]*?  <link rel="alternate" hreflang="x-default"[^\n]*\n/, `${alternateLinks(locale)}\n`);
  html = html.replaceAll('href="/en/', `href="/${locale}/`);
  html = html.replace('style.css?v=20261003-header-export-aligned3', 'style.css?v=20261004-header-export-locales');
  html = html.replace('Remove Background from Images Online | StarryRing', `${copy.name} | StarryRing`);
  html = html.replace('Remove image backgrounds in your browser, refine the cutout by hand, and download a transparent PNG. Your images stay on your device.', copy.description);
  html = html.replace('<p class="eyebrow">Image tools</p><h1>Keep the subject. Remove the background<span>.</span></h1><p class="subtitle">One image, one click. Put people and products in focus.</p>', `<p class="eyebrow">${copy.eyebrow}</p><h1>${copy.heading}</h1><p class="subtitle">${copy.subtitle}</p>`);
  const [local, preview, download, transparent] = panelLabels[locale];
  html = html.replace('◈ Processed locally', `◈ ${local}`)
    .replace('Preview &amp; download', preview)
    .replace('Always transparent.', transparent)
    .replace('↓ Download PNG', `↓ ${download}`);
  html = html.replace('StarryRing · Background Remover', `StarryRing · ${copy.name}`);
  return html;
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
    .replace('style.css?v=20261003-header-export-aligned3', 'style.css?v=20261004-header-export-locales');
  const alternatePattern = /  <link rel="canonical"[\s\S]*?  <link rel="alternate" hreflang="x-default"[^\n]*\n/;
  html = alternatePattern.test(html)
    ? html.replace(alternatePattern, `${alternateLinks(locale)}\n`)
    : html.replace('  <link rel="icon"', `${alternateLinks(locale)}\n  <link rel="icon"`);
  fs.writeFileSync(file, html, "utf8");
}

console.log(`Added ${Object.keys(locales).length} localized background remover routes.`);
