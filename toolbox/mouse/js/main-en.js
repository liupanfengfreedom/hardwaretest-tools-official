// English version of main.js - hardcoded English text
const TEXTS = {
    left_click: "Left Click",
    right_click: "Right Click",
    counter_middle: "Middle",
    counter_wheel: "Scroll",
    counter_b4: "Side (B4)",
    counter_b5: "Side (B5)",
    log_warning: " [DOUBLE CLICK ALERT!]",
    warning_text: " (Warning!)",
    start: "Start",
    log_reset: "--- All Data Reset ---",
    btn_guide_show: "📖 Show Guide & FAQ",
    btn_guide_hide: "📖 Hide Guide"
};

// --- Original script variables and functions ---
const logContainer = document.getElementById('eventLog');
const scrollUp = document.getElementById('scrollUp');
const scrollDown = document.getElementById('scrollDown');
const timeDeltaDisplay = document.getElementById('timeDeltaDisplay');

let lastClickTime = {}; 
let clickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0, 'wheel':0 };

// Track button press state
let isPressed = { 0:false, 1:false, 2:false, 3:false, 4:false };

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

    const now = performance.now();
    const lastTime = lastClickTime[e.button] || 0;
    let timeDiff = 0;

    if (lastTime !== 0) {
        timeDiff = Math.round(now - lastTime);
        timeDeltaDisplay.innerText = timeDiff + " ms";
        if (timeDiff < 80) {
            timeDeltaDisplay.className = "stat-value time-delta-alert";
            timeDeltaDisplay.innerText += TEXTS.warning_text; 
        } else {
            timeDeltaDisplay.className = "stat-value time-delta-value";
        }
    } else {
        timeDeltaDisplay.innerText = TEXTS.start; 
        timeDeltaDisplay.className = "stat-value time-delta-value";
    }

    if (clickCounts.hasOwnProperty(e.button)) {
        clickCounts[e.button]++;
        updateCountUI(e.button);
        highlightRow(e.button); 
    }

    const btnNameMap = {
        0: TEXTS.left_click, 
        1: TEXTS.counter_middle, 
        2: TEXTS.right_click, 
        3: TEXTS.counter_b4, 
        4: TEXTS.counter_b5
    };
    const btnName = btnNameMap[e.button] || `Btn ${e.button}`;
    let logWarning = (timeDiff > 0 && timeDiff < 80) ? TEXTS.log_warning : ""; 
    addLog(`${btnName} ↓ (${timeDiff}ms)` + logWarning, logWarning ? 'log-alert' : '');
    
    lastClickTime[e.button] = now;
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
    clickCounts['wheel']++;
    updateCountUI('wheel');
    highlightRow('wheel');
    if (e.deltaY < 0) flashIndicator(scrollUp);
    else flashIndicator(scrollDown);
}, { passive: true });

function flashIndicator(element) {
    element.style.opacity = '1';
    setTimeout(() => { element.style.opacity = '0'; }, 150);
}

function updateCountUI(key) {
    const el = document.getElementById(`cnt-${key}`);
    if (el) el.innerText = clickCounts[key];
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
    // 复位点击计数器
    for (let key in clickCounts) clickCounts[key] = 0;
    document.querySelectorAll('.counter-num').forEach(el => el.innerText = '0');
    lastClickTime = {}; 
    isPressed = { 0:false, 1:false, 2:false, 3:false, 4:false };
    
    // 复位时间显示
    timeDeltaDisplay.innerText = "- ms";
    timeDeltaDisplay.className = "stat-value time-delta-value";
    
    // 复位按钮视觉状态
    document.querySelectorAll('.btn-zone').forEach(el => el.classList.remove('active'));
    
    // 记录日志
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