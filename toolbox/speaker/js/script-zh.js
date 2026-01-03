let audioCtx = null;
let oscillator = null;
let noiseSource = null;
let masterGainNode = null;
let leftGainNode = null;
let rightGainNode = null;
let merger = null;
let splitter = null;
let analyser = null;
let isPlaying = false;
let isSweeping = false;
let isNoisePlaying = false;
let currentChannel = "双声道"; // 默认声道模式
let noiseType = null; // 当前噪音类型
let sweepStartTime = null; // 扫频开始时间
let sweepInterval = null; // 扫频更新间隔

const freqSlider = document.getElementById('freqSlider');
const freqVal = document.getElementById('freqVal');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const playStopBtn = document.getElementById('playStopBtn');
const sweepBtn = document.getElementById('sweepBtn');
const visualizerContainer = document.getElementById('visualizer-container');
const currentFrequencyDisplay = document.getElementById('currentFrequency');
const currentChannelDisplay = document.getElementById('currentChannel');
const audioStatusDisplay = document.getElementById('audioStatus');
const playStopText = document.getElementById('playStopText');

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建节点
        masterGainNode = audioCtx.createGain();
        // 移除 splitter，保留 merger 用于合成最终立体声输出
        merger = audioCtx.createChannelMerger(2);
        leftGainNode = audioCtx.createGain();
        rightGainNode = audioCtx.createGain();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        
        masterGainNode.gain.value = volumeSlider.value / 100;
        
        // --- 核心修复：连接逻辑 ---
        // 将单声道的 masterGainNode 同时连接到左和右两个控制节点
        masterGainNode.connect(leftGainNode);
        masterGainNode.connect(rightGainNode);
        
        // 将左增益节点接入合并器的 0 号输入（左声道）
        // 将右增益节点接入合并器的 1 号输入（右声道）
        leftGainNode.connect(merger, 0, 0);
        rightGainNode.connect(merger, 0, 1);
        
        merger.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        drawVisualizer();
        audioStatusDisplay.innerText = '已激活';
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

// 优化后的声道控制逻辑
function setChannelMode(mode) {
    initAudio(); 
    
    currentChannel = mode;
    currentChannelDisplay.innerText = currentChannel;

    // 如果当前没声音，自动触发播放
    if (!isPlaying && !isNoisePlaying && !isSweeping) {
        startOscillator(freqSlider.value);
    }

    if (leftGainNode && rightGainNode) {
        const now = audioCtx.currentTime;
        const rampTime = 0.06; // 稍微快一点的切换速度，避免过长淡出感

        if (mode === '左声道') {
            leftGainNode.gain.setTargetAtTime(1, now, rampTime);
            rightGainNode.gain.setTargetAtTime(0, now, rampTime);
        } else if (mode === '右声道') {
            leftGainNode.gain.setTargetAtTime(0, now, rampTime);
            rightGainNode.gain.setTargetAtTime(1, now, rampTime);
        } else {
            leftGainNode.gain.setTargetAtTime(1, now, rampTime);
            rightGainNode.gain.setTargetAtTime(1, now, rampTime);
        }
    }

    // 更新UI样式
    document.querySelectorAll('.btn-secondary').forEach(btn => btn.classList.remove('active'));
    if (mode === '左声道') document.getElementById('leftChannelBtn').classList.add('active');
    else if (mode === '右声道') document.getElementById('rightChannelBtn').classList.add('active');
    else if (mode === '双声道') document.getElementById('bothChannelsBtn').classList.add('active');
}

function stopAll() {
    if (oscillator) { 
        oscillator.stop(); 
        oscillator = null; 
    }
    if (noiseSource) {
        noiseSource.stop();
        noiseSource = null;
    }
    
    // 清除扫频更新间隔
    if (sweepInterval) {
        clearInterval(sweepInterval);
        sweepInterval = null;
    }
    
    isPlaying = false;
    isSweeping = false;
    isNoisePlaying = false;
    noiseType = null;
    sweepStartTime = null;
    visualizerContainer.classList.remove('sweeping');
    playStopBtn.classList.remove('playing');
    playStopText.innerText = '开始播放';
    audioStatusDisplay.innerText = '已停止';
    playStopBtn.disabled = false;
    
    // 清除噪音按钮的激活状态
    document.getElementById('whiteNoiseBtn').classList.remove('active');
    document.getElementById('pinkNoiseBtn').classList.remove('active');
}

function startOscillator(freq) {
    initAudio();
    
    // 修改条件：只有确实在播放正弦波时才更新频率，否则创建新的振荡器
    if (isPlaying && oscillator && !isSweeping && !isNoisePlaying) {
        oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
        currentFrequencyDisplay.innerText = freq + ' Hz';
        return;
    }

    stopAll();
    
    oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    oscillator.connect(masterGainNode);
    oscillator.start();
    
    isPlaying = true;
    playStopBtn.classList.add('playing');
    playStopText.innerText = '停止播放';
    currentFrequencyDisplay.innerText = freq + ' Hz';
    audioStatusDisplay.innerText = '正弦波播放中';
}

