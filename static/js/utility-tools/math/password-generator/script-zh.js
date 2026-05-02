const config = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~"
};

// 默认排除的字符
const defaultExclusions = {
    uppercase: [],  // 默认不排除大写字母
    lowercase: [],  // 默认不排除小写字母
    numbers: [],    // 默认不排除数字
    symbols: ["#", "!", "@"]  // 默认排除这三个特殊符号
};

// 当前排除的字符
let excludedChars = {
    uppercase: [...defaultExclusions.uppercase],
    lowercase: [...defaultExclusions.lowercase],
    numbers: [...defaultExclusions.numbers],
    symbols: [...defaultExclusions.symbols]
};

// DOM元素
const slider = document.getElementById('slider');
const lenDisplay = document.getElementById('len-display');
const output = document.getElementById('output');
const sBar = document.getElementById('strength-bar');
const sText = document.getElementById('strength-text');
const entropyValue = document.getElementById('entropy-value');
const crackTime = document.getElementById('crack-time');
const cBtn = document.getElementById('copy-btn');
const copyBtn2 = document.getElementById('copy-btn-2');
const toast = document.getElementById('copy-toast');
const generateBtn = document.getElementById('generate-btn');
const multipleBtn = document.getElementById('multiple-btn');
const generateText = document.getElementById('generate-text');
const generateIcon = document.getElementById('generate-icon');
const exportBtn = document.getElementById('export-btn');

// 新增：必须包含的开关元素
const reqUpper = document.getElementById('req-upper');
const reqLower = document.getElementById('req-lower');
const reqNumber = document.getElementById('req-number');
const reqSymbol = document.getElementById('req-symbol');

// 分析统计元素
const charCount = document.getElementById('char-count');
const upperCount = document.getElementById('upper-count');
const lowerCount = document.getElementById('lower-count');
const numberCount = document.getElementById('number-count');
const symbolCount = document.getElementById('symbol-count');
const poolSizeEl = document.getElementById('pool-size');
const excludedCountEl = document.getElementById('excluded-count');

// 历史记录
let passwordHistory = JSON.parse(localStorage.getItem('pwHistory') || '[]');
const maxHistory = 20;

// 预设配置
const presets = {
    high: { len: 16, up: true, lo: true, num: true, sym: true },
    mobile: { len: 12, up: true, lo: true, num: true, sym: false },
    pin: { len: 6, up: false, lo: false, num: true, sym: false },
    memorable: { len: 14, up: true, lo: true, num: true, sym: false }
};

// 初始化字符选择器
function initCharSelector() {
    // 生成大写字母
    const uppercaseContainer = document.getElementById('uppercase-chars');
    uppercaseContainer.innerHTML = '';
    for (let char of config.uppercase) {
        const charItem = document.createElement('div');
        charItem.className = `char-item ${excludedChars.uppercase.includes(char) ? 'excluded' : ''}`;
        charItem.textContent = char;
        charItem.dataset.type = 'uppercase';
        charItem.dataset.char = char;
        uppercaseContainer.appendChild(charItem);
    }

    // 生成小写字母
    const lowercaseContainer = document.getElementById('lowercase-chars');
    lowercaseContainer.innerHTML = '';
    for (let char of config.lowercase) {
        const charItem = document.createElement('div');
        charItem.className = `char-item ${excludedChars.lowercase.includes(char) ? 'excluded' : ''}`;
        charItem.textContent = char;
        charItem.dataset.type = 'lowercase';
        charItem.dataset.char = char;
        lowercaseContainer.appendChild(charItem);
    }

    // 生成数字
    const numberContainer = document.getElementById('number-chars');
    numberContainer.innerHTML = '';
    for (let char of config.numbers) {
        const charItem = document.createElement('div');
        charItem.className = `char-item ${excludedChars.numbers.includes(char) ? 'excluded' : ''}`;
        charItem.textContent = char;
        charItem.dataset.type = 'numbers';
        charItem.dataset.char = char;
        numberContainer.appendChild(charItem);
    }

    // 生成特殊符号
    const symbolContainer = document.getElementById('symbol-chars');
    symbolContainer.innerHTML = '';
    for (let char of config.symbols) {
        const charItem = document.createElement('div');
        charItem.className = `char-item ${excludedChars.symbols.includes(char) ? 'excluded' : ''}`;
        charItem.textContent = char;
        charItem.dataset.type = 'symbols';
        charItem.dataset.char = char;
        symbolContainer.appendChild(charItem);
    }
    
    updateExcludedCount();
}

