(function () {
    const config = {
        locale: "en-NG",
        messages: {
            syncingRate: "Dey sync exchange rate...",
            failedRate: "No fit fetch exchange rate",
            loadingHistory: "Dey load historical trend data...",
            fetchError: "No fit fetch exchange rate",
            chartError: "No fit load chart data",
            swapLabel: "Swap source currency and target currency",
            trendTitle: (from, to, years) => "{{from}}/{{to}} trend for {{years}} years".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
