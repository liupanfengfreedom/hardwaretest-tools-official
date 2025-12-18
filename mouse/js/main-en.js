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
    btn_guide_hide: "📖 Hide Guide",
    cps_testing: "Testing...",
    cps_complete: "Complete!",
    cps_ready: "Ready",
    best_cps: "Best CPS"
};

// --- Original script variables and functions ---
const logContainer = document.getElementById('eventLog');
const scrollUp = document.getElementById('scrollUp');
const scrollDown = document.getElementById('scrollDown');
const hzDisplay = document.getElementById('hzDisplay');
const timeDeltaDisplay = document.getElementById('timeDeltaDisplay');

let lastClickTime = {}; 
let mouseMoveCount = 0;
let lastHzTime = Date.now();
let clickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0, 'wheel':0 };

// Track button press state
let isPressed = { 0:false, 1:false, 2:false, 3:false, 4:false };

// CPS Test Variables
let cpsTestActive = false;
let cpsTestDuration = 0;
let cpsTestStartTime = 0;
let cpsTestClicks = 0;
let bestCPS = 0;
let totalTestClicks = 0;
let cpsInterval = null;
let countdownInterval = null;
let currentTestDuration = 0;

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
    // 如果是左键点击且CPS测试激活中
    if (e.button === 0 && cpsTestActive) {
        cpsTestClicks++;
        // 视觉反馈
        const btn = document.getElementById('btn0');
        if (btn) {
            btn.classList.add('cps-active');
            setTimeout(() => {
                btn.classList.remove('cps-active');
            }, 100);
        }
    }
    
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
    mouseMoveCount++;

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

// Polling rate calculation
setInterval(() => {
    const now = Date.now();
    const duration = now - lastHzTime;
    const hz = Math.round(mouseMoveCount / (duration / 1000));
    hzDisplay.innerText = hz + " Hz";
    if(hz > 500) hzDisplay.style.color = "#00ff88";
    else if(hz > 100) hzDisplay.style.color = "#ffffff";
    else hzDisplay.style.color = "#757575";
    mouseMoveCount = 0;
    lastHzTime = now;
}, 500);

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
    
    // 复位CPS测试数据（停止当前测试）
    resetCPSTest();
    
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

// --- CPS Test Functions ---
function startCPSTest(duration) {
    if (cpsTestActive) {
        addLog("CPS test already in progress!", "log-alert");
        return;
    }
    
    // 重置之前的测试
    resetCPSTest();
    
    cpsTestActive = true;
    currentTestDuration = duration;
    cpsTestDuration = duration * 1000; // 转换为毫秒
    cpsTestStartTime = performance.now();
    cpsTestClicks = 0;
    
    // 更新显示
    const cpsDisplay = document.getElementById('cpsDisplay');
    cpsDisplay.textContent = "0.0 CPS";
    cpsDisplay.classList.add('cps-testing');
    
    // 添加倒计时显示
    const buttons = document.querySelectorAll('.cps-test-btn');
    buttons.forEach(btn => {
        if (btn.textContent.includes(duration + 's')) {
            btn.classList.add('cps-test-active');
            // 添加倒计时元素
            const countdown = document.createElement('div');
            countdown.className = 'cps-countdown';
            countdown.id = 'cpsCountdown';
            countdown.textContent = duration;
            btn.appendChild(countdown);
        }
    });
    
    addLog(`CPS test started (${duration}s)`);
    
    // 更新进度条
    updateCPSProgress();
    
    // 更新倒计时
    startCountdown(duration);
    
    // 设置测试结束定时器
    setTimeout(endCPSTest, cpsTestDuration);
    
    // 每秒更新一次显示
    cpsInterval = setInterval(updateCPSDisplay, 100);
}

