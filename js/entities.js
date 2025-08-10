// Entity Classes for Chrono-Swarm
// Defines all game entities including players, cells, resources, and hazards

class Entity {
    constructor(x, y) {
        this.id = GameUtils.generateId();
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.isAlive = true;
        this.age = 0;
    }

    update(deltaTime) {
        this.age += deltaTime;
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
        this.mass = mass;
        this.color = color.clone();
        this.parentPlayer = parentPlayer;
        this.radius = GameUtils.calculateMassRadius(mass);
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
        
        // Apply friction
        this.velocity = Vector2.multiply(this.velocity, GameConstants.FRICTION);
        
        // Update trail
        this.updateTrail();
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Check recombine timer
        if (!this.canRecombine && Date.now() - this.lastSplitTime > GameConstants.RECOMBINE_TIME) {
            this.canRecombine = true;
        }
    }

    updateTrail() {
        this.trail.push(this.position.clone());
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    updateVisualEffects(deltaTime) {
        this.pulsePhase += deltaTime * 0.003;
        
        // Update sparkles
        this.sparkles = this.sparkles.filter(sparkle => {
            sparkle.life -= deltaTime;
            sparkle.position = Vector2.add(sparkle.position, Vector2.multiply(sparkle.velocity, deltaTime / 1000));
            sparkle.alpha = sparkle.life / sparkle.maxLife;
            return sparkle.life > 0;
        });
        
        // Add new sparkles occasionally
        if (Math.random() < 0.02 && this.sparkles.length < this.maxSparkles) {
            this.addSparkle();
        }
    }

    addSparkle() {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.radius * 0.8;
        const sparkle = {
            position: Vector2.add(this.position, Vector2.fromAngle(angle, distance)),
            velocity: Vector2.fromAngle(angle, MathUtils.random(10, 30)),
            life: MathUtils.random(500, 1000),
            maxLife: 1000,
            alpha: 1,
            size: MathUtils.random(1, 3)
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
        
        // Outer glow
        if (this.glowIntensity > 0) {
            ctx.shadowColor = this.color.toString();
            ctx.shadowBlur = 20 * this.glowIntensity;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
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
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, finalRadius * 2
        );
        gradient.addColorStop(0, this.color.toString());
        gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.5)`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, finalRadius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = this.color.toString();
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, finalRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    canBeConsumedBy(cell) {
        const distance = Vector2.distance(this.position, cell.position);
        return distance < (this.radius + cell.radius * 0.8);
    }

    consume() {
        this.destroy();
        return this.mass;
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

// Export classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        Entity, Cell, EjectedMass, ChronoMatter, 
        TemporalRift, RiftProjectile 
    };
}