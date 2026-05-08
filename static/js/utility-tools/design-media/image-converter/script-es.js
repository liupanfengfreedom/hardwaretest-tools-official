const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const queueBody = document.getElementById('queue-body');
const btnRun = document.getElementById('btn-run');
const btnDownloadMain = document.getElementById('btn-download-main');
const hintText = document.getElementById('hint-text');
let fileQueue = [];

// --- UI Control ---
document.getElementById('scale-mode').onchange = function() {
    ['percent', 'width', 'height', 'free'].forEach(m => {
        const el = document.getElementById(`m-${m}`);
        if (el) el.style.display = (this.value === m ? 'block' : 'none');
    });
    markDirty();
};

function updateFileCount() {
    const count = fileQueue.length;
    if (count > 0) {
        document.querySelector('header p').innerHTML = `Local Processing · Size Comparison Preview · Full Format Support <span class="file-count">${count}</span>`;
    } else {
        document.querySelector('header p').innerText = 'Local Processing · Size Comparison Preview · Full Format Support';
    }
}

function markDirty() {
    if (fileQueue.length === 0) return;
    hintText.style.opacity = '1';
    btnDownloadMain.classList.remove('show');
    btnRun.style.opacity = '1';
    btnRun.disabled = false;
    btnRun.innerHTML = '<i class="fas fa-sync-alt"></i> Reprocess';
    fileQueue.forEach(item => {
        if (item.status === 'done') {
            item.status = 'dirty';
            const badge = document.getElementById(`st-${item.id}`);
            if (badge) { 
                badge.innerText = 'Needs Update'; 
                badge.className = 'status-badge status-dirty';
                badge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Needs Update';
            }
        }
    });
}

document.querySelectorAll('.param-input').forEach(el => el.oninput = markDirty);

// --- File Import ---
dropZone.onclick = () => fileInput.click();
dropZone.ondragover = e => { 
    e.preventDefault(); 
    dropZone.style.borderColor = "var(--primary)"; 
    dropZone.classList.add('active');
};
dropZone.ondragleave = () => { 
    dropZone.style.borderColor = "#d1d5db"; 
    dropZone.classList.remove('active');
};
dropZone.ondrop = e => { 
    e.preventDefault(); 
    dropZone.style.borderColor = "#d1d5db"; 
    dropZone.classList.remove('active');
    handleFiles(e.dataTransfer.files); 
};
fileInput.onchange = e => handleFiles(e.target.files);

