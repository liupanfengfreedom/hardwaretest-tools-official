(function () {
    const config = {
        locale: "te-IN",
        messages: {
            syncingRate: "మార్పిడి రేటును సమకాలీకరిస్తోంది...",
            failedRate: "మార్పిడి రేటును పొందడంలో విఫలమైంది",
            loadingHistory: "చారిత్రక ట్రెండ్ డేటా లోడ్ అవుతోంది...",
            fetchError: "మార్పిడి రేటును పొందడంలో విఫలమైంది",
            chartError: "చార్ట్ డేటాను లోడ్ చేయడంలో విఫలమైంది",
            swapLabel: "మూలం మరియు లక్ష్య కరెన్సీలను మార్చుకోండి",
            trendTitle: (from, to, years) => "{{from}}/{{to}} {{years}}-సంవత్సరం ట్రెండ్".replace('{from}', from).replace('{to}', to).replace('{years}', years),
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
