// WebSocket Debugging Assistant - Enhanced JavaScript Logic
let socket = null;
let logCount = 0;
let connectionStartTime = null;
const STORAGE_KEY = 'ws_history_urls';

// DOM Elements
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

// --- 1. History Logic ---
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
            <button class="delete-btn" title="Delete this record">×</button>
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

// --- 2. UI Update Functions ---
function updateUI(isConnected) {
    if (isConnected) {
        connectBtn.innerHTML = '<i class="fas fa-unlink"></i> Disconnect';
        connectBtn.classList.add('connected');
        statusDot.classList.add('online');
        statusText.textContent = 'Connected';
        connectionInfo.textContent = `Address: ${socket.url}`;
        messageInput.disabled = false;
        sendBtn.disabled = false;
        connectionStartTime = new Date();
    } else {
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Establish Connection';
        connectBtn.classList.remove('connected');
        statusDot.classList.remove('online');
        statusText.textContent = 'Not Connected';
        connectionInfo.textContent = '';
        messageInput.disabled = true;
        sendBtn.disabled = true;
        socket = null;
        connectionStartTime = null;
    }
}

function updateLogCount() {
    logCountElement.textContent = `${logCount} records`;
}

function appendLog(type, message) {
    logCount++;
    updateLogCount();
    
    const item = document.createElement('div');
    item.className = `log-item type-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    const typeLabel = type === 'sent' ? 'Sent' : 
                     type === 'received' ? 'Received' : 
                     type === 'error' ? 'Error' : 'Info';
    
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

// --- 3. Connection and Disconnection Logic ---
connectBtn.onclick = () => {
    // If currently connected (OPEN or CONNECTING state), disconnect
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        appendLog('info', 'Manually closing connection...');
        socket.close(1000, 'User initiated disconnect');
        return;
    }

    const url = wsUrlInput.value.trim();
    if (!url) {
        alert('Please enter a valid WebSocket address');
        return;
    }

    // Validate URL format
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        alert('WebSocket address must start with ws:// or wss://');
        return;
    }

    try {
        updateUI(false);
        appendLog('info', `Connecting to: ${url}`);
        socket = new WebSocket(url);

        socket.onopen = () => {
            const connectionTime = new Date();
            appendLog('info', '✅ Connection successful!');
            updateUI(true);
            saveToHistory(url);
            
            // Display connection information
            const duration = Math.round((connectionTime - connectionStartTime) / 1000);
            connectionInfo.textContent = `${socket.url} | Connection time: ${duration}s`;
        };

        socket.onmessage = (e) => {
            let displayText = e.data;
            try {
                // If JSON, try to format display
                const parsed = JSON.parse(e.data);
                displayText = JSON.stringify(parsed, null, 2);
            } catch (err) {
                // Not JSON, display as is
            }
            appendLog('received', displayText);
        };

        socket.onclose = (e) => {
            const reason = e.reason ? ` Reason: ${e.reason}` : '';
            const statusText = e.wasClean ? 'Normal closure' : 'Abnormal closure';
            appendLog('info', `Connection closed (${statusText}, code: ${e.code})${reason}`);
            updateUI(false);
        };

        socket.onerror = (err) => {
            appendLog('error', 'Connection error occurred, please check address or network environment.');
            updateUI(false);
        };

    } catch (err) {
        appendLog('error', `Failed to create socket: ${err.message}`);
        updateUI(false);
    }
};

// --- 4. Message Sending Functionality ---
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
        alert('Please enter a message to send');
        return;
    }
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            // If JSON string, try to parse for validation
            if (msg.startsWith('{') || msg.startsWith('[')) {
                JSON.parse(msg);
            }
            socket.send(msg);
            appendLog('sent', msg);
            messageInput.value = '';
            messageInput.focus();
        } catch (err) {
            appendLog('error', `Send failed: ${err.message}`);
        }
    } else {
        appendLog('error', 'Send failed: Connection not open');
        updateUI(false);
    }
}

// --- 5. Format Button Functionality ---
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

// --- 6. Clear Logs Functionality ---
clearBtn.onclick = () => {
    logConsole.innerHTML = '';
    logCount = 0;
    updateLogCount();
    appendLog('info', 'Logs cleared');
};

// --- 7. Input Field Interaction ---
wsUrlInput.onfocus = () => renderHistory(wsUrlInput.value);
wsUrlInput.oninput = () => renderHistory(wsUrlInput.value);

// Click elsewhere to hide history dropdown
document.addEventListener('click', (e) => {
    if (!e.target.closest('.url-input-wrapper')) {
        historyDropdown.style.display = 'none';
    }
});

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Load history
    renderHistory();
    
    // Add initial logs
    appendLog('info', 'WebSocket Debugging Assistant ready');
    appendLog('info', 'Enter WebSocket server address and click "Establish Connection" to start testing');
    appendLog('info', 'Example address: wss://echo.websocket.org');
    
    // Check browser support
    if (!window.WebSocket) {
        appendLog('error', 'Warning: Your browser does not support WebSocket API');
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to send message
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (messageInput.disabled === false) {
                sendMessage();
            }
        }
        // Ctrl/Cmd + L to clear logs
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            clearBtn.click();
        }
    });
});