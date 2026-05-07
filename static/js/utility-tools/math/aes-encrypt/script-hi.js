let inputFormat = 'text';
  let totalBytesProcessed = 0;
  let toastTimer = null;
  let inputFileBytes = null;
  let inputFileName  = null;
  let outputRawBytes = null;

  // ── GCM nonce reuse tracking ─────────────────────────────
  const usedNonces = new Set();

  function checkNonceReuse() {
    const mode  = document.getElementById('mode').value;
    const nonce = document.getElementById('iv').value.trim();
    const warn  = document.getElementById('nonceWarning');
    if (mode === 'GCM' && nonce && usedNonces.has(nonce)) {
      warn.classList.add('visible');
    } else {
      warn.classList.remove('visible');
    }
  }

  document.getElementById('iv').addEventListener('input', checkNonceReuse);

  function downloadConfig() {
    const config = {
      mode:     document.getElementById('mode').value,
      keySize:  parseInt(document.getElementById('keySize').value),
      padding:  document.getElementById('padding').value,
      key:      document.getElementById('secretKey').value,
      iv:       document.getElementById('iv').value,
      encoding: document.getElementById('outputEncoding').value
    };
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aes-config_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Configuration file downloaded');
  }


  function copyConfig(btn) {
    const config = {
      mode:     document.getElementById('mode').value,
      keySize:  parseInt(document.getElementById('keySize').value),
      padding:  document.getElementById('padding').value,
      key:      document.getElementById('secretKey').value,
      iv:       document.getElementById('iv').value,
      encoding: document.getElementById('outputEncoding').value
    };
    const json = JSON.stringify(config, null, 2);
    const doSuccess = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ कॉपी किया गया';
      btn.classList.add('copied');
      showToast('Configuration copied as JSON');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(json).then(doSuccess).catch(() => fallbackCopy(json) ? doSuccess() : showToast('Copy failed', 'error'));
    else
      fallbackCopy(json) ? doSuccess() : showToast('Copy failed', 'error');
  }



  // ── Input: file picker ──────────────────────────────────
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
      btn.style.cursor = disabled ? 'not-allowed' : '';
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
      const preview = tryTextDecode(inputFileBytes);
      isBinaryFile = !canDecodeAsText(inputFileBytes);
      document.getElementById('inputText').value = preview;
      document.getElementById('inputText').readOnly = true;
      document.getElementById('inputText').style.opacity = '0.7';
      document.getElementById('inputText').style.cursor = 'default';
      ['clearInputBtn','pasteInputBtn'].forEach(id => {
        const btn = document.getElementById(id);
        btn.disabled = true;
        btn.style.opacity = '0.25';
        btn.style.cursor = 'not-allowed';
      });
      document.getElementById('inputStat').textContent = formatBytes(inputFileBytes.length);
      document.getElementById('inputFileBadge').style.display = 'flex';
      document.getElementById('inputFileName').textContent = file.name;
      const reason = isBinaryFile
        ? 'Binary file detected - raw bytes will be encrypted directly'
        : 'File loaded - format locked to TEXT';
      setFormatTabsDisabled(true, reason);
      showToast(`Loaded: ${file.name}`);
    };
    reader.readAsArrayBuffer(file);
  }

  function canDecodeAsText(bytes) {
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return true; }
    catch { return false; }
  }

  function tryTextDecode(bytes) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return '[Binary file - ' + bytes.length + ' bytes]\n\n' +
        Array.from(bytes.slice(0, 128)).map(b => b.toString(16).padStart(2,'0')).join(' ') +
        (bytes.length > 128 ? '\n...' : '');
    }
  }

  function clearFileInput() {
    inputFileBytes = null;
    inputFileName  = null;
    isBinaryFile   = false;
    const ta = document.getElementById('inputText');
    ta.value    = '';
    ta.readOnly = false;
    ta.style.opacity = '';
    ta.style.cursor  = '';
    ['clearInputBtn','pasteInputBtn'].forEach(id => {
      const btn = document.getElementById(id);
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor  = '';
    });
    document.getElementById('inputStat').textContent = '0 बाइट्स';
    document.getElementById('inputFileBadge').style.display = 'none';
    document.getElementById('fileInput').value = '';
    setFormatTabsDisabled(false);
    showToast('File cleared');
  }

  // ── Input: drag & drop ──────────────────────────────────
  const inputPanel = document.getElementById('inputPanel');
  const dropZone   = document.getElementById('dropZone');

  inputPanel.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) dropZone.classList.add('active');
  });

  inputPanel.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  inputPanel.addEventListener('dragleave', (e) => {
    if (!inputPanel.contains(e.relatedTarget)) dropZone.classList.remove('active');
  });

  inputPanel.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  // ── Helpers ─────────────────────────────────────────────
  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  // Override getInputBytes to use raw file bytes when available
  const _origGetInputBytes = getInputBytes;

  function getInputBytesOverride() {
    if (inputFileBytes) return inputFileBytes;
    return _origGetInputBytes();
  }

  // ── Output: save encrypted bytes as file ────────────────
  function downloadOutputFile() {
    if (!outputRawBytes) { showToast('No encrypted data available', 'error'); return; }
    const baseName = inputFileName ? inputFileName.replace(/(\.[^.]+)?$/, '') : 'encrypted';
    const outName  = baseName + '.enc';
    const blob = new Blob([outputRawBytes], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = outName;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Downloading file: ' + outName);
  }

  function downloadOutputText() {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('Nothing available to download', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'encrypted_' + Date.now() + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Download started...');
  }


  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msgEl = document.getElementById('toastMsg');
    icon.textContent = type === 'success' ? '✓' : '⚠';
    msgEl.textContent = msg;
    t.className = 'toast' + (type === 'error' ? ' error-toast' : '');
    // Force reflow to restart animation if already showing
    void t.offsetWidth;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // Utility: set status
  function setStatus(msg, type = 'idle') {
    const bar  = document.getElementById('statusBar');
    const txt  = document.getElementById('statusText');
    const time = document.getElementById('statusTime');
    bar.className = 'status-bar' + (type !== 'idle' ? ' ' + type : '');
    txt.textContent = msg;
    time.textContent = type !== 'idle' ? new Date().toLocaleTimeString('एन-जीबी', { hour12: false }) : '';
    if (type === 'error') {
      void bar.offsetWidth;
      bar.classList.add('shake');
      bar.addEventListener('animationend', () => bar.classList.remove('shake'), { once: true });
    }
  }

  // Update hints
  function updateHints(clearIV = false) {
    const ks = parseInt(document.getElementById('keySize').value);
    const mode = document.getElementById('mode').value;

    // Key: generated key is hex, so 256-bit = 64 hex chars, 192 = 48, 128 = 32
    const keyHexChars = ks / 4;
    document.getElementById('keyHint').innerHTML = `हेक्स कुंजी को <span id="keyLengthHint">${keyHexChars}</span> वर्णों की आवश्यकता है (${ks / 8} बाइट्स)`;

    // IV: CBC/CTR = 16 bytes = 32 hex chars; GCM = 12 bytes = 24 hex chars
    const ivBytes = mode === 'GCM' ? 12 : 16;
    const ivHexChars = ivBytes * 2;
    document.getElementById('ivLengthHint').textContent = ivHexChars;

    if (clearIV) {
      document.getElementById('iv').value = '';
      showToast('Mode changed. Please generate a fresh IV.', 'error');
    }

    document.getElementById('infoKeySize').textContent = ks;
    document.getElementById('infoMode').textContent = mode + ' तरीका';

    const sec = ks >= 256 ? 'HIGH' : ks >= 192 ? 'MEDIUM' : 'STANDARD';
    const secSub = ks >= 256 ? 'Military Grade' : ks >= 192 ? 'Government Grade' : 'Standard Grade';
    document.getElementById('infoSecurity').textContent = sec;
    document.getElementById('infoSecSub').textContent = secSub;
  }

  document.getElementById('mode').addEventListener('change', () => { updateHints(true); generateIV(); });
  document.getElementById('keySize').addEventListener('change', () => { updateHints(false); generateKey(); });

  // Generate random hex key
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

  function generateKey() {
    const ks = parseInt(document.getElementById('keySize').value);
    const bytes = new Uint8Array(ks / 8);
    crypto.getRandomValues(bytes);
    document.getElementById('secretKey').value = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
    showToast('Key generated');
  }

  function generateIV() {
    const mode = document.getElementById('mode').value;
    const len = mode === 'GCM' ? 12 : 16;
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    document.getElementById('iv').value = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
    showToast('IV generated');
  }

  // Input format
  function setInputFormat(btn, fmt) {
    // Don't allow switching to a disabled tab
    if (btn.disabled) return;
    document.querySelectorAll('.format-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    inputFormat = fmt;
  }

  // Validate whether content qualifies for HEX / BASE64 tabs
  function isValidHex(str) {
    return /^[0-9a-fA-F\s]*$/.test(str);
  }

  function isValidBase64(str) {
    return /^[A-Za-z0-9+/=\s]*$/.test(str);
  }

  function updateFormatTabAvailability() {
    if (inputFileBytes) return; // file mode — tabs locked by file logic
    const val = document.getElementById('inputText').value;
    const wrap = document.getElementById('formatTabsWrap');
    const hexTab = document.querySelector('.format-tab[data-fmt="hex"]');
    const b64Tab = document.querySelector('.format-tab[data-fmt="base64"]');

    const hexOk = isValidHex(val);
    const b64Ok = isValidBase64(val);

    // HEX tab
    hexTab.disabled = !hexOk;
    hexTab.style.opacity = hexOk ? '' : '0.35';
    hexTab.style.cursor  = hexOk ? '' : 'not-allowed';

    // BASE64 tab
    b64Tab.disabled = !b64Ok;
    b64Tab.style.opacity = b64Ok ? '' : '0.35';
    b64Tab.style.cursor  = b64Ok ? '' : 'not-allowed';

    // If current format is now invalid, fall back to TEXT
    if (inputFormat === 'hex' && !hexOk) {
      document.querySelectorAll('.format-tab').forEach(b => b.classList.remove('active'));
      document.querySelector('.format-tab[data-fmt="text"]').classList.add('active');
      inputFormat = 'text';
    }
    if (inputFormat === 'base64' && !b64Ok) {
      document.querySelectorAll('.format-tab').forEach(b => b.classList.remove('active'));
      document.querySelector('.format-tab[data-fmt="text"]').classList.add('active');
      inputFormat = 'text';
    }

    // Tooltip
    const reasons = [];
    if (!hexOk) reasons.push('Contains non-hex characters, so HEX is unavailable');
    if (!b64Ok) reasons.push('Contains non-Base64 characters, so BASE64 is unavailable');
    const tooltip = wrap.querySelector('.custom-tooltip');
    if (reasons.length) {
      tooltip.textContent = reasons.join(' · ');
      wrap.classList.add('tabs-disabled');
    } else {
      wrap.classList.remove('tabs-disabled');
    }
  }

  // Block invalid characters when HEX or BASE64 mode is active
  document.getElementById('inputText').addEventListener('keydown', function(e) {
    if (inputFileBytes) return;
    if (e.ctrlKey || e.metaKey || e.key.length > 1) return; // allow ctrl+v, backspace, etc.
    if (inputFormat === 'hex' && !/[0-9a-fA-F\s]/.test(e.key)) {
      e.preventDefault();
      showFormatBlockToast('HEX mode only allows 0-9 and a-f');
    } else if (inputFormat === 'base64' && !/[A-Za-z0-9+/=]/.test(e.key)) {
      e.preventDefault();
      showFormatBlockToast('BASE64 mode only allows letters, numbers, and +/=');
    }
  });

  let blockToastTimer = null;
  function showFormatBlockToast(msg) {
    // Use a small inline warning near the textarea instead of the main toast
    let el = document.getElementById('formatBlockWarning');
    if (!el) {
      el = document.createElement('div');
      el.id = 'formatBlockWarning';
      el.style.cssText = `
        position:absolute; bottom:44px; left:18px; right:18px;
        background:rgba(255,80,80,0.12); border:1px solid rgba(255,80,80,0.4);
        border-radius:3px; padding:6px 12px; font-family:var(--mono);
        font-size:11px; color:#ff8080; z-index:10;
        transition: opacity 0.2s; pointer-events:none;
      `;
      document.querySelector('.input-panel').style.position = 'relative';
      document.querySelector('.input-panel').appendChild(el);
    }
    el.textContent = '⚠ ' + msg;
    el.style.opacity = '1';
    if (blockToastTimer) clearTimeout(blockToastTimer);
    blockToastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2000);
  }

  // Stats update + dynamic tab check
  document.getElementById('inputText').addEventListener('input', function() {
    const len = new TextEncoder().encode(this.value).length;
    document.getElementById('inputStat').textContent = len + ' bytes';
    updateFormatTabAvailability();
  });

  function updateOutputStat(text) {
    if (!text) {
      document.getElementById('outputStat').textContent = '0 बाइट्स';
      return;
    }
    document.getElementById('outputStat').textContent = text.length + ' chars';
  }

  // Convert key/iv string to ArrayBuffer (assumes hex)
  function hexToBytes(hex) {
    hex = hex.replace(/\s/g, '');
    if (hex.length % 2 !== 0) throw new Error('अमान्य हेक्स स्ट्रिंग');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2)
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes;
  }

  function strToKeyBytes(str, bits) {
    const needed = bits / 8;
    const enc = new TextEncoder().encode(str);
    const buf = new Uint8Array(needed);
    buf.set(enc.slice(0, needed));
    return buf;
  }

  function getKeyBytes() {
    const keyStr = document.getElementById('secretKey').value.replace(/\s/g, '');
    const ks = parseInt(document.getElementById('keySize').value);
    const neededHexChars = ks / 4;

    if (!keyStr) throw new Error('कृपया एक कुंजी दर्ज करें या उत्पन्न करें');

    if (!/^[0-9a-fA-F]+$/.test(keyStr)) {
      throw new Error('कुंजी एक हेक्स स्ट्रिंग होनी चाहिए जिसमें केवल 0-9 और ए-एफ हो');
    }

    if (keyStr.length !== neededHexChars) {
      throw new Error(`${ks}-बिट कुंजियों के लिए ${neededHexChars} हेक्स वर्णों की आवश्यकता होती है। वर्तमान लंबाई: ${keyStr.length}। कृपया एक नई कुंजी जनरेट करें.`);
    }

    return hexToBytes(keyStr);
  }

  function getIVBytes() {
    const ivStr = document.getElementById('iv').value.replace(/\s/g, '');
    const mode = document.getElementById('mode').value;
    const neededBytes = mode === 'GCM' ? 12 : 16;
    const neededHexChars = neededBytes * 2;

    if (!ivStr) throw new Error(`कृपया IV दर्ज करें या जनरेट करें (${mode} मोड के लिए ${neededHexChars} हेक्स वर्ण आवश्यक हैं)`);

    // Must be valid hex
    if (!/^[0-9a-fA-F]+$/.test(ivStr)) {
      throw new Error(`IV हेक्स (0-9, a-f) होना चाहिए। ${mode} मोड के लिए ${neededHexChars} वर्णों की आवश्यकता होती है।`);
    }

    if (ivStr.length !== neededHexChars) {
      throw new Error(`${mode} मोड को IV के लिए ${neededHexChars} हेक्स वर्ण (${neededBytes} बाइट्स) की आवश्यकता होती है। वर्तमान लंबाई: ${ivStr.length}। कृपया एक नया IV जनरेट करें.`);
    }

    return hexToBytes(ivStr);
  }

  function getInputBytes() {
    const text = document.getElementById('inputText').value;
    if (!text) throw new Error('कृपया संसाधित करने के लिए सामग्री दर्ज करें');
    if (inputFormat === 'hex') {
      return hexToBytes(text);
    } else if (inputFormat === 'base64') {
      const raw = atob(text);
      return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
    }
    return new TextEncoder().encode(text);
  }

  function bytesToOutput(bytes) {
    const fmt = document.getElementById('outputEncoding').value;
    if (fmt === 'hex') {
      return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
    }
    // base64
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }

  // AES-192 is not supported in some browsers (notably Chrome)
  // Test once and cache the result
  let aes192Supported = null;
  async function checkAes192Support() {
    if (aes192Supported !== null) return aes192Supported;
    try {
      const testKey = new Uint8Array(24);
      await crypto.subtle.importKey('raw', testKey, { name: 'AES-CBC' }, false, ['encrypt']);
      aes192Supported = true;
    } catch {
      aes192Supported = false;
    }
    return aes192Supported;
  }

  async function getCryptoAlgo(mode) {
    const ivBytes = getIVBytes();
    if (mode === 'CBC') return { name: 'AES-CBC', iv: ivBytes };
    if (mode === 'CTR') return { name: 'AES-CTR', counter: ivBytes, length: 64 };
    if (mode === 'GCM') return { name: 'AES-GCM', iv: ivBytes };
    throw new Error('असमर्थित मोड');
  }

  async function importKey(keyBytes, mode, usage) {
    const algoName = mode === 'CTR' ? 'AES-CTR' : mode === 'GCM' ? 'AES-GCM' : 'AES-CBC';
    return await crypto.subtle.importKey(
      'raw', keyBytes, { name: algoName }, false, usage
    );
  }

  function flashField(el) {
    el.classList.remove('field-error');
    void el.offsetWidth; // reflow to restart animation
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

  async function runEncrypt() {
    if (!validateFields()) return;
    const outPanel = document.querySelector('.output-panel');
    try {
      outPanel.classList.add('processing');
      const mode = document.getElementById('mode').value;
      const ks   = parseInt(document.getElementById('keySize').value);

      // AES-192 not supported in all browsers (e.g. Chrome)
      if (ks === 192 && !(await checkAes192Support())) {
        document.getElementById('keySize').value = '256';
        generateKey();
        updateHints(false);
        throw new Error('यह ब्राउज़र AES-192 का समर्थन नहीं करता है, इसलिए टूल स्वचालित रूप से AES-256 पर स्विच हो गया');
      }
      const keyBytes = getKeyBytes();
      const algo = await getCryptoAlgo(mode);
      // Use raw file bytes if a file was loaded, else fall back to textarea
      const inputBytes = inputFileBytes || getInputBytes();
      const cryptoKey = await importKey(keyBytes, mode, ['encrypt']);
      const encrypted = await crypto.subtle.encrypt(algo, cryptoKey, inputBytes);
      const encryptedBytes = new Uint8Array(encrypted);

      // Store raw bytes for binary file download
      outputRawBytes = encryptedBytes;

      const result = bytesToOutput(encryptedBytes);
      document.getElementById('outputText').value = result;
      document.getElementById('outputFormat').textContent = document.getElementById('outputEncoding').value.toUpperCase();
      updateOutputStat(result);
      totalBytesProcessed += inputBytes.length;
      updateInfoBytes();

      // Always show .enc download strip after encryption
      const strip = document.getElementById('outputFileStrip');
      const baseName = inputFileName ? inputFileName.replace(/(\.[^.]+)?$/, '') : 'encrypted_' + Date.now();
      document.getElementById('outputFileLabel').textContent = baseName + '.enc - बाइनरी फ़ाइल डाउनलोड करने के लिए तैयार है';
      strip.classList.add('visible');

      // Show copy-config strip
      document.getElementById('copyConfigStrip').classList.add('visible');

      // Track used GCM nonces
      if (mode === 'GCM') {
        const nonce = document.getElementById('iv').value.trim();
        usedNonces.add(nonce);
        checkNonceReuse();
      }

      setStatus(`✓ एन्क्रिप्शन सफल - ${formatBytes(inputBytes.length)} -> ${formatBytes(encryptedBytes.length)} (${mode}/AES-${document.getElementById('keySize').value})`, 'success');
    } catch(e) {
      // Flash the field that caused the error
      const msg = e.message || '';
      if (msg.includes('key')) flashField(document.getElementById('secretKey'));
      else if (msg.includes('IV') || msg.includes('Nonce')) flashField(document.getElementById('iv'));
      setStatus('✗ ' + e.message, 'error');
    } finally {
      outPanel.classList.remove('processing');
    }
  }

  function updateInfoBytes() {
    const el = document.getElementById('infoBytes');
    const prev = parseInt(el.textContent) || 0;
    const target = totalBytesProcessed;
    let current = prev;
    const step = Math.ceil((target - current) / 10);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 50);
  }

  function clearInput() {
    document.getElementById('inputText').value = '';
    document.getElementById('inputStat').textContent = '0 बाइट्स';
    setStatus('तैयार - कुंजी कॉन्फ़िगर करें और एन्क्रिप्ट करें पर क्लिक करें');
  }

  async function pasteInput() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('inputText').value = text;
      const len = new TextEncoder().encode(text).length;
      document.getElementById('inputStat').textContent = len + ' bytes';
      showToast('Pasted');
    } catch(e) {
      showToast('Unable to access the clipboard', 'error');
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }

  function copyField(fieldId, btn) {
    const val = document.getElementById(fieldId).value;
    if (!val) { showToast('This field is empty', 'error'); return; }

    const doSuccess = () => {
      const original = btn.innerHTML;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.classList.add('copied');
      showToast('Copied');
      setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).then(doSuccess).catch(() => {
        fallbackCopy(val) ? doSuccess() : showToast('Copy failed, please copy manually', 'error');
      });
    } else {
      fallbackCopy(val) ? doSuccess() : showToast('Copy failed, please copy manually', 'error');
    }
  }

  function copyOutput(btn) {
    const text = document.getElementById('outputText').value;
    if (!text) { showToast('Nothing to copy', 'error'); return; }

    const doSuccess = () => {
      const original = btn.innerHTML;
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.style.borderColor = 'var(--accent2)';
      btn.style.color = 'var(--accent2)';
      showToast('Copied to clipboard');
      setTimeout(() => { btn.innerHTML = original; btn.style.borderColor = ''; btn.style.color = ''; }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(doSuccess).catch(() => {
        fallbackCopy(text) ? doSuccess() : showToast('Copy failed, please copy manually', 'error');
      });
    } else {
      fallbackCopy(text) ? doSuccess() : showToast('Copy failed, please copy manually', 'error');
    }
  }

  // Init
  updateHints(false);
  generateKey();
  generateIV();

  // Disable AES-192 option if not supported by this browser
  checkAes192Support().then(supported => {
    if (!supported) {
      const opt = document.querySelector('#keySize option[value="192"]');
      if (opt) {
        opt.disabled = true;
        opt.textContent = '192-बिट (असमर्थित)';
      }
      if (document.getElementById('keySize').value === '192') {
        document.getElementById('keySize').value = '256';
        generateKey();
        updateHints(false);
      }
    }
  });
