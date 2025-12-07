// --- 1. 语言检测与翻译字典 ---
const translations = {
    'zh': {
        'title': '在线摄像头测试工具, webcam test , camera test',
        'badge': '自动',
        'video_label': '视频输入源',
        'mirror_btn': '镜像翻转',
        'status_header': '设备状态',
        'run_status': '运行状态',
        'device_name': '设备名称',
        'actual_res': '实际分辨率',
        'aspect_ratio': '画面比例',
        'caps_header': '硬件能力 (Capabilities)',
        'caps_hint': '* 浏览器读取的底层驱动参数',
        // JS Status Texts
        'detecting': '正在检测设备...',
        'req_perm': '请求权限中...',
        'active': '正常运行',
        'switching': '切换中...',
        'fail': '启动失败:',
        'retrying': '重试获取权限...',
        'no_access_alert': '无法访问摄像头。请检查浏览器权限设置，并确保使用 HTTPS 或 localhost。',
        // Capability Table Keys (Internal)
        'res_range': '分辨率范围',
        'fps_range': 'FPS 范围',
        'aspect_range': '支持比例',
        'group_id': 'Group ID',
        'features': '支持特性',
        'no_caps': '无法获取详细驱动信息',
    },
    'en': {
        'title': 'Webcam Test Tool,camera test,camera check',
        'badge': 'AUTO',
        'video_label': 'Video Input Source',
        'mirror_btn': 'Mirror Flip',
        'status_header': 'Device Status',
        'run_status': 'Status',
        'device_name': 'Device Name',
        'actual_res': 'Actual Resolution',
        'aspect_ratio': 'Aspect Ratio',
        'caps_header': 'Hardware Capabilities',
        'caps_hint': '* Underlying driver parameters read by the browser',
        // JS Status Texts
        'detecting': 'Detecting devices...',
        'req_perm': 'Requesting permissions...',
        'active': 'Active',
        'switching': 'Switching...',
        'fail': 'Start Failed:',
        'retrying': 'Retrying to get permission...',
        'no_access_alert': 'Cannot access camera. Please check browser permissions and ensure using HTTPS or localhost.',
        // Capability Table Keys (Internal)
        'res_range': 'Resolution Range',
        'fps_range': 'FPS Range',
        'aspect_range': 'Aspect Ratio Range',
        'group_id': 'Group ID',
        'features': 'Supported Features',
        'no_caps': 'Unable to get detailed driver info',
    }
};

// 自动选择语言
let currentLang = 'zh'; // 默认中文
const browserLang = navigator.language.toLowerCase().split('-')[0];
if (translations[browserLang]) {
    currentLang = browserLang;
}
const t = translations[currentLang];

// 静态文本替换函数
function setLanguage() {
    document.title = t.title;
    document.getElementById('title-text').innerHTML = `Webcam <span style="color:var(--accent)">Test</span> <span class="badge">${t.badge}</span>`;
    document.getElementById('video-label').textContent = t.video_label;
    document.getElementById('btn-mirror').textContent = t.mirror_btn;
    
    document.getElementById('status-header-text').innerHTML = `<span class="status-dot"></span>${t.status_header}`;
    document.getElementById('run-status-label').textContent = t.run_status;
    document.getElementById('device-name-label').textContent = t.device_name;
    document.getElementById('actual-res-label').textContent = t.actual_res;
    document.getElementById('aspect-ratio-label').textContent = t.aspect_ratio;

    document.getElementById('caps-header-text').textContent = t.caps_header;
    document.getElementById('caps-hint').textContent = t.caps_hint;
    
    // 设置初始状态文本
    document.getElementById('videoSource').innerHTML = `<option>${t.detecting}</option>`;
    document.getElementById('status-text').textContent = t.req_perm;
}

// --- 2. 脚本核心逻辑 ---

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

// 视频流
let videoStream = null;
let animationId = null;
let retryTimer = null;
let retryCount = 0;
const MAX_RETRY_COUNT = 100; // 最大重试次数（约50秒）

let lastFrameTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = 0;

/**
 * 启动逻辑：页面加载即运行
 */
async function autoStart() {
    try {
        // 步骤 1: 立即请求权限并获取设备列表
        statusText.textContent = t.req_perm;
        
        // 获取视频设备
        await getVideoDevices();
        
        // 如果设备列表中有设备，自动启动第一个摄像头
        if (videoSelect.options.length > 0) {
            await startVideoStream(videoSelect.value);
        }
        
        if (!animationId) {
            requestAnimationFrame(updateStats);
        }

    } catch (error) {
        console.error("Auto start failed:", error);
        
        // 检查是否是权限错误
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            // 权限被拒绝，开始重试
            statusText.textContent = t.retrying + ' (' + (retryCount + 1) + ')';
            statusText.style.color = "#f59e0b"; // 橙色警告色
            
            // 清除之前的重试定时器（如果有）
            if (retryTimer) {
                clearTimeout(retryTimer);
            }
            
            // 开始重试（每0.5秒一次）
            startRetry();
        } else {
            // 其他错误
            statusHeader.className = 'error';
            statusText.textContent = t.fail + (error.name || 'Unknown');
            statusText.style.color = "#ef4444";
            alert(t.no_access_alert);
        }
    }
}

