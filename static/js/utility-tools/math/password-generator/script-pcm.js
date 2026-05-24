const config = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~"
};

// Default excluded characters
const defaultExclusions = {
    uppercase: [],      // No uppercase excluded by default
    lowercase: [],      // No lowercase excluded by default
    numbers: [],        // No numbers excluded by default
    symbols: ["#", "!", "@"]  // Exclude these special symbols by default
};

// Current excluded characters
let excludedChars = {
    uppercase: [...defaultExclusions.uppercase],
    lowercase: [...defaultExclusions.lowercase],
    numbers: [...defaultExclusions.numbers],
    symbols: [...defaultExclusions.symbols]
};

// DOM elements
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

// "Must contain" checkboxes
const reqUpper = document.getElementById('req-upper');
const reqLower = document.getElementById('req-lower');
const reqNumber = document.getElementById('req-number');
const reqSymbol = document.getElementById('req-symbol');

// Analysis stats elements
const charCount = document.getElementById('char-count');
const upperCount = document.getElementById('upper-count');
const lowerCount = document.getElementById('lower-count');
const numberCount = document.getElementById('number-count');
const symbolCount = document.getElementById('symbol-count');
const poolSizeEl = document.getElementById('pool-size');
const excludedCountEl = document.getElementById('excluded-count');

// Password history
let passwordHistory = JSON.parse(localStorage.getItem('pwHistory') || '[]');
const maxHistory = 20;

// Preset configurations
const presets = {
    high: { len: 16, up: true, lo: true, num: true, sym: true },
    mobile: { len: 12, up: true, lo: true, num: true, sym: false },
    pin: { len: 6, up: false, lo: false, num: true, sym: false },
    memorable: { len: 14, up: true, lo: true, num: true, sym: false }
};

