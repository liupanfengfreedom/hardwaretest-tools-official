// 中文版 JavaScript
window.addEventListener('DOMContentLoaded', () => {
    // 改进的加载状态处理
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
        link.addEventListener('click', function(e) {
            // 只对同站链接显示加载动画
            if (this.hostname === window.location.hostname) {
                document.querySelector('.loading').classList.add('active');
                // 设置超时自动关闭，防止页面无法加载时动画一直显示
                setTimeout(() => {
                    document.querySelector('.loading').classList.remove('active');
                }, 3000);
            }
        });
    });
    
    // 文档切换功能
    const docsToggle = document.querySelector('.docs-toggle');
    const docsContent = document.querySelector('.docs-content');
    
    if (docsToggle && docsContent) {
        docsToggle.addEventListener('click', function() {
            docsContent.classList.toggle('active');
            // 更新按钮文本
            if (docsContent.classList.contains('active')) {
                docsToggle.textContent = '收起使用手册';
            } else {
                docsToggle.textContent = '查看使用手册';
            }
        });
    }
    
    // 监听页面可见性变化，隐藏加载动画
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            document.querySelector('.loading').classList.remove('active');
        }
    });
});

// 字体加载失败时的降级处理
document.fonts.ready.then(() => {
    console.log('所有字体加载完成');
}).catch((error) => {
    console.warn('部分字体加载失败:', error);
});