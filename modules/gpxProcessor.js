import { CONFIG } from "./config.js";

export class GPXProcessor {
  constructor(map, storageManager, markerFactory, pointFilter, uiController) {
    this.map = map;
    this.storage = storageManager;
    this.markers = markerFactory;
    this.pointFilter = pointFilter;
    this.ui = uiController;
  }

  processGpxContent(gpxText, filename = null, jsonPointsData = null) {
    if (window.gpxLayer) this.map.removeLayer(window.gpxLayer);

    // Clear any existing waypoint markers
    this.markers.clearWaypointMarkers();

    // Fix GPX version compatibility
    gpxText = this.fixGpxVersionCompatibility(gpxText);

    // Parse GPX data
    const { trackPoints, waypoints, isValid } = this.parseGpxData(gpxText);

    if (!isValid) return;

    // Check if we should use fallback method
    if (this.shouldUseFallback(gpxText, trackPoints, waypoints)) {
      this.createFallbackVisualization(
        trackPoints,
        waypoints,
        filename,
        jsonPointsData
      );
      return;
    }

    // Try to use L.GPX library
    this.createGpxLayer(
      gpxText,
      trackPoints,
      waypoints,
      filename,
      jsonPointsData
    );
  }

  fixGpxVersionCompatibility(gpxText) {
    if (
      gpxText.includes('version="1.0"') &&
      gpxText.includes('xmlns="http://www.topografix.com/GPX/1/0"')
    ) {
      return gpxText
        .replace('version="1.0"', 'version="1.1"')
        .replace(
          'xmlns="http://www.topografix.com/GPX/1/0"',
          'xmlns="http://www.topografix.com/GPX/1/1"'
        )
        .replace(
          'xsi:schemaLocation="http://www.topografix.com/GPX/1/0 http://www.topografix.com/GPX/1/0/gpx.xsd"',
          'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"'
        );
    }
    return gpxText;
  }

  parseGpxData(gpxText) {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, "text/xml");

    // Check for XML parsing errors
    const parserError = gpxDoc.querySelector("parsererror");
    if (parserError) {
      console.error("XML parsing error:", parserError.textContent);
      this.ui.showStatus("Error: Invalid GPX file format", 3000);
      return { trackPoints: [], waypoints: [], isValid: false };
    }

    const trackPoints = [];
    const waypoints = [];

    // Extract all trkpt elements
    const trkpts = gpxDoc.querySelectorAll("trkpt");
    trkpts.forEach((trkpt) => {
      const lat = parseFloat(trkpt.getAttribute("lat"));
      const lng = parseFloat(trkpt.getAttribute("lon"));
      if (!isNaN(lat) && !isNaN(lng)) {
        trackPoints.push({ lat, lng });
      }
    });

    // Extract waypoints
    const wpts = gpxDoc.querySelectorAll("wpt");
    wpts.forEach((wpt) => {
      const lat = parseFloat(wpt.getAttribute("lat"));
      const lng = parseFloat(wpt.getAttribute("lon"));
      const nameEl = wpt.querySelector("name");
      const name = nameEl ? nameEl.textContent : "Waypoint";

      if (!isNaN(lat) && !isNaN(lng)) {
        waypoints.push({ lat, lng, name });
      }
    });

    console.log(
      `Extracted ${trackPoints.length} track points and ${waypoints.length} waypoints from GPX`
    );

    // Check if we have any usable data
    if (trackPoints.length === 0 && waypoints.length === 0) {
      this.ui.showStatus(
        "Error: No track points or waypoints found in GPX file",
        5000
      );
      return { trackPoints: [], waypoints: [], isValid: false };
    }

