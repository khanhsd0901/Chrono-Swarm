// Audio System for Chrono-Swarm
// Handles all sound effects, music, and audio feedback

class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.isInitialized = false;
        this.sounds = new Map();
        this.musicTracks = new Map();
        this.currentMusic = null;
        this.isMuted = false;
        
        // Volume settings (0-1)
        this.volumes = {
            master: 0.5,
            music: 0.3,
            sfx: 0.7
        };
        
        // Audio buffers cache
        this.buffers = new Map();
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Initialize on first user interaction
        this.initializeOnUserAction();
    }

    initializeOnUserAction() {
        const initialize = () => {
            if (!this.isInitialized) {
                this.initialize();
                document.removeEventListener('click', initialize);
                document.removeEventListener('keydown', initialize);
                document.removeEventListener('touchstart', initialize);
            }
        };

        document.addEventListener('click', initialize);
        document.addEventListener('keydown', initialize);
        document.addEventListener('touchstart', initialize);
    }

    async initialize() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes for volume control
            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            
            // Connect gain nodes
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            // Set initial volumes
            this.updateVolumes();
            
            // Load sound effects
            await this.loadSounds();
            
            // Start background music
            this.playMusic('ambient');
            
            this.isInitialized = true;
            console.log('Audio system initialized');
            
        } catch (error) {
            console.warn('Failed to initialize audio system:', error);
            this.isInitialized = false;
        }
    }

    async loadSounds() {
        // Define sound effects with their properties
        const soundDefinitions = {
            // UI Sounds
            'button_hover': { type: 'generated', freq: 800, duration: 0.1 },
            'button_click': { type: 'generated', freq: 600, duration: 0.15 },
            'menu_open': { type: 'generated', freq: 400, duration: 0.2 },
            'menu_close': { type: 'generated', freq: 300, duration: 0.2 },
            
            // Game Actions
            'consume_matter': { type: 'generated', freq: 1200, duration: 0.2 },
            'consume_player': { type: 'generated', freq: 800, duration: 0.4 },
            'split': { type: 'generated', freq: 1000, duration: 0.25 },
            'eject_mass': { type: 'generated', freq: 700, duration: 0.15 },
            'recombine': { type: 'generated', freq: 900, duration: 0.3 },
            
            // Abilities
            'stasis_deploy': { type: 'generated', freq: 400, duration: 0.8 },
            'echo_cast': { type: 'generated', freq: 1400, duration: 0.6 },
            'rewind_cast': { type: 'generated', freq: 600, duration: 1.0 },
            'ability_cooldown': { type: 'generated', freq: 300, duration: 0.3 },
            
            // Environmental
            'rift_damage': { type: 'generated', freq: 200, duration: 0.5 },
            'rift_projectile': { type: 'generated', freq: 500, duration: 0.3 },
            'arena_boundary': { type: 'generated', freq: 150, duration: 0.4 },
            
            // Feedback
            'level_up': { type: 'generated', freq: 1600, duration: 1.2 },
            'achievement': { type: 'generated', freq: 1800, duration: 1.5 },
            'death': { type: 'generated', freq: 100, duration: 2.0 },
            'respawn': { type: 'generated', freq: 1000, duration: 0.8 },
            
            // Ambient
            'ambient_hum': { type: 'generated', freq: 60, duration: 5.0, loop: true },
            'temporal_field': { type: 'generated', freq: 220, duration: 3.0, loop: true }
        };

        // Generate and cache sound buffers
        for (const [name, config] of Object.entries(soundDefinitions)) {
            try {
                const buffer = await this.generateSound(config);
                this.buffers.set(name, buffer);
            } catch (error) {
                console.warn(`Failed to generate sound: ${name}`, error);
            }
        }
    }

    async generateSound(config) {
        if (!this.audioContext) return null;

        const { freq, duration, type = 'generated', loop = false } = config;
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        switch (type) {
            case 'generated':
                this.generateTone(data, freq, duration, sampleRate);
                break;
            default:
                this.generateTone(data, freq, duration, sampleRate);
        }

        return buffer;
    }

    generateTone(data, frequency, duration, sampleRate) {
        const length = data.length;
        
        for (let i = 0; i < length; i++) {
            const time = i / sampleRate;
            const progress = i / length;
            
            // Create a complex waveform
            let value = 0;
            
            // Base frequency
            value += Math.sin(2 * Math.PI * frequency * time) * 0.5;
            
            // Harmonics for richness
            value += Math.sin(2 * Math.PI * frequency * 2 * time) * 0.25;
            value += Math.sin(2 * Math.PI * frequency * 0.5 * time) * 0.15;
            
            // Add some noise for texture
            value += (Math.random() - 0.5) * 0.1;
            
            // Apply envelope (fade in/out)
            let envelope = 1;
            const attackTime = 0.1;
            const releaseTime = 0.3;
            
            if (progress < attackTime) {
                envelope = progress / attackTime;
            } else if (progress > 1 - releaseTime) {
                envelope = (1 - progress) / releaseTime;
            }
            
            // Apply frequency modulation for more interesting sounds
            const modFreq = frequency * 0.1;
            const modAmount = frequency * 0.05;
            const modulation = Math.sin(2 * Math.PI * modFreq * time) * modAmount;
            value *= Math.sin(2 * Math.PI * (frequency + modulation) * time);
            
            data[i] = value * envelope * 0.3; // Reduce overall volume
        }
    }

    playSound(soundName, options = {}) {
        if (!this.isInitialized || this.isMuted) return null;
        
        const buffer = this.buffers.get(soundName);
        if (!buffer) {
            console.warn(`Sound not found: ${soundName}`);
            return null;
        }

        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = buffer;
            source.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            // Apply options
            const volume = options.volume || 1;
            const pitch = options.pitch || 1;
            const delay = options.delay || 0;
            
            gainNode.gain.value = volume;
            source.playbackRate.value = pitch;
            
            // Add some randomization for variation
            if (options.randomPitch) {
                source.playbackRate.value *= MathUtils.random(0.9, 1.1);
            }
            
            if (options.randomVolume) {
                gainNode.gain.value *= MathUtils.random(0.8, 1.2);
            }
            
            // Start playback
            const startTime = this.audioContext.currentTime + delay;
            source.start(startTime);
            
            // Auto-cleanup
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
            };
            
            return source;
            
        } catch (error) {
            console.warn(`Failed to play sound: ${soundName}`, error);
            return null;
        }
    }

    playMusic(trackName, fadeIn = true) {
        if (!this.isInitialized) return;
        
        // Stop current music
        if (this.currentMusic) {
            this.stopMusic();
        }
        
        // For now, create ambient background music procedurally
        this.currentMusic = this.createAmbientMusic();
        
        if (fadeIn && this.currentMusic) {
            this.fadeInMusic(2000); // 2 second fade in
        }
    }

    createAmbientMusic() {
        if (!this.audioContext) return null;
        
        try {
            // Create multiple oscillators for layered ambient sound
            const oscillators = [];
            const gainNodes = [];
            
            // Base drone
            const bass = this.audioContext.createOscillator();
            const bassGain = this.audioContext.createGain();
            bass.type = 'sine';
            bass.frequency.value = 55; // A1
            bassGain.gain.value = 0.3;
            bass.connect(bassGain);
            bassGain.connect(this.musicGain);
            
            // Harmonic layer
            const mid = this.audioContext.createOscillator();
            const midGain = this.audioContext.createGain();
            mid.type = 'triangle';
            mid.frequency.value = 110; // A2
            midGain.gain.value = 0.2;
            mid.connect(midGain);
            midGain.connect(this.musicGain);
            
            // High atmospheric layer
            const high = this.audioContext.createOscillator();
            const highGain = this.audioContext.createGain();
            high.type = 'sine';
            high.frequency.value = 440; // A4
            highGain.gain.value = 0.1;
            high.connect(highGain);
            highGain.connect(this.musicGain);
            
            // Add frequency modulation for movement
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 0.1; // Very slow modulation
            lfoGain.gain.value = 2;
            lfo.connect(lfoGain);
            lfoGain.connect(high.frequency);
            
            // Start all oscillators
            const startTime = this.audioContext.currentTime;
            bass.start(startTime);
            mid.start(startTime);
            high.start(startTime);
            lfo.start(startTime);
            
            oscillators.push(bass, mid, high, lfo);
            gainNodes.push(bassGain, midGain, highGain, lfoGain);
            
            return {
                oscillators,
                gainNodes,
                stop: () => {
                    oscillators.forEach(osc => {
                        try {
                            osc.stop();
                        } catch (e) {
                            // Oscillator might already be stopped
                        }
                    });
                    gainNodes.forEach(gain => gain.disconnect());
                }
            };
            
        } catch (error) {
            console.warn('Failed to create ambient music:', error);
            return null;
        }
    }

    stopMusic(fadeOut = true) {
        if (!this.currentMusic) return;
        
        if (fadeOut) {
            this.fadeOutMusic(1000); // 1 second fade out
        } else {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
    }

    fadeInMusic(duration) {
        if (!this.currentMusic || !this.musicGain) return;
        
        this.musicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.musicGain.gain.linearRampToValueAtTime(
            this.volumes.music, 
            this.audioContext.currentTime + duration / 1000
        );
    }

    fadeOutMusic(duration) {
        if (!this.currentMusic || !this.musicGain) return;
        
        const currentTime = this.audioContext.currentTime;
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, currentTime);
        this.musicGain.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);
        
        setTimeout(() => {
            if (this.currentMusic) {
                this.currentMusic.stop();
                this.currentMusic = null;
            }
        }, duration);
    }

    setMasterVolume(volume) {
        this.volumes.master = MathUtils.clamp(volume, 0, 1);
        this.updateVolumes();
        this.saveSettings();
    }

    setMusicVolume(volume) {
        this.volumes.music = MathUtils.clamp(volume, 0, 1);
        this.updateVolumes();
        this.saveSettings();
    }

    setSFXVolume(volume) {
        this.volumes.sfx = MathUtils.clamp(volume, 0, 1);
        this.updateVolumes();
        this.saveSettings();
    }

    updateVolumes() {
        if (!this.isInitialized) return;
        
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.volumes.master;
        }
        
        if (this.musicGain) {
            this.musicGain.gain.value = this.volumes.music;
        }
        
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.volumes.sfx;
        }
    }

    mute() {
        this.isMuted = true;
        this.updateVolumes();
    }

    unmute() {
        this.isMuted = false;
        this.updateVolumes();
    }

    toggleMute() {
        if (this.isMuted) {
            this.unmute();
        } else {
            this.mute();
        }
        return this.isMuted;
    }

    // Convenience methods for common game sounds
    playUISound(action) {
        const soundMap = {
            'hover': 'button_hover',
            'click': 'button_click',
            'open': 'menu_open',
            'close': 'menu_close'
        };
        
        const soundName = soundMap[action];
        if (soundName) {
            this.playSound(soundName, { randomPitch: true });
        }
    }

    playGameSound(action, options = {}) {
        const soundMap = {
            'consume_matter': 'consume_matter',
            'consume_player': 'consume_player',
            'split': 'split',
            'eject': 'eject_mass',
            'recombine': 'recombine',
            'death': 'death',
            'respawn': 'respawn',
            'level_up': 'level_up'
        };
        
        const soundName = soundMap[action];
        if (soundName) {
            this.playSound(soundName, { 
                randomPitch: true, 
                randomVolume: true,
                ...options 
            });
        }
    }

    playAbilitySound(abilityName) {
        const soundMap = {
            'stasis': 'stasis_deploy',
            'echo': 'echo_cast',
            'rewind': 'rewind_cast'
        };
        
        const soundName = soundMap[abilityName];
        if (soundName) {
            this.playSound(soundName, { volume: 0.8 });
        }
    }

    // Save/load settings
    saveSettings() {
        const settings = {
            volumes: this.volumes,
            isMuted: this.isMuted
        };
        GameUtils.saveToLocalStorage('audio_settings', settings);
    }

    loadSettings() {
        const settings = GameUtils.loadFromLocalStorage('audio_settings', {});
        
        if (settings.volumes) {
            Object.assign(this.volumes, settings.volumes);
        }
        
        if (settings.isMuted !== undefined) {
            this.isMuted = settings.isMuted;
        }
    }

    // Get current settings for UI
    getSettings() {
        return {
            masterVolume: this.volumes.master,
            musicVolume: this.volumes.music,
            sfxVolume: this.volumes.sfx,
            isMuted: this.isMuted,
            isInitialized: this.isInitialized
        };
    }

    // Cleanup
    destroy() {
        if (this.currentMusic) {
            this.currentMusic.stop();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.buffers.clear();
        this.sounds.clear();
        this.musicTracks.clear();
    }
}

// Initialize global audio system
if (typeof window !== 'undefined') {
    window.audioSystem = new AudioSystem();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioSystem };
}