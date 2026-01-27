// ========== History Logic ==========
const HISTORY_KEY = 'api_url_history';
const MAX_HISTORY = 10;

// Get from local storage
function getHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
}

// Save (deduplicate and put newest first)
function saveToHistory(url) {
  if (!url || url.trim() === '') return;
  let history = getHistory();
  history = [url, ...history.filter(u => u !== url)];
  history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// Remove specific item
function removeFromHistory(url) {
  let history = getHistory();
  history = history.filter(u => u !== url);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// Render dropdown list
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
        <button class="history-delete-btn" title="Delete this record">×</button>
      </div>
    `).join('');
    listContainer.style.display = 'block';
  } else {
    listContainer.style.display = 'none';
  }
}

// ========== Core Request Function ==========
async function sendRequest() {
  const urlInput = document.getElementById('url');
  const url = urlInput.value.trim();
  const method = document.getElementById('method').value;
  const headersInput = document.getElementById('headers').value;
  const bodyType = document.getElementById('bodyType').value;
  const bodyData = document.getElementById('body').value.trim();

  if (!url) { alert('Please enter URL'); return; }

  // Record history
  saveToHistory(url);

  document.getElementById('response').textContent = 'Loading...';
  document.getElementById('resHeaders').textContent = '';
  document.getElementById('status').value = '';

  let headers = {};
  try {
    headers = headersInput ? JSON.parse(headersInput) : {};
  } catch (e) {
    alert('Request headers JSON format error');
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

// ========== Key-Value Pair Editing Logic (Request Headers/Body) ==========
function createFieldRow(containerId, key = '', value = '') {
  const container = document.getElementById(containerId);
  const row = document.createElement('div');
  row.className = 'field-row';
  
  const kInp = document.createElement('input');
  kInp.placeholder = 'Key'; kInp.value = key;
  kInp.oninput = () => containerId === 'headersFields' ? updateHeadersFromFields() : updateBodyFromFields();

  const vInp = document.createElement('input');
  vInp.placeholder = 'Value'; vInp.value = value;
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

// ========== Initialization & Event Binding ==========
document.addEventListener('DOMContentLoaded', () => {
  const urlInp = document.getElementById('url');
  const histBox = document.getElementById('urlHistoryList');

  // 1. URL input focus/input events
  urlInp.onfocus = () => renderHistory(urlInp.value);
  urlInp.oninput = () => renderHistory(urlInp.value);

  // 2. History list click delegation (MouseDown executes before Blur)
  histBox.onmousedown = (e) => {
    const delBtn = e.target.closest('.history-delete-btn');
    const item = e.target.closest('.history-item');
    
    if (delBtn && item) {
      e.preventDefault(); // Prevent input field from losing focus
      const targetUrl = decodeURIComponent(item.dataset.url);
      removeFromHistory(targetUrl);
      renderHistory(urlInp.value);
    } else if (item) {
      urlInp.value = item.querySelector('.history-url-text').textContent;
      histBox.style.display = 'none';
    }
  };

  // 3. Click elsewhere to hide
  document.addEventListener('click', (e) => {
    if (e.target !== urlInp && !histBox.contains(e.target)) histBox.style.display = 'none';
  });

  // Other buttons
  document.getElementById('sendRequestBtn').onclick = sendRequest;
  document.getElementById('addHeadersFieldBtn').onclick = () => createFieldRow('headersFields');
  document.getElementById('addBodyFieldBtn').onclick = () => createFieldRow('bodyFields');
  document.getElementById('bodyType').onchange = updateBodyFromFields;

  // Keyboard shortcuts
  document.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendRequest(); };
});