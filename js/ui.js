// UI System for Chrono-Swarm
// Manages all user interface interactions, HUD updates, and modal windows

class UISystem {
    constructor() {
        this.currentScreen = 'loading';
        this.modals = new Set();
        this.notifications = [];
        this.tutorialStep = 0;
        this.tutorialActive = false;
        this.hudUpdateInterval = 1000 / 30; // 30 FPS for HUD updates
        this.lastHudUpdate = 0;
        
        // Cache DOM elements
        this.elements = this.cacheElements();
        
        this.initializeEventListeners();
        this.initializeLoading();
    }

    cacheElements() {
        return {
            // Screens
            loadingScreen: document.getElementById('loadingScreen'),
            mainMenu: document.getElementById('mainMenu'),
            gameCanvas: document.getElementById('gameCanvas'),
            gameHUD: document.getElementById('gameHUD'),
            deathScreen: document.getElementById('deathScreen'),
            
            // Loading
            loadingProgress: document.getElementById('loadingProgress'),
            
            // Main Menu
            playerName: document.getElementById('playerName'),
            playButton: document.getElementById('playButton'),
            storeButton: document.getElementById('storeButton'),
            chronoPassButton: document.getElementById('chronoPassButton'),
            settingsButton: document.getElementById('settingsButton'),
            playerLevel: document.getElementById('playerLevel'),
            chronoShards: document.getElementById('chronoShards'),
            
            // HUD
            leaderboardList: document.getElementById('leaderboardList'),
            playerMass: document.getElementById('playerMass'),
            xpProgress: document.getElementById('xpProgress'),
            xpText: document.getElementById('xpText'),
            chronoAbility: document.getElementById('chronoAbility'),
            abilityIcon: document.getElementById('abilityIcon'),
            abilityCooldown: document.getElementById('abilityCooldown'),
            minimap: document.getElementById('minimap'),
            
            // Modals
            storeModal: document.getElementById('storeModal'),
            chronoPassModal: document.getElementById('chronoPassModal'),
            settingsModal: document.getElementById('settingsModal'),
            closeStore: document.getElementById('closeStore'),
            closeChronoPass: document.getElementById('closeChronoPass'),
            closeSettings: document.getElementById('closeSettings'),
            
            // Store
            storeItems: document.getElementById('storeItems'),
            storeTabs: document.querySelectorAll('.store-tab'),
            
            // Chrono-Pass
            passTierTrack: document.getElementById('passTierTrack'),
            
            // Settings
            masterVolume: document.getElementById('masterVolume'),
            musicVolume: document.getElementById('musicVolume'),
            sfxVolume: document.getElementById('sfxVolume'),
            masterVolumeValue: document.getElementById('masterVolumeValue'),
            musicVolumeValue: document.getElementById('musicVolumeValue'),
            sfxVolumeValue: document.getElementById('sfxVolumeValue'),
            graphicsQuality: document.getElementById('graphicsQuality'),
            showMinimap: document.getElementById('showMinimap'),
            showDamageNumbers: document.getElementById('showDamageNumbers'),
            
            // Death Screen
            finalMass: document.getElementById('finalMass'),
            bestRank: document.getElementById('bestRank'),
            survivalTime: document.getElementById('survivalTime'),
            xpGained: document.getElementById('xpGained'),
            respawnButton: document.getElementById('respawnButton'),
            mainMenuButton: document.getElementById('mainMenuButton'),
            watchAdButton: document.getElementById('watchAdButton'),
            
            // Tutorial
            tutorialOverlay: document.getElementById('tutorialOverlay'),
            tutorialTitle: document.getElementById('tutorialTitle'),
            tutorialText: document.getElementById('tutorialText'),
            skipTutorial: document.getElementById('skipTutorial'),
            nextTutorial: document.getElementById('nextTutorial')
        };
    }

