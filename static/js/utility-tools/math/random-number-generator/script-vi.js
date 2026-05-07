let currentMode = 'int';
let history = JSON.parse(localStorage.getItem('randomHistory') || '[]');
let seedGenerator = null;
let currentResults = [];

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    renderHistory();
    document.getElementById('digits').addEventListener('input', updateMaxCount);
    document.getElementById('min').addEventListener('input', updateMaxCount);
    document.getElementById('max').addEventListener('input', updateMaxCount);
    updateMaxCount();
    generate(); // Generate once by default
});

function setMode(mode, btn) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Show/hide related options
    document.getElementById('digits-mode').style.display = (mode === 'int' || mode === 'dec') ? 'flex' : 'none';
    document.getElementById('range-mode').style.display = (mode === 'range') ? 'flex' : 'none';
    document.getElementById('decimal-options').style.display = (mode === 'dec') ? 'flex' : 'none';
    
    // Update max count calculation
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
            
            // If range too large, limit to 1000
            if (maxPossible > 10000) {
                maxPossible = 10000;
            }
        } else {
            const digits = parseInt(document.getElementById('digits').value) || 6;
            // For very large digits, limit maximum generation count
            maxPossible = Math.min(10000, Math.pow(10, Math.min(digits, 4)));
        }
        
        if (maxPossible < 10000) {
            countInput.max = maxPossible;
            countInput.title = `Số ${maxPossible} tối đa có thể được tạo ở chế độ duy nhất`;
        } else {
            countInput.max = 10000;
            countInput.title = 'Có thể tạo tối đa 10000 số ở chế độ duy nhất';
        }
    } else {
        countInput.max = 10000;
        countInput.title = 'Có thể tạo tối đa 10000 số';
    }
}

function toggleMaxCount() {
    updateMaxCount();
}

