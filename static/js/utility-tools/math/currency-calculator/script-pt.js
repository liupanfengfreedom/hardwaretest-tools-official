(function () {
    const config = {
        locale: "pt-PT",
        messages: {
            syncingRate: "Sincronizando taxa de câmbio...",
            failedRate: "Falha ao buscar a taxa de câmbio",
            loadingHistory: "Carregando dados de tendências históricas...",
            fetchError: "Falha ao buscar a taxa de câmbio",
            chartError: "Falha ao carregar dados do gráfico",
            swapLabel: "Trocar moedas de origem e de destino",
            trendTitle: (from, to, years) => "Tendência de {{from}}/{{to}} {{years}} anos".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
