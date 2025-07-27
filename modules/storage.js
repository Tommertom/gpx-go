import { CONFIG } from "./config.js";

export class StorageManager {
  constructor() {
    // Configure localForage to use IndexedDB
    if (typeof localforage !== "undefined") {
      localforage.config({
        driver: localforage.INDEXEDDB,
        name: "GPXApp",
        version: 1.0,
        storeName: "gpx_data",
        description: "GPX files and waypoints storage",
      });
    }
  }

  async saveGpx(gpxContent, filename) {
    try {
      const gpxData = {
        content: gpxContent,
        filename: filename,
        timestamp: Date.now(),
      };

      // Store the GPX content using filename as key
      await localforage.setItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}`,
        gpxData
      );

      // Store the current filename reference
      await localforage.setItem(CONFIG.STORAGE_KEYS.LAST_GPX, filename);

      console.log(
        `GPX saved to IndexedDB with key: ${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}`
      );
    } catch (error) {
      console.error("Error saving GPX to IndexedDB:", error);
    }
  }

  async loadGpx() {
    try {
      // Get the last GPX filename
      const lastGpxFilename = await localforage.getItem(
        CONFIG.STORAGE_KEYS.LAST_GPX
      );
      if (!lastGpxFilename) {
        return null;
      }

      // Get the GPX data using the filename
      const gpxData = await localforage.getItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${lastGpxFilename}`
      );
      if (gpxData) {
        return gpxData;
      }
    } catch (error) {
      console.error("Error loading GPX from IndexedDB:", error);
    }
    return null;
  }

  async getCurrentGpxFilename() {
    try {
      return await localforage.getItem(CONFIG.STORAGE_KEYS.LAST_GPX);
    } catch (error) {
      console.error("Error getting current GPX filename:", error);
      return null;
    }
  }

  async getAllStoredGpxFiles() {
    try {
      const gpxFiles = [];

      // Get all keys from localforage
      const keys = await localforage.keys();

      // Filter for GPX keys
      const gpxKeys = keys.filter(
        (key) =>
          key &&
          key.startsWith(CONFIG.STORAGE_KEYS.GPX_PREFIX) &&
          key.endsWith(".gpx")
      );

      for (const key of gpxKeys) {
        const filename = key.substring(CONFIG.STORAGE_KEYS.GPX_PREFIX.length);
        const gpxData = await localforage.getItem(key);

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
