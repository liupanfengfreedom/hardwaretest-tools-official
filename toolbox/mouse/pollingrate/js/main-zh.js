// --- 状态管理 ---
let isRunning = true; // 默认开启
let lastTimestamp = 0;
let intervalHistory = [];
let hzHistory = [];
let logs = [];
let chart = null;
let avgHz = 0;
let maxHz = 0;

const MAX_DATA_POINTS = 100;
const LOG_LIMIT = 200;

// --- DOM 元素 ---
const clearBtn = document.getElementById('clearBtn');
const testArea = document.getElementById('testArea');
const logContainer = document.getElementById('log-container');
const eventCountEl = document.getElementById('eventCount');
const indicator = document.getElementById('indicator');

const currHzEl = document.getElementById('currHz');
const maxHzEl = document.getElementById('maxHz');
const avgHzEl = document.getElementById('avgHz');
const jitterEl = document.getElementById('jitter');

// --- 图表初始化 ---
function initChart() {
    const ctx = document.getElementById('pollingChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(MAX_DATA_POINTS).fill(''),
            datasets: [{
                label: '事件频率 (Hz)',
                data: Array(MAX_DATA_POINTS).fill(null),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: {
                    min: 0,
                    suggestedMax: 1200,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748b' }
                },
                x: {
                    display: false,
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

// --- 核心逻辑 ---
function handleMouseMove(e) {
    if (!isRunning) return;

    const now = performance.now();
    
    // 移动视觉指示器
    const rect = testArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    indicator.style.transform = `translate(${x - rect.width/2}px, ${y - rect.height/2}px)`;

    if (lastTimestamp > 0) {
        const interval = now - lastTimestamp;
        if (interval > 0) {
            const currentHz = Math.round(1000 / interval);
            
            // 过滤异常值
            if (currentHz > 10000) return;

            updateStats(currentHz, interval);
            addLog(currentHz, interval);
            updateChart(currentHz);
        }
    }
    lastTimestamp = now;
}

function updateStats(hz, interval) {
    hzHistory.push(hz);
    intervalHistory.push(interval);
    if (hzHistory.length > 500) hzHistory.shift();
    if (intervalHistory.length > 500) intervalHistory.shift();

    const sum = hzHistory.reduce((a, b) => a + b, 0);
    avgHz = Math.round(sum / hzHistory.length);
    
    if (hz > maxHz) maxHz = hz;

    const meanInterval = intervalHistory.reduce((a,b) => a+b, 0) / intervalHistory.length;
    const jitter = Math.sqrt(intervalHistory.map(x => Math.pow(x - meanInterval, 2)).reduce((a,b) => a+b, 0) / intervalHistory.length);

    currHzEl.innerHTML = `${hz}<small class="text-sm ml-1 text-slate-500">Hz</small>`;
    maxHzEl.innerHTML = `${maxHz}<small class="text-sm ml-1 text-slate-500">Hz</small>`;
    avgHzEl.innerHTML = `${avgHz}<small class="text-sm ml-1 text-slate-500">Hz</small>`;
    jitterEl.innerHTML = `${jitter.toFixed(2)}<small class="text-sm ml-1 text-slate-500">ms</small>`;
}

function updateChart(hz) {
    chart.data.datasets[0].data.push(hz);
    if (chart.data.datasets[0].data.length > MAX_DATA_POINTS) {
        chart.data.datasets[0].data.shift();
    }
    chart.update('none');
}

function addLog(hz, interval) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '.' + (performance.now() % 1000).toFixed(0).padStart(3, '0');
    const logEntry = { time, hz, interval: interval.toFixed(2) };
    logs.unshift(logEntry);
    if (logs.length > 5000) logs.pop();

    const div = document.createElement('div');
    div.className = 'flex justify-between border-b border-slate-800 pb-1 animate-in fade-in';
    div.innerHTML = `
        <span class="text-slate-500">${time}</span>
        <span class="font-bold text-blue-400">${hz} Hz</span>
        <span class="text-slate-400">${interval.toFixed(2)}毫秒</span>
    `;
    
    if (logContainer.children.length === 1 && logContainer.innerText.includes('等待')) {
        logContainer.innerHTML = '';
    }
    
    logContainer.prepend(div);
    if (logContainer.children.length > LOG_LIMIT) {
        logContainer.removeChild(logContainer.lastChild);
    }
    
    eventCountEl.innerText = `${logs.length} 个事件`;
}

// --- 控制功能 ---
function clearData() {
    hzHistory = [];
    intervalHistory = [];
    logs = [];
    maxHz = 0;
    lastTimestamp = 0;
    currHzEl.innerHTML = `0<small class="text-sm ml-1 text-slate-500">Hz</small>`;
    maxHzEl.innerHTML = `0<small class="text-sm ml-1 text-slate-500">Hz</small>`;
    avgHzEl.innerHTML = `0<small class="text-sm ml-1 text-slate-500">Hz</small>`;
    jitterEl.innerHTML = `0<small class="text-sm ml-1 text-slate-500">毫秒</small>`;
    logContainer.innerHTML = '<div class="text-slate-500 italic">等待数据中...</div>';
    eventCountEl.innerText = `0 个事件`;
    chart.data.datasets[0].data = Array(MAX_DATA_POINTS).fill(null);
    chart.update();
}

function downloadCSV() {
    if (logs.length === 0) return;
    let csv = "时间戳,事件频率 (Hz),间隔 (毫秒)\n";
    logs.forEach(row => {
        csv += `${row.time},${row.hz},${row.interval}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `鼠标测试_${new Date().getTime()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- 重要说明面板交互 ---
function initImportantNotePanel() {
    const toggleBtn = document.getElementById('importantNoteToggle');
    const content = document.getElementById('importantNoteContent');
    const toggleIcon = document.getElementById('toggleIcon');
    
    // 默认展开
    content.classList.remove('max-h-0');
    content.classList.add('max-h-[2000px]'); // 足够大的值来容纳所有内容
    toggleIcon.style.transform = 'rotate(180deg)';
    
    toggleBtn.addEventListener('click', () => {
        const isExpanded = content.classList.contains('max-h-0');
        
        if (isExpanded) {
            // 展开
            content.classList.remove('max-h-0');
            content.classList.add('max-h-[2000px]');
            toggleIcon.style.transform = 'rotate(180deg)';
        } else {
            // 折叠
            content.classList.remove('max-h-[2000px]');
            content.classList.add('max-h-0');
            toggleIcon.style.transform = 'rotate(0deg)';
        }
    });
}

// --- 事件监听器 ---
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    initImportantNotePanel();
    
    clearBtn.addEventListener('click', clearData);
    document.getElementById('downloadBtn').addEventListener('click', downloadCSV);
    testArea.addEventListener('mousemove', handleMouseMove);
});