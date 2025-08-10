// Particle System for Chrono-Swarm
// Handles all visual effects and game juice feedback

class Particle {
    constructor(x, y, type = 'default') {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.life = 1000; // milliseconds
        this.maxLife = 1000;
        this.size = 5;
        this.startSize = 5;
        this.endSize = 0;
        this.color = new Color(255, 255, 255, 1);
        this.startColor = new Color(255, 255, 255, 1);
        this.endColor = new Color(255, 255, 255, 0);
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.type = type;
        this.gravity = new Vector2(0, 0);
        this.friction = 1;
        this.isAlive = true;
        this.blendMode = 'normal';
        this.glow = false;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.01;
        this.trail = [];
        this.maxTrailLength = 5;
    }

    update(deltaTime) {
        if (!this.isAlive) return;

        this.life -= deltaTime;
        if (this.life <= 0) {
            this.isAlive = false;
            return;
        }

        // Calculate life progress (0 to 1, where 1 is start of life)
        const lifeProgress = this.life / this.maxLife;
        const age = 1 - lifeProgress;

        // Update physics
        this.velocity = Vector2.add(this.velocity, Vector2.multiply(this.acceleration, deltaTime / 1000));
        this.velocity = Vector2.add(this.velocity, Vector2.multiply(this.gravity, deltaTime / 1000));
        this.velocity = Vector2.multiply(this.velocity, this.friction);
        
        // Update trail
        this.trail.push(this.position.clone());
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        this.position = Vector2.add(this.position, Vector2.multiply(this.velocity, deltaTime / 1000));
        this.rotation += this.rotationSpeed * deltaTime / 1000;

        // Interpolate properties based on age
        this.size = MathUtils.lerp(this.startSize, this.endSize, age);
        this.color = Color.lerp(this.startColor, this.endColor, age);

        // Update pulse phase
        this.pulsePhase += this.pulseSpeed * deltaTime;
    }

    render(ctx, camera) {
        if (!this.isAlive || this.size <= 0) return;

        const screenPos = camera.worldToScreen(this.position);
        const screenSize = this.size * camera.zoom;

        if (screenSize < 0.5) return;

        ctx.save();

        // Set blend mode
        if (this.blendMode === 'additive') {
            ctx.globalCompositeOperation = 'lighter';
        }

        // Set glow effect
        if (this.glow) {
            ctx.shadowColor = this.color.toString();
            ctx.shadowBlur = screenSize * 2;
        }

        ctx.globalAlpha = this.color.a;
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(this.rotation);

        // Render based on type
        this.renderByType(ctx, screenSize);

        ctx.restore();
    }

    renderByType(ctx, size) {
        switch (this.type) {
            case 'circle':
                this.renderCircle(ctx, size);
                break;
            case 'star':
                this.renderStar(ctx, size);
                break;
            case 'square':
                this.renderSquare(ctx, size);
                break;
            case 'diamond':
                this.renderDiamond(ctx, size);
                break;
            case 'spark':
                this.renderSpark(ctx, size);
                break;
            case 'energy':
                this.renderEnergy(ctx, size);
                break;
            case 'chrono':
                this.renderChrono(ctx, size);
                break;
            default:
                this.renderCircle(ctx, size);
        }
    }

    renderCircle(ctx, size) {
        ctx.fillStyle = this.color.toString();
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
    }

    renderStar(ctx, size) {
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size * 0.4;

        ctx.fillStyle = this.color.toString();
        ctx.beginPath();
        
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
    }

    renderSquare(ctx, size) {
        ctx.fillStyle = this.color.toString();
        ctx.fillRect(-size, -size, size * 2, size * 2);
    }

    renderDiamond(ctx, size) {
        ctx.fillStyle = this.color.toString();
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.fill();
    }

