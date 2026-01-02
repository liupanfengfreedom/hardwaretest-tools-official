// 中文版本的 main.js - 硬编码的中文文本
const TEXTS = {
    left_click: "左键点击",
    right_click: "右键点击",
    counter_middle: "中键",
    counter_b4: "侧键(B4)",
    counter_b5: "侧键(B5)",
    log_warning: " [双击警报！]",
    log_reset: "--- 所有数据已重置 ---",
};

// --- 原始脚本变量和函数 ---
let logContainer;

// 跟踪点击计数、双击计数和故障双击计数
let clickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let doubleClickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let faultyDoubleClickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };

// 跟踪按钮按下状态和上次点击时间
let isPressed = { 0:false, 1:false, 2:false, 3:false, 4:false };

// 跟踪每个按钮的最后按下时间
let lastPressTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let pressStartTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };

// 双击检测相关变量 - 用于所有按钮
let doubleClickLastTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
let doubleClickCount = { 0:0, 1:0, 2:0, 3:0, 4:0 };
const DOUBLE_CLICK_THRESHOLD = 500; // 双击时间阈值，单位毫秒（通常为200-500毫秒）
let FAULTY_DOUBLE_CLICK_THRESHOLD = 80; // 故障双击阈值（小于80毫秒）- 现在可修改

// 滑块DOM元素
let thresholdSlider;
let thresholdValueDisplay;

// 跟踪滑块是否正在拖动
let isSliderDragging = false;

// 跟踪是否正在进行双击以防止单击高亮
let isDoubleClickInProgress = { 0:false, 1:false, 2:false, 3:false, 4:false };

// 初始化函数
function initMouseTest() {
    logContainer = document.getElementById('eventLog');
    
    if (!logContainer) {
        console.error('事件日志容器未找到');
        return;
    }
    
    // 获取滑块元素
    thresholdSlider = document.getElementById('faultyThresholdSlider');
    thresholdValueDisplay = document.getElementById('thresholdValue');
    
    // 设置滑块事件监听器
    if (thresholdSlider && thresholdValueDisplay) {
        // 初始化显示
        updateThresholdDisplay();
        
        // 添加输入事件监听器以实时更新
        thresholdSlider.addEventListener('input', function() {
            FAULTY_DOUBLE_CLICK_THRESHOLD = parseInt(this.value);
            updateThresholdDisplay();
            addLog(`故障双击阈值设置为 ${FAULTY_DOUBLE_CLICK_THRESHOLD}毫秒`, 'log-info');
        });
        
        // 添加鼠标按下事件以跟踪滑块何时被拖动
        thresholdSlider.addEventListener('mousedown', function(e) {
            isSliderDragging = true;
        });
        
        // 添加鼠标释放事件以跟踪滑块何时被释放
        thresholdSlider.addEventListener('mouseup', function() {
            isSliderDragging = false;
        });
        
        // 同时跟踪鼠标离开以确保滑块状态被重置
        thresholdSlider.addEventListener('mouseleave', function() {
            isSliderDragging = false;
        });
    } else {
        console.error('滑块元素未找到');
    }
    
    // 1. 阻止上下文菜单
    document.addEventListener('contextmenu', event => event.preventDefault());
    
    // 2. 阻止原生拖拽
    document.addEventListener('dragstart', event => event.preventDefault());
    
    console.log('鼠标测试已初始化');
}

// 在UI中更新阈值显示
function updateThresholdDisplay() {
    if (thresholdValueDisplay) {
        thresholdValueDisplay.textContent = `${FAULTY_DOUBLE_CLICK_THRESHOLD}毫秒`;
    }
    if (thresholdSlider) {
        thresholdSlider.value = FAULTY_DOUBLE_CLICK_THRESHOLD;
    }
}

// 检查是否有任何按钮当前被按下
function hasActiveButtonPress() {
    for (let i = 0; i < 5; i++) {
        if (isPressed[i]) return true;
    }
    return false;
}

