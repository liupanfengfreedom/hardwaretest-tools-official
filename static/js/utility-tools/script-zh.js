// 初始化图标
lucide.createIcons();

// 页面加载完成后添加加载类
document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add('loaded');
    
    // 基础搜索过滤逻辑
    const searchBar = document.querySelector('.search-bar');
    const cards = document.querySelectorAll('.tool-card');
    const sections = document.querySelectorAll('.category-section');
    
    searchBar.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        let visibleCardsCount = 0;
        
        cards.forEach(card => {
            const title = card.querySelector('h3').innerText.toLowerCase();
            const desc = card.querySelector('p').innerText.toLowerCase();
            const tag = card.querySelector('.tool-tag').innerText.toLowerCase();
            
            if (title.includes(term) || desc.includes(term) || tag.includes(term)) {
                card.style.display = 'flex';
                visibleCardsCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // 更新分类计数
        sections.forEach(section => {
            const sectionCards = section.querySelectorAll('.tool-card');
            const countElement = section.querySelector('.category-count');
            let visibleInSection = 0;
            
            sectionCards.forEach(card => {
                if (card.style.display !== 'none') {
                    visibleInSection++;
                }
            });
            
            if (countElement) {
                countElement.textContent = `${visibleInSection} 个工具`;
            }
            
            // 隐藏没有可见工具的整个分类
            if (visibleInSection === 0 && term.length > 0) {
                section.style.display = 'none';
            } else {
                section.style.display = 'block';
            }
        });
        
        // 显示搜索结果提示
        if (term.length > 0) {
            const resultsHint = document.querySelector('.search-hint');
            if (resultsHint) {
                resultsHint.textContent = `找到 ${visibleCardsCount} 个相关工具`;
            }
        } else {
            const resultsHint = document.querySelector('.search-hint');
            if (resultsHint) {
                resultsHint.textContent = '输入关键词，快速找到你需要的工具';
            }
            
            // 重置所有分类显示
            sections.forEach(section => {
                section.style.display = 'block';
            });
        }
    });
    
    // 卡片点击效果
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // 这里可以添加点击后的逻辑，比如跳转页面
            e.preventDefault();
            
            // 添加点击反馈
            this.style.transform = 'translateY(-4px) scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'translateY(-8px)';
            }, 150);
            
            // 实际应用中这里应该是页面跳转或加载工具
            console.log(`打开工具: ${this.querySelector('h3').innerText}`);
        });
    });
    
    // 添加键盘快捷键
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K 聚焦搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchBar.focus();
        }
        
        // ESC 清空搜索框
        if (e.key === 'Escape' && document.activeElement === searchBar) {
            searchBar.value = '';
            searchBar.dispatchEvent(new Event('input'));
            searchBar.blur();
        }
    });
    
    // 添加搜索框快捷键提示
    const searchHint = document.querySelector('.search-hint');
    const originalHint = searchHint.textContent;
    searchBar.addEventListener('focus', function() {
        searchHint.textContent = '按 ESC 键清空搜索，按 Ctrl+K 快速搜索';
    });
    
    searchBar.addEventListener('blur', function() {
        if (this.value === '') {
            searchHint.textContent = originalHint;
        }
    });
});