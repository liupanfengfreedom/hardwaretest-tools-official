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
    
    // 初始化最大并发显示
    const maxCountEl = document.createElement('span');
    maxCountEl.id = 'count-max';
    maxCountEl.innerText = '0';
    document.querySelector('.stat-item:nth-child(4) .stat-value').appendChild(maxCountEl);
    
    // 初始化用户计数
    initUserCount();
    
    // 显示欢迎提示
    setTimeout(() => {
        showToast('💡 提示：直接在键盘上按键开始测试，或点击「故障诊断」进行专业检测', 'info');
    }, 1000);
});

// --- 核心变量 ---
const activeCountEl = document.getElementById('count-active');
const testedCountEl = document.getElementById('count-tested');
const totalCountEl = document.getElementById('count-total');
const maxCountEl = document.getElementById('count-max');

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
let diagnosisActive = false;
let diagnosisResults = [];

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
            
            // 诊断模式下的延迟检测
            if (diagnosisActive && timeDelta > 300) {
                addDiagnosisResult('响应延迟', `检测到高延迟：${timeDelta}ms`, 'warning');
            }
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
        maxCountEl.innerText = maxConcurrentKeys;
        
        // 诊断模式下的NKRO检测
        if (diagnosisActive) {
            if (maxConcurrentKeys < 6) {
                addDiagnosisResult('无冲能力弱', `最大并发按键数仅为${maxConcurrentKeys}`, 'warning');
            } else if (maxConcurrentKeys >= 20) {
                addDiagnosisResult('NKRO性能优秀', `支持${maxConcurrentKeys}键无冲`, 'success');
            }
        }
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
        
        // 检测按键粘连（按下次数 ≠ 松开次数）
        if (keyStats[e.code].down !== keyStats[e.code].up && diagnosisActive) {
            addDiagnosisResult('按键粘连', `按键${e.code}: 按下${keyStats[e.code].down}次 vs 松开${keyStats[e.code].up}次`, 'error');
        }
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
    if (pressedKeys.size > 20) {
        activeCountEl.style.color = '#00ffaa';
        activeCountEl.style.textShadow = '0 0 10px #00ffaa';
    } else if (pressedKeys.size > 10) {
        activeCountEl.style.color = '#00ffaa';
    } else if (pressedKeys.size > 6) {
        activeCountEl.style.color = '#ffce00';
    } else if (pressedKeys.size > 3) {
        activeCountEl.style.color = '#ff9800';
    } else {
        activeCountEl.style.color = '';
        activeCountEl.style.textShadow = '';
    }
    
    // 更新最大并发数显示
    maxCountEl.innerText = maxConcurrentKeys;
}

function updateInfo(e) {
    const displayName = keyNamesZh[e.code] || e.key;

    infoKey.innerText = displayName;
    infoCode.innerText = e.code;
    infoWhich.innerText = e.which;
}

