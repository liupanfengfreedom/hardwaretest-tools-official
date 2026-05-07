(function () {
    const config = {
        locale: "id-ID",
        messages: {
            syncingRate: "Menyinkronkan nilai tukar...",
            failedRate: "Gagal mengambil nilai tukar",
            loadingHistory: "Memuat data tren historis...",
            fetchError: "Gagal mengambil nilai tukar",
            chartError: "Gagal memuat data diagram",
            swapLabel: "Tukar mata uang sumber dan target",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-Tren Tahun".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
