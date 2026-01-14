// --- State Management ---
let isRunning = true; // Enabled by default
let lastTimestamp = 0;
let intervalHistory = [];
let hzHistory = [];
let logs = [];
let chart = null;
let avgHz = 0;
let maxHz = 0;

const MAX_DATA_POINTS = 100;
const LOG_LIMIT = 200;

// --- DOM Elements ---
const clearBtn = document.getElementById('clearBtn');
const testArea = document.getElementById('testArea');
const logContainer = document.getElementById('log-container');
const eventCountEl = document.getElementById('eventCount');
const indicator = document.getElementById('indicator');

const currHzEl = document.getElementById('currHz');
const maxHzEl = document.getElementById('maxHz');
const avgHzEl = document.getElementById('avgHz');
const jitterEl = document.getElementById('jitter');

// --- Performance optimization variables ---
let rafId = null;
let perfObserver = null;

// --- Chart initialization ---
function initChart() {
    const ctx = document.getElementById('pollingChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(MAX_DATA_POINTS).fill(''),
            datasets: [{
                label: 'Event Frequency (Hz)',
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

// --- Core Logic ---
function handleMouseMove(e) {
    if (!isRunning) return;

    const now = performance.now();
    
    // Move visual indicator
    const rect = testArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    indicator.style.transform = `translate(${x - rect.width/2}px, ${y - rect.height/2}px)`;

    if (lastTimestamp > 0) {
        const interval = now - lastTimestamp;
        if (interval > 0) {
            const currentHz = Math.round(1000 / interval);
            
            // Filter outliers
            if (currentHz > 10000) return;

            updateStats(currentHz, interval);
            addLog(currentHz, interval);
            updateChart(currentHz);
        }
    }
    lastTimestamp = now;
}

// Optimize performance with requestAnimationFrame
function optimizedMouseMove(e) {
    if (!isRunning) return;
    
    if (rafId) {
        cancelAnimationFrame(rafId);
    }
    
    rafId = requestAnimationFrame(() => {
        handleMouseMove(e);
    });
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
    const time = new Date().toLocaleTimeString('en-US', { hour12: false }) + '.' + (performance.now() % 1000).toFixed(0).padStart(3, '0');
    const logEntry = { time, hz, interval: interval.toFixed(2) };
    logs.unshift(logEntry);
    if (logs.length > 5000) logs.pop();

    const div = document.createElement('div');
    div.className = 'flex justify-between border-b border-slate-800 pb-1 animate-in fade-in';
    div.innerHTML = `
        <span class="text-slate-500">${time}</span>
        <span class="font-bold text-blue-400">${hz} Hz</span>
        <span class="text-slate-400">${interval.toFixed(2)} ms</span>
    `;
    
    if (logContainer.children.length === 1 && logContainer.innerText.includes('Waiting')) {
        logContainer.innerHTML = '';
    }
    
    logContainer.prepend(div);
    if (logContainer.children.length > LOG_LIMIT) {
        logContainer.removeChild(logContainer.lastChild);
    }
    
    eventCountEl.innerText = `${logs.length} events`;
}

// --- Control Functions ---
function clearData() {
    hzHistory = [];
    intervalHistory = [];
    logs = [];
    maxHz = 0;
    lastTimestamp = 0;
    currHzEl.innerHTML = `0<small class="text-sm ml-1 text-slate-500">Hz</small>`;
    maxHzEl.innerHTML = `0<small class="text-sm ml-1 text-slate-500">Hz</small>`;
    avgHzEl.innerHTML = `0<small class="text-sm ml-1 text-slate-500">Hz</small>`;
    jitterEl.innerHTML = `0<small class="text-sm ml-1 text-slate-500">ms</small>`;
    logContainer.innerHTML = '<div class="text-slate-500 italic">Waiting for data...</div>';
    eventCountEl.innerText = `0 events`;
    chart.data.datasets[0].data = Array(MAX_DATA_POINTS).fill(null);
    chart.update();
    
    // Send analytics event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'data_cleared', {
            'event_category': 'interaction',
            'event_label': 'Clear test data'
        });
    }
}

function downloadCSV() {
    if (logs.length === 0) {
        alert('No data to export. Please perform testing first.');
        return;
    }
    
    const date = new Date();
    const fileName = `Mouse_Event_Frequency_Test_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours()}${date.getMinutes()}.csv`;
    
    let csv = "Timestamp,Event Frequency (Hz),Interval (ms)\n";
    logs.forEach(row => {
        csv += `${row.time},${row.hz},${row.interval}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', fileName);
    a.setAttribute('aria-label', `Download test data file: ${fileName}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Send download complete event (for analytics)
    if (typeof gtag !== 'undefined') {
        gtag('event', 'csv_download', {
            'event_category': 'engagement',
            'event_label': 'Mouse test data download',
            'value': logs.length
        });
    }
}

// --- Performance Monitoring ---
function initPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
        try {
            perfObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name === 'mouse-event-processing') {
                        console.log('Mouse event processing time:', entry.duration.toFixed(2), 'ms');
                    }
                }
            });
            
            perfObserver.observe({ entryTypes: ['measure'] });
        } catch (e) {
            console.log('PerformanceObserver initialization failed:', e);
        }
    }
}

// --- Page Visibility API Support ---
function initVisibilityAPI() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page hidden, pausing data collection');
            // Can pause data collection here to save resources
        } else {
            console.log('Page visible, resuming data collection');
            // Resume data collection
        }
    });
}

// --- Initialization ---
function init() {
    initChart();
    initPerformanceMonitoring();
    initVisibilityAPI();
    
    // Add event listeners
    clearBtn.addEventListener('click', clearData);
    document.getElementById('downloadBtn').addEventListener('click', downloadCSV);
    testArea.addEventListener('mousemove', optimizedMouseMove);
    
    // Set initial loading state
    testArea.classList.add('loading');
    
    // Initial log after page load
    const startTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const initialLog = document.createElement('div');
    initialLog.className = 'text-green-500 italic border-b border-slate-800 pb-1';
    initialLog.textContent = `Testing tool ready (${startTime}) - Start moving mouse to test`;
    logContainer.prepend(initialLog);
    
    // Remove loading state
    setTimeout(() => {
        testArea.classList.remove('loading');
    }, 500);
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', init);

// --- Cleanup before page unload ---
window.addEventListener('beforeunload', () => {
    if (rafId) {
        cancelAnimationFrame(rafId);
    }
    
    if (perfObserver) {
        perfObserver.disconnect();
    }
});

// --- Page focus events ---
window.addEventListener('focus', () => {
    console.log('Page gained focus, testing can begin');
});

window.addEventListener('blur', () => {
    console.log('Page lost focus, testing may be inaccurate');
});