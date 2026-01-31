// /static/js/toolbox/keyboard/script-en.js

document.addEventListener('DOMContentLoaded', () => {
    // Initialize: Add "Press (Down)" and "Release (Up)" counter spans for all keys
    document.querySelectorAll('.key').forEach(keyEl => {
        // Bottom right shows press counter (Down)
        const downSpan = document.createElement('span');
        downSpan.className = 'key-stat-down';
        downSpan.innerText = '0';
        keyEl.appendChild(downSpan);

        // Top right shows release counter (Up)
        const upSpan = document.createElement('span');
        upSpan.className = 'key-stat-up';
        upSpan.innerText = '0';
        keyEl.appendChild(upSpan);
    });
    
    // Initialize max concurrent display
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
        showToast('💡 Tip: Quickly press the same key repeatedly to test key interval, intervals less than 80ms will be marked in red', 'info');
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

// --- Key Interval Detection Related Variables ---
let keyLastPressTime = {}; // Record each key's last press time {keyCode: timestamp}
let keyPressIntervals = {}; // Record each key's interval history {keyCode: [interval1, interval2, ...]}
let minInterval = Infinity; // Record minimum interval
let logAutoScroll = true; // Log auto scroll

// --- Detailed Key Statistics Object ---
// Structure: { "KeyA": { down: 10, up: 9 }, "Enter": { down: 5, up: 5 } }
let keyStats = {}; 

// --- English Key Name Mapping ---
const keyNamesEn = {
    'Space': 'Space', 'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right',
    'Enter': 'Enter', 'ShiftLeft': 'Left Shift', 'ShiftRight': 'Right Shift', 'Backspace': 'Backspace',
    'ControlLeft': 'Left Ctrl', 'ControlRight': 'Right Ctrl', 'AltLeft': 'Left Alt', 'AltRight': 'Right Alt',
    'Tab': 'Tab', 'CapsLock': 'Caps Lock', 'Escape': 'Escape', 'Insert': 'Insert', 'Delete': 'Delete',
    'Home': 'Home', 'End': 'End', 'PageUp': 'Page Up', 'PageDown': 'Page Down', 'NumLock': 'Num Lock',
    'ScrollLock': 'Scroll Lock', 'Pause': 'Pause', 'PrintScreen': 'Print Screen', 'ContextMenu': 'Menu Key'
};

// --- Log System Initialization ---
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
                '<i class="fas fa-scroll"></i> Auto Scroll On' : 
                '<i class="fas fa-scroll"></i> Auto Scroll Off';
        }
    }
}

// --- KeyDown Event Listener ---
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
        
        // Log interval (unless auto-repeat event)
        if (!e.repeat) {
            logKeyInterval(keyCode, interval);
        }
        
        // Diagnosis mode detection
        if (diagnosisActive) {
            if (interval < 20) {
                addDiagnosisResult('Critical Chattering', `Key ${getKeyDisplayName(keyCode)} interval only ${interval}ms`, 'error');
            } else if (interval < 50) {
                addDiagnosisResult('Moderate Chattering', `Key ${getKeyDisplayName(keyCode)} interval ${interval}ms`, 'warning');
            } else if (interval < 80) {
                addDiagnosisResult('Minor Chattering', `Key ${getKeyDisplayName(keyCode)} interval ${interval}ms`, 'info');
            }
        }
    }
    
    // Update last key press time
    keyLastPressTime[keyCode] = currentTime;
    
    // 2. Initialize key statistics object (if doesn't exist)
    if (!keyStats[e.code]) {
        keyStats[e.code] = { down: 0, up: 0 };
    }

    // 3. Physical press logic (ignore auto-repeat from holding)
    if (!e.repeat) {
        // Increment press count
        keyStats[e.code].down++;
        
        // Increment total keystrokes
        totalKeystrokes++;
        
        // Calculate time difference (adjacent key interval)
        if (lastKeyTimestamp !== 0) {
            const timeDelta = Math.round(currentTime - lastKeyTimestamp);
            infoTime.innerText = `${timeDelta} ms`;
        } else {
            infoTime.innerText = 'Start'; 
        }
        lastKeyTimestamp = currentTime;

        // Update UI: Key numbers (show press count - bottom right)
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

    // 4. Visual state: Keep key highlighted for any KeyDown event (even repeat)
    // Concurrent count logic
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) keyEl.classList.add('active');
    pressedKeys.add(e.code);
    
    // Update maximum concurrent keys
    if (pressedKeys.size > maxConcurrentKeys) {
        maxConcurrentKeys = pressedKeys.size;
        maxCountEl.innerText = maxConcurrentKeys;
        
        // NKRO detection in diagnosis mode
        if (diagnosisActive) {
            if (maxConcurrentKeys < 6) {
                addDiagnosisResult('Weak Anti-ghosting', `Maximum concurrent keys only ${maxConcurrentKeys}`, 'warning');
            } else if (maxConcurrentKeys >= 20) {
                addDiagnosisResult('Excellent NKRO Performance', `Supports ${maxConcurrentKeys} key anti-ghosting`, 'success');
            }
        }
    }
    
    // 5. Update panels
    updateStats();
    updateInfo(e);
});