/**
 * 开始重试获取权限
 */
function startRetry() {
    retryTimer = setTimeout(async () => {
        retryCount++;
        
        // 检查是否超过最大重试次数
        if (retryCount >= MAX_RETRY_COUNT) {
            statusText.textContent = t.fail + 'Max retries exceeded';
            statusText.style.color = "#ef4444";
            return;
        }
        
        try {
            // 尝试重新获取设备
            await getVideoDevices();
            
            // 如果有设备，尝试启动
            if (videoSelect.options.length > 0) {
                await startVideoStream(videoSelect.value);
                
                // 成功！清除重试定时器
                if (retryTimer) {
                    clearTimeout(retryTimer);
                    retryTimer = null;
                }
                retryCount = 0;
            } else {
                // 没有设备，继续重试
                statusText.textContent = t.retrying + ' (' + (retryCount + 1) + ')';
                startRetry();
            }
        } catch (error) {
            // 再次失败，继续重试
            statusText.textContent = t.retrying + ' (' + (retryCount + 1) + ')';
            startRetry();
        }
    }, 500); // 0.5秒
}

// 获取视频设备列表
async function getVideoDevices() {
    try {
        // 请求视频权限并枚举设备
        const tempStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
        });
        tempStream.getTracks().forEach(track => track.stop());
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoSelect.innerHTML = '';
        
        devices.forEach(device => {
            if (device.kind === 'videoinput') {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${videoSelect.length + 1}`;
                videoSelect.appendChild(option);
            }
        });
        
        if (videoSelect.options.length > 0) {
            videoSelect.options[0].selected = true;
        }
    } catch (error) {
        console.error('Error getting video devices:', error);
        throw error; // 重新抛出错误
    }
}

// 启动视频流
async function startVideoStream(deviceId) {
    // 停止当前视频流
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    
    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    };
    
    try {
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = videoStream;
        
        statusHeader.className = 'active';
        statusText.textContent = t.active;
        statusText.style.color = "#10b981";
        
        const videoTrack = videoStream.getVideoTracks()[0];
        analyzeVideoTrack(videoTrack);
        
    } catch (error) {
        console.error('Error starting video stream:', error);
        statusText.textContent = t.fail + (error.name || 'Unknown');
        statusHeader.className = 'error';
        throw error; // 重新抛出错误
    }
}

// 分析硬件参数
function analyzeVideoTrack(track) {
    const settings = track.getSettings();
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};

    deviceLabel.textContent = track.label || 'Unknown Device';
    
    let capHtml = '';
    
    if(capabilities.width) capHtml += `<tr><td>${t.res_range}</td><td>${capabilities.width.min} - ${capabilities.width.max}px</td></tr>`;
    if(capabilities.frameRate) capHtml += `<tr><td>${t.fps_range}</td><td>${capabilities.frameRate.min} - ${capabilities.frameRate.max}</td></tr>`;
    if(capabilities.aspectRatio) capHtml += `<tr><td>${t.aspect_range}</td><td>${capabilities.aspectRatio.min} - ${capabilities.aspectRatio.max}</td></tr>`;
    if(settings.groupId) capHtml += `<tr><td>${t.group_id}</td><td>${settings.groupId.substr(0, 8)}...</td></tr>`;
    
    const features = ['zoom', 'focusMode', 'whiteBalanceMode', 'exposureMode'];
    let featureList = [];
    features.forEach(f => { if(f in capabilities) featureList.push(f); });
    if(featureList.length > 0) {
        capHtml += `<tr><td>${t.features}</td><td>${featureList.join(', ')}</td></tr>`;
    }

    capTable.innerHTML = capHtml || `<tr><td colspan="2">${t.no_caps}</td></tr>`;
}

// 实时统计循环
function updateStats(timestamp) {
    if (!videoElement.srcObject || !videoElement.srcObject.active) {
        animationId = requestAnimationFrame(updateStats);
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

    animationId = requestAnimationFrame(updateStats);
}

// 事件监听器
videoSelect.onchange = async () => {
    statusText.textContent = t.switching;
    
    // 清除重试定时器（如果正在重试）
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
        retryCount = 0;
    }
    
    await startVideoStream(videoSelect.value);
};

document.getElementById('btn-mirror').onclick = () => videoElement.classList.toggle('no-mirror');

// 页面加载完毕立即执行
window.addEventListener('load', () => {
    setLanguage(); // 首先设置语言
    autoStart();  // 然后自动启动检测
});

// 页面关闭时清理资源
window.addEventListener('beforeunload', () => {
    if (retryTimer) {
        clearTimeout(retryTimer);
    }
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
});