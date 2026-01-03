// 音频控制变量
let audioCtx = null;
let currentSource = null;
let oscillator = null;
let gainNode = null;
let panner = null;
let analyser = null;
let isPlaying = false;
let currentChannel = 'both';
let currentVolume = 0.5;
let sweepInterval = null;
let isSweeping = false;

// DOM元素引用
const freqSlider = document.getElementById('freqSlider');
const freqVal = document.getElementById('freqVal');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const playStopBtn = document.getElementById('playStopBtn');
const playStopIcon = document.getElementById('playStopIcon');
const playStopText = document.getElementById('playStopText');
const sweepBtn = document.getElementById('sweepBtn');
const stopAllBtn = document.getElementById('stopAllBtn');
const leftChannelBtn = document.getElementById('leftChannelBtn');
const bothChannelsBtn = document.getElementById('bothChannelsBtn');
const rightChannelBtn = document.getElementById('rightChannelBtn');
const whiteNoiseBtn = document.getElementById('whiteNoiseBtn');
const pinkNoiseBtn = document.getElementById('pinkNoiseBtn');
const currentStatus = document.getElementById('currentStatus');
const currentFrequency = document.getElementById('currentFrequency');
const currentChannelDisplay = document.getElementById('currentChannel');
const audioStatus = document.getElementById('audioStatus');
const visualizerContainer = document.getElementById('visualizer-container');

// 初始化音频上下文
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        drawVisualizer();
        updateAudioStatus('已激活');
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    updateStatus('就绪');
}

// 更新状态显示
function updateStatus(status) {
    currentStatus.textContent = status;
    if (status === '播放中' || status === '扫描中') {
        currentStatus.classList.add('playing');
    } else {
        currentStatus.classList.remove('playing');
    }
}

function updateAudioStatus(status) {
    audioStatus.textContent = status;
}

// 更新播放/停止按钮状态
function updatePlayStopButton(isPlaying) {
    if (isPlaying) {
        playStopBtn.classList.add('playing');
        playStopIcon.className = 'fas fa-stop';
        playStopText.textContent = '停止播放';
    } else {
        playStopBtn.classList.remove('playing');
        playStopIcon.className = 'fas fa-play';
        playStopText.textContent = '播放测试音';
    }
}

// 更新音量
function updateVolume(value) {
    currentVolume = value / 100;
    volumeValue.textContent = value + '%';
    if (gainNode && isPlaying) {
        gainNode.gain.value = currentVolume;
    }
}

// 停止所有音频
function stopAll() {
    if (oscillator) { 
        oscillator.stop(); 
        oscillator = null; 
    }
    if (currentSource) { 
        currentSource.stop(); 
        currentSource = null; 
    }
    isPlaying = false;
    
    // 停止频率扫描
    if (sweepInterval) {
        clearInterval(sweepInterval);
        sweepInterval = null;
        isSweeping = false;
        visualizerContainer.classList.remove('sweeping');
    }
    
    updateStatus('已停止');
    currentFrequency.textContent = '-';
    currentChannelDisplay.textContent = '-';
    updatePlayStopButton(false);
    
    // 移除所有频率按钮的活动状态
    document.querySelectorAll('.freq-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// 左右声道测试
function testChannel(side) {
    initAudio();
    stopAll();
    
    oscillator = audioCtx.createOscillator();
    panner = audioCtx.createStereoPanner();
    gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
    
    if (side === 'left') {
        panner.pan.setValueAtTime(-1, audioCtx.currentTime);
        currentChannel = '左声道';
    } else if (side === 'right') {
        panner.pan.setValueAtTime(1, audioCtx.currentTime);
        currentChannel = '右声道';
    } else {
        panner.pan.setValueAtTime(0, audioCtx.currentTime);
        currentChannel = '双声道';
    }
    
    // 设置音量
    gainNode.gain.value = currentVolume;
    
    oscillator.connect(panner).connect(gainNode).connect(analyser).connect(audioCtx.destination);
    
    oscillator.start();
    isPlaying = true;
    
    updateStatus('播放中');
    currentFrequency.textContent = '1000 Hz';
    currentChannelDisplay.textContent = currentChannel;
    updatePlayStopButton(true);
}

// 切换播放/停止测试音
function toggleOscillator() {
    if (isPlaying && oscillator) {
        stopAll();
    } else {
        startOscillator();
    }
}

// 频率播放
function startOscillator() {
    initAudio();
    stopAll();
    
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    
    const freq = freqSlider.value;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    oscillator.type = 'sine';
    
    // 设置音量
    gainNode.gain.value = currentVolume;
    
    oscillator.connect(gainNode).connect(analyser).connect(audioCtx.destination);
    oscillator.start();
    isPlaying = true;
    
    updateStatus('播放中');
    currentFrequency.textContent = freq + ' Hz';
    currentChannelDisplay.textContent = '双声道';
    currentChannel = '双声道';
    updatePlayStopButton(true);
    
    // 标记当前频率的按钮
    document.querySelectorAll('.freq-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.getAttribute('data-freq')) === parseInt(freq)) {
            btn.classList.add('active');
        }
    });
}