// 计算自上次按下以来的时间差
function getTimeSinceLastPress(button) {
    const currentTime = Date.now();
    if (lastPressTime[button] === 0) {
        return "首次按下";
    } else {
        const timeDiff = currentTime - lastPressTime[button];
        return `${timeDiff}毫秒 自上次按下`;
    }
}

// 计算按住持续时间
function getHoldDuration(button) {
    if (pressStartTime[button] === 0) {
        return "未知";
    } else {
        const holdTime = Date.now() - pressStartTime[button];
        return `${holdTime}毫秒 按住`;
    }
}

// --- 事件监听器 ---

/* 鼠标按下 */
function handleMouseDown(e) {
    // 如果滑块正在拖动，则跳过
    if (isSliderDragging) {
        return;
    }
    
    // 检查点击是否直接在滑块或其拇指上
    // 仅当点击滑块本身而不是整个容器时才跳过
    if (e.target === thresholdSlider || 
        e.target.closest('.threshold-slider') === thresholdSlider) {
        // 与滑块交互时不处理鼠标测试事件
        return;
    }
    
    e.preventDefault(); 
    
    const button = e.button;
    if (isPressed[button]) return;
    
    const currentTime = Date.now();
    isPressed[button] = true;

    // 记录按下开始时间
    pressStartTime[button] = currentTime;

    const btnId = 'btn' + button;
    const el = document.getElementById(btnId);
    if (el) el.classList.add('active');

    // 更新点击计数
    clickCounts[button]++;
    updateClickCountUI(button);

    const btnNameMap = {
        0: TEXTS.left_click, 
        1: TEXTS.counter_middle, 
        2: TEXTS.right_click, 
        3: TEXTS.counter_b4, 
        4: TEXTS.counter_b5
    };
    const btnName = btnNameMap[button] || `按钮 ${button}`;
    
    // 计算自上次按下以来的时间
    const timeSinceLastPress = getTimeSinceLastPress(button);
    
    // 记录点击信息
    addLog(`${btnName} ↓ (${timeSinceLastPress})`, 'log-click');
    
    // 所有按钮的双击检测
    
    // 如果是第一次点击或距离上次点击的时间超过双击阈值，则重置计数
    if (currentTime - doubleClickLastTime[button] > DOUBLE_CLICK_THRESHOLD) {
        doubleClickCount[button] = 1;
    } else {
        doubleClickCount[button]++;
    }
    
    // 如果是第二次点击且在阈值内，则视为双击
    if (doubleClickCount[button] === 2) {
        const clickInterval = currentTime - doubleClickLastTime[button];
        
        // 确定双击是否正常
        if (clickInterval < FAULTY_DOUBLE_CLICK_THRESHOLD) {
            // 故障双击（间隔太短）
            faultyDoubleClickCounts[button]++;
            updateFaultyDoubleClickCountUI(button);
            addLog(`${btnName} 故障双击 (间隔: ${clickInterval}毫秒)`, 'log-double-click-fault');
            // 向鼠标按钮添加故障双击视觉效果
            showDoubleClickEffect(el, true);
            // 向计数器行添加故障双击视觉效果
            showCounterDoubleClickEffect(button, true);
            
            // 标记双击正在进行中以防止单击高亮
            isDoubleClickInProgress[button] = true;
            // 动画后重置双击标志
            setTimeout(() => {
                isDoubleClickInProgress[button] = false;
            }, 600);
        } else if (clickInterval <= DOUBLE_CLICK_THRESHOLD) {
            // 正常双击
            doubleClickCounts[button]++;
            updateDoubleClickCountUI(button);
            addLog(`${btnName} 双击 (间隔: ${clickInterval}毫秒)`, 'log-double-click');
            // 向鼠标按钮添加正常双击视觉效果
            showDoubleClickEffect(el, false);
            // 向计数器行添加正常双击视觉效果
            showCounterDoubleClickEffect(button, false);
            
            // 标记双击正在进行中以防止单击高亮
            isDoubleClickInProgress[button] = true;
            // 动画后重置双击标志
            setTimeout(() => {
                isDoubleClickInProgress[button] = false;
            }, 600);
        } else {
            // 不是双击（间隔太长），显示单击高亮
            if (!isDoubleClickInProgress[button]) {
                highlightRow(button);
            }
        }
        
        // 重置此按钮的点击计数
        doubleClickCount[button] = 0;
    } else {
        // 潜在双击的第一次点击，除非双击正在进行中，否则显示高亮
        if (!isDoubleClickInProgress[button]) {
            highlightRow(button);
        }
    }
    
    // 更新此按钮的最后按下时间
    lastPressTime[button] = currentTime;
    doubleClickLastTime[button] = currentTime;
}

