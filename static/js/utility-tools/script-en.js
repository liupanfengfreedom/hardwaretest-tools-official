
// Initialize icons
lucide.createIcons();

let running = false;
let pings = [];
let sent = 0;
let loss = 0;
let success = 0;
let rid = 0;
const historyKey = 'ping_history';

// Initialize chart
const ctx = document.getElementById('chart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
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
            y: { grid: { color: '#1e293b' } },
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

// --- Ping core logic ---

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

function normalize(t) {
    if(!t.startsWith('http')) return 'https://' + t;
    return t;
}

function start(target) {
    running = true; 
    rid++;
    pings = []; 
    sent = 0; 
    loss = 0; 
    success = 0;
    
    chart.data.labels = []; 
    chart.data.datasets[0].data = []; 
    chart.update();
    
    document.getElementById('terminal').innerHTML = '';
    const btn = document.getElementById('btn');
    btn.innerHTML = '<i data-lucide="square"></i> Stop';
    btn.classList.replace('bg-blue-600', 'bg-red-600');
    
    lucide.createIcons();
    loop(normalize(target), parseInt(document.getElementById('count').value), rid);
}

function stop() {
    running = false; 
    rid++;
    const btn = document.getElementById('btn');
    btn.innerHTML = '<i data-lucide="play"></i> Start Test';
    btn.classList.replace('bg-red-600', 'bg-blue-600');
    lucide.createIcons();
}

async function loop(url, total, id) {
    if(!running || id !== rid) return;
    
    sent++; 
    document.getElementById('sent').innerText = sent;
    const startT = performance.now();
    
    try {
        // Use no-cors mode to attempt request and measure latency
        await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        const ms = Math.round(performance.now() - startT);
        
        success++; 
        pings.push(ms);
        
        chart.data.labels.push(sent);
        chart.data.datasets[0].data.push(ms);
        if(chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.update('none');
        
        log(`Reply from ${url} : ${ms} ms`, true);
        updateStats();
    } catch(e) {
        loss++; 
        log('Request failed / Cross-origin restriction', false); 
        updateStats();
    }
    
    if(total > 0 && sent >= total) {
        stop();
        return;
    }
    
    setTimeout(() => loop(url, total, id), 1000);
}

function updateStats() {
    if(pings.length) {
        const avg = Math.round(pings.reduce((a,b) => a+b) / pings.length);
        document.getElementById('avg').innerText = avg;
        
        if(pings.length > 1) {
            const m = pings.reduce((a,b) => a+b) / pings.length;
            const jitter = Math.round(Math.sqrt(pings.map(v => (v-m)**2).reduce((a,b) => a+b) / pings.length));
            document.getElementById('jitter').innerText = jitter;
        }
    }
    document.getElementById('loss').innerText = Math.round((loss / sent) * 100) + '%';
}

function log(t, ok) {
    const term = document.getElementById('terminal');
    term.innerHTML += `<div class="${ok ? 'success-line' : 'error-line'}">${t}</div>`;
    term.scrollTop = term.scrollHeight;
}

// Initial history render
renderHistory();