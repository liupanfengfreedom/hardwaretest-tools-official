(function () {
    const config = {
        locale: "de-DE",
        messages: {
            syncingRate: "Wechselkurs wird synchronisiert...",
            failedRate: "Wechselkurs konnte nicht abgerufen werden",
            loadingHistory: "Historische Trenddaten werden geladen...",
            fetchError: "Wechselkurs konnte nicht abgerufen werden",
            chartError: "Diagrammdaten konnten nicht geladen werden",
            swapLabel: "Tauschen Sie Quell- und Zielwährungen aus",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-Jahrestrend".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
