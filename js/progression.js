// Progression System for Chrono-Swarm
// Handles player progression, XP, levels, unlockables, and achievements

class PlayerProgression {
    constructor() {
        this.level = 1;
        this.xp = 0;
        this.totalXP = 0;
        this.chronoShards = 0;
        this.statistics = new PlayerStatistics();
        this.unlockedAbilities = new Set(['stasis']);
        this.unlockedFormations = new Set(['default']);
        this.unlockedCosmetics = new Set();
        this.achievements = new Set();
        this.currentSeason = 1;
        // Chrono-pass removed
        this.lastPlayDate = null;
        this.playtime = 0; // Total playtime in milliseconds
        
        // Load saved progression
        this.loadProgression();
        
        // Update daily login
        this.checkDailyLogin();
    }

    gainXP(amount, source = 'general') {
        const oldLevel = this.level;
        this.xp += amount;
        this.totalXP += amount;
        
        // Track XP sources for analytics
        this.statistics.addXP(amount, source);
        
        // Check for level up
        const leveledUp = this.checkLevelUp();
        
        if (leveledUp) {
            this.onLevelUp(oldLevel);
        }
        
        // Save progression
        this.saveProgression();
        
        return {
            gained: amount,
            currentXP: this.xp,
            currentLevel: this.level,
            leveledUp: leveledUp,
            newLevel: this.level
        };
    }

    checkLevelUp() {
        const requiredXP = this.getRequiredXP();
        let leveledUp = false;
        
        while (this.xp >= requiredXP) {
            this.xp -= requiredXP;
            this.level++;
            leveledUp = true;
            
            // Check for unlocks at new level
            this.checkUnlocks();
        }
        
        return leveledUp;
    }

    onLevelUp(oldLevel) {
        // Play level up sound effect
        if (window.audioSystem) {
            window.audioSystem.playGameSound('level_up');
        }
        
        // Create visual effect
        if (window.particleSystem) {
            // This will be called from the game when player levels up
        }
        
        // Grant Chrono-Shards reward
        const shardReward = this.calculateLevelUpReward();
        this.addChronoShards(shardReward, 'Level Up');
        
        console.log(`Level up! ${oldLevel} -> ${this.level}, gained ${shardReward} Chrono-Shards`);
    }

    calculateLevelUpReward() {
        // Base reward + bonus for higher levels
        return Math.floor(50 + (this.level * 5));
    }

    getRequiredXP() {
        return GameUtils.getRequiredXP(this.level);
    }

    getProgressToNextLevel() {
        const required = this.getRequiredXP();
        return {
            current: this.xp,
            required: required,
            percentage: Math.min(100, (this.xp / required) * 100)
        };
    }

    checkUnlocks() {
        const unlocks = GameConstants.UNLOCK_LEVELS;
        
        // Check ability unlocks
        if (this.level >= unlocks.ECHO && !this.unlockedAbilities.has('echo')) {
            this.unlockAbility('echo');
        }
        
        if (this.level >= unlocks.REWIND && !this.unlockedAbilities.has('rewind')) {
            this.unlockAbility('rewind');
        }
        
        // Check formation unlocks
        Object.entries(unlocks.FORMATIONS).forEach(([formation, level]) => {
            const formationKey = formation.toLowerCase();
            if (this.level >= level && !this.unlockedFormations.has(formationKey)) {
                this.unlockFormation(formationKey);
            }
        });
    }

    unlockAbility(abilityName) {
        this.unlockedAbilities.add(abilityName);
        this.showUnlockNotification('ability', abilityName);
        
        // Achievement for first ability unlock
        if (abilityName === 'echo') {
            this.unlockAchievement('first_ability');
        }
    }

    unlockFormation(formationName) {
        this.unlockedFormations.add(formationName);
        this.showUnlockNotification('formation', formationName);
    }

    unlockCosmetic(cosmeticId) {
        this.unlockedCosmetics.add(cosmeticId);
        this.showUnlockNotification('cosmetic', cosmeticId);
    }

    showUnlockNotification(type, itemName) {
        // This will be handled by the UI system
        console.log(`Unlocked ${type}: ${itemName}`);
        
        if (window.audioSystem) {
            window.audioSystem.playGameSound('achievement');
        }
    }

    addChronoShards(amount, source = 'unknown') {
        this.chronoShards += amount;
        this.statistics.recordShardGain(amount, source);
        this.saveProgression();
        
        return this.chronoShards;
    }

    updateStatistics(gameResults) {
        // Update statistics with game results
        this.statistics.recordGameSession(gameResults);
        this.saveProgression();
    }

