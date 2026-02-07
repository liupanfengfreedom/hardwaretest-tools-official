// WebSocket 调试助手 - 增强版JavaScript逻辑
let socket = null;
let logCount = 0;
let connectionStartTime = null;
const STORAGE_KEY = 'ws_history_urls';

// DOM 元素获取
const wsUrlInput = document.getElementById('wsUrl');
const historyDropdown = document.getElementById('historyDropdown');
const connectBtn = document.getElementById('connectBtn');
const logConsole = document.getElementById('logConsole');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const connectionInfo = document.getElementById('connectionInfo');
const logCountElement = document.getElementById('logCount');
const clearBtn = document.getElementById('clearBtn');

// --- 1. 历史记录逻辑 ---
function getHistory() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : ["wss://echo.websocket.org"];
}

function saveToHistory(url) {
    let history = getHistory();
    history = history.filter(item => item !== url);
    history.unshift(url);
    history = history.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory();
}

function deleteHistoryItem(url, event) {
    event.stopPropagation();
    let history = getHistory().filter(item => item !== url);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory(wsUrlInput.value);
}

function renderHistory(filter = '') {
    const history = getHistory();
    const filtered = history.filter(item => 
        item.toLowerCase().includes(filter.toLowerCase())
    );
    
    if (filtered.length === 0) { 
        historyDropdown.style.display = 'none'; 
        return; 
    }
    
    historyDropdown.innerHTML = '';
    
    filtered.forEach(url => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <span class="url-text">${url}</span>
            <button class="delete-btn" title="删除该记录">×</button>
        `;
        item.onclick = () => { 
            wsUrlInput.value = url; 
            historyDropdown.style.display = 'none'; 
            wsUrlInput.focus();
        };
        item.querySelector('.delete-btn').onclick = (e) => deleteHistoryItem(url, e);
        historyDropdown.appendChild(item);
    });
    
    historyDropdown.style.display = 'block';
}

// --- 2. UI 更新函数 ---
function updateUI(isConnected) {
    if (isConnected) {
        connectBtn.innerHTML = '<i class="fas fa-unlink"></i> 断开连接';
        connectBtn.classList.add('connected');
        statusDot.classList.add('online');
        statusText.textContent = '已连接';
        connectionInfo.textContent = `地址: ${socket.url}`;
        messageInput.disabled = false;
        sendBtn.disabled = false;
        connectionStartTime = new Date();
    } else {
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> 建立连接';
        connectBtn.classList.remove('connected');
        statusDot.classList.remove('online');
        statusText.textContent = '未连接';
        connectionInfo.textContent = '';
        messageInput.disabled = true;
        sendBtn.disabled = true;
        socket = null;
        connectionStartTime = null;
    }
}

function updateLogCount() {
    logCountElement.textContent = `${logCount} 条记录`;
}

function appendLog(type, message) {
    logCount++;
    updateLogCount();
    
    const item = document.createElement('div');
    item.className = `log-item type-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    const typeLabel = type === 'sent' ? '发送' : 
                     type === 'received' ? '接收' : 
                     type === 'error' ? '错误' : '信息';
    
    item.innerHTML = `
        <span style="color:#888">[${timestamp}]</span> 
        <span style="font-weight:bold">[${typeLabel}]</span> 
        ${escapeHtml(message)}
    `;
    
    logConsole.appendChild(item);
    logConsole.scrollTop = logConsole.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- 3. 连接与断开逻辑 ---
connectBtn.onclick = () => {
    // 如果当前已经有连接（OPEN 或 CONNECTING 状态），则执行断开
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        appendLog('info', '正在主动关闭连接...');
        socket.close(1000, '用户主动断开');
        return;
    }

    const url = wsUrlInput.value.trim();
    if (!url) {
        alert('请输入有效的 WebSocket 地址');
        return;
    }

    // 验证URL格式
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        alert('WebSocket地址必须以 ws:// 或 wss:// 开头');
        return;
    }

    try {
        updateUI(false);
        appendLog('info', `正在连接: ${url}`);
        socket = new WebSocket(url);

        socket.onopen = () => {
            const connectionTime = new Date();
            appendLog('info', '✅ 连接成功！');
            updateUI(true);
            saveToHistory(url);
            
            // 显示连接信息
            const duration = Math.round((connectionTime - connectionStartTime) / 1000);
            connectionInfo.textContent = `${socket.url} | 连接时间: ${duration}秒`;
        };

        socket.onmessage = (e) => {
            let displayText = e.data;
            try {
                // 如果是JSON，尝试格式化显示
                const parsed = JSON.parse(e.data);
                displayText = JSON.stringify(parsed, null, 2);
            } catch (err) {
                // 不是JSON，直接显示
            }
            appendLog('received', displayText);
        };

        socket.onclose = (e) => {
            const reason = e.reason ? ` 原因: ${e.reason}` : '';
            const statusText = e.wasClean ? '正常关闭' : '异常关闭';
            appendLog('info', `连接已关闭 (${statusText}, 代码: ${e.code})${reason}`);
            updateUI(false);
        };

        socket.onerror = (err) => {
            appendLog('error', '连接发生异常，请检查地址或网络环境。');
            updateUI(false);
        };

    } catch (err) {
        appendLog('error', `创建Socket失败: ${err.message}`);
        updateUI(false);
    }
};

