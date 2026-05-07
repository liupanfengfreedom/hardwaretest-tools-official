(function () {
    const config = {
        locale: "en-NG",
        messages: {
            syncingRate: "Syncing exchange rate...",
            failedRate: "Failed to fetch exchange rate",
            loadingHistory: "Dey load historical trend data...",
            fetchError: "Failed to fetch exchange rate",
            chartError: "Failed to load chart data",
            swapLabel: "Swap source and target currencies",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-Year Trend".replace('{from}', from).replace('{to}', to).replace('{years}', years),
            rateText: (from, rate, to) => "1 {{from}} = {{rate}} {{to}}".replace('{from}', from).replace('{rate}', rate.toFixed(4)).replace('{to}', to)
        }
    };

    function boot() {
        if (!window.__currencyCalculatorCoreLoader) {
            window.__currencyCalculatorCoreLoader = new Promise((resolve, reject) => {
                if (typeof window.initCurrencyCalculatorCore === "function") {
                    resolve();
                    return;
                }
                const script = document.createElement("script");
                script.src = "/static/js/utility-tools/math/currency-calculator/core.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        window.__currencyCalculatorCoreLoader.then(() => {
            window.initCurrencyCalculatorCore(config);
        });
    }

    boot();
})();
