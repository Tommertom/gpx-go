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
    document.getElementById("toggleFollow").addEventListener("click", () => {
      this.locationTracker.toggleFollowMode();
    });
    document
      .getElementById("toggleFollowMobile")
      .addEventListener("click", () => {
        this.locationTracker.toggleFollowMode();
      });

    // Center map button
    document.getElementById("centerMap").addEventListener("click", () => {
      this.handleCenterMap();
    });
  }

  setupGpxButtons() {
    const gpxButton = document.getElementById("gpxButton");
    const gpxButtonMobile = document.getElementById("gpxButtonMobile");

    if (gpxButton) {
      gpxButton.addEventListener("click", () => {
        this.ui.handleGpxButtonClick(
          () => this.clearGpx(),
          () => document.getElementById("gpxFile").click()
        );
      });
    }

    if (gpxButtonMobile) {
      gpxButtonMobile.addEventListener("click", () => {
        this.ui.handleGpxButtonClick(
          () => this.clearGpx(),
          () => document.getElementById("gpxFile").click()
        );
      });
    }
  }

  initializeApp() {
    // Clean up old GPX files
    this.storage.cleanup();

    // Check for saved GPX
    const savedGpx = this.storage.loadGpx();
    if (!savedGpx) {
      this.ui.updateGpxButtonStates(false);
    }

    // Initialize compass display
    this.ui.initCompassDisplay();
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

  loadSavedGpx() {
    const savedGpx = this.storage.loadGpx();
    if (savedGpx) {
      console.log("Loading saved GPX from localStorage:", savedGpx.filename);
      this.ui.updateGpxButtonStates(true);
      this.gpxProcessor.processGpxContent(
        savedGpx.content,
        savedGpx.filename,
        this.jsonPointsData
      );
    } else {
      this.ui.updateGpxButtonStates(false);
    }
  }

  handleGpxFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.ui.showStatus("Loading GPX file...", 1000);

    const reader = new FileReader();
    reader.onload = (event) => {
      const gpxText = event.target.result;

      // Save to localStorage
      this.storage.saveGpx(gpxText, file.name);

      // Process the GPX content
      this.gpxProcessor.processGpxContent(
        gpxText,
        file.name,
        this.jsonPointsData
      );
    };
    reader.readAsText(file);
  }

  clearGpx() {
    try {
      this.storage.clearGpx();

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

  handleCenterMap() {
    if (this.locationTracker.centerOnLocation()) {
      return;
    } else if (window.gpxLayer) {
      this.map.fitBounds(window.gpxLayer.getBounds());
      this.ui.showStatus("Centered on GPX route");
    } else if (!this.locationTracker.getFollowMode()) {
      this.ui.showStatus("Enable follow mode to track your location");
    } else {
      this.ui.showStatus("No location or route to center on");
    }
  }
}

// Initialize the app - ES6 modules load after DOM is ready
window.gpxApp = new GPXApp();
