// 获取DOM元素
const languageTrigger = document.getElementById('languageTrigger');
const languageDropdown = document.getElementById('languageDropdown');

// 切换下拉菜单的显示/隐藏
function toggleDropdown() {
    const isOpen = languageDropdown.classList.contains('show');
    
    if (isOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

// 打开下拉菜单
function openDropdown() {
    languageDropdown.classList.add('show');
}

// 关闭下拉菜单
function closeDropdown() {
    languageDropdown.classList.remove('show');
}

// 事件监听
languageTrigger.addEventListener('click', function(e) {
    e.preventDefault();
    toggleDropdown();
});

// 点击页面其他区域关闭下拉菜单
document.addEventListener('click', function(e) {
    if (!languageTrigger.contains(e.target) && !languageDropdown.contains(e.target)) {
        closeDropdown();
    }
});

// 不需要设置选中状态，因为HTML中已经写死了