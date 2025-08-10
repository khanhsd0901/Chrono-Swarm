// Chrono-Abilities System
// Implements the unique time-manipulation abilities that define Chrono-Swarm's strategic depth

class ChronoAbility {
    constructor(name, cooldown, cost, unlockLevel) {
        this.name = name;
        this.cooldown = cooldown;
        this.cost = cost; // Percentage of mass
        this.unlockLevel = unlockLevel;
        this.lastUsed = 0;
        this.isActive = false;
    }

    canUse(player) {
        const now = Date.now();
        const cooldownElapsed = now - this.lastUsed >= this.cooldown;
        const hasEnoughMass = player.getTotalMass() >= this.getMinimumMass();
        const levelUnlocked = player.level >= this.unlockLevel;
        
        return cooldownElapsed && hasEnoughMass && levelUnlocked && !this.isActive;
    }

    getMinimumMass() {
        return 50; // Minimum mass needed to use any ability
    }

    getCooldownRemaining() {
        const now = Date.now();
        const elapsed = now - this.lastUsed;
        return Math.max(0, this.cooldown - elapsed);
    }

    getCooldownProgress() {
        const remaining = this.getCooldownRemaining();
        return 1 - (remaining / this.cooldown);
    }

    use(player, targetPosition) {
        if (!this.canUse(player)) return false;

        const totalMass = player.getTotalMass();
        const massToConsume = totalMass * this.cost;
        
        player.consumeMassForAbility(massToConsume);
        this.lastUsed = Date.now();
        this.isActive = true;
        
        return this.activate(player, targetPosition);
    }

    activate(player, targetPosition) {
        // Override in subclasses
        return true;
    }

    update(deltaTime) {
        // Override in subclasses if needed
    }

    render(ctx, camera) {
        // Override in subclasses if needed
    }

    deactivate() {
        this.isActive = false;
    }
}

class StasisField extends ChronoAbility {
    constructor() {
        super('Stasis Field', GameConstants.STASIS_FIELD_COOLDOWN, GameConstants.STASIS_FIELD_COST, 1);
        this.fields = [];
    }

    activate(player, targetPosition) {
        const playerCenter = player.getCenterPosition();
        const direction = Vector2.subtract(targetPosition, playerCenter);
        const distance = Math.min(Vector2.magnitude(direction), 200); // Max cast distance
        const normalizedDirection = Vector2.normalize(direction);
        
        const fieldPosition = Vector2.add(playerCenter, Vector2.multiply(normalizedDirection, distance));
        
        const field = new StasisFieldEffect(
            fieldPosition.x,
            fieldPosition.y,
            GameConstants.STASIS_FIELD_RADIUS,
            GameConstants.STASIS_FIELD_DURATION,
            player.id
        );
        
        this.fields.push(field);
        
        // Visual and audio feedback
        this.createDeploymentEffect(fieldPosition);
        
        setTimeout(() => {
            this.deactivate();
        }, 100); // Brief activation state
        
        return true;
    }

    createDeploymentEffect(position) {
        // Create particle effect at deployment location
        if (window.particleSystem) {
            window.particleSystem.createExplosion(position, 'stasis', 20);
        }
        
        // Play sound effect
        if (window.audioSystem) {
            window.audioSystem.playSound('stasis_deploy');
        }
    }

    update(deltaTime) {
        this.fields = this.fields.filter(field => {
            field.update(deltaTime);
            return field.isAlive;
        });
    }

    render(ctx, camera) {
        this.fields.forEach(field => field.render(ctx, camera));
    }

    getActiveFields() {
        return this.fields.filter(field => field.isAlive);
    }

    checkSlowEffect(entity, playerId) {
        if (entity.parentPlayer && entity.parentPlayer.id === playerId) {
            return 1; // No slow effect on caster
        }

        for (let field of this.fields) {
            if (field.casterPlayerId === playerId && field.affectsEntity(entity)) {
                return field.slowFactor;
            }
        }
        return 1; // No slow effect
    }
}

class StasisFieldEffect extends Entity {
    constructor(x, y, radius, duration, casterPlayerId) {
        super(x, y);
        this.radius = radius;
        this.maxRadius = radius;
        this.duration = duration;
        this.casterPlayerId = casterPlayerId;
        this.slowFactor = 0.3; // 70% speed reduction
        this.pulsePhase = 0;
        this.expansionPhase = 0;
        this.maxExpansionTime = 500; // 0.5 seconds to full size
        this.ripples = [];
        this.maxRipples = 3;
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        this.pulsePhase += deltaTime * 0.003;
        
        // Expansion animation
        if (this.age < this.maxExpansionTime) {
            this.expansionPhase = this.age / this.maxExpansionTime;
            this.radius = this.maxRadius * MathUtils.easeOut(this.expansionPhase);
        } else {
            this.radius = this.maxRadius;
        }
        
        // Update ripples
        this.ripples = this.ripples.filter(ripple => {
            ripple.age += deltaTime;
            ripple.radius += ripple.speed * deltaTime / 1000;
            ripple.alpha = Math.max(0, 1 - (ripple.age / ripple.maxAge));
            return ripple.age < ripple.maxAge;
        });
        
        // Create new ripples occasionally
        if (Math.random() < 0.01 && this.ripples.length < this.maxRipples) {
            this.ripples.push({
                radius: 0,
                speed: MathUtils.random(50, 100),
                age: 0,
                maxAge: MathUtils.random(2000, 3000),
                alpha: 1
            });
        }
        
        // Check if expired
        if (this.age >= this.duration) {
            this.destroy();
        }
    }

