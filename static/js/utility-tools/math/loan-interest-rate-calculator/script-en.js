// script-en.js — English version of Loan Interest Calculator
(function() {
    let currentMode = 'equalInterest';
    let pieChart = null;
    let barChart = null;

    const modes = {
        equalInterest: {
            name: "Equal Payment",
            desc: "Fixed monthly payment. Interest portion is higher in early stages, suitable for borrowers with stable long-term income.",
            formula: "M = P × [r(1+r)^n] / [(1+r)^n - 1]",
            symbols: "P: principal | r: monthly rate (annual/12) | n: total months | M: monthly payment"
        },
        equalPrincipal: {
            name: "Decreasing Principal",
            desc: "Fixed principal portion each month, interest decreases with principal. Lowest total interest but higher initial payments.",
            formula: "Mₜ = (P/n) + (P - paid principalₜ₋₁) × r",
            symbols: "P: principal | n: total months | r: monthly rate | Mₜ: payment in month t"
        },
        interestFirst: {
            name: "Interest Only",
            desc: "Pay only interest each month, repay full principal at the end. High capital efficiency, ideal for short-term business.",
            formula: "Monthly interest = P × r",
            symbols: "P: principal | r: monthly rate | final payment = principal + monthly interest"
        },
        lumpSum: {
            name: "Lump Sum",
            desc: "Pay all principal and accrued interest at maturity. No intermediate payments.",
            formula: "Total repayment = P × (1 + annual rate × years)",
            symbols: "P: principal | annual rate: input rate | years: loan term in years"
        }
    };

    function formatCurrency(num) {
        // Use en-US formatting with 2 decimal places (e.g., 1,234,567.89)
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
    }

    window.switchMode = function(mode) {
        currentMode = mode;
        document.querySelectorAll('[id^="tab-"]').forEach(btn => btn.classList.remove('active-tab'));
        document.getElementById(`tab-${mode}`).classList.add('active-tab');
        document.getElementById('modeText').innerText = modes[mode].desc;
        document.getElementById('modeFormula').innerText = modes[mode].formula;
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

        // Precompute equal payment monthly amount if needed
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
                    // Show range for decreasing principal: first month ... last month
                    firstMonthPayment = `${formatCurrency(firstMonthPayment)} ... ${formatCurrency(lastM)}`;
                }
            } 
            else if (currentMode === 'interestFirst') {
                mI = P * r;
                mP = (i === months) ? P : 0;
                if (i === 1) firstMonthPayment = P * r;
            } 
            else if (currentMode === 'lumpSum') {
                // Lump sum: total interest spread over months for chart smoothness
                const totalInterestLS = P * annualRate * years;
                mI = totalInterestLS / months;
                mP = (i === months) ? P : 0;
                if (i === 1) firstMonthPayment = 0;   // No payment until maturity
            }

            tempYearlyP += mP;
            tempYearlyI += mI;
            remainingP -= mP;
            totalInterest += mI;

            if (i % 12 === 0 || i === months) {
                yearlyData.push({
                    year: `Year ${Math.ceil(i/12)}`,
                    principal: tempYearlyP,
                    interest: tempYearlyI
                });
                tempYearlyP = 0;
                tempYearlyI = 0;
            }
        }

        // Update DOM
        animateValue("totalInterestResult", 0, totalInterest, 600);
        // If firstMonthPayment is a string (range), keep as is; else format number
        if (typeof firstMonthPayment === 'string') {
            document.getElementById('monthlyRepayment').innerHTML = firstMonthPayment;
        } else {
            document.getElementById('monthlyRepayment').innerHTML = formatCurrency(firstMonthPayment);
        }
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
        // Pie chart
        const ctxPie = document.getElementById('loanPieChart').getContext('2d');
        if (pieChart) pieChart.destroy();
        pieChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Interest'],
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

        // Bar chart (yearly stacked)
        const ctxBar = document.getElementById('loanBarChart').getContext('2d');
        if (barChart) barChart.destroy();
        barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: yearlyData.map(d => d.year),
                datasets: [
                    { label: 'Principal', data: yearlyData.map(d => d.principal), backgroundColor: '#3b82f6', stack: 'stack', borderRadius: 8, barPercentage: 0.65 },
                    { label: 'Interest', data: yearlyData.map(d => d.interest), backgroundColor: '#fbbf24', stack: 'stack', borderRadius: 8, barPercentage: 0.65 }
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

    // Bind range sliders and number inputs
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

    // Initialize with equal payment mode
    window.switchMode('equalInterest');
})();