// --- 本地化配置 ---
    const I18N = {
        'zh': { 
            'title': '專業鍵盤測試工具,keyboard tester',
            'tested_keys': '已測試鍵位',
            'total_strokes': '總擊鍵次數',
            'active_keys': '當前併發(無衝)',
            'reset_data': '重置數據',
            'event_key': 'event.key',
            'event_code': 'event.code',
            'event_which': 'event.which',
            'time_delta': '點擊間隔 (ms)',
            'start': '開始',
            
            // 键盘键名缩写
            'Bksp': '倒退', 'Tab': 'Tab', 'Caps': '大寫', 'Enter': 'Enter', 'Shift': 'Shift',
            'Ctrl': 'Ctrl', 'Win': 'Win', 'Alt': 'Alt', 'Menu': 'Menu',
            'Space': 'Space',
            'PrtSc': '截圖', 'ScrLk': '鎖定', 'Pause': '暫停',
            'Ins': '插入', 'Home': 'Home', 'PgUp': '上頁',
            'Del': '刪除', 'End': 'End', 'PgDn': '下頁',
            'Num': '數字', 'Ent': 'Enter',
        },
        'en': {
            'title': 'keyboard tester',
            'tested_keys': 'TESTED KEYS',
            'total_strokes': 'TOTAL STROKES',
            'active_keys': 'ACTIVE (NKRO)',
            'reset_data': 'RESET DATA',
            'event_key': 'event.key',
            'event_code': 'event.code',
            'event_which': 'event.which',
            'time_delta': 'Time Delta (ms)',
            'start': 'Start',

            // Key labels
            'Bksp': 'Bksp', 'Tab': 'Tab', 'Caps': 'Caps', 'Enter': 'Enter', 'Shift': 'Shift',
            'Ctrl': 'Ctrl', 'Win': 'Win', 'Alt': 'Alt', 'Menu': 'Menu',
            'Space': 'Space',
            'PrtSc': 'PrtSc', 'ScrLk': 'ScrLk', 'Pause': 'Pause',
            'Ins': 'Ins', 'Home': 'Home', 'PgUp': 'PgUp',
            'Del': 'Del', 'End': 'End', 'PgDn': 'PgDn',
            'Num': 'Num', 'Ent': 'Ent',
        }
    };

    function getLanguage() {
        // 检查用户语言，将所有中文变体 (zh-TW, zh-CN, zh-HK) 映射到 'zh'
        const userLang = navigator.language || navigator.languages[0];
        if (userLang.startsWith('zh')) return 'zh';
        return 'en'; // 默认回退到英文
    }

    const currentLang = getLanguage();
    const texts = I18N[currentLang] || I18N['en']; 

    function applyLocalization() {
        // 1. 头部和统计栏
        document.title = texts.title;
        document.getElementById('i18n-title').innerText = texts.title.split(' | ')[0];
        document.getElementById('i18n-tested-keys').innerText = texts.tested_keys;
        document.getElementById('i18n-total-strokes').innerText = texts.total_strokes;
        document.getElementById('i18n-active-keys').innerText = texts.active_keys;
        document.getElementById('i18n-reset-btn').innerText = texts.reset_data;

        // 2. 信息面板标题
        document.getElementById('i18n-event-key').innerText = texts.event_key;
        document.getElementById('i18n-event-code').innerText = texts.event_code;
        document.getElementById('i18n-event-which').innerText = texts.event_which;
        document.getElementById('i18n-time-delta').innerText = texts.time_delta;

        // 3. 键盘功能键
        document.getElementById('i18n-key-backspace').innerText = texts.Bksp;
        document.getElementById('i18n-key-tab').innerText = texts.Tab;
        document.getElementById('i18n-key-caps').innerText = texts.Caps;
        document.getElementById('i18n-key-enter').innerText = texts.Enter;
        
        document.getElementById('i18n-key-lshift').innerText = texts.Shift;
        document.getElementById('i18n-key-rshift').innerText = texts.Shift;

        document.getElementById('i18n-key-lctrl').innerText = texts.Ctrl;
        document.getElementById('i18n-key-rctrl').innerText = texts.Ctrl;
        document.getElementById('i18n-key-lwin').innerText = texts.Win;
        document.getElementById('i18n-key-rwin').innerText = texts.Win;
        document.getElementById('i18n-key-lalt').innerText = texts.Alt;
        document.getElementById('i18n-key-ralt').innerText = texts.Alt;
        document.getElementById('i18n-key-menu').innerText = texts.Menu;
        document.getElementById('i18n-key-space').innerText = texts.Space; 

        // 4. 控制区小键
        document.getElementById('i18n-key-prtscr').innerText = texts.PrtSc;
        document.getElementById('i18n-key-scrlk').innerText = texts.ScrLk;
        document.getElementById('i18n-key-pause').innerText = texts.Pause;
        document.getElementById('i18n-key-ins').innerText = texts.Ins;
        document.getElementById('i18n-key-home').innerText = texts.Home;
        document.getElementById('i18n-key-pgup').innerText = texts.PgUp;
        document.getElementById('i18n-key-del').innerText = texts.Del;
        document.getElementById('i18n-key-end').innerText = texts.End;
        document.getElementById('i18n-key-pgdn').innerText = texts.PgDn;

        // 5. 数字键盘小键
        document.getElementById('i18n-key-numlk').innerText = texts.Num;
        document.getElementById('i18n-key-numpadenter').innerText = texts.Ent;
    }

    // --- 脚本逻辑 ---
    const activeCountEl = document.getElementById('count-active');
    const testedCountEl = document.getElementById('count-tested');
    const totalCountEl = document.getElementById('count-total');
    
    const infoKey = document.getElementById('info-key');
    const infoCode = document.getElementById('info-code');
    const infoWhich = document.getElementById('info-which');
    const infoTime = document.getElementById('info-time'); 

    let pressedKeys = new Set(); 
    let testedKeys = new Set(); 
    let keyCounts = {};       
    let totalKeystrokes = 0;
    
    let lastKeyTimestamp = 0;

    document.addEventListener('DOMContentLoaded', () => {
        // 初始化：为所有键位添加计数器 span
        document.querySelectorAll('.key').forEach(keyEl => {
            const counter = document.createElement('span');
            counter.className = 'key-counter';
            counter.innerText = '0';
            keyEl.appendChild(counter);
        });
        applyLocalization(); 
    });

    document.addEventListener('keydown', (e) => {
        e.preventDefault();
        
        const currentTimestamp = performance.now(); 
        let timeDelta = 0;

        // 计算时间差
        if (lastKeyTimestamp !== 0) {
            timeDelta = Math.round(currentTimestamp - lastKeyTimestamp);
            infoTime.innerText = `${timeDelta} ms`;
        } else {
            infoTime.innerText = texts.start; 
        }
        
        lastKeyTimestamp = currentTimestamp;

        const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
        
        totalKeystrokes++;
        
        if (!keyCounts[e.code]) keyCounts[e.code] = 0;
        keyCounts[e.code]++;

        if (keyEl) {
            keyEl.classList.add('active');
            keyEl.classList.add('tested');
            
            let counter = keyEl.querySelector('.key-counter');
            
            // 鲁棒性修复: 确保即使在某些情况下未找到计数器，也能立即创建并更新。
            if (!counter) {
                counter = document.createElement('span');
                counter.className = 'key-counter';
                keyEl.appendChild(counter);
            }
            counter.innerText = keyCounts[e.code];
        }

        pressedKeys.add(e.code);
        testedKeys.add(e.code);
        
        updateStats();
        updateInfo(e);
    });

    document.addEventListener('keyup', (e) => {
        e.preventDefault();
        const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
        if (keyEl) {
            keyEl.classList.remove('active');
        }
        pressedKeys.delete(e.code);
        updateStats();
    });

    function updateStats() {
        activeCountEl.innerText = pressedKeys.size;
        testedCountEl.innerText = testedKeys.size;
        totalCountEl.innerText = totalKeystrokes;
        
        // 当并发数超过6时，突出显示警告
        if (pressedKeys.size > 6) {
            activeCountEl.style.color = '#ff4444';
        } else {
            activeCountEl.style.color = '';
        }
    }

    function updateInfo(e) {
        infoKey.innerText = e.key;
        infoCode.innerText = e.code;
        infoWhich.innerText = e.which;
    }

    function resetTest() {
        pressedKeys.clear();
        testedKeys.clear();
        keyCounts = {};
        totalKeystrokes = 0;
        lastKeyTimestamp = 0; 

        // 移除所有按键的视觉状态和计数
        document.querySelectorAll('.key').forEach(el => {
            el.classList.remove('active');
            el.classList.remove('tested');
            const counter = el.querySelector('.key-counter');
            if (counter) counter.innerText = '0';
        });

        updateStats();
        infoKey.innerText = '-';
        infoCode.innerText = '-';
        infoWhich.innerText = '-';
        infoTime.innerText = '- ms'; // 重置显示
    }

    // 窗口失焦时清除按键状态，防止粘滞
    window.addEventListener('blur', () => {
        pressedKeys.clear();
        document.querySelectorAll('.key.active').forEach(el => el.classList.remove('active'));
        updateStats();
    });