// --- 4. 消息发送功能 ---
sendBtn.onclick = sendMessage;
messageInput.onkeypress = (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

function sendMessage() {
    const msg = messageInput.value.trim();
    if (!msg) {
        alert('请输入要发送的消息');
        return;
    }
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            // 如果是JSON字符串，尝试解析验证
            if (msg.startsWith('{') || msg.startsWith('[')) {
                JSON.parse(msg);
            }
            socket.send(msg);
            appendLog('sent', msg);
            messageInput.value = '';
            messageInput.focus();
        } catch (err) {
            appendLog('error', `发送失败: ${err.message}`);
        }
    } else {
        appendLog('error', '发送失败：连接未开启');
        updateUI(false);
    }
}

// --- 5. 格式按钮功能 ---
document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const format = this.getAttribute('data-format');
        if (format === 'ping') {
            messageInput.value = 'ping';
        } else if (format.startsWith('{') || format.startsWith('[')) {
            try {
                const parsed = JSON.parse(format);
                messageInput.value = JSON.stringify(parsed, null, 2);
            } catch (err) {
                messageInput.value = format;
            }
        } else {
            messageInput.value = format;
        }
        messageInput.focus();
    });
});

// --- 6. 清空日志功能 ---
clearBtn.onclick = () => {
    logConsole.innerHTML = '';
    logCount = 0;
    updateLogCount();
    appendLog('info', '日志已清空');
};

// --- 7. 输入框交互 ---
wsUrlInput.onfocus = () => renderHistory(wsUrlInput.value);
wsUrlInput.oninput = () => renderHistory(wsUrlInput.value);

// 点击其他地方隐藏历史下拉框
document.addEventListener('click', (e) => {
    if (!e.target.closest('.url-input-wrapper')) {
        historyDropdown.style.display = 'none';
    }
});

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 加载历史记录
    renderHistory();
    
    // 添加初始日志
    appendLog('info', 'WebSocket调试助手已就绪');
    appendLog('info', '输入WebSocket服务器地址并点击"建立连接"开始测试');
    appendLog('info', '示例地址: wss://echo.websocket.org');
    
    // 检查浏览器支持
    if (!window.WebSocket) {
        appendLog('error', '警告：您的浏览器不支持WebSocket API');
    }
    
    // 添加键盘快捷键
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter 发送消息
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (messageInput.disabled === false) {
                sendMessage();
            }
        }
        // Ctrl/Cmd + L 清空日志
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            clearBtn.click();
        }
    });
});