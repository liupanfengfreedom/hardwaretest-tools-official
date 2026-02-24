let myChart = null;

function updateTips(method, rate) {
    const tipsCard = document.getElementById('tipsCard');
    const rateTag = document.getElementById('rateTag');
    
    if (method === 'compound') {
        rateTag.innerText = "活期推荐";
        rateTag.className = "text-[11px] px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium shadow-sm";
        tipsCard.innerHTML = `
            <div class="flex items-center gap-3 mb-4">
                <span class="w-2 h-2 bg-indigo-400 rounded-full"></span>
                <span class="font-bold text-indigo-300 text-sm tracking-wider">💡 活期复利逻辑</span>
            </div>
            <p class="text-sm leading-relaxed text-slate-300">
                正如你所察觉的，<b class="text-white">活期存款</b>虽然年利率较低（当前约 0.2% - 0.35%），但它通常采用类似<b class="text-white">日复利</b>的逻辑：每天产生的微小利息在结算后会滚入本金继续生息，即“利滚利”。
            </p>
            <div class="mt-5 pt-4 border-t border-white/20 text-xs text-slate-400 flex justify-between">
                <span>当日利息公式</span>
                <span class="font-mono text-indigo-300">余额 × (${rate}% / 360)</span>
            </div>
        `;
    } else {
        rateTag.innerText = "定期推荐";
        rateTag.className = "text-[11px] px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium shadow-sm";
        tipsCard.innerHTML = `
            <div class="flex items-center gap-3 mb-4">
                <span class="w-2 h-2 bg-emerald-400 rounded-full"></span>
                <span class="font-bold text-emerald-300 text-sm tracking-wider">💎 定期单利逻辑</span>
            </div>
            <p class="text-sm leading-relaxed text-slate-300">
                <b class="text-white">定期存款</b>的年利率显著更高（如 2.75%），但银行通常按<b class="text-white">单利</b>计算。这意味着在整个存期内，利息不会自动变成新的本金，收益随时间呈直线增长。
            </p>
            <div class="mt-5 pt-4 border-t border-white/20 text-xs text-slate-400 flex justify-between">
                <span>总利息公式</span>
                <span class="font-mono text-emerald-300">本金 × ${rate}% × 年数</span>
            </div>
        `;
    }
}

function updateUI() {
    const principal = parseFloat(document.getElementById('principal').value) || 0;
    const rate = parseFloat(document.getElementById('rate').value) || 0;
    const term = parseInt(document.getElementById('term').value) || 0;
    const unit = document.getElementById('termUnit').value;
    const method = document.querySelector('input[name="calcMethod"]:checked').value;

    updateTips(method, rate);

    let totalDays = (unit === 'year') ? term * 360 : (unit === 'month' ? term * 30 : term);
    const dailyRate = (rate / 100) / 360;
    
    let currentBalance = principal;
    let labels = ['初始'];
    let dataPoints = [principal];

    if (method === 'compound') {
        for (let m = 1; m <= Math.ceil(totalDays/30); m++) {
            for(let d=1; d<=30; d++) currentBalance *= (1 + dailyRate);
            labels.push(`第${m}月`);
            dataPoints.push(currentBalance.toFixed(2));
        }
    } else {
        for (let m = 1; m <= Math.ceil(totalDays/30); m++) {
            labels.push(`第${m}月`);
            dataPoints.push((principal + (principal * dailyRate * m * 30)).toFixed(2));
        }
        currentBalance = principal + (principal * dailyRate * totalDays);
    }

    document.getElementById('resTotal').innerText = `¥ ${currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('resInterest').innerText = `¥ ${(currentBalance - principal).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    const apy = (method === 'compound') ? (Math.pow(1 + dailyRate, 360) - 1) * 100 : rate;
    document.getElementById('resApy').innerText = `${apy.toFixed(4)}%`;

    renderChart(labels, dataPoints, method === 'compound' ? '#4f46e5' : '#10b981');
}

function renderChart(labels, data, color) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (myChart) myChart.destroy();

    // 自定义插件 (微调颜色使其更适配新背景)
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
            
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(leftX, y);
            ctx.lineTo(rightX, y);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = color + '80';
            ctx.stroke();

            const formattedValue = '¥ ' + Number(lastValue).toLocaleString(undefined, {minimumFractionDigits: 2});
            ctx.font = '600 13px "Noto Sans SC", "Inter", monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            
            const textWidth = ctx.measureText(formattedValue).width;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.shadowBlur = 8;
            ctx.fillRect(rightX - textWidth - 12, y - 30, textWidth + 16, 26);
            ctx.shadowColor = 'transparent';
            
            ctx.fillStyle = color;
            ctx.fillText(formattedValue, rightX - 6, y - 10);
            
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
                tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9' }
            },
            scales: { 
                x: { ticks: { autoSkip: true, maxTicksLimit: 8, color: '#475569' } },
                y: { suggestedMax: Math.max(...data.map(Number)) * 1.05, grid: { color: '#e2e8f020' } } 
            }
        },
        plugins: [lastPointLinePlugin]
    });
}

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

['principal', 'rate', 'term', 'termUnit'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateUI);
});

updateUI();