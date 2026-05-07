(function () {
    const config = {
        locale: "ko-KR",
        messages: {
            syncingRate: "환율을 동기화하는 중...",
            failedRate: "환율을 불러오지 못했습니다",
            loadingHistory: "과거 추세 데이터를 불러오는 중...",
            fetchError: "환율 데이터를 불러오지 못했습니다",
            chartError: "차트 데이터를 불러오지 못했습니다",
            swapLabel: "보유 통화와 목표 통화 맞바꾸기",
            trendTitle: (from, to, years) => `${from}/${to} ${years}년 추세`,
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
