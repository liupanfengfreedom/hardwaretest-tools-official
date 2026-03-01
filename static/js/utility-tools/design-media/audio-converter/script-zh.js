"use strict";

let files = [];

// ── Waveform decoration ──────────────────────────────────────
function buildWaveform() {
  const deco = document.getElementById('waveform-deco');
  deco.innerHTML = '';
  [8,14,22,18,30,12,26,20,32,15,28,22,16,30,24,10,20,32,18,14,26,30,22,12,28,16,32,20,18,24]
    .forEach((h, i) => {
      const b = document.createElement('div');
      b.className = 'wave-bar';
      b.style.cssText = 'height:'+h+'px;animation-delay:'+(i*0.05)+'s';
      deco.appendChild(b);
    });
}

// ── Format UI ────────────────────────────────────────────────
var REALTIME_FORMATS = ['ogg', 'webm'];
var LOSSLESS_FORMATS  = ['wav', 'aiff'];

// Check browser MediaRecorder support; disable unavailable formats
(function checkSupport() {
  var types = {
    ogg:  ['audio/ogg;codecs=opus', 'audio/ogg'],
    webm: ['audio/webm;codecs=opus', 'audio/webm']
  };
  Object.keys(types).forEach(function(fmt) {
    var supported = types[fmt].some(function(t) {
      return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t);
    });
    var opt = document.getElementById('opt-' + fmt);
    if (opt && !supported) {
      opt.disabled = true;
      opt.textContent += ' (此浏览器不支持)';
    }
  });
})();

function onFormatChange() {
  var fmt = document.getElementById('format-select').value;
  var bitrateRow = document.getElementById('bitrate-row');
  var note = document.getElementById('format-note');
  var isRealtime = REALTIME_FORMATS.indexOf(fmt) !== -1;

  bitrateRow.style.display = (fmt === 'mp3') ? 'block' : 'none';

  var msgs = {
    wav:  '无损 PCM 格式，完美保留原始音质。文件较大，适合专业制作与存档。',
    aiff: 'Apple AIFF 格式，大端序 PCM，与 WAV 音质相同，适合 Mac/iOS 工作流。',
    ogg:  'OGG/Opus 由浏览器实时编码，编码速度与音频时长相同（1× 实时速率），较长音频请耐心等待。',
    webm: 'WebM/Opus 由浏览器实时编码，编码速度与音频时长相同（1× 实时速率），较长音频请耐心等待。'
  };
  if (msgs[fmt]) {
    note.textContent = (isRealtime ? '⏱ 注意：' : 'ℹ ') + msgs[fmt];
    note.classList.add('show');
    note.style.borderColor = isRealtime ? 'rgba(245,166,35,0.5)' : '';
  } else {
    note.classList.remove('show');
  }
}
onFormatChange();

document.getElementById('bitrate-slider').addEventListener('input', function() {
  document.getElementById('bitrate-val').textContent = this.value;
});

// ── Drag & Drop / File input ─────────────────────────────────
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('click', () => document.getElementById('file-input').click());
dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drag-over'); });
dropZone.addEventListener('drop', function(e) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  addFiles(Array.from(e.dataTransfer.files));
});
document.getElementById('file-input').addEventListener('change', function(e) {
  addFiles(Array.from(e.target.files));
  e.target.value = '';
});

function addFiles(newFiles) {
  newFiles.forEach(function(f) {
    if (!files.find(function(x) { return x.name === f.name && x.size === f.size; })) {
      var entry = { file: f, name: f.name, size: f.size, status: 'scanning', id: Date.now() + Math.random(),
                    detectedSR: null, detectedCh: null, detectedDur: null };
      files.push(entry);
      probeAudio(entry);   // async, updates entry in-place
    }
  });
  renderFileList();
}

// Quickly decode the file just to read metadata (sampleRate, channels, duration)
function probeAudio(entry) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) { entry.status = 'ready'; renderFileList(); return; }
    var ctx = new AudioCtx();
    ctx.decodeAudioData(e.target.result.slice(0), function(buf) {
      ctx.close();
      entry.detectedSR  = buf.sampleRate;
      entry.detectedCh  = buf.numberOfChannels;
      entry.detectedDur = buf.duration;
      entry.status = 'ready';
      renderFileList();
      // If this is the only file, auto-reflect its SR in the select hint label
      updateSRHint();
    }, function() {
      ctx.close();
      entry.status = 'ready';   // can't probe but still allow attempt
      renderFileList();
    });
  };
  reader.readAsArrayBuffer(entry.file);
}

