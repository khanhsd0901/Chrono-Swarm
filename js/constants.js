// Game Constants for Chrono-Swarm
const GameConstants = {
  // Arena constants
  ARENA_WIDTH: 6000,
  ARENA_HEIGHT: 6000,
  ARENA_PADDING: 100,

  // Player constants
  INITIAL_MASS: 20,
  MIN_CELL_MASS: 10,
  MAX_CELLS: 16,
  MIN_SPLIT_MASS: 35,
  MAX_SPLIT_SPEED: 8,
  MIN_EJECT_MASS: 35,
  EJECT_LOSS: 18,
  EJECT_SIZE: 4,
  RECOMBINE_TIME: 3000,
  FRICTION: 0.98,

  // Game balance
  MAX_AI_PLAYERS: 25,
  MAX_MATTER_COUNT: 800,
  MATTER_SPAWN_RATE: 2.0,
  RIFT_COUNT: 5,
  RIFT_MIN_RADIUS: 20,
  RIFT_MAX_RADIUS: 30,

  // Ability unlock levels
  UNLOCK_LEVELS: {
    ECHO: 5,
    REWIND: 15,
    STASIS: 1,
  },

  // Ability constants
  STASIS_FIELD_DURATION: 5000,
  STASIS_FIELD_RADIUS: 150,
  STASIS_FIELD_COOLDOWN: 12000,
  STASIS_FIELD_COST: 0.15,

  ECHO_DURATION: 3000,
  ECHO_COOLDOWN: 20000,
  ECHO_COST: 0.1,

  REWIND_DISTANCE: 1500,
  REWIND_COOLDOWN: 30000,
  REWIND_COST: 0.2,

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

  // Zones configuration
  ZONES: {
    TEMPORAL_VORTEX: {
      name: "Temporal Vortex",
      color: "rgba(255, 0, 255, 0.2)",
      effects: {
        speedMultiplier: 1.5,
        matterSpawnRate: 2.0,
      },
    },
    CRYSTAL_FIELDS: {
      name: "Crystal Fields",
      color: "rgba(0, 255, 255, 0.2)",
      effects: {
        massMultiplier: 1.3,
        experienceMultiplier: 1.5,
      },
    },
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GameConstants };
}
