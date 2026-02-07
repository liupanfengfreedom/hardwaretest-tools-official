// Global Variables
let cropper = null;
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const editorArea = document.getElementById('editor-area');
const imageToCrop = document.getElementById('image-to-crop');
const previewImgs = document.querySelectorAll('.preview-img');
const generateBtn = document.getElementById('generate-btn');
const progressIndicator = document.getElementById('progress-indicator');

// Icon Configuration
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

// Click Upload Area
uploadArea.onclick = () => fileInput.click();

// Drag‑and‑Drop Upload
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
            showNotification('Please drop an image file (JPG, PNG, GIF, etc.)', 'error');
        }
    }
});

// File Picker Event
fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    processImageFile(file);
};

// Process Image File
function processImageFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        showNotification('File too large. Please choose an image under 10MB', 'error');
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
            // Core: Real‑time Preview Logic
            crop() {
                const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
                const url = canvas.toDataURL();
                previewImgs.forEach(img => img.src = url);
            }
        });
        
        // Show preview immediately
        setTimeout(() => {
            if (cropper) {
                const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
                const url = canvas.toDataURL();
                previewImgs.forEach(img => img.src = url);
            }
        }, 100);
        
        showNotification('Icon loaded. Adjust the crop area', 'success');
    };
    reader.onerror = () => {
        showNotification('Failed to read file. Please try again', 'error');
    };
    reader.readAsDataURL(file);
}

// Generate Icons Button Event
generateBtn.onclick = async () => {
    if (!cropper) return;
    
    // Show Progress Indicator
    progressIndicator.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="loading-spinner"></div><span>Generating...</span>';
    
    try {
        const zip = new JSZip();
        const masterCanvas = cropper.getCroppedCanvas({ width: 1024, height: 1024 });
        const exportCanvas = document.getElementById('export-canvas');
        const ctx = exportCanvas.getContext('2d');

        // Package iOS
        const iosFolder = zip.folder("iOS_Icons");
        let iosCount = 0;
        for (const item of CONFIG.ios) {
            const blob = await resize(masterCanvas, exportCanvas, ctx, item.size);
            iosFolder.file(item.name, blob);
            iosCount++;
            updateProgress(iosCount, CONFIG.ios.length + CONFIG.android.length, 'iOS');
        }

        // Package Android
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
        
        showNotification(`Successfully generated ${CONFIG.ios.length + CONFIG.android.length} icon files`, 'success');
        
    } catch (error) {
        console.error('Icon generation failed:', error);
        showNotification('Generation failed. Please try again', 'error');
    } finally {
        // Hide Progress Indicator
        progressIndicator.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-download"></i><span>Generate Full Icon Set (.zip)</span>';
    }
};

// Image Resize Function
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

// Update Progress Function
function updateProgress(current, total, platform) {
    const progressText = document.querySelector('#progress-indicator span');
    if (progressText) {
        progressText.textContent = `Generating icon pack... (${current}/${total}) ${platform}`;
    }
}

// Show Notification Function
function showNotification(message, type) {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create new notification
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
    
    // Auto‑remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}