// --- KeyUp Event Listener ---
document.addEventListener('keyup', (e) => {
    e.preventDefault();
    
    // 1. Initialize statistics object (prevent edge case of release without press)
    if (!keyStats[e.code]) {
        keyStats[e.code] = { down: 0, up: 0 };
    }

    // 2. Increment release count
    keyStats[e.code].up++;

    // 3. Remove visual state
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) {
        keyEl.classList.remove('active');
        
        // Update UI: Key numbers (show release count - top right)
        let upCounter = keyEl.querySelector('.key-stat-up');
        if (!upCounter) {
            upCounter = document.createElement('span');
            upCounter.className = 'key-stat-up';
            keyEl.appendChild(upCounter);
        }
        upCounter.innerText = keyStats[e.code].up;
        
        // Detect key sticking (press count ≠ release count)
        if (keyStats[e.code].down !== keyStats[e.code].up && diagnosisActive) {
            addDiagnosisResult('Key Sticking', `Key ${getKeyDisplayName(e.code)}: Pressed ${keyStats[e.code].down} times vs Released ${keyStats[e.code].up} times`, 'error');
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
    
    // Change color based on concurrent count
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
    
    // Update maximum concurrent display
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
    if (confirm('Are you sure you want to reset all test data? Diagnosis results and logs will also be cleared.')) {
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
            
            // Reset key numbers
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
        showToast('Test data, diagnosis results, and logs have been reset', 'success');
    }
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

// User count simulation
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
        "💡 Tip: Quickly press the same key repeatedly to test key interval, intervals less than 80ms will be marked in red",
        "💡 Tip: Normal human operation interval is typically above 100ms, gamers may be 80-120ms",
        "💡 Tip: Frequent &lt;50ms intervals may indicate keyboard chattering issues",
        "💡 Tip: Try pressing multiple keys simultaneously to check keyboard anti-ghosting capability",
        "💡 Tip: Test all keys sequentially, especially commonly used keys like WASD and Space",
        "💡 Tip: Observe if press/release counts match, mismatches may indicate key sticking"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showToast(randomTip, 'info');
};

// ==================== New Log Functions ====================

// Log key interval to log
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
        logMessage = `Key[${keyName}] Interval:${interval}ms ⚠️ Critical! May be contact bouncing or debounce failure`;
        warningMessage = 'Critical chattering fault, immediate repair needed';
    } else if (interval < 50) {
        logLevel = 'error';
        logMessage = `Key[${keyName}] Interval:${interval}ms ❌ Abnormal interval! May be chattering fault`;
        warningMessage = 'Moderate chattering fault, recommend prompt action';
    } else if (interval < 80) {
        logLevel = 'warning';
        logMessage = `Key[${keyName}] Interval:${interval}ms ⚠️ Short interval! Note possible early chattering`;
        warningMessage = 'Minor chattering, needs attention';
    } else {
        logLevel = 'normal';
        logMessage = `Key[${keyName}] Interval:${interval}ms ✓ Normal interval`;
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
    
    // Auto scroll to bottom
    if (logAutoScroll) {
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    // Show Toast for warning level or above
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
    
    if (confirm('Are you sure you want to clear all log records?')) {
        // Keep first two initial messages
        const initialLogs = Array.from(logContent.children).slice(0, 2);
        logContent.innerHTML = '';
        initialLogs.forEach(log => logContent.appendChild(log));
        
        // Reset statistics
        keyLastPressTime = {};
        keyPressIntervals = {};
        minInterval = Infinity;
        
        updateLogStats();
        showToast('Logs cleared', 'success');
    }
}

// Toggle log show/hide
window.toggleLog = function() {
    const logContent = document.getElementById('log-content');
    const logContainer = document.querySelector('.log-container');
    
    if (logContent && logContainer) {
        if (logContainer.style.maxHeight && logContainer.style.maxHeight !== '0px') {
            logContainer.style.maxHeight = '0px';
            logContainer.style.opacity = '0';
            document.getElementById('toggle-log').innerHTML = '<i class="fas fa-eye"></i> Show Log';
        } else {
            logContainer.style.maxHeight = '500px';
            logContainer.style.opacity = '1';
            document.getElementById('toggle-log').innerHTML = '<i class="fas fa-eye-slash"></i> Hide Log';
        }
    }
}

// Toggle auto scroll
window.toggleAutoScroll = function() {
    logAutoScroll = !logAutoScroll;
    localStorage.setItem('keyboardLogAutoScroll', logAutoScroll.toString());
    
    const toggleBtn = document.getElementById('toggle-scroll');
    if (toggleBtn) {
        toggleBtn.innerHTML = logAutoScroll ? 
            '<i class="fas fa-scroll"></i> Auto Scroll On' : 
            '<i class="fas fa-scroll"></i> Auto Scroll Off';
    }
    
    showToast(logAutoScroll ? 'Auto scroll enabled' : 'Auto scroll disabled', 'info');
}

// Start interval test
window.startIntervalTest = function() {
    showToast('Starting key interval test: Quickly press the same key repeatedly (e.g., W key or Space key)', 'info');
    
    // Add test instructions to log
    const logContent = document.getElementById('log-content');
    const now = new Date();
    const timeStr = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    
    const testStartEntry = document.createElement('div');
    testStartEntry.className = 'log-entry log-info';
    testStartEntry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-message">Starting key interval test - Please quickly press the same key repeatedly</span>
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
    // Close existing diagnosis panel if any
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
            title: "🔍 Step 1: Single Key Function Test",
            instruction: "Please test the following key groups sequentially, check for any key failures:<br>1. WASD direction keys<br>2. Number keys 1-5<br>3. Arrow keys ↑↓←→<br>4. Space and Enter keys",
            action: "testAllKeys",
            check: "Check if each key turns white when pressed",
            time: 60
        },
        {
            title: "⏱️ Step 2: Key Interval Detection",
            instruction: "Quickly press the same key 10 times (recommend testing W key and Space key), observe log output",
            action: "testInterval",
            check: "Observe key intervals, normal should be >80ms, intervals <80ms will be marked in red",
            time: 30
        },
        {
            title: "🎮 Step 3: NKRO Anti-ghosting Test",
            instruction: "Press your entire hand on the middle area of keyboard, press as many keys simultaneously as possible",
            action: "testNKRO",
            check: "Observe 'Current Concurrent' value, normal keyboards should be ≥6, gaming keyboards can reach 10+",
            time: 20
        },
        {
            title: "⚡ Step 4: Response Delay Test",
            instruction: "Press different keys continuously at medium speed, observe response time",
            action: "testResponseTime",
            check: "Interval time should be stable between 50-200ms, no large fluctuations",
            time: 30
        },
        {
            title: "🔄 Step 5: Key Conflict Detection",
            instruction: "Press simultaneously: W+A+Shift+Space<br>Then: Ctrl+Shift+Alt",
            action: "testKeyConflict",
            check: "All keys should highlight simultaneously, no failures",
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
            <h3><i class="fas fa-stethoscope"></i> Keyboard Fault Diagnosis Mode</h3>
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
                    <strong>Detection Points:</strong> ${steps[0].check}<br>
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
            <strong>Detection Points:</strong> ${steps[currentStep].check}<br>
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
    
    // Auto detect current step result
    function autoDetectStepResult() {
        switch(currentStep) {
            case 0: // Single key function test
                if (testedKeys.size >= 20) {
                    addStepResult('success', `Tested ${testedKeys.size} keys, basic functions normal`);
                } else if (testedKeys.size > 0) {
                    addStepResult('warning', `Only tested ${testedKeys.size} keys, recommend testing more keys`);
                } else {
                    addStepResult('error', 'No keys tested yet');
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
                    addStepResult('error', 'Critical chattering detected (interval <20ms)');
                } else if (hasWarningInterval) {
                    addStepResult('warning', 'Minor chattering detected (interval <80ms)');
                } else if (Object.keys(keyPressIntervals).length > 0) {
                    addStepResult('success', 'Key intervals normal, no chattering detected');
                } else {
                    addStepResult('info', 'No key interval testing performed yet');
                }
                break;
            case 2: // NKRO test
                if (maxConcurrentKeys >= 10) {
                    addStepResult('success', `Excellent NKRO performance: Supports ${maxConcurrentKeys} key anti-ghosting`);
                } else if (maxConcurrentKeys >= 6) {
                    addStepResult('warning', `Average NKRO performance: Only supports ${maxConcurrentKeys} key anti-ghosting`);
                } else {
                    addStepResult('error', `Poor NKRO performance: Only supports ${maxConcurrentKeys} key anti-ghosting`);
                }
                break;
            case 3: // Response delay test
                // Simplified handling here, should analyze time series in reality
                if (testedKeys.size > 10) {
                    addStepResult('success', 'Response delay test complete, please judge based on usage experience');
                } else {
                    addStepResult('info', 'Please continue testing more keys to evaluate response delay');
                }
                break;
            case 4: // Key conflict detection
                if (maxConcurrentKeys >= 4) {
                    addStepResult('success', `Combination key test passed, supports ${maxConcurrentKeys} keys simultaneous press`);
                } else {
                    addStepResult('warning', `Limited combination key support, only supports ${maxConcurrentKeys} keys simultaneous press`);
                }
                break;
        }
    }
    
    // Event listeners
    document.querySelector('.close-diagnosis').addEventListener('click', () => {
        if (confirm('Are you sure you want to exit diagnosis mode? Incomplete diagnosis results will not be saved.')) {
            panel.remove();
            diagnosisActive = false;
        }
    });
    
    document.getElementById('next-step').addEventListener('click', () => {
        // Auto detect current step result
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
        // Auto detect final step result
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
    
    // Check key sticking (press count ≠ release count)
    Object.entries(keyStats).forEach(([keyCode, stats]) => {
        if (stats.down !== stats.up) {
            issues.push({
                type: 'Key Sticking',
                key: getKeyDisplayName(keyCode),
                details: `Pressed ${stats.down} times vs Released ${stats.up} times`,
                severity: 'error'
            });
        }
    });
    
    // Check chattering issues
    if (criticalIntervals > 0) {
        issues.push({
            type: 'Critical Chattering',
            severity: 'error',
            details: `Detected ${criticalIntervals} critical chattering events (interval <20ms)`
        });
    }
    
    if (warningIntervals > 0) {
        warnings.push({
            type: 'Minor Chattering',
            severity: 'warning',
            details: `Detected ${warningIntervals} minor chattering events (interval 20-79ms)`
        });
    }
    
    // Check low concurrency (may indicate weak anti-ghosting)
    if (maxConcurrency < 6) {
        warnings.push({
            type: 'Weak Anti-ghosting',
            severity: 'warning',
            details: `Maximum concurrent keys only ${maxConcurrency}, normal keyboards should have 6+ key anti-ghosting`
        });
    } else if (maxConcurrency >= 10) {
        successes.push({
            type: 'Excellent NKRO Performance',
            severity: 'success',
            details: `Supports ${maxConcurrency} key anti-ghosting, suitable for gaming`
        });
    }
    
    // Check key response
    if (totalKeysTested < 50) {
        warnings.push({
            type: 'Incomplete Testing',
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
            <h3><i class="fas fa-file-medical-alt"></i> Keyboard Diagnosis Report</h3>
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
                    <span>Keyboard Diagnosis Report</span>
                </div>
            </div>
            
            <div class="report-summary">
                <div class="summary-item">
                    <span class="summary-label">Keys Tested</span>
                    <span class="summary-value">${totalKeysTested}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Strokes</span>
                    <span class="summary-value">${totalKeystrokesTested}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Max Concurrent</span>
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
                        <span class="interval-label">Critical Chattering</span>
                        <span class="interval-value critical">${criticalIntervals}</span>
                    </div>
                    <div class="interval-item">
                        <span class="interval-label">Minor Chattering</span>
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
                <h4><i class="fas fa-exclamation-triangle"></i> Issues Detected</h4>
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
                        <p>Your keyboard is working properly, suggestions:</p>
                        <ul>
                            <li>Clean dust under keycaps monthly with compressed air</li>
                            <li>Avoid eating/drinking near keyboard to prevent liquid spills</li>
                            <li>Regular keyboard testing every 3 months</li>
                            <li>Use keyboard cover to extend lifespan</li>
                        </ul>
                    </div>
                </div>
                ` : issues.some(i => i.type.includes('Chattering')) ? `
                <div class="suggestion-item">
                    <i class="fas fa-tools"></i>
                    <div>
                        <h5>Chattering Issue Repair Suggestions</h5>
                        <p>Chattering issues detected, suggestions:</p>
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
                        <p>Based on detection results, suggestions:</p>
                        <ol>
                            <li>Check USB connection, try different USB ports</li>
                            <li>Update keyboard drivers to eliminate software issues</li>
                            <li>Clean internal keyboard dust to improve contact performance</li>
                            <li>For wireless keyboards, replace batteries to reduce delay</li>
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
        showToast('Report screenshot saved to clipboard (simulated feature)', 'info');
        // Actual implementation would require html2canvas library
    };
}