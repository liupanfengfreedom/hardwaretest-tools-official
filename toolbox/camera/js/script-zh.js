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
let perfStart = performance.now();

// 权限请求弹窗
function showPermissionRequestModal() {
    return new Promise((resolve) => {
        // 创建弹窗遮罩
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'permission-modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;

        // 创建弹窗内容
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;

        // 弹窗标题
        const title = document.createElement('h2');
        title.textContent = '摄像头权限请求';
        title.style.cssText = `
            color: var(--text-main);
            margin-top: 0;
            margin-bottom: 20px;
            font-weight: 300;
        `;

        // 弹窗描述
        const description = document.createElement('p');
        description.textContent = '摄像头测试工具需要访问您的摄像头设备来检测性能参数。请确认是否允许访问？';
        description.style.cssText = `
            color: var(--text-main);
            line-height: 1.6;
            margin-bottom: 30px;
            font-size: 16px;
        `;

        // 注意事项
        const notice = document.createElement('div');
        notice.style.cssText = `
            background: rgba(76, 175, 80, 0.1);
            border-left: 3px solid #4CAF50;
            padding: 12px 15px;
            border-radius: 6px;
            margin-bottom: 30px;
            text-align: left;
        `;
        
        const noticeIcon = document.createElement('i');
        noticeIcon.className = 'fas fa-info-circle';
        noticeIcon.style.cssText = 'color: #4CAF50; margin-right: 8px;';
        
        const noticeText = document.createElement('span');
        noticeText.textContent = '我们保证：所有数据仅在本地处理，不会上传到任何服务器。';
        noticeText.style.cssText = 'color: #b0b0b0; font-size: 14px;';
        
        notice.appendChild(noticeIcon);
        notice.appendChild(noticeText);

        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        `;

        // 允许按钮
        const allowButton = document.createElement('button');
        allowButton.textContent = '允许访问';
        allowButton.style.cssText = `
            padding: 12px 30px;
            border-radius: 6px;
            border: none;
            background: var(--accent);
            color: white;
            font-weight: 600;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.2s;
            flex: 1;
            min-width: 140px;
        `;
        allowButton.onmouseover = () => allowButton.style.background = 'var(--accent-hover)';
        allowButton.onmouseout = () => allowButton.style.background = 'var(--accent)';
        allowButton.onclick = () => {
            modalOverlay.remove();
            resolve(true);
        };

        // 拒绝按钮
        const denyButton = document.createElement('button');
        denyButton.textContent = '拒绝访问';
        denyButton.style.cssText = `
            padding: 12px 30px;
            border-radius: 6px;
            border: 1px solid var(--border);
            background: transparent;
            color: var(--text-muted);
            font-weight: 600;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.2s;
            flex: 1;
            min-width: 140px;
        `;
        denyButton.onmouseover = () => {
            denyButton.style.background = 'rgba(239, 68, 68, 0.1)';
            denyButton.style.color = 'var(--danger)';
            denyButton.style.borderColor = 'var(--danger)';
        };
        denyButton.onmouseout = () => {
            denyButton.style.background = 'transparent';
            denyButton.style.color = 'var(--text-muted)';
            denyButton.style.borderColor = 'var(--border)';
        };
        denyButton.onclick = () => {
            modalOverlay.remove();
            resolve(false);
        };

        // 组装弹窗
        buttonContainer.appendChild(allowButton);
        buttonContainer.appendChild(denyButton);
        
        modalContent.appendChild(title);
        modalContent.appendChild(description);
        modalContent.appendChild(notice);
        modalContent.appendChild(buttonContainer);
        modalOverlay.appendChild(modalContent);
        
        // 添加到页面
        document.body.appendChild(modalOverlay);
        
        // ESC键关闭弹窗
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.remove();
                document.removeEventListener('keydown', escHandler);
                resolve(false);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

/**
 * 新的启动流程：先请求用户确认，再启动摄像头
 */
async function initCameraTool() {
    try {
        // 性能监控开始
        perfStart = performance.now();
        
        // 步骤 1: 显示权限请求弹窗
        statusText.textContent = '等待用户确认...';
        updateStatus('loading');
        
        const userConfirmed = await showPermissionRequestModal();
        
        if (!userConfirmed) {
            // 用户拒绝，跳转到主页
            statusText.textContent = '用户拒绝访问权限';
            updateStatus('error');
            
            // 延迟跳转，让用户看到状态变化
            setTimeout(() => {
                window.location.href = '/toolbox/main/';
            }, 1000);
            return;
        }
        
        // 用户同意，继续原来的流程
        statusText.textContent = '请求权限中...';
        
        // 步骤 2: 请求摄像头权限
        const initialStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        // 步骤 3: 权限通过后，枚举所有设备
        const currentVideoId = initialStream.getVideoTracks()[0].getSettings().deviceId;
        await populateDeviceList(currentVideoId);

        // 步骤 4: 关闭初始流，使用选择的第一个设备开始正式显示
        initialStream.getTracks().forEach(track => track.stop());
        
        // videoSelect 的值已在 populateDeviceList 中设置
        await startStream();
        
        // 记录性能
        logPerformance();

    } catch (error) {
        console.error("Camera tool initialization failed:", error);
        handleError(error);
    }
}

// 填充设备列表（保持不变）
async function populateDeviceList(activeVideoId) {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        videoSelect.innerHTML = '';
        let videoFound = false;
        let videoCount = 0;

        devices.forEach(device => {
            if (device.kind === 'videoinput') {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `摄像头 ${++videoCount}`;
                videoSelect.appendChild(option);
                
                if (device.deviceId === activeVideoId) {
                    option.selected = true;
                    videoFound = true;
                }
            }
        });

        if (videoSelect.options.length > 0) {
            if (!videoFound) {
                videoSelect.options[0].selected = true;
            }
            videoSelect.disabled = false;
        } else {
            const option = document.createElement('option');
            option.text = '未检测到摄像头';
            videoSelect.appendChild(option);
            videoSelect.disabled = true;
        }
        
        // 触发change事件以更新aria-label
        videoSelect.dispatchEvent(new Event('change'));
        
    } catch (error) {
        console.error("Error enumerating devices:", error);
        const option = document.createElement('option');
        option.text = '设备枚举失败';
        videoSelect.innerHTML = '';
        videoSelect.appendChild(option);
        videoSelect.disabled = true;
    }
}

// 启动指定的流（保持不变）
async function startStream() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    const videoId = videoSelect.value;

    const constraints = {
        video: {
            deviceId: videoId ? { exact: videoId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
        }
    };

    try {
        updateStatus('loading');
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        videoElement.srcObject = stream;
        
        // 设置视频元素的aria-label
        const track = stream.getVideoTracks()[0];
        videoElement.setAttribute('aria-label', track.label || '摄像头视频流');
        
        updateStatus('active');
        statusText.textContent = '正常运行';
        statusText.style.color = "#10b981";

        const videoTrack = stream.getVideoTracks()[0];
        analyzeVideoTrack(videoTrack);

        // 开始性能监控循环
        if (!animationFrameId) {
            requestAnimationFrame(updateStats);
        }

        // 发送成功事件到分析
        trackPerformanceEvent('camera_stream_started', 'success');

    } catch (error) {
        console.error('Error starting specific stream:', error);
        updateStatus('error');
        statusText.textContent = '启动失败: ' + (error.name || 'Unknown');
        
        // 发送错误事件到分析
        trackPerformanceEvent('camera_stream_error', 'error', error.name);
        
        throw error;
    }
}

// 分析硬件参数（保持不变）
function analyzeVideoTrack(track) {
    const settings = track.getSettings();
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};

    deviceLabel.textContent = track.label || '未知设备';
    deviceLabel.setAttribute('title', track.label || '未知设备');
    
    let capHtml = '';
    
    if (capabilities.width) {
        capHtml += `<tr><td>分辨率范围</td><td>${capabilities.width.min} - ${capabilities.width.max}px</td></tr>`;
    }
    
    if (capabilities.height) {
        capHtml += `<tr><td>高度范围</td><td>${capabilities.height.min} - ${capabilities.height.max}px</td></tr>`;
    }
    
    if (capabilities.frameRate) {
        capHtml += `<tr><td>FPS 范围</td><td>${capabilities.frameRate.min} - ${capabilities.frameRate.max}</td></tr>`;
    }
    
    if (capabilities.aspectRatio) {
        capHtml += `<tr><td>支持比例</td><td>${capabilities.aspectRatio.min.toFixed(2)} - ${capabilities.aspectRatio.max.toFixed(2)}</td></tr>`;
    }
    
    if (settings.groupId) {
        capHtml += `<tr><td>Group ID</td><td title="${settings.groupId}">${settings.groupId.substr(0, 8)}...</td></tr>`;
    }
    
    const features = ['zoom', 'focusMode', 'whiteBalanceMode', 'exposureMode', 'exposureCompensation'];
    let featureList = [];
    features.forEach(f => { 
        if (f in capabilities) featureList.push(f); 
    });
    
    if (featureList.length > 0) {
        capHtml += `<tr><td>支持特性</td><td>${featureList.join(', ')}</td></tr>`;
    }
    
    // 添加当前设置信息
    if (settings.width && settings.height) {
        capHtml += `<tr><td>当前分辨率</td><td>${settings.width}×${settings.height}</td></tr>`;
    }
    
    if (settings.frameRate) {
        capHtml += `<tr><td>当前帧率</td><td>${settings.frameRate} fps</td></tr>`;
    }

    capTable.innerHTML = capHtml || `<tr><td colspan="2">无法获取详细驱动信息</td></tr>`;
}

// 实时统计循环（保持不变）
let animationFrameId = null;
function updateStats(timestamp) {
    if (!currentStream || !currentStream.active) {
        animationFrameId = requestAnimationFrame(updateStats);
        return;
    }

    if (videoElement.videoWidth && videoElement.videoHeight) {
        const w = videoElement.videoWidth;
        const h = videoElement.videoHeight;
        liveRes.textContent = `${w}×${h}`;
        infoRes.textContent = `${w} × ${h}`;
        infoAspect.textContent = (w/h).toFixed(2);
        
        // 更新视频元素尺寸属性
        videoElement.setAttribute('width', w);
        videoElement.setAttribute('height', h);
    }

    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        const fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        liveFps.textContent = fps;
        lastFpsUpdate = timestamp;
        frameCount = 0;
        
        // 帧率监控
        if (fps < 15) {
            liveFps.style.color = 'var(--danger)';
        } else if (fps < 24) {
            liveFps.style.color = '#ff9800';
        } else {
            liveFps.style.color = 'var(--success)';
        }
    }

    animationFrameId = requestAnimationFrame(updateStats);
}

// 更新状态指示器（保持不变）
function updateStatus(state) {
    statusHeader.className = '';
    statusHeader.classList.add(state);
    
    switch(state) {
        case 'loading':
            statusHeader.classList.add('loading');
            break;
        case 'active':
            statusHeader.classList.add('active');
            break;
        case 'error':
            statusHeader.classList.add('error');
            break;
    }
}

// 错误处理（保持不变）
function handleError(error) {
    console.error("Camera error:", error);
    updateStatus('error');
    
    let errorMessage = '未知错误';
    if (error.name === 'NotAllowedError') {
        errorMessage = '用户拒绝了摄像头权限';
    } else if (error.name === 'NotFoundError') {
        errorMessage = '未找到摄像头设备';
    } else if (error.name === 'NotReadableError') {
        errorMessage = '摄像头正被其他应用占用';
    } else if (error.name === 'OverconstrainedError') {
        errorMessage = '无法满足摄像头参数要求';
    } else if (error.name === 'SecurityError') {
        errorMessage = '需要在HTTPS或localhost环境下使用';
    } else {
        errorMessage = error.message || error.name;
    }
    
    statusText.textContent = '错误: ' + errorMessage;
    statusText.style.color = "#ef4444";
    
    // 显示用户友好的提示
    if (window.confirm('摄像头访问失败：' + errorMessage + '\n\n是否查看帮助文档？')) {
        window.open('/toolbox/camera/guide/#troubleshooting', '_blank');
    }
}

// 性能监控（保持不变）
function logPerformance() {
    const perfEnd = performance.now();
    const loadTime = Math.round(perfEnd - perfStart);
    
    console.log(`摄像头测试工具加载完成，耗时: ${loadTime}ms`);
    
    // 发送性能数据到分析
    trackPerformanceEvent('page_load_complete', 'timing', loadTime);
}

function trackPerformanceEvent(eventName, category, value = null) {
    // 如果存在Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
            'event_category': category,
            'event_label': 'camera_test_tool',
            'value': value
        });
    }
    
    // 自定义性能跟踪
    const perfData = {
        event: eventName,
        category: category,
        value: value,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        language: navigator.language
    };
    
    // 可以发送到自己的分析服务
    // sendToAnalytics(perfData);
}

// 清理资源（保持不变）
function cleanup() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    if (videoElement.srcObject) {
        videoElement.srcObject = null;
    }
    
    updateStatus('inactive');
    statusText.textContent = '已停止';
    statusText.style.color = "var(--text-muted)";
}

// 事件监听器（保持不变）
videoSelect.onchange = () => {
    statusText.textContent = '切换中...';
    updateStatus('loading');
    
    // 发送切换事件到分析
    trackPerformanceEvent('camera_switch', 'user_action');
    
    startStream().catch(error => {
        console.error('Stream switch failed:', error);
        handleError(error);
    });
};

document.getElementById('btn-mirror').onclick = () => {
    videoElement.classList.toggle('no-mirror');
    const isMirrored = !videoElement.classList.contains('no-mirror');
    
    // 发送镜像切换事件到分析
    trackPerformanceEvent('mirror_toggle', 'user_action', isMirrored);
    
    // 更新按钮文本
    const btn = document.getElementById('btn-mirror');
    btn.textContent = isMirrored ? '镜像翻转' : '取消镜像';
};

// 页面可见性变化处理（保持不变）
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 页面隐藏时停止动画帧以节省资源
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } else {
        // 页面重新显示时恢复
        if (currentStream && currentStream.active) {
            animationFrameId = requestAnimationFrame(updateStats);
        }
    }
});

// 页面卸载前清理（保持不变）
window.addEventListener('beforeunload', () => {
    cleanup();
    trackPerformanceEvent('page_unload', 'session');
});

// 页面加载完毕执行新的初始化流程
window.addEventListener('load', () => {
    // 检查是否支持getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('您的浏览器不支持摄像头访问功能，请使用Chrome、Firefox、Edge或Safari等现代浏览器。');
        return;
    }
    
    // 检查是否在HTTPS环境下（生产环境要求）
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn('摄像头功能在非HTTPS环境下可能受限');
    }
    
    // 使用新的初始化流程，显示权限请求弹窗
    initCameraTool();
});

// 错误全局捕获（保持不变）
window.addEventListener('error', function(e) {
    console.error('摄像头工具全局错误:', e.error);
    
    // 发送错误到分析
    trackPerformanceEvent('global_error', 'error', e.message);
    
    // 避免错误冒泡到控制台
    e.preventDefault();
});

// 未处理的Promise拒绝（保持不变）
window.addEventListener('unhandledrejection', function(e) {
    console.error('未处理的Promise拒绝:', e.reason);
    
    // 发送错误到分析
    trackPerformanceEvent('unhandled_promise', 'error', e.reason?.message || 'Unknown');
    
    e.preventDefault();
});

// 导出函数供测试使用（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initCameraTool,
        startStream,
        cleanup,
        updateStats
    };
}