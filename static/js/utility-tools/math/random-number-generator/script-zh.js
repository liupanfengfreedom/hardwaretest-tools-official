let currentMode = 'int';
let history = JSON.parse(localStorage.getItem('randomHistory') || '[]');
let seedGenerator = null;
let currentResults = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    renderHistory();
    document.getElementById('digits').addEventListener('input', updateMaxCount);
    document.getElementById('min').addEventListener('input', updateMaxCount);
    document.getElementById('max').addEventListener('input', updateMaxCount);
    updateMaxCount();
    generate(); // 默认生成一次
});

function setMode(mode, btn) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 显示/隐藏相关选项
    document.getElementById('digits-mode').style.display = (mode === 'int' || mode === 'dec') ? 'flex' : 'none';
    document.getElementById('range-mode').style.display = (mode === 'range') ? 'flex' : 'none';
    document.getElementById('decimal-options').style.display = (mode === 'dec') ? 'flex' : 'none';
    
    // 更新最大值计算
    updateMaxCount();
}

function updateMaxCount() {
    const uniqueCheckbox = document.getElementById('unique');
    const countInput = document.getElementById('count');
    
    if (uniqueCheckbox.checked) {
        let maxPossible;
        
        if (currentMode === 'range') {
            const min = parseBigInt(document.getElementById('min').value) || 0n;
            const max = parseBigInt(document.getElementById('max').value) || 100n;
            const diff = max > min ? max - min : min - max;
            maxPossible = Number(diff) + 1;
            
            // 如果范围太大，限制在1000
            if (maxPossible > 10000) {
                maxPossible = 10000;
            }
        } else {
            const digits = parseInt(document.getElementById('digits').value) || 6;
            // 对于超大位数，限制最大生成数量
            maxPossible = Math.min(10000, Math.pow(10, Math.min(digits, 4)));
        }
        
        if (maxPossible < 10000) {
            countInput.max = maxPossible;
            countInput.title = `不重复模式下最多可生成 ${maxPossible} 个数字`;
        } else {
            countInput.max = 10000;
            countInput.title = '不重复模式下最多可生成 10000 个数字';
        }
    } else {
        countInput.max = 10000;
        countInput.title = '最多可生成 10000 个数字';
    }
}

function toggleMaxCount() {
    updateMaxCount();
}

function parseBigInt(value) {
    try {
        value = value.trim();
        if (!value) return 0n;
        
        // 移除逗号等分隔符
        value = value.replace(/,/g, '');
        
        // 检查是否为有效数字
        if (!/^-?\d+$/.test(value)) {
            return 0n;
        }
        
        return BigInt(value);
    } catch (e) {
        return 0n;
    }
}

function generate() {
    const count = parseInt(document.getElementById('count').value) || 1;
    const unique = document.getElementById('unique').checked;
    const seed = document.getElementById('seed').value.trim();
    const format = document.querySelector('input[name="format"]:checked').value;
    
    // 清空警告区域
    const warningArea = document.getElementById('warning-area');
    warningArea.innerHTML = '';
    
    // 验证输入
    if (currentMode === 'int' || currentMode === 'dec') {
        const digits = parseInt(document.getElementById('digits').value) || 6;
        if (digits > 50) {
            warningArea.innerHTML = `
                <div class="warning">
                    <strong>提示：</strong>您正在生成超过50位的超大整数。显示和计算可能需要较长时间。
                </div>
            `;
        }
    }
    
    // 根据模式生成数字
    let results = [];
    if (currentMode === 'int') {
        results = generateBigIntegers(count, unique);
    } else if (currentMode === 'dec') {
        results = generateDecimals(count, unique);
    } else if (currentMode === 'range') {
        results = generateRangeIntegers(count, unique);
    }
    
    // 保存当前结果
    currentResults = results.map(r => r.toString());
    
    // 格式化结果
    const formatted = formatResults(currentResults, format);
    
    // 显示结果
    const display = document.getElementById('result-display');
    display.style.fontSize = getOptimalFontSize(results, count);
    display.innerText = formatted;
    
    // 保存到历史记录
    addToHistory(results);
    
    // 显示提示
    showToast(`已生成 ${count} 个随机${getModeName(currentMode)}`);
}

