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
    this.initCompass();
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

  toggleFollowMode() {
    this.followMode = !this.followMode;
    this.ui.updateFollowButtons(this.followMode);

    // Show status
    this.ui.showStatus(
      this.followMode ? "Follow mode enabled" : "Follow mode disabled"
    );

    if (this.followMode) {
      // Start watching position when follow mode is enabled
      this.startWatching();
      if (this.userMarker) {
        this.map.setView(this.userMarker.getLatLng());
      }
    } else {
      // Stop watching position when follow mode is disabled
      this.stopWatching();
    }
  }

  centerOnLocation() {
    if (this.userMarker) {
      this.map.setView(this.userMarker.getLatLng(), this.map.getZoom());
      this.ui.showStatus("Centered on your location");
      return true;
    }
    return false;
  }

  initCompass() {
    console.log("Initializing compass...");

    if (!window.DeviceOrientationEvent) {
      console.log("DeviceOrientationEvent not supported");
      this.ui.showStatus("Compass not supported on this device", 3000);
      return;
    }

    console.log("DeviceOrientationEvent supported");

    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      console.log("iOS 13+ permission model detected");
      DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          console.log("Permission state:", permissionState);
          if (permissionState === "granted") {
            console.log("Permission granted, adding event listener");
            window.addEventListener(
              "deviceorientation",
              (event) => this.handleOrientation(event),
              true
            );
            this.ui.showStatus("Compass permission granted", 2000);
          } else {
            console.log("Permission denied");
            this.ui.showStatus("Compass permission denied", 3000);
          }
        })
        .catch((error) => {
          console.error("Error requesting permission:", error);
          this.ui.showStatus("Error requesting compass permission", 3000);
        });
    } else {
      console.log("No permission request needed, adding event listener");
      window.addEventListener(
        "deviceorientation",
        (event) => this.handleOrientation(event),
        true
      );
    }
  }

  handleOrientation(event) {
    console.log("Orientation event received:", {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      absolute: event.absolute,
      webkitCompassHeading: event.webkitCompassHeading,
    });

    let heading = null;

    if (event.absolute || event.webkitCompassHeading !== undefined) {
      if (event.webkitCompassHeading !== undefined) {
        heading = event.webkitCompassHeading;
        console.log("Using webkitCompassHeading:", heading);
      } else if (event.alpha !== null) {
        heading = 360 - event.alpha;
        console.log("Using calculated heading from alpha:", heading);
      }

      if (heading !== null) {
        this.heading = heading;
        console.log("Final heading set to:", this.heading);
      }
    } else {
      console.log("No valid orientation data available");
    }

    this.ui.updateCompassDisplay(heading);
  }

  getFollowMode() {
    return this.followMode;
  }

  getUserMarker() {
    return this.userMarker;
  }

  // Debug method to manually request compass permission
  requestCompassPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      console.log("Manually requesting compass permission...");
      return DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          console.log("Manual permission state:", permissionState);
          this.ui.showStatus(`Compass permission: ${permissionState}`, 3000);
          return permissionState;
        })
        .catch((error) => {
          console.error("Manual permission error:", error);
          this.ui.showStatus("Error requesting compass permission", 3000);
          throw error;
        });
    } else {
      console.log("No permission request needed");
      this.ui.showStatus("No permission request needed", 2000);
      return Promise.resolve("granted");
    }
  }
}
