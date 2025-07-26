import { CONFIG } from "./config.js";

export class StorageManager {
  saveGpx(gpxContent, filename) {
    try {
      const gpxData = {
        content: gpxContent,
        filename: filename,
        timestamp: Date.now(),
      };

      // Store the GPX content using filename as key
      localStorage.setItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}`,
        JSON.stringify(gpxData)
      );

      // Store the current filename reference
      localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_GPX, filename);

      console.log(
        `GPX saved to localStorage with key: ${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}`
      );
    } catch (error) {
      console.error("Error saving GPX to localStorage:", error);
    }
  }

  loadGpx() {
    try {
      // Get the last GPX filename
      const lastGpxFilename = localStorage.getItem(
        CONFIG.STORAGE_KEYS.LAST_GPX
      );
      if (!lastGpxFilename) {
        return null;
      }

      // Get the GPX data using the filename
      const savedData = localStorage.getItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${lastGpxFilename}`
      );
      if (savedData) {
        const gpxData = JSON.parse(savedData);
        return gpxData;
      }
    } catch (error) {
      console.error("Error loading GPX from localStorage:", error);
    }
    return null;
  }

  getAllStoredGpxFiles() {
    try {
      const gpxFiles = [];

      // Find all GPX keys in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CONFIG.STORAGE_KEYS.GPX_PREFIX)) {
          // Skip waypoint files
          if (key.endsWith(CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX)) {
            continue;
          }

          const filename = key.substring(CONFIG.STORAGE_KEYS.GPX_PREFIX.length);
          const savedData = localStorage.getItem(key);

          if (savedData) {
            try {
              const gpxData = JSON.parse(savedData);
              gpxFiles.push({
                filename: filename,
                timestamp: gpxData.timestamp || 0,
                displayName: filename.replace(".gpx", ""),
              });
            } catch (parseError) {
              console.warn(
                `Failed to parse GPX data for ${filename}:`,
                parseError
              );
            }
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

  loadGpxByFilename(filename) {
    try {
      const savedData = localStorage.getItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}`
      );
      if (savedData) {
        const gpxData = JSON.parse(savedData);
        return gpxData;
      }
    } catch (error) {
      console.error("Error loading GPX by filename:", error);
    }
    return null;
  }

  deleteGpxFile(filename) {
    try {
      // Remove the GPX file
      const gpxKey = `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}`;
      localStorage.removeItem(gpxKey);

      // Remove associated waypoints
      const waypointKey = `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`;
      localStorage.removeItem(waypointKey);

      // If this was the current GPX file, clear the reference
      const currentGpxFilename = localStorage.getItem(
        CONFIG.STORAGE_KEYS.LAST_GPX
      );
      if (currentGpxFilename === filename) {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_GPX);
      }

      console.log(`Deleted GPX file: ${filename}`);
      return true;
    } catch (error) {
      console.error(`Error deleting GPX file ${filename}:`, error);
      return false;
    }
  }

  saveWaypoints(waypoints, filename) {
    try {
      const waypointData = {
        waypoints: waypoints,
        filename: filename,
        timestamp: Date.now(),
      };

      localStorage.setItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`,
        JSON.stringify(waypointData)
      );
      console.log(
        `Waypoints saved to localStorage with key: ${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`
      );
    } catch (error) {
      console.error("Error saving waypoints to localStorage:", error);
    }
  }

  loadWaypoints(filename) {
    try {
      const savedData = localStorage.getItem(
        `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${filename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`
      );
      if (savedData) {
        const waypointData = JSON.parse(savedData);
        console.log(
          `Loaded ${waypointData.waypoints.length} waypoints from localStorage for ${filename}`
        );
        return waypointData.waypoints;
      }
    } catch (error) {
      console.error("Error loading waypoints from localStorage:", error);
    }
    return null;
  }

  clearGpx() {
    try {
      // Get the current GPX filename before clearing
      const currentGpxFilename = localStorage.getItem(
        CONFIG.STORAGE_KEYS.LAST_GPX
      );

      // Remove the reference to the current GPX
      localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_GPX);

      // Also remove the cached waypoints for this GPX file
      if (currentGpxFilename) {
        localStorage.removeItem(
          `${CONFIG.STORAGE_KEYS.GPX_PREFIX}${currentGpxFilename}${CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX}`
        );
        console.log(`Cleared cached waypoints for ${currentGpxFilename}`);
      }

      return currentGpxFilename;
    } catch (error) {
      console.error("Error clearing GPX from localStorage:", error);
      throw error;
    }
  }

  cleanup() {
    try {
      const lastGpxFilename = localStorage.getItem(
        CONFIG.STORAGE_KEYS.LAST_GPX
      );
      const keysToRemove = [];

      // Find all GPX keys in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CONFIG.STORAGE_KEYS.GPX_PREFIX)) {
          // Extract filename - handle both regular GPX files and waypoint files
          let filename;
          if (key.endsWith(CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX)) {
            filename = key.substring(
              CONFIG.STORAGE_KEYS.GPX_PREFIX.length,
              key.length - CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX.length
            );
          } else {
            filename = key.substring(CONFIG.STORAGE_KEYS.GPX_PREFIX.length);
          }

          // If this isn't the current GPX file, mark for removal
          if (filename !== lastGpxFilename) {
            keysToRemove.push(key);
          }
        }
      }

      // Remove old GPX files and their waypoints
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        console.log(`Cleaned up old GPX file: ${key}`);
      });

      if (keysToRemove.length > 0) {
        console.log(
          `Cleaned up ${keysToRemove.length} old GPX files and waypoints`
        );
      }
    } catch (error) {
      console.error("Error cleaning up old GPX files:", error);
    }
  }
}
