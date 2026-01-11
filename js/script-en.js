// script-en.js
// JavaScript functionality
// e.g., smooth scrolling, interactions

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll to anchor links
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Additional interactive features can be added here
    console.log('KeyCheck Pro (English) loaded successfully!');
});