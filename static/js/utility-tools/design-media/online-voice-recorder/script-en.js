// script.js (English version)
// Original logic preserved, all user-facing strings localized to English

let recordings     = [];
let mediaRecorder  = null;
let recordedChunks = [];
let isRecording    = false;
let timerInterval  = null;
let startTime      = 0;
let analyser       = null;
let animFrame      = null;
let vuSegs         = [];

(function init() {
  const meter = document.getElementById('vuMeter');
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('div');
    s.className = 'vu-seg';
    meter.appendChild(s);
    vuSegs.push(s);
  }
  drawIdle();
})();

async function toggleRecording() {
  isRecording ? stopRecording() : await startRecording();
}

async function startRecording() {
  document.getElementById('noAudioWarn').classList.remove('show');
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1, height: 1, frameRate: 1 },
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });

    const audioTracks = stream.getAudioTracks();

    if (!audioTracks.length) {
      stream.getTracks().forEach(t => t.stop());
      document.getElementById('noAudioWarn').classList.add('show');
      showToast('No audio detected, please check "Share audio" and try again', 'err');
      return;
    }

    stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });

    const label = audioTracks[0].label || 'System Audio Output';
    showSourceActive(label, false);

    const actx = new AudioContext();
    const src  = actx.createMediaStreamSource(stream);
    analyser = actx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    src.connect(analyser);

    const mime = bestMime();
    mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recordedChunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => saveRecording(mime);
    mediaRecorder.start(100);

    audioTracks[0].onended = () => { if (isRecording) stopRecording(); };

    isRecording = true;
    startTime   = Date.now();
    startTimer();
    drawWave();
    setUI(true);
    showToast('Recording started', 'ok');
  } catch (e) {
    if (e.name !== 'NotAllowedError') showToast('Failed to start: ' + e.message, 'err');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  }
  isRecording = false;
  stopTimer();
  cancelAnimationFrame(animFrame);
  analyser = null;
  drawIdle();
  clearVU();
  setUI(false);
  showSourceIdle();
}

function bestMime() {
  const list = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg','audio/mp4'];
  return list.find(m => MediaRecorder.isTypeSupported(m)) || '';
}

function saveRecording(mime) {
  const blob = new Blob(recordedChunks, { type: mime || 'audio/webm' });
  const ext  = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : 'webm';
  const dur  = (Date.now() - startTime) / 1000;
  const name = `REC_${String(recordings.length + 1).padStart(3,'0')}_${nowStamp()}`;
  recordings.push({ blob, url: URL.createObjectURL(blob), name, ext, mime, dur, size: blob.size });
  renderList();
  
  const autoFmt = document.getElementById('autoFormatSelect').value;
  if (autoFmt !== 'none') {
    showToast(`Recording saved, auto-exporting as ${autoFmt.toUpperCase()}`, 'ok');
    const lastIndex = recordings.length - 1;
    setTimeout(() => exportItem(lastIndex, autoFmt), 500);
  } else {
    showToast('Recording saved', 'ok');
  }
}

function startTimer() {
  document.getElementById('timer').classList.add('active');
  timerInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    document.getElementById('timer').textContent = fmt(elapsed);
    
    const val = parseFloat(document.getElementById('autoStopInput').value);
    const unit = parseInt(document.getElementById('autoStopUnit').value, 10);
    const autoStopSec = (isNaN(val) || val <= 0) ? 0 : val * unit;

    if (autoStopSec > 0 && elapsed >= autoStopSec && isRecording) {
      showToast('Reached set time, stopping automatically...', 'ok');
      stopRecording();
    }
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
  document.getElementById('timer').textContent = '00:00:00';
  document.getElementById('timer').classList.remove('active');
}
function fmt(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return [h,m,sec].map(n => String(n).padStart(2,'0')).join(':');
}
function nowStamp() {
  return new Date().toISOString().slice(0,19).replace(/[-:]/g,'').replace('T','_');
}

function cvs() {
  const c = document.getElementById('waveCanvas'), dpr = devicePixelRatio || 1;
  c.width  = c.offsetWidth  * dpr;
  c.height = c.offsetHeight * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W: c.offsetWidth, H: c.offsetHeight };
}

