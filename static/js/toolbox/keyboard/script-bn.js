// /static/js/toolbox/keyboard/script-en.js

document.addEventListener('DOMContentLoaded', () => {
    // Initialize: Add Down and Up counter spans to all keys
    document.querySelectorAll('.key').forEach(keyEl => {
        // Bottom-right: Down counter
        const downSpan = document.createElement('span');
        downSpan.className = 'key-stat-down';
        downSpan.innerText = '0';
        keyEl.appendChild(downSpan);

        // Top-right: Up counter
        const upSpan = document.createElement('span');
        upSpan.className = 'key-stat-up';
        upSpan.innerText = '0';
        keyEl.appendChild(upSpan);
    });
    
    // Initialize max concurrency display
    const maxCountEl = document.createElement('span');
    maxCountEl.id = 'count-max';
    maxCountEl.innerText = '0';
    document.querySelector('.stat-item:nth-child(4) .stat-value').appendChild(maxCountEl);
    
    // Initialize user count
    initUserCount();
    
    // Initialize log system
    initLogSystem();
    
    // Show welcome tip
    setTimeout(() => {
        showToast('💡 টিপ: কী ব্যবধান পরীক্ষা করতে দ্রুত একই কী টিপুন। ব্যবধান <80ms লাল রঙে চিহ্নিত করা হয়েছে।', 'info');
    }, 1000);
});

// --- Core Variables ---
const activeCountEl = document.getElementById('count-active');
const testedCountEl = document.getElementById('count-tested');
const totalCountEl = document.getElementById('count-total');
const maxCountEl = document.getElementById('count-max');

// Info panel elements
const infoKey = document.getElementById('info-key');
const infoCode = document.getElementById('info-code');
const infoWhich = document.getElementById('info-which');
const infoTime = document.getElementById('info-time'); 

let pressedKeys = new Set(); 
let testedKeys = new Set(); 
let totalKeystrokes = 0;
let lastKeyTimestamp = 0;
let maxConcurrentKeys = 0;
let diagnosisActive = false;
let diagnosisResults = [];

// --- Key interval detection variables ---
let keyLastPressTime = {}; // Record last press time for each key {keyCode: timestamp}
let keyPressIntervals = {}; // Record interval history for each key {keyCode: [interval1, interval2, ...]}
let minInterval = Infinity; // Record minimum interval
let logAutoScroll = true; // Log auto-scroll

// --- Detailed key statistics object ---
// Structure: { "KeyA": { down: 10, up: 9 }, "Enter": { down: 5, up: 5 } }
let keyStats = {}; 

// --- English key name mapping ---
const keyNamesEn = {
    'Space': 'Space', 'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right',
    'Enter': 'Enter', 'ShiftLeft': 'বাম শিফট', 'ShiftRight': 'ডান শিফট', 'Backspace': 'Backspace',
    'ControlLeft': 'Ctrl বাম', 'ControlRight': 'ডান Ctrl', 'AltLeft': 'বাম Alt', 'AltRight': 'ডান Alt',
    'Tab': 'Tab', 'CapsLock': 'ক্যাপস লক', 'Escape': 'Esc', 'Insert': 'Insert', 'Delete': 'Delete',
    'Home': 'Home', 'End': 'End', 'PageUp': 'পেজ আপ', 'PageDown': 'পাতা নিচে', 'NumLock': 'নম লক',
    'ScrollLock': 'স্ক্রোল লক', 'Pause': 'Pause', 'PrintScreen': 'প্রিন্ট স্ক্রীন', 'ContextMenu': 'মেনু'
};

// --- Log system initialization ---
function initLogSystem() {
    // Initialize log statistics
    updateLogStats();
    
    // Restore log settings
    const savedAutoScroll = localStorage.getItem('keyboardLogAutoScroll');
    if (savedAutoScroll !== null) {
        logAutoScroll = savedAutoScroll === 'true';
        const toggleBtn = document.getElementById('toggle-scroll');
        if (toggleBtn) {
            toggleBtn.innerHTML = logAutoScroll ? 
                '<i class="fas fa-scroll"></i> স্বয়ংক্রিয় স্ক্রোল চালু৷' : 
                '<i class="fas fa-scroll"></i> অটো স্ক্রোল বন্ধ';
        }
    }
}

