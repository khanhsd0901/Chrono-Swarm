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
        
        // Calculate player movement speed for dynamic camera response
        const playerVelocity = player.cells.reduce((total, cell) => {
            return total + Vector2.magnitude(cell.velocity);
        }, 0) / player.cells.length;
        
        // Dynamic camera smoothing based on movement speed
        const dynamicSmoothing = playerVelocity > 100 ? 
            this.smoothing * 1.3 : // Faster camera when moving fast
            this.smoothing;
            
        this.position = Vector2.lerp(this.position, targetPosition, dynamicSmoothing);

        // Enhanced dynamic zoom based on player size and movement
        const playerMass = player.getTotalMass();
        const baseZoom = Math.max(this.minZoom, Math.min(this.maxZoom, 100 / Math.sqrt(playerMass)));
        
        // Slight zoom out when moving fast for better visibility
        const speedZoomFactor = playerVelocity > 80 ? 0.9 : 1;
        this.targetZoom = baseZoom * speedZoomFactor;
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

        if (distance < 1) return; // Reduced dead zone from 3 to 1 for better responsiveness

        const normalizedDirection = Vector2.normalize(direction);

        this.cells.forEach(cell => {
            const speed = GameUtils.calculateSpeed(cell.mass);
            
            // Apply stasis field slowdown if present
            let slowFactor = 1;
            if (window.abilityManager) {
                slowFactor = window.abilityManager.getStasisSlowFactor(cell, this.id);
            }
            
            // Apply event-based speed modifications
            if (this.frozenSpeedMultiplier) {
                slowFactor *= this.frozenSpeedMultiplier;
            }
            if (this.frenzySpeedBoost) {
                slowFactor *= this.frenzySpeedBoost;
            }
            
            // Apply zone-based speed modifications
            if (this.zoneSpeedMultiplier) {
                slowFactor *= this.zoneSpeedMultiplier;
            }
            
            // Enhanced movement with momentum and distance-based acceleration
            const distanceFactor = Math.min(distance / 80, 2.0); // Increased max acceleration factor
            const responsiveSpeed = speed * slowFactor * distanceFactor;
            
            // Improved velocity application for smoother movement
            const acceleration = Vector2.multiply(normalizedDirection, responsiveSpeed);
            const accelerationDelta = Vector2.multiply(acceleration, deltaTime / 1000);
            
            // Add momentum - larger cells maintain more momentum
            const momentumFactor = 1 + (cell.mass / 1000); // Larger cells have more momentum
            cell.velocity = Vector2.add(
                Vector2.multiply(cell.velocity, 0.92), // Reduced velocity retention for better responsiveness
                Vector2.multiply(accelerationDelta, momentumFactor)
            );
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
        this.decisionInterval = MathUtils.random(200, 400); // Varied decision speed for more human-like behavior
        this.lastDecision = 0;
        this.avoidanceRadius = MathUtils.random(100, 150); // Varied awareness
        this.huntRadius = MathUtils.random(200, 300); // Varied hunting range
        this.fleeRadius = MathUtils.random(150, 200); // Varied flee range
        this.aggressiveness = Math.random(); // Full range personality trait
        this.explorationRadius = MathUtils.random(300, 500); // Varied exploration
        this.lastTargetChange = 0;
        this.minTargetTime = MathUtils.random(400, 800); // Varied target persistence
        
        // Enhanced personality traits
        this.patience = Math.random(); // How long they wait for opportunities
        this.riskTaking = Math.random(); // How much risk they take
        this.teamwork = Math.random(); // How likely to cooperate with other AIs
        this.adaptability = Math.random(); // How quickly they change strategies
        
        // Advanced AI traits for enhanced intelligence
        this.tacticalAwareness = Math.random(); // Understanding of battlefield tactics
        this.predictiveSkill = Math.random(); // Ability to predict player movement
        this.resourceManagement = Math.random(); // Efficiency in resource gathering
        this.abilityTiming = Math.random(); // Skill in using abilities at right time
        
        // Territorial behavior for shared workspace dynamics
        this.territoryCenter = null;
        this.territoryRadius = MathUtils.random(250, 350);
        this.territoryDefense = Math.random() * 0.4 + 0.3; // How much they defend territory
        this.lastTerritoryUpdate = 0;
        
        // Human-like behavior patterns
        this.preferredDirection = Math.random() * Math.PI * 2; // Preferred movement direction
        this.lastAbilityUse = 0;
        this.abilityUseCooldown = MathUtils.random(3000, 8000); // Varied ability usage
        this.movementStyle = Math.random(); // 0-1 for different movement patterns
        
        // Advanced tactical memory
        this.threatMemory = new Map(); // Remember dangerous players
        this.resourceMap = new Map(); // Remember good resource locations
        this.escapeRoutes = []; // Planned escape routes
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

        // Analyze surroundings with enhanced intelligence
        const threats = this.findThreats(gameEntities.players);
        const prey = this.findPrey(gameEntities.players);
        const food = this.findNearbyFood(gameEntities.chronoMatter);
        const rifts = gameEntities.temporalRifts;
        const allies = this.findAllies(gameEntities.players);

        // Zone awareness - AI now considers zone effects
        const currentZone = window.game.getPlayerZone(this);
        this.analyzeZoneStrategy(currentZone);

        // Update territory for shared workspace dynamics
        this.updateTerritory();

        // AI coordination and teamwork
        this.coordinateWithAllies(allies, threats, prey);

        // Dynamic formation changes based on situation
        this.updateFormationStrategy(threats, prey);

        // Enhanced strategic decision making
        this.makeStrategicDecisions(threats, prey, food, currentZone);

        // State machine with enhanced intelligence
        switch (this.state) {
            case 'wandering':
                this.handleWandering(threats, prey, food, rifts);
                break;
            case 'hunting':
                this.handleHunting(threats, prey, food, rifts);
                break;
            case 'fleeing':
                this.handleFleeing(threats, prey, food, rifts);
                break;
            case 'feeding':
                this.handleFeeding(threats, prey, food, rifts);
                break;
            case 'zone_controlling':
                this.handleZoneControl(threats, prey, food, rifts, currentZone);
                break;
            case 'strategic_positioning':
                this.handleStrategicPositioning(threats, prey, food, rifts);
                break;
        }

        // Execute movement based on current target with human-like behavior
        if (this.target) {
            // Add human-like imperfection and strategic decisions
            this.executeHumanLikeMovement(deltaTime, threats, prey);
        }
    }
    
    // Enhanced AI methods for better intelligence
    analyzeZoneStrategy(currentZone) {
        if (!currentZone) return;
        
        const effects = currentZone.zone.effects;
        
        // Adjust behavior based on zone
        if (effects.matterSpawnRate > 1.5) {
            this.aggressiveness += 0.1; // More aggressive in high-resource zones
        }
        
        if (effects.speedMultiplier < 1) {
            this.patience += 0.1; // More patient in slow zones
        }
        
        if (effects.voidDamage) {
            this.riskTaking -= 0.2; // Less risky in dangerous zones
        }
    }
    
    makeStrategicDecisions(threats, prey, food, currentZone) {
        const myMass = this.getTotalMass();
        const myPosition = this.getCenterPosition();
        
        // Strategic zone movement
        if (myMass < 200 && currentZone?.zone.effects.matterSpawnRate > 1.5) {
            this.state = 'zone_controlling';
            return;
        }
        
        // Predictive hunting - anticipate player movement
        if (prey.length > 0 && this.aggressiveness > 0.6) {
            const target = prey[0].player;
            const targetVelocity = target.cells.length > 0 ? target.cells[0].velocity : new Vector2(0, 0);
            const predictedPosition = Vector2.add(target.getCenterPosition(), Vector2.multiply(targetVelocity, 2));
            this.target = predictedPosition;
            this.state = 'hunting';
            return;
        }
        
        // Defensive positioning when threatened
        if (threats.length > 1 && myMass < 300) {
            this.state = 'strategic_positioning';
            return;
        }
        
        // Opportunistic feeding
        if (food.length > 3 && threats.length === 0) {
            this.state = 'feeding';
            return;
        }
    }
    
    handleZoneControl(threats, prey, food, rifts, currentZone) {
        if (!currentZone) {
            this.state = 'wandering';
            return;
        }
        
        // Stay in beneficial zones
        const zoneCenter = new Vector2(
            currentZone.zone.bounds.x + currentZone.zone.bounds.width / 2,
            currentZone.zone.bounds.y + currentZone.zone.bounds.height / 2
        );
        
        this.target = zoneCenter;
        
        // Exit zone control if threatened
        if (threats.length > 0 && threats[0].distance < 150) {
            this.state = 'fleeing';
        }
    }
    
    handleStrategicPositioning(threats, prey, food, rifts) {
        // Find safest position with escape routes
        const myPosition = this.getCenterPosition();
        const safePositions = [];
        
        // Generate potential safe positions
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 200;
            const testPos = Vector2.add(myPosition, Vector2.fromAngle(angle, distance));
            
            // Check if position is safe from threats
            let safetyScore = 1000;
            threats.forEach(threat => {
                const distToThreat = Vector2.distance(testPos, threat.player.getCenterPosition());
                safetyScore += distToThreat;
            });
            
            // Prefer positions near food
            food.forEach(f => {
                const distToFood = Vector2.distance(testPos, f.matter.position);
                safetyScore += 100 / (distToFood + 1);
            });
            
            safePositions.push({ position: testPos, safety: safetyScore });
        }
        
        // Choose safest position
        const bestPosition = safePositions.reduce((best, current) => 
            current.safety > best.safety ? current : best
        );
        
        this.target = bestPosition.position;
        
        // Switch back to normal behavior if safe
        if (threats.length === 0) {
            this.state = 'wandering';
        }
    }

    executeHumanLikeMovement(deltaTime, threats, prey) {
        // Human-like movement with occasional hesitation and strategic decisions
        const distance = Vector2.distance(this.getCenterPosition(), this.target);
        
        // Intelligent ability usage based on situation
        this.considerAbilityUsage(threats, prey);
        
        // Strategic ejecting behavior
        if (this.getTotalMass() > 300 && Math.random() < 0.02 && this.riskTaking > 0.5) {
            // Occasionally eject mass to move faster or as bait
            const ejectDirection = Vector2.subtract(this.target, this.getCenterPosition());
            this.ejectMass(Vector2.normalize(ejectDirection));
        }
        
        // Enhanced threat response with memory
        let movementModifier = 1.0;
        if (threats.length > 0) {
            const nearestThreat = threats[0];
            
            // Remember this threat
            this.threatMemory.set(nearestThreat.player.id, {
                lastSeen: Date.now(),
                dangerLevel: nearestThreat.priority,
                position: nearestThreat.player.getCenterPosition()
            });
            
            if (nearestThreat.distance < 100) {
                // Enhanced hesitation with tactical awareness
                movementModifier = 0.2 + (this.riskTaking * 0.3) + (this.tacticalAwareness * 0.2);
                
                // Smart splitting when being chased
                if (this.tacticalAwareness > 0.7 && this.getTotalMass() > 200 && Math.random() < 0.1) {
                    this.splitToEscape();
                }
            }
        }
        
        // Predictive movement - anticipate where target will be
        if (this.predictiveSkill > 0.6 && prey.length > 0) {
            const targetPlayer = prey[0].player;
            if (targetPlayer.cells.length > 0) {
                const targetVelocity = targetPlayer.cells[0].velocity;
                const predictionTime = this.predictiveSkill * 2; // Up to 2 seconds ahead
                const predictedTarget = Vector2.add(this.target, Vector2.multiply(targetVelocity, predictionTime));
                this.target = predictedTarget;
            }
        }
        
        // Occasional "mistakes" or suboptimal moves for realism (reduced for smarter AI)
        if (Math.random() < 0.02) { // Reduced from 0.05
            // Sometimes move in slightly wrong direction
            const errorAngle = (Math.random() - 0.5) * Math.PI * 0.2; // Reduced error
            const currentDirection = Vector2.subtract(this.target, this.getCenterPosition());
            const rotatedDirection = Vector2.fromAngle(
                Math.atan2(currentDirection.y, currentDirection.x) + errorAngle,
                Vector2.magnitude(currentDirection)
            );
            this.target = Vector2.add(this.getCenterPosition(), rotatedDirection);
        }
        
        this.moveTowards(this.target, deltaTime * movementModifier);
    }
    
    // Advanced AI tactical methods
    considerAbilityUsage(threats, prey) {
        const now = Date.now();
        if (now - this.lastAbilityUse < this.abilityUseCooldown) return;
        
        // Smart ability usage based on situation and AI traits
        if (this.abilityTiming > 0.7 && window.abilityManager) {
            // Use stasis field when being chased
            if (threats.length > 0 && threats[0].distance < 120 && this.getTotalMass() > 150) {
                const stasisField = window.abilityManager.abilities.find(a => a.name === 'Stasis Field');
                if (stasisField && stasisField.canUse(this)) {
                    window.abilityManager.useAbility('Stasis Field', this, threats[0].player.getCenterPosition());
                    this.lastAbilityUse = now;
                    return;
                }
            }
            
            // Use echo when hunting
            if (prey.length > 0 && prey[0].distance < 100 && this.aggressiveness > 0.8) {
                const echo = window.abilityManager.abilities.find(a => a.name === 'Echo');
                if (echo && echo.canUse(this)) {
                    window.abilityManager.useAbility('Echo', this, this.getCenterPosition());
                    this.lastAbilityUse = now;
                    return;
                }
            }
        }
    }
    
    splitToEscape() {
        // Strategic splitting to escape threats
        if (this.cells.length < GameConstants.MAX_CELLS) {
            const largestCell = this.cells.reduce((largest, cell) => 
                cell.mass > largest.mass ? cell : largest
            );
            
            if (largestCell.mass > GameConstants.MIN_SPLIT_MASS * 2) {
                this.splitCell(largestCell);
            }
        }
    }

    updateFormationStrategy(threats, prey) {
        // Change formations based on tactical situation
        if (this.cells.length >= 3) {
            if (threats.length > 0) {
                // Use phalanx formation when fleeing for protection
                this.formation = 'phalanx';
            } else if (prey.length > 0 && this.aggressiveness > 0.6) {
                // Use pinwheel formation when hunting for better coverage
                this.formation = 'pinwheel';
            } else if (this.state === 'feeding') {
                // Use grid formation when feeding for efficiency
                this.formation = 'grid';
            } else {
                // Default formation for wandering
                this.formation = Math.random() < 0.3 ? 'orbit' : 'default';
            }
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

    findAllies(players) {
        const allies = [];
        const myPosition = this.getCenterPosition();
        const myMass = this.getTotalMass();

        for (const player of players) {
            if (player === this || !player.isAlive || !player.isAI) continue;

            const distance = Vector2.distance(myPosition, player.getCenterPosition());
            const theirMass = player.getTotalMass();
            const massRatio = Math.abs(myMass - theirMass) / Math.max(myMass, theirMass);

            // Consider as ally if similar size and nearby
            if (distance < 300 && massRatio < 0.5) {
                allies.push({
                    player: player,
                    distance: distance,
                    cooperation: this.teamwork * player.teamwork // Mutual cooperation
                });
            }
        }

        return allies.sort((a, b) => b.cooperation - a.cooperation);
    }

    coordinateWithAllies(allies, threats, prey) {
        if (allies.length === 0 || this.teamwork < 0.3) return;

        const strongAllies = allies.filter(ally => ally.cooperation > 0.4);
        
        if (strongAllies.length > 0) {
            // Coordinate hunting if there are threats to player
            const humanPlayer = window.game?.player;
            if (humanPlayer && !humanPlayer.isAI && humanPlayer.isAlive) {
                const distanceToHuman = Vector2.distance(this.getCenterPosition(), humanPlayer.getCenterPosition());
                const humanMass = humanPlayer.getTotalMass();
                const myMass = this.getTotalMass();
                
                // Gang up on human player if they're getting too strong
                if (distanceToHuman < 400 && humanMass > myMass * 1.5 && this.teamwork > 0.6) {
                    this.state = 'hunting';
                    this.target = humanPlayer.getCenterPosition();
                    this.lastTargetChange = Date.now();
                    
                    // Signal other AIs to join the hunt (simplified coordination)
                    strongAllies.forEach(ally => {
                        if (Math.random() < ally.cooperation) {
                            ally.player.state = 'hunting';
                            ally.player.target = humanPlayer.getCenterPosition();
                            ally.player.lastTargetChange = Date.now();
                        }
                    });
                    return;
                }
            }
            
            // Coordinate against large threats
            const bigThreats = threats.filter(threat => threat.player.getTotalMass() > this.getTotalMass() * 2);
            if (bigThreats.length > 0 && strongAllies.length >= 2) {
                // Multiple AIs can work together to take down big players
                const target = bigThreats[0].player;
                if (Math.random() < this.teamwork * 0.5) {
                    this.state = 'hunting';
                    this.target = target.getCenterPosition();
                    this.lastTargetChange = Date.now();
                }
            }
        }
    }

    handleWandering(threats, prey, food, rifts) {
        // Check for immediate threats
        if (threats.length > 0) {
            this.state = 'fleeing';
            this.target = this.calculateFleePosition(threats);
            this.lastTargetChange = Date.now();
            return;
        }

        // Strategic hunting based on personality and situation
        if (prey.length > 0) {
            const baseAggressiveness = this.aggressiveness + (this.frenzyAggressionBoost || 0);
            const shouldHunt = this.getTotalMass() > 80 * baseAggressiveness && 
                             (this.riskTaking > 0.4 || this.getTotalMass() > prey[0].player.getTotalMass() * 1.5);
            
            if (shouldHunt) {
                this.state = 'hunting';
                this.target = prey[0].player.getCenterPosition();
                this.lastTargetChange = Date.now();
                return;
            }
        }

        // Smart food prioritization
        if (food.length > 0) {
            // Sometimes ignore food if hunting is more profitable
            const shouldFeed = this.patience > 0.3 || prey.length === 0 || this.getTotalMass() < 200;
            
            if (shouldFeed) {
                this.state = 'feeding';
                this.target = food[0].matter.position;
                this.lastTargetChange = Date.now();
                return;
            }
        }

        // Explore temporal rifts strategically
        if (rifts && rifts.length > 0 && this.riskTaking > 0.6) {
            const nearestRift = rifts.find(rift => {
                const distance = Vector2.distance(this.getCenterPosition(), rift.position);
                return distance < 400;
            });
            
            if (nearestRift) {
                this.target = nearestRift.position;
                this.lastTargetChange = Date.now();
                return;
            }
        }

        // More active wandering with personality-based patterns
        const timeSinceLastTarget = Date.now() - this.lastTargetChange;
        const wanderInterval = 1000 + (this.patience * 1500); // Patient AIs wander less frequently
        
        if (this.stateTimer > wanderInterval || !this.target || timeSinceLastTarget > 3000) {
            this.target = this.generateRandomTarget();
            this.stateTimer = 0;
            this.lastTargetChange = Date.now();
        }
        
        // Dynamic direction changes based on adaptability
        if (timeSinceLastTarget > this.minTargetTime && Math.random() < (0.2 + this.adaptability * 0.3)) {
            this.target = this.generateRandomTarget();
            this.lastTargetChange = Date.now();
        }
    }

    handleHunting(threats, prey, food, rifts) {
        // Check for threats first
        if (threats.length > 0) {
            this.state = 'fleeing';
            this.target = this.calculateFleePosition(threats);
            this.lastTargetChange = Date.now();
            return;
        }

        // Continue hunting if target is still valid
        if (prey.length > 0) {
            // Choose target based on strategy and personality
            let targetPrey = prey[0];
            
            // Smart AIs might choose easier targets or avoid risky ones
            if (this.riskTaking < 0.4 && prey.length > 1) {
                // Choose safer target (smaller and closer)
                targetPrey = prey.reduce((best, current) => {
                    const bestScore = best.player.getTotalMass() / best.distance;
                    const currentScore = current.player.getTotalMass() / current.distance;
                    return currentScore < bestScore ? current : best;
                });
            }
            
            this.target = targetPrey.player.getCenterPosition();
            const distance = Vector2.distance(this.getCenterPosition(), this.target);
            
            // Strategic splitting based on personality and situation
            const shouldSplit = distance < (100 + this.aggressiveness * 50) && 
                              this.cells.length < (4 + this.riskTaking * 4) &&
                              this.getTotalMass() > (120 + this.patience * 80);
            
            if (shouldSplit) {
                const direction = Vector2.subtract(this.target, this.getCenterPosition());
                this.split(direction);
            }
            
            // Use abilities strategically based on personality
            const now = Date.now();
            if (distance < 120 && window.abilityManager && 
                now - this.lastAbilityUse > this.abilityUseCooldown &&
                Math.random() < (0.05 + this.aggressiveness * 0.15)) {
                
                window.abilityManager.useRandomAbility(this, this.target);
                this.lastAbilityUse = now;
                this.abilityUseCooldown = MathUtils.random(2000, 6000); // Reset cooldown
            }
            
            // Occasionally feint or change tactics
            if (this.adaptability > 0.7 && Math.random() < 0.1) {
                const feintTarget = this.generateRandomTarget();
                if (Vector2.distance(this.getCenterPosition(), feintTarget) < 100) {
                    this.target = feintTarget;
                }
            }
        } else {
            // No more prey, go back to wandering
            this.state = 'wandering';
            this.stateTimer = 0;
            this.lastTargetChange = Date.now();
        }
    }

    handleFleeing(threats, prey, food, rifts) {
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
            this.lastTargetChange = Date.now();
            return;
        }

        // Continue feeding with smarter food selection
        if (food.length > 0) {
            // Choose closest food for efficiency
            this.target = food[0].matter.position;
            
            // If very close to food, look for opportunities while feeding
            const distance = Vector2.distance(this.getCenterPosition(), this.target);
            if (distance < 30 && prey.length > 0 && this.aggressiveness > 0.7) {
                this.state = 'hunting';
                this.target = prey[0].player.getCenterPosition();
                this.lastTargetChange = Date.now();
                return;
            }
        } else {
            // No more food, check for hunting or wander
            if (prey.length > 0 && this.getTotalMass() > 120 * this.aggressiveness) {
                this.state = 'hunting';
                this.target = prey[0].player.getCenterPosition();
            } else {
                this.state = 'wandering';
                this.target = this.generateRandomTarget();
            }
            this.stateTimer = 0;
            this.lastTargetChange = Date.now();
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
        
        // Human-like movement patterns based on personality and movement style
        let distance, angle;
        
        // Base movement on personality
        if (this.aggressiveness > 0.7) {
            // Aggressive AIs move in larger, bolder patterns
            distance = MathUtils.random(150, this.explorationRadius);
        } else if (this.aggressiveness < 0.3) {
            // Cautious AIs make smaller, more careful movements
            distance = MathUtils.random(80, 200);
        } else {
            // Balanced AIs have medium range movement
            distance = MathUtils.random(120, 300);
        }
        
        // Human-like directional preferences
        if (this.movementStyle < 0.3) {
            // Circular/orbital movement pattern
            this.preferredDirection += (Math.random() - 0.5) * Math.PI * 0.3;
            angle = this.preferredDirection;
        } else if (this.movementStyle < 0.6) {
            // Zigzag movement pattern
            angle = this.preferredDirection + Math.sin(Date.now() * 0.001) * Math.PI * 0.5;
        } else {
            // More random but with slight bias to preferred direction
            angle = this.preferredDirection + (Math.random() - 0.5) * Math.PI * 1.5;
            // Occasionally update preferred direction
            if (Math.random() < 0.1) {
                this.preferredDirection = Math.random() * Math.PI * 2;
            }
        }
        
        // Add some bias towards arena center to prevent edge camping
        const arenaCenter = new Vector2(GameConstants.ARENA_WIDTH / 2, GameConstants.ARENA_HEIGHT / 2);
        const distanceFromCenter = Vector2.distance(myPosition, arenaCenter);
        
        if (distanceFromCenter > GameConstants.ARENA_WIDTH * 0.35) {
            // If too far from center, bias movement towards center
            const centerDirection = Vector2.subtract(arenaCenter, myPosition);
            const centerAngle = Math.atan2(centerDirection.y, centerDirection.x);
            angle = centerAngle + (Math.random() - 0.5) * Math.PI * 0.5; // Add some randomness
        }
        
        // Human-like hesitation and course corrections
        if (Math.random() < 0.15) {
            distance *= 0.5; // Sometimes make shorter moves
        }
        
        let target = Vector2.add(myPosition, Vector2.fromAngle(angle, distance));
        
        // Keep within arena bounds
        target.x = MathUtils.clamp(target.x, GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING);
        target.y = MathUtils.clamp(target.y, GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING);
        
        return target;
    }

    updateTerritory() {
        const now = Date.now();
        if (now - this.lastTerritoryUpdate < GameConstants.TERRITORY_UPDATE_INTERVAL) {
            return;
        }

        this.lastTerritoryUpdate = now;

        const myPosition = this.getCenterPosition();
        const myMass = this.getTotalMass();

        // Check if I'm in a territory
        if (this.territoryCenter) {
            const distanceToCenter = Vector2.distance(myPosition, this.territoryCenter);
            if (distanceToCenter > this.territoryRadius) {
                // If outside territory, try to re-establish or find a new one
                this.territoryCenter = null;
                this.territoryRadius = Math.random() * 0.4 + 0.3; // Smaller radius for wandering
            }
        } else {
            // If not in a territory, try to find one
            const playersInTerritory = this.findPlayersInTerritory(this.territoryRadius);
            if (playersInTerritory.length > 0) {
                // Found a territory, establish it
                this.territoryCenter = this.getCenterPosition();
                this.territoryRadius = Math.max(this.territoryRadius, Vector2.distance(this.territoryCenter, myPosition));
            }
        }

        // If in a territory, defend it
        if (this.territoryCenter) {
            const playersInTerritory = this.findPlayersInTerritory(this.territoryRadius);
            if (playersInTerritory.length > 0) {
                // Defend the territory
                this.formation = 'phalanx'; // Strong defensive formation
                this.target = this.territoryCenter; // Move towards center
                this.lastTargetChange = Date.now();
            } else {
                // No players in territory, try to expand it
                this.territoryRadius *= 1.1; // Slightly expand territory
                this.territoryCenter = this.getCenterPosition(); // Recalculate center
            }
        }
    }

    findPlayersInTerritory(radius) {
        const playersInTerritory = [];
        const myPosition = this.getCenterPosition();

        // Access players from the game engine instance
        if (window.game && window.game.aiPlayers) {
            for (const player of window.game.aiPlayers) {
                if (player === this || !player.isAlive) continue;

                const distance = Vector2.distance(myPosition, player.getCenterPosition());
                if (distance < radius) {
                    playersInTerritory.push(player);
                }
            }
        }
        return playersInTerritory;
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
        
        // Dynamic events system
        this.lastEventTime = 0;
        this.eventCooldown = 0;
        this.activeEvents = [];
        this.chronoMatterSpawnRate = 1; // Base spawn rate for events
        
        // Zone management system for expanded map
        this.currentZones = new Map();
        this.zoneEffects = new Map();
        this.initializeZones();
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
        // Mouse handling - Enhanced for consistent tracking
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            
            // Ensure camera exists before converting coordinates
            if (this.camera) {
                const worldPos = this.camera.screenToWorld(new Vector2(this.mouse.x, this.mouse.y));
                this.mouse.worldX = worldPos.x;
                this.mouse.worldY = worldPos.y;
            }
        });

        // Add mouse enter/leave tracking to ensure consistent behavior
        this.canvas.addEventListener('mouseenter', (e) => {
            this.mouseInCanvas = true;
        });
        
        this.canvas.addEventListener('mouseleave', (e) => {
            this.mouseInCanvas = false;
        });
        
        // Initialize mouse tracking state
        this.mouseInCanvas = false;

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
        this.gameStartTime = Date.now(); // Initialize for dynamic events
        
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
            // Only update mouse position if mouse is in canvas and we have valid coordinates
            if (this.mouseInCanvas && this.mouse.worldX !== undefined && this.mouse.worldY !== undefined) {
                const mouseWorldPos = new Vector2(this.mouse.worldX, this.mouse.worldY);
                this.player.update(deltaTime, mouseWorldPos);
            } else {
                // Update without mouse position if mouse is not tracked properly
                this.player.update(deltaTime);
            }
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
        
        // Handle dynamic gameplay events
        this.handleDynamicEvents(deltaTime);
        
        // Update zone effects for expanded map
        this.updateZoneEffects(deltaTime);
        
        // Update performance monitoring
        this.updatePerformanceMonitoring();
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
        const baseSpawnChance = GameConstants.MATTER_SPAWN_RATE * (deltaTime / 1000);
        
        // Zone-aware spawning with enhanced rates in special zones
        Object.entries(GameConstants.ZONES).forEach(([zoneKey, zone]) => {
            const zoneEffects = zone.effects;
            const spawnMultiplier = zoneEffects.matterSpawnRate || 1.0;
            const adjustedSpawnChance = baseSpawnChance * spawnMultiplier;
            
            if (Math.random() < adjustedSpawnChance && this.chronoMatter.length < GameConstants.MAX_MATTER_COUNT) {
                let attempts = 0;
                let position;
                
                do {
                    // Spawn within zone bounds
                    position = new Vector2(
                        MathUtils.random(zone.bounds.x, zone.bounds.x + zone.bounds.width),
                        MathUtils.random(zone.bounds.y, zone.bounds.y + zone.bounds.height)
                    );
                    attempts++;
                } while (this.isPositionTooCloseToRifts(position, 50) && attempts < 20);
                
                if (attempts < 20) {
                    const matter = new ChronoMatter(position.x, position.y);
                    
                    // Special matter types based on zone
                    if (zoneKey === 'NORTHEAST_CRYSTAL') {
                        matter.mass = GameConstants.MATTER_VALUE * 2; // Crystal matter worth more
                        matter.color = zone.color;
                        matter.isCrystalMatter = true;
                    } else if (zoneKey === 'CENTER') {
                        matter.mass = GameConstants.MATTER_VALUE * 1.5; // Nexus matter
                        matter.color = zone.color;
                        matter.isNexusMatter = true;
                    }
                    
                    this.chronoMatter.push(matter);
                }
            }
        });
        
        // Regular spawning for neutral areas
        if (Math.random() < baseSpawnChance && this.chronoMatter.length < GameConstants.MAX_MATTER_COUNT) {
            let attempts = 0;
            let position;
            
            do {
                position = new Vector2(
                    MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING),
                    MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING)
                );
                attempts++;
            } while (this.isPositionTooCloseToRifts(position, 50) && attempts < 20);
            
            // Only spawn in neutral areas (not in any zone)
            const isInZone = Object.values(GameConstants.ZONES).some(zone => {
                const bounds = zone.bounds;
                return position.x >= bounds.x && position.x <= bounds.x + bounds.width &&
                       position.y >= bounds.y && position.y <= bounds.y + bounds.height;
            });
            
            if (attempts < 20 && !isInZone) {
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
        
        // Render zone boundaries and effects
        this.renderZones(this.ctx);
        
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
            this.playerProgression.gainXP(xpGained);
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
        // Stop current game loop to prevent conflicts
        this.isRunning = false;
        
        // Reset game state
        this.isPaused = false;
        this.gameTime = 0;
        this.lastFrameTime = performance.now();
        this.gameStartTime = Date.now();
        
        // Clear active events
        this.activeEvents = [];
        this.lastEventTime = 0;
        this.eventCooldown = 0;
        
        // Reset camera position
        if (this.camera) {
            this.camera.position = new Vector2(0, 0);
            this.camera.zoom = 1;
            this.camera.targetZoom = 1;
        }
        
        if (this.player) {
            // Reset player state
            this.player.spawn();
            
            // Restart the game
            this.startGame(this.player.name);
        }
    }

    returnToMainMenu() {
        this.isRunning = false;
        this.canvas.classList.add('hidden');
        document.getElementById('gameHUD').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
    }

    handleDynamicEvents(deltaTime) {
        const now = Date.now();
        
        // Update active events
        this.activeEvents = this.activeEvents.filter(event => {
            event.duration -= deltaTime;
            if (event.duration <= 0) {
                this.endEvent(event);
                return false;
            }
            this.updateEvent(event, deltaTime);
            return true;
        });
        
        // Check if we can trigger a new event
        if (now - this.lastEventTime > this.eventCooldown && this.activeEvents.length < 2) {
            this.tryTriggerRandomEvent();
        }
    }

    tryTriggerRandomEvent() {
        const now = Date.now();
        const gameTime = now - this.gameStartTime;
        
        // Higher chance of events as game progresses
        const eventChance = Math.min(0.3, gameTime / 300000); // Max 30% chance after 5 minutes
        
        if (Math.random() < eventChance) {
            this.triggerRandomEvent();
            this.lastEventTime = now;
            this.eventCooldown = MathUtils.random(15000, 45000); // 15-45 seconds between events
        }
    }

    triggerRandomEvent() {
        const events = [
            'chrono_storm',
            'mass_surge',
            'gravity_shift',
            'temporal_freeze',
            'matter_rain',
            'ai_frenzy',
            'speed_boost',
            'shrinking_arena',
            'chaos_split',
            'magnetic_field',
            'time_dilation',
            'mass_redistribution',
            'teleport_chaos',
            'inverted_controls',
            // New surprise events
            'phantom_swarm',
            'energy_vampirism',
            'mirror_dimension',
            'quantum_tunneling',
            'cellular_mitosis',
            'temporal_echo',
            'void_zones',
            'mass_inversion',
            'chrono_lockdown',
            'reality_glitch',
            'dimensional_shift',
            'energy_cascade',
            'temporal_storm',
            'quantum_entanglement',
            'chrono_plague',
            // Enhanced creative events
            'quantum_split',
            'mass_vortex',
            'chrono_explosion',
            'reality_warp',
            'phantom_invasion',
            'mass_fusion',
            'temporal_paradox',
            'quantum_entanglement_network',
            'chrono_storm_enhanced'
        ];
        
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        this.startEvent(randomEvent);
    }

    startEvent(eventType) {
        const event = { type: eventType, duration: 0, intensity: 1 };
        
        // Creative event notifications
        const eventNotifications = {
            'chrono_storm': {
                title: '⚡ CHRONO STORM INCOMING! ⚡',
                message: 'Temporal energy surges through the arena! Matter spawns rapidly!',
                type: 'warning'
            },
            'mass_surge': {
                title: '💥 MASS SURGE ACTIVATED! 💥',
                message: 'All Chrono-Matter doubles in value! Consume quickly!',
                type: 'success'
            },
            'gravity_shift': {
                title: '🌀 GRAVITY ANOMALY DETECTED! 🌀',
                message: 'A massive gravitational pull emerges in the arena!',
                type: 'warning'
            },
            'temporal_freeze': {
                title: '❄️ TEMPORAL FREEZE! ❄️',
                message: 'Time slows for some competitors! Use this advantage!',
                type: 'info'
            },
            'matter_rain': {
                title: '🌧️ CHRONO-MATTER RAIN! 🌧️',
                message: 'The arena is flooded with energy! Feast while you can!',
                type: 'success'
            },
            'ai_frenzy': {
                title: '🤖 AI FRENZY MODE! 🤖',
                message: 'AI competitors enter berserker mode! Stay alert!',
                type: 'error'
            },
            'speed_boost': {
                title: '🚀 TEMPORAL ACCELERATION! 🚀',
                message: 'Time flows faster! Everyone moves with lightning speed!',
                type: 'info'
            },
            'shrinking_arena': {
                title: '🔥 ARENA COLLAPSE! 🔥',
                message: 'The battlefield shrinks! Fight for the center!',
                type: 'error'
            },
            'chaos_split': {
                title: '💫 CHAOS FRAGMENTATION! 💫',
                message: 'Unstable energy causes random cell divisions!',
                type: 'warning'
            },
            'magnetic_field': {
                title: '🧲 MAGNETIC ANOMALY! 🧲',
                message: 'Mysterious forces pull players together!',
                type: 'warning'
            },
            'time_dilation': {
                title: '⏰ TIME DILATION FIELD! ⏰',
                message: 'Time flows differently across the arena!',
                type: 'info'
            },
            'mass_redistribution': {
                title: '⚖️ MASS REDISTRIBUTION! ⚖️',
                message: 'Energy balances across all competitors!',
                type: 'warning'
            },
            'teleport_chaos': {
                title: '🌟 TELEPORT STORM! 🌟',
                message: 'Random teleportation rifts appear everywhere!',
                type: 'info'
            },
            'inverted_controls': {
                title: '🔄 CONTROL INVERSION! 🔄',
                message: 'Temporal interference scrambles movement controls!',
                type: 'error'
            },
            // New surprise events notifications
            'phantom_swarm': {
                title: '👻 PHANTOM SWARM UNLEASHED! 👻',
                message: 'Ghostly entities emerge to hunt the largest players!',
                type: 'error'
            },
            'energy_vampirism': {
                title: '🧛 ENERGY VAMPIRISM! 🧛',
                message: 'Consuming others now steals their abilities temporarily!',
                type: 'warning'
            },
            'mirror_dimension': {
                title: '🪞 MIRROR DIMENSION BREACH! 🪞',
                message: 'A parallel arena overlaps! Avoid your dark reflections!',
                type: 'error'
            },
            'quantum_tunneling': {
                title: '🕳️ QUANTUM TUNNELING ACTIVE! 🕳️',
                message: 'Players can phase through walls and each other!',
                type: 'info'
            },
            'cellular_mitosis': {
                title: '🧬 CELLULAR MITOSIS SURGE! 🧬',
                message: 'All cells undergo rapid division! Chaos ensues!',
                type: 'warning'
            },
            'temporal_echo': {
                title: '🔊 TEMPORAL ECHO PHENOMENON! 🔊',
                message: 'Past actions repeat themselves across time!',
                type: 'info'
            },
            'void_zones': {
                title: '🕳️ VOID ZONES MANIFESTING! 🕳️',
                message: 'Dark zones appear that consume everything inside!',
                type: 'error'
            },
            'mass_inversion': {
                title: '🔄 MASS INVERSION FIELD! 🔄',
                message: 'Smaller becomes larger, larger becomes smaller!',
                type: 'warning'
            },
            'chrono_lockdown': {
                title: '🔒 CHRONO-LOCKDOWN INITIATED! 🔒',
                message: 'No new matter spawns! Fight for what remains!',
                type: 'error'
            },
            'reality_glitch': {
                title: '📺 REALITY GLITCH DETECTED! 📺',
                message: 'The arena flickers between dimensions!',
                type: 'warning'
            },
            'dimensional_shift': {
                title: '🌌 DIMENSIONAL SHIFT! 🌌',
                message: 'The arena rotates and transforms around you!',
                type: 'info'
            },
            'energy_cascade': {
                title: '💫 ENERGY CASCADE! 💫',
                message: 'Chain reactions spread across the battlefield!',
                type: 'success'
            },
            'temporal_storm': {
                title: '🌪️ TEMPORAL STORM! 🌪️',
                message: 'Time itself becomes unstable! Brace for chaos!',
                type: 'error'
            },
            'quantum_entanglement': {
                title: '🔗 QUANTUM ENTANGLEMENT! 🔗',
                message: 'Players become linked! What affects one affects all!',
                type: 'warning'
            },
            'chrono_plague': {
                title: '🦠 CHRONO-PLAGUE OUTBREAK! 🦠',
                message: 'A contagious effect spreads between players!',
                type: 'error'
            },
            // Enhanced creative events
            'quantum_split': {
                title: '⚛️ QUANTUM SPLIT PHENOMENON! ⚛️',
                message: 'Players split into quantum duplicates! Reality fragments!',
                type: 'warning'
            },
            'mass_vortex': {
                title: '🌪️ MASS VORTEX FORMING! 🌪️',
                message: 'Swirling zones of mass collection appear!',
                type: 'info'
            },
            'chrono_explosion': {
                title: '💥 CHRONO EXPLOSION! 💥',
                message: 'Mass-based chain reactions shake the arena!',
                type: 'error'
            },
            'reality_warp': {
                title: '🌀 REALITY WARP FIELD! 🌀',
                message: 'Physics behave differently in warped zones!',
                type: 'warning'
            },
            'phantom_invasion': {
                title: '👻 PHANTOM INVASION! 👻',
                message: 'Ghostly entities hunt the largest players!',
                type: 'error'
            },
            'mass_fusion': {
                title: '🔗 MASS FUSION ZONES! 🔗',
                message: 'Players can temporarily merge in fusion zones!',
                type: 'info'
            },
            'temporal_paradox': {
                title: '⏰ TEMPORAL PARADOX! ⏰',
                message: 'Past and future collide! Time anomalies appear!',
                type: 'warning'
            },
            'quantum_entanglement_network': {
                title: '🔗 QUANTUM ENTANGLEMENT NETWORK! 🔗',
                message: 'Players linked in complex quantum relationships!',
                type: 'info'
            },
            'chrono_storm_enhanced': {
                title: '🌩️ ENHANCED CHRONO STORM! 🌩️',
                message: 'Multiple storm patterns create chaos!',
                type: 'error'
            }
        };
        
        // Show notification for the event
        const notification = eventNotifications[eventType];
        if (notification && window.uiSystem) {
            window.uiSystem.showNotification(notification.title, notification.type);
            setTimeout(() => {
                window.uiSystem.showNotification(notification.message, 'info');
            }, 1500);
        }
        
        // Play event sound
        if (window.audioSystem) {
            window.audioSystem.playGameSound('event_trigger');
        }
        
        switch (eventType) {
            case 'chrono_storm':
                event.duration = 10000; // 10 seconds
                event.intensity = MathUtils.random(0.5, 1.5);
                this.createChronoStorm(event);
                break;
                
            case 'mass_surge':
                event.duration = 8000; // 8 seconds
                this.createMassSurge(event);
                break;
                
            case 'gravity_shift':
                event.duration = 12000; // 12 seconds
                event.centerPoint = new Vector2(
                    MathUtils.random(GameConstants.ARENA_WIDTH * 0.2, GameConstants.ARENA_WIDTH * 0.8),
                    MathUtils.random(GameConstants.ARENA_HEIGHT * 0.2, GameConstants.ARENA_HEIGHT * 0.8)
                );
                this.createGravityShift(event);
                break;
                
            case 'temporal_freeze':
                event.duration = 5000; // 5 seconds
                event.affectedPlayers = this.aiPlayers.filter(() => Math.random() < 0.6);
                this.createTemporalFreeze(event);
                break;
                
            case 'matter_rain':
                event.duration = 15000; // 15 seconds
                event.spawnRate = MathUtils.random(2, 5);
                this.createMatterRain(event);
                break;
                
            case 'ai_frenzy':
                event.duration = 20000; // 20 seconds
                this.createAIFrenzy(event);
                break;
                
            case 'speed_boost':
                event.duration = 12000; // 12 seconds
                event.speedMultiplier = MathUtils.random(1.5, 2.5);
                this.createSpeedBoost(event);
                break;
                
            case 'shrinking_arena':
                event.duration = 30000; // 30 seconds
                event.shrinkRate = MathUtils.random(0.8, 0.95);
                this.createShrinkingArena(event);
                break;
                
            case 'chaos_split':
                event.duration = 8000; // 8 seconds
                this.createChaosSplit(event);
                break;
                
            case 'magnetic_field':
                event.duration = 15000; // 15 seconds
                event.magneticCenter = new Vector2(
                    MathUtils.random(GameConstants.ARENA_WIDTH * 0.3, GameConstants.ARENA_WIDTH * 0.7),
                    MathUtils.random(GameConstants.ARENA_HEIGHT * 0.3, GameConstants.ARENA_HEIGHT * 0.7)
                );
                event.magneticStrength = MathUtils.random(30, 100);
                this.createMagneticField(event);
                break;
                
            case 'time_dilation':
                event.duration = 12000; // 12 seconds
                this.createTimeDilation(event);
                break;
                
            case 'mass_redistribution':
                event.duration = 1000; // Instant effect
                this.createMassRedistribution(event);
                break;
                
            case 'teleport_chaos':
                event.duration = 1000; // Instant effect
                this.createTeleportChaos(event);
                break;
                
            case 'inverted_controls':
                event.duration = 10000; // 10 seconds
                this.createInvertedControls(event);
                break;
                
            // New surprise events
            case 'phantom_swarm':
                event.duration = 15000; // 15 seconds
                event.phantomCount = MathUtils.random(3, 6);
                this.createPhantomSwarm(event);
                break;
                
            case 'energy_vampirism':
                event.duration = 20000; // 20 seconds
                this.createEnergyVampirism(event);
                break;
                
            case 'mirror_dimension':
                event.duration = 12000; // 12 seconds
                this.createMirrorDimension(event);
                break;
                
            case 'quantum_tunneling':
                event.duration = 8000; // 8 seconds
                this.createQuantumTunneling(event);
                break;
                
            case 'cellular_mitosis':
                event.duration = 6000; // 6 seconds
                this.createCellularMitosis(event);
                break;
                
            case 'temporal_echo':
                event.duration = 10000; // 10 seconds
                this.createTemporalEcho(event);
                break;
                
            case 'void_zones':
                event.duration = 18000; // 18 seconds
                event.voidCount = MathUtils.random(2, 4);
                this.createVoidZones(event);
                break;
                
            case 'mass_inversion':
                event.duration = 8000; // 8 seconds
                this.createMassInversion(event);
                break;
                
            case 'chrono_lockdown':
                event.duration = 25000; // 25 seconds
                this.createChronoLockdown(event);
                break;
                
            case 'reality_glitch':
                event.duration = 5000; // 5 seconds
                this.createRealityGlitch(event);
                break;
                
            case 'dimensional_shift':
                event.duration = 10000; // 10 seconds
                this.createDimensionalShift(event);
                break;
                
            case 'energy_cascade':
                event.duration = 12000; // 12 seconds
                this.createEnergyCascade(event);
                break;
                
            case 'temporal_storm':
                event.duration = 15000; // 15 seconds
                this.createTemporalStorm(event);
                break;
                
            case 'quantum_entanglement':
                event.duration = 20000; // 20 seconds
                this.createQuantumEntanglement(event);
                break;
                
            case 'chrono_plague':
                event.duration = 25000; // 25 seconds
                this.createChronoPlague(event);
                break;
                
            // Enhanced creative events
            case 'quantum_split':
                event.duration = 15000; // 15 seconds
                this.createQuantumSplit(event);
                break;
                
            case 'mass_vortex':
                event.duration = 20000; // 20 seconds
                this.createMassVortex(event);
                break;
                
            case 'chrono_explosion':
                event.duration = 12000; // 12 seconds
                this.createChronoExplosion(event);
                break;
                
            case 'reality_warp':
                event.duration = 18000; // 18 seconds
                this.createRealityWarp(event);
                break;
                
            case 'phantom_invasion':
                event.duration = 25000; // 25 seconds
                this.createPhantomInvasion(event);
                break;
                
            case 'mass_fusion':
                event.duration = 15000; // 15 seconds
                this.createMassFusion(event);
                break;
                
            case 'temporal_paradox':
                event.duration = 20000; // 20 seconds
                this.createTemporalParadox(event);
                break;
                
            case 'quantum_entanglement_network':
                event.duration = 30000; // 30 seconds
                this.createQuantumEntanglementNetwork(event);
                break;
                
            case 'chrono_storm_enhanced':
                event.duration = 25000; // 25 seconds
                this.createChronoStorm(event);
                break;
        }
        
        this.activeEvents.push(event);
        this.announceEvent(eventType);
    }

    createChronoStorm(event) {
        // Spawn multiple temporal rifts randomly
        for (let i = 0; i < 5; i++) {
            const position = new Vector2(
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING),
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING)
            );
            this.temporalRifts.push(new TemporalRift(position.x, position.y, MathUtils.random(30, 60)));
        }
        
        // Create visual storm effect
        if (window.particleSystem) {
            const center = new Vector2(GameConstants.ARENA_WIDTH / 2, GameConstants.ARENA_HEIGHT / 2);
            window.particleSystem.createTimeDistortion(center, 'storm', 100);
        }
    }

    createMassSurge(event) {
        // All chrono matter gives 2x mass temporarily
        this.chronoMatter.forEach(matter => {
            matter.massMultiplier = 2;
        });
        event.restoreMass = true;
    }

    createGravityShift(event) {
        // Apply gravitational pull towards a point
        event.gravityStrength = MathUtils.random(50, 150);
    }

    createTemporalFreeze(event) {
        // Slow down specific AI players
        event.affectedPlayers.forEach(ai => {
            ai.frozenSpeedMultiplier = 0.2;
        });
    }

    createMatterRain(event) {
        // Increase chrono matter spawn rate
        event.originalSpawnRate = this.chronoMatterSpawnRate;
        this.chronoMatterSpawnRate *= event.spawnRate;
    }

    createAIFrenzy(event) {
        // Make all AI more aggressive and faster
        this.aiPlayers.forEach(ai => {
            ai.frenzySpeedBoost = 1.8;
            ai.frenzyAggressionBoost = 0.3;
            ai.decisionInterval *= 0.5; // Make decisions faster
        });
    }

    createSpeedBoost(event) {
        // Global speed boost for all players
        event.originalFriction = GameConstants.FRICTION;
        GameConstants.FRICTION *= 0.7; // Less friction = more speed
    }

    createShrinkingArena(event) {
        // Gradually shrink the safe zone
        event.originalWidth = GameConstants.ARENA_WIDTH;
        event.originalHeight = GameConstants.ARENA_HEIGHT;
        event.targetWidth = GameConstants.ARENA_WIDTH * 0.6;
        event.targetHeight = GameConstants.ARENA_HEIGHT * 0.6;
    }

    createChaosSplit(event) {
        // Create multiple temporal rifts randomly
        for (let i = 0; i < 5; i++) {
            const position = new Vector2(
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING),
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING)
            );
            this.temporalRifts.push(new TemporalRift(position.x, position.y, MathUtils.random(30, 60)));
        }
        
        // Create visual chaos effect
        if (window.particleSystem) {
            const center = new Vector2(GameConstants.ARENA_WIDTH / 2, GameConstants.ARENA_HEIGHT / 2);
            window.particleSystem.createTimeDistortion(center, 'chaos', 100);
        }
    }

    createMagneticField(event) {
        // Create a magnetic field effect
        if (window.particleSystem) {
            const center = event.magneticCenter;
            window.particleSystem.createMagneticField(center, 100);
        }
    }

    createTimeDilation(event) {
        // Slow down time for all cells
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                cell.velocity = Vector2.multiply(cell.velocity, 0.5);
            });
        });
    }

    createMassRedistribution(event) {
        // Redistribute mass randomly
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        allPlayers.forEach(player => {
            const newMass = MathUtils.random(10, 50);
            player.consumeMassForAbility(newMass);
        });
    }

    createTeleportChaos(event) {
        // Teleport all AI players to random positions
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                cell.position = new Vector2(
                    MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING),
                    MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING)
                );
            });
        });
    }

    createInvertedControls(event) {
        // Invert controls for all AI players
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        allPlayers.forEach(player => {
            player.frozenSpeedMultiplier = 0.2;
            player.frenzySpeedBoost = 1.8;
            player.frenzyAggressionBoost = 0.3;
            player.decisionInterval *= 0.5; // Make decisions faster
        });
    }

    updateEvent(event, deltaTime) {
        switch (event.type) {
            case 'gravity_shift':
                this.updateGravityShift(event, deltaTime);
                break;
            case 'shrinking_arena':
                this.updateShrinkingArena(event, deltaTime);
                break;
            case 'magnetic_field':
                this.updateMagneticField(event, deltaTime);
                break;
            case 'time_dilation':
                this.updateTimeDilation(event, deltaTime);
                break;
            case 'phantom_swarm':
                this.updatePhantomSwarm(event, deltaTime);
                break;
            case 'mirror_dimension':
                this.updateMirrorDimension(event, deltaTime);
                break;
            case 'void_zones':
                this.updateVoidZones(event, deltaTime);
                break;
            case 'reality_glitch':
                this.updateRealityGlitch(event, deltaTime);
                break;
            case 'dimensional_shift':
                this.updateDimensionalShift(event, deltaTime);
                break;
            case 'temporal_storm':
                this.updateTemporalStorm(event, deltaTime);
                break;
            case 'quantum_entanglement':
                this.updateQuantumEntanglement(event, deltaTime);
                break;
            case 'chrono_plague':
                this.updateChronoPlague(event, deltaTime);
                break;
                
            // Enhanced creative events
            case 'quantum_split':
                this.updateQuantumSplit(event, deltaTime);
                break;
                
            case 'mass_vortex':
                this.updateMassVortex(event, deltaTime);
                break;
                
            case 'chrono_explosion':
                this.updateChronoExplosion(event, deltaTime);
                break;
                
            case 'reality_warp':
                this.updateRealityWarp(event, deltaTime);
                break;
                
            case 'phantom_invasion':
                this.updatePhantomInvasion(event, deltaTime);
                break;
                
            case 'mass_fusion':
                this.updateMassFusion(event, deltaTime);
                break;
                
            case 'temporal_paradox':
                this.updateTemporalParadox(event, deltaTime);
                break;
                
            case 'quantum_entanglement_network':
                this.updateQuantumEntanglementNetwork(event, deltaTime);
                break;
                
            case 'chrono_storm_enhanced':
                this.updateChronoStorm(event, deltaTime);
                break;
        }
    }

    updateGravityShift(event, deltaTime) {
        // Apply gravity to all cells
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const direction = Vector2.subtract(event.centerPoint, cell.position);
                const distance = Vector2.magnitude(direction);
                if (distance > 10) {
                    const force = event.gravityStrength / (distance * distance) * cell.mass;
                    const acceleration = Vector2.multiply(Vector2.normalize(direction), force);
                    cell.velocity = Vector2.add(cell.velocity, Vector2.multiply(acceleration, deltaTime / 1000));
                }
            });
        });
    }

    updateShrinkingArena(event, deltaTime) {
        const progress = 1 - (event.duration / 30000);
        const currentWidth = MathUtils.lerp(event.originalWidth, event.targetWidth, progress);
        const currentHeight = MathUtils.lerp(event.originalHeight, event.targetHeight, progress);
        
        // Damage players outside the shrinking zone
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const centerX = GameConstants.ARENA_WIDTH / 2;
                const centerY = GameConstants.ARENA_HEIGHT / 2;
                const maxDistX = currentWidth / 2;
                const maxDistY = currentHeight / 2;
                
                if (Math.abs(cell.position.x - centerX) > maxDistX || 
                    Math.abs(cell.position.y - centerY) > maxDistY) {
                    // Damage cell outside safe zone
                    cell.mass *= 0.995; // Gradual mass loss
                    if (cell.mass < 10) {
                        cell.isAlive = false;
                    }
                }
            });
        });
    }

    updateMagneticField(event, deltaTime) {
        // Apply magnetic force to all cells
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const direction = Vector2.subtract(event.magneticCenter, cell.position);
                const distance = Vector2.magnitude(direction);
                if (distance > 10) {
                    const force = event.magneticStrength / (distance * distance) * cell.mass;
                    const acceleration = Vector2.multiply(Vector2.normalize(direction), force);
                    cell.velocity = Vector2.add(cell.velocity, Vector2.multiply(acceleration, deltaTime / 1000));
                }
            });
        });
    }

    updateTimeDilation(event, deltaTime) {
        // Slow down time for all cells
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                cell.velocity = Vector2.multiply(cell.velocity, 0.5);
            });
        });
    }

    endEvent(event) {
        switch (event.type) {
            case 'mass_surge':
                if (event.restoreMass) {
                    this.chronoMatter.forEach(matter => {
                        matter.massMultiplier = 1;
                    });
                }
                break;
                
            case 'temporal_freeze':
                event.affectedPlayers.forEach(ai => {
                    delete ai.frozenSpeedMultiplier;
                });
                break;
                
            case 'matter_rain':
                this.chronoMatterSpawnRate = event.originalSpawnRate;
                break;
                
            case 'ai_frenzy':
                this.aiPlayers.forEach(ai => {
                    delete ai.frenzySpeedBoost;
                    delete ai.frenzyAggressionBoost;
                    ai.decisionInterval = MathUtils.random(300, 800);
                });
                break;
                
            case 'speed_boost':
                GameConstants.FRICTION = event.originalFriction;
                break;
                
            case 'inverted_controls':
            case 'chaos_split':
                // Reset any temporary AI modifications
                this.aiPlayers.forEach(ai => {
                    delete ai.frozenSpeedMultiplier;
                    delete ai.frenzySpeedBoost;
                    delete ai.frenzyAggressionBoost;
                    ai.decisionInterval = MathUtils.random(300, 800);
                });
                break;
        }
    }

    announceEvent(eventType) {
        const eventNames = {
            'chrono_storm': 'CHRONO STORM DETECTED!',
            'mass_surge': 'MASS SURGE ACTIVE!',
            'gravity_shift': 'GRAVITY ANOMALY!',
            'temporal_freeze': 'TEMPORAL DISRUPTION!',
            'matter_rain': 'CHRONO-MATTER RAIN!',
            'ai_frenzy': 'AI FRENZY MODE!',
            'speed_boost': 'VELOCITY ENHANCEMENT!',
            'shrinking_arena': 'ARENA COMPRESSION!',
            'chaos_split': 'CHAOS RIFTS OPENING!',
            'magnetic_field': 'MAGNETIC ANOMALY!',
            'time_dilation': 'TIME DILATION FIELD!',
            'mass_redistribution': 'MASS FLUX EVENT!',
            'teleport_chaos': 'SPATIAL DISRUPTION!',
            'inverted_controls': 'NEURAL INTERFERENCE!'
        };
        
        const eventDescriptions = {
            'chrono_storm': 'Multiple temporal rifts have appeared!',
            'mass_surge': 'Chrono-matter provides double mass!',
            'gravity_shift': 'Gravitational anomaly detected!',
            'temporal_freeze': 'Some players are slowed by time!',
            'matter_rain': 'Increased chrono-matter spawning!',
            'ai_frenzy': 'AI players are in aggressive mode!',
            'speed_boost': 'All players move faster!',
            'shrinking_arena': 'The arena is compressing!',
            'chaos_split': 'Reality is fracturing into chaos rifts!',
            'magnetic_field': 'Magnetic forces are pulling players!',
            'time_dilation': 'Time itself is slowing down!',
            'mass_redistribution': 'Mass is being redistributed randomly!',
            'teleport_chaos': 'Players are being teleported randomly!',
            'inverted_controls': 'Neural pathways are disrupted!'
        };
        
        if (window.uiSystem) {
            window.uiSystem.showNotification(
                eventNames[eventType] || 'UNKNOWN EVENT',
                eventDescriptions[eventType] || 'Something strange is happening...',
                'event',
                5000
            );
        }
        
        if (window.audioSystem) {
            window.audioSystem.playGameSound('event_trigger');
        }
    }

    announceEvent(eventType) {
        console.log(`🎯 Event triggered: ${eventType}`);
    }
    
    // Zone Management System
    initializeZones() {
        // Initialize zone effects for each defined zone
        Object.keys(GameConstants.ZONES).forEach(zoneKey => {
            const zone = GameConstants.ZONES[zoneKey];
            this.zoneEffects.set(zoneKey, {
                ...zone.effects,
                activeTime: 0,
                lastUpdate: Date.now()
            });
        });
    }
    
    getPlayerZone(player) {
        if (!player || player.cells.length === 0) return null;
        
        const playerCenter = player.getCenterPosition();
        
        // Check which zone the player is in
        for (const [zoneKey, zone] of Object.entries(GameConstants.ZONES)) {
            const bounds = zone.bounds;
            if (playerCenter.x >= bounds.x && 
                playerCenter.x <= bounds.x + bounds.width &&
                playerCenter.y >= bounds.y && 
                playerCenter.y <= bounds.y + bounds.height) {
                return { key: zoneKey, zone: zone };
            }
        }
        
        return null; // In neutral territory
    }
    
    updateZoneEffects(deltaTime) {
        // Update zone effects for all players
        const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
        
        allPlayers.forEach(player => {
            const currentZone = this.getPlayerZone(player);
            
            if (currentZone) {
                // Apply zone-specific effects
                if (currentZone.zone.effects.speedMultiplier) {
                    player.zoneSpeedMultiplier = currentZone.zone.effects.speedMultiplier;
                }
                
                if (currentZone.zone.effects.damageMultiplier) {
                    player.zoneDamageMultiplier = currentZone.zone.effects.damageMultiplier;
                }
                
                if (currentZone.zone.effects.voidDamage) {
                    // Void damage effect
                    player.cells.forEach(cell => {
                        cell.mass *= 0.998;
                        if (cell.mass < 10) {
                            cell.isAlive = false;
                        }
                    });
                }
                
                // Show zone entry notification only when changing zones
                if (!player.lastZone || player.lastZone !== currentZone.key) {
                    if (window.uiSystem) {
                        window.uiSystem.showNotification(
                            `🌍 ${currentZone.zone.name}`, 
                            'info'
                        );
                    }
                    player.lastZone = currentZone.key;
                }
            } else {
                // Clear zone effects when leaving zones
                delete player.zoneSpeedMultiplier;
                delete player.zoneDamageMultiplier;
                player.lastZone = null;
            }
        });
    }
    
    renderZones(ctx) {
        // Render zone boundaries and effects
        Object.entries(GameConstants.ZONES).forEach(([zoneKey, zone]) => {
            const bounds = zone.bounds;
            const topLeft = this.camera.worldToScreen(new Vector2(bounds.x, bounds.y));
            const bottomRight = this.camera.worldToScreen(new Vector2(bounds.x + bounds.width, bounds.y + bounds.height));
            
            // Zone boundary
            ctx.strokeStyle = zone.color + '40'; // Semi-transparent
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.strokeRect(
                topLeft.x, 
                topLeft.y, 
                bottomRight.x - topLeft.x, 
                bottomRight.y - topLeft.y
            );
            ctx.setLineDash([]);
            
            // Zone name label
            if (this.camera.zoom > 0.3) {
                const centerScreen = this.camera.worldToScreen(new Vector2(
                    bounds.x + bounds.width / 2,
                    bounds.y + bounds.height / 2
                ));
                
                ctx.fillStyle = zone.color;
                ctx.font = `${16 * this.camera.zoom}px Orbitron`;
                ctx.textAlign = 'center';
                ctx.fillText(zone.name, centerScreen.x, centerScreen.y);
            }
        });
    }

    // Add missing performance monitoring method
    updatePerformanceMonitoring() {
        // Monitor FPS and performance
        if (this.fps < 30) {
            // Reduce particle effects and complexity when FPS is low
            if (window.particleSystem) {
                window.particleSystem.setMaxParticles(100);
            }
        } else if (this.fps > 50) {
            // Restore full effects when performance is good
            if (window.particleSystem) {
                window.particleSystem.setMaxParticles(500);
            }
        }
        
        // Monitor memory usage (if available)
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            if (memoryUsage > 100) {
                // Clean up if memory usage is high
                this.cleanupUnusedResources();
            }
        }
    }

    cleanupUnusedResources() {
        // Clean up old particles
        if (window.particleSystem) {
            window.particleSystem.cleanup();
        }
        
        // Clean up old chrono matter
        if (this.chronoMatter.length > GameConstants.MAX_MATTER_COUNT * 1.5) {
            this.chronoMatter = this.chronoMatter.slice(0, GameConstants.MAX_MATTER_COUNT);
        }
    }
}

