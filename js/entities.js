// Entity Classes for Chrono-Swarm
// Defines all game entities including players, cells, resources, and hazards

class Entity {
    constructor(x, y) {
        this.id = GameUtils.generateId();
        // Validate position parameters
        const safeX = (typeof x === 'number' && !isNaN(x)) ? x : 0;
        const safeY = (typeof y === 'number' && !isNaN(y)) ? y : 0;
        this.position = new Vector2(safeX, safeY);
        this.velocity = new Vector2(0, 0);
        this.isAlive = true;
        this.age = 0;
    }

    update(deltaTime) {
        // Validate deltaTime
        const safeDeltaTime = (typeof deltaTime === 'number' && !isNaN(deltaTime)) ? deltaTime : 0;
        this.age += safeDeltaTime;
    }

    render(ctx, camera) {
        // Base rendering - override in subclasses
    }

    destroy() {
        this.isAlive = false;
    }
}

class Cell extends Entity {
    constructor(x, y, mass, color, parentPlayer) {
        super(x, y);
        // Validate mass parameter
        this.mass = (typeof mass === 'number' && !isNaN(mass) && mass > 0) ? mass : GameConstants.MIN_CELL_MASS;
        // Validate color parameter
        this.color = (color && typeof color.clone === 'function') ? color.clone() : new Color(255, 255, 255, 1);
        this.parentPlayer = parentPlayer;
        this.radius = GameUtils.calculateMassRadius(this.mass);
        this.trail = [];
        this.maxTrailLength = 10;
        this.glowIntensity = 0;
        this.lastSplitTime = 0;
        this.canRecombine = true;
        
        // Visual effects
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.sparkles = [];
        this.maxSparkles = 5;
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Update radius based on mass
        this.radius = GameUtils.calculateMassRadius(this.mass);
        
        // Update position with velocity
        this.position = Vector2.add(this.position, Vector2.multiply(this.velocity, deltaTime / 1000));
        
        // Enforce arena boundaries - prevent cells from leaving the arena
        if (typeof GameConstants !== 'undefined') {
            const padding = GameConstants.ARENA_PADDING || 100;
            const maxX = GameConstants.ARENA_WIDTH - padding;
            const maxY = GameConstants.ARENA_HEIGHT - padding;
            
            // Clamp position to arena bounds
            this.position.x = Math.max(padding, Math.min(maxX, this.position.x));
            this.position.y = Math.max(padding, Math.min(maxY, this.position.y));
            
            // Bounce velocity if hitting boundaries
            if (this.position.x <= padding || this.position.x >= maxX) {
                this.velocity.x *= -0.5; // Reduce velocity and reverse direction
            }
            if (this.position.y <= padding || this.position.y >= maxY) {
                this.velocity.y *= -0.5; // Reduce velocity and reverse direction
            }
        }
        
        // Dynamic friction based on velocity for more responsive movement
        const velocityMagnitude = Vector2.magnitude(this.velocity);
        const dynamicFriction = velocityMagnitude > 100 ? 
            GameConstants.FRICTION * 0.98 : // Less friction when moving fast
            GameConstants.FRICTION;
        
        this.velocity = Vector2.multiply(this.velocity, dynamicFriction);
        
        // Update trail with velocity-based length for visual feedback
        this.updateTrail(velocityMagnitude);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime, velocityMagnitude);
        