// Initialize character selector UI
function initCharSelector() {
    // Uppercase letters
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

    // Lowercase letters
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

    // Numbers
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

    // Symbols
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

// Toggle exclusion status for a single character
function toggleCharExclusion(type, char) {
    const index = excludedChars[type].indexOf(char);
    if (index === -1) {
        excludedChars[type].push(char);
    } else {
        excludedChars[type].splice(index, 1);
    }
    
    // Update UI
    const charItems = document.querySelectorAll(`.char-item[data-type="${type}"][data-char="${char}"]`);
    charItems.forEach(item => {
        item.classList.toggle('excluded');
    });
    
    updateExcludedCount();
    updateRequireCheckboxStates();
    generate();
}

// Update total excluded characters count
function updateExcludedCount() {
    const totalExcluded = 
        excludedChars.uppercase.length + 
        excludedChars.lowercase.length + 
        excludedChars.numbers.length + 
        excludedChars.symbols.length;
    
    excludedCountEl.textContent = totalExcluded;
}

// Include all characters
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

// Exclude all characters
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

// Reset to default exclusions
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

// Include all characters of a specific category
function includeCategory(type) {
    if (type === 'numbers' || type === 'symbols' || type === 'uppercase' || type === 'lowercase') {
        excludedChars[type] = [];
        updateCategoryUI(type);
        updateExcludedCount();
        updateRequireCheckboxStates();
        generate();
    } else {
        console.error(`Unknown category: ${type}`);
    }
}

// Exclude all characters of a specific category
function excludeCategory(type) {
    if (type === 'numbers' && config.numbers) {
        excludedChars[type] = [...config.numbers];
    } else if (type === 'symbols' && config.symbols) {
        excludedChars[type] = [...config.symbols];
    } else if (type === 'uppercase' && config.uppercase) {
        excludedChars[type] = [...config.uppercase];
    } else if (type === 'lowercase' && config.lowercase) {
        excludedChars[type] = [...config.lowercase];
    } else {
        console.error(`Unknown category or config missing: ${type}`);
        return;
    }
    
    updateCategoryUI(type);
    updateExcludedCount();
    updateRequireCheckboxStates();
    generate();
}

// Reset a specific category to its default excluded characters
function resetCategory(type) {
    if (type === 'numbers' && defaultExclusions.numbers) {
        excludedChars[type] = [...defaultExclusions.numbers];
    } else if (type === 'symbols' && defaultExclusions.symbols) {
        excludedChars[type] = [...defaultExclusions.symbols];
    } else if (type === 'uppercase' && defaultExclusions.uppercase) {
        excludedChars[type] = [...defaultExclusions.uppercase];
    } else if (type === 'lowercase' && defaultExclusions.lowercase) {
        excludedChars[type] = [...defaultExclusions.lowercase];
    } else {
        console.error(`Unknown category or default exclusion missing: ${type}`);
        return;
    }
    
    updateCategoryUI(type);
    updateExcludedCount();
    updateRequireCheckboxStates();
    generate();
}

// Update UI for a specific category
function updateCategoryUI(type) {
    let containerId;
    if (type === 'uppercase') {
        containerId = 'uppercase-chars';
    } else if (type === 'lowercase') {
        containerId = 'lowercase-chars';
    } else if (type === 'numbers') {
        containerId = 'number-chars';
    } else if (type === 'symbols') {
        containerId = 'symbol-chars';
    } else {
        console.error(`Unknown category: ${type}`);
        return;
    }
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container not found: ${containerId}`);
        return;
    }
    
    const charItems = container.querySelectorAll('.char-item');
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

// Get the current available character pool based on exclusions
function getAvailablePool() {
    let pool = "";
    
    for (let char of config.uppercase) {
        if (!excludedChars.uppercase.includes(char)) pool += char;
    }
    for (let char of config.lowercase) {
        if (!excludedChars.lowercase.includes(char)) pool += char;
    }
    for (let char of config.numbers) {
        if (!excludedChars.numbers.includes(char)) pool += char;
    }
    for (let char of config.symbols) {
        if (!excludedChars.symbols.includes(char)) pool += char;
    }
    
    return pool;
}

// Get available characters for a specific type (not excluded)
function getAvailableChars(type) {
    let chars = config[type] || "";
    return chars.split('').filter(c => !excludedChars[type].includes(c));
}

// Generate random string from given pool using Crypto API
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

// Initialize event listeners
function init() {
    slider.oninput = () => {
        lenDisplay.innerText = slider.value;
        generate();
    };

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.preset;
            applyPreset(type);
        });
    });
    
    generateBtn.addEventListener('click', generate);
    multipleBtn.addEventListener('click', generateMultiple);
    cBtn.addEventListener('click', copyAction);
    copyBtn2.addEventListener('click', copyAction);
    exportBtn.addEventListener('click', exportPasswords);
    
    document.getElementById('include-all-btn').addEventListener('click', includeAllChars);
    document.getElementById('exclude-all-btn').addEventListener('click', excludeAllChars);
    document.getElementById('reset-default-btn').addEventListener('click', resetDefaultExclusions);
    
    // Category action buttons
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
    
    // Character item click delegation
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
    
    // "Must contain" checkboxes
    [reqUpper, reqLower, reqNumber, reqSymbol].forEach(cb => {
        cb.addEventListener('change', () => {
            generate();
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    initCharSelector();
    updateRequireCheckboxStates();
    generate();
}

// Update enabled/disabled state of "must contain" checkboxes based on available characters
function updateRequireCheckboxStates() {
    if (getAvailableChars('uppercase').length === 0) {
        reqUpper.disabled = true;
        reqUpper.checked = false;
    } else {
        reqUpper.disabled = false;
    }
    if (getAvailableChars('lowercase').length === 0) {
        reqLower.disabled = true;
        reqLower.checked = false;
    } else {
        reqLower.disabled = false;
    }
    if (getAvailableChars('numbers').length === 0) {
        reqNumber.disabled = true;
        reqNumber.checked = false;
    } else {
        reqNumber.disabled = false;
    }
    if (getAvailableChars('symbols').length === 0) {
        reqSymbol.disabled = true;
        reqSymbol.checked = false;
    } else {
        reqSymbol.disabled = false;
    }
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        generate();
    }
    else if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        copyAction();
    }
    else if (e.code.startsWith('Digit') && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.code.replace('Digit', ''));
        if (num >= 6 && num <= 9) {
            slider.value = num;
            lenDisplay.innerText = num;
            generate();
        }
    }
}

// Apply a preset configuration
function applyPreset(type) {
    const preset = presets[type];
    if (!preset) return;
    
    slider.value = preset.len;
    lenDisplay.innerText = preset.len;
    
    reqUpper.checked = preset.up || false;
    reqLower.checked = preset.lo || false;
    reqNumber.checked = preset.num || false;
    reqSymbol.checked = preset.sym || false;
    
    updatePresetButtons(type);
    updateRequireCheckboxStates();
    generate();
}

// Update active preset button styling
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

// Main password generation
function generate() {
    generateIcon.textContent = '';
    generateIcon.classList.add('loading');
    generateText.textContent = 'Dey generate...';
    
    setTimeout(() => {
        try {
            const len = parseInt(slider.value);
            const pool = getAvailablePool();
            
            if (!pool) {
                output.innerText = "No characters available — please reduce exclusions.";
                updateMeter(0, 0);
                updateAnalysis("", 0);
                resetGenerateButton();
                return;
            }
            
            // Collect required character types
            const requirements = [];
            if (reqUpper.checked && getAvailableChars('uppercase').length > 0) requirements.push('uppercase');
            if (reqLower.checked && getAvailableChars('lowercase').length > 0) requirements.push('lowercase');
            if (reqNumber.checked && getAvailableChars('numbers').length > 0) requirements.push('numbers');
            if (reqSymbol.checked && getAvailableChars('symbols').length > 0) requirements.push('symbols');
            
            if (requirements.length > len) {
                output.innerText = "Too many required types for the selected length. Increase length or reduce requirements.";
                updateMeter(0, 0);
                updateAnalysis("", 0);
                resetGenerateButton();
                return;
            }
            
            for (let type of requirements) {
                if (getAvailableChars(type).length === 0) {
                    output.innerText = `"${type}" has no available characters — uncheck the requirement or stop excluding these characters.`;
                    updateMeter(0, 0);
                    updateAnalysis("", 0);
                    resetGenerateButton();
                    return;
                }
            }
            
            let pwd;
            if (requirements.length === 0) {
                pwd = generateRandomString(pool, len);
            } else {
                const needed = [...requirements];
                const requiredChars = needed.map(type => {
                    const available = getAvailableChars(type);
                    const randByte = new Uint32Array(1);
                    window.crypto.getRandomValues(randByte);
                    const idx = randByte[0] % available.length;
                    return available[idx];
                });
                
                const remainingLen = len - requiredChars.length;
                const remaining = generateRandomString(pool, remainingLen);
                
                const combined = requiredChars.concat(remaining.split(''));
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
            output.innerText = "Generation no work. Abeg try again.";
            console.error("Password generation error:", error);
        } finally {
            resetGenerateButton();
        }
    }, 50);
}

// Reset generate button to default state
function resetGenerateButton() {
    generateIcon.classList.remove('loading');
    generateIcon.textContent = '🔄';
    generateText.textContent = 'Generate new password';
}

// Update strength meter and entropy display
function updateMeter(len, poolSize) {
    const entropy = len * (poolSize > 0 ? Math.log2(poolSize) : 0);
    let pct = Math.min((entropy / 120) * 100, 100);
    let label = "Strength: Weak";
    let colorClass = "weak";

    if (entropy > 40) { label = "Strength: Medium"; colorClass = "medium"; }
    if (entropy > 70) { label = "Strength: Strong"; colorClass = "strong"; }
    if (entropy > 100) { label = "Strength: Very Strong"; colorClass = "very-strong"; }

    sBar.style.width = pct + "%";
    sText.innerText = label;
    sText.className = colorClass;
    
    entropyValue.textContent = Math.round(entropy) + " bits";
    updateCrackTime(entropy);
}

// Estimate crack time based on entropy
function updateCrackTime(entropy) {
    const guessesPerSecond = 1e12;
    const seconds = Math.pow(2, entropy) / guessesPerSecond;
    
    let timeText = "instantly";
    
    if (seconds < 1) {
        timeText = "instantly";
    } else if (seconds < 60) {
        timeText = Math.round(seconds) + " seconds";
    } else if (seconds < 3600) {
        timeText = Math.round(seconds/60) + " minutes";
    } else if (seconds < 86400) {
        timeText = Math.round(seconds/3600) + " hours";
    } else if (seconds < 31536000) {
        timeText = Math.round(seconds/86400) + " days";
    } else if (seconds < 3153600000) {
        timeText = Math.round(seconds/31536000) + " years";
    } else {
        timeText = Math.round(seconds/31536000000) + " centuries";
    }
    
    crackTime.textContent = `Estimated crack time: ${timeText}`;
}

// Update password analysis stats
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

// Add generated password to history
function addToHistory(password) {
    const timestamp = new Date().toISOString();
    passwordHistory.unshift({
        password: password,
        timestamp: timestamp,
        length: password.length,
        excludedChars: {...excludedChars}
    });
    
    if (passwordHistory.length > maxHistory) {
        passwordHistory = passwordHistory.slice(0, maxHistory);
    }
    localStorage.setItem('pwHistory', JSON.stringify(passwordHistory));
}

// Copy password to clipboard
function copyAction() {
    const text = output.innerText;
    if(text.includes('No characters available') || text.includes('failed') || text.includes('Generating secure')) {
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        cBtn.classList.add('copied');
        copyBtn2.classList.add('copied');
        toast.classList.add('show');
        
        const copyIcon = cBtn.querySelector('svg');
        if (copyIcon) {
            const originalHTML = copyIcon.innerHTML;
            copyIcon.innerHTML = `<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
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
        console.error("Copy no work:", err);
        toast.textContent = "Copy no work. Abeg select am and copy by hand.";
        toast.style.background = "var(--danger)";
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            toast.style.background = "var(--success)";
            toast.textContent = "Password don copy";
        }, 2000);
    });
}

