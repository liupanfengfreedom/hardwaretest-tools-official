// English version of main.js - hardcoded English text
const TEXTS = {
    left_click: "Left Click",
    right_click: "Right Click",
    counter_middle: "Middle",
    counter_wheel: "Scroll Wheel",
    counter_b4: "Side (B4)",
    counter_b5: "Side (B5)",
    log_warning: " [DOUBLE CLICK ALERT!]",
    log_reset: "--- All Data Reset ---",
    btn_guide_show: "📖 Show Guide & FAQ",
    btn_guide_hide: "📖 Hide Guide"
};

// --- Original script variables and functions ---
const logContainer = document.getElementById('eventLog');
const scrollUp = document.getElementById('scrollUp');
const scrollDown = document.getElementById('scrollDown');

// Track button press and release counts separately
let pressCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let releaseCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let wheelCounts = { up:0, down:0 };

// Track button press state and last click time
let isPressed = { 0:false, 1:false, 2:false, 3:false, 4:false };
let lastClickTime = {}; // Track last click time for delta calculation

// Double click detection related variables
let doubleClickLastTime = 0;
let doubleClickCount = 0;
const DOUBLE_CLICK_THRESHOLD = 500; // Double click time threshold in ms (usually 200-500ms)
const FAULTY_DOUBLE_CLICK_THRESHOLD = 80; // Faulty double click threshold (less than 80ms)

// 1. Prevent context menu
document.addEventListener('contextmenu', event => event.preventDefault());

// 2. Prevent native drag
document.addEventListener('dragstart', event => event.preventDefault());

// 3. Helper function: handle button release
function handleButtonRelease(buttonCode) {
    if (!isPressed[buttonCode]) return;

    isPressed[buttonCode] = false;
    
    const btnId = 'btn' + buttonCode;
    const el = document.getElementById(btnId);
    if (el) el.classList.remove('active');

    const btnNameMap = {
        0: TEXTS.left_click, 
        1: TEXTS.counter_middle, 
        2: TEXTS.right_click, 
        3: TEXTS.counter_b4, 
        4: TEXTS.counter_b5
    };
    const btnName = btnNameMap[buttonCode] || `Btn ${buttonCode}`;
    
    // Update release count
    releaseCounts[buttonCode]++;
    updateCountUI(buttonCode, 'up');
    highlightRow(buttonCode);
    
    // Calculate hold duration
    const pressDuration = lastClickTime[buttonCode] ? Math.round(performance.now() - lastClickTime[buttonCode]) : 0;
    
    addLog(`${btnName} ↑ (Hold: ${pressDuration}ms)`, 'log-release');
}

// --- Event Listeners ---

/* Mousedown */
document.addEventListener('mousedown', (e) => {
    if (isPressed[e.button]) return;
    
    e.preventDefault(); 
    isPressed[e.button] = true;

    const btnId = 'btn' + e.button;
    const el = document.getElementById(btnId);
    if (el) el.classList.add('active');

    // Update press count
    pressCounts[e.button]++;
    updateCountUI(e.button, 'down');
    highlightRow(e.button);

    const btnNameMap = {
        0: TEXTS.left_click, 
        1: TEXTS.counter_middle, 
        2: TEXTS.right_click, 
        3: TEXTS.counter_b4, 
        4: TEXTS.counter_b5
    };
    const btnName = btnNameMap[e.button] || `Btn ${e.button}`;
    
    // Calculate time delta since last click of this button
    const now = performance.now();
    const lastTime = lastClickTime[e.button] || 0;
    let timeDiff = 0;
    
    if (lastTime !== 0) {
        timeDiff = Math.round(now - lastTime);
    }
    
    // Log with delta time and warning if too short (possible double click)
    let logWarning = (timeDiff > 0 && timeDiff < 80) ? TEXTS.log_warning : ""; 
    addLog(`${btnName} ↓ (${timeDiff}ms)` + logWarning, logWarning ? 'log-alert' : '');
    
    lastClickTime[e.button] = now;
    
    // Detect double click (only for left button)
    if (e.button === 0) {
        const currentTime = Date.now();
        
        // If it's the first click or time since last click exceeds double click threshold, reset count
        if (currentTime - doubleClickLastTime > DOUBLE_CLICK_THRESHOLD) {
            doubleClickCount = 1;
        } else {
            doubleClickCount++;
        }
        
        // If it's the second click and within threshold, consider it a double click
        if (doubleClickCount === 2) {
            const clickInterval = currentTime - doubleClickLastTime;
            
            // Determine if double click is normal
            if (clickInterval < FAULTY_DOUBLE_CLICK_THRESHOLD) {
                // Faulty double click (interval too short)
                addLog(`Left Button Double Click (Interval: ${clickInterval}ms) [Faulty Double Click - Interval Too Short]`, 'log-double-click-fault');
                // Add faulty double click visual effect
                showDoubleClickEffect(el, true);
            } else if (clickInterval <= DOUBLE_CLICK_THRESHOLD) {
                // Normal double click
                addLog(`Left Button Double Click (Interval: ${clickInterval}ms) [Normal Double Click]`, 'log-double-click');
                // Add normal double click visual effect
                showDoubleClickEffect(el, false);
            }
            
            // Reset click count
            doubleClickCount = 0;
        }
        
        // Update last click time
        doubleClickLastTime = currentTime;
    }
});

/* Mouseup */
window.addEventListener('mouseup', (e) => {
    e.preventDefault();
    handleButtonRelease(e.button);
});

