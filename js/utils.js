// Utility Functions for Chrono-Swarm
// Mathematical and general helper functions used throughout the game

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    static magnitude(v) {
        return Math.sqrt(v.x ** 2 + v.y ** 2);
    }

    static normalize(v) {
        const mag = Vector2.magnitude(v);
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(v.x / mag, v.y / mag);
    }

    static subtract(a, b) {
        return new Vector2(a.x - b.x, a.y - b.y);
    }

    static add(a, b) {
        return new Vector2(a.x + b.x, a.y + b.y);
    }

    static multiply(v, scalar) {
        return new Vector2(v.x * scalar, v.y * scalar);
    }

    static dot(a, b) {
        return a.x * b.x + a.y * b.y;
    }

    static angle(v) {
        return Math.atan2(v.y, v.x);
    }

    static fromAngle(angle, magnitude = 1) {
        return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
    }

    static lerp(a, b, t) {
        return new Vector2(
            a.x + (b.x - a.x) * t,
            a.y + (b.y - a.y) * t
        );
    }

    clone() {
        return new Vector2(this.x, this.y);
    }
}

class Color {
    constructor(r, g, b, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    toString() {
        return `rgba(${Math.floor(this.r)}, ${Math.floor(this.g)}, ${Math.floor(this.b)}, ${this.a})`;
    }

    static fromHex(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return new Color(r, g, b);
    }

    static lerp(a, b, t) {
        return new Color(
            a.r + (b.r - a.r) * t,
            a.g + (b.g - a.g) * t,
            a.b + (b.b - a.b) * t,
            a.a + (b.a - a.a) * t
        );
    }

    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }

    static hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        const r = Color.hueToRgb(p, q, h + 1/3);
        const g = Color.hueToRgb(p, q, h);
        const b = Color.hueToRgb(p, q, h - 1/3);

        return new Color(r * 255, g * 255, b * 255);
    }

    static hueToRgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
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
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
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
        return distance < (radius1 + radius2);
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
        return radians * 180 / Math.PI;
    }

    static radians(degrees) {
        return degrees * Math.PI / 180;
    }
}

class GameUtils {
    static formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return Math.floor(num).toString();
    }

    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    static generateName() {
        const adjectives = [
            'Swift', 'Quantum', 'Stellar', 'Cosmic', 'Temporal', 'Void', 'Chrono',
            'Plasma', 'Neon', 'Cyber', 'Crystal', 'Shadow', 'Prismatic', 'Digital',
            'Infinity', 'Nova', 'Flux', 'Apex', 'Omega', 'Alpha'
        ];
        
        const nouns = [
            'Hunter', 'Destroyer', 'Guardian', 'Warrior', 'Master', 'Entity',
            'Phantom', 'Seeker', 'Runner', 'Striker', 'Ghost', 'Storm', 'Force',
            'Blade', 'Core', 'Nexus', 'Pulse', 'Vortex', 'Echo', 'Swarm'
        ];

        const adj = MathUtils.randomChoice(adjectives);
        const noun = MathUtils.randomChoice(nouns);
        const num = MathUtils.randomInt(10, 999);
        
        return `${adj}${noun}${num}`;
    }

    static generateHSLColor(hue, saturation = 70, lightness = 50) {
        return Color.hslToRgb(hue, saturation, lightness);
    }

    static getPlayerColor(index) {
        const colors = [
            new Color(0, 255, 255),   // Cyan
            new Color(255, 0, 255),   // Magenta
            new Color(255, 255, 0),   // Yellow
            new Color(0, 255, 0),     // Green
            new Color(255, 100, 0),   // Orange
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
        // Base radius scales with square root of mass for realistic area scaling
        return Math.sqrt(mass / Math.PI) * 2;
    }

    static calculateSpeed(mass) {
        // Speed inversely proportional to mass, with a minimum speed
        const baseSpeed = 150;
        const minSpeed = 30;
        const speed = baseSpeed / Math.sqrt(mass / 100);
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
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
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
            console.warn('Failed to save to localStorage:', e);
            return false;
        }
    }

    static loadFromLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
            return defaultValue;
        }
    }

    static removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('Failed to remove from localStorage:', e);
            return false;
        }
    }
}

// Constants used throughout the game
const GameConstants = {
    // Arena settings
    ARENA_WIDTH: 4000,
    ARENA_HEIGHT: 4000,
    ARENA_PADDING: 100,

    // Player settings
    INITIAL_MASS: 100,
    MIN_SPLIT_MASS: 50,
    MAX_CELLS: 16,
    EJECT_MASS_AMOUNT: 10,
    EJECT_SPEED: 200,
    RECOMBINE_TIME: 15000, // 15 seconds

    // Physics
    FRICTION: 0.95,
    COLLISION_DAMPING: 0.8,

    // Chrono-Matter
    MATTER_SPAWN_RATE: 0.3, // per second
    MATTER_VALUE: 2,
    MATTER_RADIUS: 4,
    MAX_MATTER_COUNT: 800,

    // Temporal Rifts
    RIFT_COUNT: 15,
    RIFT_MIN_RADIUS: 30,
    RIFT_MAX_RADIUS: 60,
    RIFT_DAMAGE_THRESHOLD: 1.2, // Mass ratio to be damaged

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
    CAMERA_SMOOTH: 0.05,
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
            ORBIT: 17
        }
    },

    // Monetization
    AD_REWARD_SHARDS: 50,
    DAILY_AD_LIMIT: 5,

    // Game Balance
    AI_COUNT: 20,
    AI_DIFFICULTY_SCALING: 1.2,
    LEADERBOARD_SIZE: 10,

    // Colors
    COLORS: {
        PRIMARY: '#00FFFF',
        SECONDARY: '#FF00FF',
        ACCENT: '#FFFF00',
        SUCCESS: '#00FF00',
        DANGER: '#FF6B6B',
        WARNING: '#FFB84D',
        DARK: '#0A0A1A',
        LIGHT: '#FFFFFF'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Vector2, Color, MathUtils, GameUtils, GameConstants };
}