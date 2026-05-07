// ─── CRC32 lookup table generator ───────────────────────────────────────────
function makeLUT(poly) {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (poly ^ (c >>> 1)) : (c >>> 1);
    }
    t[i] = c;
  }
  return t;
}

function makeLUTNormal(poly) {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i << 24;
    for (let j = 0; j < 8; j++) {
      c = (c & 0x80000000) ? (poly ^ (c << 1)) : (c << 1);
    }
    t[i] = c >>> 0;
  }
  return t;
}

// Pre-built tables
const LUT_ISO   = makeLUT(0xEDB88320);      // CRC-32/ISO-HDLC
const LUT_CAST  = makeLUT(0x82F63B78);      // CRC-32C
const LUT_STD   = makeLUTNormal(0x04C11DB7); // CRC-32/MPEG-2 & BZIP2

function crc32Reflected(lut, data, init, xorout) {
  let crc = init >>> 0;
  for (let i = 0; i < data.length; i++) {
    crc = (lut[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ xorout) >>> 0;
}

function crc32Normal(lut, data, init, xorout) {
  let crc = init >>> 0;
  for (let i = 0; i < data.length; i++) {
    crc = (lut[((crc >>> 24) ^ data[i]) & 0xFF] ^ (crc << 8)) >>> 0;
  }
  return (crc ^ xorout) >>> 0;
}

function calcAll(bytes) {
  return {
    iso:        crc32Reflected(LUT_ISO,  bytes, 0xFFFFFFFF, 0xFFFFFFFF),
    castagnoli: crc32Reflected(LUT_CAST, bytes, 0xFFFFFFFF, 0xFFFFFFFF),
    mpeg2:      crc32Normal(LUT_STD,    bytes, 0xFFFFFFFF, 0x00000000),
    bzip2:      crc32Normal(LUT_STD,    bytes, 0xFFFFFFFF, 0xFFFFFFFF),
  };
}

// ─── State ───────────────────────────────────────────────────────────────────
let currentFileBytes = null;
let currentFileName  = null;
let inputEncoding    = 'utf8';
let calcCount        = 0;
let lastResults      = null;

// ─── Input parsing ───────────────────────────────────────────────────────────
function getInputBytes() {
  if (currentFileBytes) return currentFileBytes;
  const text = document.getElementById('inputText').value;
  if (!text) throw new Error('कृपया डेटा दर्ज करें या फ़ाइल अपलोड करें');
  if (inputEncoding === 'hex') {
    const clean = text.replace(/\s/g,'');
    if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('हेक्स इनपुट केवल 0-9 और ए-एफ की अनुमति देता है');
    if (clean.length % 2 !== 0) throw new Error('हेक्स इनपुट में वर्णों की सम संख्या होनी चाहिए');
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i*2,i*2+2),16);
    return bytes;
  }
  if (inputEncoding === 'base64') {
    try {
      let b64 = text.trim().replace(/\s/g, '');
      const rem = b64.length % 4;
      if (rem === 1) throw new Error('अमान्य बेस64: एक एकल वर्ण किसी भी बाइट को एन्कोड नहीं कर सकता, कम से कम 2 वर्ण आवश्यक हैं');
      if (rem > 0) b64 += '='.repeat(4 - rem);
      const raw = atob(b64);
      return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
    } catch(err) {
      throw new Error(err.message.startsWith('Base64') ? err.message : 'अमान्य बेस64 प्रारूप, कृपया अपना इनपुट जांचें');
    }
  }
  return new TextEncoder().encode(text);
}

// ─── Formatting ──────────────────────────────────────────────────────────────
function formatCRC(val, fmt) {
  switch (fmt) {
    case 'hex':     return '0x' + val.toString(16).toUpperCase().padStart(8,'0');
    case 'decimal': return val.toString(10);
    case 'binary':  return '0b' + val.toString(2).padStart(32,'0');
    case 'octal':   return '0o' + val.toString(8).padStart(11,'0');
  }
}

function allFormats(val) {
  return [
    { label: 'हेक्स', v: '0x' + val.toString(16).toUpperCase().padStart(8,'0') },
    { label: 'दिसम्बर', v: val.toString(10) },
    { label: 'बिन', v: val.toString(2).padStart(32,'0') },
    { label: 'अक्टूबर', v: '0o' + val.toString(8).padStart(11,'0') },
  ];
}

