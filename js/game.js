// Game Engine for Chrono-Swarm
// Main game loop, world management, and game logic orchestration

class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.position = new Vector2(0, 0);
        this.zoom = 1;
        this.targetZoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 2;
        this.smoothing = GameConstants.CAMERA_SMOOTH;
        this.zoomSmoothing = GameConstants.ZOOM_SMOOTH;
        this.shakeAmount = 0;
        this.shakeDecay = 0.9;
        this.shakeOffset = new Vector2(0, 0);
    }

    update(deltaTime) {
        // Smooth zoom
        this.zoom = MathUtils.lerp(this.zoom, this.targetZoom, this.zoomSmoothing);

        // Screen shake
        if (this.shakeAmount > 0) {
            this.shakeOffset.x = (Math.random() - 0.5) * this.shakeAmount;
            this.shakeOffset.y = (Math.random() - 0.5) * this.shakeAmount;
            this.shakeAmount *= this.shakeDecay;
            
            if (this.shakeAmount < 0.1) {
                this.shakeAmount = 0;
                this.shakeOffset.x = 0;
                this.shakeOffset.y = 0;
            }
        }
    }

    followPlayer(player) {
        if (!player || player.cells.length === 0) return;

        const targetPosition = player.getCenterPosition();
        this.position = Vector2.lerp(this.position, targetPosition, this.smoothing);

        // Dynamic zoom based on player size
        const playerMass = player.getTotalMass();
        const baseZoom = Math.max(this.minZoom, Math.min(this.maxZoom, 100 / Math.sqrt(playerMass)));
        this.targetZoom = baseZoom;
    }

    worldToScreen(worldPos) {
        const screenCenter = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
        const relative = Vector2.subtract(worldPos, this.position);
        const scaled = Vector2.multiply(relative, this.zoom);
        return Vector2.add(screenCenter, Vector2.add(scaled, this.shakeOffset));
    }

    screenToWorld(screenPos) {
        const screenCenter = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
        const relative = Vector2.subtract(screenPos, screenCenter);
        const scaled = Vector2.multiply(relative, 1 / this.zoom);
        return Vector2.add(this.position, scaled);
    }

    shake(intensity) {
        this.shakeAmount = Math.max(this.shakeAmount, intensity);
    }

    setZoom(zoom) {
        this.targetZoom = MathUtils.clamp(zoom, this.minZoom, this.maxZoom);
    }

    isInView(position, radius) {
        const screenPos = this.worldToScreen(position);
        const screenRadius = radius * this.zoom;
        
        return screenPos.x + screenRadius > 0 &&
               screenPos.x - screenRadius < this.canvas.width &&
               screenPos.y + screenRadius > 0 &&
               screenPos.y - screenRadius < this.canvas.height;
    }
}

class Player {
    constructor(name, color, isAI = false) {
        this.id = GameUtils.generateId();
        this.name = name;
        this.color = color;
        this.cells = [];
        this.isAI = isAI;
        this.isAlive = true;
        this.score = 0;
        this.kills = 0;
        this.survivalTime = 0;
        this.rank = 0;
        this.level = 1;
        this.formation = 'default';
        
        // Movement history for rewind ability
        this.movementHistory = [];
        this.maxHistoryLength = 100; // Store 100 position snapshots
        this.historyInterval = 50; // Record every 50ms
        this.lastHistoryRecord = 0;

        // Initialize with starting cell
        this.spawn();
    }

