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
      pemError(`The file is too large (${(file.size/1024).toFixed(1)} KB). PEM private key files are usually under 10 KB, so please verify the file.`);
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
          pemError(`"${file.name}" contains binary content and is not a text file. PEM private keys must be plain ASCII text.`);
          return;
        }
      }
      // Passed binary check — now read as text
      const textReader = new FileReader();
      textReader.onload = function(e) { validatePemText(e.target.result); };
      textReader.onerror = function() { pemError(`Unable to read "${file.name}". Please try again.`); };
      textReader.readAsText(file);
    };
    sniffReader.onerror = function() { pemError(`Unable to read "${file.name}". Please try again.`); };
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
              pemError(`"${file.name}" is malformed - there are ${cnt} dashes before BEGIN, but PEM requires exactly 5 (-----).`);
            } else if (/BEGIN.+-+$/.test(t) && !/BEGIN.+-{5}$/.test(t)) {
              const cnt = (t.match(/-+$/)[0]).length;
              pemError(`"${file.name}" is malformed - there are ${cnt} dashes after BEGIN, but PEM requires exactly 5 (-----).`);
            } else {
              pemError(`"${file.name}" is malformed - the header line "${t.slice(0,60)}" does not follow PEM format (expected: -----BEGIN PRIVATE KEY-----).`);
            }
            return;
          }
          headerIdx = i;
          label = m[2];
          break;
        }
      }
      if (headerIdx === -1) {
        pemError(`"${file.name}" is not a PEM file - no -----BEGIN ...----- header line was found. Please upload a valid private key file.`);
        return;
      }

      // ── 4. Label must be a private key ───────────────────────────────────
      if (label === 'CERTIFICATE') {
        pemError(`"${file.name}" is a certificate file (CERTIFICATE), not a private key. Please upload a -----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY----- file.`);
        return;
      }
      if (label === 'PUBLIC KEY' || label === 'RSA PUBLIC KEY') {
        pemError(`"${file.name}" is a public key file (${label}). Decryption requires a private key, so please upload a file beginning with -----BEGIN PRIVATE KEY-----.`);
        return;
      }
      if (label !== 'PRIVATE KEY' && label !== 'RSA PRIVATE KEY' && label !== 'ENCRYPTED PRIVATE KEY') {
        pemError(`"${file.name}" uses PEM type "${label}", which is not supported here. Use PRIVATE KEY or RSA PRIVATE KEY.`);
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
              pemError(`"${file.name}" is malformed - there are ${cnt} dashes before END, but PEM requires exactly 5 (-----).`);
            } else if (/END.+-+$/.test(t) && !/END.+-{5}$/.test(t)) {
              const cnt = (t.match(/-+$/)[0]).length;
              pemError(`"${file.name}" is malformed - there are ${cnt} dashes after END, but PEM requires exactly 5 (-----).`);
            } else {
              pemError(`"${file.name}" is malformed - the footer line "${t.slice(0,60)}" does not follow PEM format (expected: -----END PRIVATE KEY-----).`);
            }
            return;
          }
          footerIdx = i;
          footerLabel = m[2];
          break;
        }
      }
      if (footerIdx === -1) {
        pemError(`"${file.name}" is incomplete - a BEGIN header was found, but the matching -----END ${label}----- footer is missing.`);
        return;
      }

      // ── 6. BEGIN / END labels must match ────────────────────────────────
      if (label !== footerLabel) {
        pemError(`"${file.name}" is malformed - the BEGIN label (${label}) does not match the END label (${footerLabel}), so the file may be corrupted.`);
        return;
      }

      // ── 7. Validate Base64 body ──────────────────────────────────────────
      const base64Re = /^[A-Za-z0-9+/]+=*$/;
      for (let i = headerIdx + 1; i < footerIdx; i++) {
        const ln = lines[i].trim();
        if (ln === '') continue;
        if (ln.length > 76) {
          pemError(`"${file.name}" is malformed - line ${i+1} is ${ln.length} characters long, but PEM Base64 lines must not exceed 76 characters.`);
          return;
        }
        if (!base64Re.test(ln)) {
          // Find the offending character for a precise message
          const bad = ln.match(/[^A-Za-z0-9+/=]/);
          const badChar = bad ? `'${bad[0]}'` : 'an invalid character';
          pemError(`"${file.name}" contains a non-Base64 character ${badChar} on body line ${i+1}. PEM payloads may only contain A-Z, a-z, 0-9, +, /, and =.`);
          return;
        }
      }

      // ── 8. Body must not be empty ────────────────────────────────────────
      const bodyLines = lines.slice(headerIdx + 1, footerIdx).filter(l => l.trim() !== '');
      if (bodyLines.length === 0) {
        pemError(`"${file.name}" is malformed - there is no Base64 payload between BEGIN and END, and the file may be corrupted.`);
        return;
      }

      // ── 9. Encrypted private key warning (passphrase not supported) ───────
      if (label === 'ENCRYPTED PRIVATE KEY') {
        pemError(`"${file.name}" is an encrypted private key (ENCRYPTED PRIVATE KEY). Password-protected private keys are not supported here; please use an unencrypted private key file.`);
        return;
      }

      // ── All checks passed ─────────────────────────────────────────────────
      document.getElementById('secretKey').value = text.trim();
      successMsg.textContent = `「${file.name}」 - ${label}、${bodyLines.length} Base64 行をロードしました。`;
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
    document.getElementById('statusTime').textContent = type !== 'idle' ? new Date().toLocaleTimeString('英語版', { hour12: false }) : '';
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
    document.getElementById('infoSecSub').textContent   = '非対称';
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
    if (!text) throw new Error('暗号文を入力してください');
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
    } catch { throw new Error('無効な Base64 暗号文です。入力を確認してください。'); }
  }

  // ── RSA-OAEP decrypt ─────────────────────────────────────
  async function runDecrypt() {
    if (!validateFields()) return;
    const outPanel = document.querySelector('.output-panel');
    try {
      outPanel.classList.add('processing');
      const hash    = document.getElementById('hash').value;
      const privPem = document.getElementById('secretKey').value.trim();
      if (!privPem) throw new Error('秘密キーを入力してください');

      let privDer;
      try { privDer = pemToDer(privPem); }
      catch { throw new Error('秘密キーの形式が無効です。 PEMを使用してください。'); }

      let cryptoKey;
      try {
        cryptoKey = await crypto.subtle.importKey(
          'pkcs8', privDer, { name: 'RSA-OAEP', hash }, false, ['decrypt']
        );
      } catch(e) {
        throw new Error('秘密キーのインポートに失敗しました - ' + (e.message || 'invalid format, mismatched public key, or hash mismatch'));
      }

      const cipherBytes = getCipherBytes();
      let decrypted;
      try {
        decrypted = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, cryptoKey, cipherBytes);
      } catch(e) {
        throw new Error('復号化に失敗しました - 秘密キーが暗号化公開キーと一致し、ハッシュ アルゴリズムと暗号文が正しいことを確認してください。');
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
          '[Binary output - ' + decBytes.length + ' bytes]\n\n' + result.slice(0, 512) + (result.length > 512 ? '\n...' : '');
        document.getElementById('outputFormat').textContent = 'バイナリ';
        document.getElementById('outputStat').textContent = formatBytes(decBytes.length);
      }

      const strip = document.getElementById('outputFileStrip');
      if (inputFileName) {
        const base = inputFileName.replace(/\.enc$/i, '') || 'decrypted';
        document.getElementById('outputFileLabel').textContent = base + ' - 復号化が完了し、ダウンロードの準備ができました';
        strip.classList.add('visible');
      } else { strip.classList.remove('visible'); }

      totalBytesDecrypted += decBytes.length;
      animateCounter(totalBytesDecrypted);
      setStatus(`✓ 復号化成功 - ${formatBytes(cipherBytes.length)} -> ${formatBytes(decBytes.length)} (RSA-OAEP/${hash} ${document.getElementById('keySize').value}-bit)`, 'success');
    } catch(e) {
      document.getElementById('outputText').value = '';
      document.getElementById('outputStat').textContent = '0バイト';
      document.getElementById('outputFormat').textContent = '—';
      document.getElementById('outputFileStrip').classList.remove('visible');
      const outP = document.querySelector('.output-panel');
      outP.classList.remove('output-error'); void outP.offsetWidth; outP.classList.add('output-error');
      outP.addEventListener('animationend', () => outP.classList.remove('output-error'), { once: true });

      const rawMsg = e.message || '';
      const msg    = rawMsg.toLowerCase();
      let friendly;
      if (rawMsg === 'HEX_ODD_LENGTH')     { friendly = 'Ciphertext is corrupted - the hex string has an odd number of characters'; flashField(document.getElementById('inputText')); }
      else if (rawMsg === 'HEX_INVALID_CHARS') { friendly = 'The hex ciphertext contains invalid characters'; flashField(document.getElementById('inputText')); }
      else if (rawMsg.toLowerCase().includes('private key')) { friendly = rawMsg; flashField(document.getElementById('secretKey')); }
      else                                  { friendly = rawMsg; }

      setStatus('✗ ' + friendly, 'error');
      showToast('Decryption failed', 'error');
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
    if (!outputRawBytes) { showToast('No decrypted data available', 'error'); return; }
    const base = inputFileName ? inputFileName.replace(/\.enc$/i, '') : 'decrypted';
    const blob = new Blob([outputRawBytes], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = base; a.click();
    URL.revokeObjectURL(a.href); showToast('Downloading file: ' + base);
  }

  function downloadOutputText() {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('Nothing available to download', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'decrypted_' + Date.now() + '.txt'; a.click();
    URL.revokeObjectURL(a.href); showToast('Download started...');
  }

  async function pasteField(fieldId) {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById(fieldId).value = text.trim();
      showToast('Pasted');
    } catch { showToast('Unable to access the clipboard', 'error'); }
  }

  async function pasteInput() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('inputText').value = text.trim();
      document.getElementById('inputStat').textContent = text.length + ' chars';
      showToast('Pasted');
    } catch { showToast('Unable to access the clipboard', 'error'); }
  }

  function clearInput() {
    document.getElementById('inputText').value = '';
    document.getElementById('inputStat').textContent = '0バイト';
    setStatus('準備完了 - 秘密キーと暗号文を貼り付け、[復号化] をクリックします。');
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  }

  function copyField(fieldId, btn) {
    const val = document.getElementById(fieldId).value;
    if (!val) { showToast('This field is empty', 'error'); return; }
    const doSuccess = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.classList.add('copied'); showToast('Copied');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1800);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(val).then(doSuccess).catch(() => fallbackCopy(val) ? doSuccess() : showToast('Copy failed', 'error'));
    else fallbackCopy(val) ? doSuccess() : showToast('Copy failed', 'error');
  }

  function copyOutput(btn) {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('Nothing to copy', 'error'); return; }
    const doSuccess = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)'; showToast('Copied to clipboard');
      setTimeout(() => { btn.innerHTML = orig; btn.style.borderColor = ''; btn.style.color = ''; }, 1800);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(text).then(doSuccess).catch(() => fallbackCopy(text) ? doSuccess() : showToast('Copy failed', 'error'));
    else fallbackCopy(text) ? doSuccess() : showToast('Copy failed', 'error');
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
      document.getElementById('inputText').value = '[Binary .enc file - ' + inputFileBytes.length + ' bytes]';
      document.getElementById('inputText').readOnly = true;
      document.getElementById('inputStat').textContent = formatBytes(inputFileBytes.length);
      document.getElementById('inputFileBadge').style.display = 'flex';
      document.getElementById('inputFileName').textContent = file.name;
      setEncodingTabsDisabled(true, 'Binary file - processed automatically, no encoding selection needed');
      ['clearInputBtn','pasteInputBtn'].forEach(id => {
        const btn = document.getElementById(id);
        btn.disabled = true; btn.style.opacity = '0.25'; btn.style.cursor = 'not-allowed';
      });
      showToast('Loaded: ' + file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function clearFileInput() {
    inputFileBytes = null; inputFileName = null;
    const ta = document.getElementById('inputText');
    ta.value = ''; ta.readOnly = false;
    document.getElementById('inputStat').textContent = '0バイト';
    document.getElementById('inputFileBadge').style.display = 'none';
    document.getElementById('fileInput').value = '';
    setEncodingTabsDisabled(false);
    ['clearInputBtn','pasteInputBtn'].forEach(id => {
      const btn = document.getElementById(id); btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = '';
    });
    showToast('File cleared');
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
    catch { showToast('Unable to access the clipboard', 'error'); return; }
    try {
      text = text.replace(/```[a-z]*\n?/g, '').trim();
      applyConfig(JSON.parse(text));
    } catch { showToast('Clipboard content is not valid JSON', 'error'); }
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
      catch { showToast('Invalid JSON file format', 'error'); }
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
      if (tab) tab.classList.add('active'); applied.push('Encoding');
    }
    if (applied.length === 0) { showToast('No recognizable config fields were found in the JSON', 'error'); return; }
    updateHints();
    showToast('Applied: ' + applied.join(' / '));
  }

  // ── Init ─────────────────────────────────────────────────
  updateHints();
  setStatus('Ready - paste a private key and ciphertext, then click Decrypt');
