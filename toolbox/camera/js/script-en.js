// DOM Elements
const videoElement = document.getElementById('video');
const videoSelect = document.getElementById('videoSource');

// Stats Elements
const liveRes = document.getElementById('live-res');
const liveFps = document.getElementById('live-fps');
const statusHeader = document.getElementById('status-header-text');
const statusText = document.getElementById('status-text');
const deviceLabel = document.getElementById('device-label');
const infoRes = document.getElementById('info-res');
const infoAspect = document.getElementById('info-aspect');
const capTable = document.getElementById('capabilities-table');

let currentStream;
let lastFrameTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = 0;

/**
 * 自动启动：页面加载即运行
 */
async function autoStart() {
    try {
        // 步骤 1: 立即请求权限
        statusText.textContent = '请求权限中...';
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // 步骤 2: 权限通过后，枚举所有设备
        const currentVideoId = initialStream.getVideoTracks()[0].getSettings().deviceId;
        await populateDeviceList(currentVideoId);

        // 步骤 3: 关闭初始流，使用选择的第一个设备开始正式显示
        initialStream.getTracks().forEach(track => track.stop());
        
        // videoSelect 的值已在 populateDeviceList 中设置
        startStream();

    } catch (error) {
        console.error("Auto start failed:", error);
        statusHeader.className = 'error';
        statusText.textContent = '启动失败: ' + (error.name || 'Unknown');
        statusText.style.color = "#ef4444";
        alert('无法访问摄像头。请检查浏览器权限设置，并确保使用 HTTPS 或 localhost。');
    }
}

// 填充设备列表
async function populateDeviceList(activeVideoId) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    videoSelect.innerHTML = '';
    let videoFound = false;

    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        
        if (device.kind === 'videoinput') {
            option.text = device.label || `摄像头 ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
            if (device.deviceId === activeVideoId) {
                option.selected = true; // 选中当前活动的设备
                videoFound = true;
            }
        }
    });

    if (videoSelect.options.length > 0 && !videoFound) {
        videoSelect.options[0].selected = true; // 如果找不到活跃的，默认选中第一个
    }
}

// 启动指定的流
async function startStream() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    const videoId = videoSelect.value;

    const constraints = {
        video: {
            deviceId: videoId ? { exact: videoId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 } 
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        videoElement.srcObject = stream;
        
        statusHeader.className = 'active';
        statusText.textContent = '正常运行';
        statusText.style.color = "#10b981";

        const videoTrack = stream.getVideoTracks()[0];
        analyzeVideoTrack(videoTrack);

        requestAnimationFrame(updateStats);

    } catch (error) {
        console.error('Error starting specific stream:', error);
        statusText.textContent = '启动失败: ' + (error.name || 'Unknown');
        statusHeader.className = 'error';
    }
}

// 分析硬件参数
function analyzeVideoTrack(track) {
    const settings = track.getSettings();
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};

    deviceLabel.textContent = track.label || '未知设备';
    
    let capHtml = '';
    
    if(capabilities.width) capHtml += `<tr><td>分辨率范围</td><td>${capabilities.width.min} - ${capabilities.width.max}px</td></tr>`;
    if(capabilities.frameRate) capHtml += `<tr><td>FPS 范围</td><td>${capabilities.frameRate.min} - ${capabilities.frameRate.max}</td></tr>`;
    if(capabilities.aspectRatio) capHtml += `<tr><td>支持比例</td><td>${capabilities.aspectRatio.min} - ${capabilities.aspectRatio.max}</td></tr>`;
    if(settings.groupId) capHtml += `<tr><td>Group ID</td><td>${settings.groupId.substr(0, 8)}...</td></tr>`;
    
    const features = ['zoom', 'focusMode', 'whiteBalanceMode', 'exposureMode'];
    let featureList = [];
    features.forEach(f => { if(f in capabilities) featureList.push(f); });
    if(featureList.length > 0) {
        capHtml += `<tr><td>支持特性</td><td>${featureList.join(', ')}</td></tr>`;
    }

    capTable.innerHTML = capHtml || `<tr><td colspan="2">无法获取详细驱动信息</td></tr>`;
}

// 实时统计循环
function updateStats(timestamp) {
    if (!currentStream || !currentStream.active) {
        requestAnimationFrame(updateStats);
        return;
    }

    if (videoElement.videoWidth) {
        const w = videoElement.videoWidth;
        const h = videoElement.videoHeight;
        liveRes.textContent = `${w}x${h}`;
        infoRes.textContent = `${w} x ${h}`;
        infoAspect.textContent = (w/h).toFixed(2);
    }

    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        const fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        liveFps.textContent = fps;
        lastFpsUpdate = timestamp;
        frameCount = 0;
    }

    requestAnimationFrame(updateStats);
}

// 事件监听器
videoSelect.onchange = () => {
    statusText.textContent = '切换中...';
    startStream();
};

document.getElementById('btn-mirror').onclick = () => videoElement.classList.toggle('no-mirror');

// 页面加载完毕立即执行
window.addEventListener('load', autoStart);