// New Event Implementations for Enhanced Gameplay

// Phantom Swarm - Ghostly entities hunt largest players
GameEngine.prototype.createPhantomSwarm = function(event) {
    event.phantoms = [];
    for (let i = 0; i < event.phantomCount; i++) {
        const phantom = {
            position: new Vector2(
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING),
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING)
            ),
            target: null,
            speed: 150,
            radius: 25,
            damage: 5
        };
        event.phantoms.push(phantom);
    }
};

// Energy Vampirism - Consuming others steals abilities
GameEngine.prototype.createEnergyVampirism = function(event) {
    event.vampirismActive = true;
    this.originalConsumptionLogic = this.handlePlayerCollision;
};

// Mirror Dimension - Dark reflections appear
GameEngine.prototype.createMirrorDimension = function(event) {
    event.mirrorPlayers = [];
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    allPlayers.forEach(player => {
        const mirror = {
            originalPlayer: player,
            cells: player.cells.map(cell => ({
                position: new Vector2(
                    GameConstants.ARENA_WIDTH - cell.position.x,
                    GameConstants.ARENA_HEIGHT - cell.position.y
                ),
                mass: cell.mass * 0.7,
                radius: cell.radius * 0.8,
                color: '#ff0000'
            }))
        };
        event.mirrorPlayers.push(mirror);
    });
};

