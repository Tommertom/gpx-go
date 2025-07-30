import { CONFIG } from "./modules/config.js";
import { StorageManager } from "./modules/storage.js";
import { MarkerFactory } from "./modules/markers.js";
import { PointFilter } from "./modules/pointFilter.js";
import { UIController } from "./modules/uiController.js";
import { LocationTracker } from "./modules/locationTracker.js";
import { GPXProcessor } from "./modules/gpxProcessor.js";

export class GPXApp {
  constructor() {
    this.jsonPointsData = null;
    this.initMap();
    this.initModules();
    this.initEventListeners();
    this.setupGpxButtons();
    this.initializeApp();
    this.loadInitialData();
  }

  initMap() {
    this.map = L.map("map").setView(
      CONFIG.MAP.DEFAULT_VIEW,
      CONFIG.MAP.DEFAULT_ZOOM
    );

    // Add tile layer
    L.tileLayer(CONFIG.MAP.TILE_URL, {
      attribution: CONFIG.MAP.ATTRIBUTION,
    }).addTo(this.map);
  }

  initModules() {
    this.storage = new StorageManager();
    this.ui = new UIController();
    this.markers = new MarkerFactory(this.map);
    this.pointFilter = new PointFilter();
    this.locationTracker = new LocationTracker(this.map, this.markers, this.ui);
    this.gpxProcessor = new GPXProcessor(
      this.map,
      this.storage,
      this.markers,
      this.pointFilter,
      this.ui
    );
  }

  initEventListeners() {
    // GPX file input
    document.getElementById("gpxFile").addEventListener("change", (e) => {
      this.handleGpxFileLoad(e);
    });

    // Follow mode buttons
    const toggleFollow = document.getElementById("toggleFollow");
    if (toggleFollow) {
      toggleFollow.addEventListener("click", () => {
        this.locationTracker.toggleFollowMode();
      });
    }

    const toggleFollowMobile = document.getElementById("toggleFollowMobile");
    if (toggleFollowMobile) {
      toggleFollowMobile.addEventListener("click", () => {
        this.locationTracker.toggleFollowMode();
      });
    }
  }

  setupGpxButtons() {
    const gpxButton = document.getElementById("gpxButton");
    const gpxButtonMobile = document.getElementById("gpxButtonMobile");

    const handleLoadGpx = async () => {
      try {
        // Show loading state
        const loadingMessage = "Loading GPX files...";
        this.ui.showStatus(loadingMessage, 1000);

        // Check if there are stored GPX files
        const storedGpxFiles = await this.storage.getAllStoredGpxFiles();

        if (storedGpxFiles.length === 0) {
          // No stored files, show file upload dialog directly
          document.getElementById("gpxFile").click();
        } else {
          // Show selection dialog with stored files
          this.ui.showGpxSelectionDialog(
            storedGpxFiles,
            (filename) => this.loadStoredGpx(filename),
            () => document.getElementById("gpxFile").click(),
            (filename) => this.deleteGpxFile(filename)
          );
        }
      } catch (error) {
        console.error("Error in handleLoadGpx:", error);
        this.ui.showStatus("Error loading GPX files. Please try again.", 3000);

        // Fallback: try to open file dialog directly
        try {
          document.getElementById("gpxFile").click();
        } catch (fallbackError) {
          console.error("Fallback file dialog also failed:", fallbackError);
          this.ui.showStatus(
            "Error: Cannot open file dialog. Please refresh the page.",
            5000
          );
        }
      }
    };

    if (gpxButton) {
      gpxButton.addEventListener("click", () => {
        this.ui.handleGpxButtonClick(() => this.clearGpx(), handleLoadGpx);
      });
    }

    if (gpxButtonMobile) {
      gpxButtonMobile.addEventListener("click", () => {
        // Apply same protection to mobile button
        if (gpxButtonMobile.textContent === "Load GPX") {
          gpxButtonMobile.disabled = true;
          const originalText = gpxButtonMobile.textContent;
          gpxButtonMobile.textContent = "Loading...";

          Promise.resolve(handleLoadGpx()).finally(() => {
            setTimeout(() => {
              gpxButtonMobile.disabled = false;
              if (gpxButtonMobile.textContent === "Loading...") {
                gpxButtonMobile.textContent = originalText;
              }
            }, 500);
          });
        } else {
          this.clearGpx();
        }
      });
    }
  }

