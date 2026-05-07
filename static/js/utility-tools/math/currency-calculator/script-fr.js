(function () {
    const config = {
        locale: "fr-FR",
        messages: {
            syncingRate: "Synchronisation du taux de change...",
            failedRate: "Échec de la récupération du taux de change",
            loadingHistory: "Chargement des données de tendance historiques...",
            fetchError: "Échec de la récupération du taux de change",
            chartError: "Échec du chargement des données du graphique",
            swapLabel: "Échanger les devises source et cible",
            trendTitle: (from, to, years) => "Tendance sur {{from}}/{{to}} {{years}}-année".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