// Generate multiple passwords at once (batch of 5)
function generateMultiple() {
    const count = 5;
    const passwords = [];
    
    for (let i = 0; i < count; i++) {
        passwords.push(generateSinglePassword());
    }
    
    output.innerHTML = passwords.map((pwd, idx) => 
        `<div style="margin-bottom: 8px; font-size: 1.4rem;">${idx+1}. ${pwd}</div>`
    ).join('');
    
    const pool = getAvailablePool();
    updateAnalysis(passwords[0], pool.length);
    updateMeter(passwords[0].length, pool.length);
}

// Generate a single password (used for batch generation, respects requirements)
function generateSinglePassword() {
    const len = parseInt(slider.value);
    const pool = getAvailablePool();
    if (!pool) return "Generation no work";
    
    const requirements = [];
    if (reqUpper.checked && getAvailableChars('uppercase').length > 0) requirements.push('uppercase');
    if (reqLower.checked && getAvailableChars('lowercase').length > 0) requirements.push('lowercase');
    if (reqNumber.checked && getAvailableChars('numbers').length > 0) requirements.push('numbers');
    if (reqSymbol.checked && getAvailableChars('symbols').length > 0) requirements.push('symbols');
    
    if (requirements.length > len) return "Too many requirements";
    
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

// Export password history to a text file
function exportPasswords() {
    if (passwordHistory.length === 0) {
        alert("No password history to export.");
        return;
    }
    
    const exportText = passwordHistory.map((item, idx) => {
        const date = new Date(item.timestamp).toLocaleString();
        return `${idx+1}. ${item.password} (Length: ${item.length}, Generated: ${date})`;
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
    
    toast.textContent = `Exported ${passwordHistory.length} passwords.`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Start the app
window.addEventListener('DOMContentLoaded', init);