// Chinese version of main.js - hardcoded Chinese text
const TEXTS = {
    left_click: "左键",
    right_click: "右键",
    counter_middle: "中键",
    counter_wheel: "滚轮",
    counter_b4: "侧键(B4)",
    counter_b5: "侧键(B5)",
    log_warning: " [连击警报!]",
    log_reset: "--- 所有数据已重置 ---",
    test_area_status_ready: "就绪",
    test_area_status_active: "激活",
    test_area_status_testing: "测试中",
    test_area_status_double_click: "双击检测",
    test_area_status_error: "故障",
    // 删除指南按钮相关的文本，因为按钮已被移除
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

// 双击检测相关变量 - 为所有按键
let doubleClickLastTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let doubleClickCount = { 0:0, 1:0, 2:0, 3:0, 4:0 };
const DOUBLE_CLICK_THRESHOLD = 500; // 双击时间阈值，单位ms（通常是200-500ms）
const FAULTY_DOUBLE_CLICK_THRESHOLD = 80; // 故障双击阈值（小于80ms）

// 新增：测试区状态管理
let testArea = null;
let testAreaStatus = null;
let testAreaTimeout = null;
let isMouseInTestArea = false;

// 1. Prevent context menu
document.addEventListener('contextmenu', event => event.preventDefault());

// 2. Prevent native drag
document.addEventListener('dragstart', event => event.preventDefault());

// 初始化测试区功能
function initTestArea() {
    testArea = document.getElementById('testArea');
    testAreaStatus = document.getElementById('testAreaStatus');
    
    if (!testArea || !testAreaStatus) return;
    
    // 设置初始状态
    updateTestAreaStatus('ready');
    
    // 为测试区添加事件监听
    testArea.addEventListener('mouseenter', () => {
        isMouseInTestArea = true;
        updateTestAreaStatus('active');
        testArea.classList.add('active');
    });
    
    testArea.addEventListener('mouseleave', () => {
        isMouseInTestArea = false;
        // 如果正在测试中，不要立即恢复到就绪状态
        if (!hasActiveButtonPress()) {
            updateTestAreaStatus('ready');
            testArea.classList.remove('active', 'testing', 'double-click-detected', 'error');
        }
    });
}

// 检查是否有按钮当前被按下
function hasActiveButtonPress() {
    for (let i = 0; i < 5; i++) {
        if (isPressed[i]) return true;
    }
    return false;
}

// 更新测试区状态和视觉状态
function updateTestAreaStatus(status) {
    if (!testArea || !testAreaStatus) return;
    
    // 清除现有的超时
    if (testAreaTimeout) {
        clearTimeout(testAreaTimeout);
        testAreaTimeout = null;
    }
    
    // 移除所有状态类
    testArea.classList.remove('active', 'testing', 'double-click-detected', 'error');
    
    // 更新状态文本并添加适当的类
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
            
            // 1秒后重置
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
            
            // 1.5秒后重置
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
    
    addLog(`${btnName} ↑ (按住: ${pressDuration}ms)`, 'log-release');
    
    // 如果没有按钮被按下，更新测试区状态
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
    
    let timeLog = "";
    if (lastTime === 0) {
        timeLog = "(首次按下 - 计时起点)";
    } else {
        timeLog = `(距上次↓ ${timeDiff}ms)`;
    }
    
    addLog(`${btnName} ↓ ${timeLog}` + logWarning, logWarning ? 'log-alert' : '');
    
    // 关键：记录这次按下时间，作为下一次计算的基础
    lastClickTime[e.button] = now;
    
    // 更新测试区状态
    if (testArea) {
        updateTestAreaStatus('testing');
        testArea.classList.add('testing');
    }
    
    // 为所有按键添加双击检测
    const buttonIndex = e.button;
    const currentTime = Date.now();
    
    // 如果是第一次点击或者距离上次点击超过双击阈值，重置计数
    if (currentTime - doubleClickLastTime[buttonIndex] > DOUBLE_CLICK_THRESHOLD) {
        doubleClickCount[buttonIndex] = 1;
    } else {
        doubleClickCount[buttonIndex]++;
    }
    
    // 如果是第二次点击且在阈值内，认为是双击
    if (doubleClickCount[buttonIndex] === 2) {
        const clickInterval = currentTime - doubleClickLastTime[buttonIndex];
        
        // 判断双击是否正常
        let logMessage = '';
        let className = '';
        
        if (clickInterval < FAULTY_DOUBLE_CLICK_THRESHOLD) {
            // 故障双击（间隔太短）
            logMessage = `${btnName} 双击 (间隔: ${clickInterval}ms) [故障双击 - 间隔过短]`;
            className = 'log-double-click-fault';
            // 添加故障双击视觉表现
            showDoubleClickEffect(el, true);
            // 为故障双击更新测试区状态
            if (testArea) {
                updateTestAreaStatus('error');
            }
        } else if (clickInterval <= DOUBLE_CLICK_THRESHOLD) {
            // 正常双击
            logMessage = `${btnName} 双击 (间隔: ${clickInterval}ms) [正常双击]`;
            className = 'log-double-click';
            // 添加正常双击视觉表现
            showDoubleClickEffect(el, false);
            // 为正常双击更新测试区状态
            if (testArea) {
                updateTestAreaStatus('double-click');
            }
        }
        
        if (logMessage) {
            addLog(logMessage, className);
        }
        
        // 重置点击计数
        doubleClickCount[buttonIndex] = 0;
    }
    
    // 更新上次点击时间
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
    
    // 重置测试区状态
    if (testArea) {
        updateTestAreaStatus('ready');
        testArea.classList.remove('active', 'testing', 'double-click-detected', 'error');
    }
});

