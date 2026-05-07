(function () {
    const config = {
        locale: "bn-BD",
        messages: {
            syncingRate: "বিনিময় হার সিঙ্ক হচ্ছে...",
            failedRate: "বিনিময় হার আনতে ব্যর্থ হয়েছে",
            loadingHistory: "ঐতিহাসিক প্রবণতা ডেটা লোড হচ্ছে...",
            fetchError: "বিনিময় হার আনতে ব্যর্থ হয়েছে",
            chartError: "চার্ট ডেটা লোড করতে ব্যর্থ হয়েছে৷",
            swapLabel: "অদলবদল উৎস এবং লক্ষ্য মুদ্রা",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-বছরের প্রবণতা".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
