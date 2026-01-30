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
    
    // 初始化用户计数
    initUserCount();
    
    // 显示欢迎提示
    setTimeout(() => {
        showToast('💡 提示：直接在键盘上按键开始测试', 'info');
    }, 1000);
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
let maxConcurrentKeys = 0;

// --- 详细按键统计对象 ---
// 结构: { "KeyA": { down: 10, up: 9 }, "Enter": { down: 5, up: 5 } }
let keyStats = {}; 

// --- 中文键名映射 ---
const keyNamesZh = {
    'Space': '空格', 'ArrowUp': '上', 'ArrowDown': '下', 'ArrowLeft': '左', 'ArrowRight': '右',
    'Enter': '回车', 'ShiftLeft': '左Shift', 'ShiftRight': '右Shift', 'Backspace': '退格',
    'ControlLeft': '左Ctrl', 'ControlRight': '右Ctrl', 'AltLeft': '左Alt', 'AltRight': '右Alt',
    'Tab': '制表符', 'CapsLock': '大写锁定', 'Escape': '退出', 'Insert': '插入', 'Delete': '删除',
    'Home': '起始', 'End': '结束', 'PageUp': '上页', 'PageDown': '下页', 'NumLock': '数字锁定',
    'ScrollLock': '滚动锁定', 'Pause': '暂停', 'PrintScreen': '打印屏幕', 'ContextMenu': '菜单键'
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
    
    // 更新最大并发数
    if (pressedKeys.size > maxConcurrentKeys) {
        maxConcurrentKeys = pressedKeys.size;
    }
    
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
    
    // 根据并发数改变颜色
    if (pressedKeys.size > 10) {
        activeCountEl.style.color = '#00ffaa';
    } else if (pressedKeys.size > 6) {
        activeCountEl.style.color = '#ffce00';
    } else if (pressedKeys.size > 3) {
        activeCountEl.style.color = '#ff9800';
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
    if (confirm('确定要重置所有测试数据吗？')) {
        pressedKeys.clear();
        testedKeys.clear();
        keyStats = {}; // 清空统计对象
        totalKeystrokes = 0;
        lastKeyTimestamp = 0;
        maxConcurrentKeys = 0;

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
        
        // 显示重置成功消息
        showToast('测试数据已重置', 'success');
    }
}

// 滚动到键盘区域
window.scrollToKeyboard = function() {
    const keyboardContainer = document.querySelector('.keyboard-container');
    if (keyboardContainer) {
        keyboardContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // 添加视觉反馈
        keyboardContainer.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.5)';
        setTimeout(() => {
            keyboardContainer.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        }, 1000);
    }
}

// 用户计数模拟
function initUserCount() {
    const userCountEl = document.getElementById('user-count');
    if (userCountEl) {
        let count = 10000;
        
        // 初始显示
        userCountEl.textContent = count.toLocaleString() + '+';
        
        // 每30秒增加一些用户
        setInterval(() => {
            count += Math.floor(Math.random() * 3) + 1;
            userCountEl.textContent = count.toLocaleString() + '+';
        }, 30000);
    }
}

// 显示Toast消息
function showToast(message, type = 'info') {
    // 移除现有的toast
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建新的toast
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00552e' : '#1e1e1e'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        border-left: 4px solid ${type === 'success' ? '#00ff88' : '#4fc3f7'};
    `;
    
    document.body.appendChild(toast);
    
    // 3秒后自动移除
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 添加动画关键帧
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 窗口失去焦点时清除按键状态
window.addEventListener('blur', () => {
    pressedKeys.clear();
    document.querySelectorAll('.key.active').forEach(el => el.classList.remove('active'));
    updateStats();
});

// 导出测试数据（控制台使用）
window.getTestStats = function() {
    return {
        testedKeys: Array.from(testedKeys),
        totalKeystrokes: totalKeystrokes,
        maxConcurrentKeys: maxConcurrentKeys,
        keyStats: keyStats
    };
};

// 显示键盘测试技巧
window.showKeyboardTips = function() {
    const tips = [
        "💡 提示：测试时尝试同时按下多个按键，检查键盘的无冲能力",
        "💡 提示：依次测试所有按键，特别关注常用按键如WASD和空格键",
        "💡 提示：观察按键的按下/松开计数是否匹配，不匹配可能表示按键粘连",
        "💡 提示：机械键盘通常支持6键以上无冲，游戏键盘可达全键无冲",
        "💡 提示：如果发现某个按键无响应，尝试多次按压或清洁键帽",
        "💡 提示：测试方向键和数字小键盘，这些按键也经常使用",
        "💡 提示：测试组合键如Ctrl+C、Ctrl+V，确保常用快捷键正常工作",
        "💡 提示：长时间测试可以检查键盘的稳定性和耐久性"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showToast(randomTip, 'info');
};