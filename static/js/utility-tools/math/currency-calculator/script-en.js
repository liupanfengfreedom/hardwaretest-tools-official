
let myChart = null;
let currentYears = 5;

async function updateAll() {
    const from = document.getElementById('ex-from').value;
    const to = document.getElementById('ex-to').value;
    const amount = parseFloat(document.getElementById('ex-amount').value) || 0;

    if (from === to) {
        document.getElementById('res-total').innerText = amount.toFixed(2);
        document.getElementById('rate-text').innerText = `1 ${from} = 1 ${to}`;
        if(myChart) myChart.destroy();
        return;
    }

    try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        const data = await res.json();
        const rate = data.rates[to];
        document.getElementById('rate-text').innerText = `1 ${from} = ${rate.toFixed(4)} ${to}`;
        document.getElementById('res-total').innerText = (amount * rate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        updateChart(from, to, currentYears);
    } catch (e) { 
        document.getElementById('rate-text').innerText = "Failed to fetch exchange rate";
    }
}

async function updateChart(from, to, years) {
    const loading = document.getElementById('loading-overlay');
    loading.style.display = 'block';

    const end = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    const start = startDate.toISOString().split('T')[0];

    try {
        const res = await fetch(`https://api.frankfurter.app/${start}..${end}?from=${from}&to=${to}`);
        const data = await res.json();
        const labels = [];
        const values = [];
        const dates = Object.keys(data.rates);

        let step = Math.max(1, Math.floor(dates.length / 50)); 

        for (let i = 0; i < dates.length; i += step) { 
            labels.push(dates[i]);
            values.push(data.rates[dates[i]][to]);
        }
        renderChart(labels, values, `${from}/${to} ${years}-Year Trend`);
    } catch (e) {
        console.error("Failed to load chart data");
    } finally {
        loading.style.display = 'none';
    }
}

function renderChart(labels, dataPoints, title) {
    const ctx = document.getElementById('historyChart').getContext('2d');
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: dataPoints,
                borderColor: '#007aff',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                backgroundColor: 'rgba(0, 122, 255, 0.05)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { maxTicksLimit: 6, font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { font: { size: 10 } }, grid: { color: '#f0f0f2' } }
            }
        }
    });
}

// Event bindings
document.querySelectorAll('select, input').forEach(el => el.addEventListener('change', updateAll));
document.getElementById('time-picker').addEventListener('click', (e) => {
    if (e.target.classList.contains('time-btn')) {
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentYears = parseInt(e.target.dataset.years);
        updateAll();
    }
});

window.onload = updateAll;