// 切换字符排除状态
function toggleCharExclusion(type, char) {
    const index = excludedChars[type].indexOf(char);
    if (index === -1) {
        excludedChars[type].push(char);
    } else {
        excludedChars[type].splice(index, 1);
    }
    
    // 更新UI
    const charItems = document.querySelectorAll(`.char-item[data-type="${type}"][data-char="${char}"]`);
    charItems.forEach(item => {
        item.classList.toggle('excluded');
    });
    
    updateExcludedCount();
    updateRequireCheckboxStates(); // 更新必须包含复选框状态
    generate();
}

// 更新排除字符计数
function updateExcludedCount() {
    const totalExcluded = 
        excludedChars.uppercase.length + 
        excludedChars.lowercase.length + 
        excludedChars.numbers.length + 
        excludedChars.symbols.length;
    
    excludedCountEl.textContent = totalExcluded;
}

// 包含所有字符
function includeAllChars() {
    excludedChars = {
        uppercase: [],
        lowercase: [],
        numbers: [],
        symbols: []
    };
    initCharSelector();
    updateRequireCheckboxStates();
    generate();
}

// 排除所有字符
function excludeAllChars() {
    excludedChars = {
        uppercase: [...config.uppercase],
        lowercase: [...config.lowercase],
        numbers: [...config.numbers],
        symbols: [...config.symbols]
    };
    initCharSelector();
    updateRequireCheckboxStates();
    generate();
}

// 重置为默认排除
function resetDefaultExclusions() {
    excludedChars = {
        uppercase: [...defaultExclusions.uppercase],
        lowercase: [...defaultExclusions.lowercase],
        numbers: [...defaultExclusions.numbers],
        symbols: [...defaultExclusions.symbols]
    };
    initCharSelector();
    updateRequireCheckboxStates();
    generate();
}

// 包含特定类别所有字符
function includeCategory(type) {
    console.log(`包含类别: ${type}`);
    // 确保使用正确的键名
    if (type === 'numbers' || type === 'symbols' || type === 'uppercase' || type === 'lowercase') {
        excludedChars[type] = [];
        updateCategoryUI(type);
        updateExcludedCount();
        updateRequireCheckboxStates();
        generate();
    } else {
        console.error(`未知的类别: ${type}`);
    }
}

// 排除特定类别所有字符
function excludeCategory(type) {
    console.log(`排除类别: ${type}`);
    // 确保使用正确的键名
    if (type === 'numbers' && config.numbers) {
        excludedChars[type] = [...config.numbers];
    } else if (type === 'symbols' && config.symbols) {
        excludedChars[type] = [...config.symbols];
    } else if (type === 'uppercase' && config.uppercase) {
        excludedChars[type] = [...config.uppercase];
    } else if (type === 'lowercase' && config.lowercase) {
        excludedChars[type] = [...config.lowercase];
    } else {
        console.error(`未知的类别或配置不存在: ${type}`);
        return;
    }
    
    updateCategoryUI(type);
    updateExcludedCount();
    updateRequireCheckboxStates();
    generate();
}

// 重置特定类别为默认
function resetCategory(type) {
    console.log(`重置类别: ${type}, 默认值:`, defaultExclusions[type]);
    // 确保使用正确的键名
    if (type === 'numbers' && defaultExclusions.numbers) {
        excludedChars[type] = [...defaultExclusions.numbers];
    } else if (type === 'symbols' && defaultExclusions.symbols) {
        excludedChars[type] = [...defaultExclusions.symbols];
    } else if (type === 'uppercase' && defaultExclusions.uppercase) {
        excludedChars[type] = [...defaultExclusions.uppercase];
    } else if (type === 'lowercase' && defaultExclusions.lowercase) {
        excludedChars[type] = [...defaultExclusions.lowercase];
    } else {
        console.error(`未知的类别或默认排除不存在: ${type}`);
        return;
    }
    
    updateCategoryUI(type);
    updateExcludedCount();
    updateRequireCheckboxStates();
    generate();
}

