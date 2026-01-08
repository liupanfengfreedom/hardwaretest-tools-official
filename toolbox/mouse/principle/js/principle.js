// 工作原理页面的其他交互功能
// 注意：图片相关功能已移动到 image-modal.js

document.addEventListener('DOMContentLoaded', function() {
    // 这里可以添加其他与工作原理页面相关的脚本
    // 图片功能已独立拆分到 image-modal.js
    
    console.log('工作原理页面脚本已加载');
    
    // 示例：为所有代码块添加复制按钮（可选功能）
    const codeBlocks = document.querySelectorAll('code');
    if (codeBlocks.length > 0) {
        codeBlocks.forEach(block => {
            // 如果代码块内容较长，可以添加复制功能
            if (block.textContent.length > 50) {
                const copyButton = document.createElement('button');
                copyButton.className = 'code-copy-btn';
                copyButton.textContent = '复制';
                copyButton.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: #4fc3f7;
                    border: none;
                    color: #000;
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.3s;
                `;
                
                block.style.position = 'relative';
                block.style.padding = '10px 35px 10px 10px';
                block.appendChild(copyButton);
                
                block.addEventListener('mouseenter', () => {
                    copyButton.style.opacity = '1';
                });
                
                block.addEventListener('mouseleave', () => {
                    copyButton.style.opacity = '0';
                });
                
                copyButton.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(block.textContent);
                        copyButton.textContent = '已复制!';
                        setTimeout(() => {
                            copyButton.textContent = '复制';
                        }, 2000);
                    } catch (err) {
                        console.error('复制失败:', err);
                    }
                });
            }
        });
    }
});