function startCountdown(duration) {
    let remaining = duration;
    const countdownElement = document.getElementById('cpsCountdown');
    
    countdownInterval = setInterval(() => {
        remaining--;
        if (countdownElement) {
            countdownElement.textContent = remaining;
            
            // 最后3秒闪烁效果
            if (remaining <= 3) {
                countdownElement.style.animation = 'none';
                setTimeout(() => {
                    countdownElement.style.animation = 'pulse 0.5s infinite alternate';
                }, 10);
            }
        }
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
}

function endCPSTest() {
    if (!cpsTestActive) return;
    
    cpsTestActive = false;
    clearInterval(cpsInterval);
    clearInterval(countdownInterval);
    
    const elapsed = performance.now() - cpsTestStartTime;
    const actualSeconds = elapsed / 1000;
    const cps = cpsTestClicks / actualSeconds;
    
    // 更新最佳记录
    if (cps > bestCPS) {
        bestCPS = cps;
        document.getElementById('bestCPS').textContent = cps.toFixed(1);
    }
    
    // 更新总点击数
    totalTestClicks += cpsTestClicks;
    document.getElementById('totalClicks').textContent = totalTestClicks;
    
    // 显示最终结果
    const cpsDisplay = document.getElementById('cpsDisplay');
    cpsDisplay.textContent = `${cps.toFixed(1)} CPS`;
    cpsDisplay.classList.remove('cps-testing');
    
    // 根据CPS值设置颜色
    updateCPSColor(cpsDisplay, cps);
    
    // 完成进度条
    document.getElementById('cpsProgress').style.width = "100%";
    
    // 移除按钮上的活动状态和倒计时
    const buttons = document.querySelectorAll('.cps-test-btn');
    buttons.forEach(btn => {
        btn.classList.remove('cps-test-active');
        const countdown = btn.querySelector('.cps-countdown');
        if (countdown) {
            countdown.remove();
        }
    });
    
    addLog(`CPS test completed: ${cps.toFixed(1)} CPS (${cpsTestClicks} clicks in ${actualSeconds.toFixed(1)}s)`);
    
    // 3秒后重置显示状态
    setTimeout(() => {
        cpsDisplay.style.color = "";
        document.getElementById('cpsProgress').style.width = "0%";
        document.getElementById('currentCPS').textContent = "0.0";
    }, 3000);
}

function resetCPSTest() {
    cpsTestActive = false;
    cpsTestClicks = 0;
    clearInterval(cpsInterval);
    clearInterval(countdownInterval);
    
    const cpsDisplay = document.getElementById('cpsDisplay');
    cpsDisplay.textContent = "0.0 CPS";
    cpsDisplay.classList.remove('cps-testing');
    cpsDisplay.style.color = "";
    document.getElementById('cpsProgress').style.width = "0%";
    
    // 移除按钮上的活动状态和倒计时
    const buttons = document.querySelectorAll('.cps-test-btn');
    buttons.forEach(btn => {
        btn.classList.remove('cps-test-active');
        const countdown = btn.querySelector('.cps-countdown');
        if (countdown) {
            countdown.remove();
        }
    });
    
    // 更新当前CPS显示
    document.getElementById('currentCPS').textContent = "0.0";
    
    // 注意：不添加日志，因为resetCounts会添加总重置日志
}

function updateCPSDisplay() {
    if (!cpsTestActive) return;
    
    const elapsed = performance.now() - cpsTestStartTime;
    const seconds = elapsed / 1000;
    const cps = seconds > 0 ? cpsTestClicks / seconds : 0;
    
    const cpsDisplay = document.getElementById('cpsDisplay');
    cpsDisplay.textContent = `${cps.toFixed(1)} CPS`;
    
    // 更新当前CPS显示
    document.getElementById('currentCPS').textContent = cps.toFixed(1);
    
    // 根据CPS值改变颜色
    updateCPSColor(cpsDisplay, cps);
}

function updateCPSColor(element, cps) {
    if (cps >= 12) {
        element.style.color = "#00ff88"; // 绿色 - 优秀
    } else if (cps >= 8) {
        element.style.color = "#4fc3f7"; // 蓝色 - 良好
    } else if (cps >= 5) {
        element.style.color = "#ffcc00"; // 黄色 - 一般
    } else {
        element.style.color = "#ff4444"; // 红色 - 需要练习
    }
}

function updateCPSProgress() {
    if (!cpsTestActive) return;
    
    const elapsed = performance.now() - cpsTestStartTime;
    const progressPercent = Math.min(100, (elapsed / cpsTestDuration) * 100);
    document.getElementById('cpsProgress').style.width = `${progressPercent}%`;
    
    requestAnimationFrame(updateCPSProgress);
}