// --- KeyDown event listener ---
document.addEventListener('keydown', (e) => {
    e.preventDefault();
    
    // 1. Key interval detection logic
    const currentTime = performance.now();
    const keyCode = e.code;
    
    if (keyLastPressTime[keyCode]) {
        const interval = Math.round(currentTime - keyLastPressTime[keyCode]);
        
        // Record interval history
        if (!keyPressIntervals[keyCode]) {
            keyPressIntervals[keyCode] = [];
        }
        keyPressIntervals[keyCode].push(interval);
        
        // Update minimum interval
        if (interval < minInterval && interval > 0) {
            minInterval = interval;
            document.getElementById('log-min-interval').textContent = `${minInterval} ms`;
        }
        
        // Log (unless auto-repeat event)
        if (!e.repeat) {
            logKeyInterval(keyCode, interval);
        }
        
        // Diagnosis mode detection
        if (diagnosisActive) {
            if (interval < 20) {
                addDiagnosisResult('গুরুতর ডবল-ট্যাপ', `Key ${getKeyDisplayName(keyCode)} interval only ${interval}ms`, 'error');
            } else if (interval < 50) {
                addDiagnosisResult('মাঝারি ডবল-ট্যাপ', `Key ${getKeyDisplayName(keyCode)} interval ${interval}ms`, 'warning');
            } else if (interval < 80) {
                addDiagnosisResult('মাইনর ডাবল-ট্যাপ', `Key ${getKeyDisplayName(keyCode)} interval ${interval}ms`, 'info');
            }
        }
    }
    
    // Update last key press time
    keyLastPressTime[keyCode] = currentTime;
    
    // 2. Initialize key statistics object (if not exists)
    if (!keyStats[e.code]) {
        keyStats[e.code] = { down: 0, up: 0 };
    }

    // 3. Physical press logic (ignore auto-repeat from holding)
    if (!e.repeat) {
        // Increase down count
        keyStats[e.code].down++;
        
        // Increase total keystrokes
        totalKeystrokes++;
        
        // Calculate time delta (adjacent key interval)
        if (lastKeyTimestamp !== 0) {
            const timeDelta = Math.round(currentTime - lastKeyTimestamp);
            infoTime.innerText = `${timeDelta} ms`;
        } else {
            infoTime.innerText = 'Start'; 
        }
        lastKeyTimestamp = currentTime;

        // Update UI: On-keyboard numbers (show down count - bottom-right)
        const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
        if (keyEl) {
            keyEl.classList.add('tested');
            
            // Get or create down span
            let downCounter = keyEl.querySelector('.key-stat-down');
            if (!downCounter) {
                downCounter = document.createElement('span');
                downCounter.className = 'key-stat-down';
                keyEl.appendChild(downCounter);
            }
            downCounter.innerText = keyStats[e.code].down;
        }

        testedKeys.add(e.code);
    }

    // 4. Visual state: Keep key highlighted on any KeyDown (even repeat)
    // Concurrency counting logic
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) keyEl.classList.add('active');
    pressedKeys.add(e.code);
    
    // Update maximum concurrency
    if (pressedKeys.size > maxConcurrentKeys) {
        maxConcurrentKeys = pressedKeys.size;
        maxCountEl.innerText = maxConcurrentKeys;
        
        // NKRO detection in diagnosis mode
        if (diagnosisActive) {
            if (maxConcurrentKeys < 6) {
                addDiagnosisResult('দুর্বল অ্যান্টি-গোস্টিং', `Max concurrent keys only ${maxConcurrentKeys}`, 'warning');
            } else if (maxConcurrentKeys >= 20) {
                addDiagnosisResult('চমৎকার NKRO কর্মক্ষমতা', `Supports ${maxConcurrentKeys} key rollover`, 'success');
            }
        }
    }
    
    // 5. Update panels
    updateStats();
    updateInfo(e);
});

// --- KeyUp event listener ---
document.addEventListener('keyup', (e) => {
    e.preventDefault();
    
    // 1. Initialize statistics object (edge case: key up without prior down)
    if (!keyStats[e.code]) {
        keyStats[e.code] = { down: 0, up: 0 };
    }

    // 2. Increase up count
    keyStats[e.code].up++;

    // 3. Remove visual state
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) {
        keyEl.classList.remove('active');
        
        // Update UI: On-keyboard numbers (show up count - top-right)
        let upCounter = keyEl.querySelector('.key-stat-up');
        if (!upCounter) {
            upCounter = document.createElement('span');
            upCounter.className = 'key-stat-up';
            keyEl.appendChild(upCounter);
        }
        upCounter.innerText = keyStats[e.code].up;
        
        // Detect key sticking (down count ≠ up count)
        if (keyStats[e.code].down !== keyStats[e.code].up && diagnosisActive) {
            addDiagnosisResult('কী স্টিকিং', `Key ${getKeyDisplayName(e.code)}: Down ${keyStats[e.code].down} vs Up ${keyStats[e.code].up}`, 'error');
        }
    }
    
    pressedKeys.delete(e.code);
    
    // 4. Update panels
    updateStats();
    updateInfo(e); 
});

// --- Helper Functions ---

function updateStats() {
    activeCountEl.innerText = pressedKeys.size;
    testedCountEl.innerText = testedKeys.size;
    totalCountEl.innerText = totalKeystrokes;
    
    // Change color based on concurrency
    if (pressedKeys.size > 20) {
        activeCountEl.style.color = '#00ffaa';
        activeCountEl.style.textShadow = '0 0 10px #00ffaa';
    } else if (pressedKeys.size > 10) {
        activeCountEl.style.color = '#00ffaa';
    } else if (pressedKeys.size > 6) {
        activeCountEl.style.color = '#ffce00';
    } else if (pressedKeys.size > 3) {
        activeCountEl.style.color = '#ff9800';
    } else {
        activeCountEl.style.color = '';
        activeCountEl.style.textShadow = '';
    }
    
    // Update max concurrency display
    maxCountEl.innerText = maxConcurrentKeys;
}

