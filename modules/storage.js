import { CONFIG } from "./config.js";

export class StorageManager {
  constructor() {
    this.isInitialized = false;
    this.fallbackMode = false;
    this.initPromise = this.initialize();
  }

  async initialize() {
    try {
      // Ensure localforage is available
      if (typeof localforage === "undefined") {
        console.error("LocalForage is not available, using fallback mode");
        this.fallbackMode = true;
        this.isInitialized = true;
        return true;
      }

      // Configure localForage to use IndexedDB
      localforage.config({
        driver: localforage.INDEXEDDB,
        name: "GPXApp",
        version: 1.0,
        storeName: "gpx_data",
        description: "GPX files and waypoints storage",
      });

      // Test localforage availability with a simple operation
      await localforage.ready();

      // Additional iOS Safari fix: try a test operation with retry
      const testKey = "_test_key_";
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await localforage.setItem(testKey, "test");
          await localforage.removeItem(testKey);
          break; // Success, exit retry loop
        } catch (testError) {
          retryCount++;
          console.warn(
            `Storage test failed (attempt ${retryCount}/${maxRetries}):`,
            testError
          );

          if (retryCount >= maxRetries) {
            console.warn("IndexedDB failed, falling back to localStorage");
            this.fallbackMode = true;
            break;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * Math.pow(2, retryCount))
          );
        }
      }

      this.isInitialized = true;
      console.log(
        `StorageManager initialized successfully ${
          this.fallbackMode ? "(fallback mode)" : ""
        }`
      );
      return true;
    } catch (error) {
      console.error(
        "Error initializing StorageManager, using fallback mode:",
        error
      );
      this.fallbackMode = true;
      this.isInitialized = true;
      return true; // Return true even in fallback mode
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initPromise;
    }
    return this.isInitialized;
  }

  // Fallback methods for localStorage
  _setItemFallback(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("localStorage setItem failed:", error);
      throw error;
    }
  }

  _getItemFallback(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("localStorage getItem failed:", error);
      return null;
    }
  }

  _removeItemFallback(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("localStorage removeItem failed:", error);
      throw error;
    }
  }

  _getKeysFallback() {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error("localStorage keys failed:", error);
      return [];
    }
  }

  async saveGpx(gpxContent, filename) {
    try {
      if (!(await this.ensureInitialized())) {
        throw new Error("Storage not initialized");
      }

      const gpxData = {
        content: gpxContent,
        filename: filename,
        timestamp: Date.now(),
      };

      const gpxKey = `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}`;

      if (this.fallbackMode) {
        // Use localStorage fallback
        this._setItemFallback(gpxKey, gpxData);
        this._setItemFallback(CONFIG.STORAGE_KEYS.LAST_GPX, filename);
      } else {
        // Use IndexedDB via localforage
        await localforage.setItem(gpxKey, gpxData);
        await localforage.setItem(CONFIG.STORAGE_KEYS.LAST_GPX, filename);
      }

      console.log(
        `GPX saved to ${
          this.fallbackMode ? "localStorage" : "IndexedDB"
        } with key: ${gpxKey}`
      );
    } catch (error) {
      console.error("Error saving GPX:", error);
      throw error; // Re-throw to allow proper error handling upstream
    }
  }

  async loadGpx() {
    try {
      if (!(await this.ensureInitialized())) {
        console.warn("Storage not initialized, cannot load GPX");
        return null;
      }

      let lastGpxFilename;

      if (this.fallbackMode) {
        lastGpxFilename = this._getItemFallback(CONFIG.STORAGE_KEYS.LAST_GPX);
      } else {
        lastGpxFilename = await localforage.getItem(
          CONFIG.STORAGE_KEYS.LAST_GPX
        );
      }

      if (!lastGpxFilename) {
        return null;
      }

      const gpxKey = `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${lastGpxFilename}`;
      let gpxData;

      if (this.fallbackMode) {
        gpxData = this._getItemFallback(gpxKey);
      } else {
        gpxData = await localforage.getItem(gpxKey);
      }

      if (gpxData) {
        return gpxData;
      }
    } catch (error) {
      console.error("Error loading GPX:", error);
    }
    return null;
  }

  async getCurrentGpxFilename() {
    try {
      if (!(await this.ensureInitialized())) {
        console.warn(
          "Storage not initialized, cannot get current GPX filename"
        );
        return null;
      }
      return await localforage.getItem(CONFIG.STORAGE_KEYS.LAST_GPX);
    } catch (error) {
      console.error("Error getting current GPX filename:", error);
      return null;
    }
  }

  async getAllStoredGpxFiles() {
    try {
      if (!(await this.ensureInitialized())) {
        console.warn("Storage not initialized, returning empty GPX files list");
        return [];
      }

      const gpxFiles = [];
      let keys;

      if (this.fallbackMode) {
        // Use localStorage fallback
        keys = this._getKeysFallback();
      } else {
        // Use IndexedDB via localforage
        keys = await localforage.keys();
      }

      // Filter for GPX keys
      const gpxKeys = keys.filter(
        (key) =>
          key &&
          key.startsWith(CONFIG.STORAGE_KEYS.GPX_PREFIX) &&
          key.endsWith(".gpx")
      );

      for (const key of gpxKeys) {
        const filename = key.substring(CONFIG.STORAGE_KEYS.GPX_PREFIX.length);
        let gpxData;

        if (this.fallbackMode) {
          gpxData = this._getItemFallback(key);
        } else {
          gpxData = await localforage.getItem(key);
        }

        if (gpxData) {
          try {
            // Create clean display name: remove .gpx extension, numbers, and non-alphabet characters
            let cleanName = filename.replace(".gpx", "");
            // Remove numbers and non-alphabet characters, keep spaces and hyphens for readability
            cleanName = cleanName.replace(/[^a-zA-Z\s-]/g, "");
            // Replace multiple spaces/hyphens with single space and trim
            cleanName = cleanName.replace(/[\s-]+/g, " ").trim();
            // If the cleaned name is empty, use "GPX File" as fallback
            if (!cleanName) {
              cleanName = "GPX File";
            }
            // Capitalize the first character
            if (cleanName.length > 0) {
              cleanName =
                cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            }

            gpxFiles.push({
              filename: filename,
              timestamp: gpxData.timestamp || 0,
              displayName: cleanName,
            });
          } catch (parseError) {
            console.warn(
              `Failed to parse GPX data for ${filename}:`,
              parseError
            );
          }
        }
      }

      // Sort by timestamp (newest first)
      gpxFiles.sort((a, b) => b.timestamp - a.timestamp);

      return gpxFiles;
    } catch (error) {
      console.error("Error getting stored GPX files:", error);
      return [];
    }
  }

  async loadGpxByFilename(filename) {
    try {
      if (!(await this.ensureInitialized())) {
        console.warn("Storage not initialized, cannot load GPX by filename");
        return null;
      }

      const gpxData = await localforage.getItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}`
      );
      if (gpxData) {
        return gpxData;
      }
    } catch (error) {
      console.error("Error loading GPX by filename:", error);
    }
    return null;
  }

  async deleteGpxFile(filename) {
    try {
      if (!(await this.ensureInitialized())) {
        console.warn("Storage not initialized, cannot delete GPX file");
        return false;
      }

      // Remove the GPX file
      const gpxKey = `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}`;
      await localforage.removeItem(gpxKey);

      // Remove associated waypoints
      const waypointKey = `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`;
      await localforage.removeItem(waypointKey);

      // If this was the current GPX file, clear the reference
      const currentGpxFilename = await localforage.getItem(
        CONFIG.STORAGE_KEYS.LAST_GPX
      );
      if (currentGpxFilename === filename) {
        await localforage.removeItem(CONFIG.STORAGE_KEYS.LAST_GPX);
      }

      console.log(`Deleted GPX file: ${filename}`);
      return true;
    } catch (error) {
      console.error(`Error deleting GPX file ${filename}:`, error);
      return false;
    }
  }

  async saveWaypoints(waypoints, filename) {
    try {
      if (!(await this.ensureInitialized())) {
        console.warn("Storage not initialized, cannot save waypoints");
        return;
      }

      const waypointData = {
        waypoints: waypoints,
        filename: filename,
        timestamp: Date.now(),
      };

      await localforage.setItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`,
        waypointData
      );
      console.log(
        `Waypoints saved to IndexedDB with key: ${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`
      );
    } catch (error) {
      console.error("Error saving waypoints to IndexedDB:", error);
    }
  }

  async loadWaypoints(filename) {
    try {
      if (!(await this.ensureInitialized())) {
        console.warn("Storage not initialized, cannot load waypoints");
        return null;
      }

      const waypointData = await localforage.getItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`
      );
      if (waypointData) {
        console.log(
          `Loaded ${waypointData.waypoints.length} waypoints from IndexedDB for ${filename}`
        );
        return waypointData.waypoints;
      }
    } catch (error) {
      console.error("Error loading waypoints from IndexedDB:", error);
    }
    return null;
  }

  async clearGpx() {
    try {
      if (!(await this.ensureInitialized())) {
        console.warn("Storage not initialized, cannot clear GPX");
        throw new Error("Storage not initialized");
      }

      // Get the current GPX filename before clearing
      const currentGpxFilename = await localforage.getItem(
        CONFIG.STORAGE_KEYS.LAST_GPX
      );

      // Remove the reference to the current GPX
      await localforage.removeItem(CONFIG.STORAGE_KEYS.LAST_GPX);

      // Also remove the cached waypoints for this GPX file
      if (currentGpxFilename) {
        await localforage.removeItem(
          `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${currentGpxFilename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`
        );
        console.log(
          `Cleared cached waypoints for ${currentGpxFilename}`,
          `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${currentGpxFilename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`
        );
      }

      return currentGpxFilename;
    } catch (error) {
      console.error("Error clearing GPX from IndexedDB:", error);
      throw error;
    }
  }
}