  async initializeApp() {
    try {
      // Ensure storage is initialized before proceeding
      const storageReady = await this.storage.ensureInitialized();
      if (!storageReady) {
        console.warn(
          "Storage initialization failed, some features may not work properly"
        );
        this.ui.showStatus(
          "Warning: Storage not available. Some features may not work.",
          5000
        );
      }

      // Check for saved GPX
      const savedGpx = await this.storage.loadGpx();
      if (!savedGpx) {
        this.ui.updateGpxButtonStates(false);
      }

      // Initialize compass display
      this.ui.initCompassDisplay();

      console.log("App initialization complete");
    } catch (error) {
      console.error("Error during app initialization:", error);
      this.ui.showStatus(
        "App initialization error. Some features may not work.",
        5000
      );
    }
  }

  async loadInitialData() {
    try {
      const response = await fetch("./fk.json");
      const data = await response.json();

      // Filter for points only
      const pointsOnly = data.result.filter(
        (item) => item.geom_type === "Point" || item.geom_point !== null
      );

      // Store for later filtering against GPX
      this.jsonPointsData = pointsOnly;

      // Load saved GPX if available
      this.loadSavedGpx();
    } catch (error) {
      console.error("Error loading fk.json:", error);
      // Still try to load saved GPX even if fk.json fails
      this.loadSavedGpx();
    }
  }

  async loadSavedGpx() {
    try {
      const savedGpx = await this.storage.loadGpx();
      if (savedGpx) {
        console.log("Loading saved GPX from IndexedDB:", savedGpx.filename);
        this.ui.updateGpxButtonStates(true);
        this.gpxProcessor.processGpxContent(
          savedGpx.content,
          savedGpx.filename,
          this.jsonPointsData
        );
      } else {
        this.ui.updateGpxButtonStates(false);
      }
    } catch (error) {
      console.error("Error loading saved GPX:", error);
      this.ui.updateGpxButtonStates(false);
      this.ui.showStatus("Error loading saved GPX file", 3000);
    }
  }

  async loadStoredGpx(filename) {
    const gpxData = await this.storage.loadGpxByFilename(filename);
    if (gpxData) {
      console.log("Loading stored GPX:", filename);
      this.ui.showStatus(`Loading ${filename}...`, 2000);

      // Set this as the current GPX file using storage
      await this.storage.saveGpx(gpxData.content, filename);

      this.ui.updateGpxButtonStates(true);

      // Add a small delay to ensure the loading message is visible
      setTimeout(() => {
        this.gpxProcessor.processGpxContent(
          gpxData.content,
          gpxData.filename,
          this.jsonPointsData
        );
      }, 100);
    } else {
      this.ui.showStatus(`Error: Could not load ${filename}`, 3000);
    }
  }

  async deleteGpxFile(filename) {
    try {
      const success = await this.storage.deleteGpxFile(filename);
      if (success) {
        this.ui.showStatus(`Deleted ${filename}`, 2000);

        // If this was the currently loaded GPX file, clear the map
        const currentGpxFilename = await this.storage.getCurrentGpxFilename();
        if (!currentGpxFilename || currentGpxFilename === filename) {
          await this.clearGpx();
        }

        return true;
      } else {
        this.ui.showStatus(`Error: Could not delete ${filename}`, 3000);
        return false;
      }
    } catch (error) {
      console.error("Error deleting GPX file:", error);
      this.ui.showStatus(`Error: Could not delete ${filename}`, 3000);
      return false;
    }
  }

  handleGpxFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.ui.showStatus("Loading GPX file...", 1000);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const gpxText = event.target.result;

      // Save to IndexedDB
      await this.storage.saveGpx(gpxText, file.name);

      // Process the GPX content
      this.gpxProcessor.processGpxContent(
        gpxText,
        file.name,
        this.jsonPointsData
      );
    };
    reader.readAsText(file);
  }

  async clearGpx() {
    try {
      await this.storage.clearGpx();

      if (window.gpxLayer) {
        this.map.removeLayer(window.gpxLayer);
        window.gpxLayer = null;
      }

      // Clear all waypoint markers
      this.markers.clearWaypointMarkers();

      // Clear the file input
      this.ui.clearFileInput();

      // Update buttons
      this.ui.updateGpxButtonStates(false);
      this.ui.showStatus("GPX and waypoints cleared");
    } catch (error) {
      console.error("Error clearing GPX:", error);
      this.ui.showStatus("Error clearing GPX");
    }
  }
}

// Initialize the app - ES6 modules load after DOM is ready
window.gpxApp = new GPXApp();
