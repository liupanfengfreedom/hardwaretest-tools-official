/* --- START OF FILE language.js --- */

document.addEventListener('DOMContentLoaded', function() {
    // 语言切换器交互
    const languageTrigger = document.getElementById('languageTrigger');
    const languageDropdown = document.getElementById('languageDropdown');

    if (languageTrigger && languageDropdown) {
        
        // 点击触发器切换下拉菜单
        languageTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            const isExpanded = languageTrigger.getAttribute('aria-expanded') === 'true';
            
            // 切换状态
            if (isExpanded) {
                closeDropdown();
            } else {
                openDropdown();
            }
        });
        
        // 打开菜单函数
        function openDropdown() {
            languageTrigger.setAttribute('aria-expanded', 'true');
            languageDropdown.classList.add('show');
        }
        
        // 关闭菜单函数
        function closeDropdown() {
            languageTrigger.setAttribute('aria-expanded', 'false');
            languageDropdown.classList.remove('show');
        }
        
        // 点击页面其他地方关闭下拉菜单
        document.addEventListener('click', function() {
            closeDropdown();
        });
        
        // 阻止下拉菜单内的点击事件冒泡到 document
        languageDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // 键盘支持 (Escape 键关闭)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && languageDropdown.classList.contains('show')) {
                closeDropdown();
            }
        });
    }
});