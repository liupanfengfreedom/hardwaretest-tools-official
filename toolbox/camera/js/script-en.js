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

// Permission Request Modal
function showPermissionRequestModal() {
    return new Promise((resolve) => {
        // Create modal overlay
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

        // Create modal content
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

        // Modal title
        const title = document.createElement('h2');
        title.textContent = 'Camera Permission Request';
        title.style.cssText = `
            color: var(--text-main);
            margin-top: 0;
            margin-bottom: 20px;
            font-weight: 300;
        `;

        // Modal description
        const description = document.createElement('p');
        description.textContent = 'Webcam Test Tool needs access to your camera device to detect performance parameters. Please confirm if you allow access?';
        description.style.cssText = `
            color: var(--text-main);
            line-height: 1.6;
            margin-bottom: 30px;
            font-size: 16px;
        `;

        // Notice section
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
        noticeText.textContent = 'We guarantee: All data is processed locally only, not uploaded to any servers.';
        noticeText.style.cssText = 'color: #b0b0b0; font-size: 14px;';
        
        notice.appendChild(noticeIcon);
        notice.appendChild(noticeText);

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        `;

        // Allow button
        const allowButton = document.createElement('button');
        allowButton.textContent = 'Allow Access';
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

        // Deny button
        const denyButton = document.createElement('button');
        denyButton.textContent = 'Deny Access';
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

        // Assemble modal
        buttonContainer.appendChild(allowButton);
        buttonContainer.appendChild(denyButton);
        
        modalContent.appendChild(title);
        modalContent.appendChild(description);
        modalContent.appendChild(notice);
        modalContent.appendChild(buttonContainer);
        modalOverlay.appendChild(modalContent);
        
        // Add to page
        document.body.appendChild(modalOverlay);
        
        // ESC key to close modal
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
 * New startup process: request user confirmation first, then start camera
 */
async function initCameraTool() {
    try {
        // Performance monitoring start
        perfStart = performance.now();
        
        // Step 1: Show permission request modal
        statusText.textContent = 'Waiting for user confirmation...';
        updateStatus('loading');
        
        const userConfirmed = await showPermissionRequestModal();
        
        if (!userConfirmed) {
            // User denied, redirect to home page
            statusText.textContent = 'User denied access permission';
            updateStatus('error');
            
            // Delay redirect to let user see status change
            setTimeout(() => {
                window.location.href = '/toolbox/en/';
            }, 1000);
            return;
        }
        
        // User agreed, continue with original process
        statusText.textContent = 'Requesting permission...';
        
        // Step 2: Request camera permission
        const initialStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        // Step 3: After permission granted, enumerate all devices
        const currentVideoId = initialStream.getVideoTracks()[0].getSettings().deviceId;
        await populateDeviceList(currentVideoId);

        // Step 4: Close initial stream, use selected first device for official display
        initialStream.getTracks().forEach(track => track.stop());
        
        // videoSelect value already set in populateDeviceList
        await startStream();
        
        // Log performance
        logPerformance();

    } catch (error) {
        console.error("Camera tool initialization failed:", error);
        handleError(error);
    }
}

// Populate device list (unchanged structure)
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
                option.text = device.label || `Camera ${++videoCount}`;
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
            option.text = 'No camera detected';
            videoSelect.appendChild(option);
            videoSelect.disabled = true;
        }
        
        // Trigger change event to update aria-label
        videoSelect.dispatchEvent(new Event('change'));
        
    } catch (error) {
        console.error("Error enumerating devices:", error);
        const option = document.createElement('option');
        option.text = 'Device enumeration failed';
        videoSelect.innerHTML = '';
        videoSelect.appendChild(option);
        videoSelect.disabled = true;
    }
}

// Start specified stream (unchanged structure)
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
        
        // Set aria-label for video element
        const track = stream.getVideoTracks()[0];
        videoElement.setAttribute('aria-label', track.label || 'Camera video stream');
        
        updateStatus('active');
        statusText.textContent = 'Running normally';
        statusText.style.color = "#10b981";

        const videoTrack = stream.getVideoTracks()[0];
        analyzeVideoTrack(videoTrack);

        // Start performance monitoring loop
        if (!animationFrameId) {
            requestAnimationFrame(updateStats);
        }

        // Send success event to analytics
        trackPerformanceEvent('camera_stream_started', 'success');

    } catch (error) {
        console.error('Error starting specific stream:', error);
        updateStatus('error');
        statusText.textContent = 'Start failed: ' + (error.name || 'Unknown');
        
        // Send error event to analytics
        trackPerformanceEvent('camera_stream_error', 'error', error.name);
        
        throw error;
    }
}

// Analyze hardware parameters (unchanged structure)
function analyzeVideoTrack(track) {
    const settings = track.getSettings();
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};

    deviceLabel.textContent = track.label || 'Unknown device';
    deviceLabel.setAttribute('title', track.label || 'Unknown device');
    
    let capHtml = '';
    
    if (capabilities.width) {
        capHtml += `<tr><td>Resolution Range</td><td>${capabilities.width.min} - ${capabilities.width.max}px</td></tr>`;
    }
    
    if (capabilities.height) {
        capHtml += `<tr><td>Height Range</td><td>${capabilities.height.min} - ${capabilities.height.max}px</td></tr>`;
    }
    
    if (capabilities.frameRate) {
        capHtml += `<tr><td>FPS Range</td><td>${capabilities.frameRate.min} - ${capabilities.frameRate.max}</td></tr>`;
    }
    
    if (capabilities.aspectRatio) {
        capHtml += `<tr><td>Supported Ratios</td><td>${capabilities.aspectRatio.min.toFixed(2)} - ${capabilities.aspectRatio.max.toFixed(2)}</td></tr>`;
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
        capHtml += `<tr><td>Supported Features</td><td>${featureList.join(', ')}</td></tr>`;
    }
    
    // Add current settings information
    if (settings.width && settings.height) {
        capHtml += `<tr><td>Current Resolution</td><td>${settings.width}×${settings.height}</td></tr>`;
    }
    
    if (settings.frameRate) {
        capHtml += `<tr><td>Current Frame Rate</td><td>${settings.frameRate} fps</td></tr>`;
    }

    capTable.innerHTML = capHtml || `<tr><td colspan="2">Unable to get detailed driver information</td></tr>`;
}

// Real-time statistics loop (unchanged structure)
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
        
        // Update video element dimension attributes
        videoElement.setAttribute('width', w);
        videoElement.setAttribute('height', h);
    }

    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        const fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        liveFps.textContent = fps;
        lastFpsUpdate = timestamp;
        frameCount = 0;
        
        // Frame rate monitoring
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

// Update status indicator (unchanged structure)
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

// Error handling (unchanged structure)
function handleError(error) {
    console.error("Camera error:", error);
    updateStatus('error');
    
    let errorMessage = 'Unknown error';
    if (error.name === 'NotAllowedError') {
        errorMessage = 'User denied camera permission';
    } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera device found';
    } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application';
    } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Cannot meet camera parameter requirements';
    } else if (error.name === 'SecurityError') {
        errorMessage = 'Requires HTTPS or localhost environment';
    } else {
        errorMessage = error.message || error.name;
    }
    
    statusText.textContent = 'Error: ' + errorMessage;
    statusText.style.color = "#ef4444";
    
    // Show user-friendly prompt
    if (window.confirm('Camera access failed: ' + errorMessage + '\n\nView help documentation?')) {
        window.open('/toolbox/camera/guide/#troubleshooting', '_blank');
    }
}

// Performance monitoring (unchanged structure)
function logPerformance() {
    const perfEnd = performance.now();
    const loadTime = Math.round(perfEnd - perfStart);
    
    console.log(`Webcam Test Tool loaded successfully, time: ${loadTime}ms`);
    
    // Send performance data to analytics
    trackPerformanceEvent('page_load_complete', 'timing', loadTime);
}

function trackPerformanceEvent(eventName, category, value = null) {
    // If Google Analytics exists
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
            'event_category': category,
            'event_label': 'camera_test_tool',
            'value': value
        });
    }
    
    // Custom performance tracking
    const perfData = {
        event: eventName,
        category: category,
        value: value,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        language: navigator.language
    };
    
    // Can send to own analytics service
    // sendToAnalytics(perfData);
}

// Cleanup resources (unchanged structure)
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
    statusText.textContent = 'Stopped';
    statusText.style.color = "var(--text-muted)";
}

// Event listeners (unchanged structure)
videoSelect.onchange = () => {
    statusText.textContent = 'Switching...';
    updateStatus('loading');
    
    // Send switch event to analytics
    trackPerformanceEvent('camera_switch', 'user_action');
    
    startStream().catch(error => {
        console.error('Stream switch failed:', error);
        handleError(error);
    });
};

document.getElementById('btn-mirror').onclick = () => {
    videoElement.classList.toggle('no-mirror');
    const isMirrored = !videoElement.classList.contains('no-mirror');
    
    // Send mirror toggle event to analytics
    trackPerformanceEvent('mirror_toggle', 'user_action', isMirrored);
    
    // Update button text
    const btn = document.getElementById('btn-mirror');
    btn.textContent = isMirrored ? 'Mirror Flip' : 'Cancel Mirror';
};

// Page visibility change handling (unchanged structure)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Stop animation frame when page hidden to save resources
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } else {
        // Restore when page visible again
        if (currentStream && currentStream.active) {
            animationFrameId = requestAnimationFrame(updateStats);
        }
    }
});

// Cleanup before page unload (unchanged structure)
window.addEventListener('beforeunload', () => {
    cleanup();
    trackPerformanceEvent('page_unload', 'session');
});

// Execute new initialization process when page loads
window.addEventListener('load', () => {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support camera access. Please use modern browsers like Chrome, Firefox, Edge, or Safari.');
        return;
    }
    
    // Check if in HTTPS environment (production requirement)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn('Camera functionality may be limited in non-HTTPS environment');
    }
    
    // Use new initialization process, show permission request modal
    initCameraTool();
});

// Global error capture (unchanged structure)
window.addEventListener('error', function(e) {
    console.error('Camera tool global error:', e.error);
    
    // Send error to analytics
    trackPerformanceEvent('global_error', 'error', e.message);
    
    // Prevent error bubbling to console
    e.preventDefault();
});

// Unhandled promise rejection (unchanged structure)
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise rejection:', e.reason);
    
    // Send error to analytics
    trackPerformanceEvent('unhandled_promise', 'error', e.reason?.message || 'Unknown');
    
    e.preventDefault();
});

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initCameraTool,
        startStream,
        cleanup,
        updateStats
    };
}