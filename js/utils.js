<<<<<<< HEAD
=======
// Utility Functions for Chrono-Swarm
// Mathematical and general helper functions used throughout the game

class Vector2 {
  constructor(x = 0, y = 0) {
    // Validate and sanitize input parameters
    this.x = typeof x === "number" && !isNaN(x) ? x : 0;
    this.y = typeof y === "number" && !isNaN(y) ? y : 0;
  }

  static distance(a, b) {
    // Validate input vectors
    if (!a || !b || typeof a.x !== "number" || typeof b.x !== "number") {
      console.warn("Vector2.distance: Invalid vectors provided");
      return 0;
    }
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  static magnitude(v) {
    // Validate input vector
    if (!v || typeof v.x !== "number" || typeof v.y !== "number") {
      console.warn("Vector2.magnitude: Invalid vector provided");
      return 0;
    }
    return Math.sqrt(v.x ** 2 + v.y ** 2);
  }

  static normalize(v) {
    // Validate input vector
    if (!v || typeof v.x !== "number" || typeof v.y !== "number") {
      console.warn("Vector2.normalize: Invalid vector provided");
      return new Vector2(0, 0);
    }
    const mag = Vector2.magnitude(v);
    if (mag === 0) return new Vector2(0, 0);
    return new Vector2(v.x / mag, v.y / mag);
  }

  static subtract(a, b) {
    // Validate input vectors
    if (!a || !b || typeof a.x !== "number" || typeof b.x !== "number") {
      console.warn("Vector2.subtract: Invalid vectors provided");
      return new Vector2(0, 0);
    }
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  static add(a, b) {
    // Validate input vectors
    if (!a || !b || typeof a.x !== "number" || typeof b.x !== "number") {
      console.warn("Vector2.add: Invalid vectors provided");
      return new Vector2(0, 0);
    }
    return new Vector2(a.x + b.x, a.y + b.y);
  }

  static multiply(v, scalar) {
    // Validate input vector and scalar
    if (!v || typeof v.x !== "number" || typeof v.y !== "number") {
      console.warn("Vector2.multiply: Invalid vector provided");
      return new Vector2(0, 0);
    }
    if (typeof scalar !== "number" || isNaN(scalar)) {
      console.warn("Vector2.multiply: Invalid scalar provided");
      scalar = 0;
    }
    return new Vector2(v.x * scalar, v.y * scalar);
  }

  static dot(a, b) {
    // Validate input vectors
    if (!a || !b || typeof a.x !== "number" || typeof b.x !== "number") {
      console.warn("Vector2.dot: Invalid vectors provided");
      return 0;
    }
    return a.x * b.x + a.y * b.y;
  }

  static angle(v) {
    // Validate input vector
    if (!v || typeof v.x !== "number" || typeof v.y !== "number") {
      console.warn("Vector2.angle: Invalid vector provided");
      return 0;
    }
    return Math.atan2(v.y, v.x);
  }

  static fromAngle(angle, magnitude = 1) {
    // Validate input parameters
    if (typeof angle !== "number" || isNaN(angle)) {
      console.warn("Vector2.fromAngle: Invalid angle provided");
      angle = 0;
    }
    if (typeof magnitude !== "number" || isNaN(magnitude)) {
      console.warn("Vector2.fromAngle: Invalid magnitude provided");
      magnitude = 1;
    }
    return new Vector2(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude
    );
  }

  static lerp(a, b, t) {
    // Validate input vectors
    if (!a || !b || typeof a.x !== "number" || typeof b.x !== "number") {
      console.warn("Vector2.lerp: Invalid vectors provided");
      return new Vector2(0, 0);
    }
    if (typeof t !== "number" || isNaN(t)) {
      console.warn("Vector2.lerp: Invalid interpolation value");
      t = 0;
    }
    return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  clone() {
    return new Vector2(this.x, this.y);
  }
}

>>>>>>> khanh
class Color {
  constructor(r, g, b, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  toString() {
    // Validate color components and provide defaults for invalid values
    const r =
      typeof this.r === "number" && !isNaN(this.r) ? Math.floor(this.r) : 0;
    const g =
      typeof this.g === "number" && !isNaN(this.g) ? Math.floor(this.g) : 0;
    const b =
      typeof this.b === "number" && !isNaN(this.b) ? Math.floor(this.b) : 0;
    const a = typeof this.a === "number" && !isNaN(this.a) ? this.a : 1;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  static fromHex(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return new Color(r, g, b);
  }

  static lerp(a, b, t) {
    // Validate input parameters
    if (!a || !b || typeof a !== "object" || typeof b !== "object") {
      console.warn("Color.lerp: Invalid color objects provided", { a, b });
      return new Color(255, 255, 255, 1); // Default white color
    }

    if (typeof t !== "number" || isNaN(t)) {
      console.warn("Color.lerp: Invalid interpolation value", t);
      t = 0;
    }

    // Ensure color components have valid defaults
    const aColor = {
      r: typeof a.r === "number" && !isNaN(a.r) ? a.r : 255,
      g: typeof a.g === "number" && !isNaN(a.g) ? a.g : 255,
      b: typeof a.b === "number" && !isNaN(a.b) ? a.b : 255,
      a: typeof a.a === "number" && !isNaN(a.a) ? a.a : 1,
    };

    const bColor = {
      r: typeof b.r === "number" && !isNaN(b.r) ? b.r : 255,
      g: typeof b.g === "number" && !isNaN(b.g) ? b.g : 255,
      b: typeof b.b === "number" && !isNaN(b.b) ? b.b : 255,
      a: typeof b.a === "number" && !isNaN(b.a) ? b.a : 1,
    };

    return new Color(
      aColor.r + (bColor.r - aColor.r) * t,
      aColor.g + (bColor.g - aColor.g) * t,
      aColor.b + (bColor.b - aColor.b) * t,
      aColor.a + (bColor.a - aColor.a) * t
    );
  }

  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }

  static hslToRgb(h, s, l) {
    // Validate input parameters
    h = typeof h === "number" && !isNaN(h) ? h : 0;
    s = typeof s === "number" && !isNaN(s) ? s : 0;
    l = typeof l === "number" && !isNaN(l) ? l : 50;

    h /= 360;
    s /= 100;
    l /= 100;

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const r = Color.hueToRgb(p, q, h + 1 / 3);
    const g = Color.hueToRgb(p, q, h);
    const b = Color.hueToRgb(p, q, h - 1 / 3);
<<<<<<< HEAD

    return new Color(r * 255, g * 255, b * 255);
  }

  static hueToRgb(p, q, t) {
    // Validate input parameters
    if (typeof p !== "number" || isNaN(p)) p = 0;
    if (typeof q !== "number" || isNaN(q)) q = 0;
    if (typeof t !== "number" || isNaN(t)) t = 0;

    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
=======

    return new Color(r * 255, g * 255, b * 255);
  }

  static hueToRgb(p, q, t) {
    // Validate input parameters
    if (typeof p !== "number" || isNaN(p)) p = 0;
    if (typeof q !== "number" || isNaN(q)) q = 0;
    if (typeof t !== "number" || isNaN(t)) t = 0;

    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
}

class MathUtils {
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  static inverseLerp(a, b, value) {
    return (value - a) / (b - a);
  }

  static map(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }

  static random(min, max) {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  static smoothstep(edge0, edge1, x) {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  static easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static easeIn(t) {
    return t * t;
  }

  static easeOut(t) {
    return t * (2 - t);
  }

  static circleIntersection(pos1, radius1, pos2, radius2) {
    const distance = Vector2.distance(pos1, pos2);
    return distance < radius1 + radius2;
  }

  static pointInCircle(point, center, radius) {
    return Vector2.distance(point, center) <= radius;
  }

  static angleBetween(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  static wrapAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  static degrees(radians) {
    return (radians * 180) / Math.PI;
  }

  static radians(degrees) {
    return (degrees * Math.PI) / 180;
  }
}

class GameUtils {
  static formatNumber(num) {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + "B";
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return Math.floor(num).toString();
  }

  static formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  static generateName() {
    const adjectives = [
      "Swift",
      "Quantum",
      "Stellar",
      "Cosmic",
      "Temporal",
      "Void",
      "Chrono",
      "Plasma",
      "Neon",
      "Cyber",
      "Crystal",
      "Shadow",
      "Prismatic",
      "Digital",
      "Infinity",
      "Nova",
      "Flux",
      "Apex",
      "Omega",
      "Alpha",
    ];

    const nouns = [
      "Hunter",
      "Destroyer",
      "Guardian",
      "Warrior",
      "Master",
      "Entity",
      "Phantom",
      "Seeker",
      "Runner",
      "Striker",
      "Ghost",
      "Storm",
      "Force",
      "Blade",
      "Core",
      "Nexus",
      "Pulse",
      "Vortex",
      "Echo",
      "Swarm",
    ];

    const adj = MathUtils.randomChoice(adjectives);
    const noun = MathUtils.randomChoice(nouns);
    const num = MathUtils.randomInt(10, 999);

    return `${adj}${noun}${num}`;
  }

  static generateHSLColor(hue, saturation = 70, lightness = 50) {
    // Validate parameters
    const safeHue = typeof hue === "number" && !isNaN(hue) ? hue % 360 : 0;
    const safeSaturation =
      typeof saturation === "number" && !isNaN(saturation)
        ? Math.max(0, Math.min(100, saturation))
        : 70;
    const safeLightness =
      typeof lightness === "number" && !isNaN(lightness)
        ? Math.max(0, Math.min(100, lightness))
        : 50;

    return Color.hslToRgb(safeHue, safeSaturation, safeLightness);
  }

  static getPlayerColor(index) {
    const colors = [
      new Color(0, 255, 255), // Cyan
      new Color(255, 0, 255), // Magenta
      new Color(255, 255, 0), // Yellow
      new Color(0, 255, 0), // Green
      new Color(255, 100, 0), // Orange
      new Color(100, 255, 255), // Light Cyan
      new Color(255, 100, 255), // Light Magenta
      new Color(100, 100, 255), // Light Blue
    ];
    return colors[index % colors.length];
  }

  static getRandomPlayerColor() {
    const hue = Math.random() * 360;
    return GameUtils.generateHSLColor(hue, 70, 60);
  }

  static calculateMassRadius(mass) {
    // Validate mass parameter
    if (typeof mass !== "number" || isNaN(mass) || mass <= 0) {
      console.warn(
        "GameUtils.calculateMassRadius: Invalid mass provided, using default"
      );
      mass = GameConstants.MIN_CELL_MASS || 10;
    }

    // Base radius scales with square root of mass for realistic area scaling
    return Math.sqrt(mass / Math.PI) * 2;
  }

  static calculateSpeed(mass) {
    // Improved speed calculation - less harsh penalty for large mass
    const baseSpeed = 3000; // Increased base speed by 3x (1000 -> 3000)
    const minSpeed = 900; // Increased minimum speed by 3x (300 -> 900)
    // Use a gentler curve that doesn't drop speed as dramatically
    const speed = baseSpeed / Math.pow(mass / 100, 0.3); // Changed from sqrt to power of 0.3
    return Math.max(speed, minSpeed);
  }

  static canConsume(predatorMass, preyMass) {
    // Predator must be significantly larger to consume prey
    const threshold = 1.15; // 15% larger minimum
    return predatorMass >= preyMass * threshold;
  }

  static calculateConsumptionGain(consumedMass) {
    // Gain 80% of consumed mass
    return consumedMass * 0.8;
  }

  static calculateXPGain(finalMass, survivalTime, kills = 0) {
    const massXP = Math.floor(finalMass * 0.1);
    const timeXP = Math.floor(survivalTime * 2);
    const killXP = kills * 50;
    return massXP + timeXP + killXP;
  }

  static getRequiredXP(level) {
    // Exponential XP requirement scaling
    return Math.floor(500 * Math.pow(1.5, level - 1));
  }

  static isUnlocked(level, unlockLevel) {
    return level >= unlockLevel;
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
      return false;
    }
  }

  static loadFromLocalStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn("Failed to load from localStorage:", e);
      return defaultValue;
    }
  }

  static removeFromLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn("Failed to remove from localStorage:", e);
      return false;
    }
>>>>>>> khanh
  }
}

// Constants used throughout the game
<<<<<<< HEAD
=======
const GameConstants = {
  // Arena settings - Significantly expanded
  ARENA_WIDTH: 12000, // Tripled from 4000
  ARENA_HEIGHT: 12000, // Tripled from 4000
  ARENA_PADDING: 200, // Increased padding

  // Chunk system for dynamic loading
  CHUNK_SIZE: 2000, // Size of each chunk (2000x2000)
  CHUNKS_X: 6, // Number of chunks horizontally (12000/2000)
  CHUNKS_Y: 6, // Number of chunks vertically (12000/2000)
  LOAD_RADIUS: 1, // Load chunks within this radius of player chunk
  UNLOAD_DISTANCE: 2, // Unload chunks beyond this distance
  CHUNK_UPDATE_INTERVAL: 1000, // How often to check chunk loading (ms)

  // Zone definitions for the expanded map
  ZONES: {
    CENTER: {
      name: "Central Nexus",
      bounds: { x: 5000, y: 5000, width: 2000, height: 2000 },
      color: "#00ffff",
      effects: { matterSpawnRate: 1.5, experienceBonus: 1.2 },
    },
    NORTH_FROZEN: {
      name: "Frozen Wastes",
      bounds: { x: 0, y: 0, width: 12000, height: 2000 },
      color: "#87ceeb",
      effects: { speedMultiplier: 0.7, matterSpawnRate: 0.8 },
    },
    SOUTH_VOLCANIC: {
      name: "Volcanic Depths",
      bounds: { x: 0, y: 10000, width: 12000, height: 2000 },
      color: "#ff4500",
      effects: { speedMultiplier: 1.3, damageMultiplier: 1.1 },
    },
    WEST_VOID: {
      name: "Void Expanse",
      bounds: { x: 0, y: 2000, width: 2000, height: 8000 },
      color: "#800080",
      effects: { matterSpawnRate: 0.5, voidDamage: true },
    },
    EAST_ENERGY: {
      name: "Energy Fields",
      bounds: { x: 10000, y: 2000, width: 2000, height: 8000 },
      color: "#ffff00",
      effects: { speedMultiplier: 1.2, energyRegeneration: true },
    },
    NORTHWEST_CHAOS: {
      name: "Chaos Realm",
      bounds: { x: 2000, y: 2000, width: 3000, height: 3000 },
      color: "#ff00ff",
      effects: { randomEvents: true, chaosMultiplier: 1.5 },
    },
    NORTHEAST_CRYSTAL: {
      name: "Crystal Gardens",
      bounds: { x: 7000, y: 2000, width: 3000, height: 3000 },
      color: "#00ff00",
      effects: { matterSpawnRate: 2.0, crystalBonus: true },
    },
    SOUTHWEST_SHADOW: {
      name: "Shadow Valley",
      bounds: { x: 2000, y: 7000, width: 3000, height: 3000 },
      color: "#696969",
      effects: { stealth: true, speedMultiplier: 1.1 },
    },
    SOUTHEAST_TEMPORAL: {
      name: "Temporal Nexus",
      bounds: { x: 7000, y: 7000, width: 3000, height: 3000 },
      color: "#ffd700",
      effects: { timeDistortion: true, abilityBonus: 1.3 },
    },
  },

  // Player settings
  INITIAL_MASS: 100,
  MIN_SPLIT_MASS: 50,
  MAX_CELLS: 16,
  EJECT_MASS_AMOUNT: 10,
  EJECT_SPEED: 600, // Increased by 3x
  RECOMBINE_TIME: 15000, // 15 seconds

  // Physics
  FRICTION: 0.97, // Reduced friction for smoother movement
  COLLISION_DAMPING: 0.85, // Slightly increased for better collisions

  // Chrono-Matter - Adjusted for larger map
  MATTER_SPAWN_RATE: 0.5, // Increased for larger map
  MATTER_VALUE: 2,
  MATTER_RADIUS: 4,
  MAX_MATTER_COUNT: 2000, // Increased for larger map

  // Temporal Rifts - Adjusted for larger map
  RIFT_COUNT: 40, // Increased for larger map
  RIFT_MIN_RADIUS: 30,
  RIFT_MAX_RADIUS: 60,
  RIFT_DAMAGE_THRESHOLD: 1.2, // Mass ratio to be damaged

  // AI Players - Increased for larger map
  AI_COUNT: 25, // Increased from default for larger arena

  // Abilities
  STASIS_FIELD_DURATION: 5000, // 5 seconds
  STASIS_FIELD_RADIUS: 150,
  STASIS_FIELD_COOLDOWN: 12000, // 12 seconds
  STASIS_FIELD_COST: 0.15, // 15% of current mass

  ECHO_DURATION: 3000, // 3 seconds
  ECHO_COOLDOWN: 20000, // 20 seconds
  ECHO_COST: 0.1, // 10% of current mass

  REWIND_DISTANCE: 1500, // 1.5 seconds back
  REWIND_COOLDOWN: 30000, // 30 seconds
  REWIND_COST: 0.2, // 20% of current mass

  // UI
  CAMERA_SMOOTH: 0.03, // Reduced for better tracking on larger map
  ZOOM_SMOOTH: 0.1,
  HUD_UPDATE_RATE: 30, // FPS

  // Performance
  TARGET_FPS: 60,
  MAX_PARTICLES: 500,
  PARTICLE_LIFETIME: 2000,

  // Progression
  UNLOCK_LEVELS: {
    ECHO: 5,
    REWIND: 15,
    FORMATIONS: {
      PINWHEEL: 3,
      PHALANX: 7,
      GRID: 12,
      ORBIT: 17,
    },
  },

  // Monetization
  AD_REWARD_SHARDS: 50,
  DAILY_AD_LIMIT: 5,

  // Game Balance
  AI_COUNT: 15,

  // Territory System
  TERRITORY_UPDATE_INTERVAL: 2000, // Update territory every 2 seconds

  // AI Settings
  AI_DIFFICULTY_SCALING: 1.2,
  LEADERBOARD_SIZE: 10,

  // Colors
  COLORS: {
    PRIMARY: "#00FFFF",
    SECONDARY: "#FF00FF",
    ACCENT: "#FFFF00",
    SUCCESS: "#00FF00",
    DANGER: "#FF6B6B",
    WARNING: "#FFB84D",
    DARK: "#0A0A1A",
    LIGHT: "#FFFFFF",
  },
};
>>>>>>> khanh

// Chunk Manager for dynamic world loading
class ChunkManager {
  constructor(game) {
    this.game = game;
    this.loadedChunks = new Map(); // Map of "x,y" -> ChunkData
    this.lastUpdateTime = 0;
    this.playerChunk = { x: 0, y: 0 };
  }

  // Convert world coordinates to chunk coordinates
  worldToChunk(worldX, worldY) {
    return {
      x: Math.floor(worldX / GameConstants.CHUNK_SIZE),
      y: Math.floor(worldY / GameConstants.CHUNK_SIZE),
    };
  }

  // Convert chunk coordinates to world coordinates (top-left corner)
  chunkToWorld(chunkX, chunkY) {
    return {
      x: chunkX * GameConstants.CHUNK_SIZE,
      y: chunkY * GameConstants.CHUNK_SIZE,
    };
  }

  // Get chunk key for Map storage
  getChunkKey(chunkX, chunkY) {
    return `${chunkX},${chunkY}`;
  }

  // Check if a chunk coordinate is valid
  isValidChunk(chunkX, chunkY) {
    return (
      chunkX >= 0 &&
      chunkX < GameConstants.CHUNKS_X &&
      chunkY >= 0 &&
      chunkY < GameConstants.CHUNKS_Y
    );
  }

  // Update which chunks should be loaded based on player position
  update(playerPosition, currentTime) {
    if (
      currentTime - this.lastUpdateTime <
      GameConstants.CHUNK_UPDATE_INTERVAL
    ) {
      return;
    }
    this.lastUpdateTime = currentTime;

    // Calculate current player chunk
    const newPlayerChunk = this.worldToChunk(
      playerPosition.x,
      playerPosition.y
    );

    // If player moved to a different chunk, update loading
    if (
      newPlayerChunk.x !== this.playerChunk.x ||
      newPlayerChunk.y !== this.playerChunk.y
    ) {
      this.playerChunk = newPlayerChunk;
      this.updateChunkLoading();
    }
  }

  // Load/unload chunks based on player position
  updateChunkLoading() {
    const { x: playerChunkX, y: playerChunkY } = this.playerChunk;

    // Determine which chunks should be loaded
    const shouldBeLoaded = new Set();
    for (
      let dx = -GameConstants.LOAD_RADIUS;
      dx <= GameConstants.LOAD_RADIUS;
      dx++
    ) {
      for (
        let dy = -GameConstants.LOAD_RADIUS;
        dy <= GameConstants.LOAD_RADIUS;
        dy++
      ) {
        const chunkX = playerChunkX + dx;
        const chunkY = playerChunkY + dy;
        if (this.isValidChunk(chunkX, chunkY)) {
          shouldBeLoaded.add(this.getChunkKey(chunkX, chunkY));
        }
      }
    }

    // Load new chunks
    for (const chunkKey of shouldBeLoaded) {
      if (!this.loadedChunks.has(chunkKey)) {
        const [chunkX, chunkY] = chunkKey.split(",").map(Number);
        this.loadChunk(chunkX, chunkY);
      }
    }

    // Unload distant chunks
    for (const [chunkKey, chunkData] of this.loadedChunks) {
      if (!shouldBeLoaded.has(chunkKey)) {
        const [chunkX, chunkY] = chunkKey.split(",").map(Number);
        const distance = Math.max(
          Math.abs(chunkX - playerChunkX),
          Math.abs(chunkY - playerChunkY)
        );
        if (distance > GameConstants.UNLOAD_DISTANCE) {
          this.unloadChunk(chunkX, chunkY);
        }
      }
    }
  }

  // Load a specific chunk
  loadChunk(chunkX, chunkY) {
    const chunkKey = this.getChunkKey(chunkX, chunkY);
    if (this.loadedChunks.has(chunkKey)) {
      return;
    }

    console.log(`Loading chunk (${chunkX}, ${chunkY})`);

    const worldPos = this.chunkToWorld(chunkX, chunkY);
    const chunkData = {
      x: chunkX,
      y: chunkY,
      worldX: worldPos.x,
      worldY: worldPos.y,
      chronoMatter: [],
      temporalRifts: [],
      loaded: true,
      loadTime: Date.now(),
    };

    // Generate chunk content
    this.generateChunkContent(chunkData);

    this.loadedChunks.set(chunkKey, chunkData);
  }

  // Unload a specific chunk
  unloadChunk(chunkX, chunkY) {
    const chunkKey = this.getChunkKey(chunkX, chunkY);
    const chunkData = this.loadedChunks.get(chunkKey);

    if (!chunkData) {
      return;
    }

    console.log(`Unloading chunk (${chunkX}, ${chunkY})`);

    // Remove chunk entities from game world
    this.removeChunkEntitiesFromGame(chunkData);

    this.loadedChunks.delete(chunkKey);
  }

  // Generate content for a chunk (matter, rifts, etc.)
  generateChunkContent(chunkData) {
    const { worldX, worldY } = chunkData;
    const chunkEndX = worldX + GameConstants.CHUNK_SIZE;
    const chunkEndY = worldY + GameConstants.CHUNK_SIZE;

    // Initialize arrays for exploration entities
    chunkData.explorationEntities = [];

    // Generate chrono matter for this chunk
    const matterPerChunk = Math.floor(
      GameConstants.MAX_MATTER_COUNT /
        (GameConstants.CHUNKS_X * GameConstants.CHUNKS_Y)
    );
    for (let i = 0; i < matterPerChunk; i++) {
      if (Math.random() < GameConstants.MATTER_SPAWN_RATE) {
        // Store matter data, let game create actual objects
        const matterData = {
          x: MathUtils.random(worldX + 50, chunkEndX - 50),
          y: MathUtils.random(worldY + 50, chunkEndY - 50),
          type: "chronoMatter",
        };
        chunkData.chronoMatter.push(matterData);
      }
    }

    // Generate temporal rifts for this chunk
    const riftsPerChunk = Math.floor(
      GameConstants.RIFT_COUNT /
        (GameConstants.CHUNKS_X * GameConstants.CHUNKS_Y)
    );
    for (let i = 0; i < riftsPerChunk; i++) {
      if (Math.random() < 0.8) {
        // Not every chunk needs rifts
        // Store rift data, let game create actual objects
        const riftData = {
          x: MathUtils.random(worldX + 100, chunkEndX - 100),
          y: MathUtils.random(worldY + 100, chunkEndY - 100),
          radius: MathUtils.random(
            GameConstants.RIFT_MIN_RADIUS,
            GameConstants.RIFT_MAX_RADIUS
          ),
          type: "temporalRift",
        };
        chunkData.temporalRifts.push(riftData);
      }
    }

    // Generate exploration entities (rare)
    // Ancient Artifacts (very rare, ~5% chance per chunk)
    if (Math.random() < 0.05) {
      const artifactData = {
        x: MathUtils.random(worldX + 150, chunkEndX - 150),
        y: MathUtils.random(worldY + 150, chunkEndY - 150),
        type: "ancientArtifact",
      };
      chunkData.explorationEntities.push(artifactData);
    }

    // Wormhole entrances (very rare, ~2% chance per chunk)
    if (Math.random() < 0.02) {
      // Only create entrance, exit will be in a different chunk
      const wormholeData = {
        x: MathUtils.random(worldX + 200, chunkEndX - 200),
        y: MathUtils.random(worldY + 200, chunkEndY - 200),
        type: "wormholeEntrance",
        needsExit: true,
      };
      chunkData.explorationEntities.push(wormholeData);
    }

    // Mystery zone spawn points (rare, ~8% chance per chunk)
    if (Math.random() < 0.08) {
      const mysteryZoneData = {
        x: MathUtils.random(worldX + 100, chunkEndX - 100),
        y: MathUtils.random(worldY + 100, chunkEndY - 100),
        type: "mysteryZoneSpawn",
        spawnChance: 0.3, // 30% chance to actually spawn when loaded
      };
      chunkData.explorationEntities.push(mysteryZoneData);
    }

    // Add chunk entities to game world
    this.addChunkEntitiesToGame(chunkData);
  }

  // Add chunk entities to the main game arrays
  addChunkEntitiesToGame(chunkData) {
    // Create actual entities from data and add to game
    if (this.game.chronoMatter && chunkData.chronoMatter) {
      chunkData.chronoMatter.forEach((matterData) => {
        if (
          matterData.type === "chronoMatter" &&
          typeof ChronoMatter !== "undefined"
        ) {
          const matter = new ChronoMatter(matterData.x, matterData.y);
          this.game.chronoMatter.push(matter);
          matterData.entity = matter; // Store reference for removal
        }
      });
    }
    if (this.game.temporalRifts && chunkData.temporalRifts) {
      chunkData.temporalRifts.forEach((riftData) => {
        if (
          riftData.type === "temporalRift" &&
          typeof TemporalRift !== "undefined"
        ) {
          const rift = new TemporalRift(
            riftData.x,
            riftData.y,
            riftData.radius
          );
          this.game.temporalRifts.push(rift);
          riftData.entity = rift; // Store reference for removal
        }
      });
    }

    // Add exploration entities
    if (chunkData.explorationEntities) {
      chunkData.explorationEntities.forEach((entityData) => {
        let entity = null;

        switch (entityData.type) {
          case "ancientArtifact":
            if (
              typeof AncientArtifact !== "undefined" &&
              this.game.ancientArtifacts
            ) {
              entity = new AncientArtifact(entityData.x, entityData.y);
              this.game.ancientArtifacts.push(entity);
            }
            break;

          case "wormholeEntrance":
            if (
              typeof Wormhole !== "undefined" &&
              this.game.wormholes &&
              entityData.needsExit
            ) {
              // Find a suitable exit location in a different loaded chunk
              const exitLocation = this.findWormholeExitLocation(entityData);
              if (exitLocation) {
                const entrance = new Wormhole(
                  entityData.x,
                  entityData.y,
                  exitLocation.x,
                  exitLocation.y
                );
                const exit = new Wormhole(
                  exitLocation.x,
                  exitLocation.y,
                  entityData.x,
                  entityData.y
                );
                this.game.wormholes.push(entrance, exit);
                entity = entrance;
                entityData.needsExit = false;
                entityData.exitEntity = exit;
              }
            }
            break;

          case "mysteryZoneSpawn":
            // Only spawn if random chance succeeds
            if (
              Math.random() < entityData.spawnChance &&
              typeof MysteryZone !== "undefined" &&
              this.game.mysteryZones
            ) {
              entity = new MysteryZone(entityData.x, entityData.y);
              this.game.mysteryZones.push(entity);
            }
            break;
        }

        if (entity) {
          entityData.entity = entity;
        }
      });
    }
  }

  findWormholeExitLocation(entranceData) {
    const loadedChunks = Array.from(this.loadedChunks.values());
    const minDistance = 1500; // Minimum distance between entrance and exit

    for (let attempts = 0; attempts < 10; attempts++) {
      const randomChunk =
        loadedChunks[Math.floor(Math.random() * loadedChunks.length)];
      if (!randomChunk) continue;

      const exitX = MathUtils.random(
        randomChunk.worldX + 200,
        randomChunk.worldX + GameConstants.CHUNK_SIZE - 200
      );
      const exitY = MathUtils.random(
        randomChunk.worldY + 200,
        randomChunk.worldY + GameConstants.CHUNK_SIZE - 200
      );

      const distance = Math.sqrt(
        Math.pow(exitX - entranceData.x, 2) +
          Math.pow(exitY - entranceData.y, 2)
      );

      if (distance >= minDistance) {
        return { x: exitX, y: exitY };
      }
    }

    return null; // Failed to find suitable exit location
  }

  // Remove chunk entities from the main game arrays
  removeChunkEntitiesFromGame(chunkData) {
    if (this.game.chronoMatter && chunkData.chronoMatter) {
      chunkData.chronoMatter.forEach((matterData) => {
        if (matterData.entity) {
          const index = this.game.chronoMatter.indexOf(matterData.entity);
          if (index > -1) {
            this.game.chronoMatter.splice(index, 1);
          }
        }
      });
    }
    if (this.game.temporalRifts && chunkData.temporalRifts) {
      chunkData.temporalRifts.forEach((riftData) => {
        if (riftData.entity) {
          const index = this.game.temporalRifts.indexOf(riftData.entity);
          if (index > -1) {
            this.game.temporalRifts.splice(index, 1);
          }
        }
      });
    }

    // Remove exploration entities
    if (chunkData.explorationEntities) {
      chunkData.explorationEntities.forEach((entityData) => {
        if (entityData.entity) {
          // Remove from appropriate game array
          switch (entityData.type) {
            case "ancientArtifact":
              if (this.game.ancientArtifacts) {
                const index = this.game.ancientArtifacts.indexOf(
                  entityData.entity
                );
                if (index > -1) {
                  this.game.ancientArtifacts.splice(index, 1);
                }
              }
              break;

            case "wormholeEntrance":
              if (this.game.wormholes) {
                const index = this.game.wormholes.indexOf(entityData.entity);
                if (index > -1) {
                  this.game.wormholes.splice(index, 1);
                }
                // Also remove exit if it exists
                if (entityData.exitEntity) {
                  const exitIndex = this.game.wormholes.indexOf(
                    entityData.exitEntity
                  );
                  if (exitIndex > -1) {
                    this.game.wormholes.splice(exitIndex, 1);
                  }
                }
              }
              break;

            case "mysteryZoneSpawn":
              if (this.game.mysteryZones) {
                const index = this.game.mysteryZones.indexOf(entityData.entity);
                if (index > -1) {
                  this.game.mysteryZones.splice(index, 1);
                }
              }
              break;
          }
        }
      });
    }
  }

  // Get all loaded chunks
  getLoadedChunks() {
    return Array.from(this.loadedChunks.values());
  }

  // Check if a position is in a loaded chunk
  isPositionLoaded(x, y) {
    const chunk = this.worldToChunk(x, y);
    return this.loadedChunks.has(this.getChunkKey(chunk.x, chunk.y));
  }

  // Get chunk info for debugging
  getChunkInfo() {
    return {
      playerChunk: this.playerChunk,
      loadedCount: this.loadedChunks.size,
      loadedChunks: Array.from(this.loadedChunks.keys()),
    };
  }
}

<<<<<<< HEAD
// Note: GameConstants is now defined in core.js

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    Color,
=======
// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    Vector2,
    Color,
    MathUtils,
    GameUtils,
    GameConstants,
>>>>>>> khanh
    ChunkManager,
  };
}
