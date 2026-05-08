// Main Application Class
class CPSTester {
    constructor() {
        this.state = {
            currentMode: 'normal_10s',
            buttonMode: 'any', // any, left, right, middle
            testStatus: 'idle', // idle, active, waiting, counting, running, finished
            startTime: null,
            endTime: null,
            clicks: [],
            results: null,
            lastButtonWarning: null, // Record last button warning time
            settings: {
                theme: 'dark',
                soundEnabled: false,
                animationsEnabled: true,
                showParticles: true,
                autoSaveResults: true,
                countdownDuration: 3
            }
        };
        
        this.modes = {
            normal_10s: { name: '10-Second Standard Test', duration: 10, allowDoubleClick: true },
            precision_5s: { name: '5-Second Precision Test', duration: 5, allowDoubleClick: false },
            burst_1s: { name: '1-Second Burst Test', duration: 1, allowDoubleClick: true },
            endurance_60s: { name: '60-Second Endurance Test', duration: 60, allowDoubleClick: false }
        };
        
        this.buttonModes = {
            any: { 
                name: 'Any Button', 
                icon: 'fas fa-mouse',
                description: 'Left, right, and middle buttons can all be clicked'
            },
            left: { 
                name: 'Left Button Mode', 
                icon: 'fas fa-hand-point-up',
                description: 'Only use mouse left button to click'
            },
            right: { 
                name: 'Right Button Mode', 
                icon: 'fas fa-hand-point-down',
                description: 'Only use mouse right button to click'
            },
            middle: { 
                name: 'Middle Button Mode', 
                icon: 'fas fa-mouse-pointer',
                description: 'Only use mouse middle button to click'
            }
        };
        
        this.init();
    }
    
    init() {
        // Load saved settings
        this.loadSettings();
        
        // Initialize UI
        this.initUI();
        
        // Bind events
        this.bindEvents();
        
        // Show welcome notification
        this.showNotification('Move mouse to test area to activate, then click mouse to start countdown', 'info');
        
        console.log('CPS Tester initialization completed');
    }
    
    initUI() {
        // Create test mode selector
        this.createTestInterface();
        
        // Create mouse button mode selector
        this.createButtonModeSelector();
        
        // Update current mode display
        this.updateCurrentModeDisplay();
        
        // Update instruction text
        this.updateInstructionText();
        
        // Update real-time data
        this.updateRealTimeStats();
        
        // Load history data
        this.loadHistory();
        
        // Update control button status
        this.updateControlButtons();
    }
    
    createTestInterface() {
        const container = document.getElementById('mode-buttons');
        container.innerHTML = '';
        
        Object.entries(this.modes).forEach(([modeId, mode]) => {
            const button = document.createElement('button');
            button.className = 'mode-btn';
            button.dataset.mode = modeId;
            
            button.innerHTML = `
                <div class="mode-name">${mode.name}</div>
                <div class="mode-desc">${mode.duration}s | ${mode.allowDoubleClick ? 'Double-click allowed' : 'Single-click mode'}</div>
            `;
            
            button.addEventListener('click', () => {
                this.setMode(modeId);
            });
            
            container.appendChild(button);
        });
        
        // Set default active mode
        this.setMode('normal_10s');
    }
    
    createButtonModeSelector() {
        const container = document.getElementById('button-mode-options');
        container.innerHTML = '';
        
        Object.entries(this.buttonModes).forEach(([modeId, mode]) => {
            const option = document.createElement('div');
            option.className = 'mode-option';
            option.dataset.mode = modeId;
            
            option.innerHTML = `
                <div class="mode-icon">
                    <i class="${mode.icon}"></i>
                </div>
                <div class="mode-info">
                    <div class="mode-title">${mode.name}</div>
                    <div class="mode-description">${mode.description}</div>
                </div>
                <div class="mode-check">
                    <i class="fas fa-check" style="display: none; color: var(--primary-color);"></i>
                </div>
            `;
            
            option.addEventListener('click', () => {
                this.setButtonMode(modeId);
            });
            
            container.appendChild(option);
        });
        
        // Set default button mode
        this.setButtonMode('any');
    }
    