// 更新特定类别的UI
function updateCategoryUI(type) {
    console.log(`更新UI类别: ${type}`);
    // 根据类型确定容器ID
    let containerId;
    if (type === 'uppercase') {
        containerId = 'uppercase-chars';
    } else if (type === 'lowercase') {
        containerId = 'lowercase-chars';
    } else if (type === 'numbers') {
        containerId = 'number-chars';  // 注意：HTML中的ID是 'number-chars'
    } else if (type === 'symbols') {
        containerId = 'symbol-chars';  // 注意：HTML中的ID是 'symbol-chars'
    } else {
        console.error(`未知的类别: ${type}`);
        return;
    }
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`找不到容器: ${containerId}`);
        return;
    }
    
    const charItems = container.querySelectorAll('.char-item');
    console.log(`找到 ${charItems.length} 个字符项`);
    
    charItems.forEach(item => {
        const char = item.dataset.char;
        const isExcluded = excludedChars[type] && excludedChars[type].includes(char);
        
        if (isExcluded) {
            item.classList.add('excluded');
        } else {
            item.classList.remove('excluded');
        }
    });
}

// 获取可用的字符池
function getAvailablePool() {
    let pool = "";
    
    // 添加未排除的大写字母
    for (let char of config.uppercase) {
        if (!excludedChars.uppercase.includes(char)) {
            pool += char;
        }
    }
    
    // 添加未排除的小写字母
    for (let char of config.lowercase) {
        if (!excludedChars.lowercase.includes(char)) {
            pool += char;
        }
    }
    
    // 添加未排除的数字
    for (let char of config.numbers) {
        if (!excludedChars.numbers.includes(char)) {
            pool += char;
        }
    }
    
    // 添加未排除的特殊符号
    for (let char of config.symbols) {
        if (!excludedChars.symbols.includes(char)) {
            pool += char;
        }
    }
    
    return pool;
}

// 获取各类可用的字符（未排除的）
function getAvailableChars(type) {
    let chars = config[type] || "";
    return chars.split('').filter(c => !excludedChars[type].includes(c));
}

// 从给定字符池生成指定长度的随机字符串（使用 Crypto API）
function generateRandomString(pool, len) {
    if (len <= 0) return '';
    const randomValues = new Uint32Array(len);
    window.crypto.getRandomValues(randomValues);
    let result = '';
    for (let i = 0; i < len; i++) {
        result += pool[randomValues[i] % pool.length];
    }
    return result;
}

// 初始化事件监听
function init() {
    slider.oninput = () => {
        lenDisplay.innerText = slider.value;
        generate();
    };

    // 预设按钮
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.preset;
            applyPreset(type);
        });
    });
    
    // 生成按钮
    generateBtn.addEventListener('click', generate);
    
    // 批量生成按钮
    multipleBtn.addEventListener('click', generateMultiple);
    
    // 复制按钮
    cBtn.addEventListener('click', copyAction);
    copyBtn2.addEventListener('click', copyAction);
    
    // 导出按钮
    exportBtn.addEventListener('click', exportPasswords);
    
    // 字符选择器按钮
    document.getElementById('include-all-btn').addEventListener('click', includeAllChars);
    document.getElementById('exclude-all-btn').addEventListener('click', excludeAllChars);
    document.getElementById('reset-default-btn').addEventListener('click', resetDefaultExclusions);
    
    // 类别操作按钮
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            const action = btn.dataset.action;
            
            if (action === 'include') {
                includeCategory(category);
            } else if (action === 'exclude') {
                excludeCategory(category);
            } else if (action === 'reset') {
                resetCategory(category);
            }
        });
    });
    
    // 字符项点击事件（委托）
    document.querySelectorAll('.char-selector-grid').forEach(container => {
        container.addEventListener('click', (e) => {
            const charItem = e.target.closest('.char-item');
            if (charItem) {
                const type = charItem.dataset.type;
                const char = charItem.dataset.char;
                toggleCharExclusion(type, char);
            }
        });
    });
    
    // 必须包含复选框监听
    [reqUpper, reqLower, reqNumber, reqSymbol].forEach(cb => {
        cb.addEventListener('change', () => {
            generate();
        });
    });
    
    // 添加快捷键支持
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 初始化字符选择器
    initCharSelector();
    
    // 初始化必须包含复选框状态
    updateRequireCheckboxStates();
    
    // 页面加载时自动生成
    generate();
}