    return { trackPoints, waypoints, isValid: true };
  }

  shouldUseFallback(gpxText, trackPoints, waypoints) {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, "text/xml");

    const gpxRoot = gpxDoc.querySelector("gpx");
    const hasTrackSegments = gpxDoc.querySelectorAll("trkseg").length > 0;
    const hasRoutes = gpxDoc.querySelectorAll("rte").length > 0;
    const hasValidTrackPoints = trackPoints.length > 0;
    const hasValidWaypoints = waypoints.length > 0;

    // Check for problematic patterns
    if (
      !gpxRoot ||
      (!hasTrackSegments && !hasRoutes && !hasValidWaypoints) ||
      (hasTrackSegments && !hasValidTrackPoints)
    ) {
      console.log(
        "GPX structure issues detected, using fallback method immediately"
      );
      return true;
    }

    // For specific creator patterns
    if (
      gpxText.includes('creator="routemaker.nl"') &&
      gpxText.includes('version="1.0"')
    ) {
      return true;
    }

    return false;
  }

  createGpxLayer(gpxText, trackPoints, waypoints, filename, jsonPointsData) {
    try {
      window.gpxLayer = new L.GPX(gpxText, {
        async: true,
        marker_options: CONFIG.GPX.MARKER_OPTIONS,
      })
        .on("loaded", (e) => {
          this.map.fitBounds(e.target.getBounds());
          this.handleGpxLoaded(
            trackPoints,
            waypoints,
            filename,
            jsonPointsData
          );
        })
        .on("addpoint", (e) => {
          const wp = e.point;
          if (wp && wp.getLatLng && wp._name) {
            wp.bindPopup(`<strong>${wp._name}</strong>`);
          }
        })
        .on("error", (e) => {
          console.error("GPX loading error:", e);
          this.ui.showStatus(
            "GPX library failed, using fallback method...",
            2000
          );
          this.createFallbackVisualization(
            trackPoints,
            waypoints,
            filename,
            jsonPointsData
          );
        })
        .addTo(this.map);
    } catch (error) {
      console.error("Error creating GPX layer:", error);
      this.ui.showStatus(
        "Primary GPX parsing failed, using fallback method...",
        2000
      );
      this.createFallbackVisualization(
        trackPoints,
        waypoints,
        filename,
        jsonPointsData
      );
    }
  }

  createFallbackVisualization(
    trackPoints,
    waypoints,
    filename,
    jsonPointsData
  ) {
    try {
      let bounds = null;

      // Create polyline if we have track points
      if (trackPoints.length > 0) {
        const polyline = L.polyline(
          trackPoints.map((p) => [p.lat, p.lng]),
          CONFIG.GPX.POLYLINE_OPTIONS
        ).addTo(this.map);

        bounds = polyline.getBounds();
        window.gpxLayer = polyline;

        // Add start and end markers for tracks
        const startEndMarkers = this.markers.createStartEndMarkers(trackPoints);
        startEndMarkers.forEach((marker) =>
          this.markers.addWaypointMarker(marker)
        );
      }

      // Handle waypoints
      bounds = this.handleWaypoints(waypoints, bounds);

      // Fit map to bounds
      if (bounds) {
        this.map.fitBounds(bounds);
      }

      const statusMessage = this.buildStatusMessage(
        trackPoints,
        waypoints,
        filename,
        true
      );
      this.ui.showStatus(statusMessage);
      this.ui.updateGpxButtonStates(true);

      // Handle proximity filtering for JSON points if available (only if no waypoints)
      if (waypoints.length === 0 && jsonPointsData && trackPoints.length > 0) {
        this.handleProximityFiltering(jsonPointsData, trackPoints, filename);
      }
    } catch (fallbackError) {
      console.error("Fallback parsing also failed:", fallbackError);
      this.ui.showStatus(
        "Error: Could not load GPX file with any method",
        5000
      );
      this.ui.updateGpxButtonStates(false);
    }
  }

  handleGpxLoaded(trackPoints, waypoints, filename, jsonPointsData) {
    const statusMessage = this.buildStatusMessage(
      trackPoints,
      waypoints,
      filename,
      false
    );
    this.ui.showStatus(statusMessage);
    this.ui.updateGpxButtonStates(true);

    // Handle waypoints and proximity filtering
    if (waypoints.length > 0) {
      this.displayWaypoints(waypoints);
    } else if (jsonPointsData && trackPoints.length > 0) {
      this.handleProximityFiltering(jsonPointsData, trackPoints, filename);
    }
  }

  handleWaypoints(waypoints, bounds) {
    if (waypoints.length > 0) {
      console.log(`Displaying ${waypoints.length} GPX waypoints (fallback)`);
      waypoints.forEach((waypoint, index) => {
        const marker = this.markers.createWaypointMarker(waypoint, index);
        this.markers.addWaypointMarker(marker);

        // Calculate bounds if needed
        if (!bounds) {
          if (index === 0) {
            bounds = L.latLngBounds(
              [waypoint.lat, waypoint.lng],
              [waypoint.lat, waypoint.lng]
            );
          } else {
            bounds.extend([waypoint.lat, waypoint.lng]);
          }
        }
      });
    }
    return bounds;
  }

  displayWaypoints(waypoints) {
    console.log(`Displaying ${waypoints.length} GPX waypoints`);
    waypoints.forEach((waypoint, index) => {
      const marker = this.markers.createWaypointMarker(waypoint, index);
      this.markers.addWaypointMarker(marker);
    });
  }

  handleProximityFiltering(jsonPointsData, trackPoints, filename) {
    // First check if we have cached waypoints for this GPX file
    const cachedWaypoints = this.storage.loadWaypoints(filename || "unknown");

    if (cachedWaypoints && cachedWaypoints.length > 0) {
      console.log(
        `Using ${cachedWaypoints.length} cached waypoints from localStorage`
      );
      this.displayCachedWaypoints(cachedWaypoints);
    } else {
      // No cached waypoints, calculate new ones
      this.calculateAndDisplayNewWaypoints(
        jsonPointsData,
        trackPoints,
        filename
      );
    }
  }

  displayCachedWaypoints(cachedWaypoints) {
    cachedWaypoints.forEach((point) => {
      if (point.converted) {
        const pointNumber = point.name
          ? point.name.match(/\d+/)?.[0] || "?"
          : "?";
        const marker = this.markers.createPointMarker(point, pointNumber);
        this.markers.addWaypointMarker(marker);
      }
    });
  }

  calculateAndDisplayNewWaypoints(jsonPointsData, trackPoints, filename) {
    const nearbyPoints = this.pointFilter.filterByProximity(
      jsonPointsData,
      trackPoints
    );
    console.log(
      `Found ${nearbyPoints.length} points within 50m of GPX route:`,
      nearbyPoints
    );

    // Save the calculated waypoints to localStorage
    if (nearbyPoints.length > 0 && filename) {
      this.storage.saveWaypoints(nearbyPoints, filename);
    }

    // Add markers for nearby points
    nearbyPoints.forEach((point) => {
      if (point.converted) {
        const pointNumber = point.name
          ? point.name.match(/\d+/)?.[0] || "?"
          : "?";
        const marker = this.markers.createPointMarker(point, pointNumber);
        this.markers.addWaypointMarker(marker);
      }
    });
  }

  buildStatusMessage(trackPoints, waypoints, filename, isFallback) {
    const fallbackText = isFallback ? " (fallback)" : "";
    const waypointsText = waypoints.length > 0 ? " - showing waypoints" : "";

    if (filename) {
      return `GPX loaded${fallbackText}: ${filename} (${trackPoints.length} track points, ${waypoints.length} waypoints${waypointsText})`;
    } else {
      return `GPX loaded${fallbackText} with ${trackPoints.length} track points, ${waypoints.length} waypoints${waypointsText}`;
    }
  }
}