function startSweep() {
    initAudio();
    stopAll();
    
    oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.connect(masterGainNode);
    
    const startTime = audioCtx.currentTime;
    const duration = 10;
    
    oscillator.frequency.setValueAtTime(10, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(20000, startTime + duration);
    
    oscillator.start();
    oscillator.stop(startTime + duration);
    
    isSweeping = true;
    sweepStartTime = startTime;
    visualizerContainer.classList.add('sweeping');
    audioStatusDisplay.innerText = '扫频中';
    playStopBtn.disabled = true;
    
    // 更新当前频率显示为扫频起始频率
    currentFrequencyDisplay.innerText = '10 Hz';
    
    // 设置扫频频率更新
    sweepInterval = setInterval(() => {
        if (isSweeping && sweepStartTime) {
            const elapsed = audioCtx.currentTime - sweepStartTime;
            if (elapsed < duration) {
                // 指数扫频公式: f(t) = f0 * (f1/f0)^(t/duration)
                const f0 = 10;
                const f1 = 20000;
                const currentFreq = f0 * Math.pow(f1 / f0, elapsed / duration);
                currentFrequencyDisplay.innerText = Math.round(currentFreq) + ' Hz';
            }
        }
    }, 50); // 每50ms更新一次
    
    oscillator.onended = function() {
        stopAll();
        currentFrequencyDisplay.innerText = '20000 Hz';
        audioStatusDisplay.innerText = '扫频完成';
        setTimeout(() => {
            currentFrequencyDisplay.innerText = '-';
        }, 1000);
    };
}

// 噪音生成逻辑保持不变...
function generateWhiteNoise() {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    return buffer;
}

function generatePinkNoise() {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
    }
    return buffer;
}

function startNoise(type) {
    initAudio();
    stopAll();
    noiseType = type;
    let noiseBuffer = (type === 'white') ? generateWhiteNoise() : generatePinkNoise();
    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    noiseSource.connect(masterGainNode);
    noiseSource.start();
    isNoisePlaying = true;
    playStopBtn.classList.add('playing');
    playStopText.innerText = '停止播放';
    currentFrequencyDisplay.innerText = type === 'white' ? '白噪音' : '粉红噪音';
    audioStatusDisplay.innerText = (type === 'white' ? '白' : '粉红') + '噪音播放中';
    playStopBtn.disabled = false; // 允许点击停止
}


// 绘制频谱图
function drawVisualizer() {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    function render() {
        requestAnimationFrame(render);
        analyser.getByteFrequencyData(dataArray);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            ctx.fillStyle = isNoisePlaying ? 
                (noiseType === 'white' ? `rgb(100,200,100)` : `rgb(200,100,150)`) : 
                `rgb(50, 150, ${barHeight + 100})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    render();
}

// 事件绑定
playStopBtn.onclick = () => {
    if (isPlaying || isNoisePlaying) stopAll();
    else startOscillator(freqSlider.value);
};

sweepBtn.onclick = startSweep;
document.getElementById('stopAllBtn').onclick = stopAll;

freqSlider.oninput = function() {
    const freq = parseInt(this.value);
    freqVal.innerText = freq + ' Hz';
    if (isPlaying && !isSweeping && !isNoisePlaying) {
        oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
        currentFrequencyDisplay.innerText = freq + ' Hz';
    }
};

volumeSlider.oninput = function() {
    volumeValue.innerText = this.value + '%';
    if (masterGainNode) masterGainNode.gain.setTargetAtTime(this.value / 100, audioCtx.currentTime, 0.05);
};

document.querySelectorAll('.freq-btn').forEach(btn => {
    btn.onclick = function() {
        freqSlider.value = this.dataset.freq;
        freqVal.innerText = this.dataset.freq + ' Hz';
        startOscillator(this.dataset.freq);
    };
});

// 声道按钮点击事件
document.getElementById('leftChannelBtn').onclick = () => setChannelMode('左声道');
document.getElementById('bothChannelsBtn').onclick = () => setChannelMode('双声道');
document.getElementById('rightChannelBtn').onclick = () => setChannelMode('右声道');

// 噪音按钮点击事件
document.getElementById('whiteNoiseBtn').onclick = function() {
    startNoise('white');
    this.classList.add('active');
};
document.getElementById('pinkNoiseBtn').onclick = function() {
    startNoise('pink');
    this.classList.add('active');
};

// 初始化
freqVal.innerText = freqSlider.value + ' Hz';
volumeValue.innerText = volumeSlider.value + '%';