// 更新必须包含复选框的启用/禁用状态
function updateRequireCheckboxStates() {
    // 大写字母
    if (getAvailableChars('uppercase').length === 0) {
        reqUpper.disabled = true;
        reqUpper.checked = false;
    } else {
        reqUpper.disabled = false;
    }
    // 小写字母
    if (getAvailableChars('lowercase').length === 0) {
        reqLower.disabled = true;
        reqLower.checked = false;
    } else {
        reqLower.disabled = false;
    }
    // 数字
    if (getAvailableChars('numbers').length === 0) {
        reqNumber.disabled = true;
        reqNumber.checked = false;
    } else {
        reqNumber.disabled = false;
    }
    // 特殊符号
    if (getAvailableChars('symbols').length === 0) {
        reqSymbol.disabled = true;
        reqSymbol.checked = false;
    } else {
        reqSymbol.disabled = false;
    }
}

// 键盘快捷键
function handleKeyboardShortcuts(e) {
    // 空格键或回车键生成新密码
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        generate();
    }
    // C键复制密码
    else if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        copyAction();
    }
    // 数字键快速设置长度
    else if (e.code.startsWith('Digit') && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.code.replace('Digit', ''));
        if (num >= 6 && num <= 9) {
            slider.value = num;
            lenDisplay.innerText = num;
            generate();
        }
    }
}

// 应用预设
function applyPreset(type) {
    const preset = presets[type];
    if (!preset) return;
    
    slider.value = preset.len;
    lenDisplay.innerText = preset.len;
    
    // 更新必须包含的复选框
    reqUpper.checked = preset.up || false;
    reqLower.checked = preset.lo || false;
    reqNumber.checked = preset.num || false;
    reqSymbol.checked = preset.sym || false;
    
    // 更新预设按钮状态
    updatePresetButtons(type);
    updateRequireCheckboxStates(); // 根据可用字符更新禁用状态
    generate();
}

// 更新预设按钮状态
function updatePresetButtons(activeType = null) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (activeType) {
        document.querySelectorAll(`.preset-btn[data-preset="${activeType}"]`).forEach(btn => {
            btn.classList.add('active');
        });
    }
}

// 生成密码
function generate() {
    generateIcon.textContent = '';
    generateIcon.classList.add('loading');
    generateText.textContent = '生成中...';
    
    setTimeout(() => {
        try {
            const len = parseInt(slider.value);
            const pool = getAvailablePool();
            
            if (!pool) {
                output.innerText = "没有可用的字符，请减少排除的字符";
                updateMeter(0, 0);
                updateAnalysis("", 0);
                resetGenerateButton();
                return;
            }
            
            // 收集必须包含的类型要求
            const requirements = [];
            if (reqUpper.checked && getAvailableChars('uppercase').length > 0) requirements.push('uppercase');
            if (reqLower.checked && getAvailableChars('lowercase').length > 0) requirements.push('lowercase');
            if (reqNumber.checked && getAvailableChars('numbers').length > 0) requirements.push('numbers');
            if (reqSymbol.checked && getAvailableChars('symbols').length > 0) requirements.push('symbols');
            
            // 检查是否要求的类型数量超过密码长度
            if (requirements.length > len) {
                output.innerText = "必须包含的类型数量超过密码长度，请增加长度或减少要求";
                updateMeter(0, 0);
                updateAnalysis("", 0);
                resetGenerateButton();
                return;
            }
            
            // 检查是否所有要求的类型都有可用字符
            for (let type of requirements) {
                if (getAvailableChars(type).length === 0) {
                    output.innerText = `"${type}" 类型的可用字符已被全部排除，请取消要求或取消排除`;
                    updateMeter(0, 0);
                    updateAnalysis("", 0);
                    resetGenerateButton();
                    return;
                }
            }
            
            let pwd;
            if (requirements.length === 0) {
                // 没有要求，随机从整个池生成
                pwd = generateRandomString(pool, len);
            } else {
                // 先为每个要求选择一个随机字符（使用crypto安全随机）
                const needed = [...requirements];
                const requiredChars = needed.map(type => {
                    const available = getAvailableChars(type);
                    const randByte = new Uint32Array(1);
                    window.crypto.getRandomValues(randByte);
                    const idx = randByte[0] % available.length;
                    return available[idx];
                });
                
                // 剩余长度用整个池填充
                const remainingLen = len - requiredChars.length;
                const remaining = generateRandomString(pool, remainingLen);
                
                // 合并并洗牌
                const combined = requiredChars.concat(remaining.split(''));
                // Fisher-Yates shuffle using crypto
                const randArr = new Uint32Array(combined.length);
                window.crypto.getRandomValues(randArr);
                for (let i = combined.length - 1; i > 0; i--) {
                    const j = randArr[i] % (i + 1);
                    [combined[i], combined[j]] = [combined[j], combined[i]];
                }
                pwd = combined.join('');
            }
            
            output.innerText = pwd;
            
            updateMeter(len, pool.length);
            updateAnalysis(pwd, pool.length);
            addToHistory(pwd);
            cBtn.classList.remove('copied');
            
        } catch (error) {
            output.innerText = "生成失败，请重试";
            console.error("密码生成错误:", error);
        } finally {
            resetGenerateButton();
        }
    }, 50);
}

