(function () {
    const config = {
        locale: "ar-SA",
        messages: {
            syncingRate: "جارٍ مزامنة سعر الصرف...",
            failedRate: "فشل جلب سعر الصرف",
            loadingHistory: "جارٍ تحميل بيانات الاتجاه التاريخي...",
            fetchError: "فشل جلب سعر الصرف",
            chartError: "فشل تحميل بيانات المخطط",
            swapLabel: "مبادلة العملات المصدر والعملات المستهدفة",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}} - اتجاه العام".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
