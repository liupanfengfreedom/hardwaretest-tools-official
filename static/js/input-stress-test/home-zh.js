// script.js
// 初始化图标
lucide.createIcons();

// 可以添加其他交互功能
document.addEventListener('DOMContentLoaded', function() {
    // 为所有按钮添加点击效果
    const buttons = document.querySelectorAll('.btn-action');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // 添加涟漪效果
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.7);
                transform: scale(0);
                animation: ripple-animation 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                top: ${y}px;
                left: ${x}px;
            `;
            
            this.appendChild(ripple);
            
            // 动画结束后移除涟漪元素
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// 添加涟漪动画的CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);