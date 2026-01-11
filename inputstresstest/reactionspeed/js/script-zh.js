// 获取DOM元素
const reactionBox = document.getElementById('reactionBox');
const statusText = document.getElementById('statusText');
const timeDisplay = document.getElementById('timeDisplay');
const instruction = document.getElementById('instruction');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const shareResultBtn = document.getElementById('shareResultBtn');
const latestTime = document.getElementById('latestTime');
const fastestTime = document.getElementById('fastestTime');
const averageTime = document.getElementById('averageTime');
const testCount = document.getElementById('testCount');
const resultList = document.getElementById('resultList');
const shareModal = document.getElementById('shareModal');
const closeModal = document.getElementById('closeModal');
const copyNotification = document.getElementById('copyNotification');

// 状态变量
let testState = 'idle'; // idle, waiting, ready, result, tooSoon
let startTime = 0;
let endTime = 0;
let timer = null;
let reactionTimes = [];
let testNumber = 0;

// 初始化显示
updateStats();

// 开始测试按钮点击事件
startBtn.addEventListener('click', startTest);

// 重置按钮点击事件
resetBtn.addEventListener('click', resetTest);

// 分享结果按钮点击事件
shareResultBtn.addEventListener('click', showShareModal);

// 关闭弹窗按钮点击事件
closeModal.addEventListener('click', closeShareModal);

// 点击弹窗外部关闭弹窗
shareModal.addEventListener('click', function(e) {
    if (e.target === shareModal) {
        closeShareModal();
    }
});

// 反应区域点击事件
reactionBox.addEventListener('click', handleReactionClick);

// 开始测试函数
function startTest() {
    if (testState !== 'idle' && testState !== 'result') return;
    
    // 设置等待状态
    testState = 'waiting';
    reactionBox.className = 'reaction-box waiting';
    statusText.textContent = '等待屏幕变色...';
    timeDisplay.textContent = '--';
    instruction.textContent = '等待屏幕变为蓝色后立即点击';
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> 等待中...';
    
    // 随机等待时间（1-5秒）
    const waitTime = Math.random() * 4000 + 1000;
    
    // 设置定时器，在随机时间后变为可点击状态
    timer = setTimeout(() => {
        testState = 'ready';
        reactionBox.className = 'reaction-box ready pulse';
        statusText.textContent = '点击！';
        instruction.textContent = '立即点击屏幕！';
        startTime = Date.now();
    }, waitTime);
}

// 处理反应区域点击
function handleReactionClick() {
    switch(testState) {
        case 'waiting':
            // 点击过早
            testState = 'tooSoon';
            clearTimeout(timer);
            reactionBox.className = 'reaction-box too-soon';
            statusText.textContent = '点击过早！';
            timeDisplay.textContent = '0';
            instruction.textContent = '请等待屏幕变蓝后再点击';
            
            // 2秒后返回空闲状态
            setTimeout(() => {
                if (testState === 'tooSoon') {
                    testState = 'idle';
                    reactionBox.className = 'reaction-box waiting';
                    statusText.textContent = '点击开始按钮进行测试';
                    timeDisplay.textContent = '--';
                    instruction.textContent = '点击"开始测试"按钮，等待屏幕变为蓝色后立即点击此处';
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i class="fas fa-play-circle"></i> 开始测试';
                }
            }, 2000);
            break;
            
        case 'ready':
            // 正确点击，计算反应时间
            endTime = Date.now();
            const reactionTime = endTime - startTime;
            
            testState = 'result';
            reactionBox.className = 'reaction-box result';
            reactionBox.classList.remove('pulse');
            statusText.textContent = '完成！';
            timeDisplay.textContent = `${reactionTime} ms`;
            instruction.textContent = `反应时间: ${reactionTime} 毫秒`;
            
            // 保存结果
            reactionTimes.push(reactionTime);
            testNumber++;
            
            // 更新统计信息
            updateStats();
            
            // 添加到结果列表
            addResultToList(reactionTime);
            
            // 2秒后返回空闲状态
            setTimeout(() => {
                if (testState === 'result') {
                    testState = 'idle';
                    reactionBox.className = 'reaction-box waiting';
                    statusText.textContent = '点击开始按钮进行测试';
                    timeDisplay.textContent = '--';
                    instruction.textContent = '点击"开始测试"按钮，等待屏幕变为蓝色后立即点击此处';
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i class="fas fa-play-circle"></i> 开始测试';
                }
            }, 2000);
            break;
            
        case 'idle':
        case 'result':
            // 如果在空闲或结果状态点击，开始新测试
            startTest();
            break;
    }
}