    render(ctx, camera) {
        const screenPos = camera.worldToScreen(this.position);
        const screenRadius = this.radius * camera.zoom;
        
        if (screenRadius < 5) return;
        
        const alpha = Math.max(0.3, 1 - (this.age / this.duration));
        const pulseIntensity = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        
        // Render ripples
        this.ripples.forEach(ripple => {
            const rippleScreenRadius = ripple.radius * camera.zoom;
            ctx.strokeStyle = `rgba(0, 255, 255, ${ripple.alpha * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, rippleScreenRadius, 0, Math.PI * 2);
            ctx.stroke();
        });
        
        // Main field
        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, screenRadius
        );
        gradient.addColorStop(0, `rgba(0, 255, 255, ${alpha * 0.2 * pulseIntensity})`);
        gradient.addColorStop(0.7, `rgba(0, 255, 255, ${alpha * 0.4 * pulseIntensity})`);
        gradient.addColorStop(1, `rgba(0, 255, 255, ${alpha * 0.6})`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Border effect
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * pulseIntensity})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.lineDashOffset = -this.age * 0.01;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    affectsEntity(entity) {
        const distance = Vector2.distance(this.position, entity.position);
        return distance <= this.radius;
    }
}

class Echo extends ChronoAbility {
    constructor() {
        super('Echo', GameConstants.ECHO_COOLDOWN, GameConstants.ECHO_COST, GameConstants.UNLOCK_LEVELS.ECHO);
        this.echoes = [];
    }

    activate(player, targetPosition) {
        const echo = new EchoEffect(player, GameConstants.ECHO_DURATION);
        this.echoes.push(echo);
        
        // Visual feedback
        this.createEchoEffect(player.getCenterPosition());
        
        setTimeout(() => {
            this.deactivate();
        }, GameConstants.ECHO_DURATION);
        
        return true;
    }

    createEchoEffect(position) {
        if (window.particleSystem) {
            window.particleSystem.createSpiral(position, 'echo', 15);
        }
        
        if (window.audioSystem) {
            window.audioSystem.playSound('echo_cast');
        }
    }

    update(deltaTime) {
        this.echoes = this.echoes.filter(echo => {
            echo.update(deltaTime);
            return echo.isAlive;
        });
    }

    render(ctx, camera) {
        this.echoes.forEach(echo => echo.render(ctx, camera));
    }

    getActiveEchoes() {
        return this.echoes.filter(echo => echo.isAlive);
    }
}

class EchoEffect extends Entity {
    constructor(sourcePlayer, duration) {
        super(0, 0);
        this.sourcePlayer = sourcePlayer;
        this.duration = duration;
        this.recordingTime = 3000; // Record 3 seconds of movement
        this.movementHistory = [];
        this.playbackIndex = 0;
        this.isRecording = true;
        this.isPlayingBack = false;
        this.alpha = 0.6;
        
        // Start recording immediately
        this.startRecording();
    }

    startRecording() {
        // Record the player's recent movement history
        const now = Date.now();
        const recordingStart = now - this.recordingTime;
        
        // Simulate movement history (in a real implementation, this would come from actual player data)
        this.generateMovementHistory(recordingStart, now);
        
        // Start playback after recording
        setTimeout(() => {
            this.isRecording = false;
            this.isPlayingBack = true;
            this.playbackStartTime = Date.now();
        }, 100);
    }

    generateMovementHistory(startTime, endTime) {
        const playerCenter = this.sourcePlayer.getCenterPosition();
        const steps = 30; // 30 movement points over 3 seconds
        const timeStep = this.recordingTime / steps;
        
        for (let i = 0; i < steps; i++) {
            const time = startTime + (i * timeStep);
            const progress = i / steps;
            
            // Create a curved path that roughly follows where the player might have been
            const angle = progress * Math.PI * 2 + Math.random() * 0.5;
            const distance = MathUtils.random(50, 150);
            const offset = Vector2.fromAngle(angle, distance * (1 - progress));
            
            this.movementHistory.push({
                time: time,
                position: Vector2.subtract(playerCenter, offset),
                cells: this.sourcePlayer.cells.map(cell => ({
                    position: Vector2.subtract(cell.position, offset),
                    mass: cell.mass,
                    radius: cell.radius
                }))
            });
        }
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.age >= this.duration) {
            this.destroy();
            return;
        }
        
        // Update alpha based on remaining time
        this.alpha = Math.max(0.2, 1 - (this.age / this.duration));
        
        if (this.isPlayingBack && this.movementHistory.length > 0) {
            const playbackTime = Date.now() - this.playbackStartTime;
            const historyIndex = Math.floor((playbackTime / this.recordingTime) * this.movementHistory.length);
            
            if (historyIndex < this.movementHistory.length) {
                this.playbackIndex = historyIndex;
                this.position = this.movementHistory[historyIndex].position.clone();
            }
        }
    }

    render(ctx, camera) {
        if (!this.isPlayingBack || this.playbackIndex >= this.movementHistory.length) return;
        
        const currentFrame = this.movementHistory[this.playbackIndex];
        if (!currentFrame) return;
        
        // Render echo cells
        currentFrame.cells.forEach(cellData => {
            const screenPos = camera.worldToScreen(cellData.position);
            const screenRadius = cellData.radius * camera.zoom;
            
            if (screenRadius < 2) return;
            
            // Ghostly appearance
            ctx.save();
            ctx.globalAlpha = this.alpha;
            
            // Main body with ghostly effect
            const gradient = ctx.createRadialGradient(
                screenPos.x, screenPos.y, 0,
                screenPos.x, screenPos.y, screenRadius
            );
            gradient.addColorStop(0, `rgba(255, 0, 255, ${this.alpha})`);
            gradient.addColorStop(0.7, `rgba(255, 0, 255, ${this.alpha * 0.6})`);
            gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Flickering border
            const flicker = Math.sin(this.age * 0.01) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(255, 0, 255, ${this.alpha * flicker})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = this.age * 0.05;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.restore();
        });
        
        // Render connection lines between echo cells
        if (currentFrame.cells.length > 1) {
            ctx.save();
            ctx.globalAlpha = this.alpha * 0.3;
            ctx.strokeStyle = 'rgba(255, 0, 255, 1)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            
            for (let i = 0; i < currentFrame.cells.length - 1; i++) {
                const pos1 = camera.worldToScreen(currentFrame.cells[i].position);
                const pos2 = camera.worldToScreen(currentFrame.cells[i + 1].position);
                
                ctx.beginPath();
                ctx.moveTo(pos1.x, pos1.y);
                ctx.lineTo(pos2.x, pos2.y);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
}

class Rewind extends ChronoAbility {
    constructor() {
        super('Rewind', GameConstants.REWIND_COOLDOWN, GameConstants.REWIND_COST, GameConstants.UNLOCK_LEVELS.REWIND);
    }

    activate(player, targetPosition) {
        const rewindTime = GameConstants.REWIND_DISTANCE;
        const success = player.rewindToTime(rewindTime);
        
        if (success) {
            this.createRewindEffect(player.getCenterPosition());
            
            setTimeout(() => {
                this.deactivate();
            }, 100);
            
            return true;
        }
        
        return false;
    }

    createRewindEffect(position) {
        if (window.particleSystem) {
            window.particleSystem.createTimeDistortion(position, 'rewind', 25);
        }
        
        if (window.audioSystem) {
            window.audioSystem.playSound('rewind_cast');
        }
        
        // Create visual shockwave
        if (window.effectSystem) {
            window.effectSystem.createShockwave(position, 200, 'temporal');
        }
    }
}

class AbilityManager {
    constructor() {
        this.abilities = {
            'stasis': new StasisField(),
            'echo': new Echo(),
            'rewind': new Rewind()
        };
        
        this.currentAbility = 'stasis'; // Default ability
    }

    setCurrentAbility(abilityName) {
        if (this.abilities[abilityName]) {
            this.currentAbility = abilityName;
            return true;
        }
        return false;
    }

    getCurrentAbility() {
        return this.abilities[this.currentAbility];
    }

    canUseCurrentAbility(player) {
        return this.getCurrentAbility().canUse(player);
    }

    useCurrentAbility(player, targetPosition) {
        return this.getCurrentAbility().use(player, targetPosition);
    }

    update(deltaTime) {
        Object.values(this.abilities).forEach(ability => {
            ability.update(deltaTime);
        });
    }

    render(ctx, camera) {
        Object.values(this.abilities).forEach(ability => {
            ability.render(ctx, camera);
        });
    }

    getCooldownInfo(abilityName) {
        const ability = this.abilities[abilityName];
        if (!ability) return null;
        
        return {
            remaining: ability.getCooldownRemaining(),
            progress: ability.getCooldownProgress(),
            canUse: ability.getCooldownRemaining() === 0
        };
    }

    isAbilityUnlocked(abilityName, playerLevel) {
        const ability = this.abilities[abilityName];
        return ability && playerLevel >= ability.unlockLevel;
    }

    getStasisSlowFactor(entity, playerId) {
        return this.abilities.stasis.checkSlowEffect(entity, playerId);
    }

    getActiveEffects() {
        return {
            stasisFields: this.abilities.stasis.getActiveFields(),
            echoes: this.abilities.echo.getActiveEchoes()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChronoAbility,
        StasisField,
        Echo,
        Rewind,
        AbilityManager
    };
}