function updateInfo(e) {
    const displayName = getKeyDisplayName(e.code);

    infoKey.innerText = displayName;
    infoCode.innerText = e.code;
    infoWhich.innerText = e.which;
}

function getKeyDisplayName(keyCode) {
    return keyNamesEn[keyCode] || keyCode.replace(/^(Key|Digit|Arrow)/, '') || keyCode;
}

// Reset function
window.resetTest = function() {

        pressedKeys.clear();
        testedKeys.clear();
        keyStats = {}; // Clear statistics object
        totalKeystrokes = 0;
        lastKeyTimestamp = 0;
        maxConcurrentKeys = 0;
        diagnosisResults = [];
        diagnosisActive = false;
        
        // Clear interval detection data
        keyLastPressTime = {};
        keyPressIntervals = {};
        minInterval = Infinity;

        document.querySelectorAll('.key').forEach(el => {
            el.classList.remove('active');
            el.classList.remove('tested');
            
            // Reset on-keyboard numbers
            const downStat = el.querySelector('.key-stat-down');
            if(downStat) downStat.innerText = '0';
            
            const upStat = el.querySelector('.key-stat-up');
            if(upStat) upStat.innerText = '0';
        });

        updateStats();
        infoKey.innerText = '-';
        infoCode.innerText = '-';
        infoWhich.innerText = '-';
        infoTime.innerText = '- ms';
        
        // Reset logs
        clearLog();
        
        // Close diagnosis panel
        const diagnosisPanel = document.querySelector('.diagnosis-panel');
        if (diagnosisPanel) diagnosisPanel.remove();
        
        const reportOverlay = document.querySelector('.report-overlay');
        if (reportOverlay) reportOverlay.remove();
        
        // Show reset success message
        showToast('পরীক্ষার ডেটা, নির্ণয়ের ফলাফল এবং লগগুলি পুনরায় সেট করা হয়েছে৷', 'success');
    
}

// Scroll to keyboard area
window.scrollToKeyboard = function() {
    const keyboardContainer = document.querySelector('.keyboard-container');
    if (keyboardContainer) {
        keyboardContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Add visual feedback
        keyboardContainer.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.5)';
        setTimeout(() => {
            keyboardContainer.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        }, 1000);
    }
}

// Simulated user count
function initUserCount() {
    const userCountEl = document.getElementById('user-count');
    if (userCountEl) {
        let count = 10000;
        
        // Initial display
        userCountEl.textContent = count.toLocaleString() + '+';
        
        // Increase users every 30 seconds
        setInterval(() => {
            count += Math.floor(Math.random() * 3) + 1;
            userCountEl.textContent = count.toLocaleString() + '+';
        }, 30000);
    }
}

// Show Toast message
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00552e' : type === 'error' ? '#5a1a1a' : '#1e1e1e'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        border-left: 4px solid ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#4fc3f7'};
        max-width: 400px;
        word-break: break-word;
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Clear key states when window loses focus
window.addEventListener('blur', () => {
    pressedKeys.clear();
    document.querySelectorAll('.key.active').forEach(el => el.classList.remove('active'));
    updateStats();
});

// Export test data (for console use)
window.getTestStats = function() {
    return {
        testedKeys: Array.from(testedKeys),
        totalKeystrokes: totalKeystrokes,
        maxConcurrentKeys: maxConcurrentKeys,
        keyStats: keyStats,
        keyPressIntervals: keyPressIntervals,
        minInterval: minInterval,
        diagnosisResults: diagnosisResults
    };
};