function generateBigIntegers(count, unique) {
    const digits = parseInt(document.getElementById('digits').value) || 6;
    const min = 10n ** BigInt(digits - 1);
    const max = (10n ** BigInt(digits)) - 1n;
    
    return generateRandomBigInts(min, max, count, unique);
}

function generateRangeIntegers(count, unique) {
    const min = parseBigInt(document.getElementById('min').value) || 0n;
    const max = parseBigInt(document.getElementById('max').value) || 100n;
    
    const actualMin = min < max ? min : max;
    const actualMax = min < max ? max : min;
    
    return generateRandomBigInts(actualMin, actualMax, count, unique);
}

function generateRandomBigInts(min, max, count, unique) {
    const range = max - min + 1n;
    
    // 检查范围是否太小
    if (unique && range < BigInt(count)) {
        showToast(`警告：范围太小，无法生成 ${count} 个不重复数字，将生成 ${range} 个`);
        count = Number(range);
    }
    
    const results = [];
    const used = new Set();
    
    // 如果范围不是特别大，使用预生成所有可能值的方法
    if (!unique || range < 1000000n) {
        while (results.length < count) {
            // 生成加密安全的随机大整数
            const randomBuffer = new Uint8Array(Math.ceil(Number(range.toString(2).length) / 8));
            window.crypto.getRandomValues(randomBuffer);
            
            // 转换为BigInt
            let randomBigInt = 0n;
            for (let i = 0; i < randomBuffer.length; i++) {
                randomBigInt = (randomBigInt << 8n) | BigInt(randomBuffer[i]);
            }
            
            // 映射到范围
            const randomInRange = min + (randomBigInt % range);
            const randomStr = randomInRange.toString();
            
            if (!unique || !used.has(randomStr)) {
                results.push(randomInRange);
                used.add(randomStr);
                
                // 防止无限循环
                if (unique && used.size >= 10000 && results.length < count) {
                    showToast('警告：已达到不重复生成上限');
                    break;
                }
            }
        }
    } else {
        // 对于超大范围，使用简化的生成方法
        for (let i = 0; i < count; i++) {
            const randomBuffer = new Uint8Array(8);
            window.crypto.getRandomValues(randomBuffer);
            
            let randomBigInt = 0n;
            for (let i = 0; i < randomBuffer.length; i++) {
                randomBigInt = (randomBigInt << 8n) | BigInt(randomBuffer[i]);
            }
            
            const randomInRange = min + (randomBigInt % range);
            results.push(randomInRange);
        }
    }
    
    return results;
}

function generateDecimals(count, unique) {
    const digits = parseInt(document.getElementById('digits').value) || 6;
    const precision = parseInt(document.getElementById('precision').value) || 2;
    
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const range = max - min;
    
    let results = [];
    let used = new Set();
    
    while (results.length < count) {
        const randomVal = (Math.random() * range) + min;
        const roundedVal = parseFloat(randomVal.toFixed(precision));
        
        if (!unique || !used.has(roundedVal)) {
            results.push(roundedVal);
            used.add(roundedVal);
        }
        
        // 防止无限循环
        if (unique && used.size >= 1000 && results.length < count) {
            showToast('警告：已生成大量不重复数字，可能存在重复风险');
            break;
        }
    }
    
    return results;
}

function formatResults(results, format) {
    const separator = {
        'comma': ', ',
        'newline': '\n',
        'space': ' '
    }[format];
    
    return results.map(num => num.toString()).join(separator);
}

