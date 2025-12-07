// DOM元素
const cameraFeed = document.getElementById('cameraFeed');
const cameraOverlay = document.getElementById('cameraOverlay');
const startCameraBtn = document.getElementById('startCamera');
const stopCameraBtn = document.getElementById('stopCamera');
const startTestBtn = document.getElementById('startTest');
const stopTestBtn = document.getElementById('stopTest');
const viewDetailsBtn = document.getElementById('viewDetails');
const exportDataBtn = document.getElementById('exportData');
const copyResultsBtn = document.getElementById('copyResults');
const saveSettingsBtn = document.getElementById('saveSettings');
const testProgress = document.getElementById('testProgress');
const testStatus = document.getElementById('testStatus');
const reportLoading = document.getElementById('reportLoading');
const parameterGrid = document.getElementById('parameterGrid');
const staticInfoGrid = document.getElementById('staticInfoGrid');
const detailsModal = document.getElementById('detailsModal');
const closeModal = document.querySelector('.close-modal');
const detailedData = document.getElementById('detailedData');
const autoModeIndicator = document.getElementById('autoModeIndicator');

// 摄像头和测试状态变量
let stream = null;
let isTesting = false;
let testInterval = null;
let frameCount = 0;
let startTime = 0;
let selectedCameraId = null;
let cameras = [];
let cameraSettings = {};
let isAutoMode = true;

// 测试数据
let testData = {
    resolution: { value: 'N/A', unit: '', status: 'unknown' },
    frameRate: { value: 'N/A', unit: 'fps', status: 'unknown' },
    latency: { value: 'N/A', unit: 'ms', status: 'unknown' },
    colorAccuracy: { value: 'N/A', unit: '%', status: 'unknown' },
    lowLightPerformance: { value: 'N/A', unit: 'dB', status: 'unknown' },
    dynamicRange: { value: 'N/A', unit: 'stops', status: 'unknown' },
    sharpness: { value: 'N/A', unit: 'LW/PH', status: 'unknown' },
    distortion: { value: 'N/A', unit: '%', status: 'unknown' }
};

// 静态参数数据
let staticData = {
    deviceId: { value: 'N/A', unit: '', icon: 'fas fa-microchip' },
    deviceLabel: { value: 'N/A', unit: '', icon: 'fas fa-tag' },
    groupId: { value: 'N/A', unit: '', icon: 'fas fa-layer-group' },
    aspectRatio: { value: 'N/A', unit: '', icon: 'fas fa-expand' },
    facingMode: { value: 'N/A', unit: '', icon: 'fas fa-directions' },
    frameRateRange: { value: 'N/A', unit: 'fps', icon: 'fas fa-film' },
    resolutionRange: { value: 'N/A', unit: '', icon: 'fas fa-ruler-combined' },
    whiteBalanceModes: { value: 'N/A', unit: '', icon: 'fas fa-sun' },
    exposureModes: { value: 'N/A', unit: '', icon: 'fas fa-lightbulb' },
    focusModes: { value: 'N/A', unit: '', icon: 'fas fa-search' },
    zoomRange: { value: 'N/A', unit: 'x', icon: 'fas fa-search-plus' }
};

// 性能图表
let performanceChart = null;
let chartData = {
    labels: [],
    datasets: [
        {
            label: '帧率 (fps)',
            data: [],
            borderColor: '#4a9eff',
            backgroundColor: 'rgba(74, 158, 255, 0.1)',
            fill: true,
            tension: 0.4
        },
        {
            label: '延迟 (ms)',
            data: [],
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y1'
        }
    ]
};

// 初始化图表
function initChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b0bec5'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '帧率 (fps)',
                        color: '#b0bec5'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b0bec5'
                    },
                    min: 0,
                    max: 60
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '延迟 (ms)',
                        color: '#b0bec5'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        color: '#b0bec5'
                    },
                    min: 0,
                    max: 200
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#b0bec5'
                    }
                }
            }
        }
    });
}