// Show keyboard testing tips
window.showKeyboardTips = function() {
    const tips = [
        "💡 টিপ: কী ব্যবধান পরীক্ষা করতে দ্রুত একই কী টিপুন। ব্যবধান <80ms লাল রঙে চিহ্নিত করা হয়েছে।",
        "💡 টিপ: সাধারণ মানুষের অপারেশন বিরতি সাধারণত> 100ms হয়, গেমাররা 80-120ms হতে পারে।",
        "💡 টিপ: ঘন ঘন <50ms বিরতি কীবোর্ডের ডবল-ট্যাপ ত্রুটিগুলি নির্দেশ করতে পারে।",
        "💡 টিপ: অ্যান্টি-ঘোস্টিং ক্ষমতা পরীক্ষা করতে একসাথে একাধিক কী টিপে চেষ্টা করুন।",
        "💡 টিপ: সব কীগুলো পর্যায়ক্রমে পরীক্ষা করুন, বিশেষ করে WASD এবং Spacebar এর মতো ঘন ঘন ব্যবহার করা কী।",
        "💡 টিপ: নিচে/উপরের গণনা মিলেছে কিনা লক্ষ্য করুন। অমিল কী স্টিকিং নির্দেশ করতে পারে।"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showToast(randomTip, 'info');
};

// ==================== New Log Functions ====================

// Log key interval
function logKeyInterval(keyCode, interval) {
    const logContent = document.getElementById('log-content');
    if (!logContent) return;
    
    const now = new Date();
    const timeStr = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    const keyName = getKeyDisplayName(keyCode);
    
    // Determine log level based on interval
    let logLevel = 'normal';
    let logMessage = '';
    let warningMessage = '';
    
    if (interval < 20) {
        logLevel = 'critical';
        logMessage = `Key[${keyName}] Interval:${interval}ms ⚠️ Critical! Possible contact bounce or debounce failure`;
        warningMessage = 'গুরুতর ডবল-ট্যাপ ত্রুটি, অবিলম্বে মেরামত প্রয়োজন';
    } else if (interval < 50) {
        logLevel = 'error';
        logMessage = `Key[${keyName}] Interval:${interval}ms ❌ Abnormal! Possible double-tap fault`;
        warningMessage = 'মাঝারি ডবল-ট্যাপ দোষ, শীঘ্রই ঠিকানা';
    } else if (interval < 80) {
        logLevel = 'warning';
        logMessage = `Key[${keyName}] Interval:${interval}ms ⚠️ Short! May indicate early double-tap`;
        warningMessage = 'মাইনর ডবল-ট্যাপ, ঘনিষ্ঠভাবে পর্যবেক্ষণ করুন';
    } else {
        logLevel = 'normal';
        logMessage = `Key[${keyName}] Interval:${interval}ms ✓ Normal`;
    }
    
    // Create log entry
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${logLevel}`;
    logEntry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-message">${logMessage}</span>
    `;
    
    logContent.appendChild(logEntry);
    
    // Update log statistics
    updateLogStats();
    
    // Auto-scroll to bottom
    if (logAutoScroll) {
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    // Show Toast for warning level and above
    if (logLevel === 'warning' || logLevel === 'error' || logLevel === 'critical') {
        showToast(`Abnormal key interval detected: ${interval}ms (${keyName})`, 'error');
    }
}

// Update log statistics
function updateLogStats() {
    const logContent = document.getElementById('log-content');
    if (!logContent) return;
    
    const logCount = logContent.children.length;
    const warningCount = Array.from(logContent.children).filter(
        child => child.className.includes('log-warning') || 
                child.className.includes('log-error') || 
                child.className.includes('log-critical')
    ).length;
    
    document.getElementById('log-count').textContent = logCount;
    document.getElementById('log-warning-count').textContent = warningCount;
    
    // Update minimum interval display
    if (minInterval < Infinity) {
        document.getElementById('log-min-interval').textContent = `${minInterval} ms`;
    }
}

// Clear logs
window.clearLog = function() {
    const logContent = document.getElementById('log-content');
    if (!logContent) return;
    
    if (logContent.children.length <= 2) return; // Keep initial two messages
    
  
        // Keep first two initial messages
        const initialLogs = Array.from(logContent.children).slice(0, 2);
        logContent.innerHTML = '';
        initialLogs.forEach(log => logContent.appendChild(log));
        
        // Reset statistics
        keyLastPressTime = {};
        keyPressIntervals = {};
        minInterval = Infinity;
        
        updateLogStats();
        showToast('লগ সাফ করা হয়েছে', 'success');
    
}

// Toggle log show/hide
window.toggleLog = function() {
    const logContent = document.getElementById('log-content');
    const logContainer = document.querySelector('.log-container');
    
    if (logContent && logContainer) {
        if (logContainer.style.maxHeight && logContainer.style.maxHeight !== '0px') {
            logContainer.style.maxHeight = '0px';
            logContainer.style.opacity = '0';
            document.getElementById('toggle-log').innerHTML = '<i class="fas fa-eye"></i> লগ দেখান৷';
        } else {
            logContainer.style.maxHeight = '500px';
            logContainer.style.opacity = '1';
            document.getElementById('toggle-log').innerHTML = '<i class="fas fa-ey-slash"></i> লগ লুকান৷';
        }
    }
}

// Toggle auto-scroll
window.toggleAutoScroll = function() {
    logAutoScroll = !logAutoScroll;
    localStorage.setItem('keyboardLogAutoScroll', logAutoScroll.toString());
    
    const toggleBtn = document.getElementById('toggle-scroll');
    if (toggleBtn) {
        toggleBtn.innerHTML = logAutoScroll ? 
            '<i class="fas fa-scroll"></i> স্বয়ংক্রিয় স্ক্রোল চালু৷' : 
            '<i class="fas fa-scroll"></i> অটো স্ক্রোল বন্ধ';
    }
    
    showToast(logAutoScroll ? 'স্বয়ংক্রিয় স্ক্রোল সক্ষম' : 'স্বয়ংক্রিয় স্ক্রোল নিষ্ক্রিয়', 'info');
}

// Start interval test
window.startIntervalTest = function() {
    showToast('কী ব্যবধান পরীক্ষা শুরু করা: দ্রুত একই কী টিপুন (যেমন, W কী বা স্পেসবার)', 'info');
    
    // Add test instructions to log
    const logContent = document.getElementById('log-content');
    const now = new Date();
    const timeStr = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    
    const testStartEntry = document.createElement('div');
    testStartEntry.className = 'log-entry log-info';
    testStartEntry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-message">কী ব্যবধান পরীক্ষা শুরু হচ্ছে - অনুগ্রহ করে দ্রুত একই কী বারবার টিপুন</span>
    `;
    logContent.appendChild(testStartEntry);
    
    updateLogStats();
    
    // Scroll to log area
    document.querySelector('.log-container').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
}

// ==================== Diagnosis Functions ====================

// Start diagnosis mode
window.startDiagnosis = function() {
    // Close existing diagnosis panel if present
    const existingPanel = document.querySelector('.diagnosis-panel');
    if (existingPanel) existingPanel.remove();
    
    const existingReport = document.querySelector('.report-overlay');
    if (existingReport) existingReport.remove();
    
    // Reset diagnosis results
    diagnosisResults = [];
    diagnosisActive = true;
    window.diagnosisStartTime = Date.now();
    
    const diagnosticSteps = [
        {
            title: "🔍 ধাপ 1: একক কী ফাংশন পরীক্ষা",
            instruction: "অনুগ্রহ করে অ-প্রতিক্রিয়াশীল কীগুলি পরীক্ষা করতে নিম্নলিখিত কী গোষ্ঠীগুলি পর্যায়ক্রমে পরীক্ষা করুন:<br>1. WASD নির্দেশমূলক কী<br>2. সংখ্যা কী 1-5<br>3. তীর কী ↑↓←→<br>4. স্পেসবার এবং এন্টার কী",
            action: "testAllKeys",
            check: "চেক করুন প্রতিটি কী চাপলে সাদা হয়ে যায় কিনা",
            time: 60
        },
        {
            title: "⏱️ ধাপ 2: মূল ব্যবধান সনাক্তকরণ",
            instruction: "দ্রুত একই কী 10 বার টিপুন (W কী এবং স্পেসবার পরীক্ষা করার সুপারিশ করুন), লগ আউটপুট পর্যবেক্ষণ করুন",
            action: "testInterval",
            check: "মূল ব্যবধানগুলি পর্যবেক্ষণ করুন। স্বাভাবিক হতে হবে >80ms ব্যবধান <80ms লাল চিহ্নিত করা হয়েছে",
            time: 30
        },
        {
            title: "🎮 ধাপ 3: NKRO অ্যান্টি-গোস্টিং পরীক্ষা",
            instruction: "আপনার পুরো হাতটি মধ্যম কীবোর্ড এলাকায় টিপুন, একসাথে যতটা সম্ভব কী টিপুন",
            action: "testNKRO",
            check: "'বর্তমান সামঞ্জস্য' মান পর্যবেক্ষণ করুন। সাধারণ কীবোর্ডের ≥6 হওয়া উচিত, গেমিং কীবোর্ড 10+ এ পৌঁছাতে পারে",
            time: 20
        },
        {
            title: "⚡ ধাপ 4: প্রতিক্রিয়া বিলম্ব পরীক্ষা",
            instruction: "মাঝারি গতিতে বিভিন্ন কী টিপুন, প্রতিক্রিয়া সময় পর্যবেক্ষণ করুন",
            action: "testResponseTime",
            check: "ব্যবধানের সময় বড় ওঠানামা ছাড়াই 50-200ms এর মধ্যে স্থিতিশীল হওয়া উচিত",
            time: 30
        },
        {
            title: "🔄 ধাপ 5: মূল দ্বন্দ্ব সনাক্তকরণ",
            instruction: "একই সাথে টিপুন: W+A+Shift+Space<br>তারপর: Ctrl+Shift+Alt",
            action: "testKeyConflict",
            check: "সমস্ত কী একই সাথে হাইলাইট করা উচিত, কোনটি ব্যর্থ হওয়া উচিত নয়",
            time: 30
        }
    ];
    
    // Create diagnosis panel
    createDiagnosisPanel(diagnosticSteps);
};

function createDiagnosisPanel(steps) {
    const panel = document.createElement('div');
    panel.className = 'diagnosis-panel';
    panel.innerHTML = `
        <div class="diagnosis-header">
            <h3><i class="fas fa-stethoscope"></i> Keyboard Diagnostic Mode</h3>
            <button class="close-diagnosis"><i class="fas fa-times"></i></button>
        </div>
        <div class="diagnosis-progress">
            <div class="progress-bar"><div class="progress-fill" style="width: 20%;"></div></div>
            <div class="progress-text">Step 1/${steps.length}</div>
        </div>
        <div class="diagnosis-content">
            <div class="step-current">
                <h4 id="step-title">${steps[0].title}</h4>
                <p id="step-instruction">${steps[0].instruction}</p>
                <div class="step-requirements">
                    <strong>Check Points:</strong> ${steps[0].check}<br>
                    <small><i class="far fa-clock"></i> Suggested time: ${steps[0].time} seconds</small>
                </div>
            </div>
            <div class="step-results" id="step-results"></div>
        </div>
        <div class="diagnosis-actions">
            <button class="btn-step" id="prev-step"><i class="fas fa-arrow-left"></i> Previous</button>
            <button class="btn-step" id="next-step">Next <i class="fas fa-arrow-right"></i></button>
            <button class="btn-complete" id="complete-diagnosis">Complete Diagnosis & Generate Report</button>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Initialize diagnosis state
    let currentStep = 0;
    
    // Update progress
    function updateProgress() {
        const progress = ((currentStep + 1) / steps.length) * 100;
        document.querySelector('.progress-fill').style.width = `${progress}%`;
        document.querySelector('.progress-text').textContent = `Step ${currentStep + 1}/${steps.length}`;
        
        document.getElementById('step-title').innerHTML = steps[currentStep].title;
        document.getElementById('step-instruction').innerHTML = steps[currentStep].instruction;
        document.querySelector('.step-requirements').innerHTML = `
            <strong>Check Points:</strong> ${steps[currentStep].check}<br>
            <small><i class="far fa-clock"></i> Suggested time: ${steps[currentStep].time} seconds</small>
        `;
    }
    
    // Add diagnosis result
    function addStepResult(status, message) {
        const resultDiv = document.getElementById('step-results');
        const resultItem = document.createElement('div');
        resultItem.className = `step-result ${status}`;
        resultItem.innerHTML = `<i class="fas fa-${status === 'success' ? 'check' : status === 'warning' ? 'exclamation' : 'times'}"></i> ${message}`;
        resultDiv.appendChild(resultItem);
        
        // Add to diagnosis results array
        diagnosisResults.push({
            step: currentStep + 1,
            title: steps[currentStep].title,
            status: status,
            message: message,
            timestamp: Date.now()
        });
    }
    
    // Auto-detect current step result
    function autoDetectStepResult() {
        switch(currentStep) {
            case 0: // Single key function test
                if (testedKeys.size >= 20) {
                    addStepResult('success', `Tested ${testedKeys.size} keys, basic functions normal`);
                } else if (testedKeys.size > 0) {
                    addStepResult('warning', `Only tested ${testedKeys.size} keys, recommend testing more`);
                } else {
                    addStepResult('error', 'এখনও কোন কী পরীক্ষা করা হয়নি');
                }
                break;
            case 1: // Key interval detection
                // Analyze key interval data
                let hasCriticalInterval = false;
                let hasWarningInterval = false;
                
                Object.entries(keyPressIntervals).forEach(([key, intervals]) => {
                    intervals.forEach(interval => {
                        if (interval < 20) {
                            hasCriticalInterval = true;
                        } else if (interval < 80) {
                            hasWarningInterval = true;
                        }
                    });
                });
                
                if (hasCriticalInterval) {
                    addStepResult('error', 'গুরুতর ডবল-ট্যাপ সমস্যা শনাক্ত করা হয়েছে (ব্যবধান <20ms)');
                } else if (hasWarningInterval) {
                    addStepResult('warning', 'ছোটখাটো ডবল-ট্যাপ সমস্যা শনাক্ত করা হয়েছে (ব্যবধান <80ms)');
                } else if (Object.keys(keyPressIntervals).length > 0) {
                    addStepResult('success', 'কী ব্যবধান স্বাভাবিক, কোনো ডবল-ট্যাপ শনাক্ত হয়নি');
                } else {
                    addStepResult('info', 'মূল ব্যবধান পরীক্ষা এখনও সঞ্চালিত হয়নি');
                }
                break;
            case 2: // NKRO test
                if (maxConcurrentKeys >= 10) {
                    addStepResult('success', `Excellent NKRO performance: Supports ${maxConcurrentKeys} key rollover`);
                } else if (maxConcurrentKeys >= 6) {
                    addStepResult('warning', `Average NKRO performance: Supports only ${maxConcurrentKeys} key rollover`);
                } else {
                    addStepResult('error', `Poor NKRO performance: Supports only ${maxConcurrentKeys} key rollover`);
                }
                break;
            case 3: // Response delay test
                // Simplified - actual should analyze time series
                if (testedKeys.size > 10) {
                    addStepResult('success', 'প্রতিক্রিয়া বিলম্ব পরীক্ষা সম্পন্ন হয়েছে, ব্যবহারের অভিজ্ঞতার ভিত্তিতে বিচার করুন');
                } else {
                    addStepResult('info', 'প্রতিক্রিয়া বিলম্ব মূল্যায়ন করতে আরো কী পরীক্ষা করুন');
                }
                break;
            case 4: // Key conflict test
                if (maxConcurrentKeys >= 4) {
                    addStepResult('success', `Combination key test passed, supports ${maxConcurrentKeys} keys simultaneously`);
                } else {
                    addStepResult('warning', `Limited combination key support, only supports ${maxConcurrentKeys} keys simultaneously`);
                }
                break;
        }
    }
    
    // Event listeners
    document.querySelector('.close-diagnosis').addEventListener('click', () => {
        if (confirm('আপনি কি নিশ্চিত যে আপনি ডায়াগনস্টিক মোড থেকে প্রস্থান করতে চান? অসম্পূর্ণ ফলাফল সংরক্ষণ করা হবে না.')) {
            panel.remove();
            diagnosisActive = false;
        }
    });
    
    document.getElementById('next-step').addEventListener('click', () => {
        // Auto-detect current step result
        autoDetectStepResult();
        
        if (currentStep < steps.length - 1) {
            currentStep++;
            updateProgress();
            document.getElementById('step-results').innerHTML = '';
        } else {
            completeDiagnosis();
        }
    });
    
    document.getElementById('prev-step').addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateProgress();
            document.getElementById('step-results').innerHTML = '';
        }
    });
    
    document.getElementById('complete-diagnosis').addEventListener('click', () => {
        // Auto-detect last step result
        autoDetectStepResult();
        completeDiagnosis();
    });
    
    function completeDiagnosis() {
        generateDiagnosisReport();
        panel.remove();
        diagnosisActive = false;
    }
}

