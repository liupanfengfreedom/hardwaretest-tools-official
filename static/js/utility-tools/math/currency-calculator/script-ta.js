(function () {
    const config = {
        locale: "ta-IN",
        messages: {
            syncingRate: "பரிமாற்ற வீதத்தை ஒத்திசைக்கிறது...",
            failedRate: "மாற்று விகிதத்தைப் பெறுவதில் தோல்வி",
            loadingHistory: "வரலாற்றுப் போக்குத் தரவை ஏற்றுகிறது...",
            fetchError: "மாற்று விகிதத்தைப் பெறுவதில் தோல்வி",
            chartError: "விளக்கப்படத் தரவை ஏற்றுவதில் தோல்வி",
            swapLabel: "மூல மற்றும் இலக்கு நாணயங்களை மாற்றவும்",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-ஆண்டு போக்கு".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