        // Check recombine timer
        if (!this.canRecombine && Date.now() - this.lastSplitTime > GameConstants.RECOMBINE_TIME) {
            this.canRecombine = true;
        }
    }

    updateTrail(velocityMagnitude) {
        const trailLength = Math.max(1, Math.floor(velocityMagnitude / 10)); // Shorter trail when moving fast
        this.trail.push(this.position.clone());
        if (this.trail.length > trailLength) {
            this.trail.shift();
        }
    }

    updateVisualEffects(deltaTime, velocityMagnitude) {
        this.pulsePhase += deltaTime * 0.003;
        
        // Update sparkles
        this.sparkles = this.sparkles.filter(sparkle => {
            sparkle.life -= deltaTime;
            sparkle.position = Vector2.add(sparkle.position, Vector2.multiply(sparkle.velocity, deltaTime / 1000));
            sparkle.alpha = sparkle.life / sparkle.maxLife;
            return sparkle.life > 0;
        });
        
        // Add new sparkles based on movement speed for dynamic visual feedback
        const sparkleRate = velocityMagnitude > 50 ? 0.05 : 0.02; // More sparkles when moving fast
        const maxSparkles = velocityMagnitude > 100 ? this.maxSparkles * 2 : this.maxSparkles;
        
        if (Math.random() < sparkleRate && this.sparkles.length < maxSparkles) {
            this.addSparkle(velocityMagnitude);
        }
        
        // Add speed-based glow effect
        this.glowIntensity = Math.min(1, velocityMagnitude / 150);
    }

    addSparkle(velocityMagnitude = 0) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.radius * 0.8;
        
        // Enhanced sparkles based on movement speed
        const speedBonus = velocityMagnitude > 50 ? 1.5 : 1;
        const sparkle = {
            position: Vector2.add(this.position, Vector2.fromAngle(angle, distance)),
            velocity: Vector2.fromAngle(angle, MathUtils.random(10 * speedBonus, 30 * speedBonus)),
            life: MathUtils.random(500, 1000 * speedBonus),
            maxLife: 1000 * speedBonus,
            alpha: 1,
            size: MathUtils.random(1, 3 * speedBonus)
        };
        this.sparkles.push(sparkle);
    }

    render(ctx, camera) {
        const screenPos = camera.worldToScreen(this.position);
        const screenRadius = this.radius * camera.zoom;
        
        if (screenRadius < 2) return; // Don't render very small cells
        
        // Render trail
        this.renderTrail(ctx, camera);
        
        // Main cell body
        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, screenRadius
        );
        
        // Validate color before using in gradient
        if (!this.color || typeof this.color.r !== 'number' || isNaN(this.color.r)) {
            console.warn('Invalid cell color, using default');
            this.color = new Color(255, 255, 255, 1);
        }
        
        const pulseIntensity = Math.sin(this.pulsePhase) * 0.1 + 0.9;
        const glowColor = new Color(this.color.r, this.color.g, this.color.b, 0.8 * pulseIntensity);
        const coreColor = new Color(this.color.r, this.color.g, this.color.b, 0.6);
        
        gradient.addColorStop(0, glowColor.toString());
        gradient.addColorStop(0.7, coreColor.toString());
        gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer glow enhanced with movement-based intensity
        const totalGlow = Math.max(this.glowIntensity, 0.2); // Minimum glow
        if (totalGlow > 0) {
            ctx.shadowColor = this.color.toString();
            ctx.shadowBlur = 20 * totalGlow;
            ctx.globalAlpha = totalGlow * 0.5;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius * (1 + totalGlow * 0.2), 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
        
        // Render sparkles
        this.renderSparkles(ctx, camera);
        
        // Border
        ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderTrail(ctx, camera) {
        if (this.trail.length < 2) return;
        
        ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.3)`;
        ctx.lineWidth = Math.max(1, this.radius * camera.zoom * 0.1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            const screenPos = camera.worldToScreen(this.trail[i]);
            if (i === 0) {
                ctx.moveTo(screenPos.x, screenPos.y);
            } else {
                ctx.lineTo(screenPos.x, screenPos.y);
            }
        }
        ctx.stroke();
    }

    renderSparkles(ctx, camera) {
        this.sparkles.forEach(sparkle => {
            const screenPos = camera.worldToScreen(sparkle.position);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${sparkle.alpha})`;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, sparkle.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    split(direction) {
        if (this.mass < GameConstants.MIN_SPLIT_MASS * 2) return null;
        if (!this.canRecombine) return null;
        
        const newMass = this.mass / 2;
        const newCell = new Cell(
            this.position.x, 
            this.position.y, 
            newMass, 
            this.color, 
            this.parentPlayer
        );
        
        // Set velocities
        const splitSpeed = 300;
        const splitDirection = Vector2.normalize(direction);
        newCell.velocity = Vector2.multiply(splitDirection, splitSpeed);
        this.velocity = Vector2.multiply(splitDirection, -splitSpeed * 0.3);
        
        // Update masses
        this.mass = newMass;
        this.radius = GameUtils.calculateMassRadius(this.mass);
        
        // Set split timers
        this.lastSplitTime = Date.now();
        newCell.lastSplitTime = Date.now();
        this.canRecombine = false;
        newCell.canRecombine = false;
        
        return newCell;
    }

    ejectMass(direction) {
        if (this.mass <= GameConstants.EJECT_MASS_AMOUNT) return null;
        
        const ejectedMass = GameConstants.EJECT_MASS_AMOUNT;
        this.mass -= ejectedMass;
        this.radius = GameUtils.calculateMassRadius(this.mass);
        
        // Create ejected mass as a small cell-like object
        const ejectDirection = Vector2.normalize(direction);
        const ejectPosition = Vector2.add(this.position, Vector2.multiply(ejectDirection, this.radius + 10));
        
        const ejectedCell = new EjectedMass(
            ejectPosition.x,
            ejectPosition.y,
            ejectedMass,
            this.color
        );
        
        ejectedCell.velocity = Vector2.multiply(ejectDirection, GameConstants.EJECT_SPEED);
        
        // Small recoil
        this.velocity = Vector2.add(this.velocity, Vector2.multiply(ejectDirection, -50));
        
        return ejectedCell;
    }

    canCombineWith(otherCell) {
        if (!this.canRecombine || !otherCell.canRecombine) return false;
        if (this.parentPlayer !== otherCell.parentPlayer) return false;
        const distance = Vector2.distance(this.position, otherCell.position);
        return distance < (this.radius + otherCell.radius) * 0.8;
    }

    combineWith(otherCell) {
        this.mass += otherCell.mass;
        this.radius = GameUtils.calculateMassRadius(this.mass);
        
        // Weighted average position
        const totalMass = this.mass;
        this.position = Vector2.add(
            Vector2.multiply(this.position, this.mass / totalMass),
            Vector2.multiply(otherCell.position, otherCell.mass / totalMass)
        );
        
        // Average velocity
        this.velocity = Vector2.add(
            Vector2.multiply(this.velocity, 0.5),
            Vector2.multiply(otherCell.velocity, 0.5)
        );
        
        otherCell.destroy();
    }

    takeDamage(amount) {
        this.mass = Math.max(10, this.mass - amount);
        this.radius = GameUtils.calculateMassRadius(this.mass);
        this.glowIntensity = 1; // Flash effect
        setTimeout(() => this.glowIntensity = 0, 200);
    }
}

