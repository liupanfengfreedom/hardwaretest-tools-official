// script-en.js
// Core DOM Elements
const colorPicker = document.getElementById('colorPicker');
const hexInput = document.getElementById('hexInput');
const rgbInput = document.getElementById('rgbInput');
const hslInput = document.getElementById('hslInput');
const colorDisplay = document.getElementById('colorDisplay');
const currentHex = document.getElementById('currentHex');
const paletteContainer = document.getElementById('palettes');
const notification = document.getElementById('notification');

// Utility Elements
const contrastWhite = document.getElementById('contrastWhite');
const contrastBlack = document.getElementById('contrastBlack');
const contrastStatus = document.getElementById('contrastStatus');
const luminanceValue = document.getElementById('luminanceValue');
const perceivedLightness = document.getElementById('perceivedLightness');
const suggestedUse = document.getElementById('suggestedUse');
const hueValue = document.getElementById('hueValue');
const saturationValue = document.getElementById('saturationValue');
const lightnessValue = document.getElementById('lightnessValue');

// --- Core Color Conversion Functions ---
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

// --- Utility Functions ---
function calculateRelativeLuminance(r, g, b) {
    const rs = r / 255;
    const gs = g / 255;
    const bs = b / 255;
    
    const rl = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    const gl = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    const bl = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
    
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function calculateContrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

// --- UI Update Functions ---
function updateUI(hex) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    // Update displayed color
    colorDisplay.style.backgroundColor = hex;
    currentHex.textContent = hex.toUpperCase();
    colorPicker.value = hex;
    
    // Update input fields
    hexInput.value = hex.toUpperCase();
    rgbInput.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    hslInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    
    // Update utility information
    updateUtilities(rgb, hsl);
    
    // Generate palettes
    generatePalettes(hsl.h, hsl.s, hsl.l);
}

function updateUtilities(rgb, hsl) {
    // Update color information
    hueValue.textContent = `${hsl.h}°`;
    saturationValue.textContent = `${hsl.s}%`;
    lightnessValue.textContent = `${hsl.l}%`;
    
    // Calculate luminance
    const luminance = calculateRelativeLuminance(rgb.r, rgb.g, rgb.b);
    luminanceValue.textContent = luminance.toFixed(2);
    
    // Perceived lightness
    const perceived = hsl.l < 30 ? 'Dark' : hsl.l < 70 ? 'Medium' : 'Light';
    perceivedLightness.textContent = perceived;
    
    // Suggested use
    let use = 'Primary Color';
    if (hsl.s > 70 && hsl.l > 60) use = 'Accent Color, Buttons';
    else if (hsl.s < 30) use = 'Background, Text';
    else if (hsl.l < 30) use = 'Dark Background, Borders';
    suggestedUse.textContent = use;
    
    // Contrast calculation
    const whiteLuminance = 1;
    const blackLuminance = 0;
    const contrastWithWhite = calculateContrastRatio(luminance, whiteLuminance);
    const contrastWithBlack = calculateContrastRatio(blackLuminance, luminance);
    
    contrastWhite.textContent = contrastWithWhite.toFixed(1) + ':1';
    contrastBlack.textContent = contrastWithBlack.toFixed(1) + ':1';
    
    // Contrast status
    let status = '';
    let statusClass = '';
    if (contrastWithWhite >= 4.5 && contrastWithBlack >= 4.5) {
        status = '✅ Passes Accessibility Standards';
        statusClass = 'good';
    } else if (contrastWithWhite >= 3 || contrastWithBlack >= 3) {
        status = '⚠️ Partially Meets Standards';
        statusClass = 'fair';
    } else {
        status = '❌ Fails Accessibility Standards';
        statusClass = 'poor';
    }
    
    contrastStatus.textContent = status;
    contrastWhite.className = `contrast-ratio ${statusClass}`;
    contrastBlack.className = `contrast-ratio ${statusClass}`;
}

