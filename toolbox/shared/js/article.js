// 修改后的 article.js
document.addEventListener('DOMContentLoaded', function() {
    // 方案 1：只锁定侧边栏的链接
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    
    sidebarLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // 只对以 # 开头的锚点链接执行平滑滚动
            if (href.startsWith('#')) {
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    e.preventDefault(); // 只有确定要滚动时才拦截跳转
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});