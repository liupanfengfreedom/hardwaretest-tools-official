// /static/js/toolbox/keyboard/script-zh.js

document.addEventListener('DOMContentLoaded', () => {
    // 初始化：为所有键位添加 "按下(Down)" 和 "松开(Up)" 的计数器 span
    document.querySelectorAll('.key').forEach(keyEl => {
        // 右下角显示按下的计数器 (Down)
        const downSpan = document.createElement('span');
        downSpan.className = 'key-stat-down';
        downSpan.innerText = '0';
        keyEl.appendChild(downSpan);

        // 右上角显示松开的计数器 (Up)
        const upSpan = document.createElement('span');
        upSpan.className = 'key-stat-up';
        upSpan.innerText = '0';
        keyEl.appendChild(upSpan);
    });
});

// --- 核心变量 ---
const activeCountEl = document.getElementById('count-active');
const testedCountEl = document.getElementById('count-tested');
const totalCountEl = document.getElementById('count-total');

// 信息面板元素
const infoKey = document.getElementById('info-key');
const infoCode = document.getElementById('info-code');
const infoWhich = document.getElementById('info-which');
const infoTime = document.getElementById('info-time'); 

let pressedKeys = new Set(); 
let testedKeys = new Set(); 
let totalKeystrokes = 0;
let lastKeyTimestamp = 0;

// --- 详细按键统计对象 ---
// 结构: { "KeyA": { down: 10, up: 9 }, "Enter": { down: 5, up: 5 } }
let keyStats = {}; 

// --- 中文键名映射 ---
const keyNamesZh = {
    'Space': '空格', 'ArrowUp': '上', 'ArrowDown': '下', 'ArrowLeft': '左', 'ArrowRight': '右',
    'Enter': '回车', 'ShiftLeft': '左Shift', 'ShiftRight': '右Shift', 'Backspace': '退格',
    'ControlLeft': '左Ctrl', 'ControlRight': '右Ctrl', 'AltLeft': '左Alt', 'AltRight': '右Alt'
};

// --- KeyDown 事件监听 ---
document.addEventListener('keydown', (e) => {
    e.preventDefault();
    
    // 1. 初始化该按键的统计对象（如果不存在）
    if (!keyStats[e.code]) {
        keyStats[e.code] = { down: 0, up: 0 };
    }

    // 2. 物理按下逻辑 (忽略长按产生的自动重复)
    if (!e.repeat) {
        // 增加按下计数
        keyStats[e.code].down++;
        
        // 增加总击键数
        totalKeystrokes++;
        
        // 计算时间差
        const currentTimestamp = performance.now(); 
        if (lastKeyTimestamp !== 0) {
            const timeDelta = Math.round(currentTimestamp - lastKeyTimestamp);
            infoTime.innerText = `${timeDelta} 毫秒`;
        } else {
            infoTime.innerText = '开始'; 
        }
        lastKeyTimestamp = currentTimestamp;

        // 更新 UI：键盘上的数字 (显示按下次数 - 右下角)
        const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
        if (keyEl) {
            keyEl.classList.add('tested');
            
            // 获取或创建 down span
            let downCounter = keyEl.querySelector('.key-stat-down');
            if (!downCounter) {
                downCounter = document.createElement('span');
                downCounter.className = 'key-stat-down';
                keyEl.appendChild(downCounter);
            }
            downCounter.innerText = keyStats[e.code].down;
        }

        testedKeys.add(e.code);
    }

    // 3. 视觉状态：只要有 KeyDown 事件（哪怕是 repeat），保持按键高亮
    // 并发计数逻辑
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) keyEl.classList.add('active');
    pressedKeys.add(e.code);
    
    // 4. 更新面板
    updateStats();
    updateInfo(e);
});

// --- KeyUp 事件监听 ---
document.addEventListener('keyup', (e) => {
    e.preventDefault();
    
    // 1. 初始化统计对象（防止没按直接松开的边缘情况）
    if (!keyStats[e.code]) {
        keyStats[e.code] = { down: 0, up: 0 };
    }

    // 2. 增加松开计数
    keyStats[e.code].up++;

    // 3. 视觉状态移除
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) {
        keyEl.classList.remove('active');
        
        // 更新 UI：键盘上的数字 (显示松开次数 - 右上角)
        let upCounter = keyEl.querySelector('.key-stat-up');
        if (!upCounter) {
            upCounter = document.createElement('span');
            upCounter.className = 'key-stat-up';
            keyEl.appendChild(upCounter);
        }
        upCounter.innerText = keyStats[e.code].up;
    }
    
    pressedKeys.delete(e.code);
    
    // 4. 更新面板
    updateStats();
    updateInfo(e); 
});

// --- 辅助函数 ---

function updateStats() {
    activeCountEl.innerText = pressedKeys.size;
    testedCountEl.innerText = testedKeys.size;
    totalCountEl.innerText = totalKeystrokes;
    
    if (pressedKeys.size > 6) {
        activeCountEl.style.color = '#ff4444';
    } else {
        activeCountEl.style.color = '';
    }
}

function updateInfo(e) {
    const displayName = keyNamesZh[e.code] || e.key;

    infoKey.innerText = displayName;
    infoCode.innerText = e.code;
    infoWhich.innerText = e.which;
}

// 重置功能
window.resetTest = function() {
    pressedKeys.clear();
    testedKeys.clear();
    keyStats = {}; // 清空统计对象
    totalKeystrokes = 0;
    lastKeyTimestamp = 0; 

    document.querySelectorAll('.key').forEach(el => {
        el.classList.remove('active');
        el.classList.remove('tested');
        
        // 重置按键上的数字
        const downStat = el.querySelector('.key-stat-down');
        if(downStat) downStat.innerText = '0';
        
        const upStat = el.querySelector('.key-stat-up');
        if(upStat) upStat.innerText = '0';
    });

    updateStats();
    infoKey.innerText = '-';
    infoCode.innerText = '-';
    infoWhich.innerText = '-';
    infoTime.innerText = '- ms';
}

window.addEventListener('blur', () => {
    pressedKeys.clear();
    document.querySelectorAll('.key.active').forEach(el => el.classList.remove('active'));
    updateStats();
});