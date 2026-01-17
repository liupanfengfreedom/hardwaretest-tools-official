async function sendRequest() {
  const url = document.getElementById('url').value.trim();
  const method = document.getElementById('method').value;
  const headersInput = document.getElementById('headers').value;
  const bodyInput = document.getElementById('body').value;

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

  const options = { method, headers };

  if (method !== 'GET' && bodyInput) {
    options.body = bodyInput;
  }

  try {
    const res = await fetch(url, options);
    document.getElementById('status').value = res.status + ' ' + res.statusText;

    const headerObj = {};
    res.headers.forEach((v, k) => headerObj[k] = v);
    document.getElementById('resHeaders').textContent = JSON.stringify(headerObj, null, 2);

    const text = await res.text();
    // 直接显示返回的完整原始字符串
    document.getElementById('response').textContent = text;
  } catch (err) {
    document.getElementById('response').textContent = err.toString();
  }
}

// 绑定事件监听器
document.addEventListener('DOMContentLoaded', function() {
  const sendButton = document.getElementById('sendRequestBtn');
  if (sendButton) {
    sendButton.addEventListener('click', sendRequest);
  }
  
  // 也可以添加键盘快捷键（按Enter发送请求）
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      sendRequest();
    }
  });
});