lucide.createIcons();

let running = false;
let pings = [];
let sent = 0;
let loss = 0;
let socket = null; 
let httpTimer = null;
const historyKey = 'ping_history';
const BACKEND_URL = 'wss://my-ping-proxy-2024.fly.dev'; // 替换为您的代理地址

const ctx = document.getElementById('chart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: '延迟 (ms)',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 2
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { grid: { color: '#1e293b' }, beginAtZero: true },
            x: { grid: { display: false }, ticks: { display: false } }
        },
        plugins: { legend: { display: false } }
    }
});

function togglePing() {
    if(!running) {
        const target = document.getElementById('target').value.trim();
        if(!target) return alert("请输入目标地址");
        saveToHistory(target);
        start(target);
    } else {
        stop();
    }
}

function start(target) {
    running = true; sent = 0; loss = 0; pings = [];
    resetUI();
    
    const method = document.getElementById('method').value;
    const countVal = document.getElementById('count').value;
    const maxCount = countVal === "0" ? 999999 : parseInt(countVal);
    
    document.getElementById('method-indicator').innerText = method.toUpperCase();
    document.getElementById('method-indicator').className = method === 'ping' ? 'text-blue-500' : 'text-green-500';

    if (method === 'ping') {
        runPingMode(target, maxCount);
    } else {
        runHttpsMode(target, maxCount);
    }
}

// --- 模式 A: ICMP Ping (WebSocket 代理) ---
function runPingMode(target, maxCount) {
    socket = new WebSocket(BACKEND_URL);
    socket.onopen = () => {
        socket.send(JSON.stringify({ target: target, count: maxCount }));
        log(`[PING] 正在通过远程服务器拨测: ${target}...`, true);
    };
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'data') {
            if (data.time !== null) {
                handleResult(data.time, data.raw, true);
            } else if (data.raw.toLowerCase().includes('timeout')) {
                handleResult(null, `请求超时: 目标可能禁用了ICMP或不在线`, false);
            } else {
                log(data.raw, true);
            }
        }
        if (data.type === 'end') stop();
        if (data.type === 'error') { log('错误: ' + data.msg, false); stop(); }
    };
    socket.onerror = () => { log('连接代理服务器失败，请检查网络', false); stop(); };
    socket.onclose = () => { if(running) stop(); };
}

// --- 模式 B: HTTPS GET (浏览器直连 & 智能判定) ---
async function runHttpsMode(target, maxCount) {
    let url = target;
    if (!url.startsWith('http')) url = 'https://' + url;

    log(`[HTTPS] 正在通过浏览器尝试直连: ${url}`, true);
    log(`智能提示: 若耗时极短(1ms)通常为系统拦截；耗时较长即便报错也代表目标存活。`, true);

    const step = async () => {
        if (!running || sent >= maxCount) { stop(); return; }

        // Cache Busting: 防止浏览器缓存结果
        const cacheBuster = (url.includes('?') ? '&' : '?') + 't=' + performance.now();
        const testUrl = url + cacheBuster;
        const startTime = performance.now();

        try {
            await fetch(testUrl, { mode: 'no-cors', cache: 'no-cache' });
            const duration = Math.round(performance.now() - startTime);
            handleResult(duration, `来自 ${url} 的响应: 耗时=${duration}ms (已连通)`, true);
        } catch (err) {
            const duration = Math.round(performance.now() - startTime);
            if (duration < 15) {
                // 1ms - 15ms 的失败，通常是浏览器 CSP 或 插件拦截
                handleResult(null, `[系统拦截] ${url} (耗时 ${duration}ms, 浏览器拒绝发出请求)`, false);
            } else {
                // 耗时很久但进入 catch，通常是 CORS、SSL 或 连接重置，证明目标存活
                handleResult(duration, `[存活但受限] ${url} 的响应: 耗时=${duration}ms (CORS/SSL错误)`, true);
            }
        }
        if (running) httpTimer = setTimeout(step, 1000);
    };
    step();
}

// --- 通用结果处理与统计 ---
function handleResult(ms, rawText, isAlive) {
    sent++;
    document.getElementById('sent').innerText = sent;

    if (isAlive && ms !== null) {
        pings.push(ms);
        log(rawText, true);
        
        chart.data.labels.push(sent);
        chart.data.datasets[0].data.push(ms);
        if(chart.data.labels.length > 30) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.update('none');
    } else {
        loss++;
        log(rawText, false);
    }
    updateStats();
}

function updateStats() {
    if(pings.length > 0) {
        const sum = pings.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / pings.length);
        document.getElementById('avg').innerText = avg;
        
        if(pings.length > 1) {
            let diffSum = 0;
            for(let i=1; i<pings.length; i++) diffSum += Math.abs(pings[i] - pings[i-1]);
            document.getElementById('jitter').innerText = Math.round(diffSum / (pings.length - 1));
        }
    }
    document.getElementById('loss').innerText = Math.round((loss / sent) * 100) + '%';
}

function stop() {
    running = false; 
    if (socket) { socket.close(); socket = null; }
    if (httpTimer) { clearTimeout(httpTimer); httpTimer = null; }
    const btn = document.getElementById('btn');
    btn.innerHTML = '<i data-lucide="play"></i> 开始测试';
    btn.classList.replace('bg-red-600', 'bg-blue-600');
    lucide.createIcons();
}

function log(t, ok) {
    const term = document.getElementById('terminal');
    const color = ok ? 'text-green-400' : 'text-red-400';
    term.innerHTML += `<div class="${color} mb-1 border-l-2 border-slate-800 pl-2">> ${t}</div>`;
    term.scrollTop = term.scrollHeight;
}

function resetUI() {
    document.getElementById('terminal').innerHTML = '';
    document.getElementById('avg').innerText = '0';
    document.getElementById('loss').innerText = '0%';
    document.getElementById('jitter').innerText = '0';
    document.getElementById('sent').innerText = '0';
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
}

// 历史记录逻辑保持不变...
function saveToHistory(t) { /* 同前文 */ }
function renderHistory() { /* 同前文 */ }
function showHistory() { renderHistory(); document.getElementById('history-panel').classList.remove('hidden'); }
function hideHistory() { document.getElementById('history-panel').classList.add('hidden'); }
function selectHistory(v) { document.getElementById('target').value = v; hideHistory(); }