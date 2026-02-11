// 初始化图标
lucide.createIcons();

let running = false;
let pings = [];
let sent = 0;
let loss = 0;
let socket = null; 
let httpTimer = null; // 用于 HTTPS 循环
const historyKey = 'ping_history';

// 代理服务器地址 (Fly.io)
const BACKEND_URL = 'wss://my-ping-proxy-2024.fly.dev'; 

// --- 初始化图表 ---
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

// --- 历史记录管理 ---
function getHistory() {
    const h = localStorage.getItem(historyKey);
    return h ? JSON.parse(h) : [];
}

function saveToHistory(target) {
    let h = getHistory();
    h = h.filter(item => item !== target);
    h.unshift(target);
    h = h.slice(0, 10);
    localStorage.setItem(historyKey, JSON.stringify(h));
}

function renderHistory() {
    const h = getHistory();
    const list = document.getElementById('history-list');
    if (h.length === 0) {
        list.innerHTML = `<div class="p-4 text-slate-500 text-sm italic text-center">暂无搜索历史</div>`;
        return;
    }
    list.innerHTML = h.map(item => `
        <div class="group flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 cursor-pointer border-b border-slate-800/50 last:border-0" 
             onclick="selectHistory('${item}')">
            <span class="mono text-sm truncate text-slate-300 group-hover:text-blue-400">${item}</span>
            <i data-lucide="corner-down-left" class="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100"></i>
        </div>
    `).join('');
    lucide.createIcons();
}

function showHistory() { renderHistory(); document.getElementById('history-panel').classList.remove('hidden'); }
function hideHistory() { document.getElementById('history-panel').classList.add('hidden'); }
function selectHistory(val) { document.getElementById('target').value = val; hideHistory(); }
function clearHistory() { localStorage.removeItem(historyKey); renderHistory(); }

// --- 核心控制逻辑 ---

function togglePing() {
    if(!running) {
        const target = document.getElementById('target').value.trim();
        if(!target) return alert("请输入目标地址或域名");
        saveToHistory(target);
        start(target);
    } else {
        stop();
    }
}

function start(target) {
    running = true; 
    sent = 0; 
    loss = 0; 
    pings = [];
    
    // UI 重置
    document.getElementById('terminal').innerHTML = '';
    document.getElementById('avg').innerText = '0';
    document.getElementById('loss').innerText = '0%';
    document.getElementById('jitter').innerText = '0';
    document.getElementById('sent').innerText = '0';
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();

    const btn = document.getElementById('btn');
    btn.innerHTML = '<i data-lucide="square"></i> 停止测试';
    btn.classList.replace('bg-blue-600', 'bg-red-600');
    
    const method = document.getElementById('method').value;
    const countVal = document.getElementById('count').value;
    const maxCount = countVal === "0" ? 999999 : parseInt(countVal);
    
    document.getElementById('method-indicator').innerText = method.toUpperCase();
    lucide.createIcons();

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
        log(`[PING] 正在连接远程服务器对 ${target} 进行诊断...`, true);
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'data') {
            if (data.time !== null) {
                handleResult(data.time, data.raw);
            } else if (data.raw.toLowerCase().includes('timeout') || data.raw.includes('超时')) {
                handleResult(null, data.raw);
            } else {
                log(data.raw, true); // 打印系统信息行
            }
        }
        if (data.type === 'end') stop();
        if (data.type === 'error') { log('错误: ' + data.msg, false); stop(); }
    };

    socket.onerror = () => { log('无法连接到 Fly.io 代理服务器', false); stop(); };
    socket.onclose = () => { if(running) stop(); };
}

// --- 模式 B: HTTPS GET (浏览器直连) ---
// --- 模式 B: HTTPS GET (浏览器直连) ---
async function runHttpsMode(target, maxCount) {
    let url = target;
    // 1. 自动补全协议
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    log(`[HTTPS] 正在通过浏览器尝试访问: ${url}`, true);
    log(`原理: 即使目标网站有 CORS 限制, 只要它响应了请求, 我们就能测量出往返时间。`, true);

    const step = async () => {
        if (!running || sent >= maxCount) { stop(); return; }

        // 2. 增加随机参数防止浏览器/CDN 缓存 (Cache Busting)
        // 这样可以确保每一次请求都是真实的网路往返
        const cacheBuster = (url.includes('?') ? '&' : '?') + 't=' + performance.now();
        const testUrl = url + cacheBuster;

        const startTime = performance.now();
        try {
            // mode: 'no-cors' 是关键。
            // 它会让浏览器忽略 CORS 策略错误，只要服务器给了响应，fetch 就会“成功完成”。
            await fetch(testUrl, { 
                mode: 'no-cors', 
                cache: 'no-cache',
                referrerPolicy: 'no-referrer'
            });
            
            const duration = Math.round(performance.now() - startTime);
            handleResult(duration, `来自 ${url} 的响应: HTTPS_GET 耗时=${duration}ms`);
        } catch (err) {
          const duration = Math.round(performance.now() - startTime);
            
            if (duration < 5) {
                // 情况 1: 极速失败 (1ms - 10ms) -> 浏览器拦截
                handleResult(null, `[系统拦截] ${url} (耗时 ${duration}ms, 请检查CSP政策或插件)`, false);
            } else {
                // 情况 2: 慢速失败 (如你图中的 900ms) -> 目标其实是通的！
                // 即使报错，我们也把这个时间算作有效的 RTT
                handleResult(duration, `[存活但受限] ${url} 的响应: 耗时=${duration}ms`, true);
            }
        }

        if (running) {
            // 设置 1 秒间隔进行下一次测试
            httpTimer = setTimeout(step, 1000);
        }
    };

    step();
}

// --- 通用结果处理 ---
function handleResult(ms, rawText) {
    sent++;
    document.getElementById('sent').innerText = sent;

    if (ms !== null) {
        pings.push(ms);
        log(rawText, true);
        
        // 更新图表
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
            // 简单抖动计算: 连续样本差值的平均
            let diffSum = 0;
            for(let i=1; i<pings.length; i++) diffSum += Math.abs(pings[i] - pings[i-1]);
            const jitter = Math.round(diffSum / (pings.length - 1));
            document.getElementById('jitter').innerText = jitter;
        }
    }
    if (sent > 0) {
        document.getElementById('loss').innerText = Math.round((loss / sent) * 100) + '%';
    }
}

function stop() {
    running = false; 
    if (socket) { socket.close(); socket = null; }
    if (httpTimer) { clearTimeout(httpTimer); httpTimer = null; }

    const btn = document.getElementById('btn');
    btn.innerHTML = '<i data-lucide="play"></i> 开始测试';
    btn.classList.replace('bg-red-600', 'bg-blue-600');
    lucide.createIcons();
    log("测试已停止。", true);
}

function log(t, ok) {
    const term = document.getElementById('terminal');
    const color = ok ? 'text-green-400' : 'text-red-400';
    const div = document.createElement('div');
    div.className = `${color} mb-1 border-l-2 border-slate-800 pl-2 text-[12px]`;
    div.innerText = `> ${t}`;
    term.appendChild(div);
    term.scrollTop = term.scrollHeight;
}