// 重置功能
window.resetTest = function() {
    if (confirm('确定要重置所有测试数据吗？诊断结果也会被清除。')) {
        pressedKeys.clear();
        testedKeys.clear();
        keyStats = {}; // 清空统计对象
        totalKeystrokes = 0;
        lastKeyTimestamp = 0;
        maxConcurrentKeys = 0;
        diagnosisResults = [];
        diagnosisActive = false;

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
        
        // 关闭诊断面板
        const diagnosisPanel = document.querySelector('.diagnosis-panel');
        if (diagnosisPanel) diagnosisPanel.remove();
        
        const reportOverlay = document.querySelector('.report-overlay');
        if (reportOverlay) reportOverlay.remove();
        
        // 显示重置成功消息
        showToast('测试数据和诊断结果已重置', 'success');
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
        background: ${type === 'success' ? '#00552e' : type === 'error' ? '#5a1a1a' : '#1e1e1e'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        border-left: 4px solid ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#4fc3f7'};
        max-width: 400px;
        word-break: break-word;
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
        keyStats: keyStats,
        diagnosisResults: diagnosisResults
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

// ==================== 新增诊断功能 ====================

// 启动诊断模式
window.startDiagnosis = function() {
    // 如果已有诊断面板，先关闭
    const existingPanel = document.querySelector('.diagnosis-panel');
    if (existingPanel) existingPanel.remove();
    
    const existingReport = document.querySelector('.report-overlay');
    if (existingReport) existingReport.remove();
    
    // 重置诊断结果
    diagnosisResults = [];
    diagnosisActive = true;
    
    const diagnosticSteps = [
        {
            title: "🔍 第1步：单键功能测试",
            instruction: "请按顺序测试以下按键组，检查是否有按键失灵：<br>1. WASD方向键<br>2. 数字键1-5<br>3. 方向键↑↓←→<br>4. 空格和回车键",
            action: "testAllKeys",
            check: "检查每个按键按下后是否变为白色高亮",
            time: 60
        },
        {
            title: "⚡ 第2步：连点/粘连检测",
            instruction: "快速连续按同一个键10次（推荐测试W键和空格键）",
            action: "testChattering",
            check: "观察按键右下角计数是否正常增加，松开后是否立即恢复",
            time: 30
        },
        {
            title: "🎮 第3步：NKRO全键无冲测试",
            instruction: "用整个手掌按压键盘中部区域，同时按下尽可能多的按键",
            action: "testNKRO",
            check: "观察『当前并发』数值，正常键盘应≥6，游戏键盘可达10+",
            time: 20
        },
        {
            title: "⏱️ 第4步：响应延迟测试",
            instruction: "以中等速度连续按『A』键10次，记录间隔时间",
            action: "testResponseTime",
            check: "间隔时间应稳定在50-200ms之间，无大幅波动",
            time: 30
        },
        {
            title: "🔄 第5步：按键冲突检测",
            instruction: "同时按下：W+A+Shift+空格<br>然后：Ctrl+Shift+Alt",
            action: "testKeyConflict",
            check: "所有按键应同时高亮，无失效情况",
            time: 30
        }
    ];
    
    // 创建诊断面板
    createDiagnosisPanel(diagnosticSteps);
};

function createDiagnosisPanel(steps) {
    const panel = document.createElement('div');
    panel.className = 'diagnosis-panel';
    panel.innerHTML = `
        <div class="diagnosis-header">
            <h3><i class="fas fa-stethoscope"></i> 键盘故障诊断模式</h3>
            <button class="close-diagnosis"><i class="fas fa-times"></i></button>
        </div>
        <div class="diagnosis-progress">
            <div class="progress-bar"><div class="progress-fill" style="width: 20%;"></div></div>
            <div class="progress-text">步骤 1/${steps.length}</div>
        </div>
        <div class="diagnosis-content">
            <div class="step-current">
                <h4 id="step-title">${steps[0].title}</h4>
                <p id="step-instruction">${steps[0].instruction}</p>
                <div class="step-requirements">
                    <strong>检测要点：</strong> ${steps[0].check}<br>
                    <small><i class="far fa-clock"></i> 建议用时：${steps[0].time}秒</small>
                </div>
            </div>
            <div class="step-results" id="step-results"></div>
        </div>
        <div class="diagnosis-actions">
            <button class="btn-step" id="prev-step"><i class="fas fa-arrow-left"></i> 上一步</button>
            <button class="btn-step" id="next-step">下一步 <i class="fas fa-arrow-right"></i></button>
            <button class="btn-complete" id="complete-diagnosis">完成诊断并生成报告</button>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // 初始化诊断状态
    let currentStep = 0;
    const stepStartTime = Date.now();
    
    // 更新进度
    function updateProgress() {
        const progress = ((currentStep + 1) / steps.length) * 100;
        document.querySelector('.progress-fill').style.width = `${progress}%`;
        document.querySelector('.progress-text').textContent = `步骤 ${currentStep + 1}/${steps.length}`;
        
        document.getElementById('step-title').innerHTML = steps[currentStep].title;
        document.getElementById('step-instruction').innerHTML = steps[currentStep].instruction;
        document.querySelector('.step-requirements').innerHTML = `
            <strong>检测要点：</strong> ${steps[currentStep].check}<br>
            <small><i class="far fa-clock"></i> 建议用时：${steps[currentStep].time}秒</small>
        `;
    }
    
    // 添加诊断结果
    function addStepResult(status, message) {
        const resultDiv = document.getElementById('step-results');
        const resultItem = document.createElement('div');
        resultItem.className = `step-result ${status}`;
        resultItem.innerHTML = `<i class="fas fa-${status === 'success' ? 'check' : status === 'warning' ? 'exclamation' : 'times'}"></i> ${message}`;
        resultDiv.appendChild(resultItem);
        
        // 添加到诊断结果数组
        diagnosisResults.push({
            step: currentStep + 1,
            title: steps[currentStep].title,
            status: status,
            message: message,
            timestamp: Date.now()
        });
    }
    
    // 自动检测当前步骤结果
    function autoDetectStepResult() {
        switch(currentStep) {
            case 0: // 单键功能测试
                if (testedKeys.size >= 20) {
                    addStepResult('success', `已测试 ${testedKeys.size} 个按键，基本功能正常`);
                } else if (testedKeys.size > 0) {
                    addStepResult('warning', `仅测试了 ${testedKeys.size} 个按键，建议测试更多按键`);
                } else {
                    addStepResult('error', '尚未测试任何按键');
                }
                break;
            case 1: // 连点检测
                // 检查是否有按键粘连
                let hasChattering = false;
                Object.entries(keyStats).forEach(([key, stats]) => {
                    if (stats.down !== stats.up) {
                        hasChattering = true;
                        addStepResult('warning', `按键${key}可能存在粘连：按下${stats.down}次 vs 松开${stats.up}次`);
                    }
                });
                if (!hasChattering) {
                    addStepResult('success', '未检测到明显的连点/粘连问题');
                }
                break;
            case 2: // NKRO测试
                if (maxConcurrentKeys >= 10) {
                    addStepResult('success', `NKRO性能优秀：支持 ${maxConcurrentKeys} 键无冲`);
                } else if (maxConcurrentKeys >= 6) {
                    addStepResult('warning', `NKRO性能一般：仅支持 ${maxConcurrentKeys} 键无冲`);
                } else {
                    addStepResult('error', `NKRO性能较差：仅支持 ${maxConcurrentKeys} 键无冲`);
                }
                break;
            case 3: // 响应延迟测试
                // 这里简化处理，实际应该分析时间序列
                addStepResult('info', '响应延迟需要结合使用体验判断，观察信息面板的间隔时间');
                break;
            case 4: // 按键冲突检测
                if (maxConcurrentKeys >= 4) {
                    addStepResult('success', `组合键测试通过，支持 ${maxConcurrentKeys} 键同时按下`);
                } else {
                    addStepResult('warning', `组合键支持有限，仅支持 ${maxConcurrentKeys} 键同时按下`);
                }
                break;
        }
    }
    
    // 事件监听
    document.querySelector('.close-diagnosis').addEventListener('click', () => {
        if (confirm('确定要退出诊断模式吗？未完成的诊断结果将不会保存。')) {
            panel.remove();
            diagnosisActive = false;
        }
    });
    
    document.getElementById('next-step').addEventListener('click', () => {
        // 自动检测当前步骤结果
        autoDetectStepResult();
        
        if (currentStep < steps.length - 1) {
            currentStep++;
            updateProgress();
            document.getElementById('step-results').innerHTML = '';
        } else {
            completeDiagnosis();
        }
    });
    
    document.getElementById('prev-step').addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateProgress();
            document.getElementById('step-results').innerHTML = '';
        }
    });
    
    document.getElementById('complete-diagnosis').addEventListener('click', () => {
        // 自动检测最后一步结果
        autoDetectStepResult();
        completeDiagnosis();
    });
    
    function completeDiagnosis() {
        generateDiagnosisReport();
        panel.remove();
        diagnosisActive = false;
    }
}

// 添加到诊断结果数组
function addDiagnosisResult(type, details, severity = 'info') {
    diagnosisResults.push({
        type: type,
        details: details,
        severity: severity,
        timestamp: Date.now()
    });
}

function generateDiagnosisReport() {
    // 分析测试数据
    const totalKeysTested = testedKeys.size;
    const totalKeystrokesTested = totalKeystrokes;
    const maxConcurrency = maxConcurrentKeys;
    
    // 故障检测逻辑
    const issues = [];
    const warnings = [];
    const successes = [];
    
    // 检查按键粘连（按下次数 ≠ 松开次数）
    Object.entries(keyStats).forEach(([keyCode, stats]) => {
        if (stats.down !== stats.up) {
            issues.push({
                type: '按键粘连',
                key: keyCode,
                details: `按下${stats.down}次 vs 松开${stats.up}次`,
                severity: 'error'
            });
        }
    });
    
    // 检查低并发（可能表示键盘无冲能力弱）
    if (maxConcurrency < 6) {
        warnings.push({
            type: '无冲能力弱',
            severity: 'warning',
            details: `最大并发按键数仅为${maxConcurrency}，普通键盘应有6键以上无冲`
        });
    } else if (maxConcurrency >= 10) {
        successes.push({
            type: 'NKRO性能优秀',
            severity: 'success',
            details: `支持${maxConcurrency}键无冲，适合游戏使用`
        });
    }
    
    // 检查按键响应情况
    if (totalKeysTested < 50) {
        warnings.push({
            type: '测试不全面',
            severity: 'warning',
            details: `仅测试了${totalKeysTested}个按键，建议测试所有按键`
        });
    }
    
    // 检查诊断步骤结果
    diagnosisResults.forEach(result => {
        if (result.status === 'error' || result.severity === 'error') {
            issues.push(result);
        } else if (result.status === 'warning' || result.severity === 'warning') {
            warnings.push(result);
        } else if (result.status === 'success' || result.severity === 'success') {
            successes.push(result);
        }
    });
    
    // 生成报告HTML
    const reportHTML = `
        <div class="diagnosis-report">
            <h3><i class="fas fa-file-medical-alt"></i> 键盘诊断报告</h3>
            <div class="report-meta">
                <div class="meta-item">
                    <i class="far fa-calendar"></i>
                    <span>${new Date().toLocaleString('zh-CN', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-keyboard"></i>
                    <span>键盘诊断报告</span>
                </div>
            </div>
            
            <div class="report-summary">
                <div class="summary-item">
                    <span class="summary-label">已测试按键</span>
                    <span class="summary-value">${totalKeysTested}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">总击键数</span>
                    <span class="summary-value">${totalKeystrokesTested}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">最大并发</span>
                    <span class="summary-value">${maxConcurrency}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">测试时长</span>
                    <span class="summary-value">${Math.round((Date.now() - window.diagnosisStartTime || 0) / 1000)}s</span>
                </div>
            </div>
            
            <div class="report-status">
                ${issues.length > 0 ? `
                <div class="status-badge status-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>检测到 ${issues.length} 个问题</span>
                </div>
                ` : warnings.length > 0 ? `
                <div class="status-badge status-warning">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${warnings.length} 个注意事项</span>
                </div>
                ` : `
                <div class="status-badge status-success">
                    <i class="fas fa-check-circle"></i>
                    <span>键盘状态良好</span>
                </div>
                `}
            </div>
            
            ${issues.length > 0 ? `
            <div class="report-issues">
                <h4><i class="fas fa-exclamation-triangle"></i> 检测到问题</h4>
                <div class="issues-list">
                    ${issues.map(issue => `
                        <div class="issue-item">
                            <div class="issue-header">
                                <i class="fas fa-times-circle"></i>
                                <strong>${issue.type}</strong>
                            </div>
                            <div class="issue-detail">${issue.details}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${warnings.length > 0 ? `
            <div class="report-warnings">
                <h4><i class="fas fa-exclamation-circle"></i> 注意事项</h4>
                <div class="warnings-list">
                    ${warnings.map(warning => `
                        <div class="warning-item">
                            <div class="warning-header">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>${warning.type}</strong>
                            </div>
                            <div class="warning-detail">${warning.details}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${successes.length > 0 ? `
            <div class="report-successes">
                <h4><i class="fas fa-check-circle"></i> 良好表现</h4>
                <div class="successes-list">
                    ${successes.map(success => `
                        <div class="success-item">
                            <div class="success-header">
                                <i class="fas fa-check"></i>
                                <strong>${success.type}</strong>
                            </div>
                            <div class="success-detail">${success.details}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="report-suggestions">
                <h4><i class="fas fa-lightbulb"></i> 维护建议</h4>
                ${issues.length === 0 ? `
                <div class="suggestion-item">
                    <i class="fas fa-check"></i>
                    <div>
                        <h5>键盘状态良好</h5>
                        <p>您的键盘工作正常，建议：</p>
                        <ul>
                            <li>每月使用压缩空气清洁一次键帽下灰尘</li>
                            <li>避免在键盘附近饮食，防止液体溅入</li>
                            <li>定期（每3个月）进行键盘测试检查</li>
                            <li>使用键盘膜保护，延长使用寿命</li>
                        </ul>
                    </div>
                </div>
                ` : issues.some(i => i.type.includes('粘连')) ? `
                <div class="suggestion-item">
                    <i class="fas fa-tools"></i>
                    <div>
                        <h5>按键粘连问题修复</h5>
                        <p>检测到按键粘连问题，建议：</p>
                        <ol>
                            <li>使用异丙醇（酒精）和棉签清洁按键触点</li>
                            <li>对于机械键盘，考虑更换故障轴体（成本低）</li>
                            <li>检查键盘是否进水，彻底干燥后再使用</li>
                            <li>如问题持续，考虑专业维修或更换键盘</li>
                        </ol>
                    </div>
                </div>
                ` : `
                <div class="suggestion-item">
                    <i class="fas fa-wrench"></i>
                    <div>
                        <h5>综合维护建议</h5>
                        <p>根据检测结果，建议：</p>
                        <ol>
                            <li>检查USB连接是否牢固，尝试不同USB端口</li>
                            <li>更新键盘驱动程序，排除软件问题</li>
                            <li>清洁键盘内部灰尘，改善接触性能</li>
                            <li>如为无线键盘，更换新电池减少延迟</li>
                        </ol>
                    </div>
                </div>
                `}
            </div>
            
            <div class="report-actions">
                <button onclick="window.print()" class="btn-print">
                    <i class="fas fa-print"></i> 打印报告
                </button>
                <button onclick="saveReportAsImage()" class="btn-save">
                    <i class="fas fa-download"></i> 保存截图
                </button>
                <button onclick="this.closest('.report-overlay').remove()" class="btn-close">
                    <i class="fas fa-times"></i> 关闭
                </button>
            </div>
        </div>
    `;
    
    const reportOverlay = document.createElement('div');
    reportOverlay.className = 'report-overlay';
    reportOverlay.innerHTML = reportHTML;
    document.body.appendChild(reportOverlay);
    
    // 保存报告为图片（简化版）
    window.saveReportAsImage = function() {
        showToast('报告截图已保存到剪贴板（模拟功能）', 'info');
        // 实际实现需要使用html2canvas等库
    };
}

// 初始化诊断开始时间
window.diagnosisStartTime = 0;