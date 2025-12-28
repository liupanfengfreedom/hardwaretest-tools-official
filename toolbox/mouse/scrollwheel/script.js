// 全局变量声明
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

// 初始化左侧列表
function initScrollBox() {
  for (let i = 1; i <= 500; i++) {
    const div = document.createElement('div');
    div.className = 'scroll-line';
    div.textContent = `Line ${i} - 滚轮行数基准测试数据`;
    scrollBox.appendChild(div);
  }
}

// 显示滚动指示器
function showIndicator(type) {
  clearTimeout(indicatorTimeout);
  indicator.className = 'scroll-indicator ' + type;
  indicator.textContent = type === 'up' ? '↑' : (type === 'down' ? '↓' : '!');
  
  indicatorTimeout = setTimeout(() => {
    indicator.className = 'scroll-indicator';
  }, 400);
}

// 旋转滚轮视觉元素
function rotateWheel(dir) {
  wheelRotation += dir * 10;
  visualWheel.style.filter = `hue-rotate(${wheelRotation}deg)`;
  // 简单的模拟滚轮位移效果
  visualWheel.setAttribute('y', dir > 0 ? 30 : 26);
  setTimeout(() => visualWheel.setAttribute('y', 28), 50);
}

// 处理测试区域滚轮事件
function handleTestAreaWheel(e) {
  e.preventDefault();
  testArea.classList.add('active');
  
  const dir = Math.sign(e.deltaY); // 1 为下, -1 为上
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
      addLog('↑ 向上滚动', 'up');
    }
  } else {
    counts.down++;
    highlightItem('downCountItem', 'down-highlight');
    if (mode === 'up') {
      handleError();
    } else {
      showIndicator('down');
      addLog('↓ 向下滚动', 'down');
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

// 处理错误
function handleError() {
  counts.err++;
  showIndicator('error');
  testArea.classList.add('error');
  highlightItem('reverseCountItem', 'error-highlight');
  addLog('[错误] 检测到回滚!', 'err');
  
  clearTimeout(errorTimeout);
  errorTimeout = setTimeout(() => testArea.classList.remove('error'), 400);
}

// 高亮项目
function highlightItem(id, cls) {
  const el = document.getElementById(id);
  el.classList.add(cls || 'up-highlight');
  setTimeout(() => el.classList.remove(cls || 'up-highlight'), 300);
}

// 处理滚动框滚轮事件
function handleScrollBoxWheel(e) {
  const lines = Math.abs(e.deltaY / 33.3).toFixed(2);
  lineAnalysis.innerHTML = `单步滚动高度: <strong style="color:var(--accent)">${lines}</strong> 行`;
  const index = Math.floor(scrollBox.scrollTop / 33.3);
  Array.from(scrollBox.children).forEach(el => el.classList.remove('highlight'));
  if (scrollBox.children[index]) scrollBox.children[index].classList.add('highlight');
}

// 更新显示数据
function updateDisplay() {
  upEl.textContent = counts.up;
  downEl.textContent = counts.down;
  reverseEl.textContent = counts.err;
  maxHzEl.textContent = maxHz.toFixed(1);
}

// 添加日志
function addLog(msg, type) {
  const div = document.createElement('div');
  div.className = type;
  div.textContent = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
  log.prepend(div);
  if (log.children.length > 50) log.lastChild.remove();
}

// 重置测试
function resetTest() {
  // 添加重置动画效果
  resetBtn.classList.add('pulse');
  
  // 重置数据
  counts = { up: 0, down: 0, err: 0 };
  maxHz = 0;
  lastTime = 0;
  updateDisplay();
  log.innerHTML = '';
  addLog('数据已重置', '');
  
  // 移除动画效果
  setTimeout(() => {
    resetBtn.classList.remove('pulse');
  }, 1500);
}

// 初始化事件监听器
function initEventListeners() {
  testArea.addEventListener('wheel', handleTestAreaWheel, { passive: false });
  scrollBox.addEventListener('wheel', handleScrollBoxWheel);
  
  testModeSelect.addEventListener('change', () => {
    // 添加选择框切换的视觉反馈
    testModeSelect.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.3)';
    setTimeout(() => {
      testModeSelect.style.boxShadow = '';
    }, 300);
    
    resetTest();
  });
  
  // 添加页面加载完成后的初始动画
  window.addEventListener('load', () => {
    setTimeout(() => {
      resetBtn.classList.add('pulse');
      setTimeout(() => {
        resetBtn.classList.remove('pulse');
      }, 2000);
    }, 1000);
  });
}

// 初始化应用
function initApp() {
  initScrollBox();
  initEventListeners();
  updateDisplay();
  addLog('应用已初始化，请开始测试', '');
}

// 全局导出函数
window.resetTest = resetTest;

// 当DOM加载完成后初始化应用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}