// Quantum Tunneling - Phase through walls and players
GameEngine.prototype.createQuantumTunneling = function(event) {
    event.phasingActive = true;
    this.originalCollisionDetection = this.checkCollision;
};

// Cellular Mitosis - Rapid cell division
GameEngine.prototype.createCellularMitosis = function(event) {
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    allPlayers.forEach(player => {
        if (player.cells.length < GameConstants.MAX_CELLS) {
            player.cells.forEach(cell => {
                if (Math.random() < 0.3 && cell.mass > 40) {
                    player.splitCell(cell);
                }
            });
        }
    });
};

// Temporal Echo - Past actions repeat
GameEngine.prototype.createTemporalEcho = function(event) {
    event.echoActions = [];
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    allPlayers.forEach(player => {
        if (player.movementHistory && player.movementHistory.length > 0) {
            event.echoActions.push({
                player: player,
                history: [...player.movementHistory]
            });
        }
    });
};

// Void Zones - Areas that consume everything
GameEngine.prototype.createVoidZones = function(event) {
    event.voidZones = [];
    for (let i = 0; i < event.voidCount; i++) {
        const voidZone = {
            position: new Vector2(
                MathUtils.random(GameConstants.ARENA_WIDTH * 0.2, GameConstants.ARENA_WIDTH * 0.8),
                MathUtils.random(GameConstants.ARENA_HEIGHT * 0.2, GameConstants.ARENA_HEIGHT * 0.8)
            ),
            radius: MathUtils.random(80, 120),
            growthRate: 2,
            maxRadius: 200
        };
        event.voidZones.push(voidZone);
    }
};

