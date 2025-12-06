  // 翻译字典
        const translations = {
            'zh': {
                'title': '鼠标测试,键盘测试,麦克风灵敏度测试,摄像头测试',
                'meta_desc_id':  'meta-desc-zh',
                'subtitle': '鼠标莫名双击？键盘按键失灵？麦克风声音太小？<br>无需下载，即点即用。专业的<span class="highlight">在线硬件检测实验室</span>。',
                'mouse_desc': '毫秒级微动故障分析。实时检测回报率 (Polling Rate)、滚轮及侧键功能。助您精准排查鼠标双击、失灵问题。',
                'mouse_btn': '开始鼠标检测 <i class="fa-solid fa-arrow-right"></i>',
                'kb_desc': '全键位功能排查与冲突测试。整合硬件知识库与维修指南，解决按键无反应、连触等常见故障。',
                'kb_btn': '启动键盘检测 <i class="fa-solid fa-wrench"></i>',
                'av_desc': '一键检测网络摄像头与麦克风工作状态。提供分辨率、帧率及声波分析详细参数。支持手机与PC。',
                'cam_btn': '摄像头检测',
                'mic_btn': '麦克风检测',
                'footer': '&copy; 2023 HardwareTest Tools Official. All Systems Operational.',
                'loading': '正在加载...',
                // 新增的文档翻译
                'docs_title': 'HardwareTest 使用说明与功能详解',
                'docs_toggle': '查看使用手册',
                'docs_intro': 'HardwareTest 是一套专业的在线硬件检测工具集合，旨在帮助用户快速诊断和解决常见的计算机外设问题。无需安装任何软件，直接在浏览器中即可完成全面的硬件检测。',
                'mouse_doc_title': '鼠标检测功能',
                'mouse_doc_desc': '全面检测鼠标各项功能，包括左右键点击、滚轮滚动、DPI切换和侧键功能。特别针对常见的双击问题提供精准检测。',
                'mouse_feature1': '左右键点击响应测试',
                'mouse_feature2': '滚轮灵敏度与方向检测',
                'mouse_feature3': 'DPI切换功能验证',
                'mouse_feature4': '侧键功能完整性检查',
                'keyboard_doc_title': '键盘检测功能',
                'keyboard_doc_desc': '全键位功能测试，包括按键冲突检测、连击问题分析和功能键验证。支持各种布局的机械键盘和薄膜键盘。',
                'keyboard_feature1': '全键位功能测试',
                'keyboard_feature2': '按键冲突检测',
                'keyboard_feature3': '连击问题分析',
                'keyboard_feature4': '功能键与组合键验证',
                'camera_doc_title': '摄像头检测功能',
                'camera_doc_desc': '全面检测摄像头工作状态，包括分辨率、帧率、自动对焦和色彩还原度。支持前后置摄像头切换测试。',
                'camera_feature1': '分辨率与画质检测',
                'camera_feature2': '帧率与流畅度测试',
                'camera_feature3': '自动对焦功能验证',
                'camera_feature4': '色彩还原度分析',
                'mic_doc_title': '麦克风检测功能',
                'mic_doc_desc': '精准检测麦克风工作状态，包括灵敏度测试、噪音分析和音频质量评估。提供实时声波可视化反馈。',
                'mic_feature1': '麦克风灵敏度测试',
                'mic_feature2': '背景噪音分析',
                'mic_feature3': '音频质量评估',
                'mic_feature4': '实时声波可视化',

                'screen_doc_title': '屏幕坏点检测功能',
                'screen_doc_desc': '提供专业的全屏纯色检测模式，可用于识别亮点、坏点、漏光及色彩不均问题。支持多种颜色切换方式，搭配防连击防抖设计，确保测试过程稳定可靠。',
                'screen_feature1': '全屏纯色坏点检测',
                'screen_feature2': '提供8种颜色切换',
                'screen_feature3': '测试模式自动隐藏鼠标与界面',
                'screen_feature4': '支持 ESC 退出并自动还原界面.',


                'faq_title': '常见问题解答',
                'faq_q1': 'Q: 这些检测工具需要安装什么软件吗？',
                'faq_a1': 'A: 完全不需要！HardwareTest 是基于Web的在线工具，只需使用现代浏览器（如Chrome、Firefox、Edge等）即可直接使用。',
                'faq_q2': 'Q: 检测结果准确吗？',
                'faq_a2': 'A: 我们的工具采用专业的检测算法，能够准确反映硬件的工作状态。但请注意，某些高级功能可能需要特定浏览器权限。',
                'faq_q3': 'Q: 支持移动设备吗？',
                'faq_a3': 'A: 是的！HardwareTest 完全支持在智能手机和平板电脑上使用，可以检测移动设备的摄像头、麦克风等功能。'
            },
            'en': {
                'title': 'mouse test,keyboard test,camera test,microphone test',
                'meta_desc_id':  'meta-desc-en',
                'subtitle': 'Mouse double-clicking? Keyboard ghosting? Mic too quiet?<br>No download needed. Professional <span class="highlight">Online Hardware Lab</span>.',
                'mouse_desc': 'Millisecond-level switch analysis. Real-time Polling Rate, scroll wheel & side button tests. Fix double-click issues.',
                'mouse_btn': 'Start Mouse Test <i class="fa-solid fa-arrow-right"></i>',
                'kb_desc': 'Full-key rollover & conflict test. Integrated repair guide for ghosting and unresponsive keys.',
                'kb_btn': 'Launch Keyboard Test <i class="fa-solid fa-wrench"></i>',
                'av_desc': 'One-click webcam & mic check. Detailed resolution, frame rate & waveform analysis. Mobile & PC supported.',
                'cam_btn': 'Webcam Test',
                'mic_btn': 'Mic Test',
                'footer': '&copy; 2023 HardwareTest Tools Official. All Systems Operational.',
                'loading': 'Loading...',
                // 新增的文档翻译
                'docs_title': 'HardwareTest User Manual & Features',
                'docs_toggle': 'View User Manual',
                'docs_intro': 'HardwareTest is a professional online hardware testing toolset designed to help users quickly diagnose and resolve common computer peripheral issues. No software installation required - complete comprehensive hardware testing directly in your browser.',
                'mouse_doc_title': 'Mouse Testing Features',
                'mouse_doc_desc': 'Comprehensive testing of all mouse functions including left/right clicks, scroll wheel, DPI switching, and side buttons. Specialized detection for common double-click issues.',
                'mouse_feature1': 'Left/right click response testing',
                'mouse_feature2': 'Scroll wheel sensitivity and direction detection',
                'mouse_feature3': 'DPI switching function verification',
                'mouse_feature4': 'Side button functionality check',
                'keyboard_doc_title': 'Keyboard Testing Features',
                'keyboard_doc_desc': 'Full key functionality testing including key conflict detection, key chattering analysis, and function key verification. Supports various mechanical and membrane keyboard layouts.',
                'keyboard_feature1': 'Full key functionality test',
                'keyboard_feature2': 'Key conflict detection',
                'keyboard_feature3': 'Key chattering analysis',
                'keyboard_feature4': 'Function key and combination verification',
                'camera_doc_title': 'Camera Testing Features',
                'camera_doc_desc': 'Comprehensive camera status detection including resolution, frame rate, autofocus, and color accuracy. Supports front and rear camera switching tests.',
                'camera_feature1': 'Resolution and image quality detection',
                'camera_feature2': 'Frame rate and smoothness testing',
                'camera_feature3': 'Autofocus function verification',
                'camera_feature4': 'Color accuracy analysis',
                'mic_doc_title': 'Microphone Testing Features',
                'mic_doc_desc': 'Precise microphone status detection including sensitivity testing, noise analysis, and audio quality assessment. Provides real-time waveform visualization.',
                'mic_feature1': 'Microphone sensitivity testing',
                'mic_feature2': 'Background noise analysis',
                'mic_feature3': 'Audio quality assessment',
                'mic_feature4': 'Real-time waveform visualization',

                'screen_doc_title': 'Screen dead pixel detection Features',
                'screen_doc_desc': 'Offers a professional full-screen solid color detection mode, which can be used to identify bright spots, dead pixels, light leaks, and uneven color.Supports multiple color switching modes, coupled with anti-interference and anti-shake design, ensuring stable and reliable testing.',
                'screen_feature1': 'Full-screen solid color dead pixel detection',
                'screen_feature2': 'Offers 8 color switching options',
                'screen_feature3': 'Test mode automatically hides the mouse and interface',
                'screen_feature4': 'Supports exiting with ESC and automatically restoring the interface.',

                'faq_title': 'Frequently Asked Questions',
                'faq_q1': 'Q: Do these testing tools require any software installation?',
                'faq_a1': 'A: Not at all! HardwareTest is a web-based online tool that works directly in modern browsers like Chrome, Firefox, Edge, etc.',
                'faq_q2': 'Q: Are the test results accurate?',
                'faq_a2': 'A: Our tools use professional testing algorithms that accurately reflect hardware status. Note that some advanced features may require specific browser permissions.',
                'faq_q3': 'Q: Does it support mobile devices?',
                'faq_a3': 'A: Yes! HardwareTest fully supports smartphones and tablets, allowing you to test mobile device cameras, microphones, and other functions.'
            }
        };

        // 检测语言并应用
        function setLanguage(langCode) {
            // 添加过渡效果
            document.body.style.opacity = '0.7';
            
            // 如果没有指定语言，则使用本地存储或浏览器语言
            if (!langCode) {
                const savedLang = localStorage.getItem('hardwareTestLang');
                if (savedLang) {
                    langCode = savedLang;
                } else {
                    // 获取浏览器语言 (例如: 'zh-CN', 'en-US')
                    const userLang = navigator.language || navigator.userLanguage;
                    // 如果语言以 'zh' 开头，使用中文，否则使用英文
                    langCode = userLang.startsWith('zh') ? 'zh' : 'en';
                }
            }
            
            // 更新语言按钮状态
            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === langCode);
            });
            
            const content = translations[langCode];

            // 更新页面标题和meta描述
            document.title = content.title;
            // 切换meta描述的显示
            document.querySelectorAll('meta[name="description"]').forEach(meta => {
                meta.setAttribute('hidden', '');
            });
            const activeMeta = document.getElementById(content.meta_desc_id);
            if (activeMeta) {
                activeMeta.removeAttribute('hidden');
            }

            // 遍历所有带有 data-i18n 属性的元素并替换内容
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (content[key]) {
                    element.innerHTML = content[key];
                }
            });

            // 修改 html 的 lang 属性
            document.documentElement.lang = langCode === 'zh' ? 'zh-CN' : 'en';
            
            // 保存语言选择
            localStorage.setItem('hardwareTestLang', langCode);
            
            // 恢复透明度
            setTimeout(() => {
                document.body.style.opacity = '1';
            }, 150);
        }

        // 页面加载时执行
        window.addEventListener('DOMContentLoaded', () => {
            setLanguage();
            
            // 添加语言切换功能
            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    setLanguage(this.dataset.lang);
                });
            });
            
            // 改进的加载状态处理
            document.querySelectorAll('a[target="_blank"]').forEach(link => {
                link.addEventListener('click', function(e) {
                    // 只对同站链接显示加载动画
                    if (this.hostname === window.location.hostname) {
                        document.querySelector('.loading').classList.add('active');
                        // 设置超时自动关闭，防止页面无法加载时动画一直显示
                        setTimeout(() => {
                            document.querySelector('.loading').classList.remove('active');
                        }, 3000);
                    }
                });
            });
            
            // 文档切换功能
            const docsToggle = document.querySelector('.docs-toggle');
            const docsContent = document.querySelector('.docs-content');
            
            if (docsToggle && docsContent) {
                docsToggle.addEventListener('click', function() {
                    docsContent.classList.toggle('active');
                    // 更新按钮文本
                    if (docsContent.classList.contains('active')) {
                        if (document.documentElement.lang === 'zh-CN') {
                            docsToggle.textContent = '收起使用手册';
                        } else {
                            docsToggle.textContent = 'Hide User Manual';
                        }
                    } else {
                        if (document.documentElement.lang === 'zh-CN') {
                            docsToggle.textContent = '查看使用手册';
                        } else {
                            docsToggle.textContent = 'View User Manual';
                        }
                    }
                });
            }
            
            // 监听页面可见性变化，隐藏加载动画
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'visible') {
                    document.querySelector('.loading').classList.remove('active');
                }
            });
        });

        // 字体加载失败时的降级处理
        document.fonts.ready.then(() => {
            console.log('All fonts loaded');
        }).catch((error) => {
            console.warn('Some fonts failed to load:', error);
        });