    spawn() {
        this.isAlive = true;
        this.cells = [];
        
        // Random spawn position within arena
        const spawnX = MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING);
        const spawnY = MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING);
        
        const startCell = new Cell(spawnX, spawnY, GameConstants.INITIAL_MASS, this.color, this);
        this.cells.push(startCell);
        
        this.survivalTime = 0;
        this.score = GameConstants.INITIAL_MASS;
    }

    update(deltaTime, mousePosition = null) {
        if (!this.isAlive) return;

        this.survivalTime += deltaTime;

        // Record movement history
        this.recordMovementHistory();

        // Update all cells
        this.cells = this.cells.filter(cell => {
            cell.update(deltaTime);
            return cell.isAlive;
        });

        // Check if player is dead (no cells left)
        if (this.cells.length === 0) {
            this.die();
            return;
        }

        // Handle movement
        if (mousePosition) {
            this.moveTowards(mousePosition, deltaTime);
        }

        // Handle cell recombination
        this.handleRecombination();

        // Update formation
        this.updateFormation(deltaTime);

        // Update score
        this.score = this.getTotalMass();
    }

    recordMovementHistory() {
        const now = Date.now();
        if (now - this.lastHistoryRecord < this.historyInterval) return;

        const snapshot = {
            time: now,
            cells: this.cells.map(cell => ({
                position: cell.position.clone(),
                mass: cell.mass,
                velocity: cell.velocity.clone()
            }))
        };

        this.movementHistory.push(snapshot);
        
        if (this.movementHistory.length > this.maxHistoryLength) {
            this.movementHistory.shift();
        }

        this.lastHistoryRecord = now;
    }

    moveTowards(targetPosition, deltaTime) {
        const playerCenter = this.getCenterPosition();
        const direction = Vector2.subtract(targetPosition, playerCenter);
        const distance = Vector2.magnitude(direction);

        if (distance < 5) return; // Too close, don't move

        const normalizedDirection = Vector2.normalize(direction);

        this.cells.forEach(cell => {
            const speed = GameUtils.calculateSpeed(cell.mass);
            
            // Apply stasis field slowdown if present
            let slowFactor = 1;
            if (window.abilityManager) {
                slowFactor = window.abilityManager.getStasisSlowFactor(cell, this.id);
            }

            const velocity = Vector2.multiply(normalizedDirection, speed * slowFactor);
            cell.velocity = Vector2.add(cell.velocity, Vector2.multiply(velocity, deltaTime / 1000));
        });
    }

    handleRecombination() {
        for (let i = 0; i < this.cells.length; i++) {
            for (let j = i + 1; j < this.cells.length; j++) {
                const cell1 = this.cells[i];
                const cell2 = this.cells[j];

                if (cell1.canCombineWith(cell2)) {
                    cell1.combineWith(cell2);
                    this.cells.splice(j, 1);
                    j--; // Adjust index after removal
                    
                    // Play combination sound
                    if (window.audioSystem) {
                        window.audioSystem.playGameSound('recombine');
                    }
                    
                    break; // Only combine one pair per frame
                }
            }
        }
    }

    updateFormation(deltaTime) {
        if (this.cells.length <= 1 || this.formation === 'default') return;

        const center = this.getCenterPosition();
        const formations = {
            'pinwheel': this.updatePinwheelFormation,
            'phalanx': this.updatePhalanxFormation,
            'grid': this.updateGridFormation,
            'orbit': this.updateOrbitFormation
        };

        const formationHandler = formations[this.formation];
        if (formationHandler) {
            formationHandler.call(this, center, deltaTime);
        }
    }

    updatePinwheelFormation(center, deltaTime) {
        this.cells.forEach((cell, index) => {
            const angle = (index / this.cells.length) * Math.PI * 2 + Date.now() * 0.001;
            const radius = 50;
            const targetPos = Vector2.add(center, Vector2.fromAngle(angle, radius));
            const direction = Vector2.subtract(targetPos, cell.position);
            cell.velocity = Vector2.add(cell.velocity, Vector2.multiply(direction, 0.02));
        });
    }

    updatePhalanxFormation(center, deltaTime) {
        const columns = Math.ceil(Math.sqrt(this.cells.length));
        const spacing = 40;

        this.cells.forEach((cell, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const offset = new Vector2(
                (col - columns / 2) * spacing,
                (row - Math.floor(this.cells.length / columns) / 2) * spacing
            );
            const targetPos = Vector2.add(center, offset);
            const direction = Vector2.subtract(targetPos, cell.position);
            cell.velocity = Vector2.add(cell.velocity, Vector2.multiply(direction, 0.02));
        });
    }

    updateGridFormation(center, deltaTime) {
        const gridSize = Math.ceil(Math.sqrt(this.cells.length));
        const spacing = 35;

        this.cells.forEach((cell, index) => {
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            const offset = new Vector2(
                (col - gridSize / 2) * spacing,
                (row - gridSize / 2) * spacing
            );
            const targetPos = Vector2.add(center, offset);
            const direction = Vector2.subtract(targetPos, cell.position);
            cell.velocity = Vector2.add(cell.velocity, Vector2.multiply(direction, 0.03));
        });
    }

    updateOrbitFormation(center, deltaTime) {
        this.cells.forEach((cell, index) => {
            const baseAngle = (index / this.cells.length) * Math.PI * 2;
            const orbitSpeed = 0.5 + index * 0.1;
            const angle = baseAngle + Date.now() * 0.001 * orbitSpeed;
            const radius = 30 + index * 15;
            const targetPos = Vector2.add(center, Vector2.fromAngle(angle, radius));
            const direction = Vector2.subtract(targetPos, cell.position);
            cell.velocity = Vector2.add(cell.velocity, Vector2.multiply(direction, 0.02));
        });
    }

    split(direction) {
        if (this.cells.length >= GameConstants.MAX_CELLS) return false;

        // Find largest cell to split
        let largestCell = null;
        let largestMass = 0;

        for (const cell of this.cells) {
            if (cell.mass > largestMass && cell.mass >= GameConstants.MIN_SPLIT_MASS * 2) {
                largestCell = cell;
                largestMass = cell.mass;
            }
        }

        if (!largestCell) return false;

        const newCell = largestCell.split(direction);
        if (newCell) {
            this.cells.push(newCell);
            
            // Play split sound
            if (window.audioSystem) {
                window.audioSystem.playGameSound('split');
            }
            
            // Create split effect
            if (window.particleSystem) {
                window.particleSystem.createExplosion(largestCell.position, 'default', 8);
            }

            return true;
        }

        return false;
    }

    ejectMass(direction) {
        // Find cell with most mass to eject from
        let bestCell = null;
        let maxMass = 0;

        for (const cell of this.cells) {
            if (cell.mass > maxMass && cell.mass > GameConstants.EJECT_MASS_AMOUNT) {
                bestCell = cell;
                maxMass = cell.mass;
            }
        }

        if (!bestCell) return null;

        const ejectedMass = bestCell.ejectMass(direction);
        
        if (ejectedMass && window.audioSystem) {
            window.audioSystem.playGameSound('eject');
        }

        return ejectedMass;
    }

    consumeMassForAbility(amount) {
        const totalMass = this.getTotalMass();
        if (totalMass <= amount) return false;

        const ratio = amount / totalMass;
        
        this.cells.forEach(cell => {
            cell.mass *= (1 - ratio);
            cell.radius = GameUtils.calculateMassRadius(cell.mass);
        });

        return true;
    }

    rewindToTime(milliseconds) {
        const targetTime = Date.now() - milliseconds;
        
        // Find closest snapshot to target time
        let closestSnapshot = null;
        let closestDiff = Infinity;

        for (const snapshot of this.movementHistory) {
            const diff = Math.abs(snapshot.time - targetTime);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestSnapshot = snapshot;
            }
        }

        if (!closestSnapshot) return false;

        // Restore positions and states
        this.cells = [];
        closestSnapshot.cells.forEach(cellData => {
            const cell = new Cell(
                cellData.position.x,
                cellData.position.y,
                cellData.mass,
                this.color,
                this
            );
            cell.velocity = cellData.velocity.clone();
            this.cells.push(cell);
        });

        return true;
    }

    canConsume(otherCell) {
        for (const myCell of this.cells) {
            if (GameUtils.canConsume(myCell.mass, otherCell.mass)) {
                const distance = Vector2.distance(myCell.position, otherCell.position);
                if (distance < myCell.radius + otherCell.radius) {
                    return myCell;
                }
            }
        }
        return null;
    }

    consumeCell(consumingCell, targetCell) {
        const gainedMass = GameUtils.calculateConsumptionGain(targetCell.mass);
        consumingCell.mass += gainedMass;
        consumingCell.radius = GameUtils.calculateMassRadius(consumingCell.mass);
        
        this.kills++;
        
        // Visual and audio feedback
        if (window.particleSystem) {
            window.particleSystem.createConsumptionEffect(
                targetCell.position,
                consumingCell.position,
                targetCell.color,
                targetCell.mass
            );
        }

        if (window.audioSystem) {
            window.audioSystem.playGameSound('consume_player');
        }

        // Camera shake
        if (window.game && window.game.camera) {
            window.game.camera.shake(5);
        }
    }

    getTotalMass() {
        return this.cells.reduce((total, cell) => total + cell.mass, 0);
    }

    getCenterPosition() {
        if (this.cells.length === 0) return new Vector2(0, 0);

        let totalMass = 0;
        let weightedPos = new Vector2(0, 0);

        this.cells.forEach(cell => {
            weightedPos = Vector2.add(weightedPos, Vector2.multiply(cell.position, cell.mass));
            totalMass += cell.mass;
        });

        return Vector2.multiply(weightedPos, 1 / totalMass);
    }

    die() {
        this.isAlive = false;
        
        // Create death explosion
        if (window.particleSystem && this.cells.length > 0) {
            const center = this.getCenterPosition();
            window.particleSystem.createDeathExplosion(center, this.color, this.getTotalMass());
        }

        if (window.audioSystem) {
            window.audioSystem.playGameSound('death');
        }

        // Camera shake for player death
        if (!this.isAI && window.game && window.game.camera) {
            window.game.camera.shake(15);
        }
    }

    render(ctx, camera) {
        if (!this.isAlive) return;

        this.cells.forEach(cell => {
            cell.render(ctx, camera);
        });

        // Render player name
        if (this.cells.length > 0) {
            const center = this.getCenterPosition();
            const screenPos = camera.worldToScreen(center);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, screenPos.x, screenPos.y - 40);
        }
    }
}

