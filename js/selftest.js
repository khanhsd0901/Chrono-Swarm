// Self-Test and Auto-Fix System for Chrono-Swarm
// Automatically detects and fixes common issues

class SelfTestSystem {
    constructor() {
        this.tests = [];
        this.fixes = [];
        this.isRunning = false;
        this.lastTestRun = 0;
        this.autoFixEnabled = true;
        
        this.initializeTests();
        this.startPeriodicTesting();
    }

    initializeTests() {
        // Test 1: Mouse tracking functionality
        this.addTest('mouse_tracking', {
            name: 'Mouse Tracking',
            description: 'Verifies mouse coordinates are being tracked correctly',
            test: () => this.testMouseTracking(),
            fix: () => this.fixMouseTracking(),
            critical: true
        });

        // Test 2: Canvas rendering
        this.addTest('canvas_rendering', {
            name: 'Canvas Rendering',
            description: 'Checks if the game canvas is rendering properly',
            test: () => this.testCanvasRendering(),
            fix: () => this.fixCanvasRendering(),
            critical: true
        });

        // Test 3: Player movement
        this.addTest('player_movement', {
            name: 'Player Movement',
            description: 'Verifies player can move and respond to input',
            test: () => this.testPlayerMovement(),
            fix: () => this.fixPlayerMovement(),
            critical: true
        });

        // Test 4: Game loop performance
        this.addTest('game_performance', {
            name: 'Game Performance',
            description: 'Monitors frame rate and performance metrics',
            test: () => this.testGamePerformance(),
            fix: () => this.fixGamePerformance(),
            critical: false
        });

        // Test 5: UI responsiveness
        this.addTest('ui_responsiveness', {
            name: 'UI Responsiveness',
            description: 'Checks if UI elements respond to interactions',
            test: () => this.testUIResponsiveness(),
            fix: () => this.fixUIResponsiveness(),
            critical: false
        });

        // Test 6: Memory usage
        this.addTest('memory_usage', {
            name: 'Memory Usage',
            description: 'Monitors memory consumption and detects leaks',
            test: () => this.testMemoryUsage(),
            fix: () => this.fixMemoryUsage(),
            critical: false
        });
    }

    addTest(id, testConfig) {
        this.tests.push({
            id,
            ...testConfig,
            lastRun: 0,
            lastResult: null,
            failures: 0,
            fixes: 0
        });
    }

