// Global variable declarations
const scrollBox = document.getElementById('scrollBox');
const testArea = document.getElementById('testArea');
const indicator = document.getElementById('indicator');
const visualWheel = document.getElementById('visualWheel');
const upEl = document.getElementById('upCount');
const downEl = document.getElementById('downCount');
const reverseEl = document.getElementById('reverseCount');
const maxHzEl = document.getElementById('maxHz');
const log = document.getElementById('log');
const testModeSelect = document.getElementById('testModeSelect');
const lineAnalysis = document.getElementById('lineAnalysis');
const resetBtn = document.getElementById('resetBtn');

let counts = { up: 0, down: 0, err: 0 };
let maxHz = 0;
let lastTime = 0;
let indicatorTimeout, errorTimeout;
let wheelRotation = 0;

// Initialize left-side list
function initScrollBox() {
  for (let i = 1; i <= 500; i++) {
    const div = document.createElement('div');
    div.className = 'scroll-line';
    div.textContent = `Line ${i} - Wheel step benchmark test data`;
    scrollBox.appendChild(div);
  }
}

// Show scroll indicator
function showIndicator(type) {
  clearTimeout(indicatorTimeout);
  indicator.className = 'scroll-indicator ' + type;
  indicator.textContent = type === 'up' ? '↑' : (type === 'down' ? '↓' : '!');
  
  indicatorTimeout = setTimeout(() => {
    indicator.className = 'scroll-indicator';
  }, 400);
}

// Rotate wheel visual element
function rotateWheel(dir) {
  wheelRotation += dir * 10;
  visualWheel.style.filter = `hue-rotate(${wheelRotation}deg)`;
  // Simple simulated wheel movement effect
  visualWheel.setAttribute('y', dir > 0 ? 30 : 26);
  setTimeout(() => visualWheel.setAttribute('y', 28), 50);
}

// Handle test area wheel events
function handleTestAreaWheel(e) {
  e.preventDefault();
  testArea.classList.add('active');
  
  const dir = Math.sign(e.deltaY); // 1 for down, -1 for up
  const mode = testModeSelect.value;
  const now = performance.now();
  
  rotateWheel(dir);

  if (dir < 0) {
    counts.up++;
    highlightItem('upCountItem', 'up-highlight');
    if (mode === 'down') {
      handleError();
    } else {
      showIndicator('up');
      addLog('↑ Upward scroll', 'up');
    }
  } else {
    counts.down++;
    highlightItem('downCountItem', 'down-highlight');
    if (mode === 'up') {
      handleError();
    } else {
      showIndicator('down');
      addLog('↓ Downward scroll', 'down');
    }
  }

  if (lastTime > 0) {
    const hz = 1000 / (now - lastTime);
    if (hz < 500 && hz > maxHz) {
      maxHz = hz;
      highlightItem('maxHzItem', '');
    }
  }

  updateDisplay();
  lastTime = now;
  
  setTimeout(() => testArea.classList.remove('active'), 200);
}

// Handle error
function handleError() {
  counts.err++;
  showIndicator('error');
  
  // Main test area error effect - turn red and shake
  testArea.classList.add('error');
  
  // Statistics panel error highlight
  highlightItem('reverseCountItem', 'error-highlight');
  
  // Add error log
  addLog('[❌ Error] Backfire detected! Scroll direction mismatched with test mode', 'err');
  
  // Clear error state
  clearTimeout(errorTimeout);
  errorTimeout = setTimeout(() => {
    testArea.classList.remove('error');
    
    // Restore mouse SVG to normal state
    const mouseIcon = document.getElementById('mouseIcon');
    mouseIcon.style.transform = 'scale(1)';
    mouseIcon.style.transition = 'transform 0.3s ease';
  }, 1000);
}

// Highlight item
function highlightItem(id, cls) {
  const el = document.getElementById(id);
  el.classList.add(cls || 'up-highlight');
  setTimeout(() => el.classList.remove(cls || 'up-highlight'), 300);
}

// Handle scroll box wheel events
function handleScrollBoxWheel(e) {
  const lines = Math.abs(e.deltaY / 33.3).toFixed(2);
  lineAnalysis.innerHTML = `Lines per step: <strong style="color:var(--accent)">${lines}</strong> lines`;
  const index = Math.floor(scrollBox.scrollTop / 33.3);
  Array.from(scrollBox.children).forEach(el => el.classList.remove('highlight'));
  if (scrollBox.children[index]) scrollBox.children[index].classList.add('highlight');
}

// Update display data
function updateDisplay() {
  upEl.textContent = counts.up;
  downEl.textContent = counts.down;
  reverseEl.textContent = counts.err;
  maxHzEl.textContent = maxHz.toFixed(1);
}

// Add log
function addLog(msg, type) {
  const div = document.createElement('div');
  div.className = type;
  div.textContent = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
  log.prepend(div);
  if (log.children.length > 50) log.lastChild.remove();
}

// Reset test
function resetTest() {
  // Add reset animation effect
  resetBtn.classList.add('pulse');
  
  // Reset data
  counts = { up: 0, down: 0, err: 0 };
  maxHz = 0;
  lastTime = 0;
  updateDisplay();
  log.innerHTML = '';
  addLog('Data reset', '');
  
  // Ensure all error states are removed
  testArea.classList.remove('error');
  
  // Remove animation effect
  setTimeout(() => {
    resetBtn.classList.remove('pulse');
  }, 1500);
}

// Initialize event listeners
function initEventListeners() {
  testArea.addEventListener('wheel', handleTestAreaWheel, { passive: false });
  scrollBox.addEventListener('wheel', handleScrollBoxWheel);
  
  // Add mouse hover events
  testArea.addEventListener('mouseenter', () => {
    testArea.style.cursor = 'crosshair';
    // Add hover state class
    testArea.classList.add('hover-ready');
  });
  
  testArea.addEventListener('mouseleave', () => {
    testArea.classList.remove('hover-ready');
  });
  
  scrollBox.addEventListener('mouseenter', () => {
    scrollBox.style.cursor = 'pointer';
  });
  
  testModeSelect.addEventListener('change', () => {
    // Add visual feedback for dropdown change
    testModeSelect.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.3)';
    setTimeout(() => {
      testModeSelect.style.boxShadow = '';
    }, 300);
    
    resetTest();
  });
  
  // Add initial animation after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      resetBtn.classList.add('pulse');
      setTimeout(() => {
        resetBtn.classList.remove('pulse');
      }, 2000);
    }, 1000);
  });
}

// Initialize application
function initApp() {
  initScrollBox();
  initEventListeners();
  updateDisplay();
  addLog('Application initialized, start testing', '');
}

// Global export function
window.resetTest = resetTest;

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}