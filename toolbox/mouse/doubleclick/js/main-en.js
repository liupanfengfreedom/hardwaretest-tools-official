// English version of main.js - hardcoded English text
const TEXTS = {
    left_click: "Left Click",
    right_click: "Right Click",
    counter_middle: "Middle",
    counter_b4: "Side (B4)",
    counter_b5: "Side (B5)",
    log_warning: " [DOUBLE CLICK ALERT!]",
    log_reset: "--- All Data Reset ---",
};

// --- Original script variables and functions ---
let logContainer;

// Track click counts, double click counts, and faulty double click counts
let clickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let doubleClickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let faultyDoubleClickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };

// Track button press state and last click time
let isPressed = { 0:false, 1:false, 2:false, 3:false, 4:false };

// Double click detection related variables - for ALL buttons
let doubleClickLastTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let doubleClickCount = { 0:0, 1:0, 2:0, 3:0, 4:0 };
const DOUBLE_CLICK_THRESHOLD = 500; // Double click time threshold in ms (usually 200-500ms)
const FAULTY_DOUBLE_CLICK_THRESHOLD = 80; // Faulty double click threshold (less than 80ms)

// Initialize function
function initMouseTest() {
    logContainer = document.getElementById('eventLog');
    
    if (!logContainer) {
        console.error('Event log container not found');
        return;
    }
    
    // 1. Prevent context menu
    document.addEventListener('contextmenu', event => event.preventDefault());
    
    // 2. Prevent native drag
    document.addEventListener('dragstart', event => event.preventDefault());
    
    console.log('Mouse test initialized');
}

// Check if any button is currently pressed
function hasActiveButtonPress() {
    for (let i = 0; i < 5; i++) {
        if (isPressed[i]) return true;
    }
    return false;
}

// --- Event Listeners ---

/* Mousedown */
function handleMouseDown(e) {
    e.preventDefault(); 
    
    const button = e.button;
    if (isPressed[button]) return;
    
    isPressed[button] = true;

    const btnId = 'btn' + button;
    const el = document.getElementById(btnId);
    if (el) el.classList.add('active');

    // Update click count
    clickCounts[button]++;
    updateClickCountUI(button);
    highlightRow(button);

    const btnNameMap = {
        0: TEXTS.left_click, 
        1: TEXTS.counter_middle, 
        2: TEXTS.right_click, 
        3: TEXTS.counter_b4, 
        4: TEXTS.counter_b5
    };
    const btnName = btnNameMap[button] || `Btn ${button}`;
    
    // Log the click
    addLog(`${btnName} ↓`, 'log-click');
    
    // DOUBLE CLICK DETECTION FOR ALL BUTTONS
    const currentTime = Date.now();
    
    // If it's the first click or time since last click exceeds double click threshold, reset count
    if (currentTime - doubleClickLastTime[button] > DOUBLE_CLICK_THRESHOLD) {
        doubleClickCount[button] = 1;
    } else {
        doubleClickCount[button]++;
    }
    
    // If it's the second click and within threshold, consider it a double click
    if (doubleClickCount[button] === 2) {
        const clickInterval = currentTime - doubleClickLastTime[button];
        
        // Determine if double click is normal
        if (clickInterval < FAULTY_DOUBLE_CLICK_THRESHOLD) {
            // Faulty double click (interval too short)
            faultyDoubleClickCounts[button]++;
            updateFaultyDoubleClickCountUI(button);
            addLog(`${btnName} Faulty Double Click (Interval: ${clickInterval}ms)`, 'log-double-click-fault');
            // Add faulty double click visual effect
            showDoubleClickEffect(el, true);
        } else if (clickInterval <= DOUBLE_CLICK_THRESHOLD) {
            // Normal double click
            doubleClickCounts[button]++;
            updateDoubleClickCountUI(button);
            addLog(`${btnName} Double Click (Interval: ${clickInterval}ms)`, 'log-double-click');
            // Add normal double click visual effect
            showDoubleClickEffect(el, false);
        }
        
        // Reset click count for this button
        doubleClickCount[button] = 0;
    }
    
    // Update last click time for this button
    doubleClickLastTime[button] = currentTime;
}

/* Mouseup */
function handleMouseUp(e) {
    e.preventDefault();
    handleButtonRelease(e.button);
}

// Helper function: handle button release
function handleButtonRelease(buttonCode) {
    if (!isPressed[buttonCode]) return;

    isPressed[buttonCode] = false;
    
    const btnId = 'btn' + buttonCode;
    const el = document.getElementById(btnId);
    if (el) el.classList.remove('active');
    
    // Log release
    const btnNameMap = {
        0: TEXTS.left_click, 
        1: TEXTS.counter_middle, 
        2: TEXTS.right_click, 
        3: TEXTS.counter_b4, 
        4: TEXTS.counter_b5
    };
    const btnName = btnNameMap[buttonCode] || `Btn ${buttonCode}`;
    
    addLog(`${btnName} ↑`, 'log-release');
}

/* Mouse move state correction */
function handleMouseMove(e) {
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
    
    // Check side button B4 (Button 3)
    if (isPressed[3] && (e.buttons & 8) === 0) {
        handleButtonRelease(3);
    }
    
    // Check side button B5 (Button 4)
    if (isPressed[4] && (e.buttons & 16) === 0) {
        handleButtonRelease(4);
    }
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

function updateClickCountUI(button) {
    const el = document.getElementById(`cnt-${button}-click`);
    if (el) el.innerText = clickCounts[button];
}

function updateDoubleClickCountUI(button) {
    const el = document.getElementById(`cnt-${button}-double`);
    if (el) el.innerText = doubleClickCounts[button];
}

function updateFaultyDoubleClickCountUI(button) {
    const el = document.getElementById(`cnt-${button}-faulty`);
    if (el) el.innerText = faultyDoubleClickCounts[button];
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
    // Reset all counts
    clickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    doubleClickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    faultyDoubleClickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    
    // Update all UI counters
    for (let i = 0; i < 5; i++) {
        updateClickCountUI(i);
        updateDoubleClickCountUI(i);
        updateFaultyDoubleClickCountUI(i);
    }
    
    // Reset button state
    isPressed = { 0:false, 1:false, 2:false, 3:false, 4:false };
    
    // Reset double click related variables for ALL buttons
    doubleClickCount = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    doubleClickLastTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    
    // Reset button visual state
    document.querySelectorAll('.btn-zone').forEach(el => {
        el.classList.remove('active', 'double-click-effect', 'double-click-fault-effect');
        el.style.animation = '';
    });
    
    // Reset counter rows highlight
    document.querySelectorAll('.counter-item').forEach(el => el.classList.remove('active-counter'));
    
    // Add log
    addLog(TEXTS.log_reset); 
}

function addLog(text, className) {
    if (!logContainer) return;
    
    const div = document.createElement('div');
    div.className = 'log-item ' + (className || '');
    const time = new Date().toLocaleTimeString('en-US', {hour12: false});
    div.innerText = `[${time}] ${text}`;
    logContainer.prepend(div);
    if (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initMouseTest();
    
    // Add event listeners
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    // Ultimate safety on window blur
    window.addEventListener('blur', () => {
        for (let i = 0; i < 5; i++) {
            if (isPressed[i]) handleButtonRelease(i);
        }
    });
    
    console.log('Mouse test event listeners attached');
});

// Make resetCounts function available globally
window.resetCounts = resetCounts;