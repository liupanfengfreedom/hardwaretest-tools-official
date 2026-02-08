// 核心 ICO 构建逻辑
async function encodeICO(canvases) {
    const blobs = await Promise.all(canvases.map(c => new Promise(res => c.toBlob(res, 'image/png'))));
    const buffers = await Promise.all(blobs.map(b => b.arrayBuffer()));
    
    const headerSize = 6;
    const directorySize = 16 * canvases.length;
    let currentOffset = headerSize + directorySize;
    
    const icoHeader = new DataView(new ArrayBuffer(headerSize + directorySize));
    icoHeader.setUint16(0, 0, true);    
    icoHeader.setUint16(2, 1, true);    
    icoHeader.setUint16(4, canvases.length, true); 
    
    buffers.forEach((buf, i) => {
        const canvas = canvases[i];
        const entryOffset = headerSize + (i * 16);
        icoHeader.setUint8(entryOffset + 0, canvas.width >= 256 ? 0 : canvas.width);
        icoHeader.setUint8(entryOffset + 1, canvas.height >= 256 ? 0 : canvas.height);
        icoHeader.setUint8(entryOffset + 2, 0); 
        icoHeader.setUint8(entryOffset + 3, 0); 
        icoHeader.setUint16(entryOffset + 4, 1, true); 
        icoHeader.setUint16(entryOffset + 6, 32, true); 
        icoHeader.setUint32(entryOffset + 8, buf.byteLength, true); 
        icoHeader.setUint32(entryOffset + 12, currentOffset, true); 
        currentOffset += buf.byteLength;
    });
    return new Blob([icoHeader.buffer, ...buffers], { type: 'image/x-icon' });
}

