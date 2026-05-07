(function () {
    const config = {
        locale: "mr-IN",
        messages: {
            syncingRate: "विनिमय दर समक्रमित करत आहे...",
            failedRate: "विनिमय दर आणण्यात अयशस्वी",
            loadingHistory: "ऐतिहासिक ट्रेंड डेटा लोड करत आहे...",
            fetchError: "विनिमय दर आणण्यात अयशस्वी",
            chartError: "चार्ट डेटा लोड करण्यात अयशस्वी",
            swapLabel: "स्वॅप स्रोत आणि लक्ष्य चलने",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-वर्ष ट्रेंड".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