    spendChronoShards(amount, item = 'unknown') {
        if (this.chronoShards >= amount) {
            this.chronoShards -= amount;
            this.statistics.recordShardSpent(amount, item);
            this.saveProgression();
            return true;
        }
        return false;
    }

    // Achievement system
    unlockAchievement(achievementId) {
        if (!this.achievements.has(achievementId)) {
            this.achievements.add(achievementId);
            
            const achievement = this.getAchievementData(achievementId);
            if (achievement) {
                this.addChronoShards(achievement.reward, 'Achievement');
                this.showAchievementNotification(achievement);
            }
            
            this.saveProgression();
        }
    }

    getAchievementData(achievementId) {
        const achievements = {
            'first_kill': {
                name: 'First Blood',
                description: 'Consume your first opponent',
                reward: 100
            },
            'first_ability': {
                name: 'Temporal Novice',
                description: 'Unlock your first Chrono-Ability',
                reward: 150
            },
            'level_10': {
                name: 'Rising Star',
                description: 'Reach level 10',
                reward: 200
            },
            'level_25': {
                name: 'Temporal Adept',
                description: 'Reach level 25',
                reward: 500
            },
            'mass_1000': {
                name: 'Heavyweight',
                description: 'Reach 1000 mass in a single game',
                reward: 250
            },
            'survival_300': {
                name: 'Endurance',
                description: 'Survive for 5 minutes in a single game',
                reward: 200
            },
            'top_3': {
                name: 'Podium Finish',
                description: 'Finish in the top 3 of a match',
                reward: 300
            },
            'winner': {
                name: 'Domination',
                description: 'Win a match',
                reward: 500
            },
            'kill_streak_5': {
                name: 'Unstoppable',
                description: 'Consume 5 players without dying',
                reward: 400
            },
            'ability_master': {
                name: 'Chrono Master',
                description: 'Unlock all Chrono-Abilities',
                reward: 1000
            }
        };
        
        return achievements[achievementId];
    }

    showAchievementNotification(achievement) {
        console.log(`Achievement Unlocked: ${achievement.name} - ${achievement.description} (+${achievement.reward} Chrono-Shards)`);
    }

    checkAchievements(gameData) {
        // Check level-based achievements
        if (this.level >= 10) this.unlockAchievement('level_10');
        if (this.level >= 25) this.unlockAchievement('level_25');
        
        // Check game-specific achievements
        if (gameData) {
            if (gameData.maxMass >= 1000) {
                this.unlockAchievement('mass_1000');
            }
            
            if (gameData.survivalTime >= 300000) { // 5 minutes
                this.unlockAchievement('survival_300');
            }
            
            if (gameData.finalRank <= 3) {
                this.unlockAchievement('top_3');
            }
            
            if (gameData.finalRank === 1) {
                this.unlockAchievement('winner');
            }
            
            if (gameData.kills >= 5 && gameData.deathCount === 0) {
                this.unlockAchievement('kill_streak_5');
            }
            
            if (gameData.kills > 0 && !this.achievements.has('first_kill')) {
                this.unlockAchievement('first_kill');
            }
        }
        
        // Check ability unlock achievement
        if (this.unlockedAbilities.size >= 3) {
            this.unlockAchievement('ability_master');
        }
    }

    // Chrono-Pass progression
    gainChronoPassXP(amount) {
        // Simple linear progression for battle pass
        const xpPerTier = 1000;
        const newTier = Math.floor(this.totalXP / xpPerTier) + 1;
        
        if (newTier > this.chronoPassTier) {
            this.chronoPassTier = newTier;
            this.onChronoPassTierUp();
        }
    }

    onChronoPassTierUp() {
        console.log(`Chrono-Pass Tier Up! Now tier ${this.chronoPassTier}`);
        
        // Grant tier rewards
        const rewards = this.getChronoPassRewards(this.chronoPassTier);
        this.applyChronoPassRewards(rewards);
    }

    getChronoPassRewards(tier) {
        const baseRewards = {
            // Free track rewards
            free: this.getFreeTrackRewards(tier),
            // Premium track rewards (if owned)
            premium: this.chronoPassPremium ? this.getPremiumTrackRewards(tier) : null
        };
        
        return baseRewards;
    }

    getFreeTrackRewards(tier) {
        // Every 5 tiers on free track
        if (tier % 5 === 0) {
            return {
                type: 'shards',
                amount: 50
            };
        }
        return null;
    }