/* Wheel event */
document.addEventListener('wheel', (e) => {
    // 只有当鼠标在鼠标测试区域内时，才阻止默认滚动行为
    const mouseArea = document.getElementById('mouseArea');
    const isInMouseArea = mouseArea.contains(e.target) || mouseArea === e.target;
    
    // 如果在鼠标测试区域内，也阻止默认行为
    if (isInMouseArea) {
        e.preventDefault();
    }
    
    if (e.deltaY < 0) {
        // Scroll up
        wheelCounts.up++;
        updateCountUI('wheel', 'up');
        highlightWheel('up'); // 添加高亮效果
        flashIndicator(scrollUp);
        addLog("滚轮 ↑");
        
        // 滚动时更新测试区状态
        if (testArea && isMouseInTestArea) {
            updateTestAreaStatus('testing');
            testArea.classList.add('testing');
        }
    } else {
        // Scroll down
        wheelCounts.down++;
        updateCountUI('wheel', 'down');
        highlightWheel('down'); // 添加高亮效果
        flashIndicator(scrollDown);
        addLog("滚轮 ↓");
        
        // 滚动时更新测试区状态
        if (testArea && isMouseInTestArea) {
            updateTestAreaStatus('testing');
            testArea.classList.add('testing');
        }
    }
}, { passive: false }); // 注意：passive必须为false才能调用preventDefault

function flashIndicator(element) {
    element.style.opacity = '1';
    setTimeout(() => { element.style.opacity = '0'; }, 150);
}

// 添加双击视觉表现函数
function showDoubleClickEffect(element, isFaulty) {
    if (!element) return;
    
    // 先移除可能存在的旧效果
    element.classList.remove('double-click-effect', 'double-click-fault-effect');
    
    // 添加新的效果类
    if (isFaulty) {
        element.classList.add('double-click-fault-effect');
        // 添加动画
        element.style.animation = 'double-click-fault-flash 0.3s ease-in-out 2';
    } else {
        element.classList.add('double-click-effect');
        // 添加动画
        element.style.animation = 'double-click-flash 0.3s ease-in-out 2';
    }
    
    // 600ms后移除效果（动画持续约600ms）
    setTimeout(() => {
        element.classList.remove('double-click-effect', 'double-click-fault-effect');
        element.style.animation = '';
    }, 600);
}

// 添加滚轮高亮函数
function highlightWheel(direction) {
    const row = document.getElementById('row-wheel');
    if (row) {
        // 先移除其他高亮效果
        row.classList.remove('wheel-up-highlight', 'wheel-down-highlight');
        
        // 根据方向添加相应的高亮类
        if (direction === 'up') {
            row.classList.add('wheel-up-highlight');
        } else {
            row.classList.add('wheel-down-highlight');
        }
        
        // 150ms后移除高亮效果
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
    
    // 重置双击相关变量（所有按键）
    doubleClickCount = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    doubleClickLastTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    
    // Reset button visual state
    document.querySelectorAll('.btn-zone').forEach(el => {
        el.classList.remove('active', 'double-click-effect', 'double-click-fault-effect');
        el.style.animation = '';
    });
    
    // Reset counter rows highlight
    document.querySelectorAll('.counter-item').forEach(el => el.classList.remove('active-counter', 'wheel-up-highlight', 'wheel-down-highlight'));
    
    // 重置测试区状态
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
    const time = new Date().toLocaleTimeString('zh-CN', {hour12: false});
    div.innerText = `[${time}] ${text}`;
    logContainer.prepend(div);
    if (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// 页面加载完成后初始化测试区
document.addEventListener('DOMContentLoaded', function() {
    // 初始化测试区
    initTestArea();
});