// 新增：创建SVG文件的函数
function createSVGFromCanvas(canvas) {
    const svgSize = 512;
    const pngDataUrl = canvas.toDataURL('image/png');
    
    // 创建SVG字符串
    const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
        <style>
            image { width: 100%; height: 100%; }
        </style>
    </defs>
    <image x="0" y="0" width="${svgSize}" height="${svgSize}" xlink:href="${pngDataUrl}" />
</svg>`;
    
    return new Blob([svgString], { type: 'image/svg+xml' });
}

const imageInput = document.getElementById('imageInput');
const dropZone = document.getElementById('drop-zone');
const editorContainer = document.getElementById('editor-container');
const cropperImage = document.getElementById('cropperImage');
const generateBtn = document.getElementById('generateBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const downloadArea = document.getElementById('download-area');

let cropper = null;
let generatedBlobs = {};

// 修改配置数组，添加SVG配置
const configs = [
    { name: 'favicon-16x16.png', size: 16, previews: ['prev-search', 'prev-tab', 'prev-ico-16'], inIco: true },
    { name: 'favicon-32x32.png', size: 32, previews: ['prev-ico-32'], inIco: true },
    { name: 'favicon-48x48.png', size: 48, previews: ['prev-ico-48'], inIco: true },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'favicon.svg', size: 512, type: 'svg', previews: ['prev-svg'] }, // 新增SVG配置
    { name: 'apple-touch-icon.png', size: 180, previews: ['prev-ios'] },
    { name: 'android-chrome-192x192.png', size: 192, previews: ['prev-android'] },
    { name: 'android-chrome-512x512.png', size: 512 }
];

dropZone.onclick = () => imageInput.click();

const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        cropperImage.src = e.target.result;
        dropZone.classList.add('hidden');
        editorContainer.classList.remove('hidden');
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropperImage, { 
            aspectRatio: 1, 
            viewMode: 1,
            autoCropArea: 1,
            background: false
        });
    };
    reader.readAsDataURL(file);
};

imageInput.onchange = (e) => handleFile(e.target.files[0]);
dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500'); };
dropZone.ondrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };

generateBtn.onclick = async () => {
    if (!cropper) return;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="spinner"></div>正在处理...';

    const sourceCanvas = cropper.getCroppedCanvas({ 
        width: 512, 
        height: 512, 
        imageSmoothingEnabled: true, 
        imageSmoothingQuality: 'high' 
    });
    
    const icoCanvases = [];

    for (const conf of configs) {
        // 特殊处理SVG格式
        if (conf.type === 'svg') {
            const svgBlob = createSVGFromCanvas(sourceCanvas);
            generatedBlobs[conf.name] = svgBlob;
            
            // 处理SVG预览
            if (conf.previews) {
                const url = URL.createObjectURL(svgBlob);
                conf.previews.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) { 
                        el.src = url; 
                        el.classList.remove('hidden'); 
                        // 为SVG预览添加动画效果
                        el.classList.add('animated');
                        // 为SVG预览设置样式
                        el.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        el.style.borderRadius = '8px';
                        el.style.padding = '4px';
                        el.style.objectFit = 'contain';
                    }
                });
            }
            continue;
        }
        
        // 处理PNG格式
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = conf.size;
        const ctx = canvas.getContext('2d');
        
        // 设置白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, conf.size, conf.size);
        
        // 高质量绘制
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 居中绘制图像
        const sourceSize = Math.min(sourceCanvas.width, sourceCanvas.height);
        ctx.drawImage(
            sourceCanvas,
            0, 0, sourceSize, sourceSize,
            0, 0, conf.size, conf.size
        );
        
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        generatedBlobs[conf.name] = blob;
        if (conf.inIco) icoCanvases.push(canvas);

        if (conf.previews) {
            const url = URL.createObjectURL(blob);
            conf.previews.forEach(id => {
                const el = document.getElementById(id);
                if (el) { 
                    el.src = url; 
                    el.classList.remove('hidden'); 
                    
                    if (id.includes('prev-ico')) {
                        el.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        el.style.borderRadius = '4px';
                        el.style.padding = '2px';
                    }
                }
            });
        }
    }

    generatedBlobs['favicon.ico'] = await encodeICO(icoCanvases);
    
    // 隐藏占位符
    document.getElementById('ios-placeholder').classList.add('hidden');
    document.getElementById('android-placeholder').classList.add('hidden');
    document.getElementById('svg-placeholder').classList.add('hidden');
    
    // 显示下载区域
    downloadArea.classList.remove('hidden');
    generateBtn.disabled = false;
    generateBtn.innerText = '重新生成';
};

downloadZipBtn.onclick = async () => {
    const zip = new JSZip();
    const icons = zip.folder("icons");
    for (const name in generatedBlobs) icons.file(name, generatedBlobs[name]);

    const manifest = {
        name: "Your App",
        short_name: "App",
        icons: [
            { src: "icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
        ],
        display: "standalone"
    };

    zip.file("site.webmanifest", JSON.stringify(manifest, null, 2));
    
    // 更新readme内容，包含SVG使用说明
    const readmeContent = `Favicon图标套件 - 部署说明

包含的文件：
1. favicon.ico - 传统ICO格式，包含16×16、32×32、48×48三种分辨率
2. favicon.svg - 矢量SVG格式，支持无限缩放，适合现代浏览器
3. apple-touch-icon.png - iOS主屏幕图标 (180×180)
4. android-chrome-192x192.png - Android Chrome图标
5. android-chrome-512x512.png - 高清PWA图标
6. 其他辅助尺寸图标

部署步骤：
1. 将 icons 文件夹上传到网站根目录
2. 在HTML的 <head> 部分添加以下代码：

<!-- 现代浏览器优先使用SVG -->
<link rel="icon" type="image/svg+xml" href="icons/favicon.svg">
<!-- 传统浏览器回退到ICO -->
<link rel="icon" href="icons/favicon.ico" sizes="any">
<!-- iOS设备 -->
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<!-- Android PWA支持 -->
<link rel="manifest" href="site.webmanifest">

3. 将site.webmanifest文件上传到根目录

SVG优势：
- 矢量格式，无限缩放不失真
- 文件体积小，加载速度快
- 现代浏览器优先支持
- 支持CSS样式和动画

注意：SVG在IE浏览器中支持有限，建议同时提供ICO格式作为回退。`;

    zip.file("readme.txt", readmeContent);

    const content = await zip.generateAsync({type:"blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `favicon_pack_${Date.now()}.zip`;
    link.click();
};