    getPremiumTrackRewards(tier) {
        const premiumRewards = {
            1: { type: 'shards', amount: 100 },
            3: { type: 'cosmetic', id: 'starter_skin' },
            5: { type: 'shards', amount: 150 },
            7: { type: 'formation', id: 'premium_formation' },
            10: { type: 'cosmetic', id: 'premium_trail' },
            15: { type: 'shards', amount: 300 },
            20: { type: 'cosmetic', id: 'legendary_skin' }
        };
        
        return premiumRewards[tier] || null;
    }

    applyChronoPassRewards(rewards) {
        if (rewards.free) {
            this.applyReward(rewards.free);
        }
        
        if (rewards.premium) {
            this.applyReward(rewards.premium);
        }
    }

    applyReward(reward) {
        switch (reward.type) {
            case 'shards':
                this.addChronoShards(reward.amount, 'Chrono-Pass');
                break;
            case 'cosmetic':
                this.unlockCosmetic(reward.id);
                break;
            case 'formation':
                this.unlockFormation(reward.id);
                break;
        }
    }

    purchaseChronoPass() {
        // In a real game, this would involve payment processing
        this.chronoPassPremium = true;
        
        // Retroactively grant premium rewards for current tier
        for (let tier = 1; tier <= this.chronoPassTier; tier++) {
            const premiumReward = this.getPremiumTrackRewards(tier);
            if (premiumReward) {
                this.applyReward(premiumReward);
            }
        }
        
        this.saveProgression();
    }

    // Daily login system
    checkDailyLogin() {
        const today = new Date().toDateString();
        const lastLogin = this.lastPlayDate;
        
        if (lastLogin !== today) {
            this.onDailyLogin();
            this.lastPlayDate = today;
            this.saveProgression();
        }
    }

    onDailyLogin() {
        const dailyReward = 25;
        this.addChronoShards(dailyReward, 'Daily Login');
        console.log(`Daily login bonus: +${dailyReward} Chrono-Shards`);
    }

    // Game session tracking
    startGameSession() {
        this.sessionStartTime = Date.now();
    }

    endGameSession(gameResults) {
        if (this.sessionStartTime) {
            const sessionTime = Date.now() - this.sessionStartTime;
            this.playtime += sessionTime;
            
            // Calculate XP based on performance
            const xpGained = this.calculateSessionXP(gameResults, sessionTime);
            const xpResult = this.gainXP(xpGained.total, 'Game');
            
            // Update statistics
            this.statistics.recordGameSession(gameResults);
            
            // Check achievements
            this.checkAchievements(gameResults);
            
            // Chrono-pass removed
            
            this.sessionStartTime = null;
            this.saveProgression();
            
            return {
                xp: xpResult,
                breakdown: xpGained.breakdown,
                statistics: this.statistics.getLastGameStats()
            };
        }
        
        return null;
    }

    calculateSessionXP(results, sessionTime) {
        const breakdown = {};
        let total = 0;
        
        // Base survival XP (2 XP per second)
        const survivalXP = Math.floor(sessionTime / 1000) * 2;
        breakdown.survival = survivalXP;
        total += survivalXP;
        
        // Mass XP (0.1 XP per mass point at death)
        const massXP = Math.floor(results.finalMass * 0.1);
        breakdown.mass = massXP;
        total += massXP;
        
        // Kill XP (50 XP per kill)
        const killXP = results.kills * 50;
        breakdown.kills = killXP;
        total += killXP;
        
        // Rank bonus (bonus for high placement)
        let rankBonus = 0;
        if (results.finalRank === 1) rankBonus = 200;
        else if (results.finalRank <= 3) rankBonus = 100;
        else if (results.finalRank <= 5) rankBonus = 50;
        
        breakdown.rank = rankBonus;
        total += rankBonus;
        
        return { total, breakdown };
    }

    // Data access methods
    getProgressionData() {
        return {
            level: this.level,
            xp: this.xp,
            totalXP: this.totalXP,
            chronoShards: this.chronoShards,
            progress: this.getProgressToNextLevel(),
            unlockedAbilities: Array.from(this.unlockedAbilities),
            unlockedFormations: Array.from(this.unlockedFormations),
            unlockedCosmetics: Array.from(this.unlockedCosmetics),
            achievements: Array.from(this.achievements),
            // chronoPassTier: removed,
            // chronoPassPremium: removed,
            playtime: this.playtime
        };
    }

    getStatistics() {
        return this.statistics.getAllStats();
    }

