// Main Entry Point for Chrono-Swarm
// Initializes all systems and starts the application

class ChronoSwarmApp {
  constructor() {
    this.initialized = false;
    this.systemsReady = false;

    // System references
    this.audioSystem = null;
    this.particleSystem = null;
    this.uiSystem = null;
    this.gameEngine = null;
    this.playerProgression = null;
    this.storeSystem = null;
    this.abilityManager = null;

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }
  }

  async initialize() {
    try {
      // Initialize systems in order
      await this.initializeSystems();

      // Connect systems
      this.connectSystems();

      // Set up error handling
      this.setupErrorHandling();

      // Set up performance monitoring
      this.setupPerformanceMonitoring();

      // Mark as initialized
      this.initialized = true;
      this.systemsReady = true;

      console.log("✅ Chrono-Swarm initialized successfully!");

      // Show any startup notifications
      this.showStartupNotifications();
    } catch (error) {
      console.error("❌ Failed to initialize Chrono-Swarm:", error);
      this.handleInitializationError(error);
    }
  }

  async initializeSystems() {
    // 1. Audio System (first, as others may need it)
    this.audioSystem = window.audioSystem;

    // 2. Particle System
    this.particleSystem = window.particleSystem;

    // 3. Player Progression System
    this.playerProgression = new PlayerProgression();
    window.playerProgression = this.playerProgression;

    // 4. Store System
    this.storeSystem = window.storeSystem;
    if (this.storeSystem) {
      this.storeSystem.setPlayerProgression(this.playerProgression);
    }

    // 5. UI System
    this.uiSystem = window.uiSystem;

    // 6. Game Engine (last, as it depends on everything else)
    this.gameEngine = window.game;
    if (this.gameEngine) {
      // Update game engine with our progression system
      this.gameEngine.playerProgression = this.playerProgression;
      this.abilityManager = this.gameEngine.abilityManager;
      window.abilityManager = this.abilityManager;
    }
  }

  connectSystems() {
    // Connect progression to store
    if (this.storeSystem && this.playerProgression) {
      this.storeSystem.setPlayerProgression(this.playerProgression);
    }

    // Connect progression to game engine
    if (this.gameEngine && this.playerProgression) {
      this.gameEngine.playerProgression = this.playerProgression;
    }

    // Ensure global references are set
    window.playerProgression = this.playerProgression;
    window.abilityManager = this.abilityManager;
  }

  setupErrorHandling() {
    // Global error handler
    window.addEventListener("error", (event) => {
      console.error("💥 Global error:", event.error);
      this.handleError(event.error, "Global Error");
    });

    // Unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      console.error("💥 Unhandled promise rejection:", event.reason);
      this.handleError(event.reason, "Promise Rejection");
    });

    // Game-specific error boundaries
    this.setupGameErrorHandlers();
  }

  setupGameErrorHandlers() {
    // Wrap critical game functions with error handling
    if (this.gameEngine) {
      const originalUpdate = this.gameEngine.update.bind(this.gameEngine);
      this.gameEngine.update = (deltaTime) => {
        try {
          originalUpdate(deltaTime);
        } catch (error) {
          console.error("💥 Game update error:", error);
          this.handleError(error, "Game Update");
        }
      };

      const originalRender = this.gameEngine.render.bind(this.gameEngine);
      this.gameEngine.render = () => {
        try {
          originalRender();
        } catch (error) {
          console.error("💥 Game render error:", error);
          this.handleError(error, "Game Render");
        }
      };
    }
  }

  setupPerformanceMonitoring() {
    // Monitor frame rate
    let frameCount = 0;
    let lastFPSCheck = performance.now();

    const checkPerformance = () => {
      frameCount++;
      const now = performance.now();

      if (now - lastFPSCheck >= 5000) {
        // Check every 5 seconds
        const fps = (frameCount * 1000) / (now - lastFPSCheck);

        if (fps < 30) {
          console.warn("⚠️ Low FPS detected:", fps);
          this.handleLowPerformance(fps);
        }

        frameCount = 0;
        lastFPSCheck = now;
      }

      if (this.systemsReady) {
        requestAnimationFrame(checkPerformance);
      }
    };

    requestAnimationFrame(checkPerformance);

    // Monitor memory usage (if available)
    if (performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;

        if (usedMB > 100) {
          // Over 100MB
          console.warn(
            "⚠️ High memory usage:",
            `${usedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB`
          );
        }
      }, 30000); // Check every 30 seconds
    }
  }

  handleError(error, context) {
    // Handle null errors gracefully
    if (!error) {
      console.error(
        `💥 Error in ${context}: Unknown error (null or undefined)`
      );
      return;
    }

    // Log detailed error information
    console.error(`💥 Error in ${context}:`, {
      message: error.message || "Unknown error",
      stack: error.stack || "No stack trace available",
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Show user-friendly error message
    if (this.uiSystem) {
      this.uiSystem.showNotification(
        `An error occurred: ${error.message}`,
        "error"
      );
    }

    // Attempt recovery for specific error types
    this.attemptErrorRecovery(error, context);
  }

  attemptErrorRecovery(error, context) {
    switch (context) {
      case "Game Update":
      case "Game Render":
        // Try to pause and resume the game
        if (this.gameEngine) {
          console.log("🔄 Attempting game recovery...");
          this.gameEngine.isPaused = true;
          setTimeout(() => {
            this.gameEngine.isPaused = false;
            console.log("▶️ Game recovery attempted");
          }, 1000);
        }
        break;

      case "Audio Error":
        // Reinitialize audio system
        console.log("🔄 Attempting audio recovery...");
        if (this.audioSystem) {
          this.audioSystem.mute();
          setTimeout(() => {
            this.audioSystem.unmute();
          }, 2000);
        }
        break;
    }
  }

  handleLowPerformance(fps) {
    console.log(`🔧 Optimizing for low performance (${fps.toFixed(1)} FPS)...`);

    // Reduce particle count
    if (this.particleSystem) {
      const currentMax = this.particleSystem.maxParticles;
      this.particleSystem.maxParticles = Math.max(100, currentMax * 0.7);
      console.log(
        `🔧 Reduced max particles to ${this.particleSystem.maxParticles}`
      );
    }

    // Reduce AI count if possible
    if (this.gameEngine && this.gameEngine.aiPlayers.length > 10) {
      const toRemove = this.gameEngine.aiPlayers.length - 10;
      this.gameEngine.aiPlayers.splice(10, toRemove);
      console.log(`🔧 Reduced AI players by ${toRemove}`);
    }

    // Show performance warning to user
    if (this.uiSystem) {
      this.uiSystem.showNotification(
        "Performance optimized for your device",
        "info"
      );
    }
  }

  handleInitializationError(error) {
    // Show fallback error screen
    document.body.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #16213e 100%);
                color: white;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 2rem;
            ">
                <div>
                    <h1 style="color: #ff6b6b; margin-bottom: 1rem;">⚠️ Initialization Failed</h1>
                    <p style="margin-bottom: 1rem;">Chrono-Swarm failed to initialize properly.</p>
                    <p style="margin-bottom: 2rem; opacity: 0.7;">Error: ${error.message}</p>
                    <button onclick="location.reload()" style="
                        background: linear-gradient(45deg, #00ffff, #ff00ff);
                        border: none;
                        padding: 1rem 2rem;
                        border-radius: 8px;
                        color: black;
                        font-weight: bold;
                        cursor: pointer;
                    ">Reload Game</button>
                </div>
            </div>
        `;
  }

  showStartupNotifications() {
    // Check for first-time player
    const isFirstTime = !GameUtils.loadFromLocalStorage(
      "has_played_before",
      false
    );

    if (isFirstTime) {
      setTimeout(() => {
        if (this.uiSystem) {
          this.uiSystem.showNotification("Welcome to Chrono-Swarm! 🎮", "info");
        }
        GameUtils.saveToLocalStorage("has_played_before", true);
      }, 2000);
    }

    // Check for daily login bonus
    if (this.playerProgression) {
      const today = new Date().toDateString();
      const lastLogin = GameUtils.loadFromLocalStorage("last_login_date", "");

      if (lastLogin !== today) {
        setTimeout(() => {
          if (this.uiSystem) {
            this.uiSystem.showNotification(
              "Daily login bonus received! 🎁",
              "success"
            );
          }
          GameUtils.saveToLocalStorage("last_login_date", today);
        }, 3000);
      }
    }
  }

  // Public methods for external control
  getSystemStatus() {
    return {
      initialized: this.initialized,
      systemsReady: this.systemsReady,
      systems: {
        audio: !!this.audioSystem,
        particles: !!this.particleSystem,
        ui: !!this.uiSystem,
        game: !!this.gameEngine,
        progression: !!this.playerProgression,
        store: !!this.storeSystem,
        abilities: !!this.abilityManager,
      },
    };
  }

  restart() {
    console.log("🔄 Restarting Chrono-Swarm...");

    // Stop current game
    if (this.gameEngine) {
      this.gameEngine.endGame();
    }

    // Clear systems
    this.systemsReady = false;

    // Reinitialize
    setTimeout(() => {
      this.initialize();
    }, 1000);
  }

  destroy() {
    console.log("🛑 Shutting down Chrono-Swarm...");

    this.systemsReady = false;

    // Clean up systems
    if (this.gameEngine) {
      this.gameEngine.endGame();
    }

    if (this.audioSystem) {
      this.audioSystem.destroy();
    }

    if (this.particleSystem) {
      this.particleSystem.clear();
    }

    if (this.uiSystem) {
      this.uiSystem.destroy();
    }

    console.log("🛑 Chrono-Swarm shut down");
  }
}

// Global app instance
let chronoSwarmApp = null;

// Initialize app when script loads
(() => {
  console.log("🚀 Starting Chrono-Swarm initialization...");
  chronoSwarmApp = new ChronoSwarmApp();

  // Make app globally accessible for debugging
  window.chronoSwarmApp = chronoSwarmApp;

  // Add global key shortcuts for debugging
  document.addEventListener("keydown", (e) => {
    // Ctrl + R: Restart game
    if (e.ctrlKey && e.key === "r") {
      e.preventDefault();
      chronoSwarmApp.restart();
    }

    // F12: Show system status
    if (e.key === "F12") {
      e.preventDefault();
      console.log("System Status:", chronoSwarmApp.getSystemStatus());
    }
  });
})();

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ChronoSwarmApp };
}
