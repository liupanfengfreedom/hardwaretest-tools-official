// Get DOM elements
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

// State variables
let testState = 'idle'; // idle, waiting, ready, result, tooSoon
let startTime = 0;
let endTime = 0;
let timer = null;
let reactionTimes = [];
let testNumber = 0;

// Initialize display
updateStats();

// Start test button click event
startBtn.addEventListener('click', startTest);

// Reset button click event
resetBtn.addEventListener('click', resetTest);

// Share results button click event
shareResultBtn.addEventListener('click', showShareModal);

// Close modal button click event
closeModal.addEventListener('click', closeShareModal);

// Click outside modal to close
shareModal.addEventListener('click', function(e) {
    if (e.target === shareModal) {
        closeShareModal();
    }
});

// Reaction area click event
reactionBox.addEventListener('click', handleReactionClick);

// Start test function
function startTest() {
    if (testState !== 'idle' && testState !== 'result') return;
    
    // Set waiting state
    testState = 'waiting';
    reactionBox.className = 'reaction-box waiting';
    statusText.textContent = 'Waiting for screen to change color...';
    timeDisplay.textContent = '--';
    instruction.textContent = 'Wait for screen to turn blue, then click immediately';
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> Waiting...';
    
    // Random wait time (1-5 seconds)
    const waitTime = Math.random() * 4000 + 1000;
    
    // Set timer to change to ready state after random time
    timer = setTimeout(() => {
        testState = 'ready';
        reactionBox.className = 'reaction-box ready pulse';
        statusText.textContent = 'Click!';
        instruction.textContent = 'Click the screen now!';
        startTime = Date.now();
    }, waitTime);
}

// Handle reaction area click
function handleReactionClick() {
    switch(testState) {
        case 'waiting':
            // Clicked too soon
            testState = 'tooSoon';
            clearTimeout(timer);
            reactionBox.className = 'reaction-box too-soon';
            statusText.textContent = 'Clicked Too Soon!';
            timeDisplay.textContent = '0';
            instruction.textContent = 'Please wait for screen to turn blue before clicking';
            
            // Return to idle state after 2 seconds
            setTimeout(() => {
                if (testState === 'tooSoon') {
                    testState = 'idle';
                    reactionBox.className = 'reaction-box waiting';
                    statusText.textContent = 'Click Start Button to Begin Test';
                    timeDisplay.textContent = '--';
                    instruction.textContent = 'Click "Start Test" button, wait for screen to turn blue, then click immediately';
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i class="fas fa-play-circle"></i> Start Test';
                }
            }, 2000);
            break;
            
        case 'ready':
            // Correct click, calculate reaction time
            endTime = Date.now();
            const reactionTime = endTime - startTime;
            
            testState = 'result';
            reactionBox.className = 'reaction-box result';
            reactionBox.classList.remove('pulse');
            statusText.textContent = 'Complete!';
            timeDisplay.textContent = `${reactionTime} ms`;
            instruction.textContent = `Reaction Time: ${reactionTime} ms`;
            
            // Save result
            reactionTimes.push(reactionTime);
            testNumber++;
            
            // Update statistics
            updateStats();
            
            // Add to result list
            addResultToList(reactionTime);
            
            // Return to idle state after 2 seconds
            setTimeout(() => {
                if (testState === 'result') {
                    testState = 'idle';
                    reactionBox.className = 'reaction-box waiting';
                    statusText.textContent = 'Click Start Button to Begin Test';
                    timeDisplay.textContent = '--';
                    instruction.textContent = 'Click "Start Test" button, wait for screen to turn blue, then click immediately';
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i class="fas fa-play-circle"></i> Start Test';
                }
            }, 2000);
            break;
            
        case 'idle':
        case 'result':
            // If clicked in idle or result state, start new test
            startTest();
            break;
    }
}

// Update statistics
function updateStats() {
    if (reactionTimes.length === 0) {
        latestTime.textContent = '--';
        fastestTime.textContent = '--';
        averageTime.textContent = '--';
        testCount.textContent = '0';
        return;
    }
    
    // Latest reaction time
    latestTime.textContent = `${reactionTimes[reactionTimes.length - 1]} ms`;
    
    // Fastest reaction time
    const fastest = Math.min(...reactionTimes);
    fastestTime.textContent = `${fastest} ms`;
    
    // Average reaction time
    const sum = reactionTimes.reduce((a, b) => a + b, 0);
    const average = Math.round(sum / reactionTimes.length);
    averageTime.textContent = `${average} ms`;
    
    // Test count
    testCount.textContent = reactionTimes.length;
}

// Add result to list
function addResultToList(time) {
    // Remove "No test records yet" message
    if (resultList.children.length === 1 && resultList.children[0].querySelector('.result-number').textContent === 'No test records yet') {
        resultList.innerHTML = '';
    }
    
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    const level = getReactionLevel(time);
    const levelClass = level.toLowerCase();
    
    // Set different border colors based on reaction time
    let borderColor = '#60a5fa'; // Default blue
    if (time < 200) borderColor = '#10b981'; // Excellent - green
    else if (time < 300) borderColor = '#f59e0b'; // Good - yellow
    else if (time < 500) borderColor = '#f97316'; // Average - orange
    else borderColor = '#ef4444'; // Slow - red
    
    resultItem.style.borderLeftColor = borderColor;
    
    resultItem.innerHTML = `
        <span class="result-number">Test #${testNumber} <span class="level ${levelClass}">${level}</span></span>
        <span class="result-time">${time} ms</span>
    `;
    
    // Add new result to top of list
    resultList.prepend(resultItem);
    
    // Limit to 10 records
    if (resultList.children.length > 10) {
        resultList.removeChild(resultList.lastChild);
    }
}

