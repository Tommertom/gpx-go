import { CONFIG } from "./config.js";

export class LocationTracker {
  constructor(map, markerFactory, uiController) {
    this.map = map;
    this.markerFactory = markerFactory;
    this.ui = uiController;
    this.userMarker = null;
    this.followMode = false;
    this.watchId = null;
    this.heading = 0;
    this.initialLocationSet = false;
    this.compassInitialized = false;
    this.compassPermissionRequested = false;
    this.lastPosition = null;
    this.lastTimestamp = null;
    this.orientationHandler = null; // Store reference to bound handler
    // Don't initialize compass here - wait for user action
  }

  startWatching() {
    if (!navigator.geolocation) {
      this.ui.showStatus("Geolocation not supported by this device", 3000);
      return;
    }

    if (this.watchId !== null) {
      return; // Already watching
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng = [pos.coords.latitude, pos.coords.longitude];
        const currentTimestamp = Date.now();

        // Calculate speed if we have a previous position
        let speedKmh = 0;
        if (this.lastPosition && this.lastTimestamp && this.followMode) {
          // Use GPS speed if available and reliable
          if (
            pos.coords.speed !== null &&
            pos.coords.speed !== undefined &&
            pos.coords.speed >= 0
          ) {
            speedKmh = pos.coords.speed * 3.6; // Convert m/s to km/h
          } else {
            // Calculate speed from position change
            const deltaTime = (currentTimestamp - this.lastTimestamp) / 1000; // seconds
            if (deltaTime > 0) {
              const distance = this.calculateDistance(
                this.lastPosition[0],
                this.lastPosition[1],
                latlng[0],
                latlng[1]
              );
              speedKmh = (distance / deltaTime) * 3.6; // Convert m/s to km/h
            }
          }
        }

        // Update speed display if in follow mode
        if (this.followMode) {
          this.ui.updateSpeedDisplay(speedKmh);
        }

        // Store current position and timestamp for next calculation
        this.lastPosition = latlng;
        this.lastTimestamp = currentTimestamp;

        if (!this.userMarker) {
          this.userMarker = L.marker(latlng, {
            icon: this.markerFactory.createArrowIcon(),
          }).addTo(this.map);

          // Center map on user's location when first detected
          if (!this.initialLocationSet) {
            this.map.setView(latlng, CONFIG.MAP.MOBILE_ZOOM);
            this.initialLocationSet = true;
          } else if (this.followMode) {
            this.map.setView(latlng, this.map.getZoom());
          }
        } else {
          this.userMarker.setLatLng(latlng);
          if (this.followMode) this.map.setView(latlng, this.map.getZoom());
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        this.ui.showStatus("Location access denied or unavailable", 3000);
      },
      CONFIG.GEOLOCATION
    );
  }

  stopWatching() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  stopCompass() {
    if (this.orientationHandler && window.DeviceOrientationEvent) {
      window.removeEventListener(
        "deviceorientation",
        this.orientationHandler,
        true
      );
      this.orientationHandler = null;
    }
  }

  toggleFollowMode() {
    this.followMode = !this.followMode;
    this.ui.updateFollowButtons(this.followMode);

    // Show status
    this.ui.showStatus(
      this.followMode ? "Follow Me mode enabled" : "Follow Me mode disabled"
    );

    if (this.followMode) {
      // Initialize compass when follow mode is enabled (user action)
      if (!this.compassInitialized) {
        this.initCompass();
        this.compassInitialized = true;
      }

      // Reset speed tracking
      this.lastPosition = null;
      this.lastTimestamp = null;

      // Start watching position when follow mode is enabled
      this.startWatching();
      if (this.userMarker) {
        this.map.setView(this.userMarker.getLatLng());
      }
    } else {
      // Stop watching position when follow mode is disabled
      this.stopWatching();
      // Stop compass tracking to save battery
      this.stopCompass();
      // Reset speed tracking
      this.lastPosition = null;
      this.lastTimestamp = null;
    }
  }