// Mass Inversion - Smaller becomes larger
GameEngine.prototype.createMassInversion = function(event) {
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    allPlayers.forEach(player => {
        const totalMass = player.getTotalMass();
        const averageMass = totalMass / player.cells.length;
        player.cells.forEach(cell => {
            const inversionFactor = averageMass / cell.mass;
            cell.mass = Math.max(20, Math.min(500, cell.mass * inversionFactor));
            cell.radius = Math.sqrt(cell.mass / Math.PI) * 2;
        });
    });
};

// Chrono Lockdown - No new matter spawns
GameEngine.prototype.createChronoLockdown = function(event) {
    event.originalSpawnRate = this.chronoMatterSpawnRate;
    this.chronoMatterSpawnRate = 0;
};

// Reality Glitch - Arena flickers
GameEngine.prototype.createRealityGlitch = function(event) {
    event.glitchIntensity = 1;
    event.glitchFrequency = 200; // milliseconds
};

// Dimensional Shift - Arena rotates
GameEngine.prototype.createDimensionalShift = function(event) {
    event.rotationAngle = 0;
    event.rotationSpeed = Math.PI / 10000; // radians per ms
};

// Energy Cascade - Chain reactions
GameEngine.prototype.createEnergyCascade = function(event) {
    event.cascadeChain = 0;
    event.cascadeRadius = 100;
};

