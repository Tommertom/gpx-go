import { CONFIG } from "./config.js";

export class BackupManager {
  constructor() {
    this.BACKUP_KEY = "gpx_backup_data";
    this.BACKUP_VERSION = "1.0";
  }

  // Create a complete backup of all GPX data
  createBackup() {
    try {
      const backup = {
        version: this.BACKUP_VERSION,
        timestamp: Date.now(),
        data: {
          lastGpx: localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_GPX),
          gpxFiles: {},
          waypoints: {},
        },
      };

      // Backup all GPX files and waypoints
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CONFIG.STORAGE_KEYS.GPX_PREFIX)) {
          const value = localStorage.getItem(key);
          if (key.endsWith(CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX)) {
            backup.data.waypoints[key] = value;
          } else {
            backup.data.gpxFiles[key] = value;
          }
        }
      }

      // Store backup
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));

      // Also try to store in sessionStorage as a fallback
      try {
        sessionStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
      } catch (e) {
        console.warn("Could not create session backup:", e);
      }

      console.log("Backup created successfully");
      return true;
    } catch (error) {
      console.error("Error creating backup:", error);
      return false;
    }
  }

  // Restore data from backup
  restoreFromBackup() {
    try {
      let backupData = localStorage.getItem(this.BACKUP_KEY);

      // If no backup in localStorage, try sessionStorage
      if (!backupData) {
        backupData = sessionStorage.getItem(this.BACKUP_KEY);
      }

      if (!backupData) {
        console.log("No backup data found");
        return false;
      }

      const backup = JSON.parse(backupData);

      if (backup.version !== this.BACKUP_VERSION) {
        console.warn("Backup version mismatch");
        return false;
      }

      // Restore GPX files
      Object.entries(backup.data.gpxFiles).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      // Restore waypoints
      Object.entries(backup.data.waypoints).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      // Restore last GPX reference
      if (backup.data.lastGpx) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_GPX, backup.data.lastGpx);
      }

      console.log("Data restored from backup successfully");
      return true;
    } catch (error) {
      console.error("Error restoring from backup:", error);
      return false;
    }
  }

  // Check if backup exists
  hasBackup() {
    return (
      localStorage.getItem(this.BACKUP_KEY) !== null ||
      sessionStorage.getItem(this.BACKUP_KEY) !== null
    );
  }

  // Export data as downloadable file
  exportData() {
    try {
      const backup = {
        version: this.BACKUP_VERSION,
        timestamp: Date.now(),
        exportedAt: new Date().toISOString(),
        data: {
          lastGpx: localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_GPX),
          gpxFiles: {},
          waypoints: {},
        },
      };

      // Collect all GPX data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CONFIG.STORAGE_KEYS.GPX_PREFIX)) {
          const value = localStorage.getItem(key);
          if (key.endsWith(CONFIG.STORAGE_KEYS.WAYPOINT_SUFFIX)) {
            backup.data.waypoints[key] = value;
          } else {
            backup.data.gpxFiles[key] = value;
          }
        }
      }

      // Create download
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `gpx-go-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error("Error exporting data:", error);
      return false;
    }
  }

  // Import data from file
  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);

          if (backup.version !== this.BACKUP_VERSION) {
            reject(new Error("Incompatible backup version"));
            return;
          }

          // Clear existing data (optional - could ask user)
          this.clearAllData();

          // Restore data
          Object.entries(backup.data.gpxFiles).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });

          Object.entries(backup.data.waypoints).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });

          if (backup.data.lastGpx) {
            localStorage.setItem(
              CONFIG.STORAGE_KEYS.LAST_GPX,
              backup.data.lastGpx
            );
          }

          resolve(true);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  // Clear all GPX data
  clearAllData() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(CONFIG.STORAGE_KEYS.GPX_PREFIX) ||
          key === CONFIG.STORAGE_KEYS.LAST_GPX)
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}