// 更新统计信息
function updateStats() {
    if (reactionTimes.length === 0) {
        latestTime.textContent = '--';
        fastestTime.textContent = '--';
        averageTime.textContent = '--';
        testCount.textContent = '0';
        return;
    }
    
    // 最新反应时间
    latestTime.textContent = `${reactionTimes[reactionTimes.length - 1]} ms`;
    
    // 最快反应时间
    const fastest = Math.min(...reactionTimes);
    fastestTime.textContent = `${fastest} ms`;
    
    // 平均反应时间
    const sum = reactionTimes.reduce((a, b) => a + b, 0);
    const average = Math.round(sum / reactionTimes.length);
    averageTime.textContent = `${average} ms`;
    
    // 测试次数
    testCount.textContent = reactionTimes.length;
}

// 添加结果到列表
function addResultToList(time) {
    // 移除"暂无测试记录"提示
    if (resultList.children.length === 1 && resultList.children[0].querySelector('.result-number').textContent === '暂无测试记录') {
        resultList.innerHTML = '';
    }
    
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    const level = getReactionLevel(time);
    const levelClass = level.toLowerCase();
    
    // 根据反应时间设置不同的边框颜色
    let borderColor = '#60a5fa'; // 默认蓝色
    if (time < 200) borderColor = '#10b981'; // 极快 - 绿色
    else if (time < 300) borderColor = '#f59e0b'; // 良好 - 黄色
    else if (time < 500) borderColor = '#f97316'; // 一般 - 橙色
    else borderColor = '#ef4444'; // 较慢 - 红色
    
    resultItem.style.borderLeftColor = borderColor;
    
    resultItem.innerHTML = `
        <span class="result-number">测试 #${testNumber} <span class="level ${levelClass}">${level}</span></span>
        <span class="result-time">${time} ms</span>
    `;
    
    // 将新结果添加到列表顶部
    resultList.prepend(resultItem);
    
    // 限制最多显示10条记录
    if (resultList.children.length > 10) {
        resultList.removeChild(resultList.lastChild);
    }
}

// 根据反应时间获取等级
function getReactionLevel(time) {
    if (time < 200) return '极快';
    if (time < 250) return '优秀';
    if (time < 300) return '良好';
    if (time < 400) return '一般';
    if (time < 500) return '较慢';
    return '很慢';
}

// 重置测试
function resetTest() {
    testState = 'idle';
    clearTimeout(timer);
    
    reactionBox.className = 'reaction-box waiting';
    statusText.textContent = '点击开始按钮进行测试';
    timeDisplay.textContent = '--';
    instruction.textContent = '点击"开始测试"按钮，等待屏幕变为蓝色后立即点击此处';
    
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play-circle"></i> 开始测试';
    
    // 重置数据
    reactionTimes = [];
    testNumber = 0;
    
    // 重置结果列表
    resultList.innerHTML = `
        <div class="result-item">
            <span class="result-number">暂无测试记录</span>
            <span class="result-time">--</span>
        </div>
    `;
    
    updateStats();
}

// 显示分享弹窗
function showShareModal() {
    if (reactionTimes.length === 0) {
        // 使用更美观的提示
        copyNotification.textContent = '请先完成至少一次测试，然后分享你的结果！';
        copyNotification.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
        copyNotification.style.display = 'block';
        setTimeout(() => {
            copyNotification.style.display = 'none';
            copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
            copyNotification.textContent = '链接已复制到剪贴板！';
        }, 3000);
        return;
    }
    
    // 显示弹窗
    shareModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // 防止背景滚动
    
    // 设置分享按钮
    setupShareButtons();
}

// 关闭分享弹窗
function closeShareModal() {
    shareModal.classList.remove('active');
    document.body.style.overflow = 'auto'; // 恢复背景滚动
}