class EjectedMass extends Entity {
    constructor(x, y, mass, color) {
        super(x, y);
        this.mass = mass;
        this.color = color.clone();
        this.radius = GameUtils.calculateMassRadius(mass);
        this.maxAge = 5000; // 5 seconds before disappearing
        this.collected = false;
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        this.position = Vector2.add(this.position, Vector2.multiply(this.velocity, deltaTime / 1000));
        this.velocity = Vector2.multiply(this.velocity, 0.98); // Slower friction
        
        if (this.age > this.maxAge) {
            this.destroy();
        }
    }

    render(ctx, camera) {
        const screenPos = camera.worldToScreen(this.position);
        const screenRadius = this.radius * camera.zoom;
        
        if (screenRadius < 1) return;
        
        const alpha = Math.max(0, 1 - (this.age / this.maxAge));
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    canBeCollectedBy(cell) {
        const distance = Vector2.distance(this.position, cell.position);
        return distance < (this.radius + cell.radius);
    }

    collect() {
        this.collected = true;
        this.destroy();
        return this.mass;
    }
}

class ChronoMatter extends Entity {
    constructor(x, y) {
        super(x, y);
        this.mass = GameConstants.MATTER_VALUE;
        this.radius = GameConstants.MATTER_RADIUS;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.hue = Math.random() * 60 + 180; // Blue-cyan range
        this.color = GameUtils.generateHSLColor(this.hue, 80, 60);
        this.massMultiplier = 1; // For dynamic events
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.pulsePhase += deltaTime * 0.005;
    }

    render(ctx, camera) {
        const screenPos = camera.worldToScreen(this.position);
        const screenRadius = this.radius * camera.zoom;
        
        if (screenRadius < 1) return;
        
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.2;
        const finalRadius = screenRadius * pulseScale;
        
        // Enhanced glow for mass surge events
        const glowMultiplier = this.massMultiplier > 1 ? this.massMultiplier : 1;
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, finalRadius * 2 * glowMultiplier
        );
        
        // Validate color before using in gradient
        if (!this.color || typeof this.color.r !== 'number' || isNaN(this.color.r)) {
            console.warn('Invalid matter color, using default');
            this.color = new Color(100, 150, 255, 1); // Default blue matter color
        }
        
        if (this.massMultiplier > 1) {
            // Special colors for enhanced matter
            gradient.addColorStop(0, 'rgba(255, 215, 0, 1)'); // Gold core
            gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0.2)');
        } else {
            gradient.addColorStop(0, this.color.toString());
            gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.5)`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, finalRadius * 2 * glowMultiplier, 0, Math.PI * 2);
        ctx.fill();
        
        // Core with enhanced effect for mass surge
        if (this.massMultiplier > 1) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
        } else {
            ctx.fillStyle = this.color.toString();
        }
        
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, finalRadius, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.massMultiplier > 1) {
            ctx.stroke();
        }
    }

    canBeConsumedBy(cell) {
        const distance = Vector2.distance(this.position, cell.position);
        return distance < (this.radius + cell.radius * 0.8);
    }

    consume() {
        this.destroy();
        return this.mass * this.massMultiplier;
    }
}

class TemporalRift extends Entity {
    constructor(x, y, radius) {
        super(x, y);
        this.radius = radius;
        this.originalRadius = radius;
        this.energy = 0;
        this.maxEnergy = 100;
        this.crackleParts = [];
        this.innerRotation = 0;
        this.outerRotation = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        // Generate crackle parts
        for (let i = 0; i < 12; i++) {
            this.crackleParts.push({
                angle: (i / 12) * Math.PI * 2,
                length: MathUtils.random(0.6, 1.2),
                phase: Math.random() * Math.PI * 2,
                speed: MathUtils.random(0.001, 0.003)
            });
        }
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        this.innerRotation += deltaTime * 0.001;
        this.outerRotation -= deltaTime * 0.0007;
        this.pulsePhase += deltaTime * 0.003;
        
        // Update crackle parts
        this.crackleParts.forEach(part => {
            part.phase += deltaTime * part.speed;
        });
        
        // Energy decay
        this.energy = Math.max(0, this.energy - deltaTime * 0.05);
        
        // Radius based on energy
        this.radius = this.originalRadius + (this.energy / this.maxEnergy) * 20;
    }

    render(ctx, camera) {
        const screenPos = camera.worldToScreen(this.position);
        const screenRadius = this.radius * camera.zoom;
        
        if (screenRadius < 5) return;
        
        const pulseIntensity = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        
        // Outer distortion field
        ctx.save();
        ctx.globalAlpha = 0.3 * pulseIntensity;
        const outerGradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, screenRadius * 1.5
        );
        outerGradient.addColorStop(0, 'rgba(0, 255, 0, 0.8)');
        outerGradient.addColorStop(0.6, 'rgba(0, 255, 0, 0.4)');
        outerGradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Inner core
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(this.innerRotation);
        
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, screenRadius);
        coreGradient.addColorStop(0, 'rgba(0, 255, 0, 0.9)');
        coreGradient.addColorStop(0.7, 'rgba(0, 200, 0, 0.6)');
        coreGradient.addColorStop(1, 'rgba(0, 150, 0, 0.3)');
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, screenRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Crackle effects
        ctx.strokeStyle = `rgba(0, 255, 100, ${0.8 * pulseIntensity})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        this.crackleParts.forEach(part => {
            const intensity = Math.sin(part.phase) * 0.5 + 0.5;
            const startRadius = screenRadius * 0.3;
            const endRadius = screenRadius * part.length * intensity;
            
            const startX = Math.cos(part.angle) * startRadius;
            const startY = Math.sin(part.angle) * startRadius;
            const endX = Math.cos(part.angle) * endRadius;
            const endY = Math.sin(part.angle) * endRadius;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        });
        