class AIPlayer extends Player {
    constructor(name, color) {
        super(name, color, true);
        this.state = 'wandering';
        this.target = null;
        this.stateTimer = 0;
        this.decisionInterval = 1000; // Make decisions every second
        this.lastDecision = 0;
        this.avoidanceRadius = 100;
        this.huntRadius = 200;
        this.fleeRadius = 150;
    }

    update(deltaTime, gameEntities) {
        if (!this.isAlive) return;

        super.update(deltaTime);

        // AI decision making
        this.updateAI(deltaTime, gameEntities);
    }

    updateAI(deltaTime, gameEntities) {
        this.stateTimer += deltaTime;

        const now = Date.now();
        if (now - this.lastDecision < this.decisionInterval) return;

        this.lastDecision = now;

        // Analyze surroundings
        const threats = this.findThreats(gameEntities.players);
        const prey = this.findPrey(gameEntities.players);
        const food = this.findNearbyFood(gameEntities.chronoMatter);
        const rifts = gameEntities.temporalRifts;

        // State machine
        switch (this.state) {
            case 'wandering':
                this.handleWandering(threats, prey, food, rifts);
                break;
            case 'hunting':
                this.handleHunting(threats, prey, food, rifts);
                break;
            case 'fleeing':
                this.handleFleeing(threats, food, rifts);
                break;
            case 'feeding':
                this.handleFeeding(threats, prey, food, rifts);
                break;
        }

        // Execute movement based on current target
        if (this.target) {
            this.moveTowards(this.target, deltaTime);
        }
    }