// 频率扫描
function startSweep() {
    initAudio();
    stopAll();
    
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(20, audioCtx.currentTime);
    
    // 设置音量
    gainNode.gain.value = currentVolume * 0.7; // 扫描时音量略低
    
    oscillator.connect(gainNode).connect(analyser).connect(audioCtx.destination);
    oscillator.start();
    isPlaying = true;
    isSweeping = true;
    
    // 添加扫描动画
    visualizerContainer.classList.add('sweeping');
    
    updateStatus('扫描中');
    currentChannelDisplay.textContent = '双声道';
    currentChannel = '双声道';
    updatePlayStopButton(true);
    
    let currentFreq = 20;
    const maxFreq = 21000;
    const sweepDuration = 10000; // 10秒完成扫描
    
    // 更新频率显示
    function updateSweep() {
        if (!isSweeping) return;
        
        // 指数增长，使频率扫描听起来更自然
        const exponentialFreq = 20 * Math.pow(maxFreq / 20, currentFreq / sweepDuration);
        oscillator.frequency.setTargetAtTime(exponentialFreq, audioCtx.currentTime, 0.1);
        
        currentFrequency.textContent = Math.round(exponentialFreq) + ' Hz';
        freqVal.textContent = Math.round(exponentialFreq) + ' Hz';
        freqSlider.value = Math.round(exponentialFreq);
        
        currentFreq += 20; // 每20ms增加一次
        
        if (currentFreq <= sweepDuration) {
            setTimeout(updateSweep, 20);
        } else {
            // 扫描完成
            stopAll();
            updateStatus('扫描完成');
        }
    }
    
    setTimeout(updateSweep, 50);
}

function updateFreq(val) {
    freqVal.textContent = val + ' Hz';
    if (oscillator && isPlaying && !isSweeping) {
        oscillator.frequency.setTargetAtTime(val, audioCtx.currentTime, 0.05);
        currentFrequency.textContent = val + ' Hz';
        
        // 更新频率按钮状态
        document.querySelectorAll('.freq-btn').forEach(btn => {
            btn.classList.remove('active');
            const btnFreq = parseInt(btn.getAttribute('data-freq'));
            if (Math.abs(btnFreq - parseInt(val)) < 10) {
                btn.classList.add('active');
            }
        });
    }
}

// 播放噪音
function playNoise(type) {
    initAudio();
    stopAll();
    
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    if (type === 'white') {
        // 白噪音
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    } else {
        // 粉红噪音 (简化版本)
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; // 调整增益
            b6 = white * 0.115926;
        }
    }
    
    currentSource = audioCtx.createBufferSource();
    currentSource.buffer = noiseBuffer;
    currentSource.loop = true;
    
    gainNode = audioCtx.createGain();
    gainNode.gain.value = currentVolume * 0.4;
    
    currentSource.connect(gainNode).connect(analyser).connect(audioCtx.destination);
    currentSource.start();
    isPlaying = true;
    
    updateStatus('播放中');
    currentFrequency.textContent = type === 'white' ? '白噪音' : '粉红噪音';
    currentChannelDisplay.textContent = '双声道';
    currentChannel = '双声道';
    updatePlayStopButton(true);
}

// 可视化逻辑
function drawVisualizer() {
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');
    
    // 设置canvas尺寸
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        requestAnimationFrame(draw);
        
        if (!analyser) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // 渐变背景
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#000814');
        gradient.addColorStop(0.5, '#001D3D');
        gradient.addColorStop(1, '#003566');
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制频谱条
        const barWidth = (canvas.width / bufferLength) * 3.5;
        let barHeight;
        let x = 0;
        
        for(let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 1.2;
            
            // 根据频率设置颜色（低频到高频）
            let hue = 240 + (i / bufferLength) * 180;
            if (hue > 360) hue = 360;
            const color = `hsl(${hue}, 100%, 60%)`;
            
            canvasCtx.fillStyle = color;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            // 添加反光效果
            canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, 2);
            
            x += barWidth + 1;
        }
    }
    draw();
}

// 初始化事件监听
function initEventListeners() {
    // 频率滑块事件
    freqSlider.addEventListener('input', function() {
        updateFreq(this.value);
    });
    
    // 音量滑块事件
    volumeSlider.addEventListener('input', function() {
        updateVolume(this.value);
    });
    
    // 播放/停止按钮事件
    playStopBtn.addEventListener('click', toggleOscillator);
    
    // 频率扫描按钮事件
    sweepBtn.addEventListener('click', startSweep);
    
    // 停止所有按钮事件
    stopAllBtn.addEventListener('click', stopAll);
    
    // 声道按钮事件
    leftChannelBtn.addEventListener('click', () => testChannel('left'));
    bothChannelsBtn.addEventListener('click', () => testChannel('both'));
    rightChannelBtn.addEventListener('click', () => testChannel('right'));
    
    // 噪音按钮事件
    whiteNoiseBtn.addEventListener('click', () => playNoise('white'));
    pinkNoiseBtn.addEventListener('click', () => playNoise('pink'));
    
    // 频率按钮点击事件
    document.querySelectorAll('.freq-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const freq = this.getAttribute('data-freq');
            freqSlider.value = freq;
            updateFreq(freq);
            
            // 更新按钮状态
            document.querySelectorAll('.freq-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // 音频上下文激活
    document.addEventListener('click', function() {
        if (!audioCtx) {
            initAudio();
        }
    }, { once: true });
    
    // 设置初始状态
    updateStatus('就绪');
    updateAudioStatus('点击页面激活');
    updatePlayStopButton(false);
    
    // 默认激活500Hz按钮
    document.querySelector('.freq-btn[data-freq="1000"]').classList.add('active');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initEventListeners);