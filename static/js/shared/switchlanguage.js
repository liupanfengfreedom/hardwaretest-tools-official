// 获取DOM元素
const languageTrigger = document.getElementById('languageTrigger');
const languageDropdown = document.getElementById('languageDropdown');

const LANGUAGE_FLAGS = {
    zh: { countryCode: "CN", src: "https://flagcdn.com/w40/cn.png" },
    en: { countryCode: "US", src: "https://flagcdn.com/w40/us.png" },
    vi: { countryCode: "VN", src: "https://flagcdn.com/w40/vn.png" },
    ja: { countryCode: "JP", src: "https://flagcdn.com/w40/jp.png" },
    ko: { countryCode: "KR", src: "https://flagcdn.com/w40/kr.png" },
    hi: { countryCode: "IN", src: "https://flagcdn.com/w40/in.png" },
    es: { countryCode: "ES", src: "https://flagcdn.com/w40/es.png" },
    fr: { countryCode: "FR", src: "https://flagcdn.com/w40/fr.png" },
    ar: { countryCode: "SA", src: "https://flagcdn.com/w40/sa.png" },
    bn: { countryCode: "BD", src: "https://flagcdn.com/w40/bd.png" },
    pt: { countryCode: "PT", src: "https://flagcdn.com/w40/pt.png" },
    ru: { countryCode: "RU", src: "https://flagcdn.com/w40/ru.png" },
    ur: { countryCode: "PK", src: "https://flagcdn.com/w40/pk.png" },
    id: { countryCode: "ID", src: "https://flagcdn.com/w40/id.png" },
    de: { countryCode: "DE", src: "https://flagcdn.com/w40/de.png" },
    pcm: { countryCode: "NG", src: "https://flagcdn.com/w40/ng.png" },
    mr: { countryCode: "IN", src: "https://flagcdn.com/w40/in.png" },
    te: { countryCode: "IN", src: "https://flagcdn.com/w40/in.png" },
    tr: { countryCode: "TR", src: "https://flagcdn.com/w40/tr.png" },
    ta: { countryCode: "IN", src: "https://flagcdn.com/w40/in.png" }
};

function decorateLanguageOptions() {
    if (!languageDropdown) return;

    const options = languageDropdown.querySelectorAll('.language-option');
    options.forEach((option) => {
        const langCode = option.dataset.lang;
        const flag = LANGUAGE_FLAGS[langCode];
        if (!flag || option.querySelector('.language-flag')) return;

        const label = option.textContent.trim();
        option.textContent = '';

        const textWrap = document.createElement('span');
        textWrap.className = 'language-option-text';

        const codeSpan = document.createElement('span');
        codeSpan.className = 'language-code';
        codeSpan.textContent = flag.countryCode;

        const flagImg = document.createElement('img');
        flagImg.className = 'language-flag';
        flagImg.setAttribute('aria-hidden', 'true');
        flagImg.setAttribute('alt', '');
        flagImg.setAttribute('loading', 'lazy');
        flagImg.setAttribute('decoding', 'async');
        flagImg.src = flag.src;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'language-label';
        labelSpan.textContent = label;

        textWrap.appendChild(codeSpan);
        textWrap.appendChild(labelSpan);

        option.appendChild(textWrap);
        option.appendChild(flagImg);
    });
}

function decorateLanguageTrigger() {
    if (!languageTrigger || !languageDropdown) return;

    const currentOption =
        languageDropdown.querySelector('.language-option.selected') ||
        Array.from(languageDropdown.querySelectorAll('.language-option')).find((option) =>
            option.getAttribute('href') === window.location.pathname ||
            option.getAttribute('href') === `${window.location.pathname}/`
        );

    if (!currentOption) return;

    const langCode = currentOption.dataset.lang;
    const flag = LANGUAGE_FLAGS[langCode];
    if (!flag) return;

    languageTrigger.classList.add('has-current-language');
    languageTrigger.innerHTML = '';

    const flagImg = document.createElement('img');
    flagImg.className = 'language-current-flag';
    flagImg.setAttribute('aria-hidden', 'true');
    flagImg.setAttribute('alt', '');
    flagImg.setAttribute('loading', 'eager');
    flagImg.setAttribute('decoding', 'async');
    flagImg.src = flag.src;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'language-current-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = '🌐';

    languageTrigger.appendChild(flagImg);
    languageTrigger.appendChild(iconSpan);
}

// 切换下拉菜单的显示/隐藏
function toggleDropdown() {
    if (!languageDropdown) return;
    const isOpen = languageDropdown.classList.contains('show');
    
    if (isOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

// 打开下拉菜单
function openDropdown() {
    if (!languageDropdown) return;
    languageDropdown.classList.add('show');
}

// 关闭下拉菜单
function closeDropdown() {
    if (!languageDropdown) return;
    languageDropdown.classList.remove('show');
}

// 事件监听（仅在语言切换器存在时绑定）
if (languageTrigger && languageDropdown) {
    decorateLanguageOptions();
    decorateLanguageTrigger();

    languageTrigger.addEventListener('click', function(e) {
        e.preventDefault();
        toggleDropdown();
    });
    
    // 点击页面其他区域关闭下拉菜单
    document.addEventListener('click', function(e) {
        if (!languageTrigger.contains(e.target) && !languageDropdown.contains(e.target)) {
            closeDropdown();
        }
    });
}

// 不需要设置选中状态，因为HTML中已经写死了