// 设置分享按钮
function setupShareButtons() {
    // 获取当前URL
    const currentUrl = window.location.href;
    const fastest = reactionTimes.length > 0 ? Math.min(...reactionTimes) : '--';
    const average = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : '--';
    const latest = reactionTimes.length > 0 ? reactionTimes[reactionTimes.length - 1] : '--';
    
    // 分享文本
    const shareText = `反应速度测试结果：最快${fastest}ms，平均${average}ms，最新${latest}ms！你也来测试一下你的反应速度吧：`;
    const shareTitle = `我的反应速度测试结果：最快${fastest}ms，平均${average}ms`;
    
    // Twitter分享
    document.getElementById('shareTwitter').href = `https://twitter.com/share?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
    
    // Reddit分享
    document.getElementById('shareReddit').href = `https://www.reddit.com/submit?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(shareTitle)}`;
    
    // Facebook分享
    document.getElementById('shareFacebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    
    // Telegram分享
    document.getElementById('shareTelegram').href = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
    
    // WhatsApp分享
    document.getElementById('shareWhatsapp').href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + currentUrl)}`;
    
    // 复制链接
    const copyLinkBtn = document.getElementById('copyLink');
    // 移除之前的事件监听器（避免重复绑定）
    const newCopyLinkBtn = copyLinkBtn.cloneNode(true);
    copyLinkBtn.parentNode.replaceChild(newCopyLinkBtn, copyLinkBtn);
    
    newCopyLinkBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const textToCopy = `${shareText} ${currentUrl}`;
        copyToClipboard(textToCopy);
        
        // 显示通知
        copyNotification.textContent = '链接已复制到剪贴板！';
        copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        copyNotification.style.display = 'block';
        setTimeout(() => {
            copyNotification.style.display = 'none';
        }, 3000);
        
        // 关闭弹窗
        closeShareModal();
    });
    
    // 为所有分享链接设置target="_blank"
    const shareLinks = document.querySelectorAll('.share-button');
    shareLinks.forEach(link => {
        if (link.id !== 'copyLink') {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
    });
}

// 复制到剪贴板
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
    } else {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

// 添加键盘快捷键支持
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
        if (testState === 'idle' || testState === 'result') {
            startTest();
            e.preventDefault();
        } else if (testState === 'ready') {
            handleReactionClick();
            e.preventDefault();
        }
    } else if (e.code === 'Escape') {
        if (shareModal.classList.contains('active')) {
            closeShareModal();
        } else {
            resetTest();
        }
    } else if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        showShareModal();
    }
});

// 页脚链接功能
function showPrivacyPolicy() {
    copyNotification.textContent = '隐私政策：我们不会收集或存储您的任何个人数据。所有测试结果仅存储在您的浏览器本地，不会上传到任何服务器。';
    copyNotification.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    copyNotification.style.display = 'block';
    setTimeout(() => {
        copyNotification.style.display = 'none';
        copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        copyNotification.textContent = '链接已复制到剪贴板！';
    }, 5000);
}

function showTerms() {
    copyNotification.textContent = '使用条款：本工具仅供娱乐和自测使用，不应用于专业医疗或职业评估。';
    copyNotification.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
    copyNotification.style.display = 'block';
    setTimeout(() => {
        copyNotification.style.display = 'none';
        copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        copyNotification.textContent = '链接已复制到剪贴板！';
    }, 5000);
}

function showFAQ() {
    copyNotification.textContent = '常见问题：1. 如何获得更快的反应时间？ - 保持专注，定期练习 2. 为什么我的反应时间不稳定？ - 疲劳、分心等因素都会影响反应时间 3. 可以无限次测试吗？ - 是的，完全免费，无限次使用';
    copyNotification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    copyNotification.style.display = 'block';
    setTimeout(() => {
        copyNotification.style.display = 'none';
        copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        copyNotification.textContent = '链接已复制到剪贴板！';
    }, 5000);
}

// 页面加载完成后，为分享按钮添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 点击分享按钮时显示分享弹窗
    shareResultBtn.addEventListener('click', showShareModal);
});