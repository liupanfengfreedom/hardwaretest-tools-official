(function () {
    const config = {
        locale: "ru-RU",
        messages: {
            syncingRate: "Синхронизация обменного курса...",
            failedRate: "Не удалось получить обменный курс.",
            loadingHistory: "Загрузка исторических данных о тенденциях...",
            fetchError: "Не удалось получить обменный курс.",
            chartError: "Не удалось загрузить данные диаграммы.",
            swapLabel: "Обмен исходной и целевой валют",
            trendTitle: (from, to, years) => "{{from}}/{{to}} Тренд {{years}}-года".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