// 重置生成按钮状态
function resetGenerateButton() {
    generateIcon.classList.remove('loading');
    generateIcon.textContent = '🔄';
    generateText.textContent = '生成新密码';
}

// 更新密码强度
function updateMeter(len, poolSize) {
    const entropy = len * (poolSize > 0 ? Math.log2(poolSize) : 0);
    let pct = Math.min((entropy / 120) * 100, 100);
    let label = "安全性：弱";
    let colorClass = "weak";

    if (entropy > 40) { label = "安全性：中等"; colorClass = "medium"; }
    if (entropy > 70) { label = "安全性：强"; colorClass = "strong"; }
    if (entropy > 100) { label = "安全性：极强"; colorClass = "very-strong"; }

    sBar.style.width = pct + "%";
    sText.innerText = label;
    sText.className = colorClass;
    
    // 更新熵值和破解时间
    entropyValue.textContent = Math.round(entropy) + " bits";
    updateCrackTime(entropy);
}

// 更新破解时间估算
function updateCrackTime(entropy) {
    // 假设攻击者每秒尝试1万亿次 (10^12)
    const guessesPerSecond = 1e12;
    const seconds = Math.pow(2, entropy) / guessesPerSecond;
    
    let timeText = "瞬间";
    
    if (seconds < 1) {
        timeText = "瞬间";
    } else if (seconds < 60) {
        timeText = Math.round(seconds) + "秒";
    } else if (seconds < 3600) {
        timeText = Math.round(seconds/60) + "分钟";
    } else if (seconds < 86400) {
        timeText = Math.round(seconds/3600) + "小时";
    } else if (seconds < 31536000) {
        timeText = Math.round(seconds/86400) + "天";
    } else if (seconds < 3153600000) {
        timeText = Math.round(seconds/31536000) + "年";
    } else {
        timeText = Math.round(seconds/31536000000) + "世纪";
    }
    
    crackTime.textContent = `估算破解时间: ${timeText}`;
}

// 更新密码分析
function updateAnalysis(password, poolSize) {
    if (!password) {
        charCount.textContent = "0";
        upperCount.textContent = "0";
        lowerCount.textContent = "0";
        numberCount.textContent = "0";
        symbolCount.textContent = "0";
        poolSizeEl.textContent = "0";
        return;
    }
    
    const upper = (password.match(/[A-Z]/g) || []).length;
    const lower = (password.match(/[a-z]/g) || []).length;
    const numbers = (password.match(/[0-9]/g) || []).length;
    const symbols = password.length - upper - lower - numbers;
    
    charCount.textContent = password.length;
    upperCount.textContent = upper;
    lowerCount.textContent = lower;
    numberCount.textContent = numbers;
    symbolCount.textContent = symbols;
    poolSizeEl.textContent = poolSize;
}

