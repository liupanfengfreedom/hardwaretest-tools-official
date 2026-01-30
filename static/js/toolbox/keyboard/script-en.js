// /static/js/toolbox/keyboard/script-en.js

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.key').forEach(keyEl => {
        const counter = document.createElement('span');
        counter.className = 'key-counter';
        counter.innerText = '0';
        keyEl.appendChild(counter);
    });
});

const activeCountEl = document.getElementById('count-active');
const testedCountEl = document.getElementById('count-tested');
const totalCountEl = document.getElementById('count-total');

const infoKey = document.getElementById('info-key');
const infoCode = document.getElementById('info-code');
const infoWhich = document.getElementById('info-which');
const infoTime = document.getElementById('info-time'); 

let pressedKeys = new Set(); 
let testedKeys = new Set(); 
let keyCounts = {};       
let totalKeystrokes = 0;
let lastKeyTimestamp = 0;

document.addEventListener('keydown', (e) => {
    e.preventDefault();
    
    const currentTimestamp = performance.now(); 
    let timeDelta = 0;

    if (lastKeyTimestamp !== 0) {
        timeDelta = Math.round(currentTimestamp - lastKeyTimestamp);
        // [English Specific] Unit
        infoTime.innerText = `${timeDelta} ms`;
    } else {
        // [English Specific] Start text
        infoTime.innerText = 'Start'; 
    }
    
    lastKeyTimestamp = currentTimestamp;

    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    
    totalKeystrokes++;
    
    if (!keyCounts[e.code]) keyCounts[e.code] = 0;
    keyCounts[e.code]++;

    if (keyEl) {
        keyEl.classList.add('active');
        keyEl.classList.add('tested');
        
        let counter = keyEl.querySelector('.key-counter');
        if (!counter) {
            counter = document.createElement('span');
            counter.className = 'key-counter';
            keyEl.appendChild(counter);
        }
        counter.innerText = keyCounts[e.code];
    }

    pressedKeys.add(e.code);
    testedKeys.add(e.code);
    
    updateStats();
    updateInfo(e);
});

document.addEventListener('keyup', (e) => {
    e.preventDefault();
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) {
        keyEl.classList.remove('active');
    }
    pressedKeys.delete(e.code);
    updateStats();
});

function updateStats() {
    activeCountEl.innerText = pressedKeys.size;
    testedCountEl.innerText = testedKeys.size;
    totalCountEl.innerText = totalKeystrokes;
    
    if (pressedKeys.size > 6) {
        activeCountEl.style.color = '#ff4444';
    } else {
        activeCountEl.style.color = '';
    }
}

function updateInfo(e) {
    // [English Specific] Just use the standard key name
    infoKey.innerText = e.key;
    infoCode.innerText = e.code;
    infoWhich.innerText = e.which;
}

window.resetTest = function() {
    pressedKeys.clear();
    testedKeys.clear();
    keyCounts = {};
    totalKeystrokes = 0;
    lastKeyTimestamp = 0; 

    document.querySelectorAll('.key').forEach(el => {
        el.classList.remove('active');
        el.classList.remove('tested');
        const counter = el.querySelector('.key-counter');
        if (counter) counter.innerText = '0';
    });

    updateStats();
    infoKey.innerText = '-';
    infoCode.innerText = '-';
    infoWhich.innerText = '-';
    infoTime.innerText = '- ms'; 
}

window.addEventListener('blur', () => {
    pressedKeys.clear();
    document.querySelectorAll('.key.active').forEach(el => el.classList.remove('active'));
    updateStats();
});