    renderSpark(ctx, size) {
        const length = size * 2;
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = Math.max(1, size * 0.3);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-length / 2, 0);
        ctx.lineTo(length / 2, 0);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -length / 2);
        ctx.lineTo(0, length / 2);
        ctx.stroke();
    }

    renderEnergy(ctx, size) {
        const pulseSize = size * (1 + Math.sin(this.pulsePhase) * 0.3);
        
        // Outer glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize);
        gradient.addColorStop(0, this.color.toString());
        gradient.addColorStop(0.7, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a * 0.5})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
        ctx.fill();
    }

    renderChrono(ctx, size) {
        // Temporal distortion effect
        const rings = 3;
        for (let i = 0; i < rings; i++) {
            const ringSize = size * (1 + i * 0.3);
            const alpha = this.color.a * (1 - i * 0.3);
            const phase = this.pulsePhase + i * Math.PI / 3;
            const pulseRadius = ringSize * (1 + Math.sin(phase) * 0.2);
            
            ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
            ctx.lineWidth = Math.max(1, size * 0.2);
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = phase * 10;
            ctx.beginPath();
            ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = GameConstants.MAX_PARTICLES;
        this.emitters = [];
    }

    update(deltaTime) {
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.isAlive;
        });

        // Update emitters
        this.emitters = this.emitters.filter(emitter => {
            emitter.update(deltaTime);
            return emitter.isAlive;
        });

        // Limit particle count
        if (this.particles.length > this.maxParticles) {
            const excess = this.particles.length - this.maxParticles;
            this.particles.splice(0, excess);
        }
    }

    render(ctx, camera) {
        // Sort particles by type for optimal rendering
        const sortedParticles = [...this.particles].sort((a, b) => {
            if (a.blendMode === 'additive' && b.blendMode !== 'additive') return 1;
            if (a.blendMode !== 'additive' && b.blendMode === 'additive') return -1;
            return 0;
        });

        sortedParticles.forEach(particle => {
            particle.render(ctx, camera);
        });
    }

    addParticle(particle) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push(particle);
        }
    }

    createParticle(x, y, config = {}) {
        const particle = new Particle(x, y, config.type || 'circle');
        
        // Apply configuration
        Object.assign(particle, config);
        
        this.addParticle(particle);
        return particle;
    }

    // Pre-built effect creators
    createExplosion(position, type = 'default', count = 15, config = {}) {
        const colors = this.getColorsForType(type);
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + MathUtils.random(-0.2, 0.2);
            const speed = MathUtils.random(50, 150);
            const velocity = Vector2.fromAngle(angle, speed);
            
            const particle = this.createParticle(position.x, position.y, {
                type: MathUtils.randomChoice(['circle', 'star', 'diamond']),
                velocity: velocity,
                life: MathUtils.random(800, 1500),
                maxLife: MathUtils.random(800, 1500),
                startSize: MathUtils.random(3, 8),
                endSize: 0,
                startColor: MathUtils.randomChoice(colors),
                endColor: new Color(colors[0].r, colors[0].g, colors[0].b, 0),
                friction: 0.95,
                gravity: new Vector2(0, 30),
                blendMode: 'additive',
                glow: true,
                rotationSpeed: MathUtils.random(-5, 5),
                ...config
            });
        }
    }

    createConsumptionEffect(position, targetPosition, color, mass) {
        const particleCount = Math.min(20, Math.floor(mass / 10));
        
        for (let i = 0; i < particleCount; i++) {
            const startOffset = Vector2.fromAngle(Math.random() * Math.PI * 2, MathUtils.random(10, 30));
            const startPos = Vector2.add(position, startOffset);
            const direction = Vector2.normalize(Vector2.subtract(targetPosition, startPos));
            const speed = MathUtils.random(100, 200);
            
            this.createParticle(startPos.x, startPos.y, {
                type: 'energy',
                velocity: Vector2.multiply(direction, speed),
                life: MathUtils.random(500, 800),
                maxLife: 800,
                startSize: MathUtils.random(2, 5),
                endSize: 0,
                startColor: color,
                endColor: new Color(color.r, color.g, color.b, 0),
                friction: 0.98,
                blendMode: 'additive',
                glow: true,
                pulseSpeed: 0.02
            });
        }
    }

    createSpiral(position, type = 'default', count = 12) {
        const colors = this.getColorsForType(type);
        const spiralTurns = 2;
        
        for (let i = 0; i < count; i++) {
            const progress = i / count;
            const angle = progress * Math.PI * 2 * spiralTurns;
            const radius = progress * 50;
            const spiralPos = Vector2.add(position, Vector2.fromAngle(angle, radius));
            const velocity = Vector2.fromAngle(angle + Math.PI / 2, 100);
            
            this.createParticle(spiralPos.x, spiralPos.y, {
                type: 'chrono',
                velocity: velocity,
                life: MathUtils.random(1000, 1500),
                maxLife: 1500,
                startSize: MathUtils.random(3, 6),
                endSize: 0,
                startColor: MathUtils.randomChoice(colors),
                endColor: new Color(colors[0].r, colors[0].g, colors[0].b, 0),
                friction: 0.95,
                blendMode: 'additive',
                glow: true,
                pulseSpeed: 0.015
            });
        }
    }

    createTimeDistortion(position, type = 'rewind', count = 20) {
        const colors = this.getColorsForType(type);
        
        // Central implosion effect
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const startRadius = MathUtils.random(80, 120);
            const startPos = Vector2.add(position, Vector2.fromAngle(angle, startRadius));
            const velocity = Vector2.multiply(Vector2.normalize(Vector2.subtract(position, startPos)), 150);
            
            this.createParticle(startPos.x, startPos.y, {
                type: 'chrono',
                velocity: velocity,
                life: MathUtils.random(1000, 1500),
                maxLife: 1500,
                startSize: MathUtils.random(4, 8),
                endSize: 0,
                startColor: MathUtils.randomChoice(colors),
                endColor: new Color(colors[0].r, colors[0].g, colors[0].b, 0),
                friction: 0.92,
                blendMode: 'additive',
                glow: true,
                pulseSpeed: 0.03
            });
        }

        // Expanding rings
        for (let ring = 0; ring < 3; ring++) {
            setTimeout(() => {
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const velocity = Vector2.fromAngle(angle, 80);
                    
                    this.createParticle(position.x, position.y, {
                        type: 'chrono',
                        velocity: velocity,
                        life: 2000,
                        maxLife: 2000,
                        startSize: 6,
                        endSize: 0,
                        startColor: colors[0],
                        endColor: new Color(colors[0].r, colors[0].g, colors[0].b, 0),
                        friction: 0.96,
                        blendMode: 'additive',
                        glow: true
                    });
                }
            }, ring * 100);
        }
    }

    createTrail(startPos, endPos, color, intensity = 1) {
        const distance = Vector2.distance(startPos, endPos);
        const particleCount = Math.floor(distance / 10) * intensity;
        
        for (let i = 0; i < particleCount; i++) {
            const progress = i / particleCount;
            const pos = Vector2.lerp(startPos, endPos, progress);
            const perpendicular = Vector2.fromAngle(Math.random() * Math.PI * 2, MathUtils.random(2, 8));
            const finalPos = Vector2.add(pos, perpendicular);
            
            this.createParticle(finalPos.x, finalPos.y, {
                type: 'circle',
                velocity: Vector2.multiply(perpendicular, 0.5),
                life: MathUtils.random(300, 600),
                maxLife: 600,
                startSize: MathUtils.random(1, 3),
                endSize: 0,
                startColor: color,
                endColor: new Color(color.r, color.g, color.b, 0),
                friction: 0.98,
                blendMode: 'additive'
            });
        }
    }

    createAmbientEffect(position, type = 'matter') {
        if (Math.random() < 0.1) { // 10% chance per call
            const colors = this.getColorsForType(type);
            const offset = Vector2.fromAngle(Math.random() * Math.PI * 2, MathUtils.random(5, 15));
            const pos = Vector2.add(position, offset);
            
            this.createParticle(pos.x, pos.y, {
                type: 'energy',
                velocity: Vector2.fromAngle(Math.random() * Math.PI * 2, MathUtils.random(10, 30)),
                life: MathUtils.random(2000, 3000),
                maxLife: 3000,
                startSize: MathUtils.random(1, 3),
                endSize: 0,
                startColor: MathUtils.randomChoice(colors),
                endColor: new Color(colors[0].r, colors[0].g, colors[0].b, 0),
                friction: 0.99,
                blendMode: 'additive',
                pulseSpeed: 0.005
            });
        }
    }

    createDeathExplosion(position, color, mass) {
        const particleCount = Math.min(50, Math.floor(mass / 5));
        
        // Main explosion
        this.createExplosion(position, 'death', particleCount, {
            startColor: color,
            endColor: new Color(255, 100, 100, 0)
        });
        
        // Shockwave
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const velocity = Vector2.fromAngle(angle, 200);
            
            this.createParticle(position.x, position.y, {
                type: 'spark',
                velocity: velocity,
                life: 1000,
                maxLife: 1000,
                startSize: 8,
                endSize: 0,
                startColor: new Color(255, 255, 255, 1),
                endColor: new Color(255, 100, 100, 0),
                friction: 0.95,
                blendMode: 'additive',
                glow: true,
                rotationSpeed: 10
            });
        }
    }

    getColorsForType(type) {
        switch (type) {
            case 'stasis':
                return [
                    new Color(0, 255, 255, 1),
                    new Color(100, 255, 255, 1),
                    new Color(0, 200, 255, 1)
                ];
            case 'echo':
                return [
                    new Color(255, 0, 255, 1),
                    new Color(255, 100, 255, 1),
                    new Color(200, 0, 255, 1)
                ];
            case 'rewind':
                return [
                    new Color(255, 255, 0, 1),
                    new Color(255, 200, 0, 1),
                    new Color(255, 255, 100, 1)
                ];
            case 'matter':
                return [
                    new Color(0, 255, 255, 1),
                    new Color(100, 255, 200, 1),
                    new Color(0, 200, 255, 1)
                ];
            case 'death':
                return [
                    new Color(255, 100, 100, 1),
                    new Color(255, 0, 0, 1),
                    new Color(255, 150, 150, 1)
                ];
            default:
                return [
                    new Color(255, 255, 255, 1),
                    new Color(200, 200, 255, 1),
                    new Color(255, 200, 255, 1)
                ];
        }
    }

    clear() {
        this.particles = [];
        this.emitters = [];
    }

    getParticleCount() {
        return this.particles.length;
    }

    setMaxParticles(max) {
        this.maxParticles = max;
        // If we currently have more particles than the new limit, remove excess
        if (this.particles.length > this.maxParticles) {
            const excess = this.particles.length - this.maxParticles;
            this.particles.splice(0, excess);
        }
    }
}

