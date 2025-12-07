    // --- 1. 语言检测与翻译字典 ---
        const translations = {
            'zh': {
                'title': '在线摄像头测试工具, webcam test , camera test',
                'badge': '自动',
                'video_label': '视频输入源 (Video)',
                'audio_label': '音频输入源 (Audio)',
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
                'video_label': 'Video Input Source (Video)',
                'audio_label': 'Audio Input Source (Audio)',
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
            document.getElementById('audio-label').textContent = t.audio_label;
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
            document.getElementById('audioSource').innerHTML = `<option>${t.detecting}</option>`;
            document.getElementById('status-text').textContent = t.req_perm;
        }
        
        // --- 2. 脚本核心逻辑 ---
        
        // DOM Elements
        const videoElement = document.getElementById('video');
        const videoSelect = document.getElementById('videoSource');
        const audioSelect = document.getElementById('audioSource');
        const canvas = document.getElementById('audio-vis');
        const canvasCtx = canvas.getContext('2d');

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
        let audioContext;
        let analyser;
        let animationId;
        
        let lastFrameTime = performance.now();
        let frameCount = 0;
        let lastFpsUpdate = 0;

        /**
         * 启动逻辑：页面加载即运行
         */
        async function autoStart() {
            try {
                // 步骤 1: 立即请求权限
                statusText.textContent = t.req_perm;
                const initialStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                
                // 步骤 2: 权限通过后，枚举所有设备
                const currentVideoId = initialStream.getVideoTracks()[0].getSettings().deviceId;
                await populateDeviceList(currentVideoId);

                // 步骤 3: 关闭初始流，使用选择的第一个设备开始正式显示
                initialStream.getTracks().forEach(track => track.stop());
                
                // videoSelect 的值已在 populateDeviceList 中设置
                startStream(videoSelect.value);

            } catch (error) {
                console.error("Auto start failed:", error);
                statusHeader.className = 'error';
                statusText.textContent = t.fail + (error.name || 'Unknown');
                statusText.style.color = "#ef4444";
                alert(t.no_access_alert);
            }
        }

        // 2. 填充设备列表
        async function populateDeviceList(activeVideoId) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            videoSelect.innerHTML = '';
            audioSelect.innerHTML = '';
            let videoFound = false;

            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                
                if (device.kind === 'videoinput') {
                    option.text = device.label || `Camera ${videoSelect.length + 1}`;
                    videoSelect.appendChild(option);
                    if (device.deviceId === activeVideoId) {
                        option.selected = true; // 选中当前活动的设备
                        videoFound = true;
                    }
                } else if (device.kind === 'audioinput') {
                    option.text = device.label || `Microphone ${audioSelect.length + 1}`;
                    audioSelect.appendChild(option);
                }
            });

            if (videoSelect.options.length > 0 && !videoFound) {
                videoSelect.options[0].selected = true; // 如果找不到活跃的，默认选中第一个
            }
        }

        // 3. 启动指定的流
        async function startStream() {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
            if (audioContext) {
                audioContext.close();
            }

            const videoId = videoSelect.value;
            const audioId = audioSelect.value;

            const constraints = {
                video: {
                    deviceId: videoId ? { exact: videoId } : undefined,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 } 
                },
                audio: {
                    deviceId: audioId ? { exact: audioId } : undefined
                }
            };

            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                currentStream = stream;
                videoElement.srcObject = stream;
                
                statusHeader.className = 'active';
                statusText.textContent = t.active;
                statusText.style.color = "#10b981";

                const videoTrack = stream.getVideoTracks()[0];
                analyzeVideoTrack(videoTrack);
                
                initAudioVisualizer(stream);

                if (!animationId) {
                    requestAnimationFrame(updateStats);
                }

            } catch (error) {
                console.error('Error starting specific stream:', error);
                statusText.textContent = t.fail + (error.name || 'Unknown');
                statusHeader.className = 'error';
            }
        }

        // 4. 分析硬件参数 (使用 t 字典进行翻译)
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
        
        // 5. 实时统计循环 (与语言无关，保持不变)
        function updateStats(timestamp) {
            if (!currentStream || !currentStream.active) {
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

            drawAudio();
            animationId = requestAnimationFrame(updateStats);
        }

        // 6. 音频可视化 (与语言无关，保持不变)
        function initAudioVisualizer(stream) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
        }

        function drawAudio() {
            if(!analyser) return;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;
            canvasCtx.fillStyle = 'rgb(0, 0, 0)';
            canvasCtx.clearRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for(let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                canvasCtx.fillStyle = `rgb(${barHeight + 50}, ${50 + i}, 255)`;
                canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        }

        // 7. 事件监听器
        videoSelect.onchange = () => {
            statusText.textContent = t.switching;
            startStream();
        };
        
        audioSelect.onchange = () => {
            statusText.textContent = t.switching;
            startStream();
        };

        document.getElementById('btn-mirror').onclick = () => videoElement.classList.toggle('no-mirror');

        // 页面加载完毕立即执行
        window.addEventListener('load', () => {
            setLanguage(); // 首先设置语言
            autoStart();  // 然后自动启动检测
        });