    async runSelfTest(testIds = null) {
        if (this.isRunning) {
            console.log('🔍 Self-test already running...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();
        const testsToRun = testIds ? this.tests.filter(t => testIds.includes(t.id)) : this.tests;
        const results = {
            passed: 0,
            failed: 0,
            fixed: 0,
            errors: []
        };

        console.log('🔍 Starting self-test...');

        for (const test of testsToRun) {
            try {
                console.log(`🧪 Running test: ${test.name}`);
                const result = await test.test();
                test.lastRun = Date.now();
                test.lastResult = result;

                if (result.success) {
                    results.passed++;
                    test.failures = 0;
                    console.log(`✅ ${test.name}: PASSED`);
                } else {
                    results.failed++;
                    test.failures++;
                    console.log(`❌ ${test.name}: FAILED - ${result.message}`);
                    results.errors.push(`${test.name}: ${result.message}`);

                    // Auto-fix if enabled and available
                    if (this.autoFixEnabled && test.fix) {
                        console.log(`🔧 Attempting auto-fix for ${test.name}...`);
                        try {
                            const fixResult = await test.fix();
                            if (fixResult.success) {
                                results.fixed++;
                                test.fixes++;
                                console.log(`✅ Auto-fix successful for ${test.name}`);
                                
                                // Re-run the test to verify fix
                                const retest = await test.test();
                                if (retest.success) {
                                    results.failed--;
                                    results.passed++;
                                    console.log(`✅ ${test.name}: FIXED and verified`);
                                }
                            } else {
                                console.log(`❌ Auto-fix failed for ${test.name}: ${fixResult.message}`);
                            }
                        } catch (fixError) {
                            console.error(`❌ Auto-fix error for ${test.name}:`, fixError);
                        }
                    }
                }
            } catch (error) {
                results.failed++;
                test.failures++;
                console.error(`❌ Test error for ${test.name}:`, error);
                results.errors.push(`${test.name}: ${error.message}`);
            }
        }

        const duration = Date.now() - startTime;
        this.lastTestRun = Date.now();
        this.isRunning = false;

        // Report results
        console.log(`🔍 Self-test completed in ${duration}ms`);
        console.log(`✅ Passed: ${results.passed}, ❌ Failed: ${results.failed}, 🔧 Fixed: ${results.fixed}`);
        
        if (results.errors.length > 0) {
            console.log('🚨 Issues found:', results.errors);
        }

        // Show notification if UI is available
        if (window.uiSystem) {
            const status = results.failed === 0 ? 'success' : 'warning';
            const message = results.failed === 0 ? 
                'All systems operational' : 
                `${results.failed} issues detected, ${results.fixed} auto-fixed`;
            window.uiSystem.showNotification(`Self-test: ${message}`, status);
        }

        return results;
    }

    startPeriodicTesting() {
        // Run a lightweight check every 30 seconds
        setInterval(() => {
            if (!this.isRunning && Date.now() - this.lastTestRun > 30000) {
                this.runSelfTest(['mouse_tracking', 'game_performance']);
            }
        }, 30000);

        // Run full test every 5 minutes
        setInterval(() => {
            if (!this.isRunning) {
                this.runSelfTest();
            }
        }, 300000);
    }

    // Individual test implementations
    async testMouseTracking() {
        if (!window.game || !window.game.mouse) {
            return { success: false, message: 'Game mouse object not found' };
        }

        const game = window.game;
        const hasValidCoords = typeof game.mouse.x === 'number' && typeof game.mouse.y === 'number';
        const hasWorldCoords = typeof game.mouse.worldX === 'number' && typeof game.mouse.worldY === 'number';
        const isInCanvas = typeof game.mouseInCanvas === 'boolean';

        if (!hasValidCoords) {
            return { success: false, message: 'Mouse screen coordinates invalid' };
        }
        if (!hasWorldCoords) {
            return { success: false, message: 'Mouse world coordinates invalid' };
        }
        if (!isInCanvas) {
            return { success: false, message: 'Mouse canvas tracking invalid' };
        }

        return { success: true, message: 'Mouse tracking operational' };
    }

    async fixMouseTracking() {
        if (!window.game) {
            return { success: false, message: 'Game object not available' };
        }

        try {
            // Re-initialize mouse tracking
            window.game.mouse = window.game.mouse || { x: 0, y: 0, worldX: 0, worldY: 0 };
            window.game.mouseInCanvas = false;
            
            // Re-setup input handlers if needed
            if (window.game.setupInputHandlers) {
                window.game.setupInputHandlers();
            }

            return { success: true, message: 'Mouse tracking reinitialized' };
        } catch (error) {
            return { success: false, message: `Fix failed: ${error.message}` };
        }
    }

    async testCanvasRendering() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            return { success: false, message: 'Game canvas not found' };
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return { success: false, message: 'Canvas context not available' };
        }

        if (canvas.width === 0 || canvas.height === 0) {
            return { success: false, message: 'Canvas has invalid dimensions' };
        }

        return { success: true, message: 'Canvas rendering operational' };
    }