// 添加到历史记录
function addToHistory(password) {
    const timestamp = new Date().toISOString();
    passwordHistory.unshift({
        password: password,
        timestamp: timestamp,
        length: password.length,
        excludedChars: {...excludedChars}
    });
    
    // 限制历史记录数量
    if (passwordHistory.length > maxHistory) {
        passwordHistory = passwordHistory.slice(0, maxHistory);
    }
    
    // 保存到本地存储
    localStorage.setItem('pwHistory', JSON.stringify(passwordHistory));
}

// 复制密码
function copyAction() {
    const text = output.innerText;
    if(text.includes('没有可用的字符') || text.includes('生成失败') || text.includes('正在生成')) {
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        cBtn.classList.add('copied');
        copyBtn2.classList.add('copied');
        toast.classList.add('show');
        
        // 更新复制按钮图标为对勾
        const copyIcon = cBtn.querySelector('svg');
        if (copyIcon) {
            const originalHTML = copyIcon.innerHTML;
            copyIcon.innerHTML = `
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            `;
            
            setTimeout(() => {
                copyIcon.innerHTML = originalHTML;
            }, 2000);
        }
        
        setTimeout(() => {
            cBtn.classList.remove('copied');
            copyBtn2.classList.remove('copied');
            toast.classList.remove('show');
        }, 2000);
    }).catch(err => {
        console.error("复制失败:", err);
        toast.textContent = "复制失败，请手动选择复制";
        toast.style.background = "var(--danger)";
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            toast.style.background = "var(--success)";
            toast.textContent = "密码已成功复制到剪贴板！";
        }, 2000);
    });
}

// 批量生成密码
function generateMultiple() {
    const count = 5;
    const passwords = [];
    
    for (let i = 0; i < count; i++) {
        passwords.push(generateSinglePassword());
    }
    
    // 显示批量密码
    output.innerHTML = passwords.map((pwd, idx) => 
        `<div style="margin-bottom: 8px; font-size: 1.4rem;">${idx+1}. ${pwd}</div>`
    ).join('');
    
    // 更新分析（基于第一个密码）
    const pool = getAvailablePool();
    updateAnalysis(passwords[0], pool.length);
    updateMeter(passwords[0].length, pool.length);
}

// 生成单个密码（用于批量生成，遵循必须包含要求）
function generateSinglePassword() {
    const len = parseInt(slider.value);
    const pool = getAvailablePool();
    if (!pool) return "生成失败";
    
    // 收集必须包含的类型要求
    const requirements = [];
    if (reqUpper.checked && getAvailableChars('uppercase').length > 0) requirements.push('uppercase');
    if (reqLower.checked && getAvailableChars('lowercase').length > 0) requirements.push('lowercase');
    if (reqNumber.checked && getAvailableChars('numbers').length > 0) requirements.push('numbers');
    if (reqSymbol.checked && getAvailableChars('symbols').length > 0) requirements.push('symbols');
    
    if (requirements.length > len) return "要求过多";
    
    if (requirements.length === 0) {
        return generateRandomString(pool, len);
    } else {
        const requiredChars = requirements.map(type => {
            const available = getAvailableChars(type);
            const randByte = new Uint32Array(1);
            window.crypto.getRandomValues(randByte);
            const idx = randByte[0] % available.length;
            return available[idx];
        });
        const remaining = generateRandomString(pool, len - requiredChars.length);
        const combined = requiredChars.concat(remaining.split(''));
        const randArr = new Uint32Array(combined.length);
        window.crypto.getRandomValues(randArr);
        for (let i = combined.length - 1; i > 0; i--) {
            const j = randArr[i] % (i + 1);
            [combined[i], combined[j]] = [combined[j], combined[i]];
        }
        return combined.join('');
    }
}

// 导出密码
function exportPasswords() {
    if (passwordHistory.length === 0) {
        alert("暂无密码历史记录");
        return;
    }
    
    const exportText = passwordHistory.map((item, idx) => {
        const date = new Date(item.timestamp).toLocaleString();
        return `${idx+1}. ${item.password} (长度: ${item.length}, 生成时间: ${date})`;
    }).join('\n');
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passwords_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 显示导出成功提示
    toast.textContent = `已导出 ${passwordHistory.length} 个密码`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 初始化应用
window.addEventListener('DOMContentLoaded', init);