function getOptimalFontSize(results, count) {
    if (count === 1) {
        const strLen = results[0].toString().length;
        if (strLen > 50) return '1rem';
        if (strLen > 30) return '1.2rem';
        if (strLen > 20) return '1.4rem';
        return '1.8rem';
    } else if (count > 10) {
        return '0.9rem';
    } else if (count > 5) {
        return '1rem';
    }
    return '1.2rem';
}

function formatLargeNumbers() {
    if (currentResults.length === 0) {
        showToast("没有可格式化的内容");
        return;
    }
    
    const format = document.querySelector('input[name="format"]:checked').value;
    const formattedResults = currentResults.map(num => {
        // 对大数字进行千位分隔
        if (/^\d+$/.test(num) && num.length > 3) {
            return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        return num;
    });
    
    const display = document.getElementById('result-display');
    display.innerText = formattedResults.join({
        'comma': ', ',
        'newline': '\n',
        'space': ' '
    }[format]);
    
    showToast("已格式化数字（千位分隔）");
}

function copyResult() {
    const text = document.getElementById('result-display').innerText;
    if (text === "准备就绪") {
        showToast("没有可复制的内容");
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast("已复制到剪贴板");
    });
}

function exportResults() {
    const text = document.getElementById('result-display').innerText;
    if (text === "准备就绪") {
        showToast("没有可导出的内容");
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `random_numbers_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("已导出为文本文件");
}

function getModeName(mode) {
    const names = {
        'int': '整数',
        'dec': '小数',
        'range': '整数'
    };
    return names[mode] || '数字';
}

function addToHistory(results) {
    const timestamp = new Date().toLocaleString();
    const modeName = getModeName(currentMode);
    
    history.unshift({
        results: results.map(r => r.toString()),
        mode: modeName,
        count: results.length,
        timestamp: timestamp,
        formatted: results.map(r => r.toString()).join(', ')
    });
    
    // 只保留最近10条记录
    if (history.length > 10) {
        history = history.slice(0, 10);
    }
    
    localStorage.setItem('randomHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">暂无历史记录</div>';
        return;
    }
    
    history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        // 截断过长的结果显示
        const displayText = item.formatted.length > 30 ? 
            item.formatted.substring(0, 30) + '...' : 
            item.formatted;
            
        div.innerHTML = `
            <div style="flex: 1; overflow: hidden;">
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${item.timestamp}</div>
                <div style="margin-top: 5px; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${displayText}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 3px;">
                    ${item.mode} × ${item.count}
                </div>
            </div>
            <div class="history-actions">
                <button class="action-btn" onclick="useHistory(${index})" style="padding: 5px 8px; font-size: 0.8rem;">
                    使用
                </button>
                <button class="action-btn" onclick="deleteHistory(${index})" style="padding: 5px 8px; font-size: 0.8rem;">
                    删除
                </button>
            </div>
        `;
        historyList.appendChild(div);
    });
}

function useHistory(index) {
    if (index >= 0 && index < history.length) {
        const item = history[index];
        currentResults = item.results;
        const display = document.getElementById('result-display');
        display.innerText = item.formatted;
        display.style.fontSize = getOptimalFontSize(item.results, item.count);
        showToast(`已加载历史记录 (${item.mode} × ${item.count})`);
    }
}

function deleteHistory(index) {
    if (index >= 0 && index < history.length) {
        history.splice(index, 1);
        localStorage.setItem('randomHistory', JSON.stringify(history));
        renderHistory();
        showToast("已删除历史记录");
    }
}

function clearHistory() {
    if (confirm("确定要清空所有历史记录吗？")) {
        history = [];
        localStorage.setItem('randomHistory', JSON.stringify(history));
        renderHistory();
        showToast("已清空历史记录");
    }
}

function toggleHistory() {
    const historySection = document.getElementById('history-section');
    const btn = document.querySelector('.sec-btn');
    
    if (historySection.style.display === 'none' || historySection.style.display === '') {
        historySection.style.display = 'block';
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
            隐藏历史
        `;
    } else {
        historySection.style.display = 'none';
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            历史记录
        `;
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}