    initializeEventListeners() {
        // Main Menu
        this.elements.playButton?.addEventListener('click', () => this.startGame());
        this.elements.storeButton?.addEventListener('click', () => this.openStore());
        this.elements.chronoPassButton?.addEventListener('click', () => this.openChronoPass());
        this.elements.settingsButton?.addEventListener('click', () => this.openSettings());
        
        // Modal close buttons
        this.elements.closeStore?.addEventListener('click', () => this.closeModal('store'));
        this.elements.closeChronoPass?.addEventListener('click', () => this.closeModal('chronoPass'));
        this.elements.closeSettings?.addEventListener('click', () => this.closeModal('settings'));
        
        // Store tabs
        this.elements.storeTabs?.forEach(tab => {
            tab.addEventListener('click', () => this.switchStoreTab(tab.dataset.tab));
        });
        
        // Settings controls
        this.setupVolumeControls();
        this.setupSettingsControls();
        
        // Death screen
        this.elements.respawnButton?.addEventListener('click', () => this.respawn());
        this.elements.mainMenuButton?.addEventListener('click', () => this.returnToMainMenu());
        this.elements.watchAdButton?.addEventListener('click', () => this.watchRewardedAd());
        
        // Tutorial
        this.elements.skipTutorial?.addEventListener('click', () => this.skipTutorial());
        this.elements.nextTutorial?.addEventListener('click', () => this.nextTutorialStep());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Click outside modals to close
        document.addEventListener('click', (e) => this.handleModalClicks(e));
        
        // Player name input
        this.elements.playerName?.addEventListener('input', () => this.validatePlayerName());
        this.elements.playerName?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.startGame();
        });
    }

    initializeLoading() {
        this.currentScreen = 'loading';
        this.updateLoadingProgress(0, 'Initializing systems...');
        
        // Simulate loading progress
        let progress = 0;
        const loadingSteps = [
            { progress: 20, text: 'Loading assets...' },
            { progress: 40, text: 'Initializing audio system...' },
            { progress: 60, text: 'Setting up game world...' },
            { progress: 80, text: 'Connecting systems...' },
            { progress: 100, text: 'Ready to play!' }
        ];
        
        loadingSteps.forEach((step, index) => {
            setTimeout(() => {
                this.updateLoadingProgress(step.progress, step.text);
                
                if (step.progress === 100) {
                    setTimeout(() => this.showMainMenu(), 500);
                }
            }, (index + 1) * 800);
        });
    }

    updateLoadingProgress(percentage, text) {
        if (this.elements.loadingProgress) {
            this.elements.loadingProgress.style.width = `${percentage}%`;
        }
        
        const loadingText = document.querySelector('.loading-text');
        if (loadingText && text) {
            loadingText.textContent = text;
        }
    }

    showMainMenu() {
        this.hideAllScreens();
        this.elements.mainMenu?.classList.remove('hidden');
        this.currentScreen = 'mainMenu';
        
        // Update player stats in main menu
        this.updateMainMenuStats();
        
        // Load saved player name
        const savedName = GameUtils.loadFromLocalStorage('player_name', '');
        if (savedName && this.elements.playerName) {
            this.elements.playerName.value = savedName;
        }
        
        // Play menu music
        if (window.audioSystem) {
            window.audioSystem.playMusic('ambient');
        }
    }

    updateMainMenuStats() {
        if (window.playerProgression) {
            const progression = window.playerProgression;
            
            if (this.elements.playerLevel) {
                this.elements.playerLevel.textContent = progression.level;
            }
            
            if (this.elements.chronoShards) {
                this.elements.chronoShards.textContent = GameUtils.formatNumber(progression.chronoShards);
            }
        }
    }

    validatePlayerName() {
        const name = this.elements.playerName?.value.trim() || '';
        const isValid = name.length >= 1 && name.length <= 20;
        
        if (this.elements.playButton) {
            this.elements.playButton.disabled = !isValid;
            this.elements.playButton.style.opacity = isValid ? '1' : '0.5';
        }
        
        return isValid;
    }

    startGame() {
        if (!this.validatePlayerName()) return;
        
        const playerName = this.elements.playerName?.value.trim() || 'Anonymous';
        
        // Save player name
        GameUtils.saveToLocalStorage('player_name', playerName);
        
        // Hide main menu and show game
        this.hideAllScreens();
        this.currentScreen = 'game';
        
        // Check if first time player for tutorial
        const isFirstTime = !GameUtils.loadFromLocalStorage('has_played_before', false);
        
        if (isFirstTime) {
            this.startTutorial();
        }
        
        // Start the actual game
        if (window.game) {
            window.game.startGame(playerName);
        }
        
        // Play UI sound
        if (window.audioSystem) {
            window.audioSystem.playUISound('click');
        }
    }

    updateHUD(gameState) {
        const now = Date.now();
        if (now - this.lastHudUpdate < this.hudUpdateInterval) return;
        this.lastHudUpdate = now;
        
        if (!gameState?.player) return;
        
        // Update player mass
        if (this.elements.playerMass) {
            this.elements.playerMass.textContent = GameUtils.formatNumber(gameState.player.getTotalMass());
        }
        
        // Update XP and level
        this.updateXPDisplay();
        
        // Update ability cooldown
        this.updateAbilityDisplay();
        
        // Update minimap
        this.updateMinimap(gameState);
    }

    updateXPDisplay() {
        if (!window.playerProgression) return;
        
        const progression = window.playerProgression;
        const currentXP = progression.xp;
        const requiredXP = GameUtils.getRequiredXP(progression.level);
        const xpProgress = (currentXP / requiredXP) * 100;
        
        if (this.elements.xpProgress) {
            this.elements.xpProgress.style.width = `${Math.min(xpProgress, 100)}%`;
        }
        
        if (this.elements.xpText) {
            this.elements.xpText.textContent = `Level ${progression.level} - ${currentXP}/${requiredXP} XP`;
        }
    }

    updateAbilityDisplay() {
        if (!window.abilityManager) return;
        
        const abilityManager = window.abilityManager;
        const currentAbility = abilityManager.getCurrentAbility();
        
        if (!currentAbility) return;
        
        // Update ability icon
        if (this.elements.abilityIcon) {
            this.elements.abilityIcon.className = `ability-icon ${currentAbility.name.toLowerCase().replace(' ', '-')}-icon`;
        }
        
        // Update cooldown display
        const cooldownInfo = abilityManager.getCooldownInfo(abilityManager.currentAbility);
        if (cooldownInfo && this.elements.abilityCooldown) {
            if (cooldownInfo.remaining > 0) {
                const seconds = Math.ceil(cooldownInfo.remaining / 1000);
                this.elements.abilityCooldown.textContent = seconds;
                this.elements.abilityCooldown.style.display = 'flex';
            } else {
                this.elements.abilityCooldown.style.display = 'none';
            }
        }
    }

    updateLeaderboard(players) {
        if (!this.elements.leaderboardList) return;
        
        this.elements.leaderboardList.innerHTML = '';
        
        players.slice(0, 10).forEach((player, index) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'leaderboard-entry';
            if (player === window.game?.player) {
                playerElement.classList.add('current-player');
            }
            
            playerElement.innerHTML = `
                <span class="rank">${index + 1}</span>
                <span class="name">${player.name}</span>
                <span class="mass">${GameUtils.formatNumber(player.getTotalMass())}</span>
            `;
            
            this.elements.leaderboardList.appendChild(playerElement);
        });
    }

    updateMinimap(gameState) {
        if (!this.elements.minimap || !gameState?.player) return;
        
        const canvas = this.elements.minimap;
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions if not set
        if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = 200;
            canvas.height = 200;
        }
        
        // Clear minimap
        ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scale
        const scale = Math.min(canvas.width / GameConstants.ARENA_WIDTH, canvas.height / GameConstants.ARENA_HEIGHT);
        
        // Draw arena boundary
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, GameConstants.ARENA_WIDTH * scale, GameConstants.ARENA_HEIGHT * scale);
        
        // Draw temporal rifts
        if (window.game?.temporalRifts) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
            window.game.temporalRifts.forEach(rift => {
                const x = rift.position.x * scale;
                const y = rift.position.y * scale;
                const radius = Math.max(2, rift.radius * scale);
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        
        // Draw players
        if (window.game?.aiPlayers) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            window.game.aiPlayers.forEach(ai => {
                if (ai.isAlive) {
                    const center = ai.getCenterPosition();
                    const x = center.x * scale;
                    const y = center.y * scale;
                    const size = Math.max(1, Math.sqrt(ai.getTotalMass()) * scale * 0.1);
                    
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
        
        // Draw player (larger and colored)
        const playerCenter = gameState.player.getCenterPosition();
        const playerX = playerCenter.x * scale;
        const playerY = playerCenter.y * scale;
        const playerSize = Math.max(2, Math.sqrt(gameState.player.getTotalMass()) * scale * 0.1);
        
        ctx.fillStyle = 'rgba(0, 255, 255, 1)';
        ctx.beginPath();
        ctx.arc(playerX, playerY, playerSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw view border
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        const camera = window.game?.camera;
        if (camera) {
            const viewWidth = canvas.width / camera.zoom;
            const viewHeight = canvas.height / camera.zoom;
            const viewX = (camera.position.x - viewWidth / 2) * scale;
            const viewY = (camera.position.y - viewHeight / 2) * scale;
            
            ctx.strokeRect(viewX, viewY, viewWidth * scale, viewHeight * scale);
        }
    }

    openStore() {
        this.openModal('store');
        this.refreshStore();
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('open');
        }
    }

    refreshStore() {
        if (!window.storeSystem) return;
        
        // Load current tab
        const activeTab = document.querySelector('.store-tab.active')?.dataset.tab || 'evolutions';
        this.switchStoreTab(activeTab);
    }

    switchStoreTab(tabName) {
        // Update tab appearance
        this.elements.storeTabs?.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Load tab content
        if (this.elements.storeItems && window.storeSystem) {
            const items = window.storeSystem.getItemsByCategory(tabName);
            this.renderStoreItems(items, tabName);
        }
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('hover');
        }
    }

    renderStoreItems(items, category) {
        if (!this.elements.storeItems) return;
        
        this.elements.storeItems.innerHTML = '';
        
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'store-item';
            
            const isOwned = window.storeSystem?.isOwned(item.id) || false;
            const canAfford = window.playerProgression?.chronoShards >= item.price;
            
            if (isOwned) {
                itemElement.classList.add('owned');
            } else if (!canAfford) {
                itemElement.classList.add('locked');
            }
            
            itemElement.innerHTML = `
                <div class="item-preview" style="background: ${item.preview || '#333'}"></div>
                <div class="item-info">
                    <h4 class="item-name">${item.name}</h4>
                    <p class="item-description">${item.description}</p>
                    <div class="item-footer">
                        <span class="item-price">${isOwned ? 'OWNED' : `${item.price} Shards`}</span>
                        ${!isOwned ? `<button class="buy-button" ${!canAfford ? 'disabled' : ''}>BUY</button>` : ''}
                    </div>
                </div>
            `;
            
            // Add purchase handler
            const buyButton = itemElement.querySelector('.buy-button');
            if (buyButton && !isOwned && canAfford) {
                buyButton.addEventListener('click', () => this.purchaseItem(item));
            }
            
            this.elements.storeItems.appendChild(itemElement);
        });
    }

    purchaseItem(item) {
        if (window.storeSystem?.purchaseItem(item.id)) {
            this.showNotification(`Purchased ${item.name}!`, 'success');
            this.refreshStore();
            this.updateMainMenuStats();
            
            if (window.audioSystem) {
                window.audioSystem.playUISound('click');
            }
        } else {
            this.showNotification('Purchase failed!', 'error');
        }
    }

    openChronoPass() {
        this.openModal('chronoPass');
        this.refreshChronoPass();
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('open');
        }
    }

    refreshChronoPass() {
        if (!this.elements.passTierTrack || !window.storeSystem) return;
        
        this.elements.passTierTrack.innerHTML = '';
        
        const passData = window.storeSystem.getChronoPassData();
        
        passData.tiers.forEach((tier, index) => {
            const tierElement = document.createElement('div');
            tierElement.className = 'pass-tier';
            
            const isUnlocked = passData.currentTier >= index;
            const isCurrent = passData.currentTier === index;
            
            if (isUnlocked) tierElement.classList.add('unlocked');
            if (isCurrent) tierElement.classList.add('current');
            
            tierElement.innerHTML = `
                <div class="tier-number">${index + 1}</div>
                <div class="tier-rewards">
                    <div class="free-reward">
                        <span class="reward-name">${tier.freeReward.name}</span>
                    </div>
                    <div class="premium-reward ${passData.hasPremium ? 'available' : 'locked'}">
                        <span class="reward-name">${tier.premiumReward.name}</span>
                    </div>
                </div>
            `;
            
            this.elements.passTierTrack.appendChild(tierElement);
        });
    }

    openSettings() {
        this.openModal('settings');
        this.loadSettingsValues();
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('open');
        }
    }

    loadSettingsValues() {
        if (window.audioSystem) {
            const settings = window.audioSystem.getSettings();
            
            if (this.elements.masterVolume) {
                this.elements.masterVolume.value = Math.round(settings.masterVolume * 100);
                this.elements.masterVolumeValue.textContent = `${Math.round(settings.masterVolume * 100)}%`;
            }
            
            if (this.elements.musicVolume) {
                this.elements.musicVolume.value = Math.round(settings.musicVolume * 100);
                this.elements.musicVolumeValue.textContent = `${Math.round(settings.musicVolume * 100)}%`;
            }
            
            if (this.elements.sfxVolume) {
                this.elements.sfxVolume.value = Math.round(settings.sfxVolume * 100);
                this.elements.sfxVolumeValue.textContent = `${Math.round(settings.sfxVolume * 100)}%`;
            }
        }
        
        // Load other settings from localStorage
        const savedSettings = GameUtils.loadFromLocalStorage('game_settings', {});
        
        if (this.elements.graphicsQuality) {
            this.elements.graphicsQuality.value = savedSettings.graphicsQuality || 'medium';
        }
        
        if (this.elements.showMinimap) {
            this.elements.showMinimap.checked = savedSettings.showMinimap !== false;
        }
        
        if (this.elements.showDamageNumbers) {
            this.elements.showDamageNumbers.checked = savedSettings.showDamageNumbers !== false;
        }
    }

    setupVolumeControls() {
        // Master volume
        this.elements.masterVolume?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 100;
            if (window.audioSystem) {
                window.audioSystem.setMasterVolume(value);
            }
            this.elements.masterVolumeValue.textContent = `${e.target.value}%`;
        });
        
        // Music volume
        this.elements.musicVolume?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 100;
            if (window.audioSystem) {
                window.audioSystem.setMusicVolume(value);
            }
            this.elements.musicVolumeValue.textContent = `${e.target.value}%`;
        });
        
        // SFX volume
        this.elements.sfxVolume?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 100;
            if (window.audioSystem) {
                window.audioSystem.setSFXVolume(value);
            }
            this.elements.sfxVolumeValue.textContent = `${e.target.value}%`;
        });
    }

    setupSettingsControls() {
        // Graphics quality
        this.elements.graphicsQuality?.addEventListener('change', (e) => {
            this.saveGameSetting('graphicsQuality', e.target.value);
            this.applyGraphicsSettings(e.target.value);
        });
        
        // Show minimap
        this.elements.showMinimap?.addEventListener('change', (e) => {
            this.saveGameSetting('showMinimap', e.target.checked);
            if (this.elements.minimap) {
                this.elements.minimap.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        // Show damage numbers
        this.elements.showDamageNumbers?.addEventListener('change', (e) => {
            this.saveGameSetting('showDamageNumbers', e.target.checked);
        });
    }

    saveGameSetting(key, value) {
        const settings = GameUtils.loadFromLocalStorage('game_settings', {});
        settings[key] = value;
        GameUtils.saveToLocalStorage('game_settings', settings);
    }

    applyGraphicsSettings(quality) {
        // Apply graphics quality settings
        if (window.particleSystem) {
            switch (quality) {
                case 'low':
                    window.particleSystem.maxParticles = 200;
                    break;
                case 'medium':
                    window.particleSystem.maxParticles = 350;
                    break;
                case 'high':
                    window.particleSystem.maxParticles = 500;
                    break;
            }
        }
    }

    showDeathScreen(stats, xpGained) {
        this.hideAllScreens();
        this.elements.deathScreen?.classList.remove('hidden');
        this.currentScreen = 'death';
        
        // Update death stats
        if (this.elements.finalMass) {
            this.elements.finalMass.textContent = GameUtils.formatNumber(stats.mass);
        }
        
        if (this.elements.bestRank) {
            this.elements.bestRank.textContent = stats.rank > 0 ? `#${stats.rank}` : '-';
        }
        
        if (this.elements.survivalTime) {
            this.elements.survivalTime.textContent = GameUtils.formatTime(stats.survivalTime / 1000);
        }
        
        if (this.elements.xpGained) {
            this.elements.xpGained.textContent = `+${xpGained}`;
        }
        
        // Check if ad is available
        if (this.elements.watchAdButton) {
            const dailyAdsWatched = GameUtils.loadFromLocalStorage('daily_ads_watched', 0);
            const today = new Date().toDateString();
            const lastAdDate = GameUtils.loadFromLocalStorage('last_ad_date', '');
            
            if (lastAdDate !== today) {
                GameUtils.saveToLocalStorage('daily_ads_watched', 0);
                GameUtils.saveToLocalStorage('last_ad_date', today);
            }
            
            this.elements.watchAdButton.style.display = 
                dailyAdsWatched < GameConstants.DAILY_AD_LIMIT ? 'block' : 'none';
        }
    }

    respawn() {
        if (window.game) {
            window.game.respawn();
        }
        
        this.hideAllScreens();
        this.currentScreen = 'game';
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('click');
        }
    }

    returnToMainMenu() {
        if (window.game) {
            window.game.returnToMainMenu();
        }
        
        this.showMainMenu();
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('click');
        }
    }

    watchRewardedAd() {
        // Simulate watching an ad
        this.showNotification('Simulating ad... (+50 Chrono-Shards)', 'info');
        
        setTimeout(() => {
            if (window.playerProgression) {
                window.playerProgression.addChronoShards(GameConstants.AD_REWARD_SHARDS);
            }
            
            // Update daily ad count
            const dailyAds = GameUtils.loadFromLocalStorage('daily_ads_watched', 0);
            GameUtils.saveToLocalStorage('daily_ads_watched', dailyAds + 1);
            
            this.showNotification(`+${GameConstants.AD_REWARD_SHARDS} Chrono-Shards earned!`, 'success');
            
            // Hide ad button if limit reached
            if (dailyAds + 1 >= GameConstants.DAILY_AD_LIMIT) {
                this.elements.watchAdButton.style.display = 'none';
            }
        }, 2000);
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('click');
        }
    }

    // Tutorial System
    startTutorial() {
        this.tutorialActive = true;
        this.tutorialStep = 0;
        this.showTutorialStep();
    }

    showTutorialStep() {
        if (!this.tutorialActive) return;
        
        const tutorialSteps = [
            {
                title: "Welcome to Chrono-Swarm",
                text: "Move your swarm with the mouse to consume Chrono-Matter and grow larger."
            },
            {
                title: "Split Your Swarm",
                text: "Press SPACE to split your swarm. Larger pieces can consume smaller ones!"
            },
            {
                title: "Eject Mass",
                text: "Press W to eject mass and move faster or feed other players."
            },
            {
                title: "Chrono-Abilities",
                text: "Press Q to use your Chrono-Ability. Start with Stasis Field to slow enemies!"
            },
            {
                title: "Temporal Rifts",
                text: "Avoid the green Temporal Rifts - they can shatter your swarm!"
            },
            {
                title: "Good Luck!",
                text: "Dominate the arena and climb the leaderboard. Have fun!"
            }
        ];
        
        const step = tutorialSteps[this.tutorialStep];
        if (!step) {
            this.endTutorial();
            return;
        }
        
        if (this.elements.tutorialOverlay) {
            this.elements.tutorialOverlay.classList.remove('hidden');
            this.elements.tutorialTitle.textContent = step.title;
            this.elements.tutorialText.textContent = step.text;
        }
    }

    nextTutorialStep() {
        this.tutorialStep++;
        this.showTutorialStep();
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('click');
        }
    }

    skipTutorial() {
        this.endTutorial();
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('click');
        }
    }

    endTutorial() {
        this.tutorialActive = false;
        this.elements.tutorialOverlay?.classList.add('hidden');
        GameUtils.saveToLocalStorage('has_played_before', true);
    }

    // Modal System
    openModal(modalName) {
        const modal = this.elements[`${modalName}Modal`];
        if (modal) {
            modal.classList.remove('hidden');
            this.modals.add(modalName);
        }
    }

    closeModal(modalName) {
        const modal = this.elements[`${modalName}Modal`];
        if (modal) {
            modal.classList.add('hidden');
            this.modals.delete(modalName);
        }
        
        if (window.audioSystem) {
            window.audioSystem.playUISound('close');
        }
    }

    closeAllModals() {
        this.modals.forEach(modalName => this.closeModal(modalName));
    }

    // Notification System
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Position notification
        notification.style.position = 'fixed';
        notification.style.top = `${20 + this.notifications.length * 60}px`;
        notification.style.right = '20px';
        notification.style.zIndex = '10000';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.color = 'white';
        notification.style.fontWeight = 'bold';
        notification.style.minWidth = '200px';
        notification.style.textAlign = 'center';
        notification.style.transition = 'all 0.3s ease';
        notification.style.transform = 'translateX(100%)';
        
        // Set color based on type
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(45deg, #00ff88, #00cc66)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(45deg, #ff6b6b, #ee4444)';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(45deg, #ffb84d, #ff9500)';
                break;
            default:
                notification.style.background = 'linear-gradient(45deg, #00ffff, #0088cc)';
        }
        
        document.body.appendChild(notification);
        this.notifications.push(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
    }

    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
            
            // Reposition remaining notifications
            this.notifications.forEach((notif, i) => {
                notif.style.top = `${20 + i * 60}px`;
            });
        }, 300);
    }

    // Utility Methods
    hideAllScreens() {
        const screens = [
            this.elements.loadingScreen,
            this.elements.mainMenu,
            this.elements.gameCanvas,
            this.elements.gameHUD,
            this.elements.deathScreen
        ];
        
        screens.forEach(screen => {
            screen?.classList.add('hidden');
        });
    }

    handleKeyboardShortcuts(e) {
        // Escape key - close modals or return to menu
        if (e.key === 'Escape') {
            if (this.modals.size > 0) {
                this.closeAllModals();
            } else if (this.currentScreen === 'game') {
                // Pause menu could go here
            }
        }
        
        // F11 - Toggle fullscreen
        if (e.key === 'F11') {
            e.preventDefault();
            this.toggleFullscreen();
        }
        
        // M - Mute/unmute
        if (e.key === 'm' || e.key === 'M') {
            if (window.audioSystem) {
                window.audioSystem.toggleMute();
                const isMuted = window.audioSystem.isMuted;
                this.showNotification(isMuted ? 'Audio Muted' : 'Audio Unmuted', 'info', 1000);
            }
        }
    }

    handleModalClicks(e) {
        // Close modal when clicking background
        if (e.target.classList.contains('modal')) {
            const modalName = e.target.id.replace('Modal', '');
            this.closeModal(modalName);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // Performance and cleanup
    destroy() {
        // Clean up notifications
        this.notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        this.notifications = [];
        
        // Clean up modals
        this.closeAllModals();
        
        console.log('UI System destroyed');
    }
}

// Initialize global UI system
if (typeof window !== 'undefined') {
    window.uiSystem = new UISystem();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UISystem };
}