  initCompass() {
    if (!window.DeviceOrientationEvent) {
      this.ui.showStatus("Compass not supported on this device", 3000);
      return;
    }

    // Reset compass rotation state when initializing
    this.ui.resetCompassRotation();

    // Create bound event handler if not already created
    if (!this.orientationHandler) {
      this.orientationHandler = (event) => this.handleOrientation(event);
    }

    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      // iOS 13+ requires user gesture to request permission
      if (!this.compassPermissionRequested) {
        this.compassPermissionRequested = true;
        DeviceOrientationEvent.requestPermission()
          .then((permissionState) => {
            if (permissionState === "granted") {
              window.addEventListener(
                "deviceorientation",
                this.orientationHandler,
                true
              );
              this.ui.showStatus("Compass permission granted", 2000);
            } else {
              this.ui.showStatus("Compass permission denied", 3000);
            }
          })
          .catch((error) => {
            console.error("Error requesting compass permission:", error);
            this.ui.showStatus("Error requesting compass permission", 3000);
          });
      }
    } else {
      // No permission request needed for non-iOS devices
      window.addEventListener(
        "deviceorientation",
        this.orientationHandler,
        true
      );
    }
  }

  handleOrientation(event) {
    const debugMode = this.ui.isDebugMode();

    if (debugMode) {
      this.ui.showDebugInfo(
        `📡 Orientation: α=${event.alpha?.toFixed(1)} β=${event.beta?.toFixed(
          1
        )} γ=${event.gamma?.toFixed(1)} abs=${
          event.absolute
        } webkit=${event.webkitCompassHeading?.toFixed(1)}`
      );
    }

    let heading = null;

    if (event.absolute || event.webkitCompassHeading !== undefined) {
      if (event.webkitCompassHeading !== undefined) {
        heading = event.webkitCompassHeading;
        if (debugMode) {
          this.ui.showDebugInfo(
            `🧭 Using webkitCompassHeading: ${heading.toFixed(1)}°`
          );
        }
      } else if (event.alpha !== null) {
        heading = 360 - event.alpha;
        if (debugMode) {
          this.ui.showDebugInfo(
            `🧭 Using calculated heading from alpha: ${heading.toFixed(1)}°`
          );
        }
      }

      if (heading !== null) {
        this.heading = heading;
        if (debugMode) {
          this.ui.showDebugInfo(
            `✅ Final heading set to: ${this.heading.toFixed(1)}°`
          );
        }
      }
    } else {
      if (debugMode) {
        this.ui.showDebugInfo("❌ No valid orientation data available");
      }
    }

    this.ui.updateCompassDisplay(heading);
  }

  getUserMarker() {
    return this.userMarker;
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  // Debug method to manually request compass permission
  requestCompassPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      if (this.ui.isDebugMode()) {
        this.ui.showDebugInfo("🔄 Manually requesting compass permission...");
      }
      return DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          if (this.ui.isDebugMode()) {
            this.ui.showDebugInfo(
              `🔐 Manual permission state: ${permissionState}`
            );
          }
          this.ui.showStatus(`Compass permission: ${permissionState}`, 3000);

          // If permission granted, add event listener if not already added
          if (
            permissionState === "granted" &&
            !this.compassPermissionRequested
          ) {
            // Create bound event handler if not already created
            if (!this.orientationHandler) {
              this.orientationHandler = (event) =>
                this.handleOrientation(event);
            }
            window.addEventListener(
              "deviceorientation",
              this.orientationHandler,
              true
            );
            this.compassPermissionRequested = true;
          }

          return permissionState;
        })
        .catch((error) => {
          if (this.ui.isDebugMode()) {
            this.ui.showDebugInfo(
              `❌ Manual permission error: ${error.message}`
            );
          }
          this.ui.showStatus("Error requesting compass permission", 3000);
          throw error;
        });
    } else {
      if (this.ui.isDebugMode()) {
        this.ui.showDebugInfo("ℹ️ No permission request needed");
      }
      this.ui.showStatus("No permission request needed", 2000);

      // Add event listener if not already added
      if (!this.compassPermissionRequested) {
        // Create bound event handler if not already created
        if (!this.orientationHandler) {
          this.orientationHandler = (event) => this.handleOrientation(event);
        }
        window.addEventListener(
          "deviceorientation",
          this.orientationHandler,
          true
        );
        this.compassPermissionRequested = true;
      }

      return Promise.resolve("granted");
    }
  }
}
