// script.js
// 这里可以添加JavaScript功能
// 例如：平滑滚动、交互功能等

document.addEventListener('DOMContentLoaded', function() {
    // 平滑滚动到锚点
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

    // 可以添加其他交互功能
    console.log('KeyCheck Pro loaded successfully!');
});