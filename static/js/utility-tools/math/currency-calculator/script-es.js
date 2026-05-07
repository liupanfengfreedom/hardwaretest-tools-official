(function () {
    const config = {
        locale: "es-ES",
        messages: {
            syncingRate: "Sincronizando tipo de cambio...",
            failedRate: "No se pudo recuperar el tipo de cambio",
            loadingHistory: "Cargando datos de tendencias históricas...",
            fetchError: "No se pudo recuperar el tipo de cambio",
            chartError: "No se pudieron cargar los datos del gráfico",
            swapLabel: "Intercambiar monedas de origen y de destino",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-Tendencia anual".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
