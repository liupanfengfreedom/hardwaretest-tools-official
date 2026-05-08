// script-en.js
// Initialize icons
lucide.createIcons();

let running = false;
let pings = [];
let sent = 0;
let loss = 0;
let socket = null; 
let httpTimer = null; // for HTTPS loop
const historyKey = 'ping_history';

// Proxy server address (Fly.io)
const BACKEND_URL = 'wss://my-ping-proxy-2024.fly.dev'; 

// --- Initialize chart ---
const ctx = document.getElementById('chart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Latency (ms)',
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

// --- History management ---
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
        list.innerHTML = `<div class="p-4 text-slate-500 text-sm italic text-center">No search history</div>`;
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

// --- Core control logic ---

function togglePing() {
    if(!running) {
        const target = document.getElementById('target').value.trim();
        if(!target) return alert("Please enter a target address or domain");
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
    
    // UI reset
    document.getElementById('terminal').innerHTML = '';
    document.getElementById('avg').innerText = '0';
    document.getElementById('loss').innerText = '0%';
    document.getElementById('jitter').innerText = '0';
    document.getElementById('sent').innerText = '0';
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();

    const btn = document.getElementById('btn');
    btn.innerHTML = '<i data-lucide="square"></i> Stop Test';
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

// --- Mode A: ICMP Ping (WebSocket proxy) ---
function runPingMode(target, maxCount) {
    socket = new WebSocket(BACKEND_URL);
    
    socket.onopen = () => {
        socket.send(JSON.stringify({ target: target, count: maxCount }));
        log(`[PING] Connecting to remote server to ping ${target}...`, true);
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'data') {
            if (data.time !== null) {
                handleResult(data.time, data.raw);
            } else if (data.raw.toLowerCase().includes('timeout') || data.raw.includes('timed out')) {
                handleResult(null, data.raw);
            } else {
                log(data.raw, true); // print system info lines
            }
        }
        if (data.type === 'end') stop();
        if (data.type === 'error') { log('Error: ' + data.msg, false); stop(); }
    };

    socket.onerror = () => { log('Unable to connect to Fly.io proxy server', false); stop(); };
    socket.onclose = () => { if(running) stop(); };
}

// --- Mode B: HTTPS GET (browser direct) fixed version ---
async function runHttpsMode(target, maxCount) {
    let url = target;
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    log(`[HTTPS] Attempting to access: ${url}`, true);
    log(`Note: Successful response (including CORS restrictions) counts as alive, network error as failure.`, true);

    const step = async () => {
        if (!running || sent >= maxCount) { stop(); return; }

        const cacheBuster = (url.includes('?') ? '&' : '?') + 't=' + performance.now();
        const testUrl = url + cacheBuster;
        const startTime = performance.now();

        try {
            // In no-cors mode, as long as the target server responds (even without CORS),
            // fetch will resolve, meaning the target IP is reachable.
            await fetch(testUrl, { 
                mode: 'no-cors', 
                cache: 'no-cache',
                referrerPolicy: 'no-referrer',
                signal: AbortSignal.timeout(5000) 
            });
            
            const duration = Math.round(performance.now() - startTime);
            handleResult(duration, `Response from ${target}: time=${duration}ms`);

        } catch (err) {
            const duration = Math.round(performance.now() - startTime);
            
            // Only extremely fast failures (<5ms) are considered blocked by browser/extension
            if (duration < 5) {
                log(`[Local block] ${target} request blocked by browser or extension`, false);
                handleResult(null, `Local block (${duration}ms)`);
            } else {
                log(`[Connection failed] ${target} unreachable (DNS failure/refused/timeout)`, false);
                handleResult(null, `Request failed (${duration}ms)`);
            }
        }

        if (running) {
            httpTimer = setTimeout(step, 1000);
        }
    };

    step();
}

// --- Common result handling ---
function handleResult(ms, rawText) {
    sent++;
    document.getElementById('sent').innerText = sent;

    if (ms !== null) {
        pings.push(ms);
        log(rawText, true);
        
        // Update chart
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
            // Simple jitter calculation: average of consecutive differences
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
    btn.innerHTML = '<i data-lucide="play"></i> Start Test';
    btn.classList.replace('bg-red-600', 'bg-blue-600');
    lucide.createIcons();
    log("Test stopped.", true);
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