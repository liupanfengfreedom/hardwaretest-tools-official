(async function(){
  const deviceSelect = document.getElementById('deviceSelect');
  const pttBtn = document.getElementById('pttBtn');
  const gainSlider = document.getElementById('gain');
  const waveCanvas = document.getElementById('waveCanvas');
  const specCanvas = document.getElementById('specCanvas');
  const samplerateEl = document.getElementById('samplerate');
  const rmsEl = document.getElementById('rms');
  const peakEl = document.getElementById('peak');
  const minNoiseEl = document.getElementById('minNoise');
  const latencyMsEl = document.getElementById('latencyMs');
  const playStateEl = document.getElementById('playState');
  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');
  const permBtn = document.getElementById('permBtn');
  
  // Stats bar elements
  const currentVolumeEl = document.getElementById('currentVolume');
  const peakVolumeEl = document.getElementById('peakVolume');
  const snRatioEl = document.getElementById('snRatio');
  const audioLatencyEl = document.getElementById('audioLatency');
  
  // Device info elements (in stats bar)
  const micStatusDisplayEl = document.getElementById('micStatusDisplay');
  const sampleRateDisplayEl = document.getElementById('sampleRateDisplay');
  const channelsDisplayEl = document.getElementById('channelsDisplay');
  const bitDepthDisplayEl = document.getElementById('bitDepthDisplay');

  let audioCtx = null, sourceNode = null, analyser = null, processor = null, gainNode = null;
  let mediaStream = null;
  
  let isRecording = false;
  let recordedBuffers = [];
  let rafId = null;
  let minNoiseDb = 0;
  
  // Stats variables
  let maxVolumeDb = -Infinity;
  let currentVolumeDb = 0;
  let snRatioValue = 0;
  let lastLatencyValue = 0;

  // --- Utility Functions ---

  async function refreshDevices(){
    try{
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      deviceSelect.innerHTML='';
      inputs.forEach(d => {
        const opt = document.createElement('option'); 
        opt.value = d.deviceId; 
        opt.textContent = d.label || 'Microphone ' + (deviceSelect.length + 1); 
        deviceSelect.appendChild(opt);
      });
      if(inputs.length===0) deviceSelect.innerHTML='<option>No microphone detected</option>';
    } catch(e){ console.error(e); }
  }
  
  async function runLatencyTest(){
    latencyMsEl.textContent = "Calculating...";
    audioLatencyEl.textContent = "Testing...";
    
    if(!audioCtx) return;
    
    await new Promise(r => setTimeout(r, 100)); 
    const sr = audioCtx.sampleRate;
    const clickLength = 2048;
    const buf = audioCtx.createBuffer(1, clickLength, sr); 
    const bd = buf.getChannelData(0); 
    bd[0] = 1; 
    const src = audioCtx.createBufferSource(); 
    src.buffer = buf; 
    src.connect(audioCtx.destination);
    const cap = []; 
    const sp = audioCtx.createScriptProcessor(1024, 1, 1);
    analyser.disconnect(); 
    analyser.connect(sp); 
    sp.onaudioprocess = e => cap.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    sp.connect(audioCtx.destination);
    src.start(0); 
    await new Promise(r => setTimeout(r, 400));
    src.stop(); 
    sp.disconnect(); 
    analyser.disconnect();
    analyser.connect(processor); 
    const full = new Float32Array(cap.reduce((a,b)=>a+b.length,0)); 
    let o = 0; cap.forEach(b=>{full.set(b,o);o+=b.length});
    let max = 0, idx = 0;
    for(let i = 500; i < full.length; i++){ 
      if(Math.abs(full[i]) > max){ max = Math.abs(full[i]); idx = i; }
    }
    const latencyMs = (idx / sr) * 1000;
    
    // Update display
    latencyMsEl.textContent = latencyMs.toFixed(1);
    audioLatencyEl.textContent = latencyMs.toFixed(1) + "ms";
    lastLatencyValue = latencyMs;
    
    // Color indicator
    latencyMsEl.style.color = latencyMs > 100 ? '#f43f5e' : 'var(--latency)';
    audioLatencyEl.style.color = latencyMs > 100 ? '#f43f5e' : '#00ff88';
  }

  // --- Core Engine ---

  async function startEngine(){
    // Clean up existing stream
    if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); mediaStream=null; }
    if(audioCtx) { try{ await audioCtx.close(); }catch(e){} audioCtx=null; }
    
    // Reset device info display
    micStatusDisplayEl.textContent = "Connecting...";
    micStatusDisplayEl.className = "";
    sampleRateDisplayEl.textContent = "-";
    channelsDisplayEl.textContent = "-";
    bitDepthDisplayEl.textContent = "-";
    
    const constraints = { 
      audio: { 
        deviceId: deviceSelect.value ? {exact: deviceSelect.value} : undefined, 
        echoCancellation: document.getElementById('aec').checked, 
        autoGainControl: document.getElementById('autoGain').checked, 
        noiseSuppression: false 
      } 
    };

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Successfully got permission: UI update
      permBtn.style.display = 'none';
      statusText.textContent = "Running";
      statusText.style.color = "#e6eef6";
      statusDot.classList.remove('err');
      statusDot.classList.add('on');
      
      // Update microphone status display
      micStatusDisplayEl.textContent = "Connected";
      micStatusDisplayEl.classList.add('connected');
      
      // After getting permission, refresh device list to get proper names
      refreshDevices();

    } catch(e) { 
      // Failure: UI update
      console.error(e);
      statusText.textContent = "Permission denied";
      statusText.style.color = "#f43f5e";
      statusDot.classList.remove('on');
      statusDot.classList.add('err');
      
      // Update microphone status display
      micStatusDisplayEl.textContent = "Not Connected";
      micStatusDisplayEl.className = "";
      micStatusDisplayEl.style.color = "#f43f5e";
      
      permBtn.style.display = 'inline-block'; // Show permission request button
      return; 
    }

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Update device info display
    sampleRateDisplayEl.textContent = audioCtx.sampleRate + " Hz";
    channelsDisplayEl.textContent = "1 (Mono)";
    bitDepthDisplayEl.textContent = "32-bit Float";
    
    // Autoplay Policy Handling
    if(audioCtx.state === 'suspended'){
      statusText.textContent = "Click page to activate audio";
      const resume = async () => { 
        await audioCtx.resume(); 
        statusText.textContent = "Running"; 
        runLatencyTest();
      };
      document.body.addEventListener('click', resume, {once:true});
    } else {
      runLatencyTest();
    }

    samplerateEl.textContent = audioCtx.sampleRate;
    sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    gainNode = audioCtx.createGain();
    gainNode.gain.value = Number(gainSlider.value);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8; 
    minNoiseDb = 0; 
    processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      if(isRecording) { recordedBuffers.push(new Float32Array(input)); }
    };
    sourceNode.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(processor);
    processor.connect(audioCtx.destination); 
    drawVisuals();
  }

  function drawVisuals(){
    const ctx = waveCanvas.getContext('2d');
    const sctx = specCanvas.getContext('2d');
    const w = waveCanvas.width; 
    const h = waveCanvas.height;
    const grad = sctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, "rgba(124, 58, 237, 0.2)");
    grad.addColorStop(1, "rgba(6, 182, 212, 0.8)");

    function loop(){
      if(!analyser || !audioCtx) return;
      
      const timeData = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(timeData);
      
      // Draw waveform
      ctx.clearRect(0,0,w,h);
      ctx.lineWidth = 2; 
      ctx.strokeStyle = '#06b6d4'; 
      ctx.beginPath();
      const step = Math.ceil(timeData.length / w);
      for(let i=0; i < timeData.length; i+=step){
        const v = timeData[i]; 
        const y = (1 - (v+1)/2) * h;
        if(i===0) ctx.moveTo(i/step, y); 
        else ctx.lineTo(i/step, y);
      }
      ctx.stroke();

      // Calculate audio stats
      let sum=0, peak=0;
      for(let v of timeData){ 
        const a=Math.abs(v); 
        sum+=a*a; 
        if(a>peak)peak=a; 
      }
      const rms = Math.sqrt(sum/timeData.length);
      const db = 20*Math.log10(rms||1e-12);
      const peakDb = 20*Math.log10(peak||1e-12);
      
      // Update stats display
      rmsEl.textContent = rms.toFixed(4);
      peakEl.textContent = peak.toFixed(4);
      currentVolumeDb = db;
      currentVolumeEl.textContent = db.toFixed(1) + " dB";
      peakVolumeEl.textContent = peakDb.toFixed(1) + " dB";
      
      // Update peak record
      if(db > maxVolumeDb) {
        maxVolumeDb = db;
      }
      
      // Noise measurement
      if (minNoiseDb === 0) { 
        minNoiseDb = db; 
      } else { 
        minNoiseDb = Math.min(minNoiseDb + 0.1, db); 
      }
      minNoiseEl.textContent = minNoiseDb.toFixed(1);
      
      // Calculate signal-to-noise ratio
      if(minNoiseDb < -50) { // Only calculate in quiet environments
        snRatioValue = Math.abs(minNoiseDb - db);
        snRatioEl.textContent = snRatioValue.toFixed(1) + " dB";
        snRatioEl.style.color = snRatioValue > 70 ? "#00ff88" : 
                               snRatioValue > 50 ? "#eab308" : "#f43f5e";
      }
      
      // Update volume bar color
      if(db < -40) {
        currentVolumeEl.style.color = "#f43f5e"; // Red: volume too low
      } else if(db < -20) {
        currentVolumeEl.style.color = "#eab308"; // Yellow: moderate volume
      } else if(db < -6) {
        currentVolumeEl.style.color = "#22c55e"; // Green: good volume
      } else {
        currentVolumeEl.style.color = "#f43f5e"; // Red: possible clipping
      }

      // Draw spectrum
      const freqData = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(freqData);
      sctx.clearRect(0,0,w,h);
      sctx.fillStyle = grad; 
      sctx.beginPath(); 
      sctx.moveTo(0, h);
      const binW = w / freqData.length;
      for(let i=0; i<freqData.length; i++){
        const n = (freqData[i] + 100) / 100; 
        const y = h - (Math.max(0, Math.min(1, n)) * h);
        sctx.lineTo(i*binW, y);
      }
      sctx.lineTo(w, h); 
      sctx.fill();
      
      rafId = requestAnimationFrame(loop);
    }
    loop();
  }

  // --- PTT Logic ---
  function startRecord(e) {
    if(e) e.preventDefault(); 
    if(!audioCtx || audioCtx.state === 'suspended') { audioCtx?.resume(); }
    if(mediaStream) { // Only record if stream is active
      isRecording = true;
      recordedBuffers = []; 
      pttBtn.classList.add('active');
      pttBtn.innerHTML = "Recording... <br><span style='font-size:12px'>Release to Play</span>";
      playStateEl.textContent = "Recording"; 
      playStateEl.style.color = "#f43f5e";
    } else {
      startEngine(); // Try to start engine if button clicked but no stream
    }
  }

  function stopRecordAndPlay(e) {
    if(e) e.preventDefault();
    if(!isRecording) return;
    isRecording = false;
    pttBtn.classList.remove('active');
    pttBtn.innerHTML = "Hold to Record<br><span style='font-size:12px;font-weight:400;opacity:0.8'>Release to Play</span>";
    if(recordedBuffers.length === 0) return;
    playStateEl.textContent = "Playing back..."; 
    playStateEl.style.color = "#06b6d4";
    const totalLen = recordedBuffers.reduce((acc, b) => acc + b.length, 0);
    const result = new Float32Array(totalLen);
    let offset = 0; 
    recordedBuffers.forEach(b => { 
      result.set(b, offset); 
      offset += b.length; 
    });
    const buffer = audioCtx.createBuffer(1, result.length, audioCtx.sampleRate);
    buffer.copyToChannel(result, 0);
    const player = audioCtx.createBufferSource();
    player.buffer = buffer;
    player.connect(audioCtx.destination);
    player.onended = () => { 
      playStateEl.textContent = "Standby"; 
      playStateEl.style.color = "#eab308"; 
    };
    player.start();
  }

  // --- Listeners ---
  pttBtn.addEventListener('mousedown', startRecord);
  document.addEventListener('mouseup', () => { if(isRecording) stopRecordAndPlay(); }); 
  pttBtn.addEventListener('touchstart', startRecord, {passive: false});
  pttBtn.addEventListener('touchend', stopRecordAndPlay);
  gainSlider.addEventListener('input', () => { if(gainNode) gainNode.gain.value = gainSlider.value; });
  deviceSelect.addEventListener('change', startEngine); 
  
  // Permission button click retry
  permBtn.addEventListener('click', () => {
    statusText.textContent = "Requesting...";
    startEngine();
  });

  // Initialization
  await refreshDevices();
  startEngine();

})();