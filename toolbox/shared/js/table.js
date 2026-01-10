// 添加表格行点击效果
document.addEventListener('DOMContentLoaded', function() {
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        row.addEventListener('click', function() {
            // 移除其他行的active类
            rows.forEach(r => r.classList.remove('active'));
            // 添加当前行的active类
            this.classList.add('active');
        });
    });
    
    // 为防抖范围添加视觉强调
    const rangeCells = document.querySelectorAll('.range');
    rangeCells.forEach(cell => {
        const text = cell.textContent;
        // 如果有数字范围，加粗显示
        if (text.match(/\d/)) {
            cell.innerHTML = text.replace(/(\d+ms)/g, '<strong>$1</strong>');
        }
    });
    
    // 添加键盘导航支持
    document.addEventListener('keydown', function(e) {
        const activeRow = document.querySelector('tbody tr.active');
        if (!activeRow) return;
        
        let nextRow;
        
        if (e.key === 'ArrowDown') {
            nextRow = activeRow.nextElementSibling;
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            nextRow = activeRow.previousElementSibling;
            e.preventDefault();
        }
        
        if (nextRow) {
            rows.forEach(r => r.classList.remove('active'));
            nextRow.classList.add('active');
            nextRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
    
    // 默认选中第一行
    if (rows.length > 0) {
        rows[0].classList.add('active');
    }
});