const VARIANT_META = {
  iso:        { name: 'CRC-32 / ISO-HDLC', desc: 'Polynomial 0xEDB88320 · reflected input/output · ZIP / PNG / Ethernet' },
  castagnoli: { name: 'CRC-32C / Castagnoli', desc: 'Polynomial 0x82F63B78 · reflected input/output · iSCSI / NVMe / SCTP' },
  mpeg2:      { name: 'CRC-32 / MPEG-2',    desc: 'Polynomial 0x04C11DB7 · no reflection · MPEG-2 transport stream' },
  bzip2:      { name: 'CRC-32 / BZIP2',     desc: 'Polynomial 0x04C11DB7 · no reflection · BZip2 / AAL5' },
};

// ─── Render results ───────────────────────────────────────────────────────────
const VARIANTS = ['iso','castagnoli','mpeg2','bzip2'];

function renderResults(results) {
  const fmt    = document.getElementById('outputFormat').value;
  const active = document.getElementById('crcVariant').value;
  lastResults  = results;

  // ── Primary card ──
  const meta = VARIANT_META[active];
  document.getElementById('primary-name').textContent  = meta.name;
  document.getElementById('primary-desc').textContent  = meta.desc;
  const pv = document.getElementById('primary-value');
  pv.textContent = formatCRC(results[active], fmt);
  pv.classList.remove('empty');

  // format pills
  const pf = document.getElementById('primary-fmts');
  pf.innerHTML = '';
  allFormats(results[active]).forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'fmt-pill';
    btn.innerHTML = `<span class="fmt-label">${f.label}</span> ${f.v}`;
    btn.title = `${f.label} कॉपी करें`;
    btn.onclick = () => copyText(f.v, btn);
    pf.appendChild(btn);
  });

  // flash
  pv.classList.add('result-flash');
  pv.addEventListener('animationend', () => pv.classList.remove('result-flash'), { once: true });

  // ── Secondary cards ──
  VARIANTS.forEach(v => {
    const sec = document.getElementById('sec-' + v);
    const sv  = document.getElementById('secval-' + v);
    sv.textContent = formatCRC(results[v], fmt);
    sv.classList.remove('empty');
    sec.classList.toggle('is-active', v === active);
  });
}

// ─── Main calculate ───────────────────────────────────────────────────────────
function runCalculate(silent = false) {
  const t0 = performance.now();
  try {
    const bytes = getInputBytes();
    const results = calcAll(bytes);
    const elapsed = (performance.now() - t0).toFixed(2);

    renderResults(results);

    calcCount++;
    document.getElementById('infoBytes').textContent = bytes.length.toLocaleString();
    document.getElementById('infoCalcs').textContent = calcCount;
    document.getElementById('infoMs').textContent = elapsed;
    document.getElementById('infoVariant').textContent =
      document.getElementById('crcVariant').selectedOptions[0].text.split('(')[0].split(' / ').pop().split('/')[0].trim();

    const fmt = document.getElementById('outputFormat').value;
    const active = document.getElementById('crcVariant').value;
    const mainVal = formatCRC(results[active], fmt);
    setStatus(`✓ गणना पूर्ण - ${active.toUpperCase()}: ${mainVal} (${bytes.length} बाइट्स, ${elapsed}ms)`, 'success');

    if (document.getElementById('expectedCRC').value.trim()) runVerify();

  } catch(e) {
    if (silent) return; // Stay quiet while typing

    const enc = document.getElementById('inputEncoding').value;
    const encSection = (enc === 'hex' || enc === 'base64') ? 'explain-encoding' : null;
    const encIdx = enc === 'hex' ? 1 : enc === 'base64' ? 2 : 0;
    const linkHTML = encSection
      ? ` <a class="status-link" href="javascript:void(0)" onclick="scrollToCard('${encSection}',${encIdx})">View format guide ↗</a>`
      : '';
    setStatusHTML('✗ ' + e.message + linkHTML, 'error');

    const bar = document.getElementById('statusBar');
    bar.classList.remove('shake');
    void bar.offsetWidth;
    bar.classList.add('shake');
    bar.addEventListener('animationend', () => bar.classList.remove('shake'), { once: true });

    const txt = document.getElementById('inputText');
    txt.classList.remove('field-error');
    void txt.offsetWidth;
    txt.classList.add('field-error');
    txt.addEventListener('animationend', () => txt.classList.remove('field-error'), { once: true });
  }
}

