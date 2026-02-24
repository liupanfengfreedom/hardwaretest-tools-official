let myChart = null;

/**
 * Update the tips card and rate tag based on selected method (compound/simple)
 * @param {string} method - 'compound' or 'simple'
 * @param {number} rate - current annual rate
 */
function updateTips(method, rate) {
    const tipsCard = document.getElementById('tipsCard');
    const rateTag = document.getElementById('rateTag');
    
    if (method === 'compound') {
        rateTag.innerText = "Current typical";
        rateTag.className = "text-[11px] px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium shadow-sm";
        tipsCard.innerHTML = `
            <div class="flex items-center gap-3 mb-4">
                <span class="w-2 h-2 bg-indigo-400 rounded-full"></span>
                <span class="font-bold text-indigo-300 text-sm tracking-wider">💡 Daily Compound Logic</span>
            </div>
            <p class="text-sm leading-relaxed text-slate-300">
                Although <b class="text-white">current accounts</b> offer a lower nominal rate (typically 0.2% – 0.35%), they often apply <b class="text-white">daily compounding</b>: each day's small interest is added to the principal, earning interest thereafter – "interest on interest".
            </p>
            <div class="mt-5 pt-4 border-t border-white/20 text-xs text-slate-400 flex justify-between">
                <span>Daily interest formula</span>
                <span class="font-mono text-indigo-300">Daily interest = balance × (${rate}% / 360)</span>
            </div>
        `;
    } else {
        rateTag.innerText = "Fixed typical";
        rateTag.className = "text-[11px] px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium shadow-sm";
        tipsCard.innerHTML = `
            <div class="flex items-center gap-3 mb-4">
                <span class="w-2 h-2 bg-emerald-400 rounded-full"></span>
                <span class="font-bold text-emerald-300 text-sm tracking-wider">💎 Fixed Deposit Simple Interest</span>
            </div>
            <p class="text-sm leading-relaxed text-slate-300">
                <b class="text-white">Fixed deposits</b> offer higher rates (e.g., 2.75%), but banks typically use <b class="text-white">simple interest</b>. Interest does not compound; it grows linearly over the term.
            </p>
            <div class="mt-5 pt-4 border-t border-white/20 text-xs text-slate-400 flex justify-between">
                <span>Total interest formula</span>
                <span class="font-mono text-emerald-300">Interest = Principal × ${rate}% × years</span>
            </div>
        `;
    }
}

/**
 * Main function: read inputs, calculate, update UI and chart
 */
function updateUI() {
    const principal = parseFloat(document.getElementById('principal').value) || 0;
    const rate = parseFloat(document.getElementById('rate').value) || 0;
    const term = parseInt(document.getElementById('term').value) || 0;
    const unit = document.getElementById('termUnit').value;
    const method = document.querySelector('input[name="calcMethod"]:checked').value;

    updateTips(method, rate);

    // Convert term to total days using 360-day convention (30-day month)
    let totalDays = (unit === 'year') ? term * 360 : (unit === 'month' ? term * 30 : term);
    const dailyRate = (rate / 100) / 360;
    
    let currentBalance = principal;
    let labels = ['Start'];                 // English label for initial point
    let dataPoints = [principal];

    if (method === 'compound') {
        // Simulate daily compounding, aggregate by month
        for (let m = 1; m <= Math.ceil(totalDays/30); m++) {
            for(let d = 1; d <= 30; d++) {
                currentBalance *= (1 + dailyRate);
            }
            labels.push(`Month ${m}`);       // English month label
            dataPoints.push(currentBalance.toFixed(2));
        }
    } else {
        // Simple interest, also monthly points
        for (let m = 1; m <= Math.ceil(totalDays/30); m++) {
            labels.push(`Month ${m}`);
            // simple interest accumulated up to this month
            let balanceAtMonth = principal + (principal * dailyRate * m * 30);
            dataPoints.push(balanceAtMonth.toFixed(2));
        }
        // final balance using exact total days
        currentBalance = principal + (principal * dailyRate * totalDays);
    }

    // Update result cards
    document.getElementById('resTotal').innerText = `¥ ${currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('resInterest').innerText = `¥ ${(currentBalance - principal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // APY calculation: for compound it's (1+dailyRate)^360 -1, for simple it's just the nominal rate
    const apy = (method === 'compound') ? (Math.pow(1 + dailyRate, 360) - 1) * 100 : rate;
    document.getElementById('resApy').innerText = `${apy.toFixed(4)}%`;

    renderChart(labels, dataPoints, method === 'compound' ? '#4f46e5' : '#10b981');
}

/**
 * Renders the line chart with custom last-point marker and value label
 * @param {Array} labels - x-axis labels (months)
 * @param {Array} data - y-axis data points
 * @param {string} color - line color (indigo for compound, emerald for simple)
 */
function renderChart(labels, data, color) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (myChart) myChart.destroy();

    // Custom plugin to draw a dashed horizontal line and a floating label at the last point
    const lastPointLinePlugin = {
        id: 'lastPointLine',
        afterDraw: (chart) => {
            const ctx = chart.ctx;
            const meta = chart.getDatasetMeta(0);
            if (!meta.data || meta.data.length === 0) return;

            const lastPoint = meta.data[meta.data.length - 1];
            const lastValue = chart.data.datasets[0].data[meta.data.length - 1];

            const y = lastPoint.y;
            const leftX = chart.chartArea.left;
            const rightX = chart.chartArea.right;

            ctx.save();
            
            // Dashed horizontal line at the level of last point
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(leftX, y);
            ctx.lineTo(rightX, y);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = color + '80';
            ctx.stroke();

            // Format value as currency
            const formattedValue = '¥ ' + Number(lastValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
            ctx.font = '600 13px "Inter", "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            
            // Background for the label
            const textWidth = ctx.measureText(formattedValue).width;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.shadowBlur = 8;
            ctx.fillRect(rightX - textWidth - 12, y - 30, textWidth + 16, 26);
            ctx.shadowColor = 'transparent';
            
            // Value text
            ctx.fillStyle = color;
            ctx.fillText(formattedValue, rightX - 6, y - 10);
            
            // Highlight last point with a white ring
            ctx.beginPath();
            ctx.arc(lastPoint.x, lastPoint.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = color + '60';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = color;
            ctx.stroke();

            ctx.restore();
        }
    };

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                borderColor: color,
                backgroundColor: color + '15',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 0
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { display: false },
                tooltip: { 
                    backgroundColor: '#1e293b', 
                    titleColor: '#f1f5f9',
                    callbacks: {
                        label: (context) => `¥ ${Number(context.raw).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                    }
                }
            },
            scales: { 
                x: { ticks: { autoSkip: true, maxTicksLimit: 8, color: '#475569' } },
                y: { 
                    suggestedMax: Math.max(...data.map(Number)) * 1.05, 
                    grid: { color: '#e2e8f020' },
                    ticks: {
                        callback: (value) => '¥' + value.toLocaleString()
                    }
                } 
            }
        },
        plugins: [lastPointLinePlugin]
    });
}

// ----- Event listeners -----

// Radio buttons: change rate to typical values when product type changes
document.querySelectorAll('input[name="calcMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const rateInput = document.getElementById('rate');
        if (e.target.value === 'compound') {
            rateInput.value = "0.35";
        } else {
            rateInput.value = "2.75";
        }
        updateUI();
    });
});

// Input fields: update on any change
['principal', 'rate', 'term', 'termUnit'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateUI);
});

// Initial calculation
updateUI();