(function () {
    const config = {
        locale: "ja-JP",
        messages: {
            syncingRate: "為替レートを同期中...",
            failedRate: "為替レートを取得できませんでした",
            loadingHistory: "過去の推移データを読み込み中...",
            fetchError: "為替レートの取得に失敗しました",
            chartError: "チャートデータの取得に失敗しました",
            swapLabel: "保有通貨と目標通貨を入れ替え",
            trendTitle: (from, to, years) => `${from}/${to} ${years}年トレンド`,
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