// Get reaction level based on time
function getReactionLevel(time) {
    if (time < 200) return 'Excellent';
    if (time < 250) return 'Great';
    if (time < 300) return 'Good';
    if (time < 400) return 'Average';
    if (time < 500) return 'Slow';
    return 'Very Slow';
}

// Reset test
function resetTest() {
    testState = 'idle';
    clearTimeout(timer);
    
    reactionBox.className = 'reaction-box waiting';
    statusText.textContent = 'Click Start Button to Begin Test';
    timeDisplay.textContent = '--';
    instruction.textContent = 'Click "Start Test" button, wait for screen to turn blue, then click immediately';
    
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play-circle"></i> Start Test';
    
    // Reset data
    reactionTimes = [];
    testNumber = 0;
    
    // Reset result list
    resultList.innerHTML = `
        <div class="result-item">
            <span class="result-number">No test records yet</span>
            <span class="result-time">--</span>
        </div>
    `;
    
    updateStats();
}

// Show share modal
function showShareModal() {
    if (reactionTimes.length === 0) {
        // Use nicer notification
        copyNotification.textContent = 'Please complete at least one test before sharing your results!';
        copyNotification.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
        copyNotification.style.display = 'block';
        setTimeout(() => {
            copyNotification.style.display = 'none';
            copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
            copyNotification.textContent = 'Link copied to clipboard!';
        }, 3000);
        return;
    }
    
    // Show modal
    shareModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Setup share buttons
    setupShareButtons();
}

// Close share modal
function closeShareModal() {
    shareModal.classList.remove('active');
    document.body.style.overflow = 'auto'; // Restore background scrolling
}

// Setup share buttons
function setupShareButtons() {
    // Get current URL
    const currentUrl = window.location.href;
    const fastest = reactionTimes.length > 0 ? Math.min(...reactionTimes) : '--';
    const average = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : '--';
    const latest = reactionTimes.length > 0 ? reactionTimes[reactionTimes.length - 1] : '--';
    
    // Share text
    const shareText = `Reaction Speed Test Results: Fastest ${fastest}ms, Average ${average}ms, Latest ${latest}ms! Test your reaction speed too:`;
    const shareTitle = `My Reaction Speed Test Results: Fastest ${fastest}ms, Average ${average}ms`;
    
    // Twitter share
    document.getElementById('shareTwitter').href = `https://twitter.com/share?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
    
    // Reddit share
    document.getElementById('shareReddit').href = `https://www.reddit.com/submit?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(shareTitle)}`;
    
    // Facebook share
    document.getElementById('shareFacebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    
    // Telegram share
    document.getElementById('shareTelegram').href = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
    
    // WhatsApp share
    document.getElementById('shareWhatsapp').href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + currentUrl)}`;
    
    // Copy link
    const copyLinkBtn = document.getElementById('copyLink');
    // Remove previous event listeners (avoid duplicate binding)
    const newCopyLinkBtn = copyLinkBtn.cloneNode(true);
    copyLinkBtn.parentNode.replaceChild(newCopyLinkBtn, copyLinkBtn);
    
    newCopyLinkBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const textToCopy = `${shareText} ${currentUrl}`;
        copyToClipboard(textToCopy);
        
        // Show notification
        copyNotification.textContent = 'Link copied to clipboard!';
        copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        copyNotification.style.display = 'block';
        setTimeout(() => {
            copyNotification.style.display = 'none';
        }, 3000);
        
        // Close modal
        closeShareModal();
    });
    
    // Set target="_blank" for all share links
    const shareLinks = document.querySelectorAll('.share-button');
    shareLinks.forEach(link => {
        if (link.id !== 'copyLink') {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
    });
}

// Copy to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
    } else {
        // Fallback method
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

// Add keyboard shortcut support
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

// Footer link functions
function showPrivacyPolicy() {
    copyNotification.textContent = 'Privacy Policy: We do not collect or store any of your personal data. All test results are stored only in your browser locally and are not uploaded to any server.';
    copyNotification.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    copyNotification.style.display = 'block';
    setTimeout(() => {
        copyNotification.style.display = 'none';
        copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        copyNotification.textContent = 'Link copied to clipboard!';
    }, 5000);
}

function showTerms() {
    copyNotification.textContent = 'Terms of Use: This tool is for entertainment and self-test purposes only and should not be used for professional medical or career assessment.';
    copyNotification.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
    copyNotification.style.display = 'block';
    setTimeout(() => {
        copyNotification.style.display = 'none';
        copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        copyNotification.textContent = 'Link copied to clipboard!';
    }, 5000);
}

function showFAQ() {
    copyNotification.textContent = 'FAQ: 1. How to get faster reaction time? - Stay focused, practice regularly. 2. Why is my reaction time unstable? - Fatigue, distractions and other factors affect reaction time. 3. Can I test unlimited times? - Yes, completely free, unlimited use.';
    copyNotification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    copyNotification.style.display = 'block';
    setTimeout(() => {
        copyNotification.style.display = 'none';
        copyNotification.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        copyNotification.textContent = 'Link copied to clipboard!';
    }, 5000);
}

// After page loads, add event listener for share button
document.addEventListener('DOMContentLoaded', function() {
    // Show share modal when share button is clicked
    shareResultBtn.addEventListener('click', showShareModal);
});