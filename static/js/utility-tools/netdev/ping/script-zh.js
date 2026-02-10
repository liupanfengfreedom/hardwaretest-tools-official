// 初始化图标
lucide.createIcons();

let running = false;
let pings = [];
let sent = 0;
let loss = 0;
let rid = 0;
let socket = null; // WebSocket 实例
const historyKey = 'ping_history';

// --- 替换为你在 Fly.io 部署成功的地址 ---
// 注意：必须以 wss:// 开头
const BACKEND_URL = 'wss://my-ping-proxy-2024.fly.dev'; 

// 初始化图表
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
            tension: 0.3
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { 
                grid: { color: '#1e293b' },
                beginAtZero: true
            },
            x: { grid: { display: false } }
        },
        plugins: {
            legend: { display: false }
        }
    }
});

// --- 历史记录逻辑 ---

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
    renderHistory();
}

function removeHistoryItem(event, item) {
    event.stopPropagation();
    let h = getHistory();
    h = h.filter(i => i !== item);
    localStorage.setItem(historyKey, JSON.stringify(h));
    renderHistory();
    document.getElementById('target').focus();
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
            <div class="flex items-center gap-3 overflow-hidden">
                <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-500 flex-shrink-0"></i>
                <span class="mono text-sm truncate text-slate-300 group-hover:text-blue-400 transition-colors">${item}</span>
            </div>
            <button onclick="removeHistoryItem(event, '${item}')" 
                    class="p-1 hover:bg-slate-700 rounded-md text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('');
    
    lucide.createIcons();
}

function showHistory() {
    renderHistory();
    document.getElementById('history-panel').classList.remove('hidden');
}

function hideHistory() {
    document.getElementById('history-panel').classList.add('hidden');
}

function selectHistory(val) {
    document.getElementById('target').value = val;
    hideHistory();
}

function clearHistory() {
    if(confirm('确定要清空所有历史记录吗？')) {
        localStorage.removeItem(historyKey);
        renderHistory();
    }
}

// --- Ping 核心逻辑 (WebSocket 版) ---

function togglePing() {
    const t = document.getElementById('target').value.trim();
    if(!t) return alert("请输入地址");
    
    if(!running) {
        saveToHistory(t);
        start(t);
    } else {
        stop();
    }
}

/**
 * 修改后的 start 函数
 */
function start(target) {
    running = true; 
    rid++;
    pings = []; 
    sent = 0; 
    loss = 0; 
    
    // UI 重置
    chart.data.labels = []; 
    chart.data.datasets[0].data = []; 
    chart.update();
    document.getElementById('terminal').innerHTML = '';
    document.getElementById('avg').innerText = '0';
    document.getElementById('loss').innerText = '0%';
    document.getElementById('jitter').innerText = '0';
    document.getElementById('sent').innerText = '0';

    const btn = document.getElementById('btn');
    btn.innerHTML = '<i data-lucide="square"></i> 停止测试';
    btn.classList.replace('bg-blue-600', 'bg-red-600');
    lucide.createIcons();

    // 建立 WebSocket 连接
    socket = new WebSocket(BACKEND_URL);

    socket.onopen = () => {
        const countValue = document.getElementById('count').value;
        // 如果选择“持续测试”，传一个很大的数字给后端
        const finalCount = countValue === "0" ? 9999 : parseInt(countValue);
        
        // 发送测试指令给 Fly.io 后端
        socket.send(JSON.stringify({
            target: target,
            count: finalCount
        }));
        log(`正在连接远程诊断服务器并开始测试: ${target}...`, true);
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'data') {
            // 系统原始输出行
            const rawOutput = data.raw;
            
            if (data.time !== null) {
                // 成功获得延迟数据
                sent++;
                const ms = data.time;
                pings.push(ms);

                // 更新仪表盘和图表
                document.getElementById('sent').innerText = sent;
                chart.data.labels.push(sent);
                chart.data.datasets[0].data.push(ms);
                if(chart.data.labels.length > 20) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }
                chart.update('none');

                log(rawOutput, true);
                updateStats();
            } else {
                // 处理超时或其他原始信息
                if (rawOutput.includes('timeout') || rawOutput.includes('超时')) {
                    sent++;
                    loss++;
                    document.getElementById('sent').innerText = sent;
                    log(`请求超时 (Request Timeout)`, false);
                    updateStats();
                } else {
                    // 打印一些系统头部信息（如 PING google.com (142.251.42.238) ...）
                    log(rawOutput, true);
                }
            }
        }

        if (data.type === 'end') {
            log('测试任务已完成。', true);
            stop();
        }

        if (data.type === 'error') {
            log('错误: ' + data.msg, false);
            stop();
        }
    };

    socket.onclose = () => {
        if (running) {
            log('连接已断开。', false);
            stop();
        }
    };

    socket.onerror = (err) => {
        log('无法连接到 Fly.io 代理服务器，请检查后端状态。', false);
        stop();
    };
}

function stop() {
    running = false; 
    if (socket) {
        socket.close();
        socket = null;
    }
    const btn = document.getElementById('btn');
    btn.innerHTML = '<i data-lucide="play"></i> 开始测试';
    btn.classList.replace('bg-red-600', 'bg-blue-600');
    lucide.createIcons();
}

function updateStats() {
    if(pings.length > 0) {
        // 平均值
        const sum = pings.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / pings.length);
        document.getElementById('avg').innerText = avg;
        
        // 抖动计算 (Standard Deviation)
        if(pings.length > 1) {
            const m = sum / pings.length;
            const jitter = Math.round(Math.sqrt(pings.map(v => (v - m) ** 2).reduce((a, b) => a + b) / pings.length));
            document.getElementById('jitter').innerText = jitter;
        }
    }
    // 丢包率
    if (sent > 0) {
        document.getElementById('loss').innerText = Math.round((loss / sent) * 100) + '%';
    }
}

function log(t, ok) {
    const term = document.getElementById('terminal');
    const colorClass = ok ? 'text-green-400' : 'text-red-400';
    term.innerHTML += `<div class="${colorClass} mb-1 border-l-2 border-slate-800 pl-2">> ${t}</div>`;
    term.scrollTop = term.scrollHeight;
}

// 初始渲染历史记录
renderHistory();