// Temporal Storm - Unstable time
GameEngine.prototype.createTemporalStorm = function(event) {
    event.timeFluctuations = [];
    for (let i = 0; i < 5; i++) {
        event.timeFluctuations.push({
            center: new Vector2(
                MathUtils.random(GameConstants.ARENA_WIDTH * 0.2, GameConstants.ARENA_WIDTH * 0.8),
                MathUtils.random(GameConstants.ARENA_HEIGHT * 0.2, GameConstants.ARENA_HEIGHT * 0.8)
            ),
            radius: MathUtils.random(150, 250),
            timeMultiplier: MathUtils.random(0.3, 2.0)
        });
    }
};

// Quantum Entanglement - Players linked
GameEngine.prototype.createQuantumEntanglement = function(event) {
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    event.entangledPairs = [];
    for (let i = 0; i < allPlayers.length - 1; i += 2) {
        if (allPlayers[i + 1]) {
            event.entangledPairs.push([allPlayers[i], allPlayers[i + 1]]);
        }
    }
};

// Chrono Plague - Contagious effect
GameEngine.prototype.createChronoPlague = function(event) {
    event.infectedPlayers = new Set();
    event.plagueRadius = 80;
    event.infectionChance = 0.1;
    
    // Start with one random infected player
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    if (allPlayers.length > 0) {
        const patient0 = allPlayers[Math.floor(Math.random() * allPlayers.length)];
        event.infectedPlayers.add(patient0);
        patient0.plagueEffect = { massDecay: 0.998, visualEffect: true };
    }
};

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

