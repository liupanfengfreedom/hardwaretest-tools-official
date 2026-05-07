(function () {
    const config = {
        locale: "tr-TR",
        messages: {
            syncingRate: "Döviz kuru senkronize ediliyor...",
            failedRate: "Döviz kuru getirilemedi",
            loadingHistory: "Geçmiş trend verileri yükleniyor...",
            fetchError: "Döviz kuru getirilemedi",
            chartError: "Grafik verileri yüklenemedi",
            swapLabel: "Kaynak ve hedef para birimlerini değiştirin",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-Yılın Trendi".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