// Add to diagnosis results array
function addDiagnosisResult(type, details, severity = 'info') {
    diagnosisResults.push({
        type: type,
        details: details,
        severity: severity,
        timestamp: Date.now()
    });
}

function generateDiagnosisReport() {
    // Analyze test data
    const totalKeysTested = testedKeys.size;
    const totalKeystrokesTested = totalKeystrokes;
    const maxConcurrency = maxConcurrentKeys;
    const testDuration = Math.round((Date.now() - window.diagnosisStartTime) / 1000);
    
    // Analyze key interval data
    let criticalIntervals = 0;
    let warningIntervals = 0;
    let totalIntervals = 0;
    
    Object.values(keyPressIntervals).forEach(intervals => {
        intervals.forEach(interval => {
            totalIntervals++;
            if (interval < 20) criticalIntervals++;
            else if (interval < 80) warningIntervals++;
        });
    });
    
    // Fault detection logic
    const issues = [];
    const warnings = [];
    const successes = [];
    
    // Check key sticking (down count ≠ up count)
    Object.entries(keyStats).forEach(([keyCode, stats]) => {
        if (stats.down !== stats.up) {
            issues.push({
                type: 'কী স্টিকিং',
                key: getKeyDisplayName(keyCode),
                details: `Down ${stats.down} vs Up ${stats.up}`,
                severity: 'error'
            });
        }
    });
    
    // Check double-tap issues
    if (criticalIntervals > 0) {
        issues.push({
            type: 'গুরুতর ডবল-ট্যাপ',
            severity: 'error',
            details: `Detected ${criticalIntervals} severe double-taps (intervals &lt;20ms)`
        });
    }
    
    if (warningIntervals > 0) {
        warnings.push({
            type: 'মাইনর ডাবল-ট্যাপ',
            severity: 'warning',
            details: `Detected ${warningIntervals} minor double-taps (intervals 20-79ms)`
        });
    }
    
    // Check low concurrency (may indicate weak anti-ghosting)
    if (maxConcurrency < 6) {
        warnings.push({
            type: 'দুর্বল অ্যান্টি-গোস্টিং',
            severity: 'warning',
            details: `Maximum concurrent keys only ${maxConcurrency}, normal keyboards should have 6+ key rollover`
        });
    } else if (maxConcurrency >= 10) {
        successes.push({
            type: 'চমৎকার NKRO কর্মক্ষমতা',
            severity: 'success',
            details: `Supports ${maxConcurrency} key rollover, suitable for gaming`
        });
    }
    
    // Check key response
    if (totalKeysTested < 50) {
        warnings.push({
            type: 'অসম্পূর্ণ পরীক্ষা',
            severity: 'warning',
            details: `Only tested ${totalKeysTested} keys, recommend testing all keys`
        });
    }
    
    // Check diagnosis step results
    diagnosisResults.forEach(result => {
        if (result.status === 'error' || result.severity === 'error') {
            issues.push(result);
        } else if (result.status === 'warning' || result.severity === 'warning') {
            warnings.push(result);
        } else if (result.status === 'success' || result.severity === 'success') {
            successes.push(result);
        }
    });
    
    // Generate report HTML
    const reportHTML = `
        <div class="diagnosis-report">
            <h3><i class="fas fa-file-medical-alt"></i> Keyboard Diagnostic Report</h3>
            <div class="report-meta">
                <div class="meta-item">
                    <i class="far fa-calendar"></i>
                    <span>${new Date().toLocaleString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-keyboard"></i>
                    <span>Keyboard Diagnostic Report</span>
                </div>
            </div>
            
            <div class="report-summary">
                <div class="summary-item">
                    <span class="summary-label">Keys Tested</span>
                    <span class="summary-value">${totalKeysTested}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Keystrokes</span>
                    <span class="summary-value">${totalKeystrokesTested}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Max Concurrency</span>
                    <span class="summary-value">${maxConcurrency}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Test Duration</span>
                    <span class="summary-value">${testDuration}s</span>
                </div>
            </div>
            
            <div class="interval-stats">
                <h4><i class="fas fa-clock"></i> Key Interval Statistics</h4>
                <div class="interval-grid">
                    <div class="interval-item">
                        <span class="interval-label">Total Intervals</span>
                        <span class="interval-value">${totalIntervals}</span>
                    </div>
                    <div class="interval-item">
                        <span class="interval-label">গুরুতর ডবল-ট্যাপs</span>
                        <span class="interval-value critical">${criticalIntervals}</span>
                    </div>
                    <div class="interval-item">
                        <span class="interval-label">Minor Double-Taps</span>
                        <span class="interval-value warning">${warningIntervals}</span>
                    </div>
                    <div class="interval-item">
                        <span class="interval-label">Normal Intervals</span>
                        <span class="interval-value success">${totalIntervals - criticalIntervals - warningIntervals}</span>
                    </div>
                </div>
            </div>
            
            <div class="report-status">
                ${issues.length > 0 ? `
                <div class="status-badge status-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Detected ${issues.length} issues</span>
                </div>
                ` : warnings.length > 0 ? `
                <div class="status-badge status-warning">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${warnings.length} considerations</span>
                </div>
                ` : `
                <div class="status-badge status-success">
                    <i class="fas fa-check-circle"></i>
                    <span>Keyboard in good condition</span>
                </div>
                `}
            </div>
            
            ${issues.length > 0 ? `
            <div class="report-issues">
                <h4><i class="fas fa-exclamation-triangle"></i> Detected Issues</h4>
                <div class="issues-list">
                    ${issues.map(issue => `
                        <div class="issue-item">
                            <div class="issue-header">
                                <i class="fas fa-times-circle"></i>
                                <strong>${issue.type}</strong>
                                ${issue.key ? `<span class="issue-key">${issue.key}</span>` : ''}
                            </div>
                            <div class="issue-detail">${issue.details}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${warnings.length > 0 ? `
            <div class="report-warnings">
                <h4><i class="fas fa-exclamation-circle"></i> Considerations</h4>
                <div class="warnings-list">
                    ${warnings.map(warning => `
                        <div class="warning-item">
                            <div class="warning-header">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>${warning.type}</strong>
                            </div>
                            <div class="warning-detail">${warning.details}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${successes.length > 0 ? `
            <div class="report-successes">
                <h4><i class="fas fa-check-circle"></i> Good Performance</h4>
                <div class="successes-list">
                    ${successes.map(success => `
                        <div class="success-item">
                            <div class="success-header">
                                <i class="fas fa-check"></i>
                                <strong>${success.type}</strong>
                            </div>
                            <div class="success-detail">${success.details}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="report-suggestions">
                <h4><i class="fas fa-lightbulb"></i> Maintenance Suggestions</h4>
                ${issues.length === 0 ? `
                <div class="suggestion-item">
                    <i class="fas fa-check"></i>
                    <div>
                        <h5>Keyboard in Good Condition</h5>
                        <p>Your keyboard is functioning normally. Recommended:</p>
                        <ul>
                            <li>Use compressed air to clean under keycaps monthly</li>
                            <li>Avoid eating/drinking near keyboard to prevent liquid spills</li>
                            <li>Conduct keyboard testing quarterly</li>
                            <li>Use keyboard cover to extend lifespan</li>
                        </ul>
                    </div>
                </div>
                ` : issues.some(i => i.type.includes('Double-Tap')) ? `
                <div class="suggestion-item">
                    <i class="fas fa-tools"></i>
                    <div>
                        <h5>Double-Tap Repair Suggestions</h5>
                        <p>Double-tap issues detected. Recommended:</p>
                        <ol>
                            <li>Clean key contacts with isopropyl alcohol and cotton swabs</li>
                            <li>For mechanical keyboards, consider replacing faulty switches</li>
                            <li>Update keyboard drivers or firmware</li>
                            <li>For membrane keyboards, consider professional cleaning or replacement</li>
                        </ol>
                    </div>
                </div>
                ` : `
                <div class="suggestion-item">
                    <i class="fas fa-wrench"></i>
                    <div>
                        <h5>General Maintenance Suggestions</h5>
                        <p>Based on detection results, recommended:</p>
                        <ol>
                            <li>Check USB connection stability, try different USB ports</li>
                            <li>Update keyboard drivers to eliminate software issues</li>
                            <li>Clean internal dust to improve contact performance</li>
                            <li>For wireless keyboards, replace batteries to reduce latency</li>
                        </ol>
                    </div>
                </div>
                `}
            </div>
            
            <div class="report-actions">
                <button onclick="window.print()" class="btn-print">
                    <i class="fas fa-print"></i> Print Report
                </button>
                <button onclick="saveReportAsImage()" class="btn-save">
                    <i class="fas fa-download"></i> Save Screenshot
                </button>
                <button onclick="this.closest('.report-overlay').remove()" class="btn-close">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    const reportOverlay = document.createElement('div');
    reportOverlay.className = 'report-overlay';
    reportOverlay.innerHTML = reportHTML;
    document.body.appendChild(reportOverlay);
    
    // Save report as image (simplified)
    window.saveReportAsImage = function() {
        showToast('রিপোর্ট স্ক্রিনশট ক্লিপবোর্ডে সংরক্ষিত (সিমুলেটেড ফাংশন)', 'info');
        // Actual implementation requires libraries like html2canvas
    };
}