const colors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'];
let colorIndex = 0;
let isTesting = false;
let hintTimeout, cursorTimeout;

// Debounce variables: prevent color switching too fast
let lastSwitchTime = 0;
const SWITCH_DELAY = 150; // milliseconds

const body = document.body;
const largeHint = document.getElementById('large-hint');
const contentContainer = document.getElementById('content-container');

// Helper function to close language dropdown
function closeLanguageDropdown() {
    const languageDropdown = document.getElementById('languageDropdown');
    if (languageDropdown && languageDropdown.classList.contains('show')) {
        languageDropdown.classList.remove('show');
    }
}

function startTest() {
    enterFullScreen();
    isTesting = true;
    body.classList.add('testing-mode');
    colorIndex = 0;
    applyColor();
    showHint(3000);
    
    // Close language dropdown (if open)
    closeLanguageDropdown();
    
    // Hide language switcher
    const languageSwitcher = document.querySelector('.language-switcher');
    if (languageSwitcher) {
        languageSwitcher.style.pointerEvents = 'none';
    }
    
    // Hide all content panels
    if (contentContainer) {
        contentContainer.style.display = 'none';
    }
}

function stopTest() {
    isTesting = false;
    body.classList.remove('testing-mode');
    body.style.backgroundColor = '#1a1a1a';
    largeHint.classList.remove('hint-visible');
    
    // Restore language switcher interaction
    const languageSwitcher = document.querySelector('.language-switcher');
    if (languageSwitcher) {
        languageSwitcher.style.pointerEvents = 'auto';
    }
    
    // Close language dropdown
    closeLanguageDropdown();
    
    // Show all content panels
    if (contentContainer) {
        contentContainer.style.display = 'flex';
    }
    
    if (document.fullscreenElement) document.exitFullscreen();
}

// Core switching function with debounce check
function switchColor(direction) {
    // 1. Get current time
    const now = Date.now();
    // 2. If switching too soon after last switch, ignore (prevents rapid mouse double-click)
    if (now - lastSwitchTime < SWITCH_DELAY) return;
    
    lastSwitchTime = now;

    if (direction === 'next') {
        colorIndex = (colorIndex + 1) % colors.length;
    } else {
        colorIndex = (colorIndex - 1 + colors.length) % colors.length;
    }
    applyColor();
}

// Quick switch to specified color
function switchToColor(color) {
    // If not in testing mode, enter testing mode first
    if (!isTesting) {
        startTest();
    }
    
    colorIndex = colors.indexOf(color);
    if (colorIndex === -1) colorIndex = 0;
    applyColor();
    
    // Show hint
    showHint(2000);
}

function applyColor() {
    body.style.backgroundColor = colors[colorIndex];
}

function showHint(duration = 2000) {
    if (!isTesting) return;
    largeHint.classList.add('hint-visible');
    body.classList.add('mouse-moving');
    clearTimeout(hintTimeout);
    clearTimeout(cursorTimeout);
    if (duration > 0) {
        hintTimeout = setTimeout(() => largeHint.classList.remove('hint-visible'), duration);
        cursorTimeout = setTimeout(() => body.classList.remove('mouse-moving'), duration + 500);
    }
}

function enterFullScreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        stopTest();
    }
});

// --- Event Listener Corrections ---

// 1. Mouse Click
document.addEventListener('click', (e) => {
    // Ensure click is not on buttons or other interactive elements
    if (isTesting && !e.target.closest('button')) {
        switchColor('next');
    }
});

// 2. Mouse Movement (wake up hint)
document.addEventListener('mousemove', () => {
    if (isTesting) showHint(2500);
});

// 3. Keyboard Control (core fix point)
document.addEventListener('keydown', (e) => {
    if (!isTesting) return;
    
    // 🛑 Core Fix: Check event.repeat
    // If user holds down key, e.repeat becomes true. Return without executing switch.
    if (e.repeat) return;

    if (e.code === 'ArrowRight' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault(); // Prevent space from scrolling page
        switchColor('next');
    } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        switchColor('prev');
    } else if (e.code === 'Escape') {
        stopTest();
    }
});