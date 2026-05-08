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
                ? "वापरकर्ता मॅन्युअल लपवा"
                : "वापरकर्ता मॅन्युअल पहा";
        });
    }

    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            document.querySelector('.loading').classList.remove('active');
        }
    });
});

document.fonts.ready.then(() => {
    console.log("सर्व फॉन्ट यशस्वीरित्या लोड झाले");
}).catch((error) => {
    console.warn("काही फॉन्ट लोड करण्यात अयशस्वी:", error);
});