// ─── Verify ───────────────────────────────────────────────────────────────────
function runVerify() {
  if (!lastResults) { showToast('Please calculate CRC32 first', 'error'); return; }
  const raw = document.getElementById('expectedCRC').value.trim();
  if (!raw) { showToast('Please enter the expected checksum', 'error'); return; }

  let expected;
  if (/^0x/i.test(raw)) {
    expected = parseInt(raw, 16) >>> 0;
  } else if (/^[01]+$/.test(raw) && raw.length > 10) {
    expected = parseInt(raw, 2) >>> 0;
  } else {
    expected = parseInt(raw.replace(/^0o/i,''), /^0o/i.test(raw) ? 8 : 10) >>> 0;
  }

  if (isNaN(expected)) { showToast('Unable to parse the checksum. Supported formats: 0x... (hex), decimal, and binary', 'error'); return; }

  const active = document.getElementById('crcVariant').value;
  const got = lastResults[active];
  const match = got === expected;

  const el = document.getElementById('verifyResult');
  el.style.display = 'flex';
  el.className = 'verify-result ' + (match ? 'match' : 'mismatch');
  el.innerHTML = match
    ? `✓ चेकसम मिलान - परिकलित मान <strong style="margin:0 6px">${formatCRC(got,'hex')}</strong> अपेक्षित मान से मेल खाता है`
    : `✗ &nbsp; Checksum mismatch — calculated value <strong style="margin:0 6px">${formatCRC(got,'hex')}</strong> ≠ expected value <strong style="margin:0 6px">0x${expected.toString(16).toUpperCase().padStart(8,'0')}</strong>`;
}

// ─── File handling ─────────────────────────────────────────────────────────────
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  loadFile(file);
}

function setEncodingTabsDisabled(disabled) {
  document.querySelectorAll('.format-tab').forEach(t => {
    if (disabled) {
      t.classList.add('tab-disabled');
    } else {
      t.classList.remove('tab-disabled');
    }
  });
  const sel = document.getElementById('inputEncoding');
  sel.disabled = disabled;
}

function isTextFile(bytes, name) {
  // Check by extension first
  const ext = name.split('.').pop().toLowerCase();
  const textExts = ['txt','md','json','xml','html','htm','css','js','ts','csv','log','yaml','yml','toml','ini','conf','sh','py','java','c','cpp','h','rs','go','rb','php','sql'];
  if (textExts.includes(ext)) return true;
  // Heuristic: scan first 512 bytes for null bytes
  const check = Math.min(bytes.length, 512);
  for (let i = 0; i < check; i++) {
    if (bytes[i] === 0) return false;
  }
  return true;
}

function buildHexDump(bytes) {
  const PREVIEW_ROWS = 32; // max rows to show
  const lines = [];
  const total = Math.min(bytes.length, PREVIEW_ROWS * 16);
  for (let i = 0; i < total; i += 16) {
    const addr = i.toString(16).toUpperCase().padStart(8, '0');
    const chunk = bytes.slice(i, i + 16);
    const hex = Array.from(chunk).map(b => b.toString(16).toUpperCase().padStart(2,'0')).join(' ');
    const ascii = Array.from(chunk).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '·').join('');
    lines.push(`${addr}  ${hex.padEnd(47)}  ${ascii}`);
  }
  if (bytes.length > total) {
    lines.push(`\n... previewing the first ${total} bytes out of ${bytes.length} total file bytes`);
  }
  return lines.join('\n');
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    currentFileBytes = new Uint8Array(e.target.result);
    currentFileName  = file.name;

    const ta = document.getElementById('inputText');
    const badge = document.getElementById('previewTypeBadge');

    if (isTextFile(currentFileBytes, file.name)) {
      // Text preview — decode as UTF-8
      const preview = new TextDecoder('utf-8', { fatal: false }).decode(currentFileBytes);
      ta.value = preview;
      ta.classList.add('preview-mode');
      badge.textContent = 'पाठ पूर्वावलोकन';
      badge.className = 'preview-type-badge text';
      badge.style.display = 'inline-flex';
    } else {
      // Binary — hex dump
      ta.value = buildHexDump(currentFileBytes);
      ta.classList.add('preview-mode');
      badge.textContent = 'हेक्स डंप';
      badge.className = 'preview-type-badge binary';
      badge.style.display = 'inline-flex';
    }

    ta.readOnly = true;
    document.getElementById('inputStat').textContent = formatBytes(file.size);
    document.getElementById('fileBadge').style.display = 'flex';
    document.getElementById('fileNameLabel').textContent = file.name;
    setEncodingTabsDisabled(true);
    showToast(`Loaded ${file.name} (${formatBytes(file.size)})`);
    runCalculate();
  };
  reader.readAsArrayBuffer(file);
}