/* 鼠标释放 */
function handleMouseUp(e) {
    // 检查点击是否在滑块上
    if (e.target === thresholdSlider || 
        e.target.closest('.threshold-slider') === thresholdSlider) {
        // 与滑块交互时不处理鼠标测试事件
        isSliderDragging = false;
        return;
    }
    
    // 如果滑块正在拖动，则跳过
    if (isSliderDragging) {
        isSliderDragging = false;
        return;
    }
    
    e.preventDefault();
    handleButtonRelease(e.button);
}

// 辅助函数：处理按钮释放
function handleButtonRelease(buttonCode) {
    if (!isPressed[buttonCode]) return;

    const currentTime = Date.now();
    isPressed[buttonCode] = false;
    
    const btnId = 'btn' + buttonCode;
    const el = document.getElementById(btnId);
    if (el) el.classList.remove('active');
    
    // 计算按住持续时间
    const holdDuration = getHoldDuration(buttonCode);
    
    // 记录释放信息
    const btnNameMap = {
        0: TEXTS.left_click, 
        1: TEXTS.counter_middle, 
        2: TEXTS.right_click, 
        3: TEXTS.counter_b4, 
        4: TEXTS.counter_b5
    };
    const btnName = btnNameMap[buttonCode] || `按钮 ${buttonCode}`;
    
    addLog(`${btnName} ↑ (${holdDuration})`, 'log-release');
    
    // 重置按下开始时间
    pressStartTime[buttonCode] = 0;
}

/* 鼠标移动状态校正 */
function handleMouseMove(e) {
    // 如果滑块正在拖动，则跳过
    if (isSliderDragging) {
        return;
    }

    // 检查右键（按钮2）：掩码为2
    if (isPressed[2] && (e.buttons & 2) === 0) {
        handleButtonRelease(2);
    }

    // 检查左键（按钮0）：掩码为1
    if (isPressed[0] && (e.buttons & 1) === 0) {
        handleButtonRelease(0);
    }

    // 检查中键（按钮1）：掩码为4
    if (isPressed[1] && (e.buttons & 4) === 0) {
        handleButtonRelease(1);
    }
    
    // 检查侧键B4（按钮3）
    if (isPressed[3] && (e.buttons & 8) === 0) {
        handleButtonRelease(3);
    }
    
    // 检查侧键B5（按钮4）
    if (isPressed[4] && (e.buttons & 16) === 0) {
        handleButtonRelease(4);
    }
}

// 添加双击视觉效果函数
function showDoubleClickEffect(element, isFaulty) {
    if (!element) return;
    
    // 移除任何现有的旧效果
    element.classList.remove('double-click-effect', 'double-click-fault-effect');
    
    // 添加新效果类
    if (isFaulty) {
        element.classList.add('double-click-fault-effect');
        // 添加动画
        element.style.animation = 'double-click-fault-flash 0.3s ease-in-out 2';
    } else {
        element.classList.add('double-click-effect');
        // 添加动画
        element.style.animation = 'double-click-flash 0.3s ease-in-out 2';
    }
    
    // 600毫秒后移除效果（动画持续约600毫秒）
    setTimeout(() => {
        element.classList.remove('double-click-effect', 'double-click-fault-effect');
        element.style.animation = '';
    }, 600);
}

