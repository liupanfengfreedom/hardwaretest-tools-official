(function () {
    const config = {
        locale: "ur-PK",
        messages: {
            syncingRate: "تبادلے کی شرح کی مطابقت پذیری...",
            failedRate: "ایکسچینج ریٹ حاصل کرنے میں ناکام",
            loadingHistory: "تاریخی رجحان کا ڈیٹا لوڈ ہو رہا ہے...",
            fetchError: "ایکسچینج ریٹ حاصل کرنے میں ناکام",
            chartError: "چارٹ ڈیٹا لوڈ کرنے میں ناکام",
            swapLabel: "ماخذ اور ہدف کرنسیوں کو تبدیل کریں۔",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-سال کا رجحان".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