function clearFile() {
  currentFileBytes = null;
  currentFileName  = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('fileBadge').style.display = 'none';
  const ta = document.getElementById('inputText');
  ta.value = '';
  ta.readOnly = false;
  ta.classList.remove('preview-mode');
  ta.placeholder = 'यहां टेक्स्ट दर्ज करें, या एक फ़ाइल अपलोड करें...\\n\\nवास्तविक समय में CRC32 चेकसम की गणना करें';
  document.getElementById('inputStat').textContent = '0 बाइट्स';
  document.getElementById('previewTypeBadge').style.display = 'none';
  setEncodingTabsDisabled(false);
}

// ─── Drag & drop ─────────────────────────────────────────────────────────────
const inputArea = document.getElementById('inputArea');
const dropZone  = document.getElementById('dropZone');

document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('dragenter', e => {
  if (e.dataTransfer.types.includes('Files')) dropZone.classList.add('active');
});
document.addEventListener('dragleave', e => {
  if (!inputArea.contains(e.relatedTarget)) dropZone.classList.remove('active');
});
document.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('active');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// ─── Encoding tabs ────────────────────────────────────────────────────────────
function setEncoding(btn, enc) {
  inputEncoding = enc;
  document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('inputEncoding').value = enc;
  if (document.getElementById('inputText').value.trim() || currentFileBytes) runCalculate(true);
}

// ─── Live update ──────────────────────────────────────────────────────────────
document.getElementById('inputText').addEventListener('input', function() {
  const bytes = new TextEncoder().encode(this.value);
  document.getElementById('inputStat').textContent = bytes.length + ' bytes';
  clearTimeout(window._debounce);
  window._debounce = setTimeout(() => runCalculate(true), 200);
});

document.getElementById('crcVariant').addEventListener('change', function() {
  if (lastResults) renderResults(lastResults);
  document.getElementById('infoVariant').textContent =
    this.selectedOptions[0].text.split('（')[0].split(' / ').pop().trim();
});

function switchVariant(v) {
  document.getElementById('crcVariant').value = v;
  document.getElementById('infoVariant').textContent =
    document.getElementById('crcVariant').selectedOptions[0].text.split('（')[0].split(' / ').pop().trim();
  if (lastResults) renderResults(lastResults);
}

document.getElementById('inputEncoding').addEventListener('change', function() {
  inputEncoding = this.value;
  document.querySelectorAll('.format-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.enc === inputEncoding);
  });
  if (document.getElementById('inputText').value.trim() || currentFileBytes) runCalculate(true);
});

document.getElementById('outputFormat').addEventListener('change', function() {
  if (lastResults) renderResults(lastResults);
});

// ─── Utilities ────────────────────────────────────────────────────────────────
function clearInput() {
  document.getElementById('inputText').value = '';
  document.getElementById('inputStat').textContent = '0 बाइट्स';
  setStatus('तैयार - डेटा दर्ज करें और "CRC32 की गणना करें" पर क्लिक करें');
}

