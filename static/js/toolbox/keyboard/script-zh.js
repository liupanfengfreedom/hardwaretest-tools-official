// /static/js/toolbox/keyboard/script-zh.js

document.addEventListener('DOMContentLoaded', () => {
    // 初始化：为所有键位添加计数器 span
    document.querySelectorAll('.key').forEach(keyEl => {
        const counter = document.createElement('span');
        counter.className = 'key-counter';
        counter.innerText = '0';
        keyEl.appendChild(counter);
    });
});

// --- 核心变量 ---
const activeCountEl = document.getElementById('count-active');
const testedCountEl = document.getElementById('count-tested');
const totalCountEl = document.getElementById('count-total');

const infoKey = document.getElementById('info-key');
const infoCode = document.getElementById('info-code');
const infoWhich = document.getElementById('info-which');
const infoTime = document.getElementById('info-time'); 

let pressedKeys = new Set(); 
let testedKeys = new Set(); 
let keyCounts = {};       
let totalKeystrokes = 0;
let lastKeyTimestamp = 0;

// --- 按键映射 (可选：如果你想在信息面板显示中文键名) ---
// 如果不需要，可以删掉这个对象，直接显示 e.key
const keyNamesZh = {
    'Space': '空格', 'ArrowUp': '上', 'ArrowDown': '下', 'ArrowLeft': '左', 'ArrowRight': '右',
    'Enter': '回车', 'ShiftLeft': '左Shift', 'ShiftRight': '右Shift', 'Backspace': '退格'
};

// --- 事件监听 ---

document.addEventListener('keydown', (e) => {
    e.preventDefault();
    
    const currentTimestamp = performance.now(); 
    let timeDelta = 0;

    // 计算时间差
    if (lastKeyTimestamp !== 0) {
        timeDelta = Math.round(currentTimestamp - lastKeyTimestamp);
        // [中文特有] 使用中文单位
        infoTime.innerText = `${timeDelta} 毫秒`;
    } else {
        // [中文特有] 初始状态文本
        infoTime.innerText = '开始'; 
    }
    
    lastKeyTimestamp = currentTimestamp;

    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    
    totalKeystrokes++;
    
    if (!keyCounts[e.code]) keyCounts[e.code] = 0;
    keyCounts[e.code]++;

    if (keyEl) {
        keyEl.classList.add('active');
        keyEl.classList.add('tested');
        
        let counter = keyEl.querySelector('.key-counter');
        if (!counter) {
            counter = document.createElement('span');
            counter.className = 'key-counter';
            keyEl.appendChild(counter);
        }
        counter.innerText = keyCounts[e.code];
    }

    pressedKeys.add(e.code);
    testedKeys.add(e.code);
    
    updateStats();
    updateInfo(e);
});

document.addEventListener('keyup', (e) => {
    e.preventDefault();
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) {
        keyEl.classList.remove('active');
    }
    pressedKeys.delete(e.code);
    updateStats();
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
    // [中文特有] 尝试显示中文键名，没有则显示默认
    const displayName = keyNamesZh[e.code] || e.key;
    
    infoKey.innerText = displayName;
    infoCode.innerText = e.code;
    infoWhich.innerText = e.which;
}

// 绑定到 window 以便 HTML 中的 onclick 调用
window.resetTest = function() {
    pressedKeys.clear();
    testedKeys.clear();
    keyCounts = {};
    totalKeystrokes = 0;
    lastKeyTimestamp = 0; 

    document.querySelectorAll('.key').forEach(el => {
        el.classList.remove('active');
        el.classList.remove('tested');
        const counter = el.querySelector('.key-counter');
        if (counter) counter.innerText = '0';
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