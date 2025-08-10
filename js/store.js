// Store System for Chrono-Swarm
// Handles cosmetic purchases, Chrono-Pass progression, and monetization

class StoreSystem {
    constructor() {
        this.playerProgression = null;
        this.storeItems = this.initializeStoreItems();
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
                // Free/Low Cost Items (5)
                {
                    id: 'evo_basic_glow',
                    name: 'Basic Glow',
                    description: 'Simple luminescent effect for your swarm',
                    price: 0, // Free
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ffffff, #cccccc)',
                    rarity: 'common',
                    currency: 'experience'
                },
                {
                    id: 'evo_plasma_core',
                    name: 'Plasma Core',
                    description: 'Your swarm glows with intense plasma energy',
                    price: 250,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ff0080, #8000ff)',
                    rarity: 'common',
                    currency: 'experience'
                },
                {
                    id: 'evo_crystal_matrix',
                    name: 'Crystal Matrix',
                    description: 'Crystalline structure with prismatic reflections',
                    price: 500,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #00ffff, #ffffff)',
                    rarity: 'rare',
                    currency: 'experience'
                },
                {
                    id: 'evo_bio_luminescence',
                    name: 'Bio Luminescence',
                    description: 'Natural bioluminescent glow like deep sea creatures',
                    price: 750,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #00ff88, #44ffaa)',
                    rarity: 'rare',
                    currency: 'experience'
                },
                {
                    id: 'evo_electric_storm',
                    name: 'Electric Storm',
                    description: 'Crackling electricity surrounds your cells',
                    price: 1000,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ffff00, #00ffff)',
                    rarity: 'epic',
                    currency: 'experience'
                },
                
                // Shard-Required Items (15)
                {
                    id: 'evo_shadow_void',
                    name: 'Shadow Void',
                    description: 'Dark energy that absorbs light itself',
                    price: 50,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #000000, #440044)',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'evo_temporal_flux',
                    name: 'Temporal Flux',
                    description: 'Swirling time energy with reality distortions',
                    price: 75,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ffff00, #00ffff)',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'evo_cosmic_storm',
                    name: 'Cosmic Storm',
                    description: 'Stellar matter from the heart of a galaxy',
                    price: 100,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ff4400, #ffaa00)',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'evo_antimatter_core',
                    name: 'Antimatter Core',
                    description: 'Dangerous antimatter energy contained within',
                    price: 80,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ff0000, #000000)',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'evo_quantum_field',
                    name: 'Quantum Field',
                    description: 'Quantum probability clouds surround your swarm',
                    price: 120,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #8800ff, #ff0088)',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'evo_phoenix_flame',
                    name: 'Phoenix Flame',
                    description: 'Eternal flames that never extinguish',
                    price: 90,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ff6600, #ffaa00)',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'evo_ice_crystal_core',
                    name: 'Ice Crystal Core',
                    description: 'Frozen energy that radiates cold power',
                    price: 65,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #aaffff, #ffffff)',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'evo_molten_magma',
                    name: 'Molten Magma',
                    description: 'Flowing lava core with intense heat',
                    price: 70,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ff3300, #ff6600)',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'evo_stellar_nova',
                    name: 'Stellar Nova',
                    description: 'Explosive stellar energy like a dying star',
                    price: 150,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ffffff, #ffff88)',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'evo_dark_matter',
                    name: 'Dark Matter',
                    description: 'Invisible matter that bends space around it',
                    price: 200,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #220022, #000000)',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'evo_rainbow_prism',
                    name: 'Rainbow Prism',
                    description: 'Light-splitting prismatic energy core',
                    price: 85,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'evo_void_walker',
                    name: 'Void Walker',
                    description: 'Phase between dimensions with void energy',
                    price: 180,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #440088, #000044)',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'evo_celestial_aura',
                    name: 'Celestial Aura',
                    description: 'Divine energy blessed by ancient cosmic forces',
                    price: 250,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ffdd88, #ffffff)',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'evo_neon_cyber',
                    name: 'Neon Cyber',
                    description: 'Digital cyberpunk aesthetic with neon highlights',
                    price: 60,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #00ffaa, #ff0088)',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'evo_primordial_chaos',
                    name: 'Primordial Chaos',
                    description: 'Raw chaotic energy from the beginning of time',
                    price: 300,
                    type: 'evolution',
                    preview: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff, #ffff00)',
                    rarity: 'mythic',
                    currency: 'shards'
                }
            ],
            
