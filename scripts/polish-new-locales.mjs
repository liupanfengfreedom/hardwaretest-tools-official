import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_LOCALES = {
  es: {
    dir: "ltr",
    text: {
      "Select language": "Seleccionar idioma",
      "Continue to StarryRing": "Continuar a StarryRing",
      "Home": "Inicio",
      "Toolbox": "Caja de herramientas",
      "Utility Tools": "Herramientas utilitarias",
      "About Us": "Sobre nosotros",
      "Contact Us": "Contáctanos",
      "Disclaimer": "Descargo de responsabilidad",
      "Privacy Policy": "Política de privacidad",
      "Terms of Service": "Términos del servicio",
      "Loading...": "Cargando...",
      "Search tool name or function...": "Busca el nombre o la función de la herramienta...",
      "Type a keyword to quickly find the tool you need": "Escribe una palabra clave para encontrar rápido la herramienta que necesitas",
      "Design & Media": "Diseño y multimedia",
      "Math & Calculation": "Matemáticas y cálculo",
      "Contact · Starry Ring": "Contacto · StarryRing",
      "Stay in Touch 🛰️": "Mantente en contacto 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – probador de entrada para jugadores y desarrolladores"
    }
  },
  fr: {
    dir: "ltr",
    text: {
      "Select language": "Sélectionner la langue",
      "Continue to StarryRing": "Continuer vers StarryRing",
      "Home": "Accueil",
      "Toolbox": "Boîte à outils",
      "Utility Tools": "Outils utilitaires",
      "About Us": "À propos",
      "Contact Us": "Contactez-nous",
      "Disclaimer": "Avertissement",
      "Privacy Policy": "Politique de confidentialité",
      "Terms of Service": "Conditions d'utilisation",
      "Loading...": "Chargement...",
      "Search tool name or function...": "Rechercher un outil ou une fonction...",
      "Type a keyword to quickly find the tool you need": "Saisissez un mot-clé pour trouver rapidement l'outil dont vous avez besoin",
      "Design & Media": "Design et médias",
      "Math & Calculation": "Maths et calcul",
      "Contact · Starry Ring": "Contact · StarryRing",
      "Stay in Touch 🛰️": "Restons en contact 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – testeur d'entrée pour joueurs et développeurs"
    }
  },
  ar: {
    dir: "rtl",
    text: {
      "Select language": "اختيار اللغة",
      "Continue to StarryRing": "المتابعة إلى StarryRing",
      "Home": "الرئيسية",
      "Toolbox": "صندوق الأدوات",
      "Utility Tools": "أدوات مساعدة",
      "About Us": "من نحن",
      "Contact Us": "اتصل بنا",
      "Disclaimer": "إخلاء المسؤولية",
      "Privacy Policy": "سياسة الخصوصية",
      "Terms of Service": "شروط الخدمة",
      "Loading...": "جارٍ التحميل...",
      "Search tool name or function...": "ابحث عن اسم الأداة أو وظيفتها...",
      "Type a keyword to quickly find the tool you need": "اكتب كلمة مفتاحية للعثور سريعًا على الأداة التي تحتاجها",
      "Design & Media": "التصميم والوسائط",
      "Math & Calculation": "الرياضيات والحساب",
      "Contact · Starry Ring": "اتصل · StarryRing",
      "Stay in Touch 🛰️": "ابقَ على تواصل 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – أداة اختبار الإدخال للاعبين والمطورين"
    }
  },
  bn: {
    dir: "ltr",
    text: {
      "Select language": "ভাষা নির্বাচন করুন",
      "Continue to StarryRing": "StarryRing-এ যান",
      "Home": "হোম",
      "Toolbox": "টুলবক্স",
      "Utility Tools": "ইউটিলিটি টুলস",
      "About Us": "আমাদের সম্পর্কে",
      "Contact Us": "যোগাযোগ করুন",
      "Disclaimer": "দায়স্বীকার",
      "Privacy Policy": "গোপনীয়তা নীতি",
      "Terms of Service": "সেবার শর্তাবলি",
      "Loading...": "লোড হচ্ছে...",
      "Search tool name or function...": "টুলের নাম বা কাজ খুঁজুন...",
      "Type a keyword to quickly find the tool you need": "দ্রুত খুঁজতে একটি কীওয়ার্ড লিখুন",
      "Design & Media": "ডিজাইন ও মিডিয়া",
      "Math & Calculation": "গণিত ও হিসাব",
      "Contact · Starry Ring": "যোগাযোগ · StarryRing",
      "Stay in Touch 🛰️": "যোগাযোগে থাকুন 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – গেমার ও ডেভেলপারদের জন্য ইনপুট টেস্টার"
    }
  },
  pt: {
    dir: "ltr",
    text: {
      "Select language": "Selecionar idioma",
      "Continue to StarryRing": "Continuar para StarryRing",
      "Home": "Início",
      "Toolbox": "Caixa de ferramentas",
      "Utility Tools": "Ferramentas utilitárias",
      "About Us": "Sobre nós",
      "Contact Us": "Contate-nos",
      "Disclaimer": "Aviso legal",
      "Privacy Policy": "Política de privacidade",
      "Terms of Service": "Termos de serviço",
      "Loading...": "Carregando...",
      "Search tool name or function...": "Pesquise o nome ou a função da ferramenta...",
      "Type a keyword to quickly find the tool you need": "Digite uma palavra-chave para encontrar rapidamente a ferramenta que você precisa",
      "Design & Media": "Design e mídia",
      "Math & Calculation": "Matemática e cálculo",
      "Contact · Starry Ring": "Contato · StarryRing",
      "Stay in Touch 🛰️": "Fique em contato 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – testador de entrada para jogadores e desenvolvedores"
    }
  },
  ru: {
    dir: "ltr",
    text: {
      "Select language": "Выбрать язык",
      "Continue to StarryRing": "Перейти в StarryRing",
      "Home": "Главная",
      "Toolbox": "Набор инструментов",
      "Utility Tools": "Полезные инструменты",
      "About Us": "О нас",
      "Contact Us": "Связаться с нами",
      "Disclaimer": "Отказ от ответственности",
      "Privacy Policy": "Политика конфиденциальности",
      "Terms of Service": "Условия использования",
      "Loading...": "Загрузка...",
      "Search tool name or function...": "Найдите инструмент или функцию...",
      "Type a keyword to quickly find the tool you need": "Введите ключевое слово, чтобы быстро найти нужный инструмент",
      "Design & Media": "Дизайн и медиа",
      "Math & Calculation": "Математика и расчёты",
      "Contact · Starry Ring": "Контакты · StarryRing",
      "Stay in Touch 🛰️": "Оставайтесь на связи 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – тестер ввода для игроков и разработчиков"
    }
  },
  ur: {
    dir: "rtl",
    text: {
      "Select language": "زبان منتخب کریں",
      "Continue to StarryRing": "StarryRing پر جائیں",
      "Home": "ہوم",
      "Toolbox": "ٹول باکس",
      "Utility Tools": "یوٹیلٹی ٹولز",
      "About Us": "ہمارے بارے میں",
      "Contact Us": "ہم سے رابطہ کریں",
      "Disclaimer": "دستبرداری",
      "Privacy Policy": "رازداری کی پالیسی",
      "Terms of Service": "سروس کی شرائط",
      "Loading...": "لوڈ ہو رہا ہے...",
      "Search tool name or function...": "ٹول کا نام یا فنکشن تلاش کریں...",
      "Type a keyword to quickly find the tool you need": "جلدی تلاش کے لیے کلیدی لفظ لکھیں",
      "Design & Media": "ڈیزائن اور میڈیا",
      "Math & Calculation": "ریاضی اور حساب",
      "Contact · Starry Ring": "رابطہ · StarryRing",
      "Stay in Touch 🛰️": "رابطے میں رہیں 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – گیمرز اور ڈویلپرز کے لیے اِن پٹ ٹیسٹر"
    }
  },
  id: {
    dir: "ltr",
    text: {
      "Select language": "Pilih bahasa",
      "Continue to StarryRing": "Lanjut ke StarryRing",
      "Home": "Beranda",
      "Toolbox": "Kotak perkakas",
      "Utility Tools": "Alat utilitas",
      "About Us": "Tentang Kami",
      "Contact Us": "Hubungi Kami",
      "Disclaimer": "Penafian",
      "Privacy Policy": "Kebijakan Privasi",
      "Terms of Service": "Syarat Layanan",
      "Loading...": "Memuat...",
      "Search tool name or function...": "Cari nama atau fungsi alat...",
      "Type a keyword to quickly find the tool you need": "Ketik kata kunci untuk cepat menemukan alat yang Anda butuhkan",
      "Design & Media": "Desain & Media",
      "Math & Calculation": "Matematika & Perhitungan",
      "Contact · Starry Ring": "Kontak · StarryRing",
      "Stay in Touch 🛰️": "Tetap terhubung 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – penguji input untuk gamer dan pengembang"
    }
  },
  de: {
    dir: "ltr",
    text: {
      "Select language": "Sprache auswählen",
      "Continue to StarryRing": "Weiter zu StarryRing",
      "Home": "Startseite",
      "Toolbox": "Werkzeugkasten",
      "Utility Tools": "Dienstprogramme",
      "About Us": "Über uns",
      "Contact Us": "Kontakt",
      "Disclaimer": "Haftungsausschluss",
      "Privacy Policy": "Datenschutzrichtlinie",
      "Terms of Service": "Nutzungsbedingungen",
      "Loading...": "Wird geladen...",
      "Search tool name or function...": "Werkzeugnamen oder Funktion suchen...",
      "Type a keyword to quickly find the tool you need": "Geben Sie ein Stichwort ein, um das gewünschte Werkzeug schnell zu finden",
      "Design & Media": "Design & Medien",
      "Math & Calculation": "Mathematik & Berechnungen",
      "Contact · Starry Ring": "Kontakt · StarryRing",
      "Stay in Touch 🛰️": "Bleiben Sie in Kontakt 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – Eingabetester für Spieler und Entwickler"
    }
  },
  pcm: {
    dir: "ltr",
    text: {
      "Select language": "Choose language",
      "Continue to StarryRing": "Continue go StarryRing",
      "Home": "Home",
      "Toolbox": "Toolbox",
      "Utility Tools": "Utility Tools",
      "About Us": "About Us",
      "Contact Us": "Contact Us",
      "Disclaimer": "Disclaimer",
      "Privacy Policy": "Privacy Policy",
      "Terms of Service": "Terms of Service",
      "Loading...": "Dey load...",
      "Search tool name or function...": "Search tool name or wetin e dey do...",
      "Type a keyword to quickly find the tool you need": "Type keyword make you quick find di tool wey you need",
      "Design & Media": "Design & Media",
      "Math & Calculation": "Math & Calculation",
      "Contact · Starry Ring": "Contact · StarryRing",
      "Stay in Touch 🛰️": "Make we dey in touch 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – input tester for gamers and developers"
    }
  },
  mr: {
    dir: "ltr",
    text: {
      "Select language": "भाषा निवडा",
      "Continue to StarryRing": "StarryRing कडे जा",
      "Home": "मुख्यपृष्ठ",
      "Toolbox": "टूलबॉक्स",
      "Utility Tools": "उपयुक्त साधने",
      "About Us": "आमच्याबद्दल",
      "Contact Us": "संपर्क करा",
      "Disclaimer": "अस्वीकरण",
      "Privacy Policy": "गोपनीयता धोरण",
      "Terms of Service": "सेवा अटी",
      "Loading...": "लोड होत आहे...",
      "Search tool name or function...": "साधनाचे नाव किंवा कार्य शोधा...",
      "Type a keyword to quickly find the tool you need": "तुम्हाला हवे असलेले साधन पटकन शोधण्यासाठी कीवर्ड टाइप करा",
      "Design & Media": "डिझाइन आणि मीडिया",
      "Math & Calculation": "गणित आणि गणना",
      "Contact · Starry Ring": "संपर्क · StarryRing",
      "Stay in Touch 🛰️": "संपर्कात रहा 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – गेमर्स आणि डेव्हलपर्ससाठी इनपुट टेस्टर"
    }
  },
  te: {
    dir: "ltr",
    text: {
      "Select language": "భాషను ఎంచుకోండి",
      "Continue to StarryRing": "StarryRing కు కొనసాగండి",
      "Home": "హోమ్",
      "Toolbox": "టూల్‌బాక్స్",
      "Utility Tools": "ఉపయోగకరమైన సాధనాలు",
      "About Us": "మా గురించి",
      "Contact Us": "సంప్రదించండి",
      "Disclaimer": "నిరాకరణ ప్రకటన",
      "Privacy Policy": "గోప్యతా విధానం",
      "Terms of Service": "సేవా నిబంధనలు",
      "Loading...": "లోడ్ అవుతోంది...",
      "Search tool name or function...": "సాధనం పేరు లేదా ఫంక్షన్ కోసం వెతకండి...",
      "Type a keyword to quickly find the tool you need": "మీకు కావలసిన సాధనాన్ని త్వరగా కనుగొనడానికి కీలక పదాన్ని టైప్ చేయండి",
      "Design & Media": "డిజైన్ & మీడియా",
      "Math & Calculation": "గణితం & లెక్కలు",
      "Contact · Starry Ring": "సంప్రదింపు · StarryRing",
      "Stay in Touch 🛰️": "సంప్రదింపులో ఉండండి 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – గేమర్‌లు మరియు డెవలపర్‌ల కోసం ఇన్‌పుట్ టెస్టర్"
    }
  },
  tr: {
    dir: "ltr",
    text: {
      "Select language": "Dil seçin",
      "Continue to StarryRing": "StarryRing'e devam et",
      "Home": "Ana Sayfa",
      "Toolbox": "Araç Kutusu",
      "Utility Tools": "Yardımcı Araçlar",
      "About Us": "Hakkımızda",
      "Contact Us": "Bize Ulaşın",
      "Disclaimer": "Sorumluluk Reddi",
      "Privacy Policy": "Gizlilik Politikası",
      "Terms of Service": "Hizmet Şartları",
      "Loading...": "Yükleniyor...",
      "Search tool name or function...": "Araç adı veya işlev ara...",
      "Type a keyword to quickly find the tool you need": "İhtiyacınız olan aracı hızlıca bulmak için anahtar kelime yazın",
      "Design & Media": "Tasarım ve Medya",
      "Math & Calculation": "Matematik ve Hesaplama",
      "Contact · Starry Ring": "İletişim · StarryRing",
      "Stay in Touch 🛰️": "Bağlantıda kalın 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – oyuncular ve geliştiriciler için giriş test aracı"
    }
  },
  ta: {
    dir: "ltr",
    text: {
      "Select language": "மொழியைத் தேர்ந்தெடுக்கவும்",
      "Continue to StarryRing": "StarryRing-க்கு தொடரவும்",
      "Home": "முகப்பு",
      "Toolbox": "கருவிப்பெட்டி",
      "Utility Tools": "பயன்பாட்டு கருவிகள்",
      "About Us": "எங்களைப் பற்றி",
      "Contact Us": "தொடர்புகொள்ளவும்",
      "Disclaimer": "பொறுப்புத்துறப்பு",
      "Privacy Policy": "தனியுரிமைக் கொள்கை",
      "Terms of Service": "சேவை விதிமுறைகள்",
      "Loading...": "ஏற்றப்படுகிறது...",
      "Search tool name or function...": "கருவி பெயர் அல்லது செயல்பாட்டைத் தேடுங்கள்...",
      "Type a keyword to quickly find the tool you need": "தேவைப்படும் கருவியை விரைவாகக் காண ஒரு முக்கிய சொல்லைத் தட்டச்சிடுங்கள்",
      "Design & Media": "வடிவமைப்பு மற்றும் மீடியா",
      "Math & Calculation": "கணிதம் மற்றும் கணக்கீடு",
      "Contact · Starry Ring": "தொடர்பு · StarryRing",
      "Stay in Touch 🛰️": "தொடர்பில் இருங்கள் 🛰️",
      "StarryRing – input tester for gamers & developers": "StarryRing – விளையாட்டாளர்கள் மற்றும் டெவலப்பர்களுக்கான உள்ளீட்டு சோதனையாளர்"
    }
  }
};

function safeEntries(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function applyLocale(locale, config) {
  const base = path.join(ROOT, locale);

  function walk(dir) {
    for (const entry of safeEntries(dir)) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile() || entry.name.toLowerCase() !== "index.html") {
        continue;
      }

      let html = fs.readFileSync(full, "utf8");
      html = html.replace(new RegExp(`<html lang="${locale}">`, "g"), `<html lang="${locale}"${config.dir === "rtl" ? ' dir="rtl"' : ""}>`);

      for (const [from, to] of Object.entries(config.text)) {
        html = html.split(from).join(to);
      }

      fs.writeFileSync(full, html, "utf8");
    }
  }

  walk(base);
}

for (const [locale, config] of Object.entries(TARGET_LOCALES)) {
  applyLocale(locale, config);
  console.log(`polished ${locale}`);
}