    findThreats(players) {
        const threats = [];
        const myPosition = this.getCenterPosition();
        const myMass = this.getTotalMass();

        for (const player of players) {
            if (player === this || !player.isAlive) continue;

            const distance = Vector2.distance(myPosition, player.getCenterPosition());
            const theirMass = player.getTotalMass();

            if (distance < this.fleeRadius && theirMass > myMass * 1.2) {
                threats.push({
                    player: player,
                    distance: distance,
                    priority: (theirMass / myMass) / distance
                });
            }
        }

        return threats.sort((a, b) => b.priority - a.priority);
    }

    findPrey(players) {
        const prey = [];
        const myPosition = this.getCenterPosition();
        const myMass = this.getTotalMass();

        for (const player of players) {
            if (player === this || !player.isAlive) continue;

            const distance = Vector2.distance(myPosition, player.getCenterPosition());
            const theirMass = player.getTotalMass();

            if (distance < this.huntRadius && myMass > theirMass * 1.15) {
                prey.push({
                    player: player,
                    distance: distance,
                    priority: (theirMass / distance)
                });
            }
        }

        return prey.sort((a, b) => b.priority - a.priority);
    }

    findNearbyFood(chronoMatter) {
        const food = [];
        const myPosition = this.getCenterPosition();

        for (const matter of chronoMatter) {
            const distance = Vector2.distance(myPosition, matter.position);
            
            if (distance < 300) { // Look for food within 300 units
                food.push({
                    matter: matter,
                    distance: distance,
                    priority: 1 / distance
                });
            }
        }

        return food.sort((a, b) => b.priority - a.priority);
    }

    handleWandering(threats, prey, food, rifts) {
        // Check for immediate threats
        if (threats.length > 0) {
            this.state = 'fleeing';
            this.target = this.calculateFleePosition(threats);
            return;
        }

        // Look for hunting opportunities
        if (prey.length > 0 && this.getTotalMass() > 150) {
            this.state = 'hunting';
            this.target = prey[0].player.getCenterPosition();
            return;
        }

        // Look for food
        if (food.length > 0) {
            this.state = 'feeding';
            this.target = food[0].matter.position;
            return;
        }

        // Random wandering
        if (this.stateTimer > 3000 || !this.target) {
            this.target = this.generateRandomTarget();
            this.stateTimer = 0;
        }
    }

    handleHunting(threats, prey, food, rifts) {
        // Check for threats first
        if (threats.length > 0) {
            this.state = 'fleeing';
            this.target = this.calculateFleePosition(threats);
            return;
        }

        // Continue hunting if target is still valid
        if (prey.length > 0) {
            this.target = prey[0].player.getCenterPosition();
            
            // Try to split if close enough for a kill
            const distance = Vector2.distance(this.getCenterPosition(), this.target);
            if (distance < 100 && this.cells.length < 4) {
                const direction = Vector2.subtract(this.target, this.getCenterPosition());
                this.split(direction);
            }
        } else {
            // No more prey, go back to wandering
            this.state = 'wandering';
            this.stateTimer = 0;
        }
    }

    handleFleeing(threats, food, rifts) {
        if (threats.length > 0) {
            this.target = this.calculateFleePosition(threats);
            
            // Try to split away from danger
            if (this.cells.length < 3 && this.getTotalMass() > 200) {
                const fleeDirection = Vector2.subtract(this.target, this.getCenterPosition());
                this.split(fleeDirection);
            }
        } else {
            // No more threats, go back to feeding or wandering
            if (food.length > 0) {
                this.state = 'feeding';
                this.target = food[0].matter.position;
            } else {
                this.state = 'wandering';
                this.target = this.generateRandomTarget();
            }
            this.stateTimer = 0;
        }
    }