            effects: [
                // Free/Low Cost Items (5)
                {
                    id: 'fx_basic_sparkle',
                    name: 'Basic Sparkle',
                    description: 'Simple sparkling effect around your swarm',
                    price: 0, // Free
                    type: 'effect',
                    preview: '#ffffff',
                    rarity: 'common',
                    currency: 'experience'
                },
                {
                    id: 'fx_lightning_aura',
                    name: 'Lightning Aura',
                    description: 'Electric arcs dance around your swarm',
                    price: 300,
                    type: 'effect',
                    preview: '#ffff00',
                    rarity: 'common',
                    currency: 'experience'
                },
                {
                    id: 'fx_fire_corona',
                    name: 'Fire Corona',
                    description: 'Burning flames surround your cells',
                    price: 400,
                    type: 'effect',
                    preview: '#ff4400',
                    rarity: 'common',
                    currency: 'experience'
                },
                {
                    id: 'fx_ice_crystal',
                    name: 'Ice Crystal',
                    description: 'Freezing crystals form and shatter continuously',
                    price: 600,
                    type: 'effect',
                    preview: '#aaffff',
                    rarity: 'rare',
                    currency: 'experience'
                },
                {
                    id: 'fx_wind_spiral',
                    name: 'Wind Spiral',
                    description: 'Swirling wind patterns around your cells',
                    price: 800,
                    type: 'effect',
                    preview: '#88ccff',
                    rarity: 'rare',
                    currency: 'experience'
                },
                
                // Shard-Required Items (15)
                {
                    id: 'fx_quantum_distortion',
                    name: 'Quantum Distortion',
                    description: 'Reality bends and warps around your presence',
                    price: 40,
                    type: 'effect',
                    preview: '#ff00ff',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'fx_gravitational_field',
                    name: 'Gravitational Field',
                    description: 'Space-time curves visibly around your swarm',
                    price: 60,
                    type: 'effect',
                    preview: '#4400ff',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'fx_plasma_storm',
                    name: 'Plasma Storm',
                    description: 'Violent plasma energy storms around your swarm',
                    price: 50,
                    type: 'effect',
                    preview: '#ff0088',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'fx_shadow_tendrils',
                    name: 'Shadow Tendrils',
                    description: 'Dark tentacles reach out from your cells',
                    price: 45,
                    type: 'effect',
                    preview: '#220044',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'fx_temporal_rift',
                    name: 'Temporal Rift',
                    description: 'Time rifts tear open around your movement',
                    price: 80,
                    type: 'effect',
                    preview: '#88ffff',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'fx_cosmic_radiation',
                    name: 'Cosmic Radiation',
                    description: 'Dangerous cosmic rays emanate from your core',
                    price: 70,
                    type: 'effect',
                    preview: '#ffaa88',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'fx_void_absorption',
                    name: 'Void Absorption',
                    description: 'Your swarm absorbs light and matter around it',
                    price: 90,
                    type: 'effect',
                    preview: '#000000',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'fx_stellar_eruption',
                    name: 'Stellar Eruption',
                    description: 'Solar flares burst from your cellular core',
                    price: 100,
                    type: 'effect',
                    preview: '#ffcc00',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'fx_quantum_teleport',
                    name: 'Quantum Teleport',
                    description: 'Your cells randomly teleport short distances',
                    price: 120,
                    type: 'effect',
                    preview: '#8800ff',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'fx_aurora_borealis',
                    name: 'Aurora Borealis',
                    description: 'Beautiful aurora lights dance around you',
                    price: 75,
                    type: 'effect',
                    preview: '#00ff88',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'fx_magnetic_field',
                    name: 'Magnetic Field',
                    description: 'Invisible magnetic forces affect nearby matter',
                    price: 65,
                    type: 'effect',
                    preview: '#4488ff',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'fx_phase_shift',
                    name: 'Phase Shift',
                    description: 'Your swarm phases in and out of reality',
                    price: 110,
                    type: 'effect',
                    preview: '#ff88aa',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'fx_nuclear_fusion',
                    name: 'Nuclear Fusion',
                    description: 'Fusion reactions create intense energy bursts',
                    price: 95,
                    type: 'effect',
                    preview: '#ffff88',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'fx_crystalline_resonance',
                    name: 'Crystalline Resonance',
                    description: 'Harmonic crystal vibrations create energy waves',
                    price: 85,
                    type: 'effect',
                    preview: '#aaffcc',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'fx_dimensional_anchor',
                    name: 'Dimensional Anchor',
                    description: 'Anchor points to other dimensions around you',
                    price: 150,
                    type: 'effect',
                    preview: '#884488',
                    rarity: 'mythic',
                    currency: 'shards'
                }
            ],
            
