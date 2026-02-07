const config = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~"
};

// Default excluded characters
const defaultExclusions = {
    uppercase: [],  // Default: no uppercase letters excluded
    lowercase: [],  // Default: no lowercase letters excluded
    numbers: [],    // Default: no numbers excluded
    symbols: ["#", "!", "@"]  // Default: exclude these three symbols
};

// Currently excluded characters
let excludedChars = {
    uppercase: [...defaultExclusions.uppercase],
    lowercase: [...defaultExclusions.lowercase],
    numbers: [...defaultExclusions.numbers],
    symbols: [...defaultExclusions.symbols]
};

// DOM Elements
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

// Analysis Statistics Elements
const charCount = document.getElementById('char-count');
const upperCount = document.getElementById('upper-count');
const lowerCount = document.getElementById('lower-count');
const numberCount = document.getElementById('number-count');
const symbolCount = document.getElementById('symbol-count');
const poolSizeEl = document.getElementById('pool-size');
const excludedCountEl = document.getElementById('excluded-count');

// History
let passwordHistory = JSON.parse(localStorage.getItem('pwHistory') || '[]');
const maxHistory = 20;

// Preset Configurations
const presets = {
    high: { len: 16, up: true, lo: true, num: true, sym: true },
    mobile: { len: 12, up: true, lo: true, num: true, sym: false },
    pin: { len: 6, up: false, lo: false, num: true, sym: false },
    memorable: { len: 14, up: true, lo: true, num: true, sym: false }
};

// Initialize Character Selector
function initCharSelector() {
    // Generate uppercase letters
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

    // Generate lowercase letters
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

    // Generate numbers
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

    // Generate special symbols
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

// Toggle Character Exclusion Status
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
    generate();
}

// Update Excluded Character Count
function updateExcludedCount() {
    const totalExcluded = 
        excludedChars.uppercase.length + 
        excludedChars.lowercase.length + 
        excludedChars.numbers.length + 
        excludedChars.symbols.length;
    
    excludedCountEl.textContent = totalExcluded;
}

// Include All Characters
function includeAllChars() {
    excludedChars = {
        uppercase: [],
        lowercase: [],
        numbers: [],
        symbols: []
    };
    initCharSelector();
    generate();
}

// Exclude All Characters
function excludeAllChars() {
    excludedChars = {
        uppercase: [...config.uppercase],
        lowercase: [...config.lowercase],
        numbers: [...config.numbers],
        symbols: [...config.symbols]
    };
    initCharSelector();
    generate();
}

// Reset to Default Exclusions
function resetDefaultExclusions() {
    excludedChars = {
        uppercase: [...defaultExclusions.uppercase],
        lowercase: [...defaultExclusions.lowercase],
        numbers: [...defaultExclusions.numbers],
        symbols: [...defaultExclusions.symbols]
    };
    initCharSelector();
    generate();
}

// Include All Characters in Category
function includeCategory(type) {
    console.log(`Including category: ${type}`);
    // Ensure correct key names
    if (type === 'numbers' || type === 'symbols' || type === 'uppercase' || type === 'lowercase') {
        excludedChars[type] = [];
        updateCategoryUI(type);
        updateExcludedCount();
        generate();
    } else {
        console.error(`Unknown category: ${type}`);
    }
}

// Exclude All Characters in Category
function excludeCategory(type) {
    console.log(`Excluding category: ${type}`);
    // Ensure correct key names
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
    generate();
}

// Reset Category to Default
function resetCategory(type) {
    console.log(`Resetting category: ${type}, default values:`, defaultExclusions[type]);
    // Ensure correct key names
    if (type === 'numbers' && defaultExclusions.numbers) {
        excludedChars[type] = [...defaultExclusions.numbers];
    } else if (type === 'symbols' && defaultExclusions.symbols) {
        excludedChars[type] = [...defaultExclusions.symbols];
    } else if (type === 'uppercase' && defaultExclusions.uppercase) {
        excludedChars[type] = [...defaultExclusions.uppercase];
    } else if (type === 'lowercase' && defaultExclusions.lowercase) {
        excludedChars[type] = [...defaultExclusions.lowercase];
    } else {
        console.error(`Unknown category or default exclusions missing: ${type}`);
        return;
    }
    
    updateCategoryUI(type);
    updateExcludedCount();
    generate();
}

// Update Specific Category UI
function updateCategoryUI(type) {
    console.log(`Updating UI for category: ${type}`);
    // Determine container ID based on type
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
    console.log(`Found ${charItems.length} character items`);
    
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

// Get Available Character Pool
function getAvailablePool() {
    let pool = "";
    
    // Add non-excluded uppercase letters
    for (let char of config.uppercase) {
        if (!excludedChars.uppercase.includes(char)) {
            pool += char;
        }
    }
    
    // Add non-excluded lowercase letters
    for (let char of config.lowercase) {
        if (!excludedChars.lowercase.includes(char)) {
            pool += char;
        }
    }
    
    // Add non-excluded numbers
    for (let char of config.numbers) {
        if (!excludedChars.numbers.includes(char)) {
            pool += char;
        }
    }
    
    // Add non-excluded special symbols
    for (let char of config.symbols) {
        if (!excludedChars.symbols.includes(char)) {
            pool += char;
        }
    }
    
    return pool;
}

// Initialize Event Listeners
function init() {
    slider.oninput = () => {
        lenDisplay.innerText = slider.value;
        generate();
    };

    // Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.preset;
            applyPreset(type);
        });
    });
    
    // Generate Button
    generateBtn.addEventListener('click', generate);
    
    // Batch Generate Button
    multipleBtn.addEventListener('click', generateMultiple);
    
    // Copy Buttons
    cBtn.addEventListener('click', copyAction);
    copyBtn2.addEventListener('click', copyAction);
    
    // Export Button
    exportBtn.addEventListener('click', exportPasswords);
    
    // Character Selector Buttons
    document.getElementById('include-all-btn').addEventListener('click', includeAllChars);
    document.getElementById('exclude-all-btn').addEventListener('click', excludeAllChars);
    document.getElementById('reset-default-btn').addEventListener('click', resetDefaultExclusions);
    
    // Category Action Buttons
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
    
    // Character Item Click Events (delegation)
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
    
    // Add Keyboard Shortcut Support
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Initialize Character Selector
    initCharSelector();
    
    // Auto-generate on page load
    generate();
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
    // Space or Enter to generate new password
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        generate();
    }
    // Ctrl+C to copy password
    else if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        copyAction();
    }
    // Number keys for quick length setting
    else if (e.code.startsWith('Digit') && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.code.replace('Digit', ''));
        if (num >= 6 && num <= 9) {
            slider.value = num;
            lenDisplay.innerText = num;
            generate();
        }
    }
}

