let audioCtx = null;
let oscillator = null;
let gainNode = null;
let analyser = null;
let isPlaying = false;
let isSweeping = false;
let currentChannel = "双声道"; // 默认声道模式

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
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        drawVisualizer();
        audioStatusDisplay.innerText = '已激活';
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function stopAll() {
    if (oscillator) { 
        oscillator.stop(); 
        oscillator = null; 
    }
    isPlaying = false;
    isSweeping = false;
    visualizerContainer.classList.remove('sweeping');
    playStopBtn.classList.remove('playing');
    playStopText.innerText = '开始播放';
    audioStatusDisplay.innerText = '已停止';
}

function startOscillator(freq) {
    initAudio();
    stopAll();
    
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    // 设置初始音量
    gainNode.gain.value = volumeSlider.value / 100;
    
    // 连接音频节点
    oscillator.connect(gainNode).connect(analyser).connect(audioCtx.destination);
    oscillator.start();
    
    isPlaying = true;
    playStopBtn.classList.add('playing');
    playStopText.innerText = '停止播放';
    currentFrequencyDisplay.innerText = freq + ' Hz';
    audioStatusDisplay.innerText = '播放中';
}

function startSweep() {
    initAudio();
    stopAll();
    isSweeping = true;
    visualizerContainer.classList.add('sweeping');
    
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    
    gainNode.gain.value = volumeSlider.value / 100;
    oscillator.connect(gainNode).connect(analyser).connect(audioCtx.destination);
    
    const startTime = audioCtx.currentTime;
    const duration = 10; // 10秒
    
    // 对数扫频 (更符合人耳听感) - 从10Hz开始
    oscillator.frequency.setValueAtTime(10, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(20000, startTime + duration);
    
    oscillator.start();
    oscillator.stop(startTime + duration);
    
    oscillator.onended = function() {
        stopAll();
        audioStatusDisplay.innerText = '扫频完成';
    };
    
    audioStatusDisplay.innerText = '扫频中';
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
            ctx.fillStyle = `rgb(50, 150, ${barHeight + 100})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    render();
}

// 音量控制函数
function updateVolume() {
    const volume = volumeSlider.value;
    volumeValue.innerText = volume + '%';
    
    // 如果正在播放，实时更新音量
    if (gainNode && (isPlaying || isSweeping)) {
        // 平滑过渡音量变化
        gainNode.gain.setTargetAtTime(volume / 100, audioCtx.currentTime, 0.05);
    }
}

// 设置声道模式
function setChannelMode(mode) {
    currentChannel = mode;
    currentChannelDisplay.innerText = currentChannel;
}

// 事件绑定
playStopBtn.onclick = () => isPlaying ? stopAll() : startOscillator(freqSlider.value);
sweepBtn.onclick = startSweep;
document.getElementById('stopAllBtn').onclick = stopAll;

// 频率滑块事件
freqSlider.oninput = function() {
    const freq = parseInt(this.value);
    freqVal.innerText = freq + ' Hz';
    if (oscillator && isPlaying && !isSweeping) {
        oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
        currentFrequencyDisplay.innerText = freq + ' Hz';
    }
};

// 音量滑块事件 - 修复音量调节
volumeSlider.oninput = updateVolume;

// 预设频率按钮
document.querySelectorAll('.freq-btn').forEach(btn => {
    btn.onclick = function() {
        const freq = this.dataset.freq;
        freqSlider.value = freq;
        freqVal.innerText = freq + ' Hz';
        startOscillator(freq);
    };
});

// 声道控制按钮
document.getElementById('leftChannelBtn').onclick = () => setChannelMode('左声道');
document.getElementById('bothChannelsBtn').onclick = () => setChannelMode('双声道');
document.getElementById('rightChannelBtn').onclick = () => setChannelMode('右声道');

// 白噪音和粉红噪音功能（简单实现）
document.getElementById('whiteNoiseBtn').onclick = function() {
    initAudio();
    stopAll();
    // 这里可以添加白噪音生成逻辑
    alert('白噪音功能正在开发中...');
};

document.getElementById('pinkNoiseBtn').onclick = function() {
    initAudio();
    stopAll();
    // 这里可以添加粉红噪音生成逻辑
    alert('粉红噪音功能正在开发中...');
};

// 初始化音量显示和声道模式
volumeValue.innerText = volumeSlider.value + '%';
currentChannelDisplay.innerText = currentChannel;

// 添加页面卸载时的清理
window.addEventListener('beforeunload', function() {
    if (oscillator) {
        stopAll();
    }
});

// 初始化时设置频率显示
freqVal.innerText = freqSlider.value + ' Hz';