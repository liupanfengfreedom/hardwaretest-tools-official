
(function () {
    const config = {
        locale: "en-US",
        messages: {
            syncingRate: "Sincronizando el tipo de cambio...",
            failedRate: "No se pudo obtener el tipo de cambio",
            loadingHistory: "Cargando datos históricos de tendencias...",
            fetchError: "No se pudo obtener el tipo de cambio",
            chartError: "No se pudieron cargar los datos del gráfico",
            swapLabel: "Intercambiar monedas de origen y destino",
            trendTitle: (from, to, years) => `Tendencia de ${years} años de ${from}/${to}`,
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