// Update methods for new events
GameEngine.prototype.updatePhantomSwarm = function(event, deltaTime) {
    if (!event.phantoms) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    event.phantoms.forEach(phantom => {
        // Phantoms hunt the largest players
        let targetPlayer = null;
        let maxMass = 0;
        
        allPlayers.forEach(player => {
            const mass = player.getTotalMass();
            if (mass > maxMass) {
                maxMass = mass;
                targetPlayer = player;
            }
        });
        
        if (targetPlayer) {
            phantom.target = targetPlayer.getCenterPosition();
            const direction = Vector2.subtract(phantom.target, phantom.position);
            const distance = Vector2.magnitude(direction);
            
            if (distance > 10) {
                const normalizedDir = Vector2.normalize(direction);
                phantom.position = Vector2.add(phantom.position, 
                    Vector2.multiply(normalizedDir, phantom.speed * deltaTime / 1000));
                
                // Damage player if close enough
                if (distance < phantom.radius + 30) {
                    targetPlayer.cells.forEach(cell => {
                        if (Vector2.distance(phantom.position, cell.position) < phantom.radius + cell.radius) {
                            cell.mass = Math.max(10, cell.mass - phantom.damage);
                        }
                    });
                }
            }
        }
    });
};

GameEngine.prototype.updateMirrorDimension = function(event, deltaTime) {
    if (!event.mirrorPlayers) return;
    
    // Update mirror positions and check for collisions
    event.mirrorPlayers.forEach(mirror => {
        const originalPlayer = mirror.originalPlayer;
        if (originalPlayer && originalPlayer.isAlive) {
            // Update mirror positions to be opposite of original
            mirror.cells.forEach((mirrorCell, index) => {
                if (originalPlayer.cells[index]) {
                    const originalCell = originalPlayer.cells[index];
                    mirrorCell.position.x = GameConstants.ARENA_WIDTH - originalCell.position.x;
                    mirrorCell.position.y = GameConstants.ARENA_HEIGHT - originalCell.position.y;
                    
                    // Check collision with original
                    const distance = Vector2.distance(mirrorCell.position, originalCell.position);
                    if (distance < mirrorCell.radius + originalCell.radius) {
                        // Damage both on collision
                        originalCell.mass *= 0.95;
                        mirrorCell.mass *= 0.95;
                    }
                }
            });
        }
    });
};