/* Mouse move state correction */
document.addEventListener('mousemove', (e) => {
    // Check right button (Button 2): mask is 2
    if (isPressed[2] && (e.buttons & 2) === 0) {
        handleButtonRelease(2);
    }

    // Check left button (Button 0): mask is 1
    if (isPressed[0] && (e.buttons & 1) === 0) {
        handleButtonRelease(0);
    }

    // Check middle button (Button 1): mask is 4
    if (isPressed[1] && (e.buttons & 4) === 0) {
        handleButtonRelease(1);
    }
});

/* Ultimate safety on window blur */
window.addEventListener('blur', () => {
    for (let i = 0; i < 5; i++) {
        if (isPressed[i]) handleButtonRelease(i);
    }
});

/* Wheel event */
document.addEventListener('wheel', (e) => {
    if (e.deltaY < 0) {
        // Scroll up
        wheelCounts.up++;
        updateCountUI('wheel', 'up');
        highlightWheel('up'); // Add highlight effect
        flashIndicator(scrollUp);
        addLog("Scroll Wheel ↑");
    } else {
        // Scroll down
        wheelCounts.down++;
        updateCountUI('wheel', 'down');
        highlightWheel('down'); // Add highlight effect
        flashIndicator(scrollDown);
        addLog("Scroll Wheel ↓");
    }
}, { passive: true });

function flashIndicator(element) {
    element.style.opacity = '1';
    setTimeout(() => { element.style.opacity = '0'; }, 150);
}

// Add double click visual effect function
function showDoubleClickEffect(element, isFaulty) {
    if (!element) return;
    
    // Remove any existing old effects
    element.classList.remove('double-click-effect', 'double-click-fault-effect');
    
    // Add new effect class
    if (isFaulty) {
        element.classList.add('double-click-fault-effect');
        // Add animation
        element.style.animation = 'double-click-fault-flash 0.3s ease-in-out 2';
    } else {
        element.classList.add('double-click-effect');
        // Add animation
        element.style.animation = 'double-click-flash 0.3s ease-in-out 2';
    }
    
    // Remove effect after 600ms (animation lasts about 600ms)
    setTimeout(() => {
        element.classList.remove('double-click-effect', 'double-click-fault-effect');
        element.style.animation = '';
    }, 600);
}

// Add wheel highlight function
function highlightWheel(direction) {
    const row = document.getElementById('row-wheel');
    if (row) {
        // Remove other highlight effects first
        row.classList.remove('wheel-up-highlight', 'wheel-down-highlight');
        
        // Add corresponding highlight class based on direction
        if (direction === 'up') {
            row.classList.add('wheel-up-highlight');
        } else {
            row.classList.add('wheel-down-highlight');
        }
        
        // Remove highlight effect after 150ms
        setTimeout(() => {
            row.classList.remove('wheel-up-highlight', 'wheel-down-highlight');
        }, 150);
    }
}

function updateCountUI(key, type) {
    let el;
    
    if (key === 'wheel') {
        if (type === 'up') {
            el = document.getElementById(`cnt-wheel-up`);
        } else {
            el = document.getElementById(`cnt-wheel-down`);
        }
        if (el) el.innerText = wheelCounts[type];
    } else {
        if (type === 'down') {
            el = document.getElementById(`cnt-${key}-down`);
            if (el) el.innerText = pressCounts[key];
        } else {
            el = document.getElementById(`cnt-${key}-up`);
            if (el) el.innerText = releaseCounts[key];
        }
    }
}

function highlightRow(key) {
    const row = document.getElementById(`row-${key}`);
    if(row) {
        row.classList.remove('active-counter');
        void row.offsetWidth; 
        row.classList.add('active-counter');
        setTimeout(() => { row.classList.remove('active-counter'); }, 150);
    }
}

function resetCounts() {
    // Reset press counts
    for (let key in pressCounts) pressCounts[key] = 0;
    for (let key in releaseCounts) releaseCounts[key] = 0;
    wheelCounts.up = 0;
    wheelCounts.down = 0;
    
    // Update all UI counters
    document.querySelectorAll('.counter-num').forEach(el => el.innerText = '0');
    
    // Reset button state and last click times
    lastClickTime = {};
    isPressed = { 0:false, 1:false, 2:false, 3:false, 4:false };
    
    // Reset double click related variables
    doubleClickCount = 0;
    doubleClickLastTime = 0;
    
    // Reset button visual state
    document.querySelectorAll('.btn-zone').forEach(el => {
        el.classList.remove('active', 'double-click-effect', 'double-click-fault-effect');
        el.style.animation = '';
    });
    
    // Reset counter rows highlight
    document.querySelectorAll('.counter-item').forEach(el => el.classList.remove('active-counter', 'wheel-up-highlight', 'wheel-down-highlight'));
    
    // Add log
    addLog(TEXTS.log_reset); 
}

function addLog(text, className) {
    const div = document.createElement('div');
    div.className = 'log-item ' + (className || '');
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    div.innerText = `[${time}] ${text}`;
    logContainer.prepend(div);
    if (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// Guide toggle function
function toggleGuide() {
    const container = document.getElementById('guide-container');
    const btnText = document.getElementById('toggle-guide-btn');
    
    container.classList.toggle('open');
    
    if (container.classList.contains('open')) {
        container.style.height = container.scrollHeight + "px";
        btnText.innerHTML = TEXTS.btn_guide_hide;
    } else {
        container.style.height = "0";
        btnText.innerHTML = TEXTS.btn_guide_show;
    }
}