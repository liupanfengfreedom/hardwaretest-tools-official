// 全局变量
let cropper = null;
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const editorArea = document.getElementById('editor-area');
const imageToCrop = document.getElementById('image-to-crop');
const previewImgs = document.querySelectorAll('.preview-img');
const generateBtn = document.getElementById('generate-btn');
const progressIndicator = document.getElementById('progress-indicator');

// 图标配置
const CONFIG = {
    ios: [
        { size: 1024, name: 'AppIcon-1024.png' },
        { size: 180, name: 'AppIcon-60x60@3x.png' },
        { size: 120, name: 'AppIcon-60x60@2x.png' },
        { size: 167, name: 'AppIcon-83.5x83.5@2x.png' },
        { size: 152, name: 'AppIcon-76x76@2x.png' },
        { size: 87, name: 'AppIcon-29x29@3x.png' },
        { size: 40, name: 'AppIcon-20x20@2x.png' }
    ],
    android: [
        { size: 512, folder: 'play-store', name: 'icon-512.png' },
        { size: 192, folder: 'mipmap-xxxhdpi', name: 'ic_launcher.png' },
        { size: 144, folder: 'mipmap-xxhdpi', name: 'ic_launcher.png' },
        { size: 96, folder: 'mipmap-xhdpi', name: 'ic_launcher.png' },
        { size: 72, folder: 'mipmap-hdpi', name: 'ic_launcher.png' },
        { size: 48, folder: 'mipmap-mdpi', name: 'ic_launcher.png' }
    ]
};

// 点击上传区域
uploadArea.onclick = () => fileInput.click();

// 拖拽上传功能
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            processImageFile(file);
        } else {
            showNotification('请拖入图片文件 (JPG, PNG, GIF 等)', 'error');
        }
    }
});

// 文件选择器事件
fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    processImageFile(file);
};

// 处理图片文件的通用函数
function processImageFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        showNotification('文件过大，请选择小于10MB的图片', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = event => {
        imageToCrop.src = event.target.result;
        uploadArea.classList.add('hidden');
        editorArea.classList.remove('hidden');
        
        if (cropper) cropper.destroy();
        cropper = new Cropper(imageToCrop, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 0.8,
            background: false,
            // 核心：实时预览逻辑
            crop() {
                const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
                const url = canvas.toDataURL();
                previewImgs.forEach(img => img.src = url);
            }
        });
        
        // 立即显示一次预览
        setTimeout(() => {
            if (cropper) {
                const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
                const url = canvas.toDataURL();
                previewImgs.forEach(img => img.src = url);
            }
        }, 100);
        
        showNotification('图标已加载，请调整裁剪区域', 'success');
    };
    reader.onerror = () => {
        showNotification('读取文件失败，请重试', 'error');
    };
    reader.readAsDataURL(file);
}

// 生成图标按钮事件
generateBtn.onclick = async () => {
    if (!cropper) return;
    
    // 显示进度指示器
    progressIndicator.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="loading-spinner"></div><span>生成中...</span>';
    
    try {
        const zip = new JSZip();
        const masterCanvas = cropper.getCroppedCanvas({ width: 1024, height: 1024 });
        const exportCanvas = document.getElementById('export-canvas');
        const ctx = exportCanvas.getContext('2d');

        // 打包 iOS
        const iosFolder = zip.folder("iOS_Icons");
        let iosCount = 0;
        for (const item of CONFIG.ios) {
            const blob = await resize(masterCanvas, exportCanvas, ctx, item.size);
            iosFolder.file(item.name, blob);
            iosCount++;
            updateProgress(iosCount, CONFIG.ios.length + CONFIG.android.length, 'iOS');
        }

        // 打包 Android
        const androidFolder = zip.folder("Android_Icons");
        let androidCount = 0;
        for (const item of CONFIG.android) {
            const subFolder = androidFolder.folder(item.folder);
            const blob = await resize(masterCanvas, exportCanvas, ctx, item.size);
            subFolder.file(item.name, blob);
            androidCount++;
            updateProgress(iosCount + androidCount, CONFIG.ios.length + CONFIG.android.length, 'Android');
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `App_Icons_${new Date().getTime()}.zip`);
        
        showNotification(`成功生成 ${CONFIG.ios.length + CONFIG.android.length} 个图标文件`, 'success');
        
    } catch (error) {
        console.error('生成图标失败:', error);
        showNotification('生成失败，请重试', 'error');
    } finally {
        // 隐藏进度指示器
        progressIndicator.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-download"></i><span>生成全套图标 (.zip)</span>';
    }
};

// 图片调整大小函数
function resize(source, target, ctx, size) {
    return new Promise(resolve => {
        target.width = size;
        target.height = size;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(source, 0, 0, size, size);
        target.toBlob(blob => resolve(blob), 'image/png', 0.9);
    });
}

// 更新进度函数
function updateProgress(current, total, platform) {
    const progressText = document.querySelector('#progress-indicator span');
    if (progressText) {
        progressText.textContent = `正在生成图标包... (${current}/${total}) ${platform}`;
    }
}

// 显示通知函数
function showNotification(message, type) {
    // 移除现有的通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建新通知
    const notification = document.createElement('div');
    notification.className = `notification fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 fade-in ${type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-green-600'}`;
    notification.style.animation = 'fadeIn 0.3s ease-out';
    
    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    icon.classList.add('text-white', 'text-xl');
    
    const text = document.createElement('span');
    text.className = 'text-white font-medium';
    text.textContent = message;
    
    notification.appendChild(icon);
    notification.appendChild(text);
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}