// Apply Preset
function applyPreset(type) {
    const preset = presets[type];
    if (!preset) return;
    
    slider.value = preset.len;
    lenDisplay.innerText = preset.len;
    
    // Update preset button states
    updatePresetButtons(type);
    
    generate();
}

// Update Preset Button States
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

// Generate Password
function generate() {
    // Show loading state
    generateIcon.textContent = '';
    generateIcon.classList.add('loading');
    generateText.textContent = 'Generating...';
    
    // Delay execution to ensure UI update
    setTimeout(() => {
        try {
            const pool = getAvailablePool();
            
            if(!pool) {
                output.innerText = "No available characters, please reduce excluded characters";
                updateMeter(0, 0);
                updateAnalysis("", 0);
                resetGenerateButton();
                return;
            }

            const len = parseInt(slider.value);
            let pwd = "";
            const randomValues = new Uint32Array(len);
            window.crypto.getRandomValues(randomValues);

            for(let i=0; i<len; i++) {
                pwd += pool[randomValues[i] % pool.length];
            }

            output.innerText = pwd;
            
            // Update strength and statistics
            updateMeter(len, pool.length);
            updateAnalysis(pwd, pool.length);
            
            // Add to history
            addToHistory(pwd);
            
            // Reset copy button state
            cBtn.classList.remove('copied');
            
        } catch (error) {
            output.innerText = "Generation failed, please try again";
            console.error("Password generation error:", error);
        } finally {
            resetGenerateButton();
        }
    }, 50);
}

// Reset Generate Button State
function resetGenerateButton() {
    generateIcon.classList.remove('loading');
    generateIcon.textContent = '🔄';
    generateText.textContent = 'Generate New Password';
}

// Update Password Strength Meter
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
    
    // Update entropy value and cracking time
    entropyValue.textContent = Math.round(entropy) + " bits";
    updateCrackTime(entropy);
}

// Update Cracking Time Estimation
function updateCrackTime(entropy) {
    // Assume attacker tries 1 trillion guesses per second (10^12)
    const guessesPerSecond = 1e12;
    const seconds = Math.pow(2, entropy) / guessesPerSecond;
    
    let timeText = "Instant";
    
    if (seconds < 1) {
        timeText = "Instant";
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
    
    crackTime.textContent = `Estimated cracking time: ${timeText}`;
}

// Update Password Analysis
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

// Add to History
function addToHistory(password) {
    const timestamp = new Date().toISOString();
    passwordHistory.unshift({
        password: password,
        timestamp: timestamp,
        length: password.length,
        excludedChars: {...excludedChars}
    });
    
    // Limit history size
    if (passwordHistory.length > maxHistory) {
        passwordHistory = passwordHistory.slice(0, maxHistory);
    }
    
    // Save to local storage
    localStorage.setItem('pwHistory', JSON.stringify(passwordHistory));
}

// Copy Password
function copyAction() {
    const text = output.innerText;
    if(text.includes('No available characters') || text.includes('Generation failed') || text.includes('Generating')) {
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        cBtn.classList.add('copied');
        copyBtn2.classList.add('copied');
        toast.classList.add('show');
        
        // Update copy button icon to checkmark
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
        console.error("Copy failed:", err);
        toast.textContent = "Copy failed, please manually select and copy";
        toast.style.background = "var(--danger)";
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            toast.style.background = "var(--success)";
            toast.textContent = "Password successfully copied to clipboard!";
        }, 2000);
    });
}

// Generate Multiple Passwords
function generateMultiple() {
    const count = 5;
    const passwords = [];
    
    for (let i = 0; i < count; i++) {
        passwords.push(generateSinglePassword());
    }
    
    // Display batch passwords
    output.innerHTML = passwords.map((pwd, idx) => 
        `<div style="margin-bottom: 8px; font-size: 1.4rem;">${idx+1}. ${pwd}</div>`
    ).join('');
    
    // Update analysis (based on first password)
    const pool = getAvailablePool();
    updateAnalysis(passwords[0], pool.length);
    updateMeter(passwords[0].length, pool.length);
}

// Generate Single Password (for batch generation)
function generateSinglePassword() {
    const pool = getAvailablePool();
    if (!pool) return "Generation failed";
    
    const len = parseInt(slider.value);
    let pwd = "";
    const randomValues = new Uint32Array(len);
    window.crypto.getRandomValues(randomValues);

    for(let i=0; i<len; i++) {
        pwd += pool[randomValues[i] % pool.length];
    }
    
    return pwd;
}

// Export Passwords
function exportPasswords() {
    if (passwordHistory.length === 0) {
        alert("No password history available");
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
    
    // Show export success notification
    toast.textContent = `Exported ${passwordHistory.length} passwords`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Initialize Application
window.addEventListener('DOMContentLoaded', init);