function parseBigInt(value) {
    try {
        value = value.trim();
        if (!value) return 0n;
        
        // Remove separators like commas
        value = value.replace(/,/g, '');
        
        // Check if valid number
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
    
    // Clear warning area
    const warningArea = document.getElementById('warning-area');
    warningArea.innerHTML = '';
    
    // Validate input
    if (currentMode === 'int' || currentMode === 'dec') {
        const digits = parseInt(document.getElementById('digits').value) || 6;
        if (digits > 50) {
            warningArea.innerHTML = `\r\n                <div class="warning">\r\n                    <strong>Lưu ý:</strong> Bạn đang tạo các số nguyên rất lớn trên 50 chữ số. Hiển thị và tính toán có thể mất nhiều thời gian hơn.\r\n                </div>\r\n            `;
        }
    }
    
    // Generate numbers based on mode
    let results = [];
    if (currentMode === 'int') {
        results = generateBigIntegers(count, unique);
    } else if (currentMode === 'dec') {
        results = generateDecimals(count, unique);
    } else if (currentMode === 'range') {
        results = generateRangeIntegers(count, unique);
    }
    
    // Save current results
    currentResults = results.map(r => r.toString());
    
    // Format results
    const formatted = formatResults(currentResults, format);
    
    // Display results
    const display = document.getElementById('result-display');
    display.style.fontSize = getOptimalFontSize(results, count);
    display.innerText = formatted;
    
    // Save to history
    addToHistory(results);
    
    // Show toast
    showToast(`Generated ${count} random ${getModeName(currentMode)}${count > 1 ? 's' : ''}`);
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
    
    // Check if range too small
    if (unique && range < BigInt(count)) {
        showToast(`Warning: Range too small, cannot generate ${count} unique numbers, will generate ${range} instead`);
        count = Number(range);
    }
    
    const results = [];
    const used = new Set();
    
    // If range not extremely large, use pre-generation method
    if (!unique || range < 1000000n) {
        while (results.length < count) {
            // Generate cryptographically secure random big integer
            const randomBuffer = new Uint8Array(Math.ceil(Number(range.toString(2).length) / 8));
            window.crypto.getRandomValues(randomBuffer);
            
            // Convert to BigInt
            let randomBigInt = 0n;
            for (let i = 0; i < randomBuffer.length; i++) {
                randomBigInt = (randomBigInt << 8n) | BigInt(randomBuffer[i]);
            }
            
            // Map to range
            const randomInRange = min + (randomBigInt % range);
            const randomStr = randomInRange.toString();
            
            if (!unique || !used.has(randomStr)) {
                results.push(randomInRange);
                used.add(randomStr);
                
                // Prevent infinite loop
                if (unique && used.size >= 10000 && results.length < count) {
                    showToast('Warning: Reached unique generation limit');
                    break;
                }
            }
        }
    } else {
        // For extremely large ranges, use simplified generation method
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
        
        // Prevent infinite loop
        if (unique && used.size >= 1000 && results.length < count) {
            showToast('Warning: Generated many unique numbers, may have duplicate risk');
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
        showToast("No content to format");
        return;
    }
    
    const format = document.querySelector('input[name="format"]:checked').value;
    const formattedResults = currentResults.map(num => {
        // Add thousand separators to large numbers
        if (/^\d+$/.test(num) && num.length > 3) {
            return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        return num;
    });
    
    const display = document.getElementById('result-display');
    display.innerText = formattedResults.join({
        'comma': ', ',
        'newline': '\\N',
        'space': ' '
    }[format]);
    
    showToast("Numbers formatted (thousand separators)");
}

function copyResult() {
    const text = document.getElementById('result-display').innerText;
    if (text === "Ready") {
        showToast("No content to copy");
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied to clipboard");
    });
}

function exportResults() {
    const text = document.getElementById('result-display').innerText;
    if (text === "Ready") {
        showToast("No content to export");
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
    
    showToast("Exported as text file");
}

function getModeName(mode) {
    const names = {
        'int': 'integer',
        'dec': 'decimal',
        'range': 'integer'
    };
    return names[mode] || 'number';
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
    
    // Keep only recent 10 records
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
        historyList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Chưa có hồ sơ lịch sử</div>';
        return;
    }
    
    history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        // Truncate too long results
        const displayText = item.formatted.length > 30 ? 
            item.formatted.substring(0, 30) + '...' : 
            item.formatted;
            
        div.innerHTML = `\r\n            <div style="flex: 1; overflow: hidden;">\r\n                <div style="font-size: 0.8rem; color: var(--text-secondary);">${item.timestamp}</div>\r\n                <div style="margin-top: 5px; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\r\n                    ${displayText}\r\n                </div>\r\n                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 3px;">\r\n                    ${item.mode} × ${item.count}\r\n                </div>\r\n            </div>\r\n            <div class="history-actions">\r\n                <button class="action-btn" onclick="useHistory(${index})" style="padding: 5px 8px; font-size: 0.8rem;">\r\n                    sử dụng\r\n                </button>\r\n                <button class="action-btn" onclick="deleteHistory(${index})" style="padding: 5px 8px; font-size: 0.8rem;">\r\n                    Xóa\r\n                </button>\r\n            </div>\r\n        `;
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
        showToast(`Loaded history record (${item.mode} × ${item.count})`);
    }
}

function deleteHistory(index) {
    if (index >= 0 && index < history.length) {
        history.splice(index, 1);
        localStorage.setItem('randomHistory', JSON.stringify(history));
        renderHistory();
        showToast("History record deleted");
    }
}

function clearHistory() {
    if (confirm("Bạn có chắc chắn muốn xóa tất cả hồ sơ lịch sử không?")) {
        history = [];
        localStorage.setItem('randomHistory', JSON.stringify(history));
        renderHistory();
        showToast("History cleared");
    }
}

function toggleHistory() {
    const historySection = document.getElementById('history-section');
    const btn = document.querySelector('.sec-btn');
    
    if (historySection.style.display === 'none' || historySection.style.display === '') {
        historySection.style.display = 'block';
        btn.innerHTML = `\r\n            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>\r\n            Ẩn lịch sử\r\n        `;
    } else {
        historySection.style.display = 'none';
        btn.innerHTML = `\r\n            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>\r\n            Lịch sử\r\n        `;
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