// 初始化参数显示
function initParameterGrid() {
    const parameters = [
        { id: 'resolution', name: '分辨率', icon: 'fas fa-expand-arrows-alt' },
        { id: 'frameRate', name: '帧率', icon: 'fas fa-film' },
        { id: 'latency', name: '延迟', icon: 'fas fa-clock' },
        { id: 'colorAccuracy', name: '色彩准确度', icon: 'fas fa-palette' },
        { id: 'lowLightPerformance', name: '低光性能', icon: 'fas fa-moon' },
        { id: 'dynamicRange', name: '动态范围', icon: 'fas fa-sun' },
        { id: 'sharpness', name: '锐度', icon: 'fas fa-search' },
        { id: 'distortion', name: '畸变', icon: 'fas fa-circle-notch' }
    ];
    
    parameterGrid.innerHTML = '';
    
    parameters.forEach(param => {
        const paramData = testData[param.id];
        let statusClass = 'status-unknown';
        if (paramData.status === 'good') statusClass = 'status-good';
        else if (paramData.status === 'average') statusClass = 'status-average';
        else if (paramData.status === 'poor') statusClass = 'status-poor';
        
        const card = document.createElement('div');
        card.className = 'parameter-card';
        card.innerHTML = `
            <div class="parameter-name">
                <i class="${param.icon}"></i> ${param.name}
            </div>
            <div class="parameter-value">
                ${paramData.value} <span class="parameter-unit">${paramData.unit}</span>
            </div>
            <div class="parameter-status ${statusClass}" id="${param.id}Status">
                ${paramData.status === 'good' ? '优秀' : 
                  paramData.status === 'average' ? '一般' : 
                  paramData.status === 'poor' ? '较差' : '未测试'}
            </div>
        `;
        parameterGrid.appendChild(card);
    });
}

// 初始化静态参数显示
function initStaticInfoGrid() {
    const staticParameters = [
        { id: 'deviceLabel', name: '设备名称', icon: 'fas fa-tag' },
        { id: 'deviceId', name: '设备ID', icon: 'fas fa-microchip' },
        { id: 'groupId', name: '设备组ID', icon: 'fas fa-layer-group' },
        { id: 'aspectRatio', name: '画面比例', icon: 'fas fa-expand' },
        { id: 'facingMode', name: '摄像头朝向', icon: 'fas fa-directions' },
        { id: 'frameRateRange', name: '帧率范围', icon: 'fas fa-film' },
        { id: 'resolutionRange', name: '分辨率范围', icon: 'fas fa-ruler-combined' },
        { id: 'whiteBalanceModes', name: '白平衡模式', icon: 'fas fa-sun' },
        { id: 'exposureModes', name: '曝光模式', icon: 'fas fa-lightbulb' },
        { id: 'focusModes', name: '对焦模式', icon: 'fas fa-search' },
        { id: 'zoomRange', name: '变焦范围', icon: 'fas fa-search-plus' }
    ];
    
    staticInfoGrid.innerHTML = '';
    
    // 如果没有摄像头信息，显示占位符
    if (staticData.deviceId.value === 'N/A') {
        const placeholder = document.createElement('div');
        placeholder.className = 'static-info-placeholder';
        placeholder.innerHTML = `
            <i class="fas fa-camera-slash"></i>
            <p>启动摄像头后，将显示设备的静态参数信息</p>
        `;
        staticInfoGrid.appendChild(placeholder);
        return;
    }
    
    // 显示静态参数卡片
    staticParameters.forEach(param => {
        const paramData = staticData[param.id];
        if (paramData.value === 'N/A') return; // 跳过没有数据的参数
        
        const card = document.createElement('div');
        card.className = 'static-info-card';
        card.innerHTML = `
            <div class="static-info-name">
                <i class="${paramData.icon}"></i> ${param.name}
            </div>
            <div class="static-info-value">
                ${paramData.value} <span class="static-info-unit">${paramData.unit}</span>
            </div>
        `;
        staticInfoGrid.appendChild(card);
    });
}

// 显示通知
function showNotification(message, type = 'success') {
    // 移除现有的通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建新通知
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'fas fa-check-circle';
    if (type === 'error') icon = 'fas fa-exclamation-circle';
    if (type === 'info') icon = 'fas fa-info-circle';
    
    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 3秒后隐藏并移除通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// 获取摄像头列表
async function getCameraDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
        console.error('获取摄像头设备列表失败:', error);
        return [];
    }
}