function drawIdle() {
  const { ctx, W, H } = cvs();
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#2a2a40'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  ctx.strokeStyle = '#40405c'; ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let x = 0; x <= W; x++) {
    const y = H/2 + (Math.random() - 0.5) * 2.5;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawWave() {
  if (!analyser) return;
  const buf = new Uint8Array(analyser.frequencyBinCount);
  function frame() {
    if (!analyser) return;
    animFrame = requestAnimationFrame(frame);
    analyser.getByteTimeDomainData(buf);
    const { ctx, W, H } = cvs();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#1e1e30'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
    ctx.strokeStyle = '#d0ff00'; ctx.lineWidth = 2;
    ctx.shadowColor = '#d0ff00aa'; ctx.shadowBlur = 16;
    ctx.beginPath();
    const step = W / buf.length;
    buf.forEach((v, i) => {
      const y = ((v - 128) / 128) * (H * 0.44) + H / 2;
      i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    let sum = 0;
    buf.forEach(v => sum += Math.abs(v - 128));
    updateVU(Math.min(sum / buf.length / 38, 1));
  }
  frame();
}

function updateVU(level) {
  const on = Math.round(level * vuSegs.length);
  vuSegs.forEach((s, i) => {
    s.className = 'vu-seg';
    if (i < on) s.classList.add(i < vuSegs.length * 0.6 ? 'on-green' : i < vuSegs.length * 0.85 ? 'on-yellow' : 'on-red');
  });
}
function clearVU() { vuSegs.forEach(s => s.className = 'vu-seg'); }

function showSourceActive(label, isMic = false) {
  const icon = isMic ? '🎙' : '🖥';
  const subText = isMic ? 'Microphone · via getUserMedia' : 'System Audio · via Screen Capture API';
  document.getElementById('sourceDisplay').innerHTML = `
    <div class="source-active">
      <div class="src-icon-big">${icon}</div>
      <div class="src-details">
        <div class="src-name">${label}</div>
        <div class="src-sub">${subText}</div>
      </div>
      <div class="src-badge">● LIVE</div>
    </div>`;
}
function showSourceIdle() {
  document.getElementById('sourceDisplay').innerHTML =
    `<div class="source-empty">No audio source selected — click record and choose share target with "Share audio" checked</div>`;
}

function setUI(rec) {
  const btn = document.getElementById('recBtn');
  btn.classList.toggle('recording', rec);
  document.getElementById('recBtnText').textContent = rec ? 'Stop' : 'Record';
  document.getElementById('statusDot').classList.toggle('live', rec);
  const source = document.getElementById('sourceSelect')?.value;
  const sourceText = source === 'mic' ? 'Microphone' : 'System Audio';
  document.getElementById('statusText').textContent = rec
    ? `Recording · ${sourceText}`
    : 'Standby · waiting to start';
}

function renderList() {
  const c = document.getElementById('recordingsList');
  document.getElementById('recCount').textContent = `${recordings.length} recordings`;
  if (!recordings.length) {
    c.innerHTML = '<div class="empty-state">No recordings yet · Press REC and choose an audio source</div>';
    return;
  }
  c.innerHTML = recordings.map((r, i) => `
    <div class="recording-item" id="item-${i}">
      <div class="rec-num">${i + 1}</div>
      <button class="ri-play-btn" id="play-${i}" onclick="togglePlay(${i})" title="Play/Pause">
        <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" id="play-icon-${i}"><polygon points="0,0 12,7 0,14"/></svg>
      </button>
      <div class="ri-time" id="time-${i}">0:00 / ${fmtShort(r.dur)}</div>
      <div class="ri-scrubber-wrap" id="scrub-${i}">
        <div class="ri-track"><div class="ri-fill" id="fill-${i}"></div></div>
        <div class="ri-thumb" id="thumb-${i}"></div>
      </div>
      <button class="ri-vol-btn" id="vol-${i}" onclick="toggleMute(${i})" title="Mute">🔊</button>
      <select class="ri-fmt-select" id="fmt-${i}">
        <option value="webm">WEBM</option>
        <option value="wav">WAV</option>
        <option value="ogg">OGG</option>
        <option value="mp3">MP3</option>
      </select>
      <button class="ri-export-btn" onclick="exportItem(${i})">
        <svg width="11" height="12" viewBox="0 0 11 12" fill="currentColor"><path d="M5.5 8L1 3.5h3V0h3v3.5h3L5.5 8z"/><rect x="0" y="10" width="11" height="2"/></svg>Export
      </button>
    </div>`).join('');
  bindScrubbers();
}

function fmtShort(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2,'0')}`;
}

let audioMap = {};

function togglePlay(i) {
  Object.keys(audioMap).forEach(k => {
    if (Number(k) !== i && audioMap[k] && !audioMap[k].paused) {
      audioMap[k].pause();
      audioMap[k].currentTime = 0;
      resetPlayerUI(Number(k));
    }
  });

  if (!audioMap[i]) {
    audioMap[i] = new Audio(recordings[i].url);
    audioMap[i].ontimeupdate = () => { if (!audioMap[i]._dragging) updateProgress(i); };
    audioMap[i].onended      = () => resetPlayerUI(i);
  }

  const audio   = audioMap[i];
  const playBtn = document.getElementById(`play-${i}`);

  if (audio.paused) {
    audio.play();
    playBtn.classList.add('playing');
    playBtn.innerHTML = `<svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><rect x="0" y="0" width="3" height="12"/><rect x="7" y="0" width="3" height="12"/></svg>`;
  } else {
    audio.pause();
    playBtn.classList.remove('playing');
    playBtn.innerHTML = `<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="0,0 12,7 0,14"/></svg>`;
  }
}

function resetPlayerUI(i) {
  const playBtn = document.getElementById(`play-${i}`);
  if (!playBtn) return;
  playBtn.classList.remove('playing');
  playBtn.innerHTML = `<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="0,0 12,7 0,14"/></svg>`;
  const fill = document.getElementById(`fill-${i}`);
  const thumb = document.getElementById(`thumb-${i}`);
  const timeEl = document.getElementById(`time-${i}`);
  if (fill) { fill.style.width = '0%'; fill.classList.remove('active'); }
  if (thumb) thumb.style.left = '0%';
  if (timeEl) timeEl.textContent = `0:00 / ${fmtShort(recordings[i].dur)}`;
  if (audioMap[i]) { audioMap[i].currentTime = 0; }
}

function updateProgress(i) {
  const audio = audioMap[i];
  const r = recordings[i];
  if (!audio) return;
  
  const dur = (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) ? audio.duration : r.dur;
  if (!dur) return;

  const pct = (audio.currentTime / dur) * 100;
  const fill  = document.getElementById(`fill-${i}`);
  const thumb = document.getElementById(`thumb-${i}`);
  const timeEl = document.getElementById(`time-${i}`);
  
  if (fill)  { fill.style.width = pct + '%'; fill.classList.add('active'); }
  if (thumb)  thumb.style.left = pct + '%';
  if (timeEl) timeEl.textContent = `${fmtShort(audio.currentTime)} / ${fmtShort(dur)}`;
}

function bindScrubbers() {
  recordings.forEach((r, i) => {
    const wrap = document.getElementById(`scrub-${i}`);
    if (!wrap) return;

    if (!audioMap[i]) {
      audioMap[i] = new Audio(r.url);
      audioMap[i].ontimeupdate = () => { if (!audioMap[i]._dragging) updateProgress(i); };
      audioMap[i].onended      = () => resetPlayerUI(i);
    }

    function getPct(clientX) {
      const rect = wrap.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    function applyPct(pct) {
      const audio = audioMap[i];
      const dur = (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) ? audio.duration : r.dur;
      
      audio.currentTime = pct * dur;
      
      const fill  = document.getElementById(`fill-${i}`);
      const thumb = document.getElementById(`thumb-${i}`);
      const timeEl = document.getElementById(`time-${i}`);
      if (fill)  { fill.style.width = (pct * 100) + '%'; fill.classList.add('active'); }
      if (thumb)  thumb.style.left  = (pct * 100) + '%';
      if (timeEl) timeEl.textContent = `${fmtShort(pct * dur)} / ${fmtShort(dur)}`;
    }

    wrap.addEventListener('mousedown', e => {
      e.preventDefault();
      audioMap[i]._dragging = true;
      applyPct(getPct(e.clientX));

      const onMove = e => applyPct(getPct(e.clientX));
      const onUp   = e => {
        applyPct(getPct(e.clientX));
        audioMap[i]._dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });

    wrap.addEventListener('touchstart', e => {
      e.preventDefault();
      audioMap[i]._dragging = true;
      applyPct(getPct(e.touches[0].clientX));
    }, { passive: false });

    wrap.addEventListener('touchmove', e => {
      e.preventDefault();
      applyPct(getPct(e.touches[0].clientX));
    }, { passive: false });

    wrap.addEventListener('touchend', () => {
      audioMap[i]._dragging = false;
    });
  });
}

function toggleMute(i) {
  const audio = audioMap[i];
  const btn = document.getElementById(`vol-${i}`);
  if (!audio) return;
  audio.muted = !audio.muted;
  btn.textContent = audio.muted ? '🔇' : '🔊';
}

function exportItem(i, forceFmt) {
  const r = recordings[i];
  const selectEl = document.getElementById(`fmt-${i}`);
  const ext = forceFmt || selectEl.value;
  
  if (forceFmt && selectEl) { selectEl.value = forceFmt; }

  if (ext === 'wav') {
    showToast('Converting to WAV…', '');
    convertToWav(r.blob)
      .then(wb => { dlBlob(wb, r.name+'.wav', 'audio/wav'); showToast('WAV export complete', 'ok'); })
      .catch(() => showToast('WAV conversion failed', 'err'));
  } else if (ext === 'mp3') {
    showToast('Encoding MP3…', '');
    convertToMp3(r.blob)
      .then(mb => { dlBlob(mb, r.name+'.mp3', 'audio/mpeg'); showToast('MP3 export complete', 'ok'); })
      .catch(e => showToast('MP3 failed: ' + e.message, 'err'));
  } else {
    dlBlob(r.blob, `${r.name}.${ext}`, r.mime);
    showToast(`Exported as .${ext.toUpperCase()}`, 'ok');
  }
}

function dlBlob(blob, name, type) {
  const url = URL.createObjectURL(new Blob([blob], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

async function convertToMp3(blob) {
  const ab   = await blob.arrayBuffer();
  const actx = new AudioContext();
  const abuf = await actx.decodeAudioData(ab);
  const nCh  = abuf.numberOfChannels;
  const sr   = abuf.sampleRate;
  const nS   = abuf.length;
  const kbps = 128;

  if (typeof lamejs === 'undefined') throw new Error('lamejs not loaded, check network connection');

  const mp3enc = new lamejs.Mp3Encoder(nCh, sr, kbps);
  const blockSize = 1152;
  const chunks = [];

  const L = abuf.getChannelData(0);
  const R = nCh > 1 ? abuf.getChannelData(1) : L;

  const toInt16 = ch => {
    const buf = new Int16Array(ch.length);
    ch.forEach((v, i) => { buf[i] = Math.max(-1, Math.min(1, v)) * (v < 0 ? 0x8000 : 0x7FFF); });
    return buf;
  };
  const iL = toInt16(L), iR = toInt16(R);

  for (let i = 0; i < nS; i += blockSize) {
    const lSlice = iL.subarray(i, i + blockSize);
    const rSlice = iR.subarray(i, i + blockSize);
    const encoded = nCh > 1 ? mp3enc.encodeBuffer(lSlice, rSlice) : mp3enc.encodeBuffer(lSlice);
    if (encoded.length > 0) chunks.push(new Int8Array(encoded));
  }
  const final = mp3enc.flush();
  if (final.length > 0) chunks.push(new Int8Array(final));
  return new Blob(chunks, { type: 'audio/mpeg' });
}

async function convertToWav(blob) {
  const ab   = await blob.arrayBuffer();
  const actx = new AudioContext();
  const abuf = await actx.decodeAudioData(ab);
  const nCh  = abuf.numberOfChannels, sr = abuf.sampleRate, nS = abuf.length;
  const data = new ArrayBuffer(44 + nS * nCh * 2);
  const v    = new DataView(data);
  const ws   = (o, s) => [...s].forEach((c,i) => v.setUint8(o+i, c.charCodeAt(0)));
  ws(0,'RIFF'); v.setUint32(4, 36+nS*nCh*2,true); ws(8,'WAVE');
  ws(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true);
  v.setUint16(22,nCh,true); v.setUint32(24,sr,true); v.setUint32(28,sr*nCh*2,true);
  v.setUint16(32,nCh*2,true); v.setUint16(34,16,true); ws(36,'data'); v.setUint32(40,nS*nCh*2,true);
  let off = 44;
  for (let i = 0; i < nS; i++) for (let c = 0; c < nCh; c++) {
    const s = Math.max(-1, Math.min(1, abuf.getChannelData(c)[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    off += 2;
  }
  return new Blob([data], { type: 'audio/wav' });
}

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show${type?' '+type:''}`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2800);
}

