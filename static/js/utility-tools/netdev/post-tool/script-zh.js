// ========== 历史记录逻辑 ==========
const HISTORY_KEY = 'api_url_history';
const MAX_HISTORY = 10;

// 从本地获取
function getHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
}

// 保存（去重并将最新的排在前面）
function saveToHistory(url) {
  if (!url || url.trim() === '') return;
  let history = getHistory();
  history = [url, ...history.filter(u => u !== url)];
  history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// 删除指定项
function removeFromHistory(url) {
  let history = getHistory();
  history = history.filter(u => u !== url);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// 渲染下拉列表
function renderHistory(filter = '') {
  const history = getHistory();
  const listContainer = document.getElementById('urlHistoryList');
  const filtered = history.filter(url => 
    url.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length > 0) {
    listContainer.innerHTML = filtered.map(url => `
      <div class="history-item" data-url="${encodeURIComponent(url)}">
        <span class="history-url-text">${url}</span>
        <button class="history-delete-btn" title="删除该记录">×</button>
      </div>
    `).join('');
    listContainer.style.display = 'block';
  } else {
    listContainer.style.display = 'none';
  }
}

// ========== 核心请求函数 ==========
async function sendRequest() {
  const urlInput = document.getElementById('url');
  const url = urlInput.value.trim();
  const method = document.getElementById('method').value;
  const headersInput = document.getElementById('headers').value;
  const bodyType = document.getElementById('bodyType').value;
  const bodyData = document.getElementById('body').value.trim();

  if (!url) { alert('请输入 URL'); return; }

  // 记录历史
  saveToHistory(url);

  document.getElementById('response').textContent = '加载中...';
  document.getElementById('resHeaders').textContent = '';
  document.getElementById('status').value = '';

  let headers = {};
  try {
    headers = headersInput ? JSON.parse(headersInput) : {};
  } catch (e) {
    alert('请求头 JSON 格式错误');
    return;
  }

  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = bodyType === 'json' ? 'application/json' : 'application/x-www-form-urlencoded';
  }

  const options = { method, headers };
  if (method !== 'GET' && bodyData) options.body = bodyData;

  try {
    const res = await fetch(url, options);
    document.getElementById('status').value = `${res.status} ${res.statusText}`;
    const headerObj = {};
    res.headers.forEach((v, k) => headerObj[k] = v);
    document.getElementById('resHeaders').textContent = JSON.stringify(headerObj, null, 2);
    const text = await res.text();
    document.getElementById('response').textContent = text;
  } catch (err) {
    document.getElementById('response').textContent = err.toString();
  }
}

// ========== 键值对编辑逻辑 (请求头/请求体) ==========
function createFieldRow(containerId, key = '', value = '') {
  const container = document.getElementById(containerId);
  const row = document.createElement('div');
  row.className = 'field-row';
  
  const kInp = document.createElement('input');
  kInp.placeholder = '键名'; kInp.value = key;
  kInp.oninput = () => containerId === 'headersFields' ? updateHeadersFromFields() : updateBodyFromFields();

  const vInp = document.createElement('input');
  vInp.placeholder = '键值'; vInp.value = value;
  vInp.oninput = () => containerId === 'headersFields' ? updateHeadersFromFields() : updateBodyFromFields();

  const del = document.createElement('button');
  del.className = 'remove-btn'; del.textContent = '×';
  del.onclick = () => { row.remove(); containerId === 'headersFields' ? updateHeadersFromFields() : updateBodyFromFields(); };

  row.append(kInp, vInp, del);
  container.appendChild(row);
}

function updateHeadersFromFields() {
  const data = {};
  document.querySelectorAll('#headersFields .field-row').forEach(r => {
    const k = r.children[0].value.trim();
    if(k) data[k] = r.children[1].value;
  });
  document.getElementById('headers').value = Object.keys(data).length ? JSON.stringify(data, null, 2) : '';
}

function updateBodyFromFields() {
  const type = document.getElementById('bodyType').value;
  const data = {};
  document.querySelectorAll('#bodyFields .field-row').forEach(r => {
    const k = r.children[0].value.trim();
    if(k) data[k] = r.children[1].value;
  });
  const area = document.getElementById('body');
  if (type === 'json') {
    area.value = Object.keys(data).length ? JSON.stringify(data, null, 2) : '';
  } else {
    area.value = Object.keys(data).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`).join('&');
  }
}

// ========== 初始化与事件绑定 ==========
document.addEventListener('DOMContentLoaded', () => {
  const urlInp = document.getElementById('url');
  const histBox = document.getElementById('urlHistoryList');

  // 1. URL 输入框焦点/输入事件
  urlInp.onfocus = () => renderHistory(urlInp.value);
  urlInp.oninput = () => renderHistory(urlInp.value);

  // 2. 历史列表点击委托 (MouseDown 优先于 Blur 执行)
  histBox.onmousedown = (e) => {
    const delBtn = e.target.closest('.history-delete-btn');
    const item = e.target.closest('.history-item');
    
    if (delBtn && item) {
      e.preventDefault(); // 防止输入框失去焦点
      const targetUrl = decodeURIComponent(item.dataset.url);
      removeFromHistory(targetUrl);
      renderHistory(urlInp.value);
    } else if (item) {
      urlInp.value = item.querySelector('.history-url-text').textContent;
      histBox.style.display = 'none';
    }
  };

  // 3. 点击页面其他地方隐藏
  document.addEventListener('click', (e) => {
    if (e.target !== urlInp && !histBox.contains(e.target)) histBox.style.display = 'none';
  });

  // 其他按钮
  document.getElementById('sendRequestBtn').onclick = sendRequest;
  document.getElementById('addHeadersFieldBtn').onclick = () => createFieldRow('headersFields');
  document.getElementById('addBodyFieldBtn').onclick = () => createFieldRow('bodyFields');
  document.getElementById('bodyType').onchange = updateBodyFromFields;

  // 快捷键
  document.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendRequest(); };
});