    bindEvents() {
        // Test area events
        const testArea = document.getElementById('test-area');
        
        // Mouse enter activates test area
        testArea.addEventListener('mouseenter', () => {
            if (this.state.testStatus === 'idle' || this.state.testStatus === 'finished') {
                this.activateTestArea();
            }
        });
        
        // Mouse leave test area
        testArea.addEventListener('mouseleave', () => {
            if (this.state.testStatus === 'active') {
                this.deactivateTestArea();
            }
        });
        
        // Mouse click event (supports left, right, middle buttons)
        testArea.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // Prevent right-click context menu on test area
        testArea.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        
        // Prevent middle button scroll on test area
        testArea.addEventListener('auxclick', (e) => {
            if (e.button === 1) { // Middle button
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
        
        // Prevent mouse wheel events on test area (prevent middle button scroll)
        testArea.addEventListener('wheel', (e) => {
            // Only prevent wheel during active testing
            if (this.state.testStatus === 'running') {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
        
        // Touch events
        testArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Touch event simulates left button click
            this.handleMouseDown({ button: 0, clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        });
        
        // Restart button event
        document.getElementById('restart-btn').addEventListener('click', () => this.resetTest());
        
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        
        // Fullscreen toggle
        document.getElementById('fullscreen-toggle').addEventListener('click', () => this.toggleFullscreen());
        
        // Settings panel
        document.getElementById('settings-toggle').addEventListener('click', () => this.showSettings());
        document.getElementById('close-settings').addEventListener('click', () => this.hideSettings());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Window events
        window.addEventListener('beforeunload', () => this.saveSettings());
    }
    
    setMode(modeId) {
        if (this.state.testStatus === 'running' || this.state.testStatus === 'counting') {
            this.showNotification('Test in progress, cannot switch modes!', 'error');
            return;
        }
        
        this.state.currentMode = modeId;
        
        // Update mode button status
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === modeId) {
                btn.classList.add('active');
            }
        });
        
        // Update current mode display
        this.updateCurrentModeDisplay();
        
        // Update instruction text
        this.updateInstructionText();
        
        // Update timer display
        const mode = this.modes[modeId];
        this.updateTimerDisplay(`Ready to start (${mode.duration}s test)`);
        
        // Reset progress bar
        document.getElementById('test-progress').style.width = '0%';
        
        this.showNotification(`Switched to ${mode.name}`, 'success');
    }
    
    updateCurrentModeDisplay() {
        const mode = this.modes[this.state.currentMode];
        const buttonMode = this.buttonModes[this.state.buttonMode];
        
        document.getElementById('current-mode-value').textContent = 
            `${mode.name} | ${buttonMode.name}`;
    }
    
    setButtonMode(modeId) {
        this.state.buttonMode = modeId;
        
        // Update button mode option status
        document.querySelectorAll('.mode-option').forEach(option => {
            option.classList.remove('active');
            const checkIcon = option.querySelector('.fa-check');
            checkIcon.style.display = 'none';
            
            if (option.dataset.mode === modeId) {
                option.classList.add('active');
                checkIcon.style.display = 'block';
            }
        });
        
        // Update current mode display
        this.updateCurrentModeDisplay();
        
        // Update instruction text
        this.updateInstructionText();
        
        this.showNotification(`Switched to ${this.buttonModes[modeId].name}`, 'success');
    }
    
    updateInstructionText() {
        const buttonMode = this.buttonModes[this.state.buttonMode];
        const instructionElement = document.getElementById('click-instruction');
        
        // Update instruction text based on button mode
        let instructionText = '';
        switch(this.state.buttonMode) {
            case 'any':
                instructionText = 'Move mouse to test area to activate, then click mouse to start countdown';
                break;
            case 'left':
                instructionText = 'Move mouse to test area to activate, then click mouse left button to start countdown';
                break;
            case 'right':
                instructionText = 'Move mouse to test area to activate, then click mouse right button to start countdown';
                break;
            case 'middle':
                instructionText = 'Move mouse to test area to activate, then click mouse middle button to start countdown';
                break;
            default:
                instructionText = 'Move mouse to test area to activate, then click mouse to start countdown';
        }
        
        instructionElement.textContent = instructionText;
    }
    
    activateTestArea() {
        if (this.state.testStatus !== 'idle' && this.state.testStatus !== 'finished') {
            return;
        }
        
        // If test is completed, user needs to click "Restart Test" button first
        if (this.state.testStatus === 'finished') {
            this.showNotification('Test completed, please click "Restart Test" button to start new test', 'info');
            return;
        }
        
        this.state.testStatus = 'active';
        const testArea = document.getElementById('test-area');
        testArea.classList.remove('finished');
        testArea.classList.add('active');
        
        // Update instruction information
        const buttonMode = this.buttonModes[this.state.buttonMode];
        document.getElementById('click-title').textContent = 'Ready to Start';
        
        // Update click prompt based on button mode
        let instructionText = '';
        switch(this.state.buttonMode) {
            case 'any':
                instructionText = 'Click mouse to start countdown';
                break;
            case 'left':
                instructionText = 'Click mouse left button to start countdown';
                break;
            case 'right':
                instructionText = 'Click mouse right button to start countdown';
                break;
            case 'middle':
                instructionText = 'Click mouse middle button to start countdown';
                break;
            default:
                instructionText = 'Click mouse to start countdown';
        }
        document.getElementById('click-instruction').textContent = instructionText;
        this.updateTimerDisplay('Click to Start');
        
        this.showNotification(`Test area activated, ${instructionText}`, 'info');
    }
    
    deactivateTestArea() {
        if (this.state.testStatus === 'active') {
            this.state.testStatus = 'idle';
            const testArea = document.getElementById('test-area');
            testArea.classList.remove('active');
            
            // Update instruction information
            document.getElementById('click-title').textContent = 'Mouse CPS Test';
            
            // Update instruction text based on button mode
            this.updateInstructionText();
            
            this.updateTimerDisplay('Ready to Start');
            
            this.showNotification('Test area deactivated', 'info');
        }
    }
    
    handleMouseDown(event) {
        // Prevent default behavior, block right-click menu and middle button scroll
        event.preventDefault();
        event.stopPropagation();
        
        // Check current status
        if (this.state.testStatus === 'idle') {
            // If test area not activated, activate first
            this.activateTestArea();
            return;
        }
        
        // If test completed, don't respond to clicks
        if (this.state.testStatus === 'finished') {
            this.showNotification('Test completed, please click "Restart Test" button to start new test', 'info');
            return;
        }
        
        if (this.state.testStatus === 'active') {
            // Check button mode - only selected button is allowed
            if (!this.isButtonAllowed(event.button)) {
                const allowedButton = this.buttonModes[this.state.buttonMode].name;
                this.showNotification(`Current mode only allows ${allowedButton} clicks`, 'error');
                return;
            }
            
            // Start countdown
            this.startCountdown();
            return;
        }
        
        if (this.state.testStatus === 'running') {
            // Check button mode - only selected button is allowed
            if (!this.isButtonAllowed(event.button)) {
                const allowedButton = this.buttonModes[this.state.buttonMode].name;
                // During test running, only show prompt once to avoid interference
                if (!this.state.lastButtonWarning || Date.now() - this.state.lastButtonWarning > 2000) {
                    this.showNotification(`Please use ${allowedButton} to click`, 'error');
                    this.state.lastButtonWarning = Date.now();
                }
                return;
            }
            
            // Record click
            this.recordClick(event);
            return;
        }
    }
    
    isButtonAllowed(buttonCode) {
        const buttonMode = this.state.buttonMode;
        
        // 0: left button, 1: middle button, 2: right button
        const buttonMap = {
            'left': 0,
            'middle': 1,
            'right': 2
        };
        
        if (buttonMode === 'any') {
            return true;
        }
        
        return buttonCode === buttonMap[buttonMode];
    }
    
    getButtonName(buttonCode) {
        const buttonNames = {
            0: 'Left Button',
            1: 'Middle Button',
            2: 'Right Button'
        };
        
        return buttonNames[buttonCode] || 'Unknown Button';
    }
    
    startCountdown() {
        if (this.state.testStatus !== 'active') {
            return;
        }
        
        this.state.testStatus = 'waiting';
        const testArea = document.getElementById('test-area');
        testArea.classList.remove('active');
        testArea.classList.add('waiting');
        
        // Update instruction information
        document.getElementById('click-title').textContent = 'Ready to Start';
        document.getElementById('click-instruction').textContent = 'Countdown will start soon';
        
        // Start countdown after brief delay
        setTimeout(() => {
            this.beginCountdown();
        }, 500);
    }
    
    beginCountdown() {
        this.state.testStatus = 'counting';
        const testArea = document.getElementById('test-area');
        testArea.classList.remove('waiting');
        
        let count = this.state.settings.countdownDuration;
        const countdownElement = document.getElementById('timer-display');
        countdownElement.classList.add('countdown');
        
        const countdownInterval = setInterval(() => {
            countdownElement.textContent = count > 0 ? count.toString() : 'Go!';
            countdownElement.classList.add('countdown-animation');
            
            // Remove animation class to re-trigger animation
            setTimeout(() => {
                countdownElement.classList.remove('countdown-animation');
            }, 500);
            
            if (count <= 0) {
                clearInterval(countdownInterval);
                setTimeout(() => {
                    this.beginTest();
                }, 500);
            }
            
            count--;
        }, 1000);
    }
    
    beginTest() {
        this.state.testStatus = 'running';
        this.state.startTime = performance.now();
        this.state.clicks = [];
        
        const testArea = document.getElementById('test-area');
        testArea.classList.remove('waiting');
        testArea.classList.add('running');
        
        const mode = this.modes[this.state.currentMode];
        const duration = mode.duration * 1000; // Convert to milliseconds
        
        // Update instruction information
        document.getElementById('click-title').textContent = 'Test in Progress';
        
        // Update click prompt based on button mode
        let instructionText = '';
        switch(this.state.buttonMode) {
            case 'any':
                instructionText = 'Click mouse quickly!';
                break;
            case 'left':
                instructionText = 'Click mouse left button quickly!';
                break;
            case 'right':
                instructionText = 'Click mouse right button quickly!';
                break;
            case 'middle':
                instructionText = 'Click mouse middle button quickly!';
                break;
            default:
                instructionText = 'Click mouse quickly!';
        }
        document.getElementById('click-instruction').textContent = instructionText;
        
        // Update control button status
        this.updateControlButtons();
        
        // Update timer
        this.updateTimer();
        
        // Start progress bar animation
        const progressBar = document.getElementById('test-progress');
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '100%';
        
        // Set test end timer
        setTimeout(() => this.finishTest(), duration);
        
        this.showNotification('Test started!', 'success');
    }
    
    updateTimer() {
        if (this.state.testStatus !== 'running') return;
        
        const elapsed = performance.now() - this.state.startTime;
        const mode = this.modes[this.state.currentMode];
        const remaining = Math.max(0, (mode.duration * 1000) - elapsed);
        
        // Format display time
        const seconds = Math.floor(remaining / 1000);
        const milliseconds = Math.floor((remaining % 1000) / 10);
        const display = `${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;
        
        document.getElementById('timer-display').textContent = display;
        document.getElementById('timer-display').classList.remove('countdown');
        
        // Continue updating
        requestAnimationFrame(() => this.updateTimer());
    }
    
    updateTimerDisplay(text) {
        const timerDisplay = document.getElementById('timer-display');
        timerDisplay.textContent = text;
        timerDisplay.classList.remove('countdown');
    }
    
    recordClick(event) {
        if (this.state.testStatus !== 'running') return;
        
        // Check button mode
        if (!this.isButtonAllowed(event.button)) {
            return;
        }
        
        const clickTime = performance.now();
        const clickData = {
            timestamp: clickTime,
            button: event.button,
            buttonName: this.getButtonName(event.button),
            position: { x: event.clientX, y: event.clientY },
            delayFromLast: this.state.clicks.length > 0 ? 
                clickTime - this.state.clicks[this.state.clicks.length - 1].timestamp : 0
        };
        
        // Add to click records
        this.state.clicks.push(clickData);
        
        // Show click animation
        if (this.state.settings.animationsEnabled) {
            this.showClickAnimation(event.clientX, event.clientY);
        }
        
        // Update real-time statistics
        this.updateRealTimeStats();
    }
    
    finishTest() {
        this.state.testStatus = 'finished';
        this.state.endTime = performance.now();
        
        const testArea = document.getElementById('test-area');
        testArea.classList.remove('running');
        testArea.classList.add('finished');
        
        // Update control button status
        this.updateControlButtons();
        
        // Calculate statistics results
        this.calculateResults();
        
        // Display results
        this.displayResults();
        
        // Save results
        if (this.state.settings.autoSaveResults) {
            this.saveResults();
        }
        
        // Update instruction information - clearly tell user how to restart
        document.getElementById('click-title').textContent = 'Test Completed';
        document.getElementById('click-instruction').textContent = 'Click "Restart Test" button below to start new test';
        this.updateTimerDisplay('Complete!');
        
        // Show test completion notice
        document.getElementById('test-complete-notice').style.display = 'block';
        
        this.showNotification('Test completed! Click "Restart Test" button to start new test', 'success');
    }
    
    resetTest() {
        this.state.testStatus = 'idle';
        this.state.clicks = [];
        this.state.results = null;
        this.state.startTime = null;
        this.state.endTime = null;
        this.state.lastButtonWarning = null;
        
        const testArea = document.getElementById('test-area');
        testArea.classList.remove('active', 'waiting', 'running', 'finished');
        
        // Update control button status
        this.updateControlButtons();
        
        // Reset UI
        document.getElementById('click-title').textContent = 'Mouse CPS Test';
        
        // Update instruction text based on button mode
        this.updateInstructionText();
        
        this.updateTimerDisplay('Ready to Start');
        
        // Hide test completion notice
        document.getElementById('test-complete-notice').style.display = 'none';
        
        // Update current mode display
        this.updateCurrentModeDisplay();
        
        document.getElementById('test-progress').style.width = '0%';
        document.getElementById('test-progress').style.transition = 'none';
        
        // Clear results display
        const resultsDashboard = document.getElementById('results-dashboard');
        resultsDashboard.innerHTML = `
            <h2><i class="fas fa-chart-bar"></i> Test Results</h2>
            <div class="no-results">
                <i class="fas fa-mouse-pointer" style="font-size: 3rem; color: var(--text-muted); display: block; text-align: center; margin: 20px 0;"></i>
                <p style="text-align: center; color: var(--text-secondary);">View results after completing the test</p>
            </div>
        `;
        
        this.updateRealTimeStats();
        
        this.showNotification('Reset complete, move mouse to test area to activate and start new test', 'info');
    }
    
    updateControlButtons() {
        const restartBtn = document.getElementById('restart-btn');
        
        switch (this.state.testStatus) {
            case 'running':
                restartBtn.disabled = true;
                restartBtn.classList.remove('highlight');
                restartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test in Progress...';
                break;
                
            case 'counting':
            case 'waiting':
                restartBtn.disabled = false;
                restartBtn.classList.remove('highlight');
                restartBtn.innerHTML = '<i class="fas fa-redo"></i> Restart Test';
                break;
                
            case 'finished':
                restartBtn.disabled = false;
                restartBtn.classList.add('highlight');
                restartBtn.innerHTML = '<i class="fas fa-play-circle"></i> Click to Start New Test';
                break;
                
            default:
                restartBtn.disabled = false;
                restartBtn.classList.remove('highlight');
                restartBtn.innerHTML = '<i class="fas fa-redo"></i> Restart Test';
                break;
        }
    }
    
    calculateResults() {
        const mode = this.modes[this.state.currentMode];
        const duration = (this.state.endTime - this.state.startTime) / 1000; // seconds
        const totalClicks = this.state.clicks.length;
        const averageCPS = totalClicks / duration;
        
        // Calculate max CPS (1-second window)
        let maxCPS = 0;
        for (let i = 0; i < this.state.clicks.length; i++) {
            const windowStart = this.state.clicks[i].timestamp;
            const windowEnd = windowStart + 1000;
            
            let count = 1;
            for (let j = i + 1; j < this.state.clicks.length; j++) {
                if (this.state.clicks[j].timestamp <= windowEnd) {
                    count++;
                } else {
                    break;
                }
            }
            
            const cps = count;
            if (cps > maxCPS) {
                maxCPS = cps;
            }
        }
        
        // Calculate min CPS (1-second window)
        let minCPS = totalClicks;
        const totalSeconds = Math.ceil(duration);
        
        // Divide test time into 1-second segments
        for (let second = 0; second < totalSeconds; second++) {
            const startTime = this.state.startTime + second * 1000;
            const endTime = startTime + 1000;
            
            const clicksInSecond = this.state.clicks.filter(click => 
                click.timestamp >= startTime && click.timestamp < endTime
            ).length;
            
            if (clicksInSecond < minCPS) {
                minCPS = clicksInSecond;
            }
        }
        
        // Calculate consistency - Fix issue: when only one click, consistency should be 100%
        let consistency = 100;
        if (this.state.clicks.length >= 2) {
            const intervals = [];
            for (let i = 1; i < this.state.clicks.length; i++) {
                intervals.push(this.state.clicks[i].timestamp - this.state.clicks[i-1].timestamp);
            }
            
            const avg = intervals.reduce((a, b) => a + b) / intervals.length;
            const variance = intervals.reduce((sum, interval) => {
                return sum + Math.pow(interval - avg, 2);
            }, 0) / intervals.length;
            
            // Fix: prevent division by zero
            if (avg > 0) {
                consistency = Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100);
            } else {
                consistency = 100;
            }
        }
        
        // Calculate button usage distribution
        const buttonDistribution = {};
        this.state.clicks.forEach(click => {
            const buttonName = click.buttonName;
            buttonDistribution[buttonName] = (buttonDistribution[buttonName] || 0) + 1;
        });
        
        // Fix score calculation issue
        let score = 0;
        
        if (totalClicks > 0) {
            // Base score: CPS score (10 points per 1 CPS)
            const cpsScore = averageCPS * 10;
            
            // Consistency coefficient (between 0-1)
            const consistencyFactor = consistency / 100;
            
            // Bonus points: max CPS reward
            const maxCpsBonus = maxCPS * 2;
            
            // Click count reward
            const clickCountBonus = Math.min(totalClicks * 0.5, 50);
            
            // Total score = (base score * consistency coefficient) + bonus points
            score = Math.round((cpsScore * consistencyFactor) + maxCpsBonus + clickCountBonus);
            
            // Ensure score is not 0
            score = Math.max(score, Math.round(averageCPS * 5));
        }
        
        this.state.results = {
            totalClicks,
            averageCPS,
            maxCPS,
            minCPS,
            duration,
            consistency,
            buttonDistribution,
            score,
            timestamp: new Date().toLocaleString(),
            mode: this.modes[this.state.currentMode].name,
            buttonMode: this.buttonModes[this.state.buttonMode].name
        };
        
        console.log('Calculated results:', this.state.results);
    }
    
    displayResults() {
        if (!this.state.results) return;
        
        const results = this.state.results;
        const resultsDashboard = document.getElementById('results-dashboard');
        
        // Create button distribution HTML
        let buttonDistributionHTML = '';
        if (results.buttonDistribution && Object.keys(results.buttonDistribution).length > 0) {
            buttonDistributionHTML = `
                <div style="margin-top: 15px;">
                    <h3 style="font-size: var(--font-size-base); margin-bottom: 10px; color: var(--text-primary);">Button Usage Distribution:</h3>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        ${Object.entries(results.buttonDistribution).map(([buttonName, count]) => `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--text-secondary);">${buttonName}:</span>
                                <span style="font-weight: 600; color: var(--primary-color);">
                                    ${count} times (${((count / results.totalClicks) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        resultsDashboard.innerHTML = `
            <h2><i class="fas fa-chart-bar"></i> Test Results</h2>
            <div class="results-grid">
                <div class="result-card primary">
                    <div class="result-value">${results.averageCPS.toFixed(1)}</div>
                    <div class="result-label">Average CPS</div>
                </div>
                <div class="result-card secondary">
                    <div class="result-value">${results.maxCPS.toFixed(1)}</div>
                    <div class="result-label">Max CPS</div>
                </div>
                <div class="result-card accent">
                    <div class="result-value">${results.totalClicks}</div>
                    <div class="result-label">Total Clicks</div>
                </div>
            </div>
            <div class="detailed-results" style="margin-top: 20px; background-color: var(--bg-secondary); border-radius: 8px; padding: 15px;">
                <div class="result-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span class="result-label">Test Mode</span>
                    <span class="result-value" style="font-weight: 600; color: var(--primary-color);">${results.mode}</span>
                </div>
                <div class="result-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span class="result-label">Button Mode</span>
                    <span class="result-value" style="font-weight: 600; color: var(--primary-color);">${results.buttonMode}</span>
                </div>
                <div class="result-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span class="result-label">Test Duration</span>
                    <span class="result-value" style="font-weight: 600; color: var(--primary-color);">${results.duration.toFixed(2)} seconds</span>
                </div>
                <div class="result-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span class="result-label">Min CPS</span>
                    <span class="result-value" style="font-weight: 600; color: var(--primary-color);">${results.minCPS.toFixed(1)}</span>
                </div>
                <div class="result-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span class="result-label">Click Consistency</span>
                    <span class="result-value" style="font-weight: 600; color: var(--primary-color);">${results.consistency.toFixed(1)}%</span>
                </div>
                <div class="result-row" style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span class="result-label">Overall Score</span>
                    <span class="result-value score" style="font-weight: 600; color: var(--secondary-color); font-size: 1.2em;">${results.score}</span>
                </div>
            </div>
            ${buttonDistributionHTML}
            <div style="margin-top: 15px; text-align: center; color: var(--text-secondary); font-size: 0.9em;">
                ${results.timestamp}
            </div>
        `;
        
        // Add to history
        this.addToHistory();
    }
    
    addToHistory() {
        const historyItem = {
            id: Date.now(),
            mode: this.modes[this.state.currentMode].name,
            buttonMode: this.buttonModes[this.state.buttonMode].name,
            timestamp: new Date().toLocaleTimeString(),
            cps: this.state.results.averageCPS,
            totalClicks: this.state.results.totalClicks,
            score: this.state.results.score
        };
        
        const historyList = document.getElementById('history-list');
        
        // Remove empty state prompt
        const emptyHistory = historyList.querySelector('.empty-history');
        if (emptyHistory) {
            emptyHistory.remove();
        }
        
        const historyElement = document.createElement('div');
        historyElement.className = 'history-item';
        historyElement.innerHTML = `
            <div class="history-header" style="display: flex; justify-content: space-between;">
                <span class="history-time">${historyItem.timestamp}</span>
                <span class="history-mode">${historyItem.mode}</span>
            </div>
            <div class="history-body" style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                <span class="history-cps">${historyItem.cps.toFixed(1)} CPS</span>
                <span class="history-clicks" style="color: var(--text-secondary); font-size: 0.9em;">${historyItem.totalClicks} clicks</span>
            </div>
            <div class="history-footer" style="display: flex; justify-content: space-between; font-size: 0.8em; color: var(--text-muted); margin-top: 5px;">
                <span>${historyItem.buttonMode}</span>
                <span style="color: var(--secondary-color); font-weight: 600;">Score: ${historyItem.score}</span>
            </div>
        `;
        
        // Add to top of list
        historyList.insertBefore(historyElement, historyList.firstChild);
        
        // Limit list length
        const items = historyList.querySelectorAll('.history-item');
        if (items.length > 5) {
            historyList.removeChild(items[items.length - 1]);
        }
        
        // Save to local storage
        this.saveHistory(historyItem);
    }
    
    saveHistory(item) {
        try {
            const history = JSON.parse(localStorage.getItem('cps-history') || '[]');
            history.unshift(item);
            
            // Limit history record count
            if (history.length > 20) {
                history.pop();
            }
            
            localStorage.setItem('cps-history', JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }
    
    loadHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('cps-history') || '[]');
            const historyList = document.getElementById('history-list');
            
            if (history.length === 0) return;
            
            // Remove empty state prompt
            const emptyHistory = historyList.querySelector('.empty-history');
            if (emptyHistory) {
                emptyHistory.remove();
            }
            
            // Add history records (max 5)
            history.slice(0, 5).forEach(item => {
                const historyElement = document.createElement('div');
                historyElement.className = 'history-item';
                historyElement.innerHTML = `
                    <div class="history-header" style="display: flex; justify-content: space-between;">
                        <span class="history-time">${item.timestamp}</span>
                        <span class="history-mode">${item.mode}</span>
                    </div>
                    <div class="history-body" style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                        <span class="history-cps">${item.cps.toFixed(1)} CPS</span>
                        <span class="history-clicks" style="color: var(--text-secondary); font-size: 0.9em;">${item.totalClicks} clicks</span>
                    </div>
                    <div class="history-footer" style="display: flex; justify-content: space-between; font-size: 0.8em; color: var(--text-muted); margin-top: 5px;">
                        <span>${item.buttonMode}</span>
                        <span style="color: var(--secondary-color); font-weight: 600;">Score: ${item.score || 0}</span>
                    </div>
                `;
                
                historyList.appendChild(historyElement);
            });
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }
    
    saveResults() {
        if (!this.state.results) {
            return;
        }
        
        try {
            const resultData = {
                id: Date.now(),
                mode: this.state.currentMode,
                modeName: this.modes[this.state.currentMode].name,
                buttonMode: this.state.buttonMode,
                buttonModeName: this.buttonModes[this.state.buttonMode].name,
                timestamp: new Date().toISOString(),
                results: this.state.results
            };
            
            const savedResults = JSON.parse(localStorage.getItem('cps-saved-results') || '[]');
            savedResults.unshift(resultData);
            
            // Limit saved count
            if (savedResults.length > 50) {
                savedResults.pop();
            }
            
            localStorage.setItem('cps-saved-results', JSON.stringify(savedResults));
            
        } catch (error) {
            console.error('Failed to save results:', error);
        }
    }
    
    updateRealTimeStats() {
        let currentCPS = 0;
        let totalClicks = this.state.clicks.length;
        
        if (this.state.testStatus === 'running') {
            // Calculate CPS in last 1 second
            const now = performance.now();
            const recentClicks = this.state.clicks.filter(
                click => now - click.timestamp <= 1000
            );
            currentCPS = recentClicks.length;
        }
        
        // Update display
        document.getElementById('current-cps').textContent = currentCPS.toFixed(1);
        document.getElementById('total-clicks').textContent = totalClicks;
        document.getElementById('click-interval').textContent = this.getAverageInterval();
        document.getElementById('consistency').textContent = this.calculateConsistency();
    }
    
    getAverageInterval() {
        if (this.state.clicks.length < 2) return '0.0';
        
        const intervals = [];
        for (let i = 1; i < this.state.clicks.length; i++) {
            intervals.push(this.state.clicks[i].timestamp - this.state.clicks[i-1].timestamp);
        }
        
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        return avg.toFixed(1);
    }
    
    calculateConsistency() {
        if (this.state.clicks.length < 2) return '100%';
        
        const intervals = [];
        for (let i = 1; i < this.state.clicks.length; i++) {
            intervals.push(this.state.clicks[i].timestamp - this.state.clicks[i-1].timestamp);
        }
        
        const avg = intervals.reduce((a, b) => a + b) / intervals.length;
        const variance = intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - avg, 2);
        }, 0) / intervals.length;
        
        // Fix: prevent division by zero
        let consistency = 100;
        if (avg > 0) {
            consistency = Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100);
        }
        
        return consistency.toFixed(1) + '%';
    }
    
    toggleTheme() {
        const themes = ['dark', 'light', 'high-contrast', 'eye-care'];
        const currentIndex = themes.indexOf(this.state.settings.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        this.updateSettings({ ...this.state.settings, theme: nextTheme });
        this.showNotification(`Switched to ${nextTheme} theme`, 'success');
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Fullscreen request failed: ${err.message}`);
                this.showNotification('Unable to enter fullscreen mode', 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    showSettings() {
        document.getElementById('settings-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        this.createSettingsPanel();
    }
    
    hideSettings() {
        document.getElementById('settings-modal').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    createSettingsPanel() {
        const container = document.getElementById('settings-content');
        const settings = this.state.settings;
        
        container.innerHTML = `
            <div class="settings-section">
                <h3><i class="fas fa-palette"></i> Appearance Settings</h3>
                <div class="setting-group">
                    <label class="setting-label">
                        <span>Theme</span>
                        <select id="theme-select" class="setting-input">
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark Theme</option>
                            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light Theme</option>
                            <option value="high-contrast" ${settings.theme === 'high-contrast' ? 'selected' : ''}>High Contrast</option>
                            <option value="eye-care" ${settings.theme === 'eye-care' ? 'selected' : ''}>Eye Care Mode</option>
                        </select>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h3><i class="fas fa-film"></i> Animation Effects</h3>
                <div class="setting-group">
                    <label class="setting-label">
                        <input type="checkbox" id="animations-toggle" ${settings.animationsEnabled ? 'checked' : ''}>
                        <span>Enable Animations</span>
                    </label>
                    <label class="setting-label">
                        <input type="checkbox" id="particles-toggle" ${settings.showParticles ? 'checked' : ''}>
                        <span>Show Click Particle Effects</span>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h3><i class="fas fa-cogs"></i> Test Settings</h3>
                <div class="setting-group">
                    <label class="setting-label">
                        <span>Countdown Duration</span>
                        <select id="countdown-select" class="setting-input">
                            <option value="3" ${settings.countdownDuration === 3 ? 'selected' : ''}>3 seconds</option>
                            <option value="5" ${settings.countdownDuration === 5 ? 'selected' : ''}>5 seconds</option>
                            <option value="10" ${settings.countdownDuration === 10 ? 'selected' : ''}>10 seconds</option>
                        </select>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h3><i class="fas fa-save"></i> Data Management</h3>
                <div class="setting-group">
                    <label class="setting-label">
                        <input type="checkbox" id="autosave-toggle" ${settings.autoSaveResults ? 'checked' : ''}>
                        <span>Auto-Save Test Results</span>
                    </label>
                </div>
                <div class="setting-buttons">
                    <button id="export-btn" class="setting-btn">
                        <i class="fas fa-download"></i> Export Data
                    </button>
                    <button id="clear-btn" class="setting-btn danger">
                        <i class="fas fa-trash"></i> Clear All Data
                    </button>
                </div>
            </div>
            
            <div class="settings-footer">
                <button id="reset-settings" class="setting-btn">
                    <i class="fas fa-undo"></i> Restore Default Settings
                </button>
            </div>
        `;
        
        // Bind setting change events
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.updateSettings({ ...settings, theme: e.target.value });
        });
        
        document.getElementById('animations-toggle').addEventListener('change', (e) => {
            this.updateSettings({ ...settings, animationsEnabled: e.target.checked });
        });
        
        document.getElementById('particles-toggle').addEventListener('change', (e) => {
            this.updateSettings({ ...settings, showParticles: e.target.checked });
        });
        
        document.getElementById('autosave-toggle').addEventListener('change', (e) => {
            this.updateSettings({ ...settings, autoSaveResults: e.target.checked });
        });
        
        document.getElementById('countdown-select').addEventListener('change', (e) => {
            this.updateSettings({ ...settings, countdownDuration: parseInt(e.target.value) });
        });
        
        // Data management buttons
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                localStorage.clear();
                this.showNotification('Data cleared', 'success');
                setTimeout(() => location.reload(), 1000);
            }
        });
        
        document.getElementById('reset-settings').addEventListener('click', () => {
            if (confirm('Are you sure you want to restore default settings?')) {
                this.updateSettings({
                    theme: 'dark',
                    soundEnabled: false,
                    animationsEnabled: true,
                    showParticles: true,
                    autoSaveResults: true,
                    countdownDuration: 3
                });
                this.showNotification('Default settings restored', 'success');
            }
        });
    }
    
    updateSettings(newSettings) {
        this.state.settings = newSettings;
        
        // Apply theme
        document.body.className = '';
        document.body.classList.add(`${newSettings.theme}-theme`);
        
        // Apply other settings
        this.applySettings();
        
        // Save settings
        this.saveSettings();
    }
    
    applySettings() {
        // Other settings application logic can be added here
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('cps-tester-settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state.settings = { ...this.state.settings, ...parsed };
                this.applySettings();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('cps-tester-settings', JSON.stringify(this.state.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }
    
    exportData() {
        try {
            const data = {
                settings: this.state.settings,
                history: JSON.parse(localStorage.getItem('cps-history') || '[]'),
                savedResults: JSON.parse(localStorage.getItem('cps-saved-results') || '[]'),
                exportDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cps-tester-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Data exported successfully', 'success');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showNotification('Export failed, please try again', 'error');
        }
    }
    
    handleKeydown(event) {
        // Prevent triggering shortcuts in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                if (this.state.testStatus === 'running') {
                    this.finishTest();
                } else if (this.state.testStatus === 'idle' || this.state.testStatus === 'finished') {
                    // Simulate mouse click to start
                    this.activateTestArea();
                    setTimeout(() => {
                        this.startCountdown();
                    }, 100);
                }
                break;
                
            case 'KeyR':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.resetTest();
                }
                break;
                
            case 'KeyF':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.toggleFullscreen();
                }
                break;
                
            case 'Escape':
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
                
            case 'Digit1':
            case 'Digit2':
            case 'Digit3':
            case 'Digit4':
                const modeIndex = parseInt(event.code.replace('Digit', '')) - 1;
                const modeIds = Object.keys(this.modes);
                if (modeIndex < modeIds.length) {
                    this.setMode(modeIds[modeIndex]);
                }
                break;
        }
    }
    
    showClickAnimation(x, y) {
        if (!this.state.settings.showParticles) return;
        
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
            this.createParticle(x, y);
        }
    }
    
    createParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random size and color
        const size = Math.random() * 4 + 2;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 2 + 1;
        const color = Math.random() > 0.5 ? 'var(--primary-color)' : 'var(--secondary-color)';
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.backgroundColor = color;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // Set animation parameters
        const angleRad = angle;
        const vel = velocity;
        
        // Use inline style to control animation
        particle.style.setProperty('--angle', `${angleRad}rad`);
        particle.style.setProperty('--velocity', `${vel}`);
        
        document.body.appendChild(particle);
        
        // Remove element after animation ends
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 800);
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        const notificationArea = document.getElementById('notification-area');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notificationArea.appendChild(notification);
        
        // Auto-remove notification
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
        
        return notification;
    }
}

// Initialize application after page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create application instance
    window.cpsTester = new CPSTester();
});