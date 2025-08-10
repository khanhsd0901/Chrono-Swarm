// Core utilities and constants for Chrono-Swarm

/**
 * NEW: A simple Vector2 class for 2D math operations.
 * This class handles vector arithmetic safely.
 */
class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static add(v1, v2) {
    return new Vector2(v1.x + v2.x, v1.y + v2.y);
  }

  static subtract(v1, v2) {
    return new Vector2(v1.x - v2.x, v1.y - v2.y);
  }

  static multiply(v, scalar) {
    return new Vector2(v.x * scalar, v.y * scalar);
  }

  static magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  /**
   * Normalizes a vector.
   * IMPORTANT: Includes a check to prevent division by zero,
   * which was the likely cause of the "non-finite" error.
   */
  static normalize(v) {
    const mag = Vector2.magnitude(v);
    if (mag === 0) {
      return new Vector2(0, 0); // Return a zero vector if magnitude is 0
    }
    return new Vector2(v.x / mag, v.y / mag);
  }

  static distance(v1, v2) {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static fromAngle(angle, magnitude) {
    return new Vector2(
      magnitude * Math.cos(angle),
      magnitude * Math.sin(angle)
    );
  }

  /**
   * NEW: Linearly interpolates between two vectors.
   * @param {Vector2} v1 The starting vector.
   * @param {Vector2} v2 The ending vector.
   * @param {number} amount The interpolation amount (usually between 0 and 1).
   * @returns {Vector2} The interpolated vector.
   */
  static lerp(v1, v2, amount) {
    const clampedAmount = MathUtils.clamp(amount, 0, 1);
    const newX = MathUtils.lerp(v1.x, v2.x, clampedAmount);
    const newY = MathUtils.lerp(v1.y, v2.y, clampedAmount);
    return new Vector2(newX, newY);
  }

  clone() {
    return new Vector2(this.x, this.y);
  }
}

class MathUtils {
  static random(min, max) {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  static lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  /**
   * NEW: An easing function to create smooth animations.
   * This was missing and required by the StasisFieldEffect class.
   * @param {number} t Progress of the animation (0 to 1).
   * @returns {number} The eased value.
   */
  static easeOut(t) {
    return 1 - Math.pow(1 - t, 3); // Using a cubic ease-out function
  }
}

class GameUtils {
  static calculateSpeed(mass) {
    if (mass <= 0) return 8;
    return 8 / Math.pow(mass, 0.3);
  }

  static calculateMassRadius(mass) {
    return Math.sqrt(mass) * 4;
  }

  static canConsume(mass1, mass2) {
    return mass1 > mass2 * 1.1;
  }

  static getPlayerColor(index) {
    const colors = [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#ffff00",
      "#ff00ff",
      "#00ffff",
      "#ff8000",
      "#8000ff",
    ];
    return colors[index % colors.length];
  }

  static generateName() {
    const prefixes = ["Chrono", "Temporal", "Quantum", "Void", "Echo"];
    const suffixes = ["Hunter", "Seeker", "Walker", "Drifter", "Runner"];
    return MathUtils.randomChoice(prefixes) + MathUtils.randomChoice(suffixes);
  }

  static generateAIName() {
    const prefixes = ["AI", "Bot", "Drone", "Agent", "Unit"];
    const suffixes = ["Alpha", "Beta", "Gamma", "Delta", "Omega"];
    return (
      MathUtils.randomChoice(prefixes) + "-" + MathUtils.randomChoice(suffixes)
    );
  }

  static generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  static loadFromLocalStorage(key, defaultValue) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return defaultValue;
    }
  }

  static saveToLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  static calculateXPGain(mass, survivalTime, kills) {
    return Math.floor(mass * 0.1 + survivalTime * 0.5 + kills * 100);
  }

  static formatNumber(number, decimals = 0) {
    if (number === undefined || number === null) return "0";

    if (number >= 1e9) return (number / 1e9).toFixed(decimals) + "B";
    if (number >= 1e6) return (number / 1e6).toFixed(decimals) + "M";
    if (number >= 1e3) return (number / 1e3).toFixed(decimals) + "K";
    return number.toFixed(decimals);
  }

  static formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0s";
    if (seconds < 60) return seconds.toFixed(0) + "s";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  static sanitizeString(str) {
    if (!str) return "";
    return str.replace(/[<>&]/g, "").trim().slice(0, 20);
  }

  static generateHSLColor(h, s, l) {
    return Color.hslToRgb(h, s, l);
  }

  static getRequiredXP(level) {
    if (level <= 1) return 100;
    return Math.floor(100 * Math.pow(level, 1.5));
  }
}
