// Store System for Chrono-Swarm
// Handles cosmetic purchases, Chrono-Pass progression, and monetization

class StoreSystem {
    constructor() {
        this.playerProgression = null;
        this.storeItems = this.initializeStoreItems();
        this.chronoPassData = this.initializeChronoPass();
        this.ownedItems = new Set();
        this.dailyAdCount = 0;
        this.lastAdDate = '';
        
        this.loadFromStorage();
    }

    setPlayerProgression(progression) {
        this.playerProgression = progression;
    }

    initializeStoreItems() {
        return {
            evolutions: [
                {
                    id: 'evo_plasma_core',
                    name: 'Plasma Core',
                    description: 'Your swarm glows with intense plasma energy',
                    price: 250,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ff0080, #8000ff)',
                    rarity: 'common'
                },
                {
                    id: 'evo_crystal_matrix',
                    name: 'Crystal Matrix',
                    description: 'Crystalline structure with prismatic reflections',
                    price: 500,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #00ffff, #ffffff)',
                    rarity: 'rare'
                },
                {
                    id: 'evo_shadow_void',
                    name: 'Shadow Void',
                    description: 'Dark energy that absorbs light itself',
                    price: 750,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #000000, #440044)',
                    rarity: 'epic'
                },
                {
                    id: 'evo_temporal_flux',
                    name: 'Temporal Flux',
                    description: 'Swirling time energy with reality distortions',
                    price: 1000,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ffff00, #00ffff)',
                    rarity: 'legendary'
                },
                {
                    id: 'evo_cosmic_storm',
                    name: 'Cosmic Storm',
                    description: 'Stellar matter from the heart of a galaxy',
                    price: 1500,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ff4400, #ffaa00)',
                    rarity: 'mythic'
                }
            ],
            
            effects: [
                {
                    id: 'fx_lightning_aura',
                    name: 'Lightning Aura',
                    description: 'Electric arcs dance around your swarm',
                    price: 300,
                    type: 'effect',
                    preview: '#ffff00',
                    rarity: 'common'
                },
                {
                    id: 'fx_fire_corona',
                    name: 'Fire Corona',
                    description: 'Burning flames surround your cells',
                    price: 400,
                    type: 'effect',
                    preview: '#ff4400',
                    rarity: 'common'
                },
                {
                    id: 'fx_ice_crystal',
                    name: 'Ice Crystal',
                    description: 'Freezing crystals form and shatter continuously',
                    price: 600,
                    type: 'effect',
                    preview: '#aaffff',
                    rarity: 'rare'
                },
                {
                    id: 'fx_quantum_distortion',
                    name: 'Quantum Distortion',
                    description: 'Reality bends and warps around your presence',
                    price: 800,
                    type: 'effect',
                    preview: '#ff00ff',
                    rarity: 'epic'
                },
                {
                    id: 'fx_gravitational_field',
                    name: 'Gravitational Field',
                    description: 'Space-time curves visibly around your swarm',
                    price: 1200,
                    type: 'effect',
                    preview: '#4400ff',
                    rarity: 'legendary'
                }
            ],
            
            trails: [
                {
                    id: 'trail_stardust',
                    name: 'Stardust Trail',
                    description: 'Leave a trail of glittering stardust',
                    price: 200,
                    type: 'trail',
                    preview: '#ffffff',
                    rarity: 'common'
                },
                {
                    id: 'trail_neon_spiral',
                    name: 'Neon Spiral',
                    description: 'Bright neon spirals follow your movement',
                    price: 350,
                    type: 'trail',
                    preview: '#00ff88',
                    rarity: 'common'
                },
                {
                    id: 'trail_temporal_echo',
                    name: 'Temporal Echo',
                    description: 'Echoes of your past positions fade slowly',
                    price: 550,
                    type: 'trail',
                    preview: '#ffaa00',
                    rarity: 'rare'
                },
                {
                    id: 'trail_void_stream',
                    name: 'Void Stream',
                    description: 'Dark energy streams behind your swarm',
                    price: 700,
                    type: 'trail',
                    preview: '#220022',
                    rarity: 'epic'
                },
                {
                    id: 'trail_rainbow_cascade',
                    name: 'Rainbow Cascade',
                    description: 'Cascading rainbow colors flow behind you',
                    price: 900,
                    type: 'trail',
                    preview: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)',
                    rarity: 'legendary'
                }
            ]
        };
    }

    initializeChronoPass() {
        return {
            currentTier: 0,
            maxTier: 50,
            hasPremium: false,
            premiumPrice: 1000, // Chrono-Shards
            experience: 0,
            experiencePerTier: 100,
            season: 1,
            seasonEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            
            tiers: this.generateChronoPassTiers()
        };
    }

    generateChronoPassTiers() {
        const tiers = [];
        
        for (let i = 0; i < 50; i++) {
            const tier = {
                tier: i + 1,
                freeReward: this.generateFreeReward(i),
                premiumReward: this.generatePremiumReward(i)
            };
            tiers.push(tier);
        }
        
        return tiers;
    }

    generateFreeReward(tierIndex) {
        if (tierIndex % 5 === 4) { // Every 5th tier
            return {
                type: 'shards',
                amount: 50 + tierIndex * 5,
                name: `${50 + tierIndex * 5} Chrono-Shards`,
                icon: '💎'
            };
        } else if (tierIndex % 10 === 9) { // Every 10th tier
            return {
                type: 'cosmetic',
                id: `free_cosmetic_${tierIndex}`,
                name: 'Free Cosmetic',
                icon: '✨'
            };
        } else {
            return {
                type: 'xp_boost',
                amount: 10,
                name: '10% XP Boost',
                icon: '⚡'
            };
        }
    }

    generatePremiumReward(tierIndex) {
        if (tierIndex % 3 === 2) { // Every 3rd tier
            return {
                type: 'shards',
                amount: 100 + tierIndex * 10,
                name: `${100 + tierIndex * 10} Chrono-Shards`,
                icon: '💎'
            };
        } else if (tierIndex % 7 === 6) { // Every 7th tier
            return {
                type: 'exclusive_cosmetic',
                id: `premium_cosmetic_${tierIndex}`,
                name: 'Exclusive Evolution',
                icon: '👑'
            };
        } else {
            return {
                type: 'ability_boost',
                amount: 5,
                name: '5% Ability Cooldown Reduction',
                icon: '🔮'
            };
        }
    }

    getItemsByCategory(category) {
        return this.storeItems[category] || [];
    }

    getAllItems() {
        const allItems = [];
        Object.values(this.storeItems).forEach(categoryItems => {
            allItems.push(...categoryItems);
        });
        return allItems;
    }

    getItemById(itemId) {
        const allItems = this.getAllItems();
        return allItems.find(item => item.id === itemId);
    }

    isOwned(itemId) {
        return this.ownedItems.has(itemId);
    }

    canAfford(itemId) {
        const item = this.getItemById(itemId);
        if (!item || !this.playerProgression) return false;
        
        return this.playerProgression.chronoShards >= item.price;
    }

    purchaseItem(itemId) {
        const item = this.getItemById(itemId);
        
        if (!item) {
            console.warn('Item not found:', itemId);
            return false;
        }
        
        if (this.isOwned(itemId)) {
            console.warn('Item already owned:', itemId);
            return false;
        }
        
        if (!this.canAfford(itemId)) {
            console.warn('Cannot afford item:', itemId);
            return false;
        }
        
        if (!this.playerProgression) {
            console.warn('No player progression system available');
            return false;
        }
        
        // Deduct cost
        this.playerProgression.spendChronoShards(item.price);
        
        // Add to owned items
        this.ownedItems.add(itemId);
        
        // Save to storage
        this.saveToStorage();
        
        // Play purchase sound
        if (window.audioSystem) {
            window.audioSystem.playUISound('click');
        }
        
        console.log(`Purchased item: ${item.name} for ${item.price} shards`);
        return true;
    }

    // Chrono-Pass System
    getChronoPassData() {
        return {
            currentTier: this.chronoPassData.currentTier,
            maxTier: this.chronoPassData.maxTier,
            hasPremium: this.chronoPassData.hasPremium,
            premiumPrice: this.chronoPassData.premiumPrice,
            experience: this.chronoPassData.experience,
            experiencePerTier: this.chronoPassData.experiencePerTier,
            season: this.chronoPassData.season,
            seasonEndDate: this.chronoPassData.seasonEndDate,
            tiers: this.chronoPassData.tiers,
            progressToNextTier: this.getProgressToNextTier()
        };
    }

    getProgressToNextTier() {
        const currentTierExp = this.chronoPassData.experience % this.chronoPassData.experiencePerTier;
        const progress = currentTierExp / this.chronoPassData.experiencePerTier;
        return {
            current: currentTierExp,
            required: this.chronoPassData.experiencePerTier,
            percentage: Math.floor(progress * 100)
        };
    }

    addChronoPassExperience(amount) {
        this.chronoPassData.experience += amount;
        
        // Check for tier ups
        const newTier = Math.floor(this.chronoPassData.experience / this.chronoPassData.experiencePerTier);
        const oldTier = this.chronoPassData.currentTier;
        
        if (newTier > oldTier && newTier <= this.chronoPassData.maxTier) {
            this.chronoPassData.currentTier = newTier;
            
            // Grant rewards for tiers gained
            for (let tier = oldTier + 1; tier <= newTier; tier++) {
                this.grantChronoPassRewards(tier - 1); // Array is 0-indexed
            }
            
            this.saveToStorage();
            
            // Show notification
            if (window.uiSystem) {
                window.uiSystem.showNotification(`Chrono-Pass Tier ${newTier} reached!`, 'success');
            }
        }
    }

    grantChronoPassRewards(tierIndex) {
        const tier = this.chronoPassData.tiers[tierIndex];
        if (!tier) return;
        
        // Grant free reward
        this.grantReward(tier.freeReward);
        
        // Grant premium reward if player has premium pass
        if (this.chronoPassData.hasPremium) {
            this.grantReward(tier.premiumReward);
        }
    }

    grantReward(reward) {
        if (!reward || !this.playerProgression) return;
        
        switch (reward.type) {
            case 'shards':
                this.playerProgression.addChronoShards(reward.amount);
                if (window.uiSystem) {
                    window.uiSystem.showNotification(`+${reward.amount} Chrono-Shards!`, 'success');
                }
                break;
                
            case 'cosmetic':
            case 'exclusive_cosmetic':
                if (reward.id) {
                    this.ownedItems.add(reward.id);
                    if (window.uiSystem) {
                        window.uiSystem.showNotification(`New cosmetic unlocked!`, 'success');
                    }
                }
                break;
                
            case 'xp_boost':
                // Apply temporary XP boost
                this.applyXPBoost(reward.amount);
                break;
                
            case 'ability_boost':
                // Apply ability cooldown reduction
                this.applyAbilityBoost(reward.amount);
                break;
        }
    }

    purchaseChronoPassPremium() {
        if (this.chronoPassData.hasPremium) return false;
        if (!this.playerProgression) return false;
        if (this.playerProgression.chronoShards < this.chronoPassData.premiumPrice) return false;
        
        // Deduct cost
        this.playerProgression.spendChronoShards(this.chronoPassData.premiumPrice);
        
        // Grant premium
        this.chronoPassData.hasPremium = true;
        
        // Grant all previous premium rewards
        for (let i = 0; i < this.chronoPassData.currentTier; i++) {
            this.grantReward(this.chronoPassData.tiers[i].premiumReward);
        }
        
        this.saveToStorage();
        
        if (window.uiSystem) {
            window.uiSystem.showNotification('Chrono-Pass Premium activated!', 'success');
        }
        
        return true;
    }

    applyXPBoost(percentage) {
        // Store boost in player progression for temporary application
        if (this.playerProgression && this.playerProgression.addTemporaryBoost) {
            this.playerProgression.addTemporaryBoost('xp', percentage, 3600000); // 1 hour
        }
    }

    applyAbilityBoost(percentage) {
        // Store boost for ability cooldown reduction
        if (window.abilityManager && window.abilityManager.addCooldownReduction) {
            window.abilityManager.addCooldownReduction(percentage);
        }
    }

    // Rewarded Video Ad System
    canWatchAd() {
        const today = new Date().toDateString();
        
        if (this.lastAdDate !== today) {
            this.dailyAdCount = 0;
            this.lastAdDate = today;
        }
        
        return this.dailyAdCount < GameConstants.DAILY_AD_LIMIT;
    }

    getAdReward() {
        return GameConstants.AD_REWARD_SHARDS;
    }

    watchRewardedAd() {
        return new Promise((resolve) => {
            if (!this.canWatchAd()) {
                resolve({
                    success: false,
                    error: 'Daily ad limit reached'
                });
                return;
            }
            
            // Simulate ad watching (2-3 seconds)
            const adDuration = MathUtils.random(2000, 3000);
            
            setTimeout(() => {
                // Grant reward
                const reward = this.getAdReward();
                
                if (this.playerProgression) {
                    this.playerProgression.addChronoShards(reward);
                }
                
                // Update ad count
                this.dailyAdCount++;
                this.saveToStorage();
                
                // Add chrono-pass experience
                this.addChronoPassExperience(10);
                
                resolve({
                    success: true,
                    reward: reward,
                    remainingAds: GameConstants.DAILY_AD_LIMIT - this.dailyAdCount
                });
                
            }, adDuration);
        });
    }

    getAdInfo() {
        return {
            canWatch: this.canWatchAd(),
            reward: this.getAdReward(),
            dailyLimit: GameConstants.DAILY_AD_LIMIT,
            watchedToday: this.dailyAdCount,
            remaining: Math.max(0, GameConstants.DAILY_AD_LIMIT - this.dailyAdCount)
        };
    }

    // Daily Bonuses and Events
    checkDailyBonus() {
        const today = new Date().toDateString();
        const lastBonus = GameUtils.loadFromLocalStorage('last_daily_bonus', '');
        
        if (lastBonus !== today) {
            this.grantDailyBonus();
            GameUtils.saveToLocalStorage('last_daily_bonus', today);
            return true;
        }
        
        return false;
    }

    grantDailyBonus() {
        const bonusShards = MathUtils.random(25, 75);
        
        if (this.playerProgression) {
            this.playerProgression.addChronoShards(bonusShards);
        }
        
        this.addChronoPassExperience(5);
        
        if (window.uiSystem) {
            window.uiSystem.showNotification(`Daily bonus: +${bonusShards} Chrono-Shards!`, 'success');
        }
    }

    // Special Events and Promotions
    createSpecialEvent(eventData) {
        // Framework for special events like double XP weekends, special cosmetics, etc.
        const event = {
            id: eventData.id,
            name: eventData.name,
            description: eventData.description,
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            rewards: eventData.rewards || [],
            requirements: eventData.requirements || {},
            isActive: () => {
                const now = new Date();
                return now >= event.startDate && now <= event.endDate;
            }
        };
        
        return event;
    }

    // Cosmetic Application System
    getEquippedCosmetics() {
        return {
            evolution: GameUtils.loadFromLocalStorage('equipped_evolution', 'default'),
            effect: GameUtils.loadFromLocalStorage('equipped_effect', 'none'),
            trail: GameUtils.loadFromLocalStorage('equipped_trail', 'none')
        };
    }

    equipCosmetic(itemId, type) {
        if (!this.isOwned(itemId)) return false;
        
        GameUtils.saveToLocalStorage(`equipped_${type}`, itemId);
        
        if (window.uiSystem) {
            const item = this.getItemById(itemId);
            window.uiSystem.showNotification(`Equipped: ${item?.name || itemId}`, 'info');
        }
        
        return true;
    }

    unequipCosmetic(type) {
        GameUtils.saveToLocalStorage(`equipped_${type}`, type === 'evolution' ? 'default' : 'none');
        
        if (window.uiSystem) {
            window.uiSystem.showNotification(`Unequipped ${type}`, 'info');
        }
    }

    // Statistics and Analytics
    getStoreStatistics() {
        return {
            totalItemsOwned: this.ownedItems.size,
            totalItemsAvailable: this.getAllItems().length,
            completionPercentage: Math.floor((this.ownedItems.size / this.getAllItems().length) * 100),
            totalSpent: this.calculateTotalSpent(),
            favoriteCategory: this.getFavoriteCategory(),
            chronoPassProgress: this.getChronoPassData(),
            adStatistics: this.getAdInfo()
        };
    }

    calculateTotalSpent() {
        let total = 0;
        
        this.ownedItems.forEach(itemId => {
            const item = this.getItemById(itemId);
            if (item) {
                total += item.price;
            }
        });
        
        if (this.chronoPassData.hasPremium) {
            total += this.chronoPassData.premiumPrice;
        }
        
        return total;
    }

    getFavoriteCategory() {
        const categoryCounts = {};
        
        this.ownedItems.forEach(itemId => {
            const item = this.getItemById(itemId);
            if (item) {
                categoryCounts[item.type] = (categoryCounts[item.type] || 0) + 1;
            }
        });
        
        let maxCount = 0;
        let favoriteCategory = 'none';
        
        Object.entries(categoryCounts).forEach(([category, count]) => {
            if (count > maxCount) {
                maxCount = count;
                favoriteCategory = category;
            }
        });
        
        return favoriteCategory;
    }

    // Data Management
    saveToStorage() {
        const storeData = {
            ownedItems: Array.from(this.ownedItems),
            chronoPassData: this.chronoPassData,
            dailyAdCount: this.dailyAdCount,
            lastAdDate: this.lastAdDate
        };
        
        GameUtils.saveToLocalStorage('store_data', storeData);
    }

    loadFromStorage() {
        const storeData = GameUtils.loadFromLocalStorage('store_data', {});
        
        if (storeData.ownedItems) {
            this.ownedItems = new Set(storeData.ownedItems);
        }
        
        if (storeData.chronoPassData) {
            // Merge with default data to handle new properties
            this.chronoPassData = { ...this.chronoPassData, ...storeData.chronoPassData };
        }
        
        this.dailyAdCount = storeData.dailyAdCount || 0;
        this.lastAdDate = storeData.lastAdDate || '';
        
        // Check for daily bonus
        this.checkDailyBonus();
    }

    exportData() {
        return {
            storeItems: this.storeItems,
            ownedItems: Array.from(this.ownedItems),
            chronoPassData: this.chronoPassData,
            statistics: this.getStoreStatistics()
        };
    }

    importData(data) {
        if (data.ownedItems) {
            this.ownedItems = new Set(data.ownedItems);
        }
        
        if (data.chronoPassData) {
            this.chronoPassData = data.chronoPassData;
        }
        
        this.saveToStorage();
    }

    // Reset and Cleanup
    resetStore() {
        this.ownedItems.clear();
        this.chronoPassData = this.initializeChronoPass();
        this.dailyAdCount = 0;
        this.lastAdDate = '';
        
        GameUtils.removeFromLocalStorage('store_data');
        GameUtils.removeFromLocalStorage('equipped_evolution');
        GameUtils.removeFromLocalStorage('equipped_effect');
        GameUtils.removeFromLocalStorage('equipped_trail');
        GameUtils.removeFromLocalStorage('last_daily_bonus');
        
        if (window.uiSystem) {
            window.uiSystem.showNotification('Store data reset!', 'warning');
        }
    }

    // Debug and Testing
    grantAllItems() {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            this.getAllItems().forEach(item => {
                this.ownedItems.add(item.id);
            });
            
            this.chronoPassData.hasPremium = true;
            this.chronoPassData.currentTier = this.chronoPassData.maxTier;
            
            if (this.playerProgression) {
                this.playerProgression.addChronoShards(10000);
            }
            
            this.saveToStorage();
            
            console.log('🎁 All store items granted (debug mode)');
        }
    }

    simulateProgress() {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            // Simulate chrono-pass progress
            this.addChronoPassExperience(500);
            
            // Add some random items
            const randomItems = this.getAllItems().slice(0, 5);
            randomItems.forEach(item => {
                this.ownedItems.add(item.id);
            });
            
            this.saveToStorage();
            
            console.log('📈 Store progress simulated (debug mode)');
        }
    }
}

// Initialize global store system
if (typeof window !== 'undefined') {
    window.storeSystem = new StoreSystem();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StoreSystem };
}