class ParticleEmitter {
    constructor(x, y, config = {}) {
        this.position = new Vector2(x, y);
        this.isAlive = true;
        this.age = 0;
        this.duration = config.duration || Infinity;
        this.emissionRate = config.emissionRate || 10; // particles per second
        this.lastEmission = 0;
        this.particleConfig = config.particleConfig || {};
        this.emissionPattern = config.pattern || 'constant';
        this.burstCount = config.burstCount || 5;
        this.burstInterval = config.burstInterval || 500;
        this.lastBurst = 0;
    }

    update(deltaTime) {
        this.age += deltaTime;
        
        if (this.age >= this.duration) {
            this.isAlive = false;
            return;
        }

        const now = Date.now();
        
        switch (this.emissionPattern) {
            case 'constant':
                this.emitConstant(now, deltaTime);
                break;
            case 'burst':
                this.emitBurst(now);
                break;
            case 'pulse':
                this.emitPulse(now, deltaTime);
                break;
        }
    }

    emitConstant(now, deltaTime) {
        const emissionInterval = 1000 / this.emissionRate;
        
        if (now - this.lastEmission >= emissionInterval) {
            this.emitParticle();
            this.lastEmission = now;
        }
    }

    emitBurst(now) {
        if (now - this.lastBurst >= this.burstInterval) {
            for (let i = 0; i < this.burstCount; i++) {
                this.emitParticle();
            }
            this.lastBurst = now;
        }
    }

    emitPulse(now, deltaTime) {
        const pulsePhase = Math.sin(this.age * 0.005);
        if (pulsePhase > 0.8) {
            this.emitConstant(now, deltaTime);
        }
    }

    emitParticle() {
        if (window.particleSystem) {
            const particle = window.particleSystem.createParticle(
                this.position.x, 
                this.position.y, 
                this.particleConfig
            );
        }
    }
}

// Initialize global particle system
if (typeof window !== 'undefined') {
    window.particleSystem = new ParticleSystem();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Particle,
        ParticleSystem,
        ParticleEmitter
    };
}