function updateSRHint() {
  var srSel = document.getElementById('samplerate-select');
  var chSel = document.getElementById('channels-select');
  if (srSel.value !== 'auto' && chSel.value !== 'auto') return;
  // Collect unique detected values across all probed files
  var srs = files.filter(function(f){ return f.detectedSR; }).map(function(f){ return f.detectedSR; });
  var chs = files.filter(function(f){ return f.detectedCh; }).map(function(f){ return f.detectedCh; });
  var uniqueSRs = srs.filter(function(v,i,a){ return a.indexOf(v)===i; });
  var uniqueChs = chs.filter(function(v,i,a){ return a.indexOf(v)===i; });
  // Update the auto option label
  var autoOptSR = srSel.querySelector('option[value="auto"]');
  var autoOptCh = chSel.querySelector('option[value="auto"]');
  if (autoOptSR) {
    autoOptSR.textContent = uniqueSRs.length === 1
      ? '✦ 原始采样率 — ' + uniqueSRs[0] + ' Hz'
      : uniqueSRs.length > 1
        ? '✦ 原始采样率（混合）'
        : '✦ 原始采样率（自动）';
  }
  if (autoOptCh) {
    autoOptCh.textContent = uniqueChs.length === 1
      ? '✦ 原始声道 — ' + (uniqueChs[0] === 1 ? 'Mono' : uniqueChs[0] === 2 ? 'Stereo' : uniqueChs[0]+'ch')
      : '✦ 原始声道（自动）';
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function formatDuration(sec) {
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function getExt(name) {
  var ext = (name.split('.').pop() || '?').toUpperCase().slice(0, 4);
  var videoExts = ['MP4','MOV','MKV','AVI','M4V','3GP','TS','WMV','FLV','WEBM'];
  return { ext: ext, isVideo: videoExts.indexOf(ext) !== -1 };
}

function renderFileList() {
  const list = document.getElementById('file-list');
  const section = document.getElementById('file-list-section');
  const waveDeco = document.getElementById('waveform-deco');
  if (files.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  waveDeco.style.display = 'flex';
  buildWaveform();
  list.innerHTML = '';
  files.forEach(function(f, idx) {
    var sc = { ready:'status-ready', scanning:'status-scanning', converting:'status-converting', done:'status-done', error:'status-error' }[f.status] || 'status-ready';
    var st = { ready:'READY', scanning:'SCANNING', converting:'PROCESSING', done:'DONE', error:'ERROR' }[f.status] || 'READY';

    // Build audio info tags
    var tags = '';
    if (f.detectedSR || f.detectedCh || f.detectedDur) {
      tags = '<div class="audio-info-tags">';
      if (f.detectedSR)  tags += '<span class="audio-tag">'+f.detectedSR+' Hz</span>';
      if (f.detectedCh)  tags += '<span class="audio-tag">'+(f.detectedCh===1?'Mono':f.detectedCh===2?'Stereo':f.detectedCh+'ch')+'</span>';
      if (f.detectedDur) tags += '<span class="audio-tag">'+formatDuration(f.detectedDur)+'</span>';
      tags += '</div>';
    }

    var item = document.createElement('div');
    item.className = 'file-item';
    item.id = 'file-item-' + f.id;
    item.innerHTML =
      (function(){var g=getExt(f.name); return '<div class="file-icon" style="'+(g.isVideo?'color:#a78bfa;border-color:rgba(167,139,250,0.3)':'')+'">'+(g.isVideo?'🎬 ':'')+g.ext+'</div>'})()+ 
      '<div class="file-info">'+
        '<div class="file-name">'+escHtml(f.name)+'</div>'+
        '<div class="file-meta">'+formatSize(f.size)+'</div>'+
        tags+
      '</div>'+
      '<span class="file-status '+sc+'">'+st+'</span>'+
      '<button class="remove-btn" onclick="removeFile('+idx+')" title="移除">'+
        '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">'+
          '<path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'+
        '</svg>'+
      '</button>';
    list.appendChild(item);

    // Register playback: create object URL on demand (only once per file entry)
    if (!f._playUrl) {
      f._playUrl = URL.createObjectURL(f.file);
    }
    var uid = 'src-' + f.id.toString().replace('.','');
    registerPlay(uid, f._playUrl, f.name);
    // Inject play button into the item (before status)
    var statusEl = item.querySelector('.file-status');
    var playBtnEl = document.createElement('div');
    playBtnEl.innerHTML = makePlayBtnHtml(uid);
    item.insertBefore(playBtnEl.firstChild, statusEl);
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function removeFile(idx) { files.splice(idx, 1); renderFileList(); }

function clearAll() {
  files = [];
  renderFileList();
  document.getElementById('download-list').innerHTML = '';
  document.getElementById('download-area').style.display = 'none';
  document.getElementById('log-section').style.display = 'none';
  // Reset auto option labels
  var ao = document.querySelector('#samplerate-select option[value="auto"]');
  if (ao) ao.textContent = '✦ 原始采样率（自动）';
  var ac = document.querySelector('#channels-select option[value="auto"]');
  if (ac) ac.textContent = '✦ 原始声道（自动）';
}

function updateFileStatus(id, status) {
  var f = files.find(function(x) { return x.id === id; });
  if (f) { f.status = status; renderFileList(); }
}

function addLog(msg, type) {
  type = type || 'info';
  var box = document.getElementById('log-box');
  document.getElementById('log-section').style.display = 'block';
  var line = document.createElement('span');
  line.className = 'log-line ' + type;
  var t = new Date().toLocaleTimeString('en', { hour12: false });
  line.textContent = '['+t+'] ' + msg;
  box.appendChild(document.createElement('br'));
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

// ── Audio decode via Web Audio API ──────────────────────────
function decodeAudio(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) { reject(new Error('浏览器不支持 Web Audio API')); return; }
      var ctx = new AudioCtx();
      ctx.decodeAudioData(e.target.result, function(buf) {
        ctx.close();
        resolve(buf);
      }, function(err) {
        ctx.close();
        reject(new Error('解码失败：浏览器不支持该音频格式'));
      });
    };
    reader.onerror = function() { reject(new Error('文件读取失败')); };
    reader.readAsArrayBuffer(file);
  });
}

// ── Resample with linear interpolation ──────────────────────
function resampleBuffer(audioBuffer, targetSR, targetCh) {
  var srcRate = audioBuffer.sampleRate;
  var srcLen  = audioBuffer.length;
  var dstLen  = Math.round(srcLen * targetSR / srcRate);
  var inCh    = audioBuffer.numberOfChannels;

  var srcChannels = [];
  for (var c = 0; c < inCh; c++) srcChannels.push(audioBuffer.getChannelData(c));

  var dstChannels = [];
  for (var ch = 0; ch < targetCh; ch++) {
    var src = srcChannels[Math.min(ch, inCh - 1)];
    var dst = new Float32Array(dstLen);
    var ratio = srcLen / dstLen;
    for (var i = 0; i < dstLen; i++) {
      var pos  = i * ratio;
      var idx  = Math.floor(pos);
      var frac = pos - idx;
      var a = src[idx] || 0;
      var b = src[Math.min(idx + 1, srcLen - 1)] || 0;
      dst[i] = a + frac * (b - a);
    }
    dstChannels.push(dst);
  }
  return { channels: dstChannels, sampleRate: targetSR, length: dstLen };
}

// ── WAV encoder (PCM 16-bit little-endian) ───────────────────
function encodeWAV(channels, sampleRate, numCh) {
  var numSamples  = channels[0].length;
  var blockAlign  = numCh * 2;
  var byteRate    = sampleRate * blockAlign;
  var dataSize    = numSamples * blockAlign;
  var buf         = new ArrayBuffer(44 + dataSize);
  var view        = new DataView(buf);

  function writeStr(off, str) {
    for (var i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  }
  writeStr(0,  'RIFF');
  view.setUint32(4,  36 + dataSize,  true);
  writeStr(8,  'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16,         true);
  view.setUint16(20, 1,          true);  // PCM
  view.setUint16(22, numCh,      true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate,   true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16,         true);  // bitsPerSample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  var offset = 44;
  for (var i = 0; i < numSamples; i++) {
    for (var c = 0; c < numCh; c++) {
      var s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// ── MP3 encoder via lamejs ───────────────────────────────────
// Yield control to browser so UI/RAF can update
function yieldFrame() {
  return new Promise(function(resolve) { setTimeout(resolve, 0); });
}

// Async MP3 encoder — processes in batches, yields between each to keep UI live
async function encodeMP3(channels, sampleRate, numCh, bitrate, onProgress) {
  if (typeof lamejs === 'undefined' || typeof lamejs.Mp3Encoder === 'undefined') {
    throw new Error('lamejs 未加载，请检查网络后重试');
  }

  function f32ToI16(f32) {
    var i16 = new Int16Array(f32.length);
    for (var i = 0; i < f32.length; i++) {
      var s = Math.max(-1, Math.min(1, f32[i]));
      i16[i] = s < 0 ? (s * 0x8000) : (s * 0x7FFF);
    }
    return i16;
  }

  var encoder   = new lamejs.Mp3Encoder(numCh, sampleRate, bitrate);
  var blockSize = 1152;           // frames per MP3 chunk (lamejs requirement)
  var batchSize = 50;             // blocks per yield (~50ms per batch at 44100Hz)
  var mp3Parts  = [];
  var left  = f32ToI16(channels[0]);
  var right = numCh > 1 ? f32ToI16(channels[1]) : null;
  var total = left.length;

  for (var i = 0; i < total; i += blockSize) {
    var lChunk = left.subarray(i, i + blockSize);
    var mp3buf = right
      ? encoder.encodeBuffer(lChunk, right.subarray(i, i + blockSize))
      : encoder.encodeBuffer(lChunk);
    if (mp3buf.length > 0) mp3Parts.push(new Uint8Array(mp3buf));

    // Yield every batchSize blocks so browser can repaint
    var blockIdx = i / blockSize;
    if (blockIdx % batchSize === 0) {
      if (onProgress) onProgress(i / total);
      await yieldFrame();
    }
  }

  var tail = encoder.flush();
  if (tail.length > 0) mp3Parts.push(new Uint8Array(tail));

  return new Blob(mp3Parts, { type: 'audio/mpeg' });
}

// ── AIFF encoder (PCM 16-bit big-endian) ────────────────────
function encodeAIFF(channels, sampleRate, numCh) {
  var numSamples = channels[0].length;
  var blockAlign = numCh * 2;
  var dataSize   = numSamples * blockAlign;
  var buf        = new ArrayBuffer(54 + dataSize);
  var view       = new DataView(buf);

  function writeStr(off, str) {
    for (var i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  }
  // Convert IEEE 754 double to 80-bit extended (for AIFF sample rate field)
  function writeExtended(off, val) {
    var sign = 0, exp = 0, mant = 0;
    if (val < 0) { sign = 0x8000; val = -val; }
    if (val !== 0) {
      exp = Math.floor(Math.log(val) / Math.LN2) + 16383;
      mant = val / Math.pow(2, exp - 16383 - 63);
    }
    view.setUint16(off,     sign | exp,                 false);
    view.setUint32(off + 2, Math.floor(mant / 0x100000000), false);
    view.setUint32(off + 6, Math.floor(mant) >>> 0,     false);
  }

  // FORM chunk
  writeStr(0, 'FORM');
  view.setUint32(4, 46 + dataSize, false);  // big-endian
  writeStr(8, 'AIFF');

  // COMM chunk
  writeStr(12, 'COMM');
  view.setUint32(16, 18,         false);
  view.setUint16(20, numCh,      false);
  view.setUint32(22, numSamples, false);
  view.setUint16(26, 16,         false);  // bits per sample
  writeExtended(28, sampleRate);           // 10 bytes, offset 28

  // SSND chunk
  writeStr(38, 'SSND');
  view.setUint32(42, dataSize + 8, false);
  view.setUint32(46, 0,  false);  // offset
  view.setUint32(50, 0,  false);  // blockSize

  var offset = 54;
  for (var i = 0; i < numSamples; i++) {
    for (var c = 0; c < numCh; c++) {
      var s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, false);  // big-endian
      offset += 2;
    }
  }
  return new Blob([buf], { type: 'audio/aiff' });
}

// ── OGG / WebM encoder via MediaRecorder (real-time) ────────
// onProgress(0..1) is called every ~200ms based on AudioContext.currentTime
function encodeViaMediaRecorder(channels, sampleRate, numCh, fmt, onProgress) {
  return new Promise(function(resolve, reject) {
    var mimeTypes = {
      ogg:  ['audio/ogg;codecs=opus', 'audio/ogg'],
      webm: ['audio/webm;codecs=opus', 'audio/webm']
    };
    var mimeType = (mimeTypes[fmt] || []).find(function(t) {
      return MediaRecorder.isTypeSupported(t);
    });
    if (!mimeType) {
      reject(new Error('此浏览器不支持 ' + fmt.toUpperCase() + ' 编码'));
      return;
    }

    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    var ctx = new AudioCtx({ sampleRate: sampleRate });
    var buf = ctx.createBuffer(numCh, channels[0].length, sampleRate);
    for (var ch = 0; ch < numCh; ch++) buf.copyToChannel(channels[ch], ch);

    var totalDuration = buf.duration;  // seconds
    var dest    = ctx.createMediaStreamDestination();
    var source  = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(dest);

    var recorder = new MediaRecorder(dest.stream, { mimeType: mimeType });
    var chunks   = [];
    var startTime = null;
    var tickId    = null;

    // Tick every 200ms: use ctx.currentTime (offset from when source started)
    function tick() {
      if (startTime === null) return;
      var elapsed  = ctx.currentTime - startTime;
      var progress = Math.min(elapsed / totalDuration, 0.99);
      if (onProgress) onProgress(progress);
      tickId = setTimeout(tick, 200);
    }

    recorder.ondataavailable = function(e) { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = function() {
      clearTimeout(tickId);
      if (onProgress) onProgress(1);
      ctx.close();
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = function(e) {
      clearTimeout(tickId);
      ctx.close();
      reject(e.error || new Error('MediaRecorder error'));
    };

    recorder.start(200);
    source.start(0);
    startTime = ctx.currentTime;
    tick();  // start ticking immediately

    source.onended = function() {
      clearTimeout(tickId);
      setTimeout(function() { if (recorder.state !== 'inactive') recorder.stop(); }, 300);
    };
  });
}

// ── Main conversion ──────────────────────────────────────────
async function startConversion() {
  if (files.length === 0) { addLog('请先上传文件', 'error'); return; }

  var fmt         = document.getElementById('format-select').value;
  var srSetting   = document.getElementById('samplerate-select').value;   // may be "auto"
  var chSetting   = document.getElementById('channels-select').value;      // may be "auto"
  var bitrate     = parseInt(document.getElementById('bitrate-slider').value);

  var btn = document.getElementById('convert-btn');
  btn.disabled = true;
  btn.textContent = '⏳ 转换中...';

  var dlArea = document.getElementById('download-area');
  var dlList = document.getElementById('download-list');
  dlList.innerHTML = '';
  dlArea.style.display = 'none';

  // Init overlay
  var fileNames = files.map(function(f){ return f.name; });
  convInit(files.length);
  convSetFileNames(fileNames);

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var baseName   = f.name.replace(/\.[^/.]+$/, '');
    var outputName = baseName + '.' + fmt;

    try {
      updateFileStatus(f.id, 'converting');
      addLog('Decoding: ' + f.name, 'active');

      // Overlay: file start
      var filePctBase = (i / files.length) * 100;
      var filePctSlice = 100 / files.length;
      convSetOp('解码中', '解码中');
      convSetFileNames(fileNames);
      convSetPct(filePctBase + filePctSlice * 0.05);

      var audioBuffer = await decodeAudio(f.file);
      addLog(
        'Decoded — ' + audioBuffer.numberOfChannels + 'ch · ' +
        audioBuffer.sampleRate + 'Hz · ' +
        audioBuffer.duration.toFixed(2) + 's',
        'info'
      );

      // Resolve "auto" to the actual detected values of this file
      var targetSR = srSetting === 'auto' ? audioBuffer.sampleRate      : parseInt(srSetting);
      var targetCh = chSetting === 'auto' ? audioBuffer.numberOfChannels : parseInt(chSetting);

      convSetPct(filePctBase + filePctSlice * 0.30);
      convSetOp('重采样 → ' + targetSR + ' Hz', String(targetSR) + ' Hz');
      var resampled = resampleBuffer(audioBuffer, targetSR, targetCh);
      addLog('Resampled → ' + targetSR + 'Hz · ' + targetCh + 'ch', 'info');

      var encPctStart = filePctBase + filePctSlice * 0.55;
      var encPctEnd   = filePctBase + filePctSlice * 0.90;
      convSetPct(encPctStart);
      convSetOp('编码 → ' + fmt.toUpperCase(), fmt.toUpperCase());

      // Progress callback: maps encoder 0-1 into the encode pct range
      var encProgressCb = function(ratio) {
        convSetPct(encPctStart + (encPctEnd - encPctStart) * ratio);
      };

      var blob;
      var isRealtime = REALTIME_FORMATS.indexOf(fmt) !== -1;
      if (isRealtime) {
        addLog('实时编码中，耗时约 ' + Math.ceil(resampled.length / resampled.sampleRate) + 's（音频实际时长）...', 'active');
        convSetOp('实时编码 ' + fmt.toUpperCase() + ' — 耗时约 ' + Math.ceil(resampled.length / resampled.sampleRate) + 's', fmt.toUpperCase());
      }
      if (fmt === 'wav') {
        blob = encodeWAV(resampled.channels, resampled.sampleRate, targetCh);
        encProgressCb(1);
      } else if (fmt === 'aiff') {
        blob = encodeAIFF(resampled.channels, resampled.sampleRate, targetCh);
        encProgressCb(1);
      } else if (fmt === 'ogg' || fmt === 'webm') {
        blob = await encodeViaMediaRecorder(resampled.channels, resampled.sampleRate, targetCh, fmt, encProgressCb);
      } else {
        blob = await encodeMP3(resampled.channels, resampled.sampleRate, targetCh, bitrate, encProgressCb);
      }

      convSetPct(encPctEnd);
      convSetOp('打包输出...', '打包输出');
      var url = URL.createObjectURL(blob);

      var dlItem = document.createElement('div');
      dlItem.className = 'download-item';
      var dlUid = 'out-' + Date.now() + i;
      registerPlay(dlUid, url, outputName);
      dlItem.innerHTML =
        makePlayBtnHtml(dlUid) +
        '<div class="download-info">' +
          '<div class="download-name">' + escHtml(outputName) + '</div>' +
          '<div class="download-size">' + formatSize(blob.size) + ' · ' +
            fmt.toUpperCase() + ' · ' + targetSR + 'Hz · ' +
            (targetCh === 2 ? 'Stereo' : 'Mono') + '</div>' +
        '</div>' +
        '<a class="btn-dl" href="' + url + '" download="' + escHtml(outputName) + '">' +
          '<svg width="12" height="12" viewBox="0 0 12 12" fill="none">' +
            '<path d="M6 1v7m0 0L3 5m3 3l3-3M1 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>下载</a>';
      dlList.appendChild(dlItem);

      updateFileStatus(f.id, 'done');
      addLog('✓ ' + outputName + ' — ' + formatSize(blob.size), 'success');
      convFileDone(i);
      convSetPct((i + 1) / files.length * 100);

    } catch (err) {
      updateFileStatus(f.id, 'error');
      addLog('✗ ' + f.name + ': ' + (err.message || String(err)), 'error');
      convFileError(i);
    }
  }

  dlArea.style.display = 'block';
  btn.disabled = false;
  btn.innerHTML = '<div class="btn-shimmer"></div>⚡ 再次转换';
  convDone();
}

// ── Mini Audio Player ────────────────────────────────────────
var _audio = new Audio();
var _currentBtnEl = null;   // the .play-btn that triggered playback
var _miniVisible = false;

_audio.addEventListener('timeupdate', function() {
  if (!_audio.duration) return;
  var pct = (_audio.currentTime / _audio.duration) * 100;
  document.getElementById('mp-progress-fill').style.width = pct + '%';
  document.getElementById('mp-time').textContent =
    formatDuration(_audio.currentTime) + ' / ' + formatDuration(_audio.duration);
});

_audio.addEventListener('ended', function() {
  _setPlayingBtn(null);
  document.getElementById('mp-play-icon').style.display  = '';
  document.getElementById('mp-pause-icon').style.display = 'none';
});

_audio.addEventListener('play', function() {
  document.getElementById('mp-play-icon').style.display  = 'none';
  document.getElementById('mp-pause-icon').style.display = '';
});

_audio.addEventListener('pause', function() {
  document.getElementById('mp-play-icon').style.display  = '';
  document.getElementById('mp-pause-icon').style.display = 'none';
});

function _playBtnHtml() {
  return '<span class="play-icon"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 1.5l7 4-7 4V1.5z" fill="currentColor"/></svg></span>' +
         '<span class="eq-bars"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></span>';
}

function _setPlayingBtn(el) {
  // Clear previous
  if (_currentBtnEl && _currentBtnEl !== el) {
    _currentBtnEl.classList.remove('playing');
  }
  _currentBtnEl = el;
  if (el) el.classList.add('playing');
}

function playSource(url, name, btnEl) {
  // Same source already playing → toggle pause
  if (_audio.src === url && !_audio.paused) {
    _audio.pause();
    if (btnEl) btnEl.classList.remove('playing');
    return;
  }
  // Same source, paused → resume
  if (_audio.src === url && _audio.paused) {
    _audio.play();
    _setPlayingBtn(btnEl);
    return;
  }
  // New source
  _audio.pause();
  _audio.src = url;
  _audio.currentTime = 0;
  document.getElementById('mp-name').textContent = name;
  document.getElementById('mp-progress-fill').style.width = '0%';
  document.getElementById('mp-time').textContent = '0:00 / 0:00';
  _audio.play().then(function() {
    _setPlayingBtn(btnEl);
    _showMini(true);
  }).catch(function(e) {
    addLog('播放失败: ' + e.message, 'error');
  });
}

function _showMini(show) {
  var mp = document.getElementById('mini-player');
  _miniVisible = show;
  if (show) mp.classList.add('visible');
  else mp.classList.remove('visible');
}

function mpToggle() {
  if (_audio.paused) _audio.play();
  else _audio.pause();
}

function mpSeek(e) {
  var rect = e.currentTarget.getBoundingClientRect();
  var ratio = (e.clientX - rect.left) / rect.width;
  if (_audio.duration) _audio.currentTime = ratio * _audio.duration;
}

function mpClose() {
  _audio.pause();
  _setPlayingBtn(null);
  _showMini(false);
}

// Build a play button element (returns HTML string)
function makePlayBtnHtml(uid) {
  return '<button class="play-btn" id="pbtn-' + uid + '" onclick="onPlayBtn(\'' + uid + '\')" title="预览">' +
    '<span class="play-icon"><svg width="11" height="11" viewBox="0 0 11 11" fill="none">' +
      '<path d="M2 1.5l7 4-7 4V1.5z" fill="currentColor"/>' +
    '</svg></span>' +
    '<span class="eq-bars">' +
      '<span class="eq-bar"></span><span class="eq-bar"></span>' +
      '<span class="eq-bar"></span><span class="eq-bar"></span>' +
    '</span>' +
  '</button>';
}

// Map uid → { url, name }
var _playMap = {};

function registerPlay(uid, url, name) {
  _playMap[uid] = { url: url, name: name };
}

function onPlayBtn(uid) {
  var entry = _playMap[uid];
  if (!entry) return;
  var btn = document.getElementById('pbtn-' + uid);
  playSource(entry.url, entry.name, btn);
}

// ── Conversion Progress Overlay ─────────────────────────────
var _convTotal = 0;
var _convCurrent = 0;
var _convPct = 0;
var _pctRafId = null;
var _displayPct = 0;

function convInit(total) {
  _convTotal   = total;
  _convCurrent = 0;
  _convPct     = 0;
  _displayPct  = 0;


  // Build per-file segment track
  var seg = document.getElementById('conv-seg-track');
  seg.innerHTML = '';
  for (var i = 0; i < total; i++) {
    var s = document.createElement('div');
    s.className = 'conv-seg';
    s.id = 'conv-seg-' + i;
    seg.appendChild(s);
  }

  // Build step pills
  var steps = document.getElementById('conv-steps');
  steps.innerHTML = '';

  document.getElementById('conv-bar-fill').style.width = '0%';
  document.getElementById('conv-pct').textContent = '0';

  document.getElementById('conv-op').innerHTML = '准备中...';
  document.getElementById('conv-card').classList.add('active');
}

function convSetFile(idx, name) {
  _convCurrent = idx;
  // Segment
  for (var i = 0; i < _convTotal; i++) {
    var s = document.getElementById('conv-seg-' + i);
    if (!s) continue;
    s.classList.remove('seg-active', 'seg-done', 'seg-error');
    if (i < idx) s.classList.add('seg-done');
    else if (i === idx) s.classList.add('seg-active');
  }
  // Step pill
  var steps = document.getElementById('conv-steps');
  steps.innerHTML = '';
  // Show window of up to 5 files around current
  var start = Math.max(0, idx - 2);
  var end   = Math.min(_convTotal, start + 5);
  for (var j = start; j < end; j++) {
    // We'll update label later; just show index for now
  }
}

function convSetFileNames(names) {
  convSetFile._names = names;
  // Rebuild steps based on names
  var steps = document.getElementById('conv-steps');
  steps.innerHTML = '';
  var total = names.length;
  var cur   = _convCurrent;
  var start = Math.max(0, cur - 1);
  var end   = Math.min(total, start + 5);
  for (var j = start; j < end; j++) {
    var pill = document.createElement('div');
    pill.className = 'conv-step' +
      (j < cur  ? ' step-done'  :
       j === cur ? ' step-active' : '');
    pill.id = 'conv-pill-' + j;
    var dot = '<span class="step-dot"></span>';
    var icon = j < cur ? '✓ ' : j === cur ? '' : '';
    pill.innerHTML = dot + icon + escHtml(names[j].replace(/\.[^/.]+$/, '').slice(0, 20));
    steps.appendChild(pill);
  }
}

function convSetOp(text, highlight) {
  var el = document.getElementById('conv-op');
  if (highlight) {
    el.innerHTML = text.replace(highlight, '<span class="op-highlight">' + highlight + '</span>');
  } else {
    el.textContent = text;
  }
}

function convSetPct(pct) {
  _convPct = Math.max(0, Math.min(100, Math.round(pct)));
  // Animate display number smoothly
  if (_pctRafId) cancelAnimationFrame(_pctRafId);
  (function tick() {
    var diff = _convPct - _displayPct;
    if (Math.abs(diff) < 0.5) {
      _displayPct = _convPct;
    } else {
      _displayPct += diff * 0.12;
    }
    var v = Math.round(_displayPct);
    document.getElementById('conv-pct').textContent = v;
    document.getElementById('conv-bar-fill').style.width = _displayPct + '%';
    if (_displayPct < _convPct - 0.5) {
      _pctRafId = requestAnimationFrame(tick);
    }
  })();
}

function convFileError(idx) {
  var s = document.getElementById('conv-seg-' + idx);
  if (s) { s.classList.remove('seg-active'); s.classList.add('seg-error'); }
  var pill = document.getElementById('conv-pill-' + idx);
  if (pill) { pill.classList.remove('step-active'); pill.classList.add('step-error'); }
}

function convFileDone(idx) {
  var s = document.getElementById('conv-seg-' + idx);
  if (s) { s.classList.remove('seg-active'); s.classList.add('seg-done'); }
  var pill = document.getElementById('conv-pill-' + idx);
  if (pill) { pill.classList.remove('step-active'); pill.classList.add('step-done'); }
}

function convDone() {
  convSetPct(100);
  convSetOp('转换完成 ✓', null);
  document.getElementById('conv-bar-fill').style.boxShadow =
    '0 0 16px rgba(46,204,113,0.8), 0 0 36px rgba(46,204,113,0.4)';
  document.getElementById('conv-bar-fill').style.background =
    'linear-gradient(90deg, #0e6634, var(--green), #a8f0c6)';
  setTimeout(function() {
    document.getElementById('conv-card').classList.remove('active');
  }, 900);
}

addLog('引擎就绪 — WAV · AIFF · MP3 · OGG · WebM 输出 · 支持音视频输入', 'success');