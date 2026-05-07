(function () {
    const config = {
        locale: "hi-IN",
        messages: {
            syncingRate: "विनिमय दर सिंक की जा रही है...",
            failedRate: "विनिमय दर लोड नहीं हो सकी",
            loadingHistory: "ऐतिहासिक रुझान डेटा लोड हो रहा है...",
            fetchError: "विनिमय दर डेटा लोड नहीं हो सका",
            chartError: "चार्ट डेटा लोड नहीं हो सका",
            swapLabel: "स्रोत और लक्ष्य मुद्रा अदल-बदल करें",
            trendTitle: (from, to, years) => `${from}/${to} ${years} वर्ष की प्रवृत्ति`,
            rateText: (from, rate, to) => `1 ${from} = ${rate.toFixed(4)} ${to}`
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
