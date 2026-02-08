// Core ICO building logic
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

// New: Function to create SVG file from canvas
function createSVGFromCanvas(canvas) {
    const svgSize = 512;
    const pngDataUrl = canvas.toDataURL('image/png');
    
    // Create SVG string
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

// Modified configuration array, adding SVG configuration
const configs = [
    { name: 'favicon-16x16.png', size: 16, previews: ['prev-search', 'prev-tab', 'prev-ico-16'], inIco: true },
    { name: 'favicon-32x32.png', size: 32, previews: ['prev-ico-32'], inIco: true },
    { name: 'favicon-48x48.png', size: 48, previews: ['prev-ico-48'], inIco: true },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'favicon.svg', size: 512, type: 'svg', previews: ['prev-svg'] }, // New SVG configuration
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
    generateBtn.innerHTML = '<div class="spinner"></div>Processing...';

    const sourceCanvas = cropper.getCroppedCanvas({ 
        width: 512, 
        height: 512, 
        imageSmoothingEnabled: true, 
        imageSmoothingQuality: 'high' 
    });
    
    const icoCanvases = [];

    for (const conf of configs) {
        // Special handling for SVG format
        if (conf.type === 'svg') {
            const svgBlob = createSVGFromCanvas(sourceCanvas);
            generatedBlobs[conf.name] = svgBlob;
            
            // Handle SVG preview
            if (conf.previews) {
                const url = URL.createObjectURL(svgBlob);
                conf.previews.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) { 
                        el.src = url; 
                        el.classList.remove('hidden'); 
                        // Add animation effect for SVG preview
                        el.classList.add('animated');
                        // Set style for SVG preview
                        el.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        el.style.borderRadius = '8px';
                        el.style.padding = '4px';
                        el.style.objectFit = 'contain';
                    }
                });
            }
            continue;
        }
        
        // Handle PNG format
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = conf.size;
        const ctx = canvas.getContext('2d');
        
        // Set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, conf.size, conf.size);
        
        // High quality drawing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Center draw image
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
    
    // Hide placeholders
    document.getElementById('ios-placeholder').classList.add('hidden');
    document.getElementById('android-placeholder').classList.add('hidden');
    document.getElementById('svg-placeholder').classList.add('hidden');
    
    // Show download area
    downloadArea.classList.remove('hidden');
    generateBtn.disabled = false;
    generateBtn.innerText = 'Regenerate';
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
    
    // Update readme content, include SVG usage instructions
    const readmeContent = `Favicon Icon Kit - Deployment Instructions

Included files:
1. favicon.ico - Traditional ICO format, contains 16×16, 32×32, 48×48 three resolutions
2. favicon.svg - Vector SVG format, supports infinite scaling, suitable for modern browsers
3. apple-touch-icon.png - iOS home screen icon (180×180)
4. android-chrome-192x192.png - Android Chrome icon
5. android-chrome-512x512.png - High-definition PWA icon
6. Other auxiliary size icons

Deployment steps:
1. Upload the icons folder to your website root directory
2. Add the following code to the HTML <head> section:

<!-- Modern browsers prioritize SVG -->
<link rel="icon" type="image/svg+xml" href="icons/favicon.svg">
<!-- Traditional browser fallback to ICO -->
<link rel="icon" href="icons/favicon.ico" sizes="any">
<!-- iOS devices -->
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<!-- Android PWA support -->
<link rel="manifest" href="site.webmanifest">

3. Upload the site.webmanifest file to the root directory

SVG advantages:
- Vector format, infinite scaling without distortion
- Small file size, fast loading
- Priority support in modern browsers
- Supports CSS styling and animation

Note: SVG has limited support in IE browsers, recommend providing ICO format as fallback.`;

    zip.file("readme.txt", readmeContent);

    const content = await zip.generateAsync({type:"blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `favicon_pack_${Date.now()}.zip`;
    link.click();
};