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
    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission()
          .then((permissionState) => {
            if (permissionState === "granted") {
              window.addEventListener(
                "deviceorientation",
                (event) => this.handleOrientation(event),
                true
              );
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener(
          "deviceorientation",
          (event) => this.handleOrientation(event),
          true
        );
      }
    }
  }

  handleOrientation(event) {
    let heading = null;

    if (event.absolute || event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading || 360 - event.alpha;
      this.heading = heading;
    }

    this.ui.updateCompassDisplay(heading);
  }

  getFollowMode() {
    return this.followMode;
  }

  getUserMarker() {
    return this.userMarker;
  }
}