    handleFeeding(threats, prey, food, rifts) {
        // Check for threats
        if (threats.length > 0) {
            this.state = 'fleeing';
            this.target = this.calculateFleePosition(threats);
            return;
        }

        // Continue feeding
        if (food.length > 0) {
            this.target = food[0].matter.position;
        } else {
            // No more food, check for hunting or wander
            if (prey.length > 0 && this.getTotalMass() > 150) {
                this.state = 'hunting';
                this.target = prey[0].player.getCenterPosition();
            } else {
                this.state = 'wandering';
                this.target = this.generateRandomTarget();
            }
            this.stateTimer = 0;
        }
    }

    calculateFleePosition(threats) {
        const myPosition = this.getCenterPosition();
        let fleeDirection = new Vector2(0, 0);

        // Calculate average threat direction
        for (const threat of threats) {
            const threatDirection = Vector2.subtract(myPosition, threat.player.getCenterPosition());
            const normalized = Vector2.normalize(threatDirection);
            fleeDirection = Vector2.add(fleeDirection, Vector2.multiply(normalized, threat.priority));
        }

        fleeDirection = Vector2.normalize(fleeDirection);
        
        // Flee to a position far from threats
        const fleeDistance = 300;
        return Vector2.add(myPosition, Vector2.multiply(fleeDirection, fleeDistance));
    }

