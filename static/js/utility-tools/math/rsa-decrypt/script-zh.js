let totalBytesDecrypted = 0;
  let toastTimer = null;
  let inputFileBytes = null;
  let inputFileName  = null;
  let outputRawBytes = null;
  let currentEncoding = 'base64';
  let keyVisible = false;

  // ── PEM / DER helpers ────────────────────────────────────
  function pemToDer(pem) {
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  // ── Key visibility toggle ────────────────────────────────
  function triggerPemUpload() {
    document.getElementById('pemFileInput').value = '';
    document.getElementById('pemFileInput').click();
  }

  function loadPemFile(input) {
    const file = input.files[0];
    if (!file) return;

    const errorBar   = document.getElementById('pemErrorBar');
    const errorMsg   = document.getElementById('pemErrorMsg');
    const successBar = document.getElementById('pemSuccessBar');
    const successMsg = document.getElementById('pemSuccessMsg');

    errorBar.style.display   = 'none';
    successBar.style.display = 'none';

    // ── 1. Size guard ────────────────────────────────────────────────────────
    if (file.size > 5 * 1024 * 1024) {
      pemError(`文件过大（${(file.size/1024).toFixed(1)} KB）— PEM 私钥文件通常不超过 10 KB，请确认文件正确`);
      return;
    }

    function pemError(msg) {
      errorMsg.textContent = msg;
      errorBar.style.display = 'flex';
    }

    // ── 2. Binary sniff: read first 512 bytes as Uint8Array ──────────────────
    const sniffReader = new FileReader();
    sniffReader.onload = function(ev) {
      const bytes = new Uint8Array(ev.target.result);
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        // Allow printable ASCII (32-126), CR (13), LF (10), TAB (9)
        if (b < 9 || (b > 13 && b < 32) || b === 127) {
          pemError(`「${file.name}」包含二进制内容，不是文本文件 — PEM 私钥必须是纯 ASCII 文本文件`);
          return;
        }
      }
      // Passed binary check — now read as text
      const textReader = new FileReader();
      textReader.onload = function(e) { validatePemText(e.target.result); };
      textReader.onerror = function() { pemError(`无法读取文件「${file.name}」，请重试`); };
      textReader.readAsText(file);
    };
    sniffReader.onerror = function() { pemError(`无法读取文件「${file.name}」，请重试`); };
    sniffReader.readAsArrayBuffer(file.slice(0, 512));

    function validatePemText(text) {
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

      // ── 3. Find header line ───────────────────────────────────────────────
      // Must be exactly: -----BEGIN <LABEL>-----   (5 dashes each side, no extra)
      const headerRe = /^(-{5})BEGIN ([A-Z][A-Z0-9 ]*)(-{5})$/;
      let headerIdx = -1, label = '';
      for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t.startsWith('-')) {
          const m = t.match(headerRe);
          if (!m) {
            // Starts with dash but malformed — pinpoint the problem
            if (/^-+BEGIN/.test(t) && !/^-{5}BEGIN/.test(t)) {
              const cnt = (t.match(/^-+/)[0]).length;
              pemError(`「${file.name}」格式错误 — BEGIN 前的连字符数量为 ${cnt} 个，PEM 要求恰好 5 个（-----）`);
            } else if (/BEGIN.+-+$/.test(t) && !/BEGIN.+-{5}$/.test(t)) {
              const cnt = (t.match(/-+$/)[0]).length;
              pemError(`「${file.name}」格式错误 — BEGIN 后的连字符数量为 ${cnt} 个，PEM 要求恰好 5 个（-----）`);
            } else {
              pemError(`「${file.name}」格式错误 — 标题行「${t.slice(0,60)}」不符合 PEM 规范（正确格式：-----BEGIN PRIVATE KEY-----）`);
            }
            return;
          }
          headerIdx = i;
          label = m[2];
          break;
        }
      }
      if (headerIdx === -1) {
        pemError(`「${file.name}」不是 PEM 文件 — 找不到 -----BEGIN ...----- 标题行，请上传正确的私钥文件`);
        return;
      }

      // ── 4. Label must be a private key ───────────────────────────────────
      if (label === 'CERTIFICATE') {
        pemError(`「${file.name}」是证书文件（CERTIFICATE），不是私钥 — 请上传 -----BEGIN PRIVATE KEY----- 或 -----BEGIN RSA PRIVATE KEY----- 的私钥文件`);
        return;
      }
      if (label === 'PUBLIC KEY' || label === 'RSA PUBLIC KEY') {
        pemError(`「${file.name}」是公钥文件（${label}），解密需要私钥 — 请上传以 -----BEGIN PRIVATE KEY----- 开头的私钥文件`);
        return;
      }
      if (label !== 'PRIVATE KEY' && label !== 'RSA PRIVATE KEY' && label !== 'ENCRYPTED PRIVATE KEY') {
        pemError(`「${file.name}」的 PEM 类型为「${label}」，不是受支持的私钥类型 — 需要 PRIVATE KEY 或 RSA PRIVATE KEY`);
        return;
      }

      // ── 5. Find footer line ───────────────────────────────────────────────
      const footerRe = /^(-{5})END ([A-Z][A-Z0-9 ]*)(-{5})$/;
      let footerIdx = -1, footerLabel = '';
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t.startsWith('-')) {
          const m = t.match(footerRe);
          if (!m) {
            if (/^-+END/.test(t) && !/^-{5}END/.test(t)) {
              const cnt = (t.match(/^-+/)[0]).length;
              pemError(`「${file.name}」格式错误 — END 前的连字符数量为 ${cnt} 个，PEM 要求恰好 5 个（-----）`);
            } else if (/END.+-+$/.test(t) && !/END.+-{5}$/.test(t)) {
              const cnt = (t.match(/-+$/)[0]).length;
              pemError(`「${file.name}」格式错误 — END 后的连字符数量为 ${cnt} 个，PEM 要求恰好 5 个（-----）`);
            } else {
              pemError(`「${file.name}」格式错误 — 结尾行「${t.slice(0,60)}」不符合 PEM 规范（正确格式：-----END PRIVATE KEY-----）`);
            }
            return;
          }
          footerIdx = i;
          footerLabel = m[2];
          break;
        }
      }
      if (footerIdx === -1) {
        pemError(`「${file.name}」格式不完整 — 找到了 BEGIN 标题行，但缺少对应的 -----END ${label}----- 结尾行`);
        return;
      }

      // ── 6. BEGIN / END labels must match ────────────────────────────────
      if (label !== footerLabel) {
        pemError(`「${file.name}」格式错误 — BEGIN 标签（${label}）与 END 标签（${footerLabel}）不一致，文件可能已损坏`);
        return;
      }

      // ── 7. Validate Base64 body ──────────────────────────────────────────
      const base64Re = /^[A-Za-z0-9+/]+=*$/;
      for (let i = headerIdx + 1; i < footerIdx; i++) {
        const ln = lines[i].trim();
        if (ln === '') continue;
        if (ln.length > 76) {
          pemError(`「${file.name}」格式错误 — 第 ${i+1} 行长度为 ${ln.length} 字符，PEM Base64 每行不得超过 76 字符（文件可能已损坏或不是标准 PEM）`);
          return;
        }
        if (!base64Re.test(ln)) {
          // Find the offending character for a precise message
          const bad = ln.match(/[^A-Za-z0-9+/=]/);
          const badChar = bad ? `'${bad[0]}'` : '非法字符';
          pemError(`「${file.name}」正文第 ${i+1} 行含有非 Base64 字符 ${badChar} — PEM 正文只允许 A-Z a-z 0-9 + / = 字符`);
          return;
        }
      }

      // ── 8. Body must not be empty ────────────────────────────────────────
      const bodyLines = lines.slice(headerIdx + 1, footerIdx).filter(l => l.trim() !== '');
      if (bodyLines.length === 0) {
        pemError(`「${file.name}」格式错误 — BEGIN 与 END 之间没有 Base64 内容，文件可能已损坏`);
        return;
      }

      // ── 9. Encrypted private key warning (passphrase not supported) ───────
      if (label === 'ENCRYPTED PRIVATE KEY') {
        pemError(`「${file.name}」是加密私钥（ENCRYPTED PRIVATE KEY）— 本工具不支持带密码保护的私钥，请使用未加密的私钥文件`);
        return;
      }

      // ── All checks passed ─────────────────────────────────────────────────
      document.getElementById('secretKey').value = text.trim();
      successMsg.textContent = `已加载「${file.name}」— ${label}，${bodyLines.length} 行 Base64 数据`;
      successBar.style.display = 'flex';
      setTimeout(() => { successBar.style.display = 'none'; }, 4000);
    }
  }

  function toggleKeyVisibility() {
    keyVisible = !keyVisible;
    const ta = document.getElementById('secretKey');
    // Textarea is always visible; we use blur/mask via CSS trick
    const showIcon = document.getElementById('eyeIconShow');
    const hideIcon = document.getElementById('eyeIconHide');
    if (keyVisible) {
      ta.style.webkitTextSecurity = 'none';
      ta.style.textSecurity = 'none';
      ta.style.filter = '';
      showIcon.style.display = 'none';
      hideIcon.style.display = '';
    } else {
      ta.style.webkitTextSecurity = 'disc';
      ta.style.textSecurity = 'disc';
      showIcon.style.display = '';
      hideIcon.style.display = 'none';
    }
  }
  // Start hidden
  document.addEventListener('DOMContentLoaded', () => {
    const ta = document.getElementById('secretKey');
    ta.style.webkitTextSecurity = 'disc';
  });

  // ── Encoding tabs ────────────────────────────────────────
  function setEncoding(btn, enc) {
    if (btn.disabled) return;
    document.querySelectorAll('.encoding-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); currentEncoding = enc;
  }

  function setEncodingTabsDisabled(disabled, reason) {
    document.querySelectorAll('.encoding-tab').forEach(btn => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.35' : '';
      btn.style.cursor  = disabled ? 'not-allowed' : '';
      btn.title = disabled ? (reason || '') : '';
    });
  }

  // ── Toast & Status ───────────────────────────────────────
  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    document.getElementById('toastIcon').textContent = type === 'success' ? '✓' : '⚠';
    document.getElementById('toastMsg').textContent  = msg;
    t.className = 'toast' + (type === 'error' ? ' error-toast' : '');
    void t.offsetWidth; t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function setStatus(msg, type = 'idle') {
    const bar = document.getElementById('statusBar');
    bar.className = 'status-bar' + (type !== 'idle' ? ' ' + type : '');
    document.getElementById('statusText').textContent = msg;
    document.getElementById('statusTime').textContent = type !== 'idle' ? new Date().toLocaleTimeString() : '';
    if (type === 'error') {
      void bar.offsetWidth; bar.classList.add('shake');
      bar.addEventListener('animationend', () => bar.classList.remove('shake'), { once: true });
    }
  }

  // ── Hints update ─────────────────────────────────────────
  function updateHints() {
    const ks   = document.getElementById('keySize').value;
    const hash = document.getElementById('hash').value;
    document.getElementById('keySizeHint').textContent = ks;
    document.getElementById('hashHint').textContent    = hash;
    document.getElementById('infoKeySize').textContent = ks;
    document.getElementById('infoMode').textContent    = 'OAEP / ' + hash;
    document.getElementById('infoSecurity').textContent = 'HIGH';
    document.getElementById('infoSecSub').textContent   = 'Asymmetric';
  }
  document.getElementById('keySize').addEventListener('change', updateHints);
  document.getElementById('hash').addEventListener('change', updateHints);

  // ── Field flash ──────────────────────────────────────────
  function flashField(el) {
    el.classList.remove('field-error'); void el.offsetWidth; el.classList.add('field-error');
    el.addEventListener('animationend', () => el.classList.remove('field-error'), { once: true });
  }

  function validateFields() {
    let ok = true;
    const key = document.getElementById('secretKey');
    const txt = document.getElementById('inputText');
    if (!key.value.trim()) { flashField(key); ok = false; }
    if (!txt.value.trim() && !inputFileBytes) { flashField(txt); ok = false; }
    return ok;
  }

  // ── Cipher bytes from input ──────────────────────────────
  function getCipherBytes() {
    if (inputFileBytes) return inputFileBytes;
    const text = document.getElementById('inputText').value.trim();
    if (!text) throw new Error('请输入密文');
    if (currentEncoding === 'hex') {
      const clean = text.replace(/\s/g, '');
      if (clean.length % 2 !== 0) throw new Error('HEX_ODD_LENGTH');
      if (!/^[0-9a-fA-F]+$/.test(clean)) throw new Error('HEX_INVALID_CHARS');
      const bytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < clean.length; i += 2) bytes[i/2] = parseInt(clean.substr(i,2), 16);
      return bytes;
    }
    // base64
    try {
      const bin = atob(text.replace(/\s/g, ''));
      return new Uint8Array([...bin].map(c => c.charCodeAt(0)));
    } catch { throw new Error('BASE64格式错误，请检查密文'); }
  }

  // ── RSA-OAEP decrypt ─────────────────────────────────────
  async function runDecrypt() {
    if (!validateFields()) return;
    const outPanel = document.querySelector('.output-panel');
    try {
      outPanel.classList.add('processing');
      const hash    = document.getElementById('hash').value;
      const privPem = document.getElementById('secretKey').value.trim();
      if (!privPem) throw new Error('请输入私钥');

      let privDer;
      try { privDer = pemToDer(privPem); }
      catch { throw new Error('私钥格式无效，请确认为 PEM 格式'); }

      let cryptoKey;
      try {
        cryptoKey = await crypto.subtle.importKey(
          'pkcs8', privDer, { name: 'RSA-OAEP', hash }, false, ['decrypt']
        );
      } catch(e) {
        throw new Error('私钥导入失败 — ' + (e.message || '格式错误、与加密时的公钥不匹配，或 Hash 算法不一致'));
      }

      const cipherBytes = getCipherBytes();
      let decrypted;
      try {
        decrypted = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, cryptoKey, cipherBytes);
      } catch(e) {
        throw new Error('解密失败 — 请检查私钥是否与加密公钥匹配，以及 Hash 算法、密文是否正确');
      }

      const decBytes = new Uint8Array(decrypted);
      outputRawBytes = decBytes;

      let result;
      try {
        result = new TextDecoder('utf-8', { fatal: true }).decode(decBytes);
        document.getElementById('outputText').value = result;
        document.getElementById('outputFormat').textContent = 'UTF-8';
        document.getElementById('outputStat').textContent = formatBytes(result.length);
      } catch {
        result = Array.from(decBytes).map(b => b.toString(16).padStart(2,'0')).join(' ');
        document.getElementById('outputText').value =
          '[二进制结果 — ' + decBytes.length + ' bytes]\n\n' + result.slice(0, 512) + (result.length > 512 ? '\n...' : '');
        document.getElementById('outputFormat').textContent = 'BINARY';
        document.getElementById('outputStat').textContent = formatBytes(decBytes.length);
      }

      const strip = document.getElementById('outputFileStrip');
      if (inputFileName) {
        const base = inputFileName.replace(/\.enc$/i, '') || 'decrypted';
        document.getElementById('outputFileLabel').textContent = base + ' — 解密完成，可下载';
        strip.classList.add('visible');
      } else { strip.classList.remove('visible'); }

      totalBytesDecrypted += decBytes.length;
      animateCounter(totalBytesDecrypted);
      setStatus(`✓ 解密成功 — ${formatBytes(cipherBytes.length)} → ${formatBytes(decBytes.length)} (RSA-OAEP/${hash} ${document.getElementById('keySize').value}-bit)`, 'success');
    } catch(e) {
      document.getElementById('outputText').value = '';
      document.getElementById('outputStat').textContent = '0 bytes';
      document.getElementById('outputFormat').textContent = '—';
      document.getElementById('outputFileStrip').classList.remove('visible');
      const outP = document.querySelector('.output-panel');
      outP.classList.remove('output-error'); void outP.offsetWidth; outP.classList.add('output-error');
      outP.addEventListener('animationend', () => outP.classList.remove('output-error'), { once: true });

      const rawMsg = e.message || '';
      const msg    = rawMsg.toLowerCase();
      let friendly;
      if (rawMsg === 'HEX_ODD_LENGTH')     { friendly = '密文已损坏 — Hex 字符数为奇数'; flashField(document.getElementById('inputText')); }
      else if (rawMsg === 'HEX_INVALID_CHARS') { friendly = 'Hex 密文含非法字符'; flashField(document.getElementById('inputText')); }
      else if (rawMsg.includes('私钥'))    { friendly = rawMsg; flashField(document.getElementById('secretKey')); }
      else                                  { friendly = rawMsg; }

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

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  // ── Output download ──────────────────────────────────────
  function downloadOutputFile() {
    if (!outputRawBytes) { showToast('暂无解密数据', 'error'); return; }
    const base = inputFileName ? inputFileName.replace(/\.enc$/i, '') : 'decrypted';
    const blob = new Blob([outputRawBytes], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = base; a.click();
    URL.revokeObjectURL(a.href); showToast('文件下载中: ' + base);
  }

  function downloadOutputText() {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('无内容可下载', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'decrypted_' + Date.now() + '.txt'; a.click();
    URL.revokeObjectURL(a.href); showToast('下载中…');
  }

  async function pasteField(fieldId) {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById(fieldId).value = text.trim();
      showToast('已粘贴');
    } catch { showToast('无法访问剪贴板', 'error'); }
  }

  async function pasteInput() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('inputText').value = text.trim();
      document.getElementById('inputStat').textContent = text.length + ' chars';
      showToast('已粘贴');
    } catch { showToast('无法访问剪贴板', 'error'); }
  }

  function clearInput() {
    document.getElementById('inputText').value = '';
    document.getElementById('inputStat').textContent = '0 bytes';
    setStatus('就绪 — 输入私钥和密文后点击解密');
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  }

  function copyField(fieldId, btn) {
    const val = document.getElementById(fieldId).value;
    if (!val) { showToast('字段为空', 'error'); return; }
    const doSuccess = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.classList.add('copied'); showToast('已复制');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1800);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(val).then(doSuccess).catch(() => fallbackCopy(val) ? doSuccess() : showToast('复制失败', 'error'));
    else fallbackCopy(val) ? doSuccess() : showToast('复制失败', 'error');
  }

  function copyOutput(btn) {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('无内容可复制', 'error'); return; }
    const doSuccess = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)'; showToast('已复制到剪贴板');
      setTimeout(() => { btn.innerHTML = orig; btn.style.borderColor = ''; btn.style.color = ''; }, 1800);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(text).then(doSuccess).catch(() => fallbackCopy(text) ? doSuccess() : showToast('复制失败', 'error'));
    else fallbackCopy(text) ? doSuccess() : showToast('复制失败', 'error');
  }

  // ── File input ───────────────────────────────────────────
  function triggerFileInput() {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInput').click();
  }

  function handleFileInput(input) {
    const file = input.files[0]; if (file) loadEncFile(file);
  }

  function loadEncFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      inputFileBytes = new Uint8Array(e.target.result); inputFileName = file.name;
      document.getElementById('inputText').value = '[二进制 .enc 文件 — ' + inputFileBytes.length + ' bytes]';
      document.getElementById('inputText').readOnly = true;
      document.getElementById('inputStat').textContent = formatBytes(inputFileBytes.length);
      document.getElementById('inputFileBadge').style.display = 'flex';
      document.getElementById('inputFileName').textContent = file.name;
      setEncodingTabsDisabled(true, '二进制文件 — 自动处理，无需选择编码');
      ['clearInputBtn','pasteInputBtn'].forEach(id => {
        const btn = document.getElementById(id);
        btn.disabled = true; btn.style.opacity = '0.25'; btn.style.cursor = 'not-allowed';
      });
      showToast('已加载: ' + file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function clearFileInput() {
    inputFileBytes = null; inputFileName = null;
    const ta = document.getElementById('inputText');
    ta.value = ''; ta.readOnly = false;
    document.getElementById('inputStat').textContent = '0 bytes';
    document.getElementById('inputFileBadge').style.display = 'none';
    document.getElementById('fileInput').value = '';
    setEncodingTabsDisabled(false);
    ['clearInputBtn','pasteInputBtn'].forEach(id => {
      const btn = document.getElementById(id); btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = '';
    });
    showToast('已清除文件');
  }

  // ── Drag & drop ──────────────────────────────────────────
  const inputPanel = document.getElementById('inputPanel');
  const dropZone   = document.getElementById('dropZone');
  inputPanel.addEventListener('dragenter', (e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) dropZone.classList.add('active'); });
  inputPanel.addEventListener('dragover',  (e) => { e.preventDefault(); });
  inputPanel.addEventListener('dragleave', (e) => { if (!inputPanel.contains(e.relatedTarget)) dropZone.classList.remove('active'); });
  inputPanel.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('active'); const f = e.dataTransfer.files[0]; if (f) loadEncFile(f); });

  document.getElementById('inputText').addEventListener('input', function() {
    document.getElementById('inputStat').textContent = this.value.length + ' chars';
  });

  // ── Config paste / upload ────────────────────────────────
  async function pasteJsonConfig() {
    let text;
    try { text = await navigator.clipboard.readText(); }
    catch { showToast('无法访问剪贴板', 'error'); return; }
    try {
      text = text.replace(/```[a-z]*\n?/g, '').trim();
      applyConfig(JSON.parse(text));
    } catch { showToast('剪贴板内容不是有效的 JSON', 'error'); }
  }

  function triggerConfigUpload() {
    document.getElementById('configFileInput').value = '';
    document.getElementById('configFileInput').click();
  }

  function loadConfigFile(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try { applyConfig(JSON.parse(e.target.result)); }
      catch { showToast('JSON 文件格式无效', 'error'); }
    };
    reader.readAsText(file);
  }

  function applyConfig(cfg) {
    let applied = [];
    if (cfg.keySize && ['2048','3072','4096'].includes(String(cfg.keySize))) {
      document.getElementById('keySize').value = String(cfg.keySize); applied.push('Key Size');
    }
    if (cfg.hash && ['SHA-1','SHA-256','SHA-384','SHA-512'].includes(cfg.hash)) {
      document.getElementById('hash').value = cfg.hash; applied.push('Hash');
    }
    if (cfg.encoding && ['base64','hex'].includes(cfg.encoding)) {
      currentEncoding = cfg.encoding;
      document.querySelectorAll('.encoding-tab').forEach(b => b.classList.remove('active'));
      const tab = document.querySelector(`.encoding-tab[data-enc="${cfg.encoding}"]`);
      if (tab) tab.classList.add('active'); applied.push('编码');
    }
    if (applied.length === 0) { showToast('JSON 中未找到可识别的配置字段', 'error'); return; }
    updateHints();
    showToast('已填充: ' + applied.join(' / '));
  }

  // ── Init ─────────────────────────────────────────────────
  updateHints();
  setStatus('就绪 — 输入私钥和密文后点击解密');
