let uploadedLogoData = null;
const HISTORY_KEY = 'qr_history_final';

document.addEventListener("DOMContentLoaded", function() {
    const input = document.getElementById("qr-text");
    const logoInput = document.getElementById("logo-input");
    const logoUploadArea = document.getElementById("logo-upload-area");
    const logoPreview = document.getElementById("logo-preview");
    const removeLogoBtn = document.getElementById("remove-logo-btn");
    const uploadIcon = document.querySelector('.upload-icon');
    const uploadText = document.querySelector('.upload-text');
    const uploadHint = document.querySelector('.upload-hint');

    // 点击上传区域选择文件
    logoUploadArea.addEventListener('click', function(e) {
        // 如果点击的是移除按钮，不触发文件选择
        if (e.target.closest('.remove-logo-btn')) {
            return;
        }
        logoInput.click();
    });

    // 监听文件选择
    logoInput.addEventListener("change", function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                uploadedLogoData = e.target.result;
                
                // 显示预览
                logoPreview.src = uploadedLogoData;
                logoPreview.classList.add('show');
                
                // 添加上传区域样式
                logoUploadArea.classList.add('has-logo');
                
                // 隐藏上传图标和文字
                uploadIcon.style.display = 'none';
                uploadText.style.display = 'none';
                uploadHint.style.display = 'none';
                
                // 生成二维码
                if(input.value.trim()) generateQR(false);
            };
            reader.readAsDataURL(file);
        }
    });

    // 移除Logo
    removeLogoBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止事件冒泡到上传区域
        removeLogo();
    });

    // 监听所有设置变化
    ["enable-logo-check", "color-dark", "color-light", "size-input", "margin-input"].forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
            if(id.includes('input')) {
                document.getElementById(id.replace('input', 'display')).innerText = document.getElementById(id).value + "px";
            }
            if(input.value.trim()) generateQR(false);
        });
    });

    // 历史记录功能
    input.addEventListener('focus', renderHistoryDropdown);
    input.addEventListener('click', (e) => { e.stopPropagation(); renderHistoryDropdown(); });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target)) {
            document.getElementById('history-dropdown').classList.remove('show');
        }
    });

    input.addEventListener("keypress", (e) => { 
        if (e.key === "Enter") generateQR(true);
    });

    // 加载历史记录
    const history = getHistory();
    if(history.length > 0) {
        input.value = history[0];
        generateQR(false);
    }
    
    // 添加输入框自动聚焦
    setTimeout(() => {
        input.focus();
    }, 500);
});

function getHistory() { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }

function saveHistory(text) {
    let history = getHistory();
    history = [text, ...history.filter(i => i !== text)].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function deleteHistory(event, text) {
    event.stopPropagation();
    let history = getHistory().filter(i => i !== decodeURIComponent(text));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistoryDropdown();
}

function renderHistoryDropdown() {
    const history = getHistory();
    const dropdown = document.getElementById('history-dropdown');
    if (history.length === 0) { dropdown.classList.remove('show'); return; }
    
    dropdown.innerHTML = history.map(item => `
        <div class="history-item" onclick="selectHistory('${encodeURIComponent(item)}')">
            <span class="history-text">${item}</span>
            <span class="history-delete" onclick="deleteHistory(event, '${encodeURIComponent(item)}')">
                <i class="fas fa-times"></i>
            </span>
        </div>
    `).join('');
    dropdown.classList.add('show');
}

window.selectHistory = function(encodedText) {
    const text = decodeURIComponent(encodedText);
    document.getElementById("qr-text").value = text;
    document.getElementById('history-dropdown').classList.remove('show');
    generateQR(false);
};

function removeLogo() {
    uploadedLogoData = null;
    document.getElementById('logo-input').value = '';
    document.getElementById('logo-preview').classList.remove('show');
    document.getElementById('logo-upload-area').classList.remove('has-logo');
    
    // 显示上传图标和文字
    document.querySelector('.upload-icon').style.display = 'block';
    document.querySelector('.upload-text').style.display = 'block';
    document.querySelector('.upload-hint').style.display = 'block';
    
    if(document.getElementById("qr-text").value.trim()) generateQR(false);
}

function generateQR(shouldSave = true) {
    const inputEl = document.getElementById("qr-text");
    const text = inputEl.value.trim();

    if (!text) {
        if(shouldSave) {
            inputEl.classList.remove("error-shake");
            void inputEl.offsetWidth;
            inputEl.classList.add("error-shake");
            inputEl.focus();
            setTimeout(() => inputEl.classList.remove("error-shake"), 500);
        }
        return;
    }

    if (shouldSave) saveHistory(text);

    const size = parseInt(document.getElementById("size-input").value);
    const margin = parseInt(document.getElementById("margin-input").value);
    const useLogo = uploadedLogoData && document.getElementById("enable-logo-check").checked;

    const hiddenContainer = document.getElementById("hidden-qr-generator");
    hiddenContainer.innerHTML = "";

    new QRCode(hiddenContainer, {
        text: text,
        width: size,
        height: size,
        colorDark: document.getElementById("color-dark").value,
        colorLight: document.getElementById("color-light").value,
        correctLevel: useLogo ? QRCode.CorrectLevel.H : QRCode.CorrectLevel.M
    });

    setTimeout(() => {
        const canvas = hiddenContainer.querySelector("canvas");
        if (canvas) drawFinal(canvas, useLogo, size, margin);
    }, 100);
}

function drawFinal(qrCanvas, useLogo, qrSize, margin) {
    const finalCanvas = document.createElement("canvas");
    const totalSize = qrSize + (margin * 2);
    finalCanvas.width = totalSize;
    finalCanvas.height = totalSize;
    const ctx = finalCanvas.getContext("2d");

    const bgColor = document.getElementById("color-light").value;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalSize, totalSize);
    ctx.drawImage(qrCanvas, margin, margin);

    if (useLogo) {
        const logoImg = new Image();
        logoImg.onload = function() {
            const lSize = qrSize * 0.22;
            const pos = (totalSize - lSize) / 2;
            ctx.fillStyle = bgColor;
            ctx.fillRect(pos - 4, pos - 4, lSize + 8, lSize + 8);
            ctx.drawImage(logoImg, pos, pos, lSize, lSize);
            showResult(finalCanvas);
        };
        logoImg.src = uploadedLogoData;
    } else {
        showResult(finalCanvas);
    }
}

function showResult(canvas) {
    const img = document.getElementById("final-image");
    img.src = canvas.toDataURL("image/png");
    img.style.display = "block";
    document.getElementById("placeholder").style.display = "none";
    document.getElementById("download-btn").style.display = "flex";
}

function downloadQR() {
    const link = document.createElement("a");
    link.download = `QR_${Date.now()}.png`;
    link.href = document.getElementById("final-image").src;
    link.click();
}