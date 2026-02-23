(function() {
    const lastKeyDisplay = document.getElementById('last-key');
    const keyCodeDisplay = document.getElementById('key-code');
    const resetButton = document.getElementById('reset-btn');
    const infoKey = document.getElementById('info-key');
    const infoCode = document.getElementById('info-code');
    const infoWhich = document.getElementById('info-which');
    const concurrentInfo = document.getElementById('concurrent-info');
    const logEntries = document.getElementById('log-entries');
    const clearLogBtn = document.getElementById('clear-log');

    const activeKeys = new Set();
    let maxConcurrent = 0;
    const downCounts = {};
    const upCounts = {};
    const lastDownTime = {};

    const allKeyElements = document.querySelectorAll('.key');
    allKeyElements.forEach(key => {
        const downSpan = document.createElement('span');
        downSpan.className = 'down-count';
        downSpan.textContent = '↓0';
        const upSpan = document.createElement('span');
        upSpan.className = 'up-count';
        upSpan.textContent = '↑0';
        key.appendChild(downSpan);
        key.appendChild(upSpan);

        if (key.id) {
            downCounts[key.id] = 0;
            upCounts[key.id] = 0;
        }
    });

    function updateDownCounter(keyElement, code) {
        const downSpan = keyElement.querySelector('.down-count');
        if (downSpan && code) {
            downSpan.textContent = '↓' + (downCounts[code] || 0);
        }
    }
    function updateUpCounter(keyElement, code) {
        const upSpan = keyElement.querySelector('.up-count');
        if (upSpan && code) {
            upSpan.textContent = '↑' + (upCounts[code] || 0);
        }
    }

    function refreshAllCounters() {
        allKeyElements.forEach(key => {
            if (!key.id) return;
            updateDownCounter(key, key.id);
            updateUpCounter(key, key.id);
        });
    }

    function updateConcurrent() {
        const current = activeKeys.size;
        if (current > maxConcurrent) maxConcurrent = current;
        concurrentInfo.innerText = `当前:${current} 最大:${maxConcurrent}`;
    }

    function addLog(message, isWarning = false) {
        const entry = document.createElement('div');
        entry.className = 'log-entry' + (isWarning ? ' warning' : '');
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
        entry.innerHTML = `<span class="timestamp">${timeStr}</span> ${message}`;
        logEntries.prepend(entry);
        if (logEntries.children > 40) {
            logEntries.removeChild(logEntries.lastElementChild);
        }
    }

    clearLogBtn.addEventListener('click', () => {
        logEntries.innerHTML = '<div class="log-entry"><span class="timestamp">⏱️</span> 日志已清空</div>';
    });

    document.addEventListener('keydown', (e) => {
        e.preventDefault();

        const code = e.code;
        const keyElement = document.getElementById(code);
        if (!keyElement) return;

        keyElement.classList.add('active');
        keyElement.classList.add('tested');

        lastKeyDisplay.innerText = e.key === ' ' ? 'Space' : e.key;
        keyCodeDisplay.innerText = code;
        infoKey.innerText = e.key === ' ' ? 'Space' : e.key;
        infoCode.innerText = code;
        infoWhich.innerText = e.keyCode;

        if (!activeKeys.has(code)) {
            activeKeys.add(code);
            updateConcurrent();
        }

        if (!e.repeat) {
            const now = performance.now();
            const last = lastDownTime[code] || 0;
            const interval = now - last;
            if (last !== 0 && interval < 80) {
                addLog(`⚠️ 连点风险 ${code} 间隔 ${interval.toFixed(1)}ms (<80ms)`, true);
            }
            lastDownTime[code] = now;

            downCounts[code] = (downCounts[code] || 0) + 1;
            updateDownCounter(keyElement, code);
            addLog(`↓ ${code} 按下 (首次)`);
        }
    });

    document.addEventListener('keyup', (e) => {
        e.preventDefault();
        const code = e.code;
        const keyElement = document.getElementById(code);
        if (!keyElement) return;

        keyElement.classList.remove('active');

        lastKeyDisplay.innerText = e.key === ' ' ? 'Space' : e.key;
        keyCodeDisplay.innerText = code;
        infoKey.innerText = e.key === ' ' ? 'Space' : e.key;
        infoCode.innerText = code;
        infoWhich.innerText = e.keyCode;

        if (activeKeys.has(code)) {
            activeKeys.delete(code);
            updateConcurrent();
        }

        upCounts[code] = (upCounts[code] || 0) + 1;
        updateUpCounter(keyElement, code);
        addLog(`↑ ${code} 松开`);
    });

    resetButton.addEventListener('click', () => {
        allKeyElements.forEach(key => {
            key.classList.remove('tested', 'active');
        });
        for (let code in downCounts) {
            downCounts[code] = 0;
            upCounts[code] = 0;
        }
        refreshAllCounters();

        activeKeys.clear();
        maxConcurrent = 0;
        updateConcurrent();

        lastKeyDisplay.innerText = '-';
        keyCodeDisplay.innerText = '-';
        infoKey.innerText = '—';
        infoCode.innerText = '—';
        infoWhich.innerText = '—';

        logEntries.innerHTML = '<div class="log-entry"><span class="timestamp">⏱️</span> 测试已重置</div>';
        addLog('🔄 计数器归零，重新测试');
    });

    window.addEventListener('blur', () => {
        allKeyElements.forEach(key => key.classList.remove('active'));
        activeKeys.clear();
        updateConcurrent();
    });

    updateConcurrent();
    addLog('✅ 就绪 (连点检测仅基于独立按键，长按无日志)');
})();