    generateRandomTarget() {
        const myPosition = this.getCenterPosition();
        const angle = Math.random() * Math.PI * 2;
        const distance = MathUtils.random(100, 200);
        
        let target = Vector2.add(myPosition, Vector2.fromAngle(angle, distance));
        
        // Keep within arena bounds
        target.x = MathUtils.clamp(target.x, GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING);
        target.y = MathUtils.clamp(target.y, GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING);
        
        return target;
    }
}

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.camera = new Camera(this.canvas);
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.gameTime = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        
        // Game entities
        this.player = null;
        this.aiPlayers = [];
        this.chronoMatter = [];
        this.temporalRifts = [];
        this.ejectedMass = [];
        
        // Systems
        this.abilityManager = new AbilityManager();
        this.playerProgression = null;
        
        // Input handling
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
        this.keys = new Set();
        
        // Performance monitoring
        this.lastFPSUpdate = 0;
        this.fpsUpdateInterval = 1000;
        
        this.setupCanvas();
        this.setupInputHandlers();
        this.initializeWorld();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.canvas = this.canvas;
    }

    setupInputHandlers() {
        // Mouse handling
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            this.mouse.worldX = this.camera.screenToWorld(new Vector2(this.mouse.x, this.mouse.y)).x;
            this.mouse.worldY = this.camera.screenToWorld(new Vector2(this.mouse.x, this.mouse.y)).y;
        });

        // Keyboard handling
        document.addEventListener('keydown', (e) => {
            this.keys.add(e.code);
            this.handleKeyPress(e.code);
        });

        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });

        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleKeyPress(keyCode) {
        if (!this.player || !this.player.isAlive) return;

        const mouseWorldPos = new Vector2(this.mouse.worldX, this.mouse.worldY);

        switch (keyCode) {
            case 'Space':
                // Split
                const playerCenter = this.player.getCenterPosition();
                const splitDirection = Vector2.subtract(mouseWorldPos, playerCenter);
                this.player.split(splitDirection);
                break;
                
            case 'KeyW':
                // Eject mass
                const ejectDirection = Vector2.subtract(mouseWorldPos, this.player.getCenterPosition());
                const ejected = this.player.ejectMass(ejectDirection);
                if (ejected) {
                    this.ejectedMass.push(ejected);
                }
                break;
                
            case 'KeyQ':
                // Use chrono ability
                this.abilityManager.useCurrentAbility(this.player, mouseWorldPos);
                break;
        }
    }

    initializeWorld() {
        // Create temporal rifts
        this.generateTemporalRifts();
        
        // Generate initial chrono matter
        this.generateChronoMatter();
        
        // Create AI players
        this.generateAIPlayers();
    }

    generateTemporalRifts() {
        this.temporalRifts = [];
        
        for (let i = 0; i < GameConstants.RIFT_COUNT; i++) {
            let position, attempts = 0;
            
            do {
                position = new Vector2(
                    MathUtils.random(GameConstants.ARENA_PADDING * 2, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING * 2),
                    MathUtils.random(GameConstants.ARENA_PADDING * 2, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING * 2)
                );
                attempts++;
            } while (this.isPositionTooCloseToRifts(position, 150) && attempts < 50);
            
            const radius = MathUtils.random(GameConstants.RIFT_MIN_RADIUS, GameConstants.RIFT_MAX_RADIUS);
            const rift = new TemporalRift(position.x, position.y, radius);
            this.temporalRifts.push(rift);
        }
    }

    isPositionTooCloseToRifts(position, minDistance) {
        for (const rift of this.temporalRifts) {
            if (Vector2.distance(position, rift.position) < minDistance) {
                return true;
            }
        }
        return false;
    }

    generateChronoMatter() {
        while (this.chronoMatter.length < GameConstants.MAX_MATTER_COUNT) {
            const position = new Vector2(
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING),
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING)
            );
            
            // Don't spawn too close to rifts
            if (!this.isPositionTooCloseToRifts(position, 80)) {
                this.chronoMatter.push(new ChronoMatter(position.x, position.y));
            }
        }
    }

    generateAIPlayers() {
        this.aiPlayers = [];
        
        for (let i = 0; i < GameConstants.AI_COUNT; i++) {
            const name = GameUtils.generateName();
            const color = GameUtils.getRandomPlayerColor();
            const aiPlayer = new AIPlayer(name, color);
            this.aiPlayers.push(aiPlayer);
        }
    }

    startGame(playerName) {
        // Create player
        const playerColor = GameUtils.getPlayerColor(0);
        this.player = new Player(playerName, playerColor, false);
        
        // Start game loop
        this.isRunning = true;
        this.isPaused = false;
        this.gameTime = 0;
        this.lastFrameTime = performance.now();
        
        this.gameLoop();
        
        // Show game canvas and HUD
        this.showGameUI();
        
        // Play start sound
        if (window.audioSystem) {
            window.audioSystem.playGameSound('respawn');
        }
    }

    showGameUI() {
        // Hide main menu
        document.getElementById('mainMenu').classList.add('hidden');
        
        // Show game canvas and HUD
        this.canvas.classList.remove('hidden');
        document.getElementById('gameHUD').classList.remove('hidden');
    }

    gameLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Update FPS counter
        this.updateFPS(currentTime, deltaTime);

        if (!this.isPaused) {
            this.update(deltaTime);
        }
        
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    updateFPS(currentTime, deltaTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFPSUpdate >= this.fpsUpdateInterval) {
            this.fps = (this.frameCount * 1000) / (currentTime - this.lastFPSUpdate);
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
        }
    }

    update(deltaTime) {
        this.gameTime += deltaTime;
        
        // Update player
        if (this.player && this.player.isAlive) {
            const mouseWorldPos = new Vector2(this.mouse.worldX, this.mouse.worldY);
            this.player.update(deltaTime, mouseWorldPos);
            this.camera.followPlayer(this.player);
        }
        
        // Update AI players
        const gameEntities = {
            players: [this.player, ...this.aiPlayers].filter(p => p && p.isAlive),
            chronoMatter: this.chronoMatter,
            temporalRifts: this.temporalRifts,
            ejectedMass: this.ejectedMass
        };
        
        this.aiPlayers.forEach(ai => {
            ai.update(deltaTime, gameEntities);
        });
        
        // Update camera
        this.camera.update(deltaTime);
        
        // Update abilities
        this.abilityManager.update(deltaTime);
        
        // Update world entities
        this.updateWorldEntities(deltaTime);
        
        // Handle collisions
        this.handleCollisions();
        
        // Update leaderboard
        this.updateLeaderboard();
        
        // Check win/lose conditions
        this.checkGameEnd();
        
        // Spawn new chrono matter
        this.spawnChronoMatter(deltaTime);
        
        // Update particle system
        if (window.particleSystem) {
            window.particleSystem.update(deltaTime);
        }
    }

    updateWorldEntities(deltaTime) {
        // Update temporal rifts
        this.temporalRifts.forEach(rift => rift.update(deltaTime));
        
        // Update chrono matter
        this.chronoMatter.forEach(matter => matter.update(deltaTime));
        
        // Update ejected mass
        this.ejectedMass = this.ejectedMass.filter(mass => {
            mass.update(deltaTime);
            return mass.isAlive;
        });
    }

    handleCollisions() {
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        
        // Player vs Player collisions
        for (let i = 0; i < allPlayers.length; i++) {
            for (let j = i + 1; j < allPlayers.length; j++) {
                this.checkPlayerCollision(allPlayers[i], allPlayers[j]);
            }
        }
        
        // Player vs Chrono Matter
        allPlayers.forEach(player => {
            this.checkChronoMatterCollisions(player);
        });
        
        // Player vs Ejected Mass
        allPlayers.forEach(player => {
            this.checkEjectedMassCollisions(player);
        });
        
        // Player vs Temporal Rifts
        allPlayers.forEach(player => {
            this.checkTemporalRiftCollisions(player);
        });
    }

    checkPlayerCollision(player1, player2) {
        for (const cell1 of player1.cells) {
            for (const cell2 of player2.cells) {
                const distance = Vector2.distance(cell1.position, cell2.position);
                
                if (distance < cell1.radius + cell2.radius) {
                    // Determine who consumes whom
                    if (GameUtils.canConsume(cell1.mass, cell2.mass)) {
                        player1.consumeCell(cell1, cell2);
                        player2.cells = player2.cells.filter(c => c !== cell2);
                        
                        if (player2.cells.length === 0) {
                            player2.die();
                        }
                    } else if (GameUtils.canConsume(cell2.mass, cell1.mass)) {
                        player2.consumeCell(cell2, cell1);
                        player1.cells = player1.cells.filter(c => c !== cell1);
                        
                        if (player1.cells.length === 0) {
                            player1.die();
                        }
                    }
                }
            }
        }
    }

    checkChronoMatterCollisions(player) {
        for (const cell of player.cells) {
            for (let i = this.chronoMatter.length - 1; i >= 0; i--) {
                const matter = this.chronoMatter[i];
                
                if (matter.canBeConsumedBy(cell)) {
                    const gainedMass = matter.consume();
                    cell.mass += gainedMass;
                    cell.radius = GameUtils.calculateMassRadius(cell.mass);
                    
                    this.chronoMatter.splice(i, 1);
                    
                    // Play consume sound
                    if (window.audioSystem) {
                        window.audioSystem.playGameSound('consume_matter');
                    }
                    
                    // Create particle effect
                    if (window.particleSystem) {
                        window.particleSystem.createConsumptionEffect(
                            matter.position,
                            cell.position,
                            matter.color,
                            matter.mass
                        );
                    }
                }
            }
        }
    }

    checkEjectedMassCollisions(player) {
        for (const cell of player.cells) {
            for (let i = this.ejectedMass.length - 1; i >= 0; i--) {
                const mass = this.ejectedMass[i];
                
                if (mass.canBeCollectedBy(cell)) {
                    const gainedMass = mass.collect();
                    cell.mass += gainedMass;
                    cell.radius = GameUtils.calculateMassRadius(cell.mass);
                    
                    this.ejectedMass.splice(i, 1);
                    
                    // Play collection sound
                    if (window.audioSystem) {
                        window.audioSystem.playGameSound('consume_matter', { pitch: 1.2 });
                    }
                }
            }
        }
    }

    checkTemporalRiftCollisions(player) {
        for (let cellIndex = player.cells.length - 1; cellIndex >= 0; cellIndex--) {
            const cell = player.cells[cellIndex];
            
            for (const rift of this.temporalRifts) {
                if (rift.canDamage(cell)) {
                    const shatteredCells = rift.damageCell(cell);
                    
                    // Remove original cell
                    player.cells.splice(cellIndex, 1);
                    
                    // Add shattered pieces
                    player.cells.push(...shatteredCells);
                    
                    // Play rift damage sound
                    if (window.audioSystem) {
                        window.audioSystem.playSound('rift_damage');
                    }
                    
                    // Camera shake
                    this.camera.shake(8);
                    
                    break; // Only one rift can damage per frame
                }
            }
        }
    }

    updateLeaderboard() {
        const allPlayers = [this.player, ...this.aiPlayers]
            .filter(p => p && p.isAlive)
            .sort((a, b) => b.getTotalMass() - a.getTotalMass());
        
        // Update ranks
        allPlayers.forEach((player, index) => {
            player.rank = index + 1;
        });
        
        // Update UI
        if (window.uiSystem) {
            window.uiSystem.updateLeaderboard(allPlayers.slice(0, 10));
        }
    }

    checkGameEnd() {
        if (this.player && !this.player.isAlive) {
            this.endGame();
        }
    }

    spawnChronoMatter(deltaTime) {
        const spawnChance = GameConstants.MATTER_SPAWN_RATE * (deltaTime / 1000);
        
        if (Math.random() < spawnChance && this.chronoMatter.length < GameConstants.MAX_MATTER_COUNT) {
            let attempts = 0;
            let position;
            
            do {
                position = new Vector2(
                    MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING),
                    MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING)
                );
                attempts++;
            } while (this.isPositionTooCloseToRifts(position, 50) && attempts < 20);
            
            if (attempts < 20) {
                this.chronoMatter.push(new ChronoMatter(position.x, position.y));
            }
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render background grid
        this.renderGrid();
        
        // Render arena boundary
        this.renderArenaBoundary();
        
        // Render world entities
        this.renderWorldEntities();
        
        // Render players
        this.renderPlayers();
        
        // Render abilities
        this.abilityManager.render(this.ctx, this.camera);
        
        // Render particles
        if (window.particleSystem) {
            window.particleSystem.render(this.ctx, this.camera);
        }
        
        // Render debug info
        this.renderDebugInfo();
    }

    renderGrid() {
        const gridSize = 100;
        const startX = Math.floor(-this.camera.position.x / gridSize) * gridSize;
        const startY = Math.floor(-this.camera.position.y / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.camera.zoom) + gridSize * 2;
        const endY = startY + (this.canvas.height / this.camera.zoom) + gridSize * 2;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = startX; x <= endX; x += gridSize) {
            const screenStart = this.camera.worldToScreen(new Vector2(x, startY));
            const screenEnd = this.camera.worldToScreen(new Vector2(x, endY));
            
            this.ctx.beginPath();
            this.ctx.moveTo(screenStart.x, screenStart.y);
            this.ctx.lineTo(screenEnd.x, screenEnd.y);
            this.ctx.stroke();
        }
        
        for (let y = startY; y <= endY; y += gridSize) {
            const screenStart = this.camera.worldToScreen(new Vector2(startX, y));
            const screenEnd = this.camera.worldToScreen(new Vector2(endX, y));
            
            this.ctx.beginPath();
            this.ctx.moveTo(screenStart.x, screenStart.y);
            this.ctx.lineTo(screenEnd.x, screenEnd.y);
            this.ctx.stroke();
        }
    }

    renderArenaBoundary() {
        const topLeft = this.camera.worldToScreen(new Vector2(0, 0));
        const bottomRight = this.camera.worldToScreen(new Vector2(GameConstants.ARENA_WIDTH, GameConstants.ARENA_HEIGHT));
        
        this.ctx.strokeStyle = '#ff6b6b';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 10]);
        this.ctx.strokeRect(
            topLeft.x,
            topLeft.y,
            bottomRight.x - topLeft.x,
            bottomRight.y - topLeft.y
        );
        this.ctx.setLineDash([]);
    }

    renderWorldEntities() {
        // Render chrono matter
        this.chronoMatter.forEach(matter => {
            if (this.camera.isInView(matter.position, matter.radius)) {
                matter.render(this.ctx, this.camera);
                
                // Add ambient particles
                if (window.particleSystem) {
                    window.particleSystem.createAmbientEffect(matter.position, 'matter');
                }
            }
        });
        
        // Render ejected mass
        this.ejectedMass.forEach(mass => {
            if (this.camera.isInView(mass.position, mass.radius)) {
                mass.render(this.ctx, this.camera);
            }
        });
        
        // Render temporal rifts
        this.temporalRifts.forEach(rift => {
            if (this.camera.isInView(rift.position, rift.radius * 1.5)) {
                rift.render(this.ctx, this.camera);
            }
        });
    }

    renderPlayers() {
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        
        // Sort by mass for proper rendering order (smaller on top)
        allPlayers.sort((a, b) => a.getTotalMass() - b.getTotalMass());
        
        allPlayers.forEach(player => {
            player.render(this.ctx, this.camera);
        });
    }

    renderDebugInfo() {
        if (this.keys.has('KeyF')) { // Show debug info when F is held
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(10, 10, 200, 120);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 20, 30);
            this.ctx.fillText(`Players: ${this.aiPlayers.length + 1}`, 20, 45);
            this.ctx.fillText(`Matter: ${this.chronoMatter.length}`, 20, 60);
            this.ctx.fillText(`Particles: ${window.particleSystem ? window.particleSystem.getParticleCount() : 0}`, 20, 75);
            this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}`, 20, 90);
            this.ctx.fillText(`Pos: ${this.camera.position.x.toFixed(0)}, ${this.camera.position.y.toFixed(0)}`, 20, 105);
            
            if (this.player) {
                this.ctx.fillText(`Mass: ${this.player.getTotalMass().toFixed(0)}`, 20, 120);
            }
        }
    }

    endGame() {
        this.isRunning = false;
        
        // Calculate final stats
        const finalStats = {
            mass: this.player ? this.player.getTotalMass() : 0,
            rank: this.player ? this.player.rank : 0,
            survivalTime: this.player ? this.player.survivalTime : 0,
            kills: this.player ? this.player.kills : 0
        };
        
        // Calculate XP gained
        const xpGained = GameUtils.calculateXPGain(
            finalStats.mass,
            finalStats.survivalTime / 1000,
            finalStats.kills
        );
        
        // Update progression
        if (this.playerProgression) {
            this.playerProgression.addXP(xpGained);
            this.playerProgression.updateStatistics({
                gamesPlayed: 1,
                totalSurvivalTime: finalStats.survivalTime,
                totalKills: finalStats.kills,
                bestMass: finalStats.mass,
                bestRank: finalStats.rank
            });
        }
        
        // Show death screen
        if (window.uiSystem) {
            window.uiSystem.showDeathScreen(finalStats, xpGained);
        }
        
        // Hide game UI
        this.canvas.classList.add('hidden');
        document.getElementById('gameHUD').classList.add('hidden');
    }

    respawn() {
        if (this.player) {
            this.player.spawn();
            this.startGame(this.player.name);
        }
    }

    returnToMainMenu() {
        this.isRunning = false;
        this.canvas.classList.add('hidden');
        document.getElementById('gameHUD').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
    }
}

// Initialize global game instance
if (typeof window !== 'undefined') {
    window.game = new GameEngine();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Camera,
        Player,
        AIPlayer,
        GameEngine
    };
}