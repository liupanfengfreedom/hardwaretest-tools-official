window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
        link.addEventListener('click', function() {
            if (this.hostname === window.location.hostname) {
                document.querySelector('.loading').classList.add('active');
                setTimeout(() => {
                    document.querySelector('.loading').classList.remove('active');
                }, 3000);
            }
        });
    });

    const docsToggle = document.querySelector('.docs-toggle');
    const docsContent = document.querySelector('.docs-content');

    if (docsToggle && docsContent) {
        docsToggle.addEventListener('click', function() {
            docsContent.classList.toggle('active');
            docsToggle.textContent = docsContent.classList.contains('active')
                ? "వినియోగదారు మాన్యువల్‌ను దాచండి"
                : "వినియోగదారు మాన్యువల్‌ని వీక్షించండి";
        });
    }

    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            document.querySelector('.loading').classList.remove('active');
        }
    });
});

document.fonts.ready.then(() => {
    console.log("అన్ని ఫాంట్‌లు విజయవంతంగా లోడ్ అయ్యాయి");
}).catch((error) => {
    console.warn("కొన్ని ఫాంట్‌లు లోడ్ చేయడంలో విఫలమయ్యాయి:", error);
});