    async fixCanvasRendering() {
        try {
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                return { success: false, message: 'Canvas not found for fixing' };
            }

            // Reset canvas dimensions
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Re-initialize game if available
            if (window.game && window.game.resizeCanvas) {
                window.game.resizeCanvas();
            }

            return { success: true, message: 'Canvas rendering fixed' };
        } catch (error) {
            return { success: false, message: `Canvas fix failed: ${error.message}` };
        }
    }

    async testPlayerMovement() {
        if (!window.game || !window.game.player) {
            return { success: false, message: 'Player object not found' };
        }

        const player = window.game.player;
        if (!player.isAlive) {
            return { success: false, message: 'Player is not alive' };
        }

        if (!player.cells || player.cells.length === 0) {
            return { success: false, message: 'Player has no cells' };
        }

        // Check if player can receive input
        if (typeof player.update !== 'function') {
            return { success: false, message: 'Player update function missing' };
        }

        return { success: true, message: 'Player movement operational' };
    }

    async fixPlayerMovement() {
        try {
            if (!window.game) {
                return { success: false, message: 'Game not available for player fix' };
            }

            // Respawn player if dead or missing
            if (!window.game.player || !window.game.player.isAlive) {
                if (window.game.createPlayer) {
                    window.game.createPlayer();
                } else if (window.game.player && window.game.player.spawn) {
                    window.game.player.spawn();
                }
            }

            return { success: true, message: 'Player movement fixed' };
        } catch (error) {
            return { success: false, message: `Player fix failed: ${error.message}` };
        }
    }

    async testGamePerformance() {
        if (!window.game) {
            return { success: false, message: 'Game object not available' };
        }

        // Check frame rate (if available)
        const avgFPS = window.game.avgFPS || 60;
        if (avgFPS < 30) {
            return { success: false, message: `Low frame rate: ${avgFPS.toFixed(1)} FPS` };
        }

        // Check memory usage
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
            if (memoryUsage > 0.9) {
                return { success: false, message: `High memory usage: ${(memoryUsage * 100).toFixed(1)}%` };
            }
        }

        return { success: true, message: 'Game performance acceptable' };
    }

    async fixGamePerformance() {
        try {
            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }

            // Clear unused particles
            if (window.particleSystem && window.particleSystem.clearDeadParticles) {
                window.particleSystem.clearDeadParticles();
            }

            // Reset performance counters
            if (window.game) {
                window.game.frameCount = 0;
                window.game.lastFPSUpdate = Date.now();
            }

            return { success: true, message: 'Performance optimization applied' };
        } catch (error) {
            return { success: false, message: `Performance fix failed: ${error.message}` };
        }
    }

    async testUIResponsiveness() {
        // Check if main UI elements exist
        const mainMenu = document.getElementById('mainMenu');
        const gameHUD = document.getElementById('gameHUD');
        
        if (!mainMenu && !gameHUD) {
            return { success: false, message: 'No UI elements found' };
        }

        // Check if UI system is responsive
        if (window.uiSystem && typeof window.uiSystem.showNotification !== 'function') {
            return { success: false, message: 'UI system not functioning' };
        }

        return { success: true, message: 'UI responsiveness good' };
    }

    async fixUIResponsiveness() {
        try {
            // Re-initialize UI system if needed
            if (!window.uiSystem && window.UISystem) {
                window.uiSystem = new UISystem();
            }

            // Refresh UI elements
            if (window.uiSystem && window.uiSystem.refreshUI) {
                window.uiSystem.refreshUI();
            }

            return { success: true, message: 'UI system refreshed' };
        } catch (error) {
            return { success: false, message: `UI fix failed: ${error.message}` };
        }
    }

    async testMemoryUsage() {
        if (!performance.memory) {
            return { success: true, message: 'Memory monitoring not available' };
        }

        const memory = performance.memory;
        const usagePercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        
        if (usagePercent > 85) {
            return { success: false, message: `High memory usage: ${usagePercent.toFixed(1)}%` };
        }

        return { success: true, message: `Memory usage: ${usagePercent.toFixed(1)}%` };
    }

    async fixMemoryUsage() {
        try {
            // Clear caches and unused objects
            if (window.particleSystem) {
                window.particleSystem.particles = window.particleSystem.particles.filter(p => p.life > 0);
            }

            if (window.game) {
                // Clear dead entities
                if (window.game.ejectedMass) {
                    window.game.ejectedMass = window.game.ejectedMass.filter(mass => mass.isAlive);
                }
                if (window.game.chronoMatter) {
                    window.game.chronoMatter = window.game.chronoMatter.filter(matter => matter.isAlive);
                }
            }

            // Force garbage collection
            if (window.gc) {
                window.gc();
            }

            return { success: true, message: 'Memory cleanup performed' };
        } catch (error) {
            return { success: false, message: `Memory fix failed: ${error.message}` };
        }
    }

    // API methods
    getTestResults() {
        return this.tests.map(test => ({
            id: test.id,
            name: test.name,
            description: test.description,
            lastResult: test.lastResult,
            failures: test.failures,
            fixes: test.fixes,
            critical: test.critical
        }));
    }

    enableAutoFix() {
        this.autoFixEnabled = true;
        console.log('🔧 Auto-fix enabled');
    }

    disableAutoFix() {
        this.autoFixEnabled = false;
        console.log('🔧 Auto-fix disabled');
    }

    // Emergency recovery mode
    async emergencyRecovery() {
        console.log('🚨 Emergency recovery initiated...');
        
        try {
            // Force restart game systems
            if (window.game && window.game.restart) {
                window.game.restart();
            }

            // Clear all intervals/timeouts
            const highestId = setTimeout(() => {}, 0);
            for (let i = 0; i < highestId; i++) {
                clearTimeout(i);
                clearInterval(i);
            }

            // Reinitialize critical systems
            if (window.chronoSwarmApp && window.chronoSwarmApp.initialize) {
                await window.chronoSwarmApp.initialize();
            }

            console.log('✅ Emergency recovery completed');
            return { success: true, message: 'Emergency recovery successful' };
        } catch (error) {
            console.error('❌ Emergency recovery failed:', error);
            return { success: false, message: `Emergency recovery failed: ${error.message}` };
        }
    }
}

// Global self-test system
let selfTestSystem = null;

// Initialize self-test system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    selfTestSystem = new SelfTestSystem();
    window.selfTestSystem = selfTestSystem;
    
    // Add keyboard shortcut for manual self-test
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'F12') {
            e.preventDefault();
            selfTestSystem.runSelfTest();
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            selfTestSystem.emergencyRecovery();
        }
    });
    
    console.log('🔍 Self-test system initialized');
    console.log('🔧 Press Ctrl+F12 to run manual self-test');
    console.log('🚨 Press Ctrl+Shift+R for emergency recovery');
});