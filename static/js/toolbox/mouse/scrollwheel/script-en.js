// Global variable declarations
const scrollBox = document.getElementById('scrollBox');
const testArea = document.getElementById('testArea');
const indicator = document.getElementById('indicator');
const visualWheel = document.getElementById('visualWheel');
const upEl = document.getElementById('upCount');
const downEl = document.getElementById('downCount');
const reverseEl = document.getElementById('reverseCount');
const avgIntervalEl = document.getElementById('avgInterval'); // Changed: now average interval
const log = document.getElementById('log');
const testModeSelect = document.getElementById('testModeSelect');
const lineAnalysis = document.getElementById('lineAnalysis');
const resetBtn = document.getElementById('resetBtn');

let counts = { up: 0, down: 0, err: 0 };
let intervals = []; // Store scroll interval times
let intervalSum = 0; // Sum of interval times
let lastTime = 0;
let indicatorTimeout, errorTimeout;
let wheelRotation = 0;

// Initialize left side list
function initScrollBox() {
  for (let i = 1; i <= 500; i++) {
    const div = document.createElement('div');
    div.className = 'scroll-line';
    div.textContent = `Line ${i} - Wheel line benchmark test data`;
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
  // Simple wheel displacement effect
  visualWheel.setAttribute('y', dir > 0 ? 30 : 26);
  setTimeout(() => visualWheel.setAttribute('y', 28), 50);
}

// Calculate and update average interval time
function updateAverageInterval() {
  if (intervals.length > 0) {
    const avg = intervalSum / intervals.length;
    avgIntervalEl.textContent = avg.toFixed(1);
    
    // Add color feedback based on interval time
    if (avg < 50) {
      avgIntervalEl.style.color = 'var(--good)'; // Green - fast scrolling
    } else if (avg < 150) {
      avgIntervalEl.style.color = 'var(--accent)'; // Blue - normal scrolling
    } else if (avg < 300) {
      avgIntervalEl.style.color = '#fbbf24'; // Yellow - slower scrolling
    } else {
      avgIntervalEl.style.color = 'var(--muted)'; // Gray - slow scrolling
    }
  } else {
    avgIntervalEl.textContent = '0';
    avgIntervalEl.style.color = 'inherit';
  }
}

// Handle test area wheel event
function handleTestAreaWheel(e) {
  e.preventDefault();
  testArea.classList.add('active');
  
  const dir = Math.sign(e.deltaY); // 1 = down, -1 = up
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

  // Calculate time interval (replaces original frequency calculation)
  if (lastTime > 0) {
    const interval = now - lastTime;
    
    // Add to intervals array
    intervals.push(interval);
    intervalSum += interval;
    
    // Keep array size manageable, keep only last 20 entries
    if (intervals.length > 20) {
      const removed = intervals.shift();
      intervalSum -= removed;
    }
    
    // Update average interval display
    updateAverageInterval();
    highlightItem('avgIntervalItem', 'up-highlight');
  } else {
    // First scroll, initialize lastTime
    updateAverageInterval(); // Ensure display shows 0
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
  
  // Stats panel error highlight
  highlightItem('reverseCountItem', 'error-highlight');
  
  // Select box error effect
  testModeSelect.classList.add('error-mode');
  
  // Add error log
  addLog('[❌ ERROR] Backscroll detected! Scroll direction doesn\'t match test mode', 'err');
  
  // Clear error state
  clearTimeout(errorTimeout);
  errorTimeout = setTimeout(() => {
    testArea.classList.remove('error');
    // Clear select box error state
    testModeSelect.classList.remove('error-mode');
    
    // Remove error label
    const selectWrapper = testModeSelect.parentElement;
    const errorLabel = selectWrapper.querySelector('.error-mode-label');
    if (errorLabel && errorLabel.parentNode) {
      errorLabel.remove();
    }
    
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

// Handle scroll box wheel event
function handleScrollBoxWheel(e) {
  const lines = Math.abs(e.deltaY / 33.3).toFixed(2);
  lineAnalysis.innerHTML = `Lines per scroll: <strong style="color:var(--accent)">${lines}</strong> lines`;
  const index = Math.floor(scrollBox.scrollTop / 33.3);
  Array.from(scrollBox.children).forEach(el => el.classList.remove('highlight'));
  if (scrollBox.children[index]) scrollBox.children[index].classList.add('highlight');
}

// Update display data
function updateDisplay() {
  upEl.textContent = counts.up;
  downEl.textContent = counts.down;
  reverseEl.textContent = counts.err;
  // Average interval time already updated in updateAverageInterval
}

// Add log entry
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
  intervals = [];
  intervalSum = 0;
  lastTime = 0;
  
  updateDisplay();
  updateAverageInterval(); // Reset average interval display
  
  log.innerHTML = '';
  addLog('Data reset', '');
  
  // Ensure all error states are removed
  testArea.classList.remove('error');
  testModeSelect.classList.remove('error-mode');
  
  // Remove select box error label
  const selectWrapper = testModeSelect.parentElement;
  const errorLabel = selectWrapper.querySelector('.error-mode-label');
  if (errorLabel) {
    errorLabel.remove();
  }
  
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
    // Add visual feedback for mode change
    testModeSelect.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.3)';
    // Clear possible error state
    testModeSelect.classList.remove('error-mode');
    
    // Remove existing error label
    const selectWrapper = testModeSelect.parentElement;
    const errorLabel = selectWrapper.querySelector('.error-mode-label');
    if (errorLabel) {
      errorLabel.remove();
    }
    
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
  updateAverageInterval(); // Ensure initial display shows 0
  addLog('Application initialized, ready to test', '');
}

// Global export function
window.resetTest = resetTest;

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}