// 添加计数器行双击视觉效果函数
function showCounterDoubleClickEffect(button, isFaulty) {
    const row = document.getElementById(`row-${button}`);
    if (!row) return;
    
    // 移除任何现有的效果
    row.classList.remove('active-counter', 'double-click-counter', 'faulty-double-click-counter');
    
    // 添加新的效果类
    if (isFaulty) {
        row.classList.add('faulty-double-click-counter');
    } else {
        row.classList.add('double-click-counter');
    }
    
    // 600毫秒后移除效果（与按钮效果同步）
    setTimeout(() => {
        row.classList.remove('double-click-counter', 'faulty-double-click-counter');
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
    // 如果当前已经有双击效果，不要覆盖它
    const row = document.getElementById(`row-${key}`);
    if (row && !isDoubleClickInProgress[key]) {
        // 移除双击效果类
        row.classList.remove('double-click-counter', 'faulty-double-click-counter');
        
        // 添加蓝色高亮
        row.classList.remove('active-counter');
        void row.offsetWidth; 
        row.classList.add('active-counter');
        
        // 150毫秒后移除蓝色高亮
        setTimeout(() => { 
            row.classList.remove('active-counter'); 
        }, 150);
    }
}

function resetCounts() {
    // 重置所有计数
    clickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    doubleClickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    faultyDoubleClickCounts = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    
    // 重置所有时间跟踪
    lastPressTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    pressStartTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    
    // 更新所有UI计数器
    for (let i = 0; i < 5; i++) {
        updateClickCountUI(i);
        updateDoubleClickCountUI(i);
        updateFaultyDoubleClickCountUI(i);
    }
    
    // 重置按钮状态
    isPressed = { 0:false, 1:false, 2:false, 3:false, 4:false };
    
    // 重置所有按钮的双击相关变量
    doubleClickCount = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    doubleClickLastTime = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    
    // 重置双击进行中标志
    isDoubleClickInProgress = { 0:false, 1:false, 2:false, 3:false, 4:false };
    
    // 重置按钮视觉状态
    document.querySelectorAll('.btn-zone').forEach(el => {
        el.classList.remove('active', 'double-click-effect', 'double-click-fault-effect');
        el.style.animation = '';
    });
    
    // 重置计数器行高亮和双击效果
    document.querySelectorAll('.counter-item').forEach(el => {
        el.classList.remove('active-counter', 'double-click-counter', 'faulty-double-click-counter');
    });
    
    // 重置故障双击阈值为默认值（80毫秒）
    FAULTY_DOUBLE_CLICK_THRESHOLD = 80;
    updateThresholdDisplay();
    
    // 重置滑块拖动状态
    isSliderDragging = false;
    
    // 添加日志
    addLog(TEXTS.log_reset, 'log-info');
    addLog(`故障双击阈值重置为 ${FAULTY_DOUBLE_CLICK_THRESHOLD}毫秒`, 'log-info');
}

function addLog(text, className) {
    if (!logContainer) return;
    
    const div = document.createElement('div');
    div.className = 'log-item ' + (className || '');
    const time = new Date().toLocaleTimeString('zh-CN', {hour12: false});
    div.innerText = `[${time}] ${text}`;
    logContainer.prepend(div);
    if (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initMouseTest();
    
    // 添加事件监听器
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    // 窗口失去焦点时的最终安全处理
    window.addEventListener('blur', () => {
        for (let i = 0; i < 5; i++) {
            if (isPressed[i]) handleButtonRelease(i);
        }
        // 同时重置滑块拖动状态
        isSliderDragging = false;
    });
    
    console.log('鼠标测试事件监听器已附加');
});

// 使resetCounts函数在全局可用
window.resetCounts = resetCounts;