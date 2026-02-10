// Initialize icons
lucide.createIcons();

let running = false;
let pings = [];
let sent = 0;
let loss = 0;
let rid = 0;
let socket = null; // WebSocket instance
const historyKey = 'ping_history';

// --- Replace with your Fly.io deployment URL ---
// Note: Must start with wss://
const BACKEND_URL = 'wss://my-ping-proxy-2024.fly.dev';

// Initialize chart
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

// --- History logic ---

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
        list.innerHTML = `<div class="p-4 text-slate-500 text-sm italic text-center">No search history</div>`;
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
    if(confirm('Are you sure you want to clear all history?')) {
        localStorage.removeItem(historyKey);
        renderHistory();
    }
}

// --- Ping core logic (WebSocket version) ---

function togglePing() {
    const t = document.getElementById('target').value.trim();
    if(!t) return alert("Please enter an address");
    
    if(!running) {
        saveToHistory(t);
        start(t);
    } else {
        stop();
    }
}

/**
 * Modified start function
 */
function start(target) {
    running = true; 
    rid++;
    pings = []; 
    sent = 0; 
    loss = 0; 
    
    // UI reset
    chart.data.labels = []; 
    chart.data.datasets[0].data = []; 
    chart.update();
    document.getElementById('terminal').innerHTML = '';
    document.getElementById('avg').innerText = '0';
    document.getElementById('loss').innerText = '0%';
    document.getElementById('jitter').innerText = '0';
    document.getElementById('sent').innerText = '0';

    const btn = document.getElementById('btn');
    btn.innerHTML = '<i data-lucide="square"></i> Stop Test';
    btn.classList.replace('bg-blue-600', 'bg-red-600');
    lucide.createIcons();

    // Establish WebSocket connection
    socket = new WebSocket(BACKEND_URL);

    socket.onopen = () => {
        const countValue = document.getElementById('count').value;
        // If "Continuous Test" is selected, send a large number to the backend
        const finalCount = countValue === "0" ? 9999 : parseInt(countValue);
        
        // Send test command to Fly.io backend
        socket.send(JSON.stringify({
            target: target,
            count: finalCount
        }));
        log(`Connecting to remote diagnostic server and starting test: ${target}...`, true);
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'data') {
            // System raw output line
            const rawOutput = data.raw;
            
            if (data.time !== null) {
                // Successfully received latency data
                sent++;
                const ms = data.time;
                pings.push(ms);

                // Update dashboard and chart
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
                // Handle timeout or other raw information
                if (rawOutput.includes('timeout') || rawOutput.includes('timed out')) {
                    sent++;
                    loss++;
                    document.getElementById('sent').innerText = sent;
                    log(`Request timeout`, false);
                    updateStats();
                } else {
                    // Print some system header info (like PING google.com (142.251.42.238) ...)
                    log(rawOutput, true);
                }
            }
        }

        if (data.type === 'end') {
            log('Test task completed.', true);
            stop();
        }

        if (data.type === 'error') {
            log('Error: ' + data.msg, false);
            stop();
        }
    };

    socket.onclose = () => {
        if (running) {
            log('Connection closed.', false);
            stop();
        }
    };

    socket.onerror = (err) => {
        log('Unable to connect to Fly.io proxy server. Please check backend status.', false);
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
    btn.innerHTML = '<i data-lucide="play"></i> Start Test';
    btn.classList.replace('bg-red-600', 'bg-blue-600');
    lucide.createIcons();
}

function updateStats() {
    if(pings.length > 0) {
        // Average
        const sum = pings.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / pings.length);
        document.getElementById('avg').innerText = avg;
        
        // Jitter calculation (Standard Deviation)
        if(pings.length > 1) {
            const m = sum / pings.length;
            const jitter = Math.round(Math.sqrt(pings.map(v => (v - m) ** 2).reduce((a, b) => a + b) / pings.length));
            document.getElementById('jitter').innerText = jitter;
        }
    }
    // Packet loss rate
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

// Initial history render
renderHistory();