            trails: [
                // Free/Low Cost Items (5)
                {
                    id: 'trail_basic_line',
                    name: 'Basic Line',
                    description: 'Simple line trail following your movement',
                    price: 0, // Free
                    type: 'trail',
                    preview: '#ffffff',
                    rarity: 'common',
                    currency: 'experience'
                },
                {
                    id: 'trail_stardust',
                    name: 'Stardust Trail',
                    description: 'Leave a trail of glittering stardust',
                    price: 200,
                    type: 'trail',
                    preview: '#ffffff',
                    rarity: 'common',
                    currency: 'experience'
                },
                {
                    id: 'trail_neon_spiral',
                    name: 'Neon Spiral',
                    description: 'Bright neon spirals follow your movement',
                    price: 350,
                    type: 'trail',
                    preview: '#00ff88',
                    rarity: 'common',
                    currency: 'experience'
                },
                {
                    id: 'trail_energy_wave',
                    name: 'Energy Wave',
                    description: 'Pulsing energy waves trail behind you',
                    price: 500,
                    type: 'trail',
                    preview: '#0088ff',
                    rarity: 'rare',
                    currency: 'experience'
                },
                {
                    id: 'trail_flame_path',
                    name: 'Flame Path',
                    description: 'Burning trail that slowly fades away',
                    price: 650,
                    type: 'trail',
                    preview: '#ff4400',
                    rarity: 'rare',
                    currency: 'experience'
                },
                
                // Shard-Required Items (15)
                {
                    id: 'trail_temporal_echo',
                    name: 'Temporal Echo',
                    description: 'Echoes of your past positions fade slowly',
                    price: 35,
                    type: 'trail',
                    preview: '#ffaa00',
                    rarity: 'rare',
                    currency: 'shards'
                },
                {
                    id: 'trail_void_stream',
                    name: 'Void Stream',
                    description: 'Dark energy streams behind your swarm',
                    price: 45,
                    type: 'trail',
                    preview: '#220022',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'trail_rainbow_cascade',
                    name: 'Rainbow Cascade',
                    description: 'Cascading rainbow colors flow behind you',
                    price: 55,
                    type: 'trail',
                    preview: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'trail_quantum_path',
                    name: 'Quantum Path',
                    description: 'Quantum probability trails show all possible paths',
                    price: 60,
                    type: 'trail',
                    preview: '#8800ff',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'trail_cosmic_dust',
                    name: 'Cosmic Dust',
                    description: 'Trail of cosmic particles from distant galaxies',
                    price: 50,
                    type: 'trail',
                    preview: '#ffaa88',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'trail_lightning_bolt',
                    name: 'Lightning Bolt',
                    description: 'Crackling lightning bolts follow your path',
                    price: 40,
                    type: 'trail',
                    preview: '#ffff00',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'trail_ice_crystals',
                    name: 'Ice Crystals',
                    description: 'Frozen ice crystals form and shatter in your wake',
                    price: 42,
                    type: 'trail',
                    preview: '#aaffff',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'trail_plasma_stream',
                    name: 'Plasma Stream',
                    description: 'Superheated plasma flows behind your movement',
                    price: 65,
                    type: 'trail',
                    preview: '#ff0088',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'trail_shadow_tendrils',
                    name: 'Shadow Tendrils',
                    description: 'Dark tentacles extend from your trail path',
                    price: 48,
                    type: 'trail',
                    preview: '#440044',
                    rarity: 'epic',
                    currency: 'shards'
                },
                {
                    id: 'trail_stellar_wind',
                    name: 'Stellar Wind',
                    description: 'Solar wind particles stream behind you',
                    price: 70,
                    type: 'trail',
                    preview: '#ffcc44',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'trail_gravitational_waves',
                    name: 'Gravitational Waves',
                    description: 'Visible distortions in space-time follow you',
                    price: 80,
                    type: 'trail',
                    preview: '#4400ff',
                    rarity: 'legendary',
                    currency: 'shards'
                },
                {
                    id: 'trail_dimensional_tear',
                    name: 'Dimensional Tear',
                    description: 'Tears in reality slowly heal behind you',
                    price: 90,
                    type: 'trail',
                    preview: '#884488',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'trail_antimatter_stream',
                    name: 'Antimatter Stream',
                    description: 'Dangerous antimatter particles in your wake',
                    price: 100,
                    type: 'trail',
                    preview: '#ff0000',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'trail_celestial_ribbon',
                    name: 'Celestial Ribbon',
                    description: 'Divine ribbon of light blessed by cosmic forces',
                    price: 120,
                    type: 'trail',
                    preview: '#ffdd88',
                    rarity: 'mythic',
                    currency: 'shards'
                },
                {
                    id: 'trail_chaos_vortex',
                    name: 'Chaos Vortex',
                    description: 'Swirling vortex of pure chaotic energy',
                    price: 150,
                    type: 'trail',
                    preview: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff, #ffff00)',
                    rarity: 'mythic',
                    currency: 'shards'
                }
            ]
        };
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
        
        const currency = item.currency || 'shards'; // Default to shards for backward compatibility
        
        if (currency === 'experience') {
            return this.playerProgression.experience >= item.price;
        } else if (currency === 'shards') {
            return this.playerProgression.chronoShards >= item.price;
        }
        
        return false;
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
        
        const currency = item.currency || 'shards'; // Default to shards for backward compatibility
        
        // Deduct cost based on currency type
        if (currency === 'experience') {
            // Add a method to spend experience if it doesn't exist
            if (typeof this.playerProgression.spendExperience === 'function') {
                this.playerProgression.spendExperience(item.price);
            } else {
                this.playerProgression.experience -= item.price;
            }
        } else if (currency === 'shards') {
            this.playerProgression.spendChronoShards(item.price);
        }
        
        // Add to owned items
        this.ownedItems.add(itemId);
        
        // Save to storage
        this.saveToStorage();
        
        // Play purchase sound
        if (window.audioSystem) {
            window.audioSystem.playUISound('click');
        }
        
        const currencyName = currency === 'experience' ? 'experience' : 'shards';
        console.log(`Purchased item: ${item.name} for ${item.price} ${currencyName}`);
        return true;
    }

    // Store utilities
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
                
                // Chrono-pass removed
                
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
        
        // Chrono-pass removed
        
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
            // chronoPassProgress: removed,
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
        
        // Chrono-pass premium cost removed
        
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
            // chronoPassData: removed,
            dailyAdCount: this.dailyAdCount,
            lastAdDate: this.lastAdDate
        };
        
        GameUtils.saveToLocalStorage('store_data', storeData);
    }

    addFreeItems() {
        // Add all free items to owned items
        const allItems = this.getAllItems();
        allItems.forEach(item => {
            if (item.price === 0) {
                this.ownedItems.add(item.id);
            }
        });
    }

    loadFromStorage() {
        const storeData = GameUtils.loadFromLocalStorage('store_data', {});
        
        if (storeData.ownedItems) {
            this.ownedItems = new Set(storeData.ownedItems);
        }
        
        // Ensure free items are always owned
        this.addFreeItems();
        
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
            // chronoPassData: removed,
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
        // Chrono-pass reset removed
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
            
            // Chrono-pass debug removed
            
            if (this.playerProgression) {
                this.playerProgression.addChronoShards(10000);
            }
            
            this.saveToStorage();
            
            console.log('🎁 All store items granted (debug mode)');
        }
    }

    simulateProgress() {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            // Chrono-pass simulation removed
            
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