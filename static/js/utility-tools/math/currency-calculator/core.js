(function (global) {
    function initCurrencyCalculatorCore(config) {
        if (global.__currencyCalculatorCoreInitialized) {
            return;
        }
        global.__currencyCalculatorCoreInitialized = true;

        const state = {
            chart: null,
            currentYears: 5,
            latestRate: null,
            latestPair: "",
            locale: config.locale || document.documentElement.lang || undefined,
            messages: config.messages || {}
        };
        const API_BASE = "https://api.frankfurter.dev/v1";

        function getEl(id) {
            return document.getElementById(id);
        }

        function getPairKey(from, to) {
            return `${from}->${to}`;
        }

        function getFormState() {
            return {
                from: getEl("ex-from")?.value || "",
                to: getEl("ex-to")?.value || "",
                amount: parseFloat(getEl("ex-amount")?.value || "0") || 0
            };
        }

        function setRateText(text) {
            const node = getEl("rate-text");
            if (node) {
                node.innerText = text;
            }
        }

        function setResultAmount(value) {
            const node = getEl("res-total");
            if (node) {
                node.innerText = value;
            }
        }

        function setLoading(visible) {
            const loading = getEl("loading-overlay");
            if (!loading) {
                return;
            }
            loading.style.display = visible ? "block" : "none";
            if (visible && state.messages.loadingHistory) {
                loading.innerText = state.messages.loadingHistory;
            }
        }

        function formatAmount(value) {
            return Number(value).toLocaleString(state.locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function clearChart() {
            if (state.chart) {
                state.chart.destroy();
                state.chart = null;
            }
        }

        function renderRate(from, to, amount, rate) {
            setRateText(state.messages.rateText(from, rate, to));
            setResultAmount(formatAmount(amount * rate));
        }

        function renderSameCurrency(from, to, amount) {
            setRateText(state.messages.rateText(from, 1, to));
            setResultAmount(formatAmount(amount));
            setLoading(false);
            clearChart();
        }

        async function fetchJson(url) {
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response.json();
        }

        function extractRate(data, to) {
            const rate = Number(data && data.rates ? data.rates[to] : NaN);
            if (!Number.isFinite(rate)) {
                throw new Error("Missing exchange rate");
            }
            return rate;
        }

        function renderChart(labels, dataPoints, title) {
            const canvas = getEl("historyChart");
            if (!canvas) {
                return;
            }

            if (typeof Chart === "undefined") {
                console.error(state.messages.chartError, new Error("Chart.js is unavailable"));
                return;
            }

            clearChart();
            state.chart = new Chart(canvas.getContext("2d"), {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        label: title,
                        data: dataPoints,
                        borderColor: "#007aff",
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: true,
                        backgroundColor: "rgba(0, 122, 255, 0.05)",
                        tension: 0.15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                maxTicksLimit: 6,
                                font: {
                                    size: 10
                                }
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            ticks: {
                                font: {
                                    size: 10
                                }
                            },
                            grid: {
                                color: "#f0f0f2"
                            }
                        }
                    }
                }
            });
        }

        function sampleHistory(history, to) {
            const dates = Object.keys(history || {});
            if (!dates.length) {
                return {
                    labels: [],
                    values: []
                };
            }

            const labels = [];
            const values = [];
            const step = Math.max(1, Math.floor(dates.length / 50));

            for (let i = 0; i < dates.length; i += step) {
                const date = dates[i];
                const value = Number(history[date] && history[date][to]);
                if (Number.isFinite(value)) {
                    labels.push(date);
                    values.push(value);
                }
            }

            const lastDate = dates[dates.length - 1];
            const lastValue = Number(history[lastDate] && history[lastDate][to]);
            if (Number.isFinite(lastValue) && labels[labels.length - 1] !== lastDate) {
                labels.push(lastDate);
                values.push(lastValue);
            }

            return {
                labels,
                values
            };
        }

        async function refreshChart(from, to) {
            if (!from || !to || from === to) {
                setLoading(false);
                clearChart();
                return;
            }

            setLoading(true);

            const endDate = new Date();
            endDate.setHours(0, 0, 0, 0);
            const startDate = new Date(endDate);
            startDate.setFullYear(startDate.getFullYear() - state.currentYears);
            const end = endDate.toISOString().split("T")[0];
            const start = startDate.toISOString().split("T")[0];

            try {
                const data = await fetchJson(
                    `${API_BASE}/${start}..${end}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
                );
                const sampled = sampleHistory(data.rates || {}, to);
                if (!sampled.labels.length) {
                    clearChart();
                    return;
                }
                renderChart(sampled.labels, sampled.values, state.messages.trendTitle(from, to, state.currentYears));
            } catch (error) {
                clearChart();
                console.error(state.messages.chartError, error);
            } finally {
                setLoading(false);
            }
        }

        async function refreshRateAndChart() {
            const { from, to, amount } = getFormState();
            if (!from || !to) {
                return;
            }

            if (from === to) {
                state.latestPair = getPairKey(from, to);
                state.latestRate = 1;
                renderSameCurrency(from, to, amount);
                return;
            }

            setRateText(state.messages.syncingRate);

            try {
                const data = await fetchJson(
                    `${API_BASE}/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
                );
                const rate = extractRate(data, to);
                state.latestPair = getPairKey(from, to);
                state.latestRate = rate;
                renderRate(from, to, amount, rate);
                await refreshChart(from, to);
            } catch (error) {
                state.latestPair = "";
                state.latestRate = null;
                setResultAmount("--");
                setRateText(state.messages.failedRate);
                setLoading(false);
                clearChart();
                console.error(state.messages.fetchError, error);
            }
        }

        function updateAmountOnly() {
            const { from, to, amount } = getFormState();
            if (!from || !to) {
                return;
            }

            if (from === to) {
                renderSameCurrency(from, to, amount);
                return;
            }

            if (state.latestPair === getPairKey(from, to) && Number.isFinite(state.latestRate)) {
                renderRate(from, to, amount, state.latestRate);
                return;
            }

            refreshRateAndChart();
        }

        function swapCurrencies() {
            const fromEl = getEl("ex-from");
            const toEl = getEl("ex-to");
            if (!fromEl || !toEl) {
                return;
            }

            const currentFrom = fromEl.value;
            fromEl.value = toEl.value;
            toEl.value = currentFrom;
            state.latestPair = "";
            state.latestRate = null;
            refreshRateAndChart();
        }

        function ensureSwapButton() {
            const fromEl = getEl("ex-from");
            const toEl = getEl("ex-to");
            if (!fromEl || !toEl) {
                return;
            }

            const row = fromEl.closest(".form-row");
            const toGroup = toEl.closest(".form-group");
            if (!row || !toGroup || row.querySelector(".currency-swap-wrap")) {
                return;
            }

            row.classList.add("currency-pair-row");

            const wrap = document.createElement("div");
            wrap.className = "currency-swap-wrap";

            const button = document.createElement("button");
            button.type = "button";
            button.className = "currency-swap-btn";
            button.setAttribute("aria-label", state.messages.swapLabel);
            button.setAttribute("title", state.messages.swapLabel);
            button.innerHTML = '<i class="fas fa-right-left" aria-hidden="true"></i>';
            button.addEventListener("click", swapCurrencies);

            wrap.appendChild(button);
            row.insertBefore(wrap, toGroup);
        }

        function bindEvents() {
            const fromEl = getEl("ex-from");
            const toEl = getEl("ex-to");
            const amountEl = getEl("ex-amount");
            const timePicker = getEl("time-picker");

            fromEl && fromEl.addEventListener("change", refreshRateAndChart);
            toEl && toEl.addEventListener("change", refreshRateAndChart);
            amountEl && amountEl.addEventListener("input", updateAmountOnly);
            amountEl && amountEl.addEventListener("change", updateAmountOnly);

            if (timePicker) {
                timePicker.addEventListener("click", (event) => {
                    const button = event.target.closest(".time-btn");
                    if (!button) {
                        return;
                    }

                    document.querySelectorAll(".time-btn").forEach((btn) => btn.classList.remove("active"));
                    button.classList.add("active");
                    state.currentYears = parseInt(button.dataset.years, 10) || 5;

                    const { from, to } = getFormState();
                    refreshChart(from, to);
                });
            }
        }

        function init() {
            ensureSwapButton();
            bindEvents();
            refreshRateAndChart();
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init, { once: true });
        } else {
            init();
        }
    }

    global.initCurrencyCalculatorCore = initCurrencyCalculatorCore;
})(window);