        ctx.restore();
        
        // Energy indicator
        if (this.energy > 0) {
            ctx.strokeStyle = `rgba(255, 255, 0, ${this.energy / this.maxEnergy})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    feedEnergy(amount) {
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
        
        if (this.energy >= this.maxEnergy) {
            return this.fireProjectile();
        }
        return null;
    }

    fireProjectile() {
        this.energy = 0;
        
        // Create a projectile rift
        const angle = Math.random() * Math.PI * 2;
        const targetDistance = MathUtils.random(200, 500);
        const targetPos = Vector2.add(
            this.position,
            Vector2.fromAngle(angle, targetDistance)
        );
        
        return new RiftProjectile(this.position, targetPos);
    }

    canDamage(cell) {
        const distance = Vector2.distance(this.position, cell.position);
        const massThreshold = GameConstants.RIFT_DAMAGE_THRESHOLD;
        
        return distance < this.radius && cell.mass >= this.originalRadius * massThreshold;
    }

    damageCell(cell) {
        // Shatter cell into smaller pieces
        const pieces = Math.min(8, Math.floor(cell.mass / 20));
        const pieceMass = cell.mass / pieces;
        const results = [];
        
        for (let i = 0; i < pieces; i++) {
            const angle = (i / pieces) * Math.PI * 2;
            const distance = cell.radius + 20;
            const piecePos = Vector2.add(cell.position, Vector2.fromAngle(angle, distance));
            
            const piece = new Cell(piecePos.x, piecePos.y, pieceMass, cell.color, cell.parentPlayer);
            piece.velocity = Vector2.fromAngle(angle, MathUtils.random(100, 200));
            piece.lastSplitTime = Date.now();
            piece.canRecombine = false;
            
            results.push(piece);
        }
        
        cell.destroy();
        return results;
    }
}

class RiftProjectile extends Entity {
    constructor(startPos, targetPos) {
        super(startPos.x, startPos.y);
        this.targetPos = targetPos.clone();
        this.speed = 400;
        this.direction = Vector2.normalize(Vector2.subtract(targetPos, startPos));
        this.velocity = Vector2.multiply(this.direction, this.speed);
        this.radius = 15;
        this.maxAge = 3000; // 3 seconds max
        this.trailPoints = [];
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        this.position = Vector2.add(this.position, Vector2.multiply(this.velocity, deltaTime / 1000));
        
        // Add to trail
        this.trailPoints.push(this.position.clone());
        if (this.trailPoints.length > 10) {
            this.trailPoints.shift();
        }
        
        // Check if reached target or max age
        const distanceToTarget = Vector2.distance(this.position, this.targetPos);
        if (distanceToTarget < 20 || this.age > this.maxAge) {
            this.explode();
        }
    }

    render(ctx, camera) {
        // Render trail
        if (this.trailPoints.length > 1) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            
            for (let i = 0; i < this.trailPoints.length; i++) {
                const screenPos = camera.worldToScreen(this.trailPoints[i]);
                if (i === 0) {
                    ctx.moveTo(screenPos.x, screenPos.y);
                } else {
                    ctx.lineTo(screenPos.x, screenPos.y);
                }
            }
            ctx.stroke();
        }
        
        // Render projectile
        const screenPos = camera.worldToScreen(this.position);
        const screenRadius = this.radius * camera.zoom;
        
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    explode() {
        // Create a temporary rift at the explosion point
        this.explosionRift = new TemporalRift(this.position.x, this.position.y, 40);
        this.destroy();
        return this.explosionRift;
    }

    canHit(cell) {
        const distance = Vector2.distance(this.position, cell.position);
        return distance < (this.radius + cell.radius);
    }
}

// Ancient Artifacts - Rare discoverable items that provide permanent bonuses
class AncientArtifact {
    constructor(x, y, artifactType = null) {
        this.position = new Vector2(x, y);
        this.type = artifactType || MathUtils.randomChoice([
            'TEMPORAL_CRYSTAL', 'VOID_ESSENCE', 'STELLAR_CORE', 
            'QUANTUM_MATRIX', 'PRIMORDIAL_SHARD', 'COSMIC_RUNE'
        ]);
        this.radius = 25;
        this.discovered = false;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.rotationSpeed = 0.02;
        this.rotation = 0;
        this.auraIntensity = 0;
        this.discoveryRange = 60;
        
        // Artifact properties based on type
        this.properties = this.getArtifactProperties();
        
        // Visual effects
        this.particles = [];
        this.lastParticleSpawn = 0;
        this.glowPulse = 0;
    }
    
    getArtifactProperties() {
        const artifactData = {
            TEMPORAL_CRYSTAL: {
                name: 'Temporal Crystal',
                description: 'Increases ability cooldown recovery by 20%',
                color: '#88ffff',
                effect: { abilityRecharge: 1.2 },
                rarity: 'legendary'
            },
            VOID_ESSENCE: {
                name: 'Void Essence',
                description: 'Grants immunity to void damage',
                color: '#440088',
                effect: { voidImmunity: true },
                rarity: 'epic'
            },
            STELLAR_CORE: {
                name: 'Stellar Core',
                description: 'Increases movement speed by 15%',
                color: '#ffaa00',
                effect: { speedBonus: 1.15 },
                rarity: 'rare'
            },
            QUANTUM_MATRIX: {
                name: 'Quantum Matrix',
                description: 'Allows splitting into more cells (+2 max)',
                color: '#ff00ff',
                effect: { maxCellsBonus: 2 },
                rarity: 'legendary'
            },
            PRIMORDIAL_SHARD: {
                name: 'Primordial Shard',
                description: 'Increases mass gain from matter by 50%',
                color: '#00ff88',
                effect: { massGainBonus: 1.5 },
                rarity: 'epic'
            },
            COSMIC_RUNE: {
                name: 'Cosmic Rune',
                description: 'Grants passive experience generation',
                color: '#ffff00',
                effect: { experienceRegen: 5 }, // per second
                rarity: 'mythic'
            }
        };
        
        return artifactData[this.type];
    }
    
    update(deltaTime) {
        this.rotation += this.rotationSpeed * deltaTime / 16.67;
        this.pulsePhase += 0.05;
        this.glowPulse = Math.sin(this.pulsePhase) * 0.5 + 0.5;
        
        // Spawn particles
        const now = Date.now();
        if (now - this.lastParticleSpawn > 200) {
            this.spawnAuraParticle();
            this.lastParticleSpawn = now;
        }
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.life -= deltaTime;
            particle.position.x += particle.velocity.x * deltaTime / 1000;
            particle.position.y += particle.velocity.y * deltaTime / 1000;
            particle.alpha = particle.life / particle.maxLife;
            return particle.life > 0;
        });
    }
    
    spawnAuraParticle() {
        if (window.particleSystem) {
            const angle = Math.random() * Math.PI * 2;
            const distance = this.radius + Math.random() * 20;
            const particlePos = Vector2.add(this.position, Vector2.fromAngle(angle, distance));
            
            window.particleSystem.createParticle(particlePos.x, particlePos.y, {
                type: 'star',
                life: 2000,
                maxLife: 2000,
                startSize: 2,
                endSize: 0,
                startColor: Color.fromHex(this.properties.color),
                endColor: new Color(255, 255, 255, 0),
                velocity: Vector2.fromAngle(angle + Math.PI, 20),
                blendMode: 'additive'
            });
        }
    }
    
    checkPlayerNearby(player) {
        if (!player || this.discovered) return false;
        
        const playerCenter = player.getCenterPosition();
        const distance = Vector2.distance(this.position, playerCenter);
        
        return distance <= this.discoveryRange;
    }
    
    discover(player) {
        if (this.discovered) return false;
        
        this.discovered = true;
        
        // Apply artifact effects to player
        if (player.artifacts) {
            player.artifacts.push(this.type);
        } else {
            player.artifacts = [this.type];
        }
        
        // Create discovery particle explosion
        if (window.particleSystem) {
            window.particleSystem.createExplosion(this.position, 'artifact', 30, {
                startColor: Color.fromHex(this.properties.color),
                endColor: new Color(255, 255, 255, 0),
                life: 3000
            });
        }
        
        // Play discovery sound
        if (window.audioSystem) {
            window.audioSystem.playSound('artifact_discovery');
        }
        
        return true;
    }
    
    render(ctx, camera) {
        if (!camera.isInView(this.position, this.radius * 3)) return;
        
        const screenPos = camera.worldToScreen(this.position);
        const scale = camera.zoom;
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(this.rotation);
        
        // Outer aura
        const auraRadius = (this.radius + 10 + this.glowPulse * 5) * scale;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, auraRadius);
        gradient.addColorStop(0, this.properties.color + '80');
        gradient.addColorStop(1, this.properties.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-auraRadius, -auraRadius, auraRadius * 2, auraRadius * 2);
        
        // Main artifact body
        ctx.fillStyle = this.properties.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * scale;
        
        // Draw artifact shape based on type
        const radius = this.radius * scale;
        if (this.type === 'TEMPORAL_CRYSTAL') {
            this.drawCrystalShape(ctx, radius);
        } else if (this.type === 'STELLAR_CORE') {
            this.drawStarShape(ctx, radius);
        } else if (this.type === 'QUANTUM_MATRIX') {
            this.drawMatrixShape(ctx, radius);
        } else {
            // Default shape
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Draw discovery prompt if player is nearby
        if (!this.discovered && this.auraIntensity > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${12 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('Press E to investigate', screenPos.x, screenPos.y - (this.radius + 30) * scale);
        }
    }
    
    drawCrystalShape(ctx, radius) {
        ctx.beginPath();
        const points = 6;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    drawStarShape(ctx, radius) {
        ctx.beginPath();
        const points = 8;
        for (let i = 0; i < points * 2; i++) {
            const angle = (i / (points * 2)) * Math.PI * 2;
            const r = i % 2 === 0 ? radius : radius * 0.5;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    drawMatrixShape(ctx, radius) {
        ctx.beginPath();
        ctx.rect(-radius, -radius, radius * 2, radius * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner pattern
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.5, -radius * 0.5);
        ctx.lineTo(radius * 0.5, radius * 0.5);
        ctx.moveTo(radius * 0.5, -radius * 0.5);
        ctx.lineTo(-radius * 0.5, radius * 0.5);
        ctx.stroke();
    }
}

// Wormholes - Teleportation portals between distant locations
class Wormhole {
    constructor(x, y, exitX, exitY) {
        this.position = new Vector2(x, y);
        this.exitPosition = new Vector2(exitX, exitY);
        this.radius = 40;
        this.innerRadius = 20;
        this.rotationSpeed = 0.03;
        this.rotation = 0;
        this.pulsePhase = 0;
        this.cooldown = 0;
        this.maxCooldown = 3000; // 3 seconds between uses
        this.isActive = true;
        
        // Visual effects
        this.particles = [];
        this.lastParticleSpawn = 0;
    }
    
    update(deltaTime) {
        this.rotation += this.rotationSpeed * deltaTime / 16.67;
        this.pulsePhase += 0.08;
        
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
            this.isActive = this.cooldown <= 0;
        }
        
        // Spawn particles
        const now = Date.now();
        if (now - this.lastParticleSpawn > 100) {
            this.spawnWormholeParticle();
            this.lastParticleSpawn = now;
        }
    }
    
    spawnWormholeParticle() {
        if (window.particleSystem) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.radius;
            const particlePos = Vector2.add(this.position, Vector2.fromAngle(angle, distance));
            
            window.particleSystem.createParticle(particlePos.x, particlePos.y, {
                type: 'circle',
                life: 1500,
                maxLife: 1500,
                startSize: 3,
                endSize: 0,
                startColor: new Color(0, 255, 255, 0.8),
                endColor: new Color(255, 255, 255, 0),
                velocity: Vector2.fromAngle(angle, -30),
                blendMode: 'additive'
            });
        }
    }
    
    canTeleport(player) {
        if (!this.isActive || !player) return false;
        
        const playerCenter = player.getCenterPosition();
        const distance = Vector2.distance(this.position, playerCenter);
        
        return distance <= this.innerRadius;
    }
    
    teleport(player) {
        if (!this.canTeleport(player)) return false;
        
        // Calculate offset from wormhole center
        const playerCenter = player.getCenterPosition();
        const offset = Vector2.subtract(playerCenter, this.position);
        
        // Move all player cells to exit position + offset
        const newPosition = Vector2.add(this.exitPosition, offset);
        player.cells.forEach(cell => {
            const cellOffset = Vector2.subtract(cell.position, playerCenter);
            cell.position = Vector2.add(newPosition, cellOffset);
        });
        
        // Create teleport effects
        if (window.particleSystem) {
            // Entry effect
            window.particleSystem.createExplosion(this.position, 'teleport', 20, {
                startColor: new Color(0, 255, 255, 1),
                endColor: new Color(255, 255, 255, 0)
            });
            
            // Exit effect
            window.particleSystem.createExplosion(this.exitPosition, 'teleport', 20, {
                startColor: new Color(255, 0, 255, 1),
                endColor: new Color(255, 255, 255, 0)
            });
        }
        
        // Play teleport sound
        if (window.audioSystem) {
            window.audioSystem.playSound('wormhole_teleport');
        }
        
        // Set cooldown
        this.cooldown = this.maxCooldown;
        this.isActive = false;
        
        return true;
    }
    
    render(ctx, camera) {
        if (!camera.isInView(this.position, this.radius * 2)) return;
        
        const screenPos = camera.worldToScreen(this.position);
        const scale = camera.zoom;
        const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(this.rotation);
        
        // Outer ring
        const outerRadius = this.radius * scale * pulse;
        const gradient1 = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
        gradient1.addColorStop(0, 'rgba(0, 255, 255, 0)');
        gradient1.addColorStop(0.7, 'rgba(0, 255, 255, 0.3)');
        gradient1.addColorStop(1, 'rgba(0, 255, 255, 0.8)');
        
        ctx.fillStyle = gradient1;
        ctx.beginPath();
        ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner vortex
        const innerRadius = this.innerRadius * scale;
        const gradient2 = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
        gradient2.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient2.addColorStop(0.5, 'rgba(0, 100, 255, 0.8)');
        gradient2.addColorStop(1, 'rgba(0, 255, 255, 0.4)');
        
        ctx.fillStyle = gradient2;
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Spiral effect
        ctx.strokeStyle = this.isActive ? '#00ffff' : '#666666';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        const spiralTurns = 3;
        for (let i = 0; i <= 100; i++) {
            const progress = i / 100;
            const angle = progress * spiralTurns * Math.PI * 2;
            const radius = innerRadius * (1 - progress);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        ctx.restore();
        
        // Cooldown indicator
        if (this.cooldown > 0) {
            const cooldownProgress = 1 - (this.cooldown / this.maxCooldown);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * scale;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, (this.radius + 10) * scale, 
                   -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2);
            ctx.stroke();
        }
    }
}

// Energy Storms - Dynamic weather events that affect gameplay
class EnergyStorm {
    constructor(x, y, stormType = 'LIGHTNING') {
        this.position = new Vector2(x, y);
        this.type = stormType;
        this.radius = 150;
        this.maxRadius = 300;
        this.intensity = 0;
        this.maxIntensity = 1;
        this.growthRate = 0.001;
        this.duration = 45000; // 45 seconds
        this.age = 0;
        this.isActive = true;
        
        // Storm properties
        this.properties = this.getStormProperties();
        
        // Visual effects
        this.lightningBolts = [];
        this.lastLightning = 0;
        this.pulsePhase = 0;
        this.rotation = 0;
    }
    
    getStormProperties() {
        const stormData = {
            LIGHTNING: {
                name: 'Lightning Storm',
                color: '#ffff00',
                effects: { speedBonus: 1.2, energyDrain: true },
                lightningFrequency: 500
            },
            PLASMA: {
                name: 'Plasma Storm',
                color: '#ff00ff',
                effects: { damageBonus: 1.3, plasmaBurn: true },
                lightningFrequency: 300
            },
            VOID: {
                name: 'Void Storm',
                color: '#800080',
                effects: { voidDamage: true, speedPenalty: 0.7 },
                lightningFrequency: 800
            },
            CRYSTAL: {
                name: 'Crystal Storm',
                color: '#00ff88',
                effects: { massGainBonus: 1.5, crystallize: true },
                lightningFrequency: 1000
            }
        };
        
        return stormData[this.type];
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        this.pulsePhase += 0.05;
        this.rotation += 0.02;
        
        // Storm lifecycle
        const lifeProgress = this.age / this.duration;
        if (lifeProgress < 0.3) {
            // Growing phase
            this.intensity = MathUtils.lerp(0, this.maxIntensity, lifeProgress / 0.3);
            this.radius = MathUtils.lerp(50, this.maxRadius, lifeProgress / 0.3);
        } else if (lifeProgress < 0.7) {
            // Stable phase
            this.intensity = this.maxIntensity;
            this.radius = this.maxRadius;
        } else {
            // Dissipating phase
            const dissipateProgress = (lifeProgress - 0.7) / 0.3;
            this.intensity = MathUtils.lerp(this.maxIntensity, 0, dissipateProgress);
            this.radius = MathUtils.lerp(this.maxRadius, 50, dissipateProgress);
        }
        
        if (this.age >= this.duration) {
            this.isActive = false;
        }
        
        // Generate lightning
        const now = Date.now();
        if (now - this.lastLightning > this.properties.lightningFrequency) {
            this.createLightningBolt();
            this.lastLightning = now;
        }
        
        // Update lightning bolts
        this.lightningBolts = this.lightningBolts.filter(bolt => {
            bolt.life -= deltaTime;
            return bolt.life > 0;
        });
    }
    
    createLightningBolt() {
        if (window.particleSystem) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.radius;
            const startPos = Vector2.add(this.position, Vector2.fromAngle(angle, distance));
            
            const bolt = {
                start: startPos,
                end: Vector2.add(startPos, Vector2.fromAngle(angle + Math.random() - 0.5, 100)),
                life: 200,
                maxLife: 200
            };
            
            this.lightningBolts.push(bolt);
            
            // Create lightning particle effect
            window.particleSystem.createParticle(startPos.x, startPos.y, {
                type: 'star',
                life: 300,
                maxLife: 300,
                startSize: 8,
                endSize: 0,
                startColor: Color.fromHex(this.properties.color),
                endColor: new Color(255, 255, 255, 0),
                blendMode: 'additive'
            });
        }
    }
    
    affectsPlayer(player) {
        if (!this.isActive || !player) return false;
        
        const playerCenter = player.getCenterPosition();
        const distance = Vector2.distance(this.position, playerCenter);
        
        return distance <= this.radius;
    }
    
    render(ctx, camera) {
        if (!camera.isInView(this.position, this.radius * 2)) return;
        
        const screenPos = camera.worldToScreen(this.position);
        const scale = camera.zoom;
        const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        
        ctx.save();
        ctx.globalAlpha = this.intensity * 0.8;
        
        // Storm area
        const radius = this.radius * scale * pulse;
        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, radius
        );
        gradient.addColorStop(0, this.properties.color + '40');
        gradient.addColorStop(0.7, this.properties.color + '20');
        gradient.addColorStop(1, this.properties.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Lightning bolts
        ctx.strokeStyle = this.properties.color;
        ctx.lineWidth = 3 * scale;
        ctx.shadowColor = this.properties.color;
        ctx.shadowBlur = 10 * scale;
        
        this.lightningBolts.forEach(bolt => {
            const alpha = bolt.life / bolt.maxLife;
            ctx.globalAlpha = alpha * this.intensity;
            
            const startScreen = camera.worldToScreen(bolt.start);
            const endScreen = camera.worldToScreen(bolt.end);
            
            ctx.beginPath();
            ctx.moveTo(startScreen.x, startScreen.y);
            ctx.lineTo(endScreen.x, endScreen.y);
            ctx.stroke();
        });
        
        ctx.restore();
        
        // Storm name
        if (this.intensity > 0.5) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${14 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(this.properties.name, screenPos.x, screenPos.y - radius - 20);
        }
    }
}

// Mystery Zones - Temporary areas with special effects that appear randomly
class MysteryZone {
    constructor(x, y, zoneType = null) {
        this.position = new Vector2(x, y);
        this.type = zoneType || MathUtils.randomChoice([
            'EXPERIENCE_BOOST', 'MASS_MULTIPLICATION', 'SPEED_ZONE', 
            'INVULNERABILITY', 'SHARD_RAIN', 'TIME_DILATION'
        ]);
        this.radius = 120;
        this.duration = 30000; // 30 seconds
        this.age = 0;
        this.isActive = true;
        this.pulsePhase = 0;
        
        // Zone properties
        this.properties = this.getZoneProperties();
        
        // Visual effects
        this.orbs = [];
        this.generateOrbs();
    }
    
    getZoneProperties() {
        const zoneData = {
            EXPERIENCE_BOOST: {
                name: 'Experience Nexus',
                description: '+300% Experience Gain',
                color: '#00ff00',
                effects: { experienceMultiplier: 4 }
            },
            MASS_MULTIPLICATION: {
                name: 'Growth Chamber',
                description: '+200% Mass Gain',
                color: '#ff8800',
                effects: { massMultiplier: 3 }
            },
            SPEED_ZONE: {
                name: 'Velocity Field',
                description: '+100% Movement Speed',
                color: '#0088ff',
                effects: { speedMultiplier: 2 }
            },
            INVULNERABILITY: {
                name: 'Shield Dome',
                description: 'Temporary Invulnerability',
                color: '#ffff00',
                effects: { invulnerable: true }
            },
            SHARD_RAIN: {
                name: 'Shard Storm',
                description: 'Passive Shard Generation',
                color: '#ff00ff',
                effects: { shardRain: 2 } // shards per second
            },
            TIME_DILATION: {
                name: 'Temporal Bubble',
                description: 'Slowed Time Perception',
                color: '#88ffff',
                effects: { timeDilation: 0.5 }
            }
        };
        
        return zoneData[this.type];
    }
    
    generateOrbs() {
        const orbCount = 8;
        for (let i = 0; i < orbCount; i++) {
            const angle = (i / orbCount) * Math.PI * 2;
            const distance = this.radius * 0.8;
            this.orbs.push({
                position: Vector2.fromAngle(angle, distance),
                phase: i * (Math.PI * 2 / orbCount),
                rotationSpeed: 0.02
            });
        }
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        this.pulsePhase += 0.08;
        
        if (this.age >= this.duration) {
            this.isActive = false;
        }
        
        // Update orbs
        this.orbs.forEach(orb => {
            orb.phase += orb.rotationSpeed;
            const orbitalRadius = this.radius * 0.8 + Math.sin(orb.phase) * 20;
            orb.position = Vector2.fromAngle(orb.phase, orbitalRadius);
        });
        
        // Spawn effect particles
        if (window.particleSystem && Math.random() < 0.1) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.radius;
            const particlePos = Vector2.add(this.position, Vector2.fromAngle(angle, distance));
            
            window.particleSystem.createParticle(particlePos.x, particlePos.y, {
                type: 'circle',
                life: 2000,
                maxLife: 2000,
                startSize: 4,
                endSize: 0,
                startColor: Color.fromHex(this.properties.color),
                endColor: new Color(255, 255, 255, 0),
                velocity: Vector2.fromAngle(Math.random() * Math.PI * 2, 30),
                blendMode: 'additive'
            });
        }
    }
    
    affectsPlayer(player) {
        if (!this.isActive || !player) return false;
        
        const playerCenter = player.getCenterPosition();
        const distance = Vector2.distance(this.position, playerCenter);
        
        return distance <= this.radius;
    }
    
    render(ctx, camera) {
        if (!camera.isInView(this.position, this.radius * 2)) return;
        
        const screenPos = camera.worldToScreen(this.position);
        const scale = camera.zoom;
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;
        const alpha = Math.max(0, 1 - this.age / this.duration);
        
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        
        // Zone area
        const radius = this.radius * scale * pulse;
        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, radius
        );
        gradient.addColorStop(0, this.properties.color + '60');
        gradient.addColorStop(0.7, this.properties.color + '30');
        gradient.addColorStop(1, this.properties.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Orbiting energy orbs
        ctx.fillStyle = this.properties.color;
        ctx.shadowColor = this.properties.color;
        ctx.shadowBlur = 15 * scale;
        
        this.orbs.forEach(orb => {
            const orbWorldPos = Vector2.add(this.position, orb.position);
            const orbScreenPos = camera.worldToScreen(orbWorldPos);
            
            ctx.beginPath();
            ctx.arc(orbScreenPos.x, orbScreenPos.y, 6 * scale, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
        
        // Zone information
        ctx.fillStyle = '#ffffff';
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(this.properties.name, screenPos.x, screenPos.y - radius - 30);
        
        ctx.font = `${10 * scale}px Arial`;
        ctx.fillText(this.properties.description, screenPos.x, screenPos.y - radius - 15);
        
        // Duration indicator
        const remainingTime = Math.max(0, this.duration - this.age) / 1000;
        ctx.fillText(`${remainingTime.toFixed(1)}s`, screenPos.x, screenPos.y + radius + 20);
    }
}

// Export classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        Entity, Cell, EjectedMass, ChronoMatter, 
        TemporalRift, RiftProjectile, AncientArtifact, Wormhole, EnergyStorm, MysteryZone 
    };
}