    // Save/Load progression
    saveProgression() {
        const data = {
            level: this.level,
            xp: this.xp,
            totalXP: this.totalXP,
            chronoShards: this.chronoShards,
            unlockedAbilities: Array.from(this.unlockedAbilities),
            unlockedFormations: Array.from(this.unlockedFormations),
            unlockedCosmetics: Array.from(this.unlockedCosmetics),
            achievements: Array.from(this.achievements),
            // chronoPassTier: removed,
            // chronoPassPremium: removed,
            lastPlayDate: this.lastPlayDate,
            playtime: this.playtime,
            statistics: this.statistics.getSaveData()
        };
        
        GameUtils.saveToLocalStorage('player_progression', data);
    }

    loadProgression() {
        const data = GameUtils.loadFromLocalStorage('player_progression', {});
        
        if (data.level) this.level = data.level;
        if (data.xp) this.xp = data.xp;
        if (data.totalXP) this.totalXP = data.totalXP;
        if (data.chronoShards) this.chronoShards = data.chronoShards;
        if (data.unlockedAbilities) this.unlockedAbilities = new Set(data.unlockedAbilities);
        if (data.unlockedFormations) this.unlockedFormations = new Set(data.unlockedFormations);
        if (data.unlockedCosmetics) this.unlockedCosmetics = new Set(data.unlockedCosmetics);
        if (data.achievements) this.achievements = new Set(data.achievements);
        // Chrono-pass loading removed
        if (data.lastPlayDate) this.lastPlayDate = data.lastPlayDate;
        if (data.playtime) this.playtime = data.playtime;
        if (data.statistics) this.statistics.loadSaveData(data.statistics);
    }
}

class PlayerStatistics {
    constructor() {
        this.gamesPlayed = 0;
        this.totalKills = 0;
        this.totalDeaths = 0;
        this.totalMassConsumed = 0;
        this.totalSurvivalTime = 0;
        this.bestRank = Infinity;
        this.highestMass = 0;
        this.longestSurvival = 0;
        this.totalXPGained = 0;
        this.totalShardsGained = 0;
        this.totalShardsSpent = 0;
        this.abilitiesUsed = {};
        this.xpSources = {};
        this.shardSources = {};
        this.lastGameStats = null;
    }

    recordGameSession(results) {
        this.gamesPlayed++;
        this.totalKills += results.kills;
        this.totalDeaths += results.deathCount;
        this.totalMassConsumed += results.massConsumed || 0;
        this.totalSurvivalTime += results.survivalTime;
        this.bestRank = Math.min(this.bestRank, results.finalRank);
        this.highestMass = Math.max(this.highestMass, results.maxMass);
        this.longestSurvival = Math.max(this.longestSurvival, results.survivalTime);
        
        this.lastGameStats = {
            kills: results.kills,
            finalMass: results.finalMass,
            rank: results.finalRank,
            survivalTime: results.survivalTime
        };
    }

    addXP(amount, source) {
        this.totalXPGained += amount;
        this.xpSources[source] = (this.xpSources[source] || 0) + amount;
    }

    recordShardGain(amount, source) {
        this.totalShardsGained += amount;
        this.shardSources[source] = (this.shardSources[source] || 0) + amount;
    }

    recordShardSpent(amount, item) {
        this.totalShardsSpent += amount;
    }

    recordAbilityUse(abilityName) {
        this.abilitiesUsed[abilityName] = (this.abilitiesUsed[abilityName] || 0) + 1;
    }

    getKillDeathRatio() {
        return this.totalDeaths > 0 ? (this.totalKills / this.totalDeaths).toFixed(2) : this.totalKills;
    }

    getAverageSurvivalTime() {
        return this.gamesPlayed > 0 ? Math.floor(this.totalSurvivalTime / this.gamesPlayed) : 0;
    }

    getAllStats() {
        return {
            gamesPlayed: this.gamesPlayed,
            totalKills: this.totalKills,
            totalDeaths: this.totalDeaths,
            killDeathRatio: this.getKillDeathRatio(),
            totalMassConsumed: this.totalMassConsumed,
            totalSurvivalTime: this.totalSurvivalTime,
            averageSurvivalTime: this.getAverageSurvivalTime(),
            bestRank: this.bestRank === Infinity ? '-' : this.bestRank,
            highestMass: this.highestMass,
            longestSurvival: this.longestSurvival,
            totalXPGained: this.totalXPGained,
            totalShardsGained: this.totalShardsGained,
            totalShardsSpent: this.totalShardsSpent,
            abilitiesUsed: this.abilitiesUsed,
            xpSources: this.xpSources,
            shardSources: this.shardSources
        };
    }

    getLastGameStats() {
        return this.lastGameStats;
    }

    getSaveData() {
        return this.getAllStats();
    }

    loadSaveData(data) {
        Object.assign(this, data);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlayerProgression, PlayerStatistics };
}