  const colors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'];
    let colorIndex = 0;
    let isTesting = false;
    let hintTimeout, cursorTimeout;
    
    // 防抖变量：防止颜色切换过快
    let lastSwitchTime = 0;
    const SWITCH_DELAY = 150; // 毫秒

    const body = document.body;
    const largeHint = document.getElementById('large-hint');
    const docOverlay = document.getElementById('doc-overlay');

    function startTest() {
        enterFullScreen();
        isTesting = true;
        body.classList.add('testing-mode');
        colorIndex = 0;
        applyColor();
        showHint(3000);

        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            body.classList.remove('sidebar-open');
        }
    }

    function stopTest() {
        isTesting = false;
        body.classList.remove('testing-mode');
        body.style.backgroundColor = '#1a1a1a';
        largeHint.classList.remove('hint-visible');
        if (document.fullscreenElement) document.exitFullscreen();
    }

    // 核心切换函数，包含防抖检查
    function switchColor(direction) {
        // 1. 获取当前时间
        const now = Date.now();
        // 2. 如果距离上次切换太近，则忽略（防止鼠标双击过快）
        if (now - lastSwitchTime < SWITCH_DELAY) return;
        
        lastSwitchTime = now;

        if (direction === 'next') {
            colorIndex = (colorIndex + 1) % colors.length;
        } else {
            colorIndex = (colorIndex - 1 + colors.length) % colors.length;
        }
        applyColor();
    }

    function applyColor() {
        body.style.backgroundColor = colors[colorIndex];
    }

    function showHint(duration = 2000) {
        if (!isTesting) return;
        largeHint.classList.add('hint-visible');
        body.classList.add('mouse-moving');
        clearTimeout(hintTimeout);
        clearTimeout(cursorTimeout);
        if (duration > 0) {
            hintTimeout = setTimeout(() => largeHint.classList.remove('hint-visible'), duration);
            cursorTimeout = setTimeout(() => body.classList.remove('mouse-moving'), duration + 500);
        }
    }

    function enterFullScreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    }

    // 文档说明功能
    function showDoc(section) {
        docOverlay.style.display = 'flex';
        switchDoc(section);
    }

    function hideDoc() {
        docOverlay.style.display = 'none';
    }

    function switchDoc(section) {
        // 隐藏所有文档部分
        document.querySelectorAll('.doc-section').forEach(el => {
            el.classList.remove('active');
        });
        
        // 显示选中的文档部分
        document.getElementById(`doc-${section}`).classList.add('active');
        
        // 更新导航按钮状态
        document.querySelectorAll('.doc-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`.doc-nav-btn[onclick="switchDoc('${section}')"]`).classList.add('active');
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) stopTest();
    });

    // --- 事件监听修正部分 ---

    // 1. 鼠标点击
    document.addEventListener('click', () => {
        if (isTesting) switchColor('next');
    });

    // 2. 鼠标移动 (唤醒提示)
    document.addEventListener('mousemove', () => {
        if (isTesting) showHint(2500);
    });

    // 3. 键盘控制 (核心修复点)
    document.addEventListener('keydown', (e) => {
        if (!isTesting) return;
        
        // 🛑 核心修复：检查 event.repeat
        // 如果用户按住按键不放，e.repeat 会变为 true。这里直接返回，不执行切换。
        if (e.repeat) return; 

        if (e.code === 'ArrowRight' || e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault(); // 防止按空格导致页面滚动
            switchColor('next');
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            switchColor('prev');
        } else if (e.code === 'Escape') {
            stopTest();
        }
    });

    // 点击文档层外部关闭文档
    docOverlay.addEventListener('click', (e) => {
        if (e.target === docOverlay) {
            hideDoc();
        }
    });