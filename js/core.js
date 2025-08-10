// Core utilities and constants for Chrono-Swarm

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

  static distance(v1, v2) {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static normalize(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y);
    if (length === 0) return new Vector2();
    return new Vector2(v.x / length, v.y / length);
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
}

class GameUtils {
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

  static loadFromLocalStorage(key, defaultValue) {
    const value = localStorage.getItem(key);
    return value !== null ? JSON.parse(value) : defaultValue;
  }

  static saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static calculateXPGain(mass, survivalTime, kills) {
    return Math.floor(mass * 0.1 + survivalTime * 0.5 + kills * 100);
  }

  static formatNumber(number, decimals = 0) {
    if (number === undefined || number === null) return "0";

    if (number >= 1e9) {
      return (number / 1e9).toFixed(decimals) + "B";
    }
    if (number >= 1e6) {
      return (number / 1e6).toFixed(decimals) + "M";
    }
    if (number >= 1e3) {
      return (number / 1e3).toFixed(decimals) + "K";
    }
    return number.toFixed(decimals);
  }

  static formatTime(seconds) {
    if (seconds < 60) {
      return seconds.toFixed(0) + "s";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  static sanitizeString(str) {
    if (!str) return "";
    return str.replace(/[<>&]/g, "").trim().slice(0, 20);
  }
}
