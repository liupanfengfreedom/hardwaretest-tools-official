// English version of main.js - hardcoded English text
const TEXTS = {
    left_click: "Left Button",
    right_click: "Right Button",
    counter_middle: "Middle Button",
    counter_wheel: "Wheel",
    counter_b4: "Side Button (B4)",
    counter_b5: "Side Button (B5)",
    log_warning: " [Repeated Click Alert!]",
    log_reset: "--- All Data Reset ---",
    test_area_status_ready: "Ready",
    test_area_status_active: "Active",
    test_area_status_testing: "Testing",
    test_area_status_double_click: "Double-Click Detected",
    test_area_status_error: "Fault",
    // Remove guide button related text since button has been removed
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

// Double-click detection related variables - for all buttons
let doubleClickLastTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let doubleClickCount = { 0:0, 1:0, 2:0, 3:0, 4:0 };
const DOUBLE_CLICK_THRESHOLD = 500; // Double-click time threshold in ms (typically 200-500ms)
const FAULTY_DOUBLE_CLICK_THRESHOLD = 80; // Faulty double-click threshold (less than 80ms)

// New: Test area status management
let testArea = null;
let testAreaStatus = null;
let testAreaTimeout = null;
let isMouseInTestArea = false;

// 1. Prevent context menu
document.addEventListener('contextmenu', event => event.preventDefault());

// 2. Prevent native drag
document.addEventListener('dragstart', event => event.preventDefault());

// Initialize test area functionality
function initTestArea() {
    testArea = document.getElementById('testArea');
    testAreaStatus = document.getElementById('testAreaStatus');
    
    if (!testArea || !testAreaStatus) return;
    
    // Set initial status
    updateTestAreaStatus('ready');
    
    // Add event listeners for test area
    testArea.addEventListener('mouseenter', () => {
        isMouseInTestArea = true;
        updateTestAreaStatus('active');
        testArea.classList.add('active');
    });
    
    testArea.addEventListener('mouseleave', () => {
        isMouseInTestArea = false;
        // If currently testing, don't immediately return to ready status
        if (!hasActiveButtonPress()) {
            updateTestAreaStatus('ready');
            testArea.classList.remove('active', 'testing', 'double-click-detected', 'error');
        }
    });
}

// Check if any button is currently pressed
function hasActiveButtonPress() {
    for (let i = 0; i < 5; i++) {
        if (isPressed[i]) return true;
    }
    return false;
}

// Update test area status and visual state
function updateTestAreaStatus(status) {
    if (!testArea || !testAreaStatus) return;
    
    // Clear existing timeout
    if (testAreaTimeout) {
        clearTimeout(testAreaTimeout);
        testAreaTimeout = null;
    }
    
    // Remove all status classes
    testArea.classList.remove('active', 'testing', 'double-click-detected', 'error');
    
    // Update status text and add appropriate class
    switch (status) {
        case 'ready':
            testAreaStatus.textContent = TEXTS.test_area_status_ready;
            break;
        case 'active':
            testAreaStatus.textContent = TEXTS.test_area_status_active;
            testArea.classList.add('active');
            break;
        case 'testing':
            testAreaStatus.textContent = TEXTS.test_area_status_testing;
            testArea.classList.add('testing');
            break;
        case 'double-click':
            testAreaStatus.textContent = TEXTS.test_area_status_double_click;
            testArea.classList.add('double-click-detected');
            
            // Reset after 1 second
            testAreaTimeout = setTimeout(() => {
                if (isMouseInTestArea) {
                    updateTestAreaStatus('active');
                } else {
                    updateTestAreaStatus('ready');
                }
            }, 1000);
            break;
        case 'error':
            testAreaStatus.textContent = TEXTS.test_area_status_error;
            testArea.classList.add('error');
            
            // Reset after 1.5 seconds
            testAreaTimeout = setTimeout(() => {
                if (isMouseInTestArea) {
                    updateTestAreaStatus('active');
                } else {
                    updateTestAreaStatus('ready');
                }
            }, 1500);
            break;
    }
}

// 3. Helper function: handle button release
function handleButtonRelease(buttonCode) {
    if (!isPressed[buttonCode]) return;

    isPressed[buttonCode] = false;
    
    const btnId = 'btn' + buttonCode;
    const el = document.getElementById(btnId);
    if (el) {
        el.classList.remove('active');
        el.classList.remove('click-active'); // Fix: remove click-active class
    }

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
    highlightRow(buttonCode, 'normal');
    
    // Calculate hold duration
    const pressDuration = lastClickTime[buttonCode] ? Math.round(performance.now() - lastClickTime[buttonCode]) : 0;
    
    // Modified: Release log uses lighter color
    addLog(`${btnName} ↑ (Hold: ${pressDuration}ms)`, 'log-release');
    
    // If no button is pressed, update test area status
    if (!hasActiveButtonPress() && testArea) {
        if (isMouseInTestArea) {
            updateTestAreaStatus('active');
            testArea.classList.remove('testing');
        } else {
            updateTestAreaStatus('ready');
            testArea.classList.remove('testing');
        }
    }
}

// Highlight data panel row
function highlightRow(key, clickType = 'normal') {
    const row = document.getElementById(`row-${key}`);
    if(row) {
        // Clear all possible status classes
        row.classList.remove('click-highlight', 'double-highlight', 'fault-highlight');
        
        // Add appropriate class based on click type
        switch(clickType) {
            case 'normal':
                row.classList.add('click-highlight');
                break;
            case 'double':
                row.classList.add('double-highlight');
                break;
            case 'fault':
                row.classList.add('fault-highlight');
                break;
        }
        
        // Remove highlight after 150ms
        setTimeout(() => {
            row.classList.remove('click-highlight', 'double-highlight', 'fault-highlight');
        }, 150);
    }
}

// --- Event Listeners ---

/* Mousedown */
document.addEventListener('mousedown', (e) => {
    if (isPressed[e.button]) return;
    
    e.preventDefault(); 
    isPressed[e.button] = true;

    const btnId = 'btn' + e.button;
    const el = document.getElementById(btnId);
    
    // Remove all possible active classes
    if (el) {
        el.classList.remove('active', 'click-active', 'double-click-active', 'fault-double-click-active');
        el.classList.add('click-active');
    }

    // Update press count
    pressCounts[e.button]++;
    updateCountUI(e.button, 'down');
    highlightRow(e.button, 'normal');

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
    
    let timeLog = "";
    if (lastTime === 0) {
        timeLog = "(First press - timing start)";
    } else {
        timeLog = `(Since last↓ ${timeDiff}ms)`;
    }
    
    // Regular click log uses default color
    addLog(`${btnName} ↓ ${timeLog}` + logWarning, logWarning ? 'log-alert' : '');
    
    // Key: Record this press time as basis for next calculation
    lastClickTime[e.button] = now;
    
    // Update test area status
    if (testArea) {
        updateTestAreaStatus('testing');
        testArea.classList.add('testing');
    }
    
    // Add double-click detection for all buttons
    const buttonIndex = e.button;
    const currentTime = Date.now();
    
    // If first click or time since last click exceeds double-click threshold, reset count
    if (currentTime - doubleClickLastTime[buttonIndex] > DOUBLE_CLICK_THRESHOLD) {
        doubleClickCount[buttonIndex] = 1;
    } else {
        doubleClickCount[buttonIndex]++;
    }
    
    // If second click and within threshold, consider it a double-click
    if (doubleClickCount[buttonIndex] === 2) {
        const clickInterval = currentTime - doubleClickLastTime[buttonIndex];
        
        // Determine if double-click is normal
        let logMessage = '';
        let className = '';
        let clickType = '';
        
        if (clickInterval < FAULTY_DOUBLE_CLICK_THRESHOLD) {
            // Faulty double-click (interval too short)
            logMessage = `${btnName} Double-click (interval: ${clickInterval}ms) [Faulty Double-click - Interval Too Short]`;
            className = 'log-double-click-fault';
            clickType = 'fault';
            
            // Add faulty double-click visual effect
            if (el) {
                el.classList.remove('click-active', 'double-click-active');
                el.classList.add('fault-double-click-active');
            }
            
            // Data panel faulty double-click highlight
            highlightRow(buttonIndex, 'fault');
            
            // Update test area status for faulty double-click
            if (testArea) {
                updateTestAreaStatus('error');
            }
        } else if (clickInterval <= DOUBLE_CLICK_THRESHOLD) {
            // Normal double-click
            logMessage = `${btnName} Double-click (interval: ${clickInterval}ms) [Normal Double-click]`;
            className = 'log-double-click';
            clickType = 'double';
            
            // Add normal double-click visual effect
            if (el) {
                el.classList.remove('click-active', 'fault-double-click-active');
                el.classList.add('double-click-active');
            }
            
            // Data panel normal double-click highlight
            highlightRow(buttonIndex, 'double');
            
            // Update test area status for normal double-click
            if (testArea) {
                updateTestAreaStatus('double-click');
            }
        }
        
        if (logMessage) {
            addLog(logMessage, className);
        }
        
        // Reset click count
        doubleClickCount[buttonIndex] = 0;
        
        // Modified: Shorten double-click effect duration from 600ms to 300ms
        setTimeout(() => {
            if (el) {
                el.classList.remove('double-click-active', 'fault-double-click-active');
                el.style.animation = '';
            }
        }, 300); // Changed from 600ms to 300ms
    }
    
    // Update last click time
    doubleClickLastTime[buttonIndex] = currentTime;
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
    
    // Check side button B4 (Button 3)
    if (isPressed[3] && (e.buttons & 8) === 0) {
        handleButtonRelease(3);
    }
    
    // Check side button B5 (Button 4)
    if (isPressed[4] && (e.buttons & 16) === 0) {
        handleButtonRelease(4);
    }
});

/* Ultimate safety on window blur */
window.addEventListener('blur', () => {
    for (let i = 0; i < 5; i++) {
        if (isPressed[i]) handleButtonRelease(i);
    }
    
    // Reset test area status
    if (testArea) {
        updateTestAreaStatus('ready');
        testArea.classList.remove('active', 'testing', 'double-click-detected', 'error');
    }
});

/* Wheel event - Fix: Check if mouse is in the entire test area */
document.addEventListener('wheel', (e) => {
    // Get test area container
    const testArea = document.getElementById('testArea');
    // Determine if mouse is in test area (including label, mouse area, info area)
    const isInTestArea = testArea.contains(e.target) || testArea === e.target;
    
    // If in test area, prevent default scroll behavior
    if (isInTestArea) {
        e.preventDefault();
    }
    
    if (e.deltaY < 0) {
        // Scroll up
        wheelCounts.up++;
        updateCountUI('wheel', 'up');
        highlightWheel('up'); // Add highlight effect
        flashIndicator(scrollUp);
        addLog("Wheel ↑");
        
        // Update test area status when scrolling
        if (testArea && isMouseInTestArea) {
            updateTestAreaStatus('testing');
            testArea.classList.add('testing');
        }
    } else {
        // Scroll down
        wheelCounts.down++;
        updateCountUI('wheel', 'down');
        highlightWheel('down'); // Add highlight effect
        flashIndicator(scrollDown);
        addLog("Wheel ↓");
        
        // Update test area status when scrolling
        if (testArea && isMouseInTestArea) {
            updateTestAreaStatus('testing');
            testArea.classList.add('testing');
        }
    }
}, { passive: false }); // Note: passive must be false to call preventDefault

function flashIndicator(element) {
    element.style.opacity = '1';
    setTimeout(() => { element.style.opacity = '0'; }, 150);
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
    
    // Reset double-click related variables (all buttons)
    doubleClickCount = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    doubleClickLastTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    
    // Reset button visual state
    document.querySelectorAll('.btn-zone').forEach(el => {
        el.classList.remove('active', 'double-click-effect', 'double-click-fault-effect', 
                           'click-active', 'double-click-active', 'fault-double-click-active');
        el.style.animation = '';
    });
    
    // Reset counter rows highlight
    document.querySelectorAll('.counter-item').forEach(el => {
        el.classList.remove('active-counter', 'wheel-up-highlight', 'wheel-down-highlight',
                           'click-highlight', 'double-highlight', 'fault-highlight');
    });
    
    // Reset test area status
    if (testArea) {
        updateTestAreaStatus('ready');
        testArea.classList.remove('active', 'testing', 'double-click-detected', 'error');
    }
    
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

// Initialize test area after page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize test area
    initTestArea();
});