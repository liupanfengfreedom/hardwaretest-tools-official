(function() {
    let currentMode = 'equalInterest';
    let pieChart = null;
    let barChart = null;

    const modes = {
        equalInterest: {
            name: "等额本息",
            desc: "每月还款金额固定。前期利息占比极高，适合收入稳定的长期借贷用户。",
            formula: "M = P × [r(1+r)^n] / [(1+r)^n - 1]",
            symbols: "P: 贷款本金 | r: 月利率 (年利率/12) | n: 还款总月数 | M: 每月还款额"
        },
        equalPrincipal: {
            name: "等额本金",
            desc: "每月本金固定，利息随本金减少。总利息最少，但前期还款压力巨大。",
            formula: "Mₜ = (P/n) + (P - 已还本金ₜ₋₁) × r",
            symbols: "P: 贷款本金 | n: 总月数 | r: 月利率 | Mₜ: 第t月还款额"
        },
        interestFirst: {
            name: "先息后本",
            desc: "平时只还利息，最后一期还清全部本金。资金利用率高，适合短期经营。",
            formula: "月利息 = P × r",
            symbols: "P: 贷款本金 | r: 月利率 | 最后一期还款 = 本金 + 月利息"
        },
        lumpSum: {
            name: "一次性还本付息",
            desc: "到期时一次性支付全部本金和累计利息。期间无需任何支付。",
            formula: "总还款 = P × (1 + 年利率 × 期限年)",
            symbols: "P: 贷款本金 | 年利率: 输入的年利率 | 期限年: 贷款年数"
        }
    };

    function formatCurrency(num) {
        return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(num);
    }

    window.switchMode = function(mode) {
        currentMode = mode;
        document.querySelectorAll('[id^="tab-"]').forEach(btn => btn.classList.remove('active-tab'));
        document.getElementById(`tab-${mode}`).classList.add('active-tab');
        document.getElementById('modeText').innerText = modes[mode].desc;
        document.getElementById('modeFormula').innerText = modes[mode].formula;
        // 更新符号解释
        document.getElementById('modeSymbols').innerHTML = '🔍 ' + modes[mode].symbols;
        calculate();
    };

    function calculate() {
        const P = parseFloat(document.getElementById('amountInput').value) || 0;
        const annualRate = parseFloat(document.getElementById('rateInput').value) / 100 || 0;
        const years = parseInt(document.getElementById('yearsInput').value) || 1;
        const months = years * 12;
        const r = annualRate / 12;

        let totalInterest = 0;
        let firstMonthPayment = 0;
        let yearlyData = [];

        let remainingP = P;
        let tempYearlyP = 0;
        let tempYearlyI = 0;

        // 预计算等额本息月供 (固定)
        let monthlyMEqual = 0;
        if (currentMode === 'equalInterest' && r > 0 && months > 0) {
            monthlyMEqual = P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
        } else if (currentMode === 'equalInterest' && r === 0) {
            monthlyMEqual = P / months;
        }

        for (let i = 1; i <= months; i++) {
            let mP = 0, mI = 0;

            if (currentMode === 'equalInterest') {
                if (r === 0) {
                    mP = P / months;
                    mI = 0;
                } else {
                    mI = remainingP * r;
                    mP = monthlyMEqual - mI;
                }
                if (i === 1) firstMonthPayment = monthlyMEqual;
            } 
            else if (currentMode === 'equalPrincipal') {
                mP = P / months;
                mI = remainingP * r;
                if (i === 1) firstMonthPayment = mP + mI;
                if (i === months) {
                    const lastM = mP + mI;
                    // 优雅显示：首月 ... 末月
                    firstMonthPayment = `${formatCurrency(firstMonthPayment)}  …  ${formatCurrency(lastM)}`;
                }
            } 
            else if (currentMode === 'interestFirst') {
                mI = P * r;
                mP = (i === months) ? P : 0;
                if (i === 1) firstMonthPayment = P * r;
            } 
            else if (currentMode === 'lumpSum') {
                // 一次性还本付息：利息总额 / months 只是为了图表平滑，展示每月利息均摊
                const totalInterestLS = P * annualRate * years;
                mI = totalInterestLS / months;
                mP = (i === months) ? P : 0;
                if (i === 1) firstMonthPayment = 0;   // 前期无还款
            }

            tempYearlyP += mP;
            tempYearlyI += mI;
            remainingP -= mP;
            totalInterest += mI;

            if (i % 12 === 0 || i === months) {
                yearlyData.push({
                    year: `第 ${Math.ceil(i/12)} 年`,
                    principal: tempYearlyP,
                    interest: tempYearlyI
                });
                tempYearlyP = 0;
                tempYearlyI = 0;
            }
        }

        // 更新DOM
        animateValue("totalInterestResult", 0, totalInterest, 600);
        document.getElementById('monthlyRepayment').innerHTML = (typeof firstMonthPayment === 'string') ? firstMonthPayment : formatCurrency(firstMonthPayment);
        document.getElementById('totalAll').innerText = formatCurrency(P + totalInterest);
        document.getElementById('labelPrincipal').innerText = formatCurrency(P);
        document.getElementById('labelInterest').innerText = formatCurrency(totalInterest);

        updateCharts(P, totalInterest, yearlyData);
    }

    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = formatCurrency(Math.floor(progress * (end - start) + start));
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    function updateCharts(principal, interest, yearlyData) {
        // 饼图
        const ctxPie = document.getElementById('loanPieChart').getContext('2d');
        if (pieChart) pieChart.destroy();
        pieChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['本金', '利息'],
                datasets: [{
                    data: [principal, interest],
                    backgroundColor: ['#3b82f6', '#fbbf24'],
                    borderWidth: 0,
                    borderRadius: 10,
                    spacing: 5,
                    offset: [0, 15]
                }]
            },
            options: {
                cutout: '70%',
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', titleColor: '#f1f5f9' } },
                layout: { padding: 5 }
            }
        });

        // 柱状图
        const ctxBar = document.getElementById('loanBarChart').getContext('2d');
        if (barChart) barChart.destroy();
        barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: yearlyData.map(d => d.year),
                datasets: [
                    { label: '本金', data: yearlyData.map(d => d.principal), backgroundColor: '#3b82f6', stack: 'stack', borderRadius: 8, barPercentage: 0.65 },
                    { label: '利息', data: yearlyData.map(d => d.interest), backgroundColor: '#fbbf24', stack: 'stack', borderRadius: 8, barPercentage: 0.65 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { display: false, drawBorder: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                    y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                },
                plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } }
            }
        });
    }

    // 绑定滑块与输入框
    function bindInput(rangeId, inputId) {
        const range = document.getElementById(rangeId);
        const input = document.getElementById(inputId);
        range.addEventListener('input', () => { input.value = range.value; calculate(); });
        input.addEventListener('input', () => { 
            let val = parseFloat(input.value) || (inputId.includes('years') ? 1 : 0);
            if (inputId.includes('years') && val < 1) val = 1;
            if (inputId.includes('years') && val > 30) val = 30;
            if (inputId.includes('rate') && val > 24) val = 24;
            if (inputId.includes('rate') && val < 0.1) val = 0.1;
            if (inputId.includes('amount') && val > 10000000) val = 10000000;
            if (inputId.includes('amount') && val < 10000) val = 10000;
            input.value = val;
            range.value = val;
            calculate();
        });
    }

    bindInput('amountRange', 'amountInput');
    bindInput('rateRange', 'rateInput');
    bindInput('yearsRange', 'yearsInput');

    // 初始化
    window.switchMode('equalInterest');
})();