async function handleFiles(files) {
    if (files.length === 0) return;
    document.getElementById('list-card').style.display = 'block';
    btnRun.style.opacity = '1';
    btnRun.disabled = false;
    btnDownloadMain.classList.remove('show');
    btnRun.innerHTML = '<i class="fas fa-bolt"></i> Start Processing';

    for (const file of files) {
        const id = Math.random().toString(36).substr(2, 8);
        const item = { id, file, status: 'wait', resultBlob: null, origUrl: null, resultUrl: null };
        fileQueue.push(item);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img class="thumb-preview" id="t-${id}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48' fill='%23e2e8f0'%3E%3Cpath d='M38 8H10c-2.2 0-4 1.8-4 4v24c0 2.2 1.8 4 4 4h28c2.2 0 4-1.8 4-4V12c0-2.2-1.8-4-4-4zM19 26l-5 7h20l-6-8-4 5-5-4z'/%3E%3C/svg%3E"></td>
            <td><div style="font-weight:700;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</div></td>
            <td><div class="size-info" id="sz-${id}"><i class="fas fa-spinner fa-spin"></i> Loading</div></td>
            <td><span class="status-badge status-wait" id="st-${id}"><i class="fas fa-clock"></i> Waiting</span></td>
            <td>
                <div class="btn-group">
                    <button class="btn-action btn-orig" id="vo-${id}"><i class="fas fa-eye"></i> Original</button>
                    <button class="btn-action btn-result" id="vr-${id}"><i class="fas fa-magic"></i> Result</button>
                </div>
            </td>
        `;
        queueBody.appendChild(tr);

        try {
            // Read original image and calculate dimensions
            const canvas = await fileToCanvas(file);
            item.origW = canvas.width;
            item.origH = canvas.height;
            item.origUrl = canvas.toDataURL('image/jpeg', 0.9); // For preview
            
            document.getElementById(`sz-${id}`).innerHTML = `<span>${item.origW}×${item.origH}</span>`;
            document.getElementById(`t-${id}`).src = canvas.toDataURL('image/jpeg', 0.2);
            
            // Bind original image preview
            document.getElementById(`vo-${id}`).onclick = () => showPreview(item.origUrl, 'Original Image Preview');
            
            // Update file count
            updateFileCount();
        } catch(e) {
            console.error(e);
            document.getElementById(`sz-${id}`).innerHTML = '<span style="color:var(--warning)"><i class="fas fa-exclamation-triangle"></i> Read Failed</span>';
        }
    }
}

// --- Core Conversion Logic ---
async function fileToCanvas(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    // SVG format handling
    if (ext === 'svg') {
        return await svgToCanvas(file);
    }
    
    // HEIC/HEIF handling
    if (ext === 'heic' || ext === 'heif') {
        const blob = await heic2any({ blob: file, toType: "image/jpeg" });
        return await imgUrlToCanvas(URL.createObjectURL(blob[0] || blob));
    }
    
    // TIFF handling
    if (ext === 'tiff' || ext === 'tif') {
        const buffer = await file.arrayBuffer();
        const ifds = UTIF.decode(buffer);
        UTIF.decodeImage(buffer, ifds[0]);
        const rgba = UTIF.toRGBA8(ifds[0]);
        const cvs = document.createElement('canvas');
        cvs.width = ifds[0].width; cvs.height = ifds[0].height;
        cvs.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer), cvs.width, cvs.height), 0, 0);
        return cvs;
    }
    
    // Other image formats
    return await imgUrlToCanvas(URL.createObjectURL(file));
}

// SVG to Canvas function
async function svgToCanvas(file) {
    return new Promise(async (resolve, reject) => {
        try {
            const text = await file.text();
            const svgContent = text;
            
            // Create SVG element
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;
            
            // Get SVG dimensions
            let width = parseFloat(svgElement.getAttribute('width'));
            let height = parseFloat(svgElement.getAttribute('height'));
            
            // If no explicit width/height, try to get from viewBox
            if (!width || !height) {
                const viewBox = svgElement.getAttribute('viewBox');
                if (viewBox) {
                    const viewBoxParts = viewBox.split(' ').map(Number);
                    if (viewBoxParts.length >= 4) {
                        width = viewBoxParts[2] || 300;
                        height = viewBoxParts[3] || 150;
                    }
                }
            }
            
            // If still no dimensions, use defaults
            if (!width || !height || isNaN(width) || isNaN(height)) {
                width = 300;
                height = 150;
            }
            
            // Create Image object
            const img = new Image();
            const svgBlob = new Blob([text], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = function() {
                // Create Canvas
                const cvs = document.createElement('canvas');
                cvs.width = width;
                cvs.height = height;
                
                // Draw SVG to Canvas
                const ctx = cvs.getContext('2d');
                
                // Set white background (SVG is usually transparent)
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                
                // Draw SVG
                ctx.drawImage(img, 0, 0, width, height);
                
                // Clean up URL
                URL.revokeObjectURL(url);
                resolve(cvs);
            };
            
            img.onerror = function() {
                URL.revokeObjectURL(url);
                reject(new Error('SVG loading failed'));
            };
            
            img.src = url;
            
        } catch (error) {
            reject(error);
        }
    });
}

function imgUrlToCanvas(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const cvs = document.createElement('canvas');
            cvs.width = img.width; cvs.height = img.height;
            cvs.getContext('2d').drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            resolve(cvs);
        };
        img.onerror = reject;
        img.src = url;
    });
}

function showPreview(url, title) {
    document.getElementById('modal-img').src = url;
    document.getElementById('modal-tag').innerHTML = `<i class="fas fa-search"></i> ${title}`;
    document.getElementById('modal').style.display = 'flex';
}

// --- Start Processing ---
btnRun.onclick = async () => {
    btnRun.disabled = true;
    btnRun.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    hintText.style.opacity = '0';
    const pBar = document.getElementById('p-bar');
    const pInner = document.getElementById('p-inner');
    pBar.style.opacity = '1';

    const mode = document.getElementById('scale-mode').value;
    const targetFormat = document.getElementById('o-format').value;

    for (let i = 0; i < fileQueue.length; i++) {
        const item = fileQueue[i];
        if (item.status === 'done') continue;

        const badge = document.getElementById(`st-${item.id}`);
        badge.innerHTML = '<i class="fas fa-cog fa-spin"></i> Processing';
        badge.className = 'status-badge status-ing';

        await new Promise(r => setTimeout(r, 30));

        try {
            const src = await fileToCanvas(item.file);
            let tw, th;
            if (mode === 'percent') {
                const r = (parseInt(document.getElementById('i-percent').value) || 100) / 100;
                tw = src.width * r; th = src.height * r;
            } else if (mode === 'width') {
                tw = parseInt(document.getElementById('i-width').value) || src.width;
                th = (tw / src.width) * src.height;
            } else if (mode === 'height') {
                th = parseInt(document.getElementById('i-height').value) || src.height;
                tw = (th / src.height) * src.width;
            } else {
                tw = parseInt(document.getElementById('i-free-w').value) || src.width;
                th = parseInt(document.getElementById('i-free-h').value) || src.height;
            }
            
            // Round dimensions
            tw = Math.round(tw); th = Math.round(th);

            const cvs = document.createElement('canvas');
            cvs.width = tw; cvs.height = th;
            const ctx = cvs.getContext('2d');
            ctx.imageSmoothingEnabled = true; 
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(src, 0, 0, tw, th);

            if (targetFormat === 'image/tiff') {
                const rgba = ctx.getImageData(0, 0, tw, th).data;
                item.resultBlob = new Blob([UTIF.encodeImage(rgba, tw, th)], { type: 'image/tiff' });
            } else {
                item.resultBlob = await new Promise(r => cvs.toBlob(r, targetFormat, 0.92));
            }

            // Update status and URL
            if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
            item.resultUrl = URL.createObjectURL(item.resultBlob);
            item.status = 'done';

            // Update size comparison in UI
            document.getElementById(`sz-${item.id}`).innerHTML = `
                <span>${item.origW}×${item.origH}</span>
                <span style="color:#cbd5e1"><i class="fas fa-arrow-right"></i></span>
                <span class="size-target">${tw}×${th}</span>
            `;

            badge.innerHTML = '<i class="fas fa-check-circle"></i> Ready';
            badge.className = 'status-badge status-done';
            
            const rBtn = document.getElementById(`vr-${item.id}`);
            rBtn.style.display = 'flex';
            rBtn.onclick = () => showPreview(item.resultUrl, 'Processed Result Preview');
            
            pInner.style.width = `${((i+1)/fileQueue.length)*100}%`;
        } catch(e) {
            console.error(`Error processing file ${item.file.name}:`, e);
            badge.innerHTML = '<i class="fas fa-times-circle"></i> Failed';
            badge.className = 'status-badge status-dirty';
        }
    }

    btnRun.style.opacity = '0';
    setTimeout(() => {
        if (fileQueue.length === 1) {
            btnDownloadMain.innerHTML = '<i class="fas fa-download"></i> Save to Computer';
        } else {
            btnDownloadMain.innerHTML = `<i class="fas fa-file-archive"></i> Download All (${fileQueue.length} images)`;
        }
        btnDownloadMain.classList.add('show');
        pBar.style.opacity = '0';
        btnRun.innerHTML = '<i class="fas fa-sync-alt"></i> Reprocess';
    }, 400);
};

// --- Download Results ---
btnDownloadMain.onclick = async () => {
    const format = document.getElementById('o-format').value;
    const extMap = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/bmp': 'bmp',
        'image/tiff': 'tiff'
    };
    const ext = extMap[format] || 'png';
    
    if (fileQueue.length === 1) {
        const a = document.createElement('a');
        a.href = fileQueue[0].resultUrl;
        // For SVG files, keep original filename prefix
        const baseName = fileQueue[0].file.name.split('.')[0];
        a.download = `${baseName}_converted.${ext}`;
        a.click();
    } else {
        btnDownloadMain.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Packaging...';
        try {
            const zip = new JSZip();
            fileQueue.forEach(item => {
                if (item.resultBlob) {
                    const baseName = item.file.name.split('.')[0];
                    zip.file(`${baseName}.${ext}`, item.resultBlob);
                }
            });
            const content = await zip.generateAsync({type:"blob"});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = `Privacy_Studio_Export_${new Date().toISOString().slice(0,10)}.zip`;
            a.click();
        } finally {
            setTimeout(() => {
                if (fileQueue.length === 1) {
                    btnDownloadMain.innerHTML = '<i class="fas fa-download"></i> Save to Computer';
                } else {
                    btnDownloadMain.innerHTML = `<i class="fas fa-file-archive"></i> Download All (${fileQueue.length} images)`;
                }
            }, 500);
        }
    }
};