// 创建摄像头选择器
function createCameraSelector(cameras) {
    // 检查是否已存在选择器
    let selectorContainer = document.querySelector('.camera-selector');
    if (selectorContainer) {
        selectorContainer.remove();
    }
    
    // 如果只有一个摄像头，不显示选择器
    if (cameras.length <= 1) return;
    
    // 创建选择器容器
    selectorContainer = document.createElement('div');
    selectorContainer.className = 'camera-selector';
    
    // 创建标题
    const title = document.createElement('div');
    title.className = 'camera-selector-title';
    title.innerHTML = '<i class="fas fa-exchange-alt"></i> 选择摄像头';
    selectorContainer.appendChild(title);
    
    // 创建选择框
    const select = document.createElement('select');
    select.id = 'cameraSelect';
    
    // 添加选项
    cameras.forEach((camera, index) => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        option.textContent = camera.label || `摄像头 ${index + 1}`;
        if (camera.deviceId === selectedCameraId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    selectorContainer.appendChild(select);
    
    // 添加到摄像头预览卡片
    const cameraCard = document.querySelector('.card');
    cameraCard.appendChild(selectorContainer);
    
    // 添加事件监听器
    select.addEventListener('change', async () => {
        selectedCameraId = select.value;
        showNotification('正在切换摄像头...', 'info');
        await stopCamera();
        await startCamera();
    });
}

// 启动摄像头
async function startCamera() {
    try {
        cameraOverlay.innerHTML = '<span>正在访问摄像头...</span>';
        
        // 获取摄像头设备列表
        cameras = await getCameraDevices();
        if (cameras.length === 0) {
            throw new Error('未检测到摄像头设备');
        }
        
        // 如果没有选择摄像头，使用第一个
        if (!selectedCameraId && cameras.length > 0) {
            selectedCameraId = cameras[0].deviceId;
        }
        
        // 创建摄像头选择器
        createCameraSelector(cameras);
        
        // 配置摄像头参数
        const constraints = { 
            video: { 
                deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 60 }
            }, 
            audio: false 
        };
        
        // 获取摄像头流
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // 显示视频流
        cameraFeed.srcObject = stream;
        cameraOverlay.style.display = 'none';
        
        // 更新按钮状态
        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;
        startTestBtn.disabled = false;
        
        // 获取摄像头信息和能力
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        
        // 更新测试数据中的分辨率
        testData.resolution.value = `${settings.width} × ${settings.height}`;
        testData.resolution.status = 'good';
        updateParameterDisplay();
        
        // 更新静态参数数据
        updateStaticData(settings, capabilities, videoTrack);
        
        // 如果是自动模式，显示自动模式指示器并启动自动测试
        if (isAutoMode) {
            autoModeIndicator.style.display = 'inline-block';
            testStatus.textContent = '摄像头已启动，3秒后开始自动性能测试...';
            
            // 3秒后自动开始测试
            setTimeout(() => {
                startTest();
            }, 3000);
        } else {
            autoModeIndicator.style.display = 'none';
            testStatus.textContent = '摄像头已启动，点击"开始性能测试"按钮进行检测';
        }
        
        showNotification('摄像头启动成功');
        
    } catch (error) {
        console.error('摄像头访问错误:', error);
        cameraOverlay.innerHTML = `<span style="color:#ff6b6b">摄像头访问失败: ${error.message}</span>`;
        showNotification(`摄像头访问失败: ${error.message}`, 'error');
        
        // 如果是自动模式，显示错误后尝试重新启动
        if (isAutoMode) {
            setTimeout(() => {
                testStatus.textContent = '尝试重新启动摄像头...';
                startCamera();
            }, 5000);
        }
    }
}

// 更新静态参数数据
function updateStaticData(settings, capabilities, videoTrack) {
    // 获取设备信息
    const camera = cameras.find(c => c.deviceId === selectedCameraId);
    
    // 更新静态参数
    staticData.deviceId.value = selectedCameraId.substring(0, 20) + '...';
    staticData.deviceLabel.value = camera ? camera.label || '未知设备' : '未知设备';
    staticData.groupId.value = camera ? camera.groupId.substring(0, 20) + '...' : 'N/A';
    
    // 画面比例
    if (settings.width && settings.height) {
        const ratio = settings.width / settings.height;
        staticData.aspectRatio.value = ratio.toFixed(2) + ':1';
    }
    
    // 摄像头朝向
    if (settings.facingMode) {
        staticData.facingMode.value = settings.facingMode === 'user' ? '前置摄像头' : 
                                     settings.facingMode === 'environment' ? '后置摄像头' : 
                                     settings.facingMode;
    }
    
    // 帧率范围
    if (capabilities.frameRate && capabilities.frameRate.max) {
        staticData.frameRateRange.value = `${capabilities.frameRate.min || 0}-${capabilities.frameRate.max}`;
    } else if (settings.frameRate) {
        staticData.frameRateRange.value = `${settings.frameRate}`;
    }
    
    // 分辨率范围
    if (capabilities.width && capabilities.height) {
        staticData.resolutionRange.value = `${capabilities.width.min || 0}×${capabilities.height.min || 0} 到 ${capabilities.width.max || 0}×${capabilities.height.max || 0}`;
    }
    
    // 白平衡模式
    if (capabilities.whiteBalanceMode) {
        staticData.whiteBalanceModes.value = Array.isArray(capabilities.whiteBalanceMode) ? 
            capabilities.whiteBalanceMode.join(', ') : 'N/A';
    }
    
    // 曝光模式
    if (capabilities.exposureMode) {
        staticData.exposureModes.value = Array.isArray(capabilities.exposureMode) ? 
            capabilities.exposureMode.join(', ') : 'N/A';
    }
    
    // 对焦模式
    if (capabilities.focusMode) {
        staticData.focusModes.value = Array.isArray(capabilities.focusMode) ? 
            capabilities.focusMode.join(', ') : 'N/A';
    }
    
    // 变焦范围
    if (capabilities.zoom && capabilities.zoom.max) {
        staticData.zoomRange.value = `${capabilities.zoom.min || 1}-${capabilities.zoom.max}x`;
    }
    
    // 更新静态参数显示
    initStaticInfoGrid();
}

// 停止摄像头
function stopCamera() {
    if (stream) {
        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        
        // 清除视频源
        cameraFeed.srcObject = null;
        cameraOverlay.style.display = 'flex';
        cameraOverlay.innerHTML = '<span>摄像头已停止，点击"启动摄像头"重新开始</span>';
        
        // 更新按钮状态
        startCameraBtn.disabled = false;
        stopCameraBtn.disabled = true;
        startTestBtn.disabled = true;
        stopTestBtn.disabled = true;
        
        // 停止测试（如果正在进行）
        if (isTesting) {
            stopTest();
        }
        
        // 更新状态
        testStatus.textContent = '摄像头已停止';
        autoModeIndicator.style.display = 'none';
        
        // 重置静态参数显示
        Object.keys(staticData).forEach(key => {
            staticData[key].value = 'N/A';
        });
        initStaticInfoGrid();
        
        // 移除摄像头选择器
        const selectorContainer = document.querySelector('.camera-selector');
        if (selectorContainer) {
            selectorContainer.remove();
        }
        
        showNotification('摄像头已停止');
    }
}

// 开始性能测试
function startTest() {
    if (!stream || isTesting) return;
    
    isTesting = true;
    frameCount = 0;
    startTime = Date.now();
    
    // 更新按钮状态
    startTestBtn.disabled = true;
    stopTestBtn.disabled = false;
    viewDetailsBtn.disabled = true;
    exportDataBtn.disabled = true;
    copyResultsBtn.disabled = true;
    
    // 重置测试数据
    chartData.labels = [];
    chartData.datasets[0].data = [];
    chartData.datasets[1].data = [];
    
    // 更新图表
    if (performanceChart) {
        performanceChart.update();
    }
    
    // 重置进度条
    testProgress.style.width = '0%';
    
    // 开始测试循环
    testInterval = setInterval(runTestCycle, 1000);
    
    // 更新状态
    testStatus.textContent = '性能测试进行中...';
    
    if (!isAutoMode) {
        showNotification('性能测试已开始', 'info');
    }
}

// 运行测试周期
function runTestCycle() {
    if (!isTesting) return;
    
    // 计算帧率
    const currentTime = Date.now();
    const elapsedTime = (currentTime - startTime) / 1000; // 转换为秒
    const fps = Math.round((frameCount / elapsedTime) * 10) / 10;
    
    // 模拟其他测试数据（在实际应用中，这些数据需要通过算法计算）
    const latency = Math.floor(Math.random() * 100) + 50; // 模拟延迟
    const colorAccuracy = Math.floor(Math.random() * 20) + 80; // 模拟色彩准确度
    const lowLightPerformance = Math.floor(Math.random() * 30) + 10; // 模拟低光性能
    const dynamicRange = (Math.random() * 4 + 8).toFixed(1); // 模拟动态范围
    const sharpness = Math.floor(Math.random() * 1000) + 500; // 模拟锐度
    const distortion = (Math.random() * 2).toFixed(1); // 模拟畸变
    
    // 更新测试数据
    testData.frameRate.value = fps;
    testData.frameRate.status = fps >= 30 ? 'good' : (fps >= 15 ? 'average' : 'poor');
    
    testData.latency.value = latency;
    testData.latency.status = latency <= 80 ? 'good' : (latency <= 120 ? 'average' : 'poor');
    
    testData.colorAccuracy.value = colorAccuracy;
    testData.colorAccuracy.status = colorAccuracy >= 90 ? 'good' : (colorAccuracy >= 80 ? 'average' : 'poor');
    
    testData.lowLightPerformance.value = lowLightPerformance;
    testData.lowLightPerformance.status = lowLightPerformance >= 30 ? 'good' : (lowLightPerformance >= 15 ? 'average' : 'poor');
    
    testData.dynamicRange.value = dynamicRange;
    testData.dynamicRange.status = parseFloat(dynamicRange) >= 10 ? 'good' : (parseFloat(dynamicRange) >= 8 ? 'average' : 'poor');
    
    testData.sharpness.value = sharpness;
    testData.sharpness.status = sharpness >= 1200 ? 'good' : (sharpness >= 800 ? 'average' : 'poor');
    
    testData.distortion.value = distortion;
    testData.distortion.status = parseFloat(distortion) <= 0.5 ? 'good' : (parseFloat(distortion) <= 1.5 ? 'average' : 'poor');
    
    // 更新图表数据
    const timeLabel = `${Math.floor(elapsedTime)}s`;
    
    if (chartData.labels.length >= 15) {
        chartData.labels.shift();
        chartData.datasets[0].data.shift();
        chartData.datasets[1].data.shift();
    }
    
    chartData.labels.push(timeLabel);
    chartData.datasets[0].data.push(fps);
    chartData.datasets[1].data.push(latency);
    
    // 更新图表
    if (performanceChart) {
        performanceChart.update();
    }
    
    // 更新参数显示
    updateParameterDisplay();
    
    // 更新进度条
    const progress = Math.min(100, Math.floor(elapsedTime / 30 * 100));
    testProgress.style.width = `${progress}%`;
    
    // 如果测试完成（30秒）
    if (elapsedTime >= 30) {
        stopTest();
        testStatus.textContent = '性能测试完成！';
        autoModeIndicator.style.display = 'none';
        viewDetailsBtn.disabled = false;
        exportDataBtn.disabled = false;
        copyResultsBtn.disabled = false;
        saveSettingsBtn.disabled = false;
        
        if (!isAutoMode) {
            showNotification('性能测试完成！');
        }
    }
    
    // 重置帧计数（每秒）
    frameCount = 0;
}

// 停止测试
function stopTest() {
    isTesting = false;
    
    if (testInterval) {
        clearInterval(testInterval);
        testInterval = null;
    }
    
    // 更新按钮状态
    startTestBtn.disabled = false;
    stopTestBtn.disabled = true;
    viewDetailsBtn.disabled = false;
    exportDataBtn.disabled = false;
    copyResultsBtn.disabled = false;
    saveSettingsBtn.disabled = false;
    
    // 更新状态
    if (testStatus.textContent !== '性能测试完成！') {
        testStatus.textContent = '性能测试已停止';
        if (!isAutoMode) {
            showNotification('性能测试已停止', 'info');
        }
    }
}

// 更新参数显示
function updateParameterDisplay() {
    // 更新所有参数卡片
    for (const [key, data] of Object.entries(testData)) {
        const statusElement = document.getElementById(`${key}Status`);
        if (statusElement) {
            let statusText = '未测试';
            let statusClass = 'status-unknown';
            
            if (data.status === 'good') {
                statusText = '优秀';
                statusClass = 'status-good';
            } else if (data.status === 'average') {
                statusText = '一般';
                statusClass = 'status-average';
            } else if (data.status === 'poor') {
                statusText = '较差';
                statusClass = 'status-poor';
            }
            
            statusElement.textContent = statusText;
            statusElement.className = `parameter-status ${statusClass}`;
            
            // 更新值显示
            const valueElement = statusElement.parentElement.querySelector('.parameter-value');
            if (valueElement) {
                valueElement.innerHTML = `${data.value} <span class="parameter-unit">${data.unit}</span>`;
            }
        }
    }
}

// 获取状态文本
function getStatusText(status) {
    if (status === 'good') return '优秀';
    if (status === 'average') return '一般';
    if (status === 'poor') return '较差';
    return '未测试';
}

// 查看详细数据
function viewDetails() {
    let detailsHTML = '<h3>完整测试报告</h3>';
    
    // 添加测试信息
    detailsHTML += '<div class="report-section">';
    detailsHTML += '<h4>测试信息</h4>';
    detailsHTML += `<p><strong>测试时间:</strong> ${new Date().toLocaleString()}</p>`;
    detailsHTML += `<p><strong>设备信息:</strong> ${navigator.userAgent.split(')')[0].split('(')[1] || '未知设备'}</p>`;
    detailsHTML += `<p><strong>摄像头名称:</strong> ${staticData.deviceLabel.value}</p>`;
    detailsHTML += '</div>';
    
    // 添加静态参数表格
    detailsHTML += '<div class="report-section">';
    detailsHTML += '<h4>摄像头静态参数</h4>';
    detailsHTML += '<table style="width:100%; border-collapse:collapse; margin-top:10px;">';
    detailsHTML += '<tr style="background-color:#2c3e50; color:white;">';
    detailsHTML += '<th style="padding:10px; text-align:left;">参数</th>';
    detailsHTML += '<th style="padding:10px; text-align:left;">数值</th>';
    detailsHTML += '</tr>';
    
    let rowColor = true;
    for (const [key, data] of Object.entries(staticData)) {
        if (data.value === 'N/A') continue;
        
        const paramNames = {
            deviceId: '设备ID',
            deviceLabel: '设备名称',
            groupId: '设备组ID',
            aspectRatio: '画面比例',
            facingMode: '摄像头朝向',
            frameRateRange: '帧率范围',
            resolutionRange: '分辨率范围',
            whiteBalanceModes: '白平衡模式',
            exposureModes: '曝光模式',
            focusModes: '对焦模式',
            zoomRange: '变焦范围'
        };
        
        const bgColor = rowColor ? '#34495e' : '#2c3e50';
        
        detailsHTML += `<tr style="background-color:${bgColor}">`;
        detailsHTML += `<td style="padding:10px; border:1px solid #3a506b;">${paramNames[key] || key}</td>`;
        detailsHTML += `<td style="padding:10px; border:1px solid #3a506b;">${data.value} ${data.unit}</td>`;
        detailsHTML += '</tr>';
        
        rowColor = !rowColor;
    }
    
    detailsHTML += '</table>';
    detailsHTML += '</div>';
    
    // 添加性能测试结果表格
    detailsHTML += '<div class="report-section">';
    detailsHTML += '<h4>性能测试结果</h4>';
    detailsHTML += '<table style="width:100%; border-collapse:collapse; margin-top:10px;">';
    detailsHTML += '<tr style="background-color:#2c3e50; color:white;">';
    detailsHTML += '<th style="padding:10px; text-align:left;">参数</th>';
    detailsHTML += '<th style="padding:10px; text-align:left;">数值</th>';
    detailsHTML += '<th style="padding:10px; text-align:left;">状态</th>';
    detailsHTML += '<th style="padding:10px; text-align:left;">说明</th>';
    detailsHTML += '</tr>';
    
    const parameterDetails = {
        resolution: { description: '摄像头支持的最大分辨率' },
        frameRate: { description: '每秒传输帧数，越高越流畅' },
        latency: { description: '图像捕获到显示的延迟时间' },
        colorAccuracy: { description: '色彩还原准确度，越高越真实' },
        lowLightPerformance: { description: '低光照条件下的信噪比表现' },
        dynamicRange: { description: '同时捕捉亮部和暗部细节的能力' },
        sharpness: { description: '图像细节清晰度（线宽/图像高度）' },
        distortion: { description: '镜头畸变程度，越低越好' }
    };
    
    rowColor = true;
    for (const [key, data] of Object.entries(testData)) {
        const bgColor = rowColor ? '#34495e' : '#2c3e50';
        const statusText = getStatusText(data.status);
        
        detailsHTML += `<tr style="background-color:${bgColor}">`;
        detailsHTML += `<td style="padding:10px; border:1px solid #3a506b;">${key === 'resolution' ? '分辨率' : 
            key === 'frameRate' ? '帧率' : 
            key === 'latency' ? '延迟' : 
            key === 'colorAccuracy' ? '色彩准确度' : 
            key === 'lowLightPerformance' ? '低光性能' : 
            key === 'dynamicRange' ? '动态范围' : 
            key === 'sharpness' ? '锐度' : '畸变'}</td>`;
        detailsHTML += `<td style="padding:10px; border:1px solid #3a506b;">${data.value} ${data.unit}</td>`;
        detailsHTML += `<td style="padding:10px; border:1px solid #3a506b;">${statusText}</td>`;
        detailsHTML += `<td style="padding:10px; border:1px solid #3a506b;">${parameterDetails[key].description}</td>`;
        detailsHTML += '</tr>';
        
        rowColor = !rowColor;
    }
    
    detailsHTML += '</table>';
    
    // 添加图表数据
    detailsHTML += '<h4 style="margin-top:30px;">性能趋势分析</h4>';
    detailsHTML += '<p><strong>平均帧率:</strong> ' + 
        (chartData.datasets[0].data.length > 0 ? 
        (chartData.datasets[0].data.reduce((a, b) => a + b, 0) / chartData.datasets[0].data.length).toFixed(1) : '0') + ' fps</p>';
    detailsHTML += '<p><strong>平均延迟:</strong> ' + 
        (chartData.datasets[1].data.length > 0 ? 
        (chartData.datasets[1].data.reduce((a, b) => a + b, 0) / chartData.datasets[1].data.length).toFixed(1) : '0') + ' ms</p>';
    detailsHTML += '<p><strong>帧率稳定性:</strong> ' + 
        (chartData.datasets[0].data.length > 1 ? 
        calculateStability(chartData.datasets[0].data).toFixed(1) + '%' : 'N/A') + '</p>';
    
    // 添加性能总结
    detailsHTML += '<h4 style="margin-top:30px;">性能总结</h4>';
    
    // 计算总体评分
    const statusValues = {
        'good': 10,
        'average': 6,
        'poor': 2,
        'unknown': 0
    };
    
    let totalScore = 0;
    let paramCount = 0;
    
    for (const [key, data] of Object.entries(testData)) {
        if (key !== 'resolution') {
            totalScore += statusValues[data.status] || 0;
            paramCount++;
        }
    }
    
    const overallScore = paramCount > 0 ? Math.round(totalScore / paramCount) : 0;
    let overallRating = '未知';
    
    if (overallScore >= 8) overallRating = '优秀';
    else if (overallScore >= 5) overallRating = '良好';
    else overallRating = '一般';
    
    detailsHTML += `<p><strong>总体评分:</strong> ${overallScore}/10 (${overallRating})</p>`;
    
    // 添加建议
    detailsHTML += '<p><strong>建议:</strong> ';
    if (overallScore >= 8) {
        detailsHTML += '您的摄像头性能优秀，适合专业摄影、视频会议和直播等高要求场景。';
    } else if (overallScore >= 5) {
        detailsHTML += '您的摄像头性能良好，满足日常视频通话和一般拍摄需求。';
    } else {
        detailsHTML += '您的摄像头性能一般，建议优化使用环境或考虑升级设备。';
    }
    detailsHTML += '</p>';
    
    detailsHTML += '</div>';
    
    detailedData.innerHTML = detailsHTML;
    detailsModal.style.display = 'block';
}

// 计算稳定性（变异系数的倒数）
function calculateStability(data) {
    if (data.length < 2) return 100;
    
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    
    // 转换为稳定性百分比
    return Math.max(0, 100 - coefficientOfVariation * 100);
}

// 导出测试数据
function exportData() {
    reportLoading.style.display = 'block';
    
    setTimeout(() => {
        const dataStr = JSON.stringify({
            testData: testData,
            staticData: staticData,
            chartData: chartData,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            cameraSettings: cameraSettings
        }, null, 2);
        
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `camera_test_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            reportLoading.style.display = 'none';
        }, 100);
        
        showNotification('测试数据已导出为JSON文件');
    }, 500);
}

// 复制测试结果
function copyResults() {
    reportLoading.style.display = 'block';
    
    setTimeout(() => {
        let resultsText = '摄像头性能测试结果\n';
        resultsText += '====================\n\n';
        resultsText += `测试时间: ${new Date().toLocaleString()}\n`;
        resultsText += `摄像头名称: ${staticData.deviceLabel.value}\n\n`;
        
        resultsText += '性能测试结果:\n';
        resultsText += '--------------\n';
        for (const [key, data] of Object.entries(testData)) {
            const paramNames = {
                resolution: '分辨率',
                frameRate: '帧率',
                latency: '延迟',
                colorAccuracy: '色彩准确度',
                lowLightPerformance: '低光性能',
                dynamicRange: '动态范围',
                sharpness: '锐度',
                distortion: '畸变'
            };
            
            resultsText += `${paramNames[key] || key}: ${data.value} ${data.unit} (${getStatusText(data.status)})\n`;
        }
        
        resultsText += '\n静态参数:\n';
        resultsText += '----------\n';
        for (const [key, data] of Object.entries(staticData)) {
            if (data.value === 'N/A') continue;
            
            const paramNames = {
                deviceId: '设备ID',
                deviceLabel: '设备名称',
                groupId: '设备组ID',
                aspectRatio: '画面比例',
                facingMode: '摄像头朝向',
                frameRateRange: '帧率范围',
                resolutionRange: '分辨率范围',
                whiteBalanceModes: '白平衡模式',
                exposureModes: '曝光模式',
                focusModes: '对焦模式',
                zoomRange: '变焦范围'
            };
            
            resultsText += `${paramNames[key] || key}: ${data.value} ${data.unit}\n`;
        }
        
        // 复制到剪贴板
        navigator.clipboard.writeText(resultsText)
            .then(() => {
                reportLoading.style.display = 'none';
                showNotification('测试结果已复制到剪贴板');
            })
            .catch(err => {
                reportLoading.style.display = 'none';
                showNotification('复制失败: ' + err.message, 'error');
            });
    }, 500);
}

// 保存设置
function saveSettings() {
    reportLoading.style.display = 'block';
    
    setTimeout(() => {
        // 保存当前设置到localStorage
        const settings = {
            selectedCameraId: selectedCameraId,
            lastTestData: testData,
            lastStaticData: staticData,
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('cameraTestSettings', JSON.stringify(settings));
        reportLoading.style.display = 'none';
        showNotification('设置已保存到本地存储');
    }, 500);
}

// 加载设置
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('cameraTestSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            selectedCameraId = settings.selectedCameraId;
            
            // 显示加载成功提示
            console.log('设置已从本地存储加载');
            return true;
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
    return false;
}

// 帧率计数函数
function countFrame() {
    frameCount++;
    requestAnimationFrame(countFrame);
}

// 事件监听器
startCameraBtn.addEventListener('click', () => {
    isAutoMode = false; // 手动模式
    startCamera();
});

stopCameraBtn.addEventListener('click', stopCamera);

startTestBtn.addEventListener('click', () => {
    isAutoMode = false; // 手动模式
    startTest();
});

stopTestBtn.addEventListener('click', stopTest);
viewDetailsBtn.addEventListener('click', viewDetails);
exportDataBtn.addEventListener('click', exportData);
copyResultsBtn.addEventListener('click', copyResults);
saveSettingsBtn.addEventListener('click', saveSettings);

// 关闭模态框
closeModal.addEventListener('click', () => {
    detailsModal.style.display = 'none';
});

// 点击模态框外部关闭
window.addEventListener('click', (event) => {
    if (event.target === detailsModal) {
        detailsModal.style.display = 'none';
    }
});

// 初始化
function init() {
    initChart();
    initParameterGrid();
    initStaticInfoGrid();
    
    // 加载保存的设置
    loadSettings();
    
    // 开始帧率计数
    requestAnimationFrame(countFrame);
    
    // 初始禁用相关按钮
    viewDetailsBtn.disabled = true;
    exportDataBtn.disabled = true;
    copyResultsBtn.disabled = true;
    saveSettingsBtn.disabled = true;
    
    // 设置自动模式
    isAutoMode = true;
    
    // 自动启动摄像头（延迟1秒，确保页面完全加载）
    setTimeout(() => {
        startCamera();
    }, 1000);
    
    console.log('专业摄像头性能参数检测工具已初始化，正在自动启动摄像头...');
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);