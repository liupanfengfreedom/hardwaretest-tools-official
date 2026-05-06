let totalBytesDecrypted = 0;
  let toastTimer = null;
  let inputFileBytes = null;
  let inputFileName  = null;
  let outputRawBytes = null;

  let currentEncoding = 'base64';

  function setEncoding(btn, enc) {
    if (btn.disabled) return;
    document.querySelectorAll('.encoding-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentEncoding = enc;
  }

  function setEncodingTabsDisabled(disabled, reason) {
    const tabs = document.getElementById('encodingTabs');
    document.querySelectorAll('.encoding-tab').forEach(btn => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.35' : '';
      btn.style.cursor = disabled ? 'not-allowed' : '';
      btn.title = disabled ? (reason || '') : '';
    });
  }


  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    document.getElementById('toastIcon').textContent = type === 'success' ? '✓' : '⚠';
    document.getElementById('toastMsg').textContent = msg;
    t.className = 'toast' + (type === 'error' ? ' error-toast' : '');
    void t.offsetWidth;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ── Status ───────────────────────────────────────────────
  function setStatus(msg, type = 'idle') {
    const bar = document.getElementById('statusBar');
    bar.className = 'status-bar' + (type !== 'idle' ? ' ' + type : '');
    document.getElementById('statusText').textContent = msg;
    document.getElementById('statusTime').textContent = type !== 'idle' ? new Date().toLocaleTimeString() : '';
    if (type === 'error') {
      void bar.offsetWidth;
      bar.classList.add('shake');
      bar.addEventListener('animationend', () => bar.classList.remove('shake'), { once: true });
    }
  }

  // ── Hints ────────────────────────────────────────────────
  function updateHints(clearIV = false) {
    const ks   = parseInt(document.getElementById('keySize').value);
    const mode = document.getElementById('mode').value;
    const keyHexChars = ks / 4;
    document.getElementById('keyHint').innerHTML =
      `Hex 密钥需 <span id="keyLengthHint">${keyHexChars}</span> 字符 (${ks / 8} bytes)`;

    const ivBytes    = mode === 'GCM' ? 12 : 16;
    const ivHexChars = ivBytes * 2;
    document.getElementById('ivLengthHint').textContent = ivHexChars;

    if (clearIV) {
      document.getElementById('iv').value = '';
      showToast('模式已切换，请重新确认 IV', 'error');
    }

    document.getElementById('infoKeySize').textContent = ks;
    document.getElementById('infoMode').textContent    = mode + ' Mode';

    const sec    = ks >= 256 ? 'HIGH' : ks >= 192 ? 'MEDIUM' : 'STANDARD';
    const secSub = ks >= 256 ? 'Military Grade' : ks >= 192 ? 'Government Grade' : 'Standard Grade';
    document.getElementById('infoSecurity').textContent = sec;
    document.getElementById('infoSecSub').textContent   = secSub;
  }

  document.getElementById('mode').addEventListener('change', () => updateHints(true));
  document.getElementById('keySize').addEventListener('change', () => updateHints(false));

  // ── File handling ────────────────────────────────────────
  function triggerFileInput() {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInput').click();
  }

  function handleFileInput(input) {
    const file = input.files[0];
    if (file) loadFile(file);
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      inputFileBytes = new Uint8Array(e.target.result);
      inputFileName  = file.name;

      // Detect if file is plain text:
      // .enc extension → always binary; otherwise check for null bytes or
      // high density of non-printable chars (> 10%) which UTF-8 alone can't catch
      let isText = false;
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'enc') {
        try {
          new TextDecoder('utf-8', { fatal: true }).decode(inputFileBytes);
          // Extra guard: null bytes or >10% non-printable → binary
          const sample = inputFileBytes.slice(0, 512);
          const nonPrintable = Array.from(sample).filter(b => b === 0 || (b < 32 && b !== 9 && b !== 10 && b !== 13)).length;
          if (nonPrintable / sample.length < 0.1) isText = true;
        } catch {}
      }

      if (isText) {
        isTextFile = true;
        // Show actual text content, keep tabs enabled, prompt user to pick format
        const text = new TextDecoder('utf-8').decode(inputFileBytes);
        document.getElementById('inputText').value = text;
        setEncodingTabsDisabled(false);
        showFormatHint(true);
      } else {
        isTextFile = false;
        // Binary file — show hex preview, disable tabs
        document.getElementById('inputText').value =
          '[二进制文件 — ' + inputFileBytes.length + ' bytes]\n\n' +
          Array.from(inputFileBytes.slice(0, 128)).map(b => b.toString(16).padStart(2,'0')).join(' ') +
          (inputFileBytes.length > 128 ? '\n...' : '');
        setEncodingTabsDisabled(true, '已上传二进制文件，编码选项不适用');
        showFormatHint(false);
      }

      document.getElementById('inputText').readOnly = true;
      document.getElementById('inputText').style.opacity = '0.7';
      document.getElementById('inputText').style.cursor = 'default';
      const clearBtn = document.getElementById('clearInputBtn');
      clearBtn.disabled = true;
      clearBtn.style.opacity = '0.25';
      clearBtn.style.cursor = 'not-allowed';
      const pasteBtn = document.getElementById('pasteInputBtn');
      pasteBtn.disabled = true;
      pasteBtn.style.opacity = '0.25';
      pasteBtn.style.cursor = 'not-allowed';
      document.getElementById('inputStat').textContent = formatBytes(inputFileBytes.length);
      document.getElementById('inputFileBadge').style.display = 'flex';
      document.getElementById('inputFileName').textContent = file.name;
      showToast(`已加载: ${file.name}`);
    };
    reader.readAsArrayBuffer(file);
  }

  function showFormatHint(show) {
    let el = document.getElementById('formatHintBar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'formatHintBar';
      el.style.cssText = `
        padding: 7px 18px;
        background: rgba(255,184,48,0.07);
        border-top: 1px solid rgba(255,184,48,0.25);
        font-family: var(--mono);
        font-size: 11px;
        color: var(--accent3);
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: 0.3px;
      `;
      el.innerHTML = `<span style="font-size:13px">⚠</span> 已读取文本文件内容 — 请在右下角选择 <strong>BASE64</strong> 或 <strong>HEX</strong> 以告知工具密文的编码格式`;
      // Insert before io-footer
      const footer = document.querySelector('.input-panel .io-footer');
      footer.parentNode.insertBefore(el, footer);
    }
    el.style.display = show ? 'flex' : 'none';
  }

  function clearFileInput() {
    inputFileBytes = null;
    inputFileName  = null;
    isTextFile     = false;
    const ta = document.getElementById('inputText');
    ta.value    = '';
    ta.readOnly = false;
    ta.style.opacity = '';
    ta.style.cursor  = '';
    const clearBtn = document.getElementById('clearInputBtn');
    clearBtn.disabled = false;
    clearBtn.style.opacity = '';
    clearBtn.style.cursor  = '';
    const pasteBtn = document.getElementById('pasteInputBtn');
    pasteBtn.disabled = false;
    pasteBtn.style.opacity = '';
    pasteBtn.style.cursor  = '';
    document.getElementById('inputStat').textContent = '0 bytes';
    document.getElementById('inputFileBadge').style.display = 'none';
    document.getElementById('fileInput').value = '';
    setEncodingTabsDisabled(false);
    showFormatHint(false);
    showToast('已清除文件');
  }

  // Drag & drop
  const inputPanel = document.getElementById('inputPanel');
  const dropZone   = document.getElementById('dropZone');

  inputPanel.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) dropZone.classList.add('active');
  });
  inputPanel.addEventListener('dragover', (e) => e.preventDefault());
  inputPanel.addEventListener('dragleave', (e) => {
    if (!inputPanel.contains(e.relatedTarget)) dropZone.classList.remove('active');
  });
  inputPanel.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  // ── IO helpers ───────────────────────────────────────────
  function clearInput() {
    if (inputFileBytes) { clearFileInput(); return; }
    document.getElementById('inputText').value = '';
    document.getElementById('inputStat').textContent = '0 bytes';
    setStatus('就绪 — 输入密钥、IV 和密文后点击解密');
  }

  async function pasteInput() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('inputText').value = text;
      document.getElementById('inputStat').textContent =
        new TextEncoder().encode(text).length + ' bytes';
      showToast('已粘贴');
    } catch {
      showToast('无法访问剪贴板', 'error');
    }
  }

  document.getElementById('inputText').addEventListener('input', function() {
    document.getElementById('inputStat').textContent =
      new TextEncoder().encode(this.value).length + ' bytes';
  });

  // ── Crypto helpers ───────────────────────────────────────
  function hexToBytes(hex) {
    hex = hex.replace(/\s/g, '');
    if (hex.length % 2 !== 0) throw new Error('Hex 字符串长度必须为偶数');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2)
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes;
  }

  function getKeyBytes() {
    const keyStr = document.getElementById('secretKey').value.replace(/\s/g, '');
    const ks = parseInt(document.getElementById('keySize').value);
    const neededHexChars = ks / 4;
    if (!keyStr) throw new Error('请输入密钥');
    if (!/^[0-9a-fA-F]+$/.test(keyStr))
      throw new Error(`密钥必须是 hex 格式（0-9, a-f），请重新生成或修正输入`);
    if (keyStr.length !== neededHexChars)
      throw new Error(`${ks}-bit 密钥需要 ${neededHexChars} 个 hex 字符，当前 ${keyStr.length} 个`);
    return hexToBytes(keyStr);
  }

  function getIVBytes() {
    const ivStr = document.getElementById('iv').value.replace(/\s/g, '');
    const mode  = document.getElementById('mode').value;
    const neededBytes    = mode === 'GCM' ? 12 : 16;
    const neededHexChars = neededBytes * 2;
    if (!ivStr) throw new Error(`请输入 IV（${mode} 模式需要 ${neededHexChars} 个 hex 字符）`);
    if (!/^[0-9a-fA-F]+$/.test(ivStr))
      throw new Error('IV 必须是 hex 格式（0-9, a-f）');
    if (ivStr.length !== neededHexChars)
      throw new Error(`${mode} 模式 IV 需要 ${neededHexChars} 个 hex 字符，当前 ${ivStr.length} 个`);
    return hexToBytes(ivStr);
  }

  let isTextFile = false; // true when uploaded file is readable text

  function getCipherBytes() {
    // Binary file — use raw bytes directly, no encoding decoding needed
    if (inputFileBytes && !isTextFile) return inputFileBytes;
    // Text file or manual input — decode textarea content per selected encoding
    const text = document.getElementById('inputText').value.trim();
    if (!text) throw new Error('请输入密文');
    const enc = currentEncoding;
    if (enc === 'hex') {
      const clean = text.replace(/\s/g, '');
      if (!/^[0-9a-fA-F]+$/.test(clean))
        throw new Error('HEX_INVALID_CHARS');
      if (clean.length % 2 !== 0)
        throw new Error('HEX_ODD_LENGTH');
      return hexToBytes(clean);
    }
    // base64
    try {
      const raw = atob(text);
      return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
    } catch {
      throw new Error('Base64 格式无效，请检查密文内容');
    }
  }

  async function getCryptoAlgo(mode, ivBytes) {
    if (mode === 'CBC') return { name: 'AES-CBC', iv: ivBytes };
    if (mode === 'CTR') return { name: 'AES-CTR', counter: ivBytes, length: 64 };
    if (mode === 'GCM') return { name: 'AES-GCM', iv: ivBytes };
    throw new Error('不支持的模式');
  }

  async function importKey(keyBytes, mode) {
    const algoName = mode === 'CTR' ? 'AES-CTR' : mode === 'GCM' ? 'AES-GCM' : 'AES-CBC';
    return await crypto.subtle.importKey('raw', keyBytes, { name: algoName }, false, ['decrypt']);
  }

  // ── Validation flash ─────────────────────────────────────
  function flashField(el) {
    el.classList.remove('field-error');
    void el.offsetWidth;
    el.classList.add('field-error');
    el.addEventListener('animationend', () => el.classList.remove('field-error'), { once: true });
  }

  function validateFields() {
    let ok = true;
    const key = document.getElementById('secretKey');
    const iv  = document.getElementById('iv');
    const txt = document.getElementById('inputText');
    if (!key.value.trim()) { flashField(key); ok = false; }
    if (!iv.value.trim())  { flashField(iv);  ok = false; }
    if (!txt.value.trim() && !inputFileBytes) { flashField(txt); ok = false; }
    return ok;
  }

  // ── DECRYPT ──────────────────────────────────────────────
  async function runDecrypt() {
    if (!validateFields()) return;
    const outPanel = document.querySelector('.output-panel');
    try {
      outPanel.classList.add('processing');
      const mode      = document.getElementById('mode').value;
      const keyBytes  = getKeyBytes();
      const ivBytes   = getIVBytes();
      const cipherBytes = getCipherBytes();
      const algo      = await getCryptoAlgo(mode, ivBytes);
      const cryptoKey = await importKey(keyBytes, mode);
      const decrypted = await crypto.subtle.decrypt(algo, cryptoKey, cipherBytes);
      const decBytes  = new Uint8Array(decrypted);

      outputRawBytes = decBytes;

      // Try to render as text
      let result;
      try {
        result = new TextDecoder('utf-8', { fatal: true }).decode(decBytes);
        document.getElementById('outputText').value = result;
        document.getElementById('outputFormat').textContent = 'UTF-8';
        document.getElementById('outputStat').textContent = formatBytes(result.length);
      } catch {
        // Binary result — show hex preview
        result = Array.from(decBytes).map(b => b.toString(16).padStart(2,'0')).join(' ');
        document.getElementById('outputText').value =
          '[二进制结果 — ' + decBytes.length + ' bytes]\n\n' + result.slice(0, 512) +
          (result.length > 512 ? '\n...' : '');
        document.getElementById('outputFormat').textContent = 'BINARY';
        document.getElementById('outputStat').textContent = formatBytes(decBytes.length);
      }

      // Show download strip
      const strip = document.getElementById('outputFileStrip');
      if (inputFileName) {
        const base = inputFileName.replace(/\.enc$/i, '') || 'decrypted';
        document.getElementById('outputFileLabel').textContent = base + ' — 解密完成，可下载';
        strip.classList.add('visible');
      } else {
        strip.classList.remove('visible');
      }

      totalBytesDecrypted += decBytes.length;
      animateCounter(totalBytesDecrypted);
      setStatus(`✓ 解密成功 — ${formatBytes(cipherBytes.length)} → ${formatBytes(decBytes.length)} (${mode}/AES-${document.getElementById('keySize').value})`, 'success');
    } catch(e) {
      // Clear output and flash red border
      document.getElementById('outputText').value = '';
      document.getElementById('outputStat').textContent = '0 bytes';
      document.getElementById('outputFormat').textContent = '—';
      document.getElementById('outputFileStrip').classList.remove('visible');
      const outPanel = document.querySelector('.output-panel');
      outPanel.classList.remove('output-error');
      void outPanel.offsetWidth;
      outPanel.classList.add('output-error');
      outPanel.addEventListener('animationend', () => outPanel.classList.remove('output-error'), { once: true });

      // Smart error diagnosis
      const mode = document.getElementById('mode').value;
      const rawMsg = e.message || '';
      const msg = rawMsg.toLowerCase();
      let friendly;

      if (rawMsg === 'HEX_ODD_LENGTH') {
        friendly = '密文已损坏 — Hex 字符数为奇数，可能被意外截断或篡改';
        flashField(document.getElementById('inputText'));
      } else if (rawMsg === 'HEX_INVALID_CHARS') {
        friendly = 'Hex 密文含非法字符 — 只允许 0–9 和 a–f';
        flashField(document.getElementById('inputText'));
      } else if (msg.includes('operation-specific') || msg.includes('operationerror') || msg.includes('decrypt')) {
        friendly = mode === 'GCM'
          ? 'GCM 认证失败 — 密钥或 IV 不正确，或密文在传输中被篡改'
          : '解密失败 — 请检查密钥、IV 和加密模式是否与加密时完全一致';
      } else if (msg.includes('base64') || msg.includes('invalid')) {
        friendly = '密文格式错误 — 请确认编码格式选择（BASE64 / HEX）是否正确';
        flashField(document.getElementById('inputText'));
      } else if (rawMsg.includes('密钥')) {
        friendly = rawMsg;
        flashField(document.getElementById('secretKey'));
      } else if (rawMsg.includes('IV') || rawMsg.includes('Nonce')) {
        friendly = rawMsg;
        flashField(document.getElementById('iv'));
      } else {
        friendly = rawMsg;
      }

      setStatus('✗ ' + friendly, 'error');
      showToast('解密失败', 'error');
    } finally {
      outPanel.classList.remove('processing');
    }
  }

  function animateCounter(target) {
    const el = document.getElementById('infoBytes');
    const prev = parseInt(el.textContent) || 0;
    let current = prev;
    const step = Math.ceil((target - current) / 10);
    const t = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(t);
    }, 50);
  }

  // ── Output download ──────────────────────────────────────
  function downloadOutputFile() {
    if (!outputRawBytes) { showToast('暂无解密数据', 'error'); return; }
    const base = inputFileName ? inputFileName.replace(/\.enc$/i, '') : 'decrypted';
    const blob = new Blob([outputRawBytes], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = base;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('文件下载中: ' + base);
  }

  function downloadOutputText() {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('无内容可下载', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'decrypted_' + Date.now() + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('下载中...');
  }

  async function pasteField(fieldId) {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById(fieldId).value = text.trim();
      showToast('已粘贴');
    } catch {
      showToast('无法访问剪贴板', 'error');
    }
  }


  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }

  function copyField(fieldId, btn) {
    const val = document.getElementById(fieldId).value;
    if (!val) { showToast('字段为空', 'error'); return; }
    const doSuccess = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.classList.add('copied');
      showToast('已复制');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1800);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(val).then(doSuccess).catch(() => fallbackCopy(val) ? doSuccess() : showToast('复制失败', 'error'));
    else
      fallbackCopy(val) ? doSuccess() : showToast('复制失败', 'error');
  }

  function copyOutput(btn) {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('无内容可复制', 'error'); return; }
    const doSuccess = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.style.borderColor = 'var(--accent)';
      btn.style.color = 'var(--accent)';
      showToast('已复制到剪贴板');
      setTimeout(() => { btn.innerHTML = orig; btn.style.borderColor = ''; btn.style.color = ''; }, 1800);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(text).then(doSuccess).catch(() => fallbackCopy(text) ? doSuccess() : showToast('复制失败', 'error'));
    else
      fallbackCopy(text) ? doSuccess() : showToast('复制失败', 'error');
  }

  // ── Init ─────────────────────────────────────────────────
  updateHints(false);

  function toggleKeyVisibility() {
    const input = document.getElementById('secretKey');
    const showIcon = document.getElementById('eyeIconShow');
    const hideIcon = document.getElementById('eyeIconHide');
    if (input.type === 'password') {
      input.type = 'text';
      showIcon.style.display = 'none';
      hideIcon.style.display = '';
    } else {
      input.type = 'password';
      showIcon.style.display = '';
      hideIcon.style.display = 'none';
    }
  }

  async function pasteJsonConfig() {
    let text;
    try { text = await navigator.clipboard.readText(); }
    catch { showToast('无法访问剪贴板', 'error'); return; }
    try {
      text = text.replace(/```[a-z]*\n?/g, '').trim();
      applyConfig(JSON.parse(text));
    } catch {
      showToast('剪贴板内容不是有效的 JSON', 'error');
    }
  }

  function triggerConfigUpload() {
    document.getElementById('configFileInput').value = '';
    document.getElementById('configFileInput').click();
  }

  function loadConfigFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const cfg = JSON.parse(e.target.result);
        applyConfig(cfg);
      } catch {
        showToast('JSON 文件格式无效', 'error');
      }
    };
    reader.readAsText(file);
  }

  function applyConfig(cfg) {
    let applied = [];
    if (cfg.mode && ['CBC','CTR','GCM'].includes(cfg.mode)) {
      document.getElementById('mode').value = cfg.mode;
      applied.push('Mode');
    }
    if (cfg.keySize && ['128','192','256'].includes(String(cfg.keySize))) {
      document.getElementById('keySize').value = String(cfg.keySize);
      applied.push('Key Size');
    }
    if (cfg.padding && ['PKCS7','ZERO'].includes(cfg.padding)) {
      document.getElementById('padding').value = cfg.padding;
      applied.push('Padding');
    }
    if (cfg.key) {
      document.getElementById('secretKey').value = cfg.key;
      applied.push('Key');
    }
    if (cfg.iv) {
      document.getElementById('iv').value = cfg.iv;
      applied.push('IV');
    }
    if (cfg.encoding && ['base64','hex'].includes(cfg.encoding)) {
      currentEncoding = cfg.encoding;
      document.querySelectorAll('.encoding-tab').forEach(b => b.classList.remove('active'));
      const tab = document.querySelector(`.encoding-tab[data-enc="${cfg.encoding}"]`);
      if (tab) tab.classList.add('active');
      applied.push('编码');
    }
    if (applied.length === 0) {
      showToast('JSON 中未找到可识别的配置字段', 'error'); return;
    }
    updateHints(false);
    showToast(`已填充: ${applied.join(' / ')}`);
  }
