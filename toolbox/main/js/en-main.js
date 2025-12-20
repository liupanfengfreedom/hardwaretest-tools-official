// English Version JavaScript
window.addEventListener('DOMContentLoaded', () => {
    // Improved loading state handling
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
        link.addEventListener('click', function(e) {
            // Only show loading animation for same-site links
            if (this.hostname === window.location.hostname) {
                document.querySelector('.loading').classList.add('active');
                // Set timeout to auto-close in case page fails to load
                setTimeout(() => {
                    document.querySelector('.loading').classList.remove('active');
                }, 3000);
            }
        });
    });
    
    // Documentation toggle function
    const docsToggle = document.querySelector('.docs-toggle');
    const docsContent = document.querySelector('.docs-content');
    
    if (docsToggle && docsContent) {
        docsToggle.addEventListener('click', function() {
            docsContent.classList.toggle('active');
            // Update button text
            if (docsContent.classList.contains('active')) {
                docsToggle.textContent = 'Hide User Manual';
            } else {
                docsToggle.textContent = 'View User Manual';
            }
        });
    }
    
    // Listen for page visibility changes to hide loading animation
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            document.querySelector('.loading').classList.remove('active');
        }
    });
});

// Graceful degradation for font loading failures
document.fonts.ready.then(() => {
    console.log('All fonts loaded successfully');
}).catch((error) => {
    console.warn('Some fonts failed to load:', error);
});