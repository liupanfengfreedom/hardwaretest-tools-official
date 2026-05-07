(function () {
    const config = {
        locale: "zh-CN",
        messages: {
            syncingRate: "正在同步汇率...",
            failedRate: "汇率同步失败",
            loadingHistory: "加载历史趋势数据...",
            fetchError: "汇率数据获取失败",
            chartError: "图表数据获取失败",
            swapLabel: "对调持有货币与目标货币",
            trendTitle: (from, to, years) => `${from}/${to} ${years}年趋势`,
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
