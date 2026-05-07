(function () {
    const config = {
        locale: "vi-VN",
        messages: {
            syncingRate: "Đang đồng bộ tỷ giá...",
            failedRate: "Không thể tải tỷ giá",
            loadingHistory: "Đang tải dữ liệu xu hướng lịch sử...",
            fetchError: "Không thể tải tỷ giá",
            chartError: "Không thể tải dữ liệu biểu đồ",
            swapLabel: "Đổi chiều tiền tệ nguồn và đích",
            trendTitle: (from, to, years) => `Xu hướng ${from}/${to} ${years} năm`,
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
