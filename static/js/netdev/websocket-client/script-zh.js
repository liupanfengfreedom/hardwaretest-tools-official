// WebSocket 调试助手 - JavaScript 逻辑
let socket = null;
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
}

function deleteHistoryItem(url, event) {
    event.stopPropagation();
    let history = getHistory().filter(item => item !== url);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory(wsUrlInput.value);
}

function renderHistory(filter = '') {
    const history = getHistory();
    const filtered = history.filter(item => item.toLowerCase().includes(filter.toLowerCase()));
    
    if (filtered.length === 0) { 
        historyDropdown.style.display = 'none'; 
        return; 
    }
    
    historyDropdown.innerHTML = '';
    
    filtered.forEach(url => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<span class="url-text">${url}</span><span class="delete-btn">×</span>`;
        item.onclick = () => { 
            wsUrlInput.value = url; 
            historyDropdown.style.display = 'none'; 
        };
        item.querySelector('.delete-btn').onclick = (e) => deleteHistoryItem(url, e);
        historyDropdown.appendChild(item);
    });
    
    historyDropdown.style.display = 'block';
}

// --- 2. UI 更新函数 ---
function updateUI(isConnected) {
    if (isConnected) {
        connectBtn.textContent = '断开连接';
        connectBtn.classList.add('connected');
        statusDot.classList.add('online');
        statusText.textContent = '已连接到: ' + (socket ? socket.url : '');
        messageInput.disabled = false;
        sendBtn.disabled = false;
    } else {
        connectBtn.textContent = '建立连接';
        connectBtn.classList.remove('connected');
        statusDot.classList.remove('online');
        statusText.textContent = '当前未连接';
        messageInput.disabled = true;
        sendBtn.disabled = true;
        // 确保断开后 socket 引用被释放
        socket = null; 
    }
}

function appendLog(type, message) {
    const item = document.createElement('div');
    item.className = `log-item type-${type}`;
    item.innerHTML = `<span style="color:#888">[${new Date().toLocaleTimeString()}]</span> [${type.toUpperCase()}] ${message}`;
    logConsole.appendChild(item);
    logConsole.scrollTop = logConsole.scrollHeight;
}

// --- 3. 连接与断开逻辑 ---
connectBtn.onclick = () => {
    // 如果当前已经有连接（OPEN 或 CONNECTING 状态），则执行断开
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        appendLog('info', '正在主动关闭连接...');
        socket.close(); // 这会触发下面的 onclose 回调
        return;
    }

    const url = wsUrlInput.value.trim();
    if (!url) {
        alert('请输入有效的 WebSocket 地址');
        return;
    }

    try {
        updateUI(false); // 重置一次 UI
        appendLog('info', `准备连接: ${url}`);
        socket = new WebSocket(url);

        socket.onopen = () => {
            appendLog('info', '连接成功！');
            updateUI(true);
            saveToHistory(url);
        };

        socket.onmessage = (e) => {
            appendLog('received', e.data);
        };

        socket.onclose = (e) => {
            // e.wasClean 表示是否正常关闭，不管是否正常，都要刷新 UI
            const reason = e.reason ? ` 原因: ${e.reason}` : '';
            appendLog('info', `连接已关闭 (代码: ${e.code})${reason}`);
            updateUI(false);
        };

        socket.onerror = (err) => {
            appendLog('error', '连接发生异常，请检查地址或网络环境。');
            updateUI(false); // 发生错误也需要重置 UI
        };

    } catch (err) {
        appendLog('error', `创建 Socket 失败: ${err.message}`);
        updateUI(false);
    }
};

// 发送消息
sendBtn.onclick = sendMessage;
messageInput.onkeypress = (e) => { 
    if (e.key === 'Enter') sendMessage(); 
};

function sendMessage() {
    const msg = messageInput.value;
    if (msg && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(msg);
        appendLog('sent', msg);
        messageInput.value = '';
    } else if (!socket || socket.readyState !== WebSocket.OPEN) {
        appendLog('error', '发送失败：连接未开启');
        updateUI(false);
    }
}

// 清空日志
document.getElementById('clearBtn').onclick = () => logConsole.innerHTML = '';

// 输入框交互
wsUrlInput.onfocus = () => renderHistory(wsUrlInput.value);
wsUrlInput.oninput = () => renderHistory(wsUrlInput.value);
document.addEventListener('click', (e) => {
    if (!e.target.closest('.url-input-wrapper')) historyDropdown.style.display = 'none';
});