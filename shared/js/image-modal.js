// 图片双击放大功能
document.addEventListener('DOMContentLoaded', function() {
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    const modalClose = document.getElementById('modalClose');
    const modalZoom = document.getElementById('modalZoom');
    const modalContent = document.getElementById('modalContent');
    
    let isZoomed = false;
    
    // 查找所有可以放大的图片
    const imageContainers = document.querySelectorAll('.principle-image');
    
    imageContainers.forEach(container => {
        const img = container.querySelector('img');
        const caption = container.querySelector('.image-caption');
        
        // 双击图片打开模态框
        container.addEventListener('dblclick', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            modalImage.src = img.src;
            modalCaption.textContent = caption.textContent;
            
            // 重置缩放状态
            isZoomed = false;
            modalContent.style.transform = 'scale(1)';
            modalZoom.innerHTML = '<i class="fas fa-search-plus"></i>';
            modalZoom.setAttribute('aria-label', '放大图片');
            
            imageModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // 防止背景滚动
        });
        
        // 单击图片显示提示（可选）
        container.addEventListener('click', function(e) {
            if (e.detail === 1) {
                // 单次点击，可以显示短暂提示
                const hint = container.querySelector('.image-hint');
                if (hint) {
                    hint.style.opacity = '1';
                    setTimeout(() => {
                        hint.style.opacity = '';
                    }, 1500);
                }
            }
        });
    });
    
    // 关闭模态框
    modalClose.addEventListener('click', function() {
        closeModal();
    });
    
    // 点击模态框背景关闭
    imageModal.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            closeModal();
        }
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && imageModal.classList.contains('active')) {
            closeModal();
        }
    });
    
    // 切换缩放状态
    modalZoom.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleZoom();
    });
    
    // 双击模态框内图片也切换缩放
    modalImage.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        toggleZoom();
    });
    
    // 辅助函数：关闭模态框
    function closeModal() {
        imageModal.classList.remove('active');
        document.body.style.overflow = ''; // 恢复背景滚动
        setTimeout(() => {
            modalImage.src = '';
        }, 300);
    }
    
    // 辅助函数：切换缩放状态
    function toggleZoom() {
        if (isZoomed) {
            // 恢复原始大小
            modalContent.style.transform = 'scale(1)';
            modalZoom.innerHTML = '<i class="fas fa-search-plus"></i>';
            modalZoom.setAttribute('aria-label', '放大图片');
        } else {
            // 放大图片
            modalContent.style.transform = 'scale(1.5)';
            modalZoom.innerHTML = '<i class="fas fa-search-minus"></i>';
            modalZoom.setAttribute('aria-label', '缩小图片');
        }
        isZoomed = !isZoomed;
    }
    
    // 添加键盘导航支持
    document.addEventListener('keydown', function(e) {
        if (!imageModal.classList.contains('active')) return;
        
        // + 键放大
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            if (!isZoomed) toggleZoom();
        }
        
        // - 键缩小
        if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            if (isZoomed) toggleZoom();
        }
        
        // 空格键切换缩放
        if (e.key === ' ') {
            e.preventDefault();
            toggleZoom();
        }
    });
});