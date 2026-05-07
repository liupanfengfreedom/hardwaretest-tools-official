let inputFormat = 'text';
  let totalBytesProcessed = 0;
  let toastTimer = null;
  let inputFileBytes = null;
  let inputFileName  = null;
  let outputRawBytes = null;
  let generatedPrivateKeyPem = null;

  // ── PEM / DER helpers ────────────────────────────────────
  function pemToDer(pem) {
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  function derToPem(der, label) {
    const b64 = btoa(String.fromCharCode(...new Uint8Array(der)));
    const lines = b64.match(/.{1,64}/g).join('\n');
    return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
  }

  // ── Key generation ───────────────────────────────────────
  async function generateKeyPair() {
    const ks   = parseInt(document.getElementById('keySize').value);
    const hash = document.getElementById('hash').value;
    try {
      showToast('Generating, please wait...');
      const kp = await crypto.subtle.generateKey(
        { name: 'RSA-OAEP', modulusLength: ks, publicExponent: new Uint8Array([1, 0, 1]), hash },
        true, ['encrypt', 'decrypt']
      );
      const [pubDer, privDer] = await Promise.all([
        crypto.subtle.exportKey('spki',  kp.publicKey),
        crypto.subtle.exportKey('pkcs8', kp.privateKey)
      ]);
      const pubPem  = derToPem(pubDer,  'PUBLIC KEY');
      const privPem = derToPem(privDer, 'PRIVATE KEY');
      document.getElementById('publicKey').value      = pubPem;
      document.getElementById('privateKeyDisplay').value = privPem;
      document.getElementById('privateKeyGroup').style.display = '';
      generatedPrivateKeyPem = privPem;
      updateHints();
      showToast('Key pair generated');
    } catch(e) {
      setStatus('✗ 키 생성 실패: ' + e.message, 'error');
    }
  }

  function downloadPrivateKey() {
    const pem = document.getElementById('privateKeyDisplay').value;
    if (!pem) { showToast('No private key available', 'error'); return; }
    const blob = new Blob([pem], { type: 'application/x-pem-file' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rsa-private-key_' + Date.now() + '.pem';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Private key downloaded');
  }

  // ── Config export ────────────────────────────────────────
  function downloadConfig() {
    const config = {
      keySize:  parseInt(document.getElementById('keySize').value),
      hash:     document.getElementById('hash').value,
      encoding: document.getElementById('outputEncoding').value,
      publicKey: document.getElementById('publicKey').value
    };
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rsa-config_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Configuration file downloaded');
  }

  function copyConfig(btn) {
    const config = {
      keySize:  parseInt(document.getElementById('keySize').value),
      hash:     document.getElementById('hash').value,
      encoding: document.getElementById('outputEncoding').value
    };
    const json = JSON.stringify(config, null, 2);
    const doSuccess = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ 복사됨';
      btn.classList.add('copied');
      showToast('Configuration copied as JSON');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(json).then(doSuccess).catch(() => fallbackCopy(json) ? doSuccess() : showToast('Copy failed', 'error'));
    else
      fallbackCopy(json) ? doSuccess() : showToast('Copy failed', 'error');
  }

  // ── Input: file picker ───────────────────────────────────
  function triggerFileInput() {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInput').click();
  }

  function handleFileInput(input) {
    const file = input.files[0];
    if (file) loadFile(file);
  }

  let isBinaryFile = false;

  function setFormatTabsDisabled(disabled, reason = '') {
    const wrap = document.getElementById('formatTabsWrap');
    const tooltip = wrap.querySelector('.custom-tooltip');
    document.querySelectorAll('.format-tab').forEach(btn => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.35' : '';
      btn.style.cursor  = disabled ? 'not-allowed' : '';
    });
    wrap.classList.toggle('tabs-disabled', disabled);
    if (reason) tooltip.textContent = reason;
    if (disabled) {
      document.querySelectorAll('.format-tab').forEach(b => b.classList.remove('active'));
      document.querySelector('.format-tab[data-fmt="text"]').classList.add('active');
      inputFormat = 'text';
    }
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      inputFileBytes = new Uint8Array(e.target.result);
      inputFileName  = file.name;
      const preview  = tryTextDecode(inputFileBytes);
      isBinaryFile   = !canDecodeAsText(inputFileBytes);
      document.getElementById('inputText').value    = preview;
      document.getElementById('inputText').readOnly = true;
      document.getElementById('inputText').style.opacity = '0.7';
      document.getElementById('inputText').style.cursor  = 'default';
      ['clearInputBtn','pasteInputBtn'].forEach(id => {
        const btn = document.getElementById(id);
        btn.disabled = true; btn.style.opacity = '0.25'; btn.style.cursor = 'not-allowed';
      });
      document.getElementById('inputStat').textContent = formatBytes(inputFileBytes.length);
      document.getElementById('inputFileBadge').style.display = 'flex';
      document.getElementById('inputFileName').textContent = file.name;
      const reason = isBinaryFile ? 'Binary file - raw bytes will be encrypted directly' : 'File loaded - format locked to TEXT';
      setFormatTabsDisabled(true, reason);
      showToast('Loaded: ' + file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function canDecodeAsText(bytes) {
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return true; }
    catch { return false; }
  }

  function tryTextDecode(bytes) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch {
      return '[Binary file - ' + bytes.length + ' bytes]\n\n' +
        Array.from(bytes.slice(0, 128)).map(b => b.toString(16).padStart(2,'0')).join(' ') +
        (bytes.length > 128 ? '\n...' : '');
    }
  }

  function clearFileInput() {
    inputFileBytes = null; inputFileName = null; isBinaryFile = false;
    const ta = document.getElementById('inputText');
    ta.value = ''; ta.readOnly = false; ta.style.opacity = ''; ta.style.cursor = '';
    ['clearInputBtn','pasteInputBtn'].forEach(id => {
      const btn = document.getElementById(id);
      btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = '';
    });
    document.getElementById('inputStat').textContent = '0바이트';
    document.getElementById('inputFileBadge').style.display = 'none';
    document.getElementById('fileInput').value = '';
    setFormatTabsDisabled(false);
    showToast('File cleared');
  }

  // ── Input: drag & drop ───────────────────────────────────
  const inputPanel = document.getElementById('inputPanel');
  const dropZone   = document.getElementById('dropZone');

  inputPanel.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) dropZone.classList.add('active');
  });
  inputPanel.addEventListener('dragover', (e) => { e.preventDefault(); });
  inputPanel.addEventListener('dragleave', (e) => {
    if (!inputPanel.contains(e.relatedTarget)) dropZone.classList.remove('active');
  });
  inputPanel.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('active');
    const file = e.dataTransfer.files[0]; if (file) loadFile(file);
  });

  // ── Helpers ──────────────────────────────────────────────
  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  function hexToBytes(hex) {
    hex = hex.replace(/\s/g, '');
    if (hex.length % 2 !== 0) throw new Error('잘못된 16진수 문자열');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes;
  }

  function getInputBytes() {
    const text = document.getElementById('inputText').value;
    if (!text) throw new Error('처리할 내용을 입력해주세요');
    if (inputFormat === 'hex')    return hexToBytes(text);
    if (inputFormat === 'base64') {
      const raw = atob(text);
      return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
    }
    return new TextEncoder().encode(text);
  }

  function bytesToOutput(bytes) {
    const fmt = document.getElementById('outputEncoding').value;
    if (fmt === 'hex') return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
    let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin);
  }

  // ── Output: download ─────────────────────────────────────
  function downloadOutputFile() {
    if (!outputRawBytes) { showToast('No encrypted data available', 'error'); return; }
    const base = inputFileName ? inputFileName.replace(/(\.[^.]+)?$/, '') : 'encrypted';
    const blob = new Blob([outputRawBytes], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = base + '.enc'; a.click();
    URL.revokeObjectURL(a.href); showToast('Downloading file: ' + base + '.enc');
  }

  function downloadOutputText() {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('Nothing available to download', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'encrypted_' + Date.now() + '.txt'; a.click();
    URL.revokeObjectURL(a.href); showToast('Download started...');
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
    document.getElementById('statusTime').textContent = type !== 'idle' ? new Date().toLocaleTimeString('en-GB', { hour12: false }) : '';
    if (type === 'error') {
      void bar.offsetWidth; bar.classList.add('shake');
      bar.addEventListener('animationend', () => bar.classList.remove('shake'), { once: true });
    }
  }

  // ── Hints / info strip update ────────────────────────────
  function updateHints() {
    const ks   = document.getElementById('keySize').value;
    const hash = document.getElementById('hash').value;
    document.getElementById('keySizeHint').textContent = ks;
    document.getElementById('hashHint').textContent    = hash;
    document.getElementById('infoKeySize').textContent = ks;
    document.getElementById('infoMode').textContent    = 'OAEP / ' + hash;
    const sec    = ks >= 4096 ? 'HIGH' : ks >= 3072 ? 'HIGH' : 'STANDARD';
    const secSub = ks >= 3072 ? 'Asymmetric' : 'Asymmetric';
    document.getElementById('infoSecurity').textContent = sec;
    document.getElementById('infoSecSub').textContent   = secSub;
  }

  document.getElementById('keySize').addEventListener('change', updateHints);
  document.getElementById('hash').addEventListener('change', updateHints);

  // ── Field validation helpers ─────────────────────────────
  function flashField(el) {
    el.classList.remove('field-error'); void el.offsetWidth; el.classList.add('field-error');
    el.addEventListener('animationend', () => el.classList.remove('field-error'), { once: true });
  }

  function validateFields() {
    let ok = true;
    const pk  = document.getElementById('publicKey');
    const txt = document.getElementById('inputText');
    if (!pk.value.trim())                              { flashField(pk);  ok = false; }
    if (!txt.value.trim() && !inputFileBytes)          { flashField(txt); ok = false; }
    return ok;
  }

  // ── RSA-OAEP encrypt ─────────────────────────────────────
  async function runEncrypt() {
    if (!validateFields()) return;
    const outPanel = document.querySelector('.output-panel');
    try {
      outPanel.classList.add('processing');
      const hash   = document.getElementById('hash').value;
      const pubPem = document.getElementById('publicKey').value.trim();
      if (!pubPem) throw new Error('공개 키를 붙여넣거나 생성하세요.');

      let pubDer;
      try { pubDer = pemToDer(pubPem); }
      catch { throw new Error('공개 키 형식이 잘못되었습니다. PEM 형식을 사용하세요.'); }

      let cryptoKey;
      try {
        cryptoKey = await crypto.subtle.importKey(
          'spki', pubDer, { name: 'RSA-OAEP', hash }, false, ['encrypt']
        );
      } catch(e) {
        throw new Error('공개 키 가져오기 실패 - ' + (e.message || 'invalid format or hash mismatch'));
      }

      const inputBytes = inputFileBytes || getInputBytes();
      let encrypted;
      try {
        encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, cryptoKey, inputBytes);
      } catch(e) {
        // Likely plaintext too large
        const ks = parseInt(document.getElementById('keySize').value);
        const hashBytes = hash === 'SHA-1' ? 20 : hash === 'SHA-256' ? 32 : hash === 'SHA-384' ? 48 : 64;
        const maxBytes  = (ks / 8) - 2 * hashBytes - 2;
        if (inputBytes.length > maxBytes) {
          throw new Error(`일반 텍스트가 너무 큽니다(${inputBytes.length}바이트). RSA-OAEP/${hash}는 작업당 최대 ${maxBytes}바이트를 암호화할 수 있습니다. 메시지를 줄이거나 하이브리드 암호화를 사용하세요.`);
        }
        throw new Error('암호화 실패: ' + (e.message || 'unknown error'));
      }

      const encBytes = new Uint8Array(encrypted);
      outputRawBytes = encBytes;
      const result = bytesToOutput(encBytes);
      document.getElementById('outputText').value = result;
      document.getElementById('outputFormat').textContent = document.getElementById('outputEncoding').value.toUpperCase();
      updateOutputStat(result);
      totalBytesProcessed += inputBytes.length;
      updateInfoBytes();

      const strip = document.getElementById('outputFileStrip');
      const base  = inputFileName ? inputFileName.replace(/(\.[^.]+)?$/, '') : 'encrypted_' + Date.now();
      document.getElementById('outputFileLabel').textContent = base + '.enc - 다운로드 가능한 바이너리 파일';
      strip.classList.add('visible');
      document.getElementById('copyConfigStrip').classList.add('visible');

      setStatus(`✓ 암호화 성공 - ${formatBytes(inputBytes.length)} -> ${formatBytes(encBytes.length)} (RSA-OAEP/${document.getElementById('hash').value} ${document.getElementById('keySize').value}-bit)`, 'success');
    } catch(e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('public key')) flashField(document.getElementById('publicKey'));
      setStatus('✗ ' + e.message, 'error');
    } finally {
      outPanel.classList.remove('processing');
    }
  }

  function updateInfoBytes() {
    const el = document.getElementById('infoBytes');
    const prev = parseInt(el.textContent) || 0;
    let current = prev;
    const step = Math.ceil((totalBytesProcessed - current) / 10);
    const t = setInterval(() => {
      current = Math.min(current + step, totalBytesProcessed);
      el.textContent = current;
      if (current >= totalBytesProcessed) clearInterval(t);
    }, 50);
  }

  function clearInput() {
    document.getElementById('inputText').value = '';
    document.getElementById('inputStat').textContent = '0바이트';
    setStatus('준비 - 공개 키를 구성한 다음 암호화를 클릭합니다.');
  }

  async function pasteInput() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('inputText').value = text;
      const len = new TextEncoder().encode(text).length;
      document.getElementById('inputStat').textContent = len + ' bytes';
      showToast('Pasted');
    } catch { showToast('Unable to access the clipboard', 'error'); }
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
      navigator.clipboard.writeText(val).then(doSuccess).catch(() => fallbackCopy(val) ? doSuccess() : showToast('Copy failed, please copy manually', 'error'));
    else fallbackCopy(val) ? doSuccess() : showToast('Copy failed, please copy manually', 'error');
  }

  function copyOutput(btn) {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('Nothing to copy', 'error'); return; }
    const doSuccess = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.style.borderColor = 'var(--accent2)'; btn.style.color = 'var(--accent2)'; showToast('Copied to clipboard');
      setTimeout(() => { btn.innerHTML = orig; btn.style.borderColor = ''; btn.style.color = ''; }, 1800);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(text).then(doSuccess).catch(() => fallbackCopy(text) ? doSuccess() : showToast('Copy failed, please copy manually', 'error'));
    else fallbackCopy(text) ? doSuccess() : showToast('Copy failed, please copy manually', 'error');
  }

  // ── Input format tabs ────────────────────────────────────
  function setInputFormat(btn, fmt) {
    if (btn.disabled) return;
    document.querySelectorAll('.format-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); inputFormat = fmt;
  }

  function isValidHex(s)    { return /^[0-9a-fA-F\s]*$/.test(s); }
  function isValidBase64(s) { return /^[A-Za-z0-9+/=\s]*$/.test(s); }

  function updateFormatTabAvailability() {
    if (inputFileBytes) return;
    const val  = document.getElementById('inputText').value;
    const wrap = document.getElementById('formatTabsWrap');
    const hexTab = document.querySelector('.format-tab[data-fmt="hex"]');
    const b64Tab = document.querySelector('.format-tab[data-fmt="base64"]');
    const hexOk = isValidHex(val), b64Ok = isValidBase64(val);
    hexTab.disabled = !hexOk; hexTab.style.opacity = hexOk ? '' : '0.35'; hexTab.style.cursor = hexOk ? '' : 'not-allowed';
    b64Tab.disabled = !b64Ok; b64Tab.style.opacity = b64Ok ? '' : '0.35'; b64Tab.style.cursor = b64Ok ? '' : 'not-allowed';
    if (inputFormat === 'hex' && !hexOk) { document.querySelectorAll('.format-tab').forEach(b => b.classList.remove('active')); document.querySelector('.format-tab[data-fmt="text"]').classList.add('active'); inputFormat = 'text'; }
    if (inputFormat === 'base64' && !b64Ok) { document.querySelectorAll('.format-tab').forEach(b => b.classList.remove('active')); document.querySelector('.format-tab[data-fmt="text"]').classList.add('active'); inputFormat = 'text'; }
    const reasons = []; if (!hexOk) reasons.push('contains non-hex characters'); if (!b64Ok) reasons.push('contains non-Base64 characters');
    const tooltip = wrap.querySelector('.custom-tooltip');
    if (reasons.length) { tooltip.textContent = reasons.join(' · '); wrap.classList.add('tabs-disabled'); }
    else wrap.classList.remove('tabs-disabled');
  }

  document.getElementById('inputText').addEventListener('input', function() {
    const len = new TextEncoder().encode(this.value).length;
    document.getElementById('inputStat').textContent = len + ' bytes';
    updateFormatTabAvailability();
  });

  function updateOutputStat(text) {
    document.getElementById('outputStat').textContent = text ? text.length + ' chars' : '0바이트';
  }

  // ── Init ─────────────────────────────────────────────────
  updateHints();
  setStatus('준비 - 공개 키를 붙여넣거나 키 쌍을 생성한 다음 암호화를 클릭합니다.');