// --- Palette Generation ---
function generatePalettes(h, s, l) {
    const schemes = [
        {
            title: '補完的',
            colors: [
                { h: h, s: s, l: l },
                { h: (h + 180) % 360, s: s, l: l }
            ]
        },
        {
            title: '類似した',
            colors: [
                { h: (h + 330) % 360, s: s, l: l },
                { h: h, s: s, l: l },
                { h: (h + 30) % 360, s: s, l: l }
            ]
        },
        {
            title: 'トライアド',
            colors: [
                { h: h, s: s, l: l },
                { h: (h + 120) % 360, s: s, l: l },
                { h: (h + 240) % 360, s: s, l: l }
            ]
        },
        {
            title: '単色',
            colors: [
                { h: h, s: s, l: Math.max(l - 40, 10) },
                { h: h, s: s, l: Math.max(l - 20, 20) },
                { h: h, s: s, l: l },
                { h: h, s: s, l: Math.min(l + 20, 90) },
                { h: h, s: s, l: Math.min(l + 40, 95) }
            ]
        },
        {
            title: 'スプリットコンプリメンタリー',
            colors: [
                { h: h, s: s, l: l },
                { h: (h + 150) % 360, s: s, l: l },
                { h: (h + 210) % 360, s: s, l: l }
            ]
        },
        {
            title: '矩形',
            colors: [
                { h: h, s: s, l: l },
                { h: (h + 60) % 360, s: s, l: l },
                { h: (h + 180) % 360, s: s, l: l },
                { h: (h + 240) % 360, s: s, l: l }
            ]
        }
    ];

    paletteContainer.innerHTML = schemes.map(scheme => {
        const colors = scheme.colors.map(color => {
            const rgb = hslToRgb(color.h, color.s, color.l);
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            return { hex, rgb };
        });
        
        return `
            <div class="palette-card">
                <div class="palette-header">
                    <div class="palette-title">${scheme.title}</div>
                </div>
                <div class="palette-colors">
                    ${colors.map(color => `
                        <div class="color-item" 
                             style="background-color: ${color.hex}"
                             onclick="copyToClipboard('${color.hex}')"
                             data-color="${color.hex}">
                            <div class="color-tooltip">${color.hex}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// --- Input Validation and Event Handling ---
function isValidHex(hex) {
    return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
}

function parseRgb(rgbString) {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
        };
    }
    return null;
}

function parseHsl(hslString) {
    const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/i);
    if (match) {
        return {
            h: parseInt(match[1]),
            s: parseInt(match[2]),
            l: parseInt(match[3])
        };
    }
    return null;
}

// --- Event Listeners ---
colorPicker.addEventListener('input', (e) => {
    updateUI(e.target.value);
});

hexInput.addEventListener('input', (e) => {
    const hex = e.target.value;
    if (isValidHex(hex)) {
        updateUI(hex);
        hexInput.style.borderColor = '';
    } else {
        hexInput.style.borderColor = '#ef4444';
    }
});

rgbInput.addEventListener('input', (e) => {
    const rgb = parseRgb(e.target.value);
    if (rgb) {
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        updateUI(hex);
        rgbInput.style.borderColor = '';
    } else {
        rgbInput.style.borderColor = '#ef4444';
    }
});

hslInput.addEventListener('input', (e) => {
    const hsl = parseHsl(e.target.value);
    if (hsl) {
        const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        updateUI(hex);
        hslInput.style.borderColor = '';
    } else {
        hslInput.style.borderColor = '#ef4444';
    }
});

colorDisplay.addEventListener('click', () => {
    copyToClipboard(currentHex.textContent);
});

// --- Copy Functions ---
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification(`コピーしました: ${text}`);
    } catch (err) {
        console.error('Copy failed:', err);
        showNotification('コピーに失敗しました。手動でコピーしてください');
    }
}

function copyCurrentColor() {
    copyToClipboard(currentHex.textContent);
}

function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    notification.classList.add('success');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.classList.remove('success');
        }, 300);
    }, 2000);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    updateUI('#4A90E2');
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            copyCurrentColor();
        }
    });
});