// ----- Dual-source enhancement (fully localized) -----

// Override startRecording with source selection
window.startRecording = async function() {
  const sourceSelect = document.getElementById('sourceSelect');
  const source = sourceSelect.value;
  sourceSelect.disabled = true;

  try {
    if (source === 'system') {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1, frameRate: 1 },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      await setupRecorderFromStream(stream, false);
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      await setupRecorderFromStream(stream, true);
    }
  } catch (err) {
    sourceSelect.disabled = false;
    if (err.name === 'NotAllowedError') {
      if (source === 'mic') showToast('Microphone permission denied', 'err');
    } else if (err.message === 'NO_AUDIO_TRACK') {
      showToast('No audio detected, please check "Share audio"', 'err');
    } else {
      showToast('Start failed: ' + (err.message || 'unknown error'), 'err');
    }
    setUI(false);
    showSourceIdle();
    console.warn('Recording start error:', err);
  }
};

async function setupRecorderFromStream(stream, isMic) {
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) {
    stream.getTracks().forEach(t => t.stop());
    document.getElementById('noAudioWarn').classList.add('show');
    throw new Error('NO_AUDIO_TRACK');
  }
  document.getElementById('noAudioWarn').classList.remove('show');

  const label = audioTracks[0].label || (isMic ? 'Microphone' : 'System Audio Output');
  showSourceActive(label, isMic);

  stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });

  audioTracks.forEach(t => t.onended = () => {
    if (isRecording) stopRecording();
  });

  const actx = new AudioContext();
  const src = actx.createMediaStreamSource(stream);
  analyser = actx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.75;
  src.connect(analyser);

  const mime = bestMime();
  mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
  recordedChunks = [];
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = () => saveRecording(mime);
  mediaRecorder.start(100);

  isRecording = true;
  startTime = Date.now();
  startTimer();
  drawWave();
  setUI(true);
  showToast('Recording started', 'ok');
}

// Ensure stopRecording re-enables source select
const originalStopRecording = window.stopRecording;
window.stopRecording = function() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  }
  isRecording = false;
  stopTimer();
  cancelAnimationFrame(animFrame);
  analyser = null;
  drawIdle();
  clearVU();
  setUI(false);
  showSourceIdle();

  const sourceSelect = document.getElementById('sourceSelect');
  if (sourceSelect) sourceSelect.disabled = false;
};

// DOM ready: ensure source select is enabled, and update placeholder on change
document.addEventListener('DOMContentLoaded', () => {
  const sourceSelect = document.getElementById('sourceSelect');
  if (sourceSelect) {
    sourceSelect.disabled = false;
    sourceSelect.addEventListener('change', () => {
      if (!isRecording) {
        showSourceIdle();
      }
    });
  }
  // VU segments already created in init()
});