GameEngine.prototype.updateVoidZones = function(event, deltaTime) {
    if (!event.voidZones) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    event.voidZones.forEach(voidZone => {
        // Grow void zones over time
        if (voidZone.radius < voidZone.maxRadius) {
            voidZone.radius += voidZone.growthRate * deltaTime / 1000;
        }
        
        // Consume everything inside void zones
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const distance = Vector2.distance(voidZone.position, cell.position);
                if (distance < voidZone.radius) {
                    cell.mass *= 0.99; // Rapid mass loss in void
                    if (cell.mass < 5) {
                        cell.isAlive = false;
                    }
                }
            });
        });
        
        // Consume chrono matter
        this.chronoMatter = this.chronoMatter.filter(matter => {
            const distance = Vector2.distance(voidZone.position, matter.position);
            return distance >= voidZone.radius;
        });
    });
};

GameEngine.prototype.updateRealityGlitch = function(event, deltaTime) {
    // Create visual glitching effects
    if (Math.random() < 0.1) {
        if (window.particleSystem) {
            const randomPos = new Vector2(
                MathUtils.random(0, GameConstants.ARENA_WIDTH),
                MathUtils.random(0, GameConstants.ARENA_HEIGHT)
            );
            window.particleSystem.createTimeDistortion(randomPos, 'glitch', 20);
        }
    }
};

GameEngine.prototype.updateDimensionalShift = function(event, deltaTime) {
    // Rotate the arena perspective (visual effect)
    event.rotationAngle += event.rotationSpeed * deltaTime;
    
    // Apply subtle position shifts to all entities
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    allPlayers.forEach(player => {
        player.cells.forEach(cell => {
            const centerX = GameConstants.ARENA_WIDTH / 2;
            const centerY = GameConstants.ARENA_HEIGHT / 2;
            const relativePos = Vector2.subtract(cell.position, new Vector2(centerX, centerY));
            
            // Apply slight rotation
            const rotatedPos = Vector2.fromAngle(
                Math.atan2(relativePos.y, relativePos.x) + event.rotationSpeed * deltaTime / 1000,
                Vector2.magnitude(relativePos)
            );
            
            cell.position = Vector2.add(new Vector2(centerX, centerY), rotatedPos);
        });
    });
};

GameEngine.prototype.updateTemporalStorm = function(event, deltaTime) {
    if (!event.timeFluctuations) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    // Apply different time effects in different areas
    allPlayers.forEach(player => {
        player.cells.forEach(cell => {
            event.timeFluctuations.forEach(fluctuation => {
                const distance = Vector2.distance(cell.position, fluctuation.center);
                if (distance < fluctuation.radius) {
                    const influence = 1 - (distance / fluctuation.radius);
                    cell.velocity = Vector2.multiply(cell.velocity, 
                        1 + (fluctuation.timeMultiplier - 1) * influence);
                }
            });
        });
    });
};

GameEngine.prototype.updateQuantumEntanglement = function(event, deltaTime) {
    if (!event.entangledPairs) return;
    
    // Synchronize movement between entangled players
    event.entangledPairs.forEach(pair => {
        const [player1, player2] = pair;
        if (player1.isAlive && player2.isAlive) {
            // Share velocity between entangled players
            player1.cells.forEach((cell1, index) => {
                if (player2.cells[index]) {
                    const cell2 = player2.cells[index];
                    const avgVelocity = Vector2.multiply(
                        Vector2.add(cell1.velocity, cell2.velocity), 0.5);
                    cell1.velocity = avgVelocity;
                    cell2.velocity = avgVelocity;
                }
            });
        }
    });
};

GameEngine.prototype.updateChronoPlague = function(event, deltaTime) {
    if (!event.infectedPlayers) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    // Spread infection
    event.infectedPlayers.forEach(infected => {
        if (!infected.isAlive) return;
        
        allPlayers.forEach(player => {
            if (player === infected || event.infectedPlayers.has(player)) return;
            
            const distance = Vector2.distance(infected.getCenterPosition(), player.getCenterPosition());
            if (distance < event.plagueRadius && Math.random() < event.infectionChance) {
                event.infectedPlayers.add(player);
                player.plagueEffect = { massDecay: 0.998, visualEffect: true };
            }
        });
        
        // Apply plague effects
        if (infected.plagueEffect) {
            infected.cells.forEach(cell => {
                cell.mass *= infected.plagueEffect.massDecay;
                if (cell.mass < 15) {
                    cell.isAlive = false;
                }
            });
        }
    });
};

// Enhanced Creative Gameplay Events

// Quantum Split - Players split into quantum duplicates
GameEngine.prototype.createQuantumSplit = function(event) {
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    event.quantumDuplicates = [];
    
    allPlayers.forEach(player => {
        if (player.cells.length < GameConstants.MAX_CELLS / 2) {
            const duplicate = {
                originalPlayer: player,
                cells: player.cells.map(cell => ({
                    position: new Vector2(
                        cell.position.x + MathUtils.random(-100, 100),
                        cell.position.y + MathUtils.random(-100, 100)
                    ),
                    mass: cell.mass * 0.6,
                    radius: cell.radius * 0.8,
                    color: cell.color + '80', // Semi-transparent
                    isQuantum: true
                }))
            };
            event.quantumDuplicates.push(duplicate);
        }
    });
};

// Mass Vortex - Creates swirling mass collection zones
GameEngine.prototype.createMassVortex = function(event) {
    event.vortices = [];
    for (let i = 0; i < 3; i++) {
        const vortex = {
            position: new Vector2(
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING),
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING)
            ),
            radius: MathUtils.random(150, 250),
            strength: MathUtils.random(0.5, 1.5),
            rotationSpeed: MathUtils.random(0.5, 2.0)
        };
        event.vortices.push(vortex);
    }
};

// Chrono Explosion - Mass-based chain reaction
GameEngine.prototype.createChronoExplosion = function(event) {
    event.explosionCenters = [];
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    // Create explosion at largest player's position
    if (allPlayers.length > 0) {
        const largestPlayer = allPlayers.reduce((largest, current) => 
            current.getTotalMass() > largest.getTotalMass() ? current : largest
        );
        
        event.explosionCenters.push({
            position: largestPlayer.getCenterPosition(),
            radius: 300,
            force: largestPlayer.getTotalMass() * 0.1
        });
    }
};

// Reality Warp - Arena geometry changes
GameEngine.prototype.createRealityWarp = function(event) {
    event.warpActive = true;
    event.warpIntensity = 1.0;
    event.warpFrequency = 100; // milliseconds
    
    // Create warped zones where physics behave differently
    event.warpZones = [];
    for (let i = 0; i < 4; i++) {
        const warpZone = {
            position: new Vector2(
                MathUtils.random(GameConstants.ARENA_WIDTH * 0.2, GameConstants.ARENA_WIDTH * 0.8),
                MathUtils.random(GameConstants.ARENA_HEIGHT * 0.2, GameConstants.ARENA_HEIGHT * 0.8)
            ),
            radius: MathUtils.random(200, 300),
            effect: MathUtils.randomChoice(['gravity', 'time', 'mass', 'speed'])
        };
        event.warpZones.push(warpZone);
    }
};

// Phantom Invasion - Ghost players appear and hunt
GameEngine.prototype.createPhantomInvasion = function(event) {
    event.phantoms = [];
    const phantomCount = Math.min(8, Math.floor(this.aiPlayers.length * 0.5));
    
    for (let i = 0; i < phantomCount; i++) {
        const phantom = {
            position: new Vector2(
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_WIDTH - GameConstants.ARENA_PADDING),
                MathUtils.random(GameConstants.ARENA_PADDING, GameConstants.ARENA_HEIGHT - GameConstants.ARENA_PADDING)
            ),
            target: null,
            speed: MathUtils.random(120, 200),
            radius: MathUtils.random(20, 35),
            damage: MathUtils.random(3, 8),
            behavior: MathUtils.randomChoice(['hunter', 'stalker', 'berserker'])
        };
        event.phantoms.push(phantom);
    }
};

// Mass Fusion - Players can temporarily merge
GameEngine.prototype.createMassFusion = function(event) {
    event.fusionActive = true;
    event.fusionRadius = 150;
    event.fusionDuration = 10000; // 10 seconds
    
    // Create fusion zones where players can merge
    event.fusionZones = [];
    for (let i = 0; i < 5; i++) {
        const fusionZone = {
            position: new Vector2(
                MathUtils.random(GameConstants.ARENA_WIDTH * 0.1, GameConstants.ARENA_WIDTH * 0.9),
                MathUtils.random(GameConstants.ARENA_HEIGHT * 0.1, GameConstants.ARENA_HEIGHT * 0.9)
            ),
            radius: 100,
            active: true
        };
        event.fusionZones.push(fusionZone);
    }
};

// Temporal Paradox - Past and future collide
GameEngine.prototype.createTemporalParadox = function(event) {
    event.paradoxActive = true;
    event.timeAnomalies = [];
    
    // Create time anomalies that affect player movement
    for (let i = 0; i < 6; i++) {
        const anomaly = {
            position: new Vector2(
                MathUtils.random(GameConstants.ARENA_WIDTH * 0.15, GameConstants.ARENA_WIDTH * 0.85),
                MathUtils.random(GameConstants.ARENA_HEIGHT * 0.15, GameConstants.ARENA_HEIGHT * 0.85)
            ),
            radius: MathUtils.random(120, 180),
            effect: MathUtils.randomChoice(['slow', 'fast', 'reverse', 'chaos']),
            intensity: MathUtils.random(0.5, 2.0)
        };
        event.timeAnomalies.push(anomaly);
    }
};

// Quantum Entanglement Network - Players linked in complex ways
GameEngine.prototype.createQuantumEntanglementNetwork = function(event) {
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    event.entanglementGroups = [];
    
    // Create groups of 3-4 entangled players
    const groupSize = MathUtils.random(3, 4);
    for (let i = 0; i < allPlayers.length; i += groupSize) {
        const group = allPlayers.slice(i, i + groupSize);
        if (group.length >= 2) {
            event.entanglementGroups.push({
                players: group,
                linkStrength: MathUtils.random(0.3, 0.8),
                sharedAbilities: MathUtils.randomChoice(['speed', 'mass', 'vision', 'stealth'])
            });
        }
    }
};