function clearAll() {
  clearInput();
  clearFile();
  lastResults = null;
  document.getElementById('expectedCRC').value = '';
  document.getElementById('verifyResult').style.display = 'none';

  // reset primary
  const pv = document.getElementById('primary-value');
  pv.textContent = '—';
  pv.classList.add('empty');
  document.getElementById('primary-name').textContent = '—';
  document.getElementById('primary-desc').textContent = '';
  document.getElementById('primary-fmts').innerHTML = '';

  // reset secondary
  VARIANTS.forEach(v => {
    const sv = document.getElementById('secval-' + v);
    sv.textContent = '—';
    sv.classList.add('empty');
    document.getElementById('sec-' + v).classList.remove('is-active');
  });

  document.getElementById('infoBytes').textContent = '0';
  document.getElementById('infoMs').textContent = '—';
  setStatus('तैयार - सारा डेटा रीसेट कर दिया गया है');
}

async function pasteInput() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('inputText').value = text;
    const bytes = new TextEncoder().encode(text);
    document.getElementById('inputStat').textContent = bytes.length + ' bytes';
    showToast('Pasted');
    runCalculate();
  } catch {
    showToast('Unable to access the clipboard, please paste manually', 'error');
  }
}

function copyPrimary() {
  if (!lastResults) { showToast('No result available yet', 'error'); return; }
  const active = document.getElementById('crcVariant').value;
  const fmt = document.getElementById('outputFormat').value;
  copyText(formatCRC(lastResults[active], fmt), document.getElementById('copy-primary'));
}

function copyResult(variant) {
  if (!lastResults) { showToast('No result available yet', 'error'); return; }
  const fmt = document.getElementById('outputFormat').value;
  copyText(formatCRC(lastResults[variant], fmt), null);
}

function copyText(text, btn) {
  const doSuccess = () => {
    showToast('Copied');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✓ कॉपी किया गया';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(doSuccess).catch(() => fallbackCopy(text) ? doSuccess() : showToast('Copy failed', 'error'));
  } else {
    fallbackCopy(text) ? doSuccess() : showToast('Copy failed, please copy manually', 'error');
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

function setStatus(msg, type='') {
  const bar  = document.getElementById('statusBar');
  const text = document.getElementById('statusText');
  const time = document.getElementById('statusTime');
  bar.className = 'status-bar' + (type ? ' ' + type : '');
  text.textContent = msg;
  const now = new Date();
  time.textContent = now.toLocaleTimeString('एन-जीबी', { hour12: false });
}

function setStatusHTML(html, type='') {
  const bar  = document.getElementById('statusBar');
  const text = document.getElementById('statusText');
  const time = document.getElementById('statusTime');
  bar.className = 'status-bar' + (type ? ' ' + type : '');
  text.innerHTML = html;
  const now = new Date();
  time.textContent = now.toLocaleTimeString('एन-जीबी', { hour12: false });
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// scrollToCard: scroll to a section header then spotlight the nth card
function scrollToCard(sectionId, cardIdx) {
  const header = document.getElementById(sectionId);
  if (!header) return;

  const wrapId = 'wrap-' + sectionId.replace('explain-', '');
  const wrap   = document.getElementById(wrapId);
  if (!wrap) return;

  // Scroll header into view
  header.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // After scroll settles, light up the target card
  setTimeout(() => {
    wrap.querySelectorAll('.explain-card').forEach(c => c.classList.remove('explain-card--lit'));
    const cards = wrap.querySelectorAll('.explain-card');
    const target = (cardIdx !== undefined && cards[cardIdx]) ? cards[cardIdx] : null;
    if (target) {
      target.classList.add('explain-card--lit');
      setTimeout(() => target.classList.remove('explain-card--lit'), 2400);
    } else {
      // No specific card — light the whole grid briefly
      wrap.classList.remove('highlighted');
      void wrap.offsetWidth;
      wrap.classList.add('highlighted');
      setTimeout(() => wrap.classList.remove('highlighted'), 2000);
    }
  }, 420);
}

// Map variant value → card index in explain-variants grid
const VARIANT_INDEX = { iso: 0, castagnoli: 1, mpeg2: 2, bzip2: 3 };
// Map inputEncoding value → card index
const ENCODING_INDEX = { utf8: 0, hex: 1, base64: 2 };
// Map outputFormat value → card index
const FORMAT_INDEX = { hex: 0, decimal: 1, binary: 2, octal: 3 };

function formatBytes(n) {
  if (n < 1024) return n + ' bytes';
  if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
  return (n/1024/1024).toFixed(2) + ' MB';
}
