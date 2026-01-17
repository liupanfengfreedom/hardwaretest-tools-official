const isDev = window.location.hostname === "127.0.0.1";
const myLog = (...args) => {
  if (isDev) console.log(...args);
};

// ========== 通用函数 ==========
function createFieldRow(containerId, key = '', value = '') {
  const container = document.getElementById(containerId);
  const row = document.createElement('div');
  row.className = 'field-row';

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'field-key';
  keyInput.placeholder = 'Key';
  keyInput.value = key;
  keyInput.addEventListener('input', () => {
    if (containerId === 'headersFields') updateHeadersFromFields();
    else updateBodyFromFields();
  });

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.className = 'field-value';
  valueInput.placeholder = 'Value';
  valueInput.value = value;
  valueInput.addEventListener('input', () => {
    if (containerId === 'headersFields') updateHeadersFromFields();
    else updateBodyFromFields();
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '×';
  removeBtn.onclick = function () {
    container.removeChild(row);
    if (containerId === 'headersFields') {
      updateHeadersFromFields();
    } else {
      updateBodyFromFields();
    }
  };

  row.appendChild(keyInput);
  row.appendChild(valueInput);
  row.appendChild(removeBtn);
  container.appendChild(row);

  return row;
}

// ========== Headers 相关函数 ==========
function addHeadersFieldRow(key = '', value = '') {
  return createFieldRow('headersFields', key, value);
}

function updateHeadersFromFields() {
  const headersTextarea = document.getElementById('headers');
  const fieldRows = document.querySelectorAll('#headersFields .field-row');
  const headersData = {};

  fieldRows.forEach(row => {
    const key = row.querySelector('.field-key').value.trim();
    const value = row.querySelector('.field-value').value.trim();
    if (key) {
      if (value === 'true') headersData[key] = true;
      else if (value === 'false') headersData[key] = false;
      else if (value === 'null') headersData[key] = null;
      else if (!isNaN(value) && value !== '') headersData[key] = Number(value);
      else if (value.startsWith('{') || value.startsWith('[')) {
        try { headersData[key] = JSON.parse(value); } catch { headersData[key] = value; }
      } else {
        headersData[key] = value;
      }
    }
  });

  headersTextarea.value = Object.keys(headersData).length > 0
    ? JSON.stringify(headersData, null, 2)
    : '';
}

// ========== Body 相关函数 ==========
function addBodyFieldRow(key = '', value = '') {
  return createFieldRow('bodyFields', key, value);
}

function updateBodyFromFields() {
  const bodyType = document.getElementById('bodyType').value;
  const bodyTextarea = document.getElementById('body');
  const fieldRows = document.querySelectorAll('#bodyFields .field-row');
  const bodyData = {};

  fieldRows.forEach(row => {
    const key = row.querySelector('.field-key').value.trim();
    const value = row.querySelector('.field-value').value.trim();
    if (key) {
      if (bodyType === 'json') {
        if (value === 'true') bodyData[key] = true;
        else if (value === 'false') bodyData[key] = false;
        else if (value === 'null') bodyData[key] = null;
        else if (!isNaN(value) && value !== '') bodyData[key] = Number(value);
        else if (value.startsWith('{') || value.startsWith('[')) {
          try { bodyData[key] = JSON.parse(value); } catch { bodyData[key] = value; }
        } else {
          bodyData[key] = value;
        }
      } else {
        bodyData[key] = value;
      }
    }
  });

  if (bodyType === 'json') {
    bodyTextarea.value = Object.keys(bodyData).length > 0
      ? JSON.stringify(bodyData, null, 2)
      : '';
  } else {
    bodyTextarea.value = Object.keys(bodyData)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(bodyData[key]))
      .join('&');
  }
}

async function sendRequest() {
  const url = document.getElementById('url').value.trim();
  const method = document.getElementById('method').value;
  const headersInput = document.getElementById('headers').value;
  const bodyType = document.getElementById('bodyType').value;
  const bodyData = document.getElementById('body').value.trim();

  if (!url) { alert('请输入 URL'); return; }

  document.getElementById('response').textContent = 'Loading...';
  document.getElementById('resHeaders').textContent = '';
  document.getElementById('status').value = '';

  let headers = {};
  try {
    headers = headersInput ? JSON.parse(headersInput) : {};
  } catch (e) {
    alert('Headers JSON 格式错误');
    return;
  }

  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = bodyType === 'json' ? 'application/json' : 'application/x-www-form-urlencoded';
  }

  const options = { method, headers };
  if (method !== 'GET' && bodyData) {
    options.body = bodyData;
  }

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

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', function () {
  // 按钮事件绑定
  document.getElementById('sendRequestBtn').addEventListener('click', sendRequest);
  
  // Headers 相关按钮
  document.getElementById('addHeadersFieldBtn').addEventListener('click', () => {
    addHeadersFieldRow();
  });
  
  // Body 相关按钮
  document.getElementById('addBodyFieldBtn').addEventListener('click', () => {
    addBodyFieldRow();
  });
  
  document.getElementById('bodyType').addEventListener('change', updateBodyFromFields);

  // 快捷键 Ctrl+Enter 发送
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendRequest();
  });
});