// Chrono Storm - Dynamic weather-like effects
GameEngine.prototype.createChronoStorm = function(event) {
    event.stormActive = true;
    event.stormIntensity = 1.0;
    event.stormPatterns = [];
    
    // Create different storm patterns
    const patterns = ['cyclone', 'lightning', 'rain', 'wind', 'fog'];
    patterns.forEach(pattern => {
        event.stormPatterns.push({
            type: pattern,
            position: new Vector2(
                MathUtils.random(0, GameConstants.ARENA_WIDTH),
                MathUtils.random(0, GameConstants.ARENA_HEIGHT)
            ),
            radius: MathUtils.random(300, 500),
            intensity: MathUtils.random(0.5, 1.5)
        });
    });
};

// Update methods for new events
GameEngine.prototype.updateQuantumSplit = function(event, deltaTime) {
    if (!event.quantumDuplicates) return;
    
    event.quantumDuplicates.forEach(duplicate => {
        if (duplicate.originalPlayer && duplicate.originalPlayer.isAlive) {
            // Update duplicate positions and behaviors
            duplicate.cells.forEach((duplicateCell, index) => {
                if (duplicate.originalPlayer.cells[index]) {
                    const originalCell = duplicate.originalPlayer.cells[index];
                    // Mirror some of the original's behavior
                    duplicateCell.position.x = originalCell.position.x + MathUtils.random(-50, 50);
                    duplicateCell.position.y = originalCell.position.y + MathUtils.random(-50, 50);
                }
            });
        }
    });
};

GameEngine.prototype.updateMassVortex = function(event, deltaTime) {
    if (!event.vortices) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    event.vortices.forEach(vortex => {
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const distance = Vector2.distance(vortex.position, cell.position);
                if (distance < vortex.radius) {
                    // Apply vortex force
                    const direction = Vector2.subtract(vortex.position, cell.position);
                    const force = (vortex.radius - distance) / vortex.radius * vortex.strength;
                    const normalizedDir = Vector2.normalize(direction);
                    
                    cell.position = Vector2.add(cell.position, 
                        Vector2.multiply(normalizedDir, force * deltaTime / 1000));
                }
            });
        });
    });
};

GameEngine.prototype.updateChronoExplosion = function(event, deltaTime) {
    if (!event.explosionCenters) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    event.explosionCenters.forEach(explosion => {
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const distance = Vector2.distance(explosion.position, cell.position);
                if (distance < explosion.radius) {
                    // Apply explosion force
                    const direction = Vector2.subtract(cell.position, explosion.position);
                    const force = (explosion.radius - distance) / explosion.radius * explosion.force;
                    const normalizedDir = Vector2.normalize(direction);
                    
                    cell.position = Vector2.add(cell.position, 
                        Vector2.multiply(normalizedDir, force * deltaTime / 1000));
                }
            });
        });
    });
};

GameEngine.prototype.updateRealityWarp = function(event, deltaTime) {
    if (!event.warpZones || !event.warpActive) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    event.warpZones.forEach(warpZone => {
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const distance = Vector2.distance(warpZone.position, cell.position);
                if (distance < warpZone.radius) {
                    // Apply warp effects
                    switch (warpZone.effect) {
                        case 'gravity':
                            cell.mass *= 1.001; // Mass increases in gravity zones
                            break;
                        case 'time':
                            // Time dilation effect
                            cell.velocity = Vector2.multiply(cell.velocity, 0.95);
                            break;
                        case 'mass':
                            cell.mass *= 0.999; // Mass decreases in mass zones
                            break;
                        case 'speed':
                            cell.velocity = Vector2.multiply(cell.velocity, 1.05);
                            break;
                    }
                    
                    // Update radius based on mass
                    cell.radius = GameUtils.calculateMassRadius(cell.mass);
                }
            });
        });
    });
};

GameEngine.prototype.updatePhantomInvasion = function(event, deltaTime) {
    if (!event.phantoms) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    event.phantoms.forEach(phantom => {
        // Update phantom behavior based on type
        switch (phantom.behavior) {
            case 'hunter':
                // Hunt the largest player
                let targetPlayer = null;
                let maxMass = 0;
                allPlayers.forEach(player => {
                    const mass = player.getTotalMass();
                    if (mass > maxMass) {
                        maxMass = mass;
                        targetPlayer = player;
                    }
                });
                if (targetPlayer) {
                    phantom.target = targetPlayer.getCenterPosition();
                }
                break;
                
            case 'stalker':
                // Stalk the closest player
                let closestPlayer = null;
                let minDistance = Infinity;
                allPlayers.forEach(player => {
                    const distance = Vector2.distance(phantom.position, player.getCenterPosition());
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPlayer = player;
                    }
                });
                if (closestPlayer) {
                    phantom.target = closestPlayer.getCenterPosition();
                }
                break;
                
            case 'berserker':
                // Random movement with high damage
                if (!phantom.target || Math.random() < 0.1) {
                    phantom.target = new Vector2(
                        MathUtils.random(0, GameConstants.ARENA_WIDTH),
                        MathUtils.random(0, GameConstants.ARENA_HEIGHT)
                    );
                }
                break;
        }
        
        // Move phantom towards target
        if (phantom.target) {
            const direction = Vector2.subtract(phantom.target, phantom.position);
            const distance = Vector2.magnitude(direction);
            
            if (distance > 10) {
                const normalizedDir = Vector2.normalize(direction);
                phantom.position = Vector2.add(phantom.position, 
                    Vector2.multiply(normalizedDir, phantom.speed * deltaTime / 1000));
            }
        }
        
        // Check for collisions with players
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const distance = Vector2.distance(phantom.position, cell.position);
                if (distance < phantom.radius + cell.radius) {
                    // Apply damage
                    cell.mass = Math.max(10, cell.mass - phantom.damage);
                    if (cell.mass < 15) {
                        cell.isAlive = false;
                    }
                }
            });
        });
    });
};

GameEngine.prototype.updateMassFusion = function(event, deltaTime) {
    if (!event.fusionZones || !event.fusionActive) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    event.fusionZones.forEach(fusionZone => {
        if (!fusionZone.active) return;
        
        // Check for players in fusion zone
        const playersInZone = allPlayers.filter(player => {
            const distance = Vector2.distance(fusionZone.position, player.getCenterPosition());
            return distance < fusionZone.radius;
        });
        
        // Allow fusion between players in the same zone
        if (playersInZone.length >= 2) {
            for (let i = 0; i < playersInZone.length - 1; i++) {
                for (let j = i + 1; j < playersInZone.length; j++) {
                    const player1 = playersInZone[i];
                    const player2 = playersInZone[j];
                    
                    // Check if they can fuse (close enough and not at max cells)
                    const distance = Vector2.distance(player1.getCenterPosition(), player2.getCenterPosition());
                    if (distance < 50 && player1.cells.length + player2.cells.length <= GameConstants.MAX_CELLS) {
                        // Perform fusion
                        player2.cells.forEach(cell => {
                            cell.position = Vector2.add(cell.position, 
                                Vector2.multiply(Vector2.normalize(
                                    Vector2.subtract(player1.getCenterPosition(), player2.getCenterPosition())
                                ), 20));
                            player1.cells.push(cell);
                        });
                        
                        // Remove fused player
                        player2.die();
                        
                        // Deactivate fusion zone temporarily
                        fusionZone.active = false;
                        setTimeout(() => {
                            fusionZone.active = true;
                        }, 5000);
                    }
                }
            }
        }
    });
};

GameEngine.prototype.updateTemporalParadox = function(event, deltaTime) {
    if (!event.timeAnomalies || !event.paradoxActive) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    event.timeAnomalies.forEach(anomaly => {
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const distance = Vector2.distance(anomaly.position, cell.position);
                if (distance < anomaly.radius) {
                    // Apply time anomaly effects
                    const influence = 1 - (distance / anomaly.radius);
                    
                    switch (anomaly.effect) {
                        case 'slow':
                            cell.velocity = Vector2.multiply(cell.velocity, 1 - influence * 0.5);
                            break;
                        case 'fast':
                            cell.velocity = Vector2.multiply(cell.velocity, 1 + influence * 0.5);
                            break;
                        case 'reverse':
                            cell.velocity = Vector2.multiply(cell.velocity, -0.5);
                            break;
                        case 'chaos':
                            // Random velocity changes
                            if (Math.random() < 0.1) {
                                cell.velocity = Vector2.fromAngle(
                                    Math.random() * Math.PI * 2,
                                    MathUtils.random(50, 200)
                                );
                            }
                            break;
                    }
                }
            });
        });
    });
};

GameEngine.prototype.updateQuantumEntanglementNetwork = function(event, deltaTime) {
    if (!event.entanglementGroups) return;
    
    event.entanglementGroups.forEach(group => {
        if (group.players.length < 2) return;
        
        // Apply shared abilities between entangled players
        group.players.forEach(player => {
            if (!player.isAlive) return;
            
            switch (group.sharedAbilities) {
                case 'speed':
                    player.cells.forEach(cell => {
                        cell.velocity = Vector2.multiply(cell.velocity, 1 + group.linkStrength * 0.2);
                    });
                    break;
                case 'mass':
                    player.cells.forEach(cell => {
                        cell.mass *= 1 + group.linkStrength * 0.01;
                        cell.radius = GameUtils.calculateMassRadius(cell.mass);
                    });
                    break;
                case 'vision':
                    // Enhanced vision range (implement in rendering)
                    player.visionRange = 1 + group.linkStrength * 0.5;
                    break;
                case 'stealth':
                    // Reduced visibility to other players
                    player.stealthLevel = group.linkStrength;
                    break;
            }
        });
    });
};

GameEngine.prototype.updateChronoStorm = function(event, deltaTime) {
    if (!event.stormPatterns || !event.stormActive) return;
    
    const allPlayers = [this.player, ...this.aiPlayers].filter(p => p && p.isAlive);
    
    event.stormPatterns.forEach(pattern => {
        allPlayers.forEach(player => {
            player.cells.forEach(cell => {
                const distance = Vector2.distance(pattern.position, cell.position);
                if (distance < pattern.radius) {
                    // Apply storm effects
                    const influence = 1 - (distance / pattern.radius);
                    
                    switch (pattern.type) {
                        case 'cyclone':
                            // Circular movement
                            const angle = Math.atan2(cell.position.y - pattern.position.y, 
                                                   cell.position.x - pattern.position.x);
                            const newAngle = angle + pattern.intensity * deltaTime / 1000;
                            const radius = distance;
                            cell.position.x = pattern.position.x + Math.cos(newAngle) * radius;
                            cell.position.y = pattern.position.y + Math.sin(newAngle) * radius;
                            break;
                            
                        case 'lightning':
                            // Random teleportation
                            if (Math.random() < influence * 0.01) {
                                cell.position = new Vector2(
                                    MathUtils.random(0, GameConstants.ARENA_WIDTH),
                                    MathUtils.random(0, GameConstants.ARENA_HEIGHT)
                                );
                            }
                            break;
                            
                        case 'rain':
                            // Mass loss
                            cell.mass *= 1 - influence * 0.001;
                            break;
                            
                        case 'wind':
                            // Push in random direction
                            const windForce = Vector2.fromAngle(
                                Math.random() * Math.PI * 2,
                                pattern.intensity * 100
                            );
                            cell.position = Vector2.add(cell.position, 
                                Vector2.multiply(windForce, deltaTime / 1000));
                            break;
                            
                        case 'fog':
                            // Reduced visibility and speed
                            cell.velocity = Vector2.multiply(cell.velocity, 1 - influence * 0.3);
                            break;
                    }
                }
            });
        });
    });
};