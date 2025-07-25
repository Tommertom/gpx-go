const map = L.map("map").setView([52.3676, 4.9041], 8);

// Tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Load fk.json file automatically when page opens
let jsonPointsData = null;
let waypointMarkers = []; // Array to store waypoint markers

// Function to save GPX to localStorage
function saveGpxToStorage(gpxContent, filename) {
  try {
    const gpxData = {
      content: gpxContent,
      filename: filename,
      timestamp: Date.now(),
    };
    localStorage.setItem("savedGpx", JSON.stringify(gpxData));
    console.log("GPX saved to localStorage");
  } catch (error) {
    console.error("Error saving GPX to localStorage:", error);
  }
}

// Function to load GPX from localStorage
function loadGpxFromStorage() {
  try {
    const savedData = localStorage.getItem("savedGpx");
    if (savedData) {
      const gpxData = JSON.parse(savedData);
      console.log("Found saved GPX:", gpxData.filename);
      return gpxData;
    }
  } catch (error) {
    console.error("Error loading GPX from localStorage:", error);
  }
  return null;
}

// Function to update GPX button states
function updateGpxButtonStates(gpxLoaded) {
  const desktopButton = document.getElementById("gpxButton");
  const mobileButton = document.getElementById("gpxButtonMobile");

  if (gpxLoaded) {
    desktopButton.textContent = "Clear GPX";
    mobileButton.textContent = "Clear GPX";
  } else {
    desktopButton.textContent = "Load GPX";
    mobileButton.textContent = "Load GPX";
  }
}

// Function to handle GPX button click (load or clear)
function handleGpxButtonClick() {
  const desktopButton = document.getElementById("gpxButton");

  if (desktopButton.textContent === "Load GPX") {
    // Load GPX
    document.getElementById("gpxFile").click();
  } else {
    // Clear GPX
    clearSavedGpx();
  }
}

// Function to process GPX content (extracted for reuse)
function processGpxContent(gpxText, filename = null) {
  if (window.gpxLayer) map.removeLayer(window.gpxLayer);

  // Clear any existing waypoint markers
  waypointMarkers.forEach((marker) => map.removeLayer(marker));
  waypointMarkers = [];

  // Check and potentially fix GPX version compatibility
  if (
    gpxText.includes('version="1.0"') &&
    gpxText.includes('xmlns="http://www.topografix.com/GPX/1/0"')
  ) {
    console.log("Converting GPX 1.0 to 1.1 for better compatibility");
    gpxText = gpxText
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

  // Parse GPX to extract track points and waypoints
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, "text/xml");

  // Check for XML parsing errors
  const parserError = gpxDoc.querySelector("parsererror");
  if (parserError) {
    console.error("XML parsing error:", parserError.textContent);
    showStatus("Error: Invalid GPX file format", 3000);
    return;
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
    showStatus("Error: No track points or waypoints found in GPX file", 5000);
    return;
  }

  // Log some sample GPX coordinates
  if (trackPoints.length > 0) {
    console.log("Sample GPX coordinates:");
    trackPoints.slice(0, 3).forEach((point, index) => {
      console.log(`GPX Point ${index}: [${point.lat}, ${point.lng}]`);
    });
  }

  // Check for potential issues that could cause the leaflet-gpx library to fail
  const gpxRoot = gpxDoc.querySelector("gpx");
  const hasTrackSegments = gpxDoc.querySelectorAll("trkseg").length > 0;
  const hasRoutes = gpxDoc.querySelectorAll("rte").length > 0;

  // Additional checks for common problematic patterns
  const hasValidTrackPoints = trackPoints.length > 0;
  const hasValidWaypoints = waypoints.length > 0;

  // If the GPX file has issues or we have a problematic structure, use fallback immediately
  if (
    !gpxRoot ||
    (!hasTrackSegments && !hasRoutes && !hasValidWaypoints) ||
    (hasTrackSegments && !hasValidTrackPoints)
  ) {
    console.log(
      "GPX structure issues detected, using fallback method immediately"
    );
    createFallbackGpx();
    return;
  }

  // For this specific GPX file pattern (routemaker.nl with specific structure), use fallback
  if (
    gpxText.includes('creator="routemaker.nl"') &&
    gpxText.includes('version="1.0"')
  ) {
    console.log(
      "Known problematic GPX pattern detected (routemaker.nl), using fallback immediately"
    );
    createFallbackGpx();
    return;
  }

  try {
    window.gpxLayer = new L.GPX(gpxText, {
      async: true,
      marker_options: {
        startIconUrl: "https://unpkg.com/leaflet-gpx@1.5.1/pin-icon-start.png",
        endIconUrl: "https://unpkg.com/leaflet-gpx@1.5.1/pin-icon-end.png",
        shadowUrl: "https://unpkg.com/leaflet-gpx@1.5.1/pin-shadow.png",
      },
    })
      .on("loaded", function (e) {
        map.fitBounds(e.target.getBounds());
        const statusMessage = filename
          ? `GPX loaded: ${filename} (${trackPoints.length} track points)`
          : `GPX loaded with ${trackPoints.length} track points`;
        showStatus(statusMessage);

        // Update buttons to show clear option since GPX is loaded
        updateGpxButtonStates(true);

        // Filter JSON points by proximity to GPX track points
        if (jsonPointsData && trackPoints.length > 0) {
          const nearbyPoints = filterPointsByProximity(
            jsonPointsData,
            trackPoints,
            50
          );
          console.log(
            `Found ${nearbyPoints.length} points within 50m of GPX route:`,
            nearbyPoints
          );

          // Add markers for nearby points
          nearbyPoints.forEach((point) => {
            if (point.converted) {
              // Extract number from point name
              const pointNumber = point.name
                ? point.name.match(/\d+/)?.[0] || "?"
                : "?";

              // Create custom numbered icon
              const numberedIcon = L.divIcon({
                className: "custom-numbered-icon",
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30],
                html: `<div style="
                background: #ff4444;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                border: 2px solid white;
              ">
                <span style="transform: rotate(45deg);">${pointNumber}</span>
              </div>`,
              });

              const marker = L.marker(
                [point.converted.lat, point.converted.lng],
                {
                  icon: numberedIcon,
                }
              )
                .on("click", function () {
                  // Open Google Maps when marker is clicked
                  window.open(
                    `https://maps.google.com/?q=${point.converted.lat},${point.converted.lng}`,
                    "_blank"
                  );
                })
                .addTo(map);

              // Store marker in array for later removal
              waypointMarkers.push(marker);
            }
          });
        }
      })
      .on("addpoint", function (e) {
        const wp = e.point;
        if (wp && wp.getLatLng && wp._name) {
          wp.bindPopup(`<strong>${wp._name}</strong>`);
        }
      })
      .on("error", function (e) {
        console.error("GPX loading error:", e);
        showStatus("GPX library failed, using fallback method...", 2000);
        createFallbackGpx();
      })
      .addTo(map);
  } catch (error) {
    console.error("Error creating GPX layer:", error);
    showStatus("Primary GPX parsing failed, using fallback method...", 2000);
    createFallbackGpx();
  }

  // Function to create fallback GPX visualization
  function createFallbackGpx() {
    try {
      let bounds = null;

      // Create polyline if we have track points
      if (trackPoints.length > 0) {
        const polyline = L.polyline(
          trackPoints.map((p) => [p.lat, p.lng]),
          {
            color: "blue",
            weight: 4,
            opacity: 0.8,
          }
        ).addTo(map);

        bounds = polyline.getBounds();
        window.gpxLayer = polyline;

        // Add start and end markers for tracks
        if (trackPoints.length > 1) {
          const startPoint = trackPoints[0];
          const endPoint = trackPoints[trackPoints.length - 1];

          L.marker([startPoint.lat, startPoint.lng])
            .bindPopup("Start")
            .addTo(map);

          L.marker([endPoint.lat, endPoint.lng]).bindPopup("End").addTo(map);
        }
      }

      // Add waypoint markers - DISABLED
      // We don't want to show the GPX waypoints on the map
      /*
      if (waypoints.length > 0) {
        waypoints.forEach((waypoint, index) => {
          const marker = L.marker([waypoint.lat, waypoint.lng])
            .bindPopup(`<strong>${waypoint.name}</strong>`)
            .addTo(map);

          waypointMarkers.push(marker);

          // If no track points, use waypoints to set bounds
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
      */

      // If no track points but we have waypoints, use waypoints for bounds calculation only
      if (!bounds && waypoints.length > 0) {
        bounds = L.latLngBounds(
          [waypoints[0].lat, waypoints[0].lng],
          [waypoints[0].lat, waypoints[0].lng]
        );
        waypoints.forEach((waypoint) => {
          bounds.extend([waypoint.lat, waypoint.lng]);
        });
      }

      // Fit map to bounds
      if (bounds) {
        map.fitBounds(bounds);
      }

      const statusMessage = filename
        ? `GPX loaded (fallback): ${filename} (${trackPoints.length} track points, ${waypoints.length} waypoints)`
        : `GPX loaded (fallback) with ${trackPoints.length} track points, ${waypoints.length} waypoints`;
      showStatus(statusMessage);

      // Update buttons to show clear option since GPX is loaded
      updateGpxButtonStates(true);

      // Handle proximity filtering for JSON points if available
      if (jsonPointsData && trackPoints.length > 0) {
        const nearbyPoints = filterPointsByProximity(
          jsonPointsData,
          trackPoints,
          50
        );
        console.log(
          `Found ${nearbyPoints.length} points within 50m of GPX route:`,
          nearbyPoints
        );

        // Add markers for nearby points
        nearbyPoints.forEach((point) => {
          if (point.converted) {
            // Extract number from point name
            const pointNumber = point.name
              ? point.name.match(/\d+/)?.[0] || "?"
              : "?";

            // Create custom numbered icon
            const numberedIcon = L.divIcon({
              className: "custom-numbered-icon",
              iconSize: [30, 30],
              iconAnchor: [15, 30],
              popupAnchor: [0, -30],
              html: `<div style="
                background: #ff4444;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                border: 2px solid white;
              ">
                <span style="transform: rotate(45deg);">${pointNumber}</span>
              </div>`,
            });

            const marker = L.marker(
              [point.converted.lat, point.converted.lng],
              {
                icon: numberedIcon,
              }
            )
              .on("click", function () {
                // Open Google Maps when marker is clicked
                window.open(
                  `https://maps.google.com/?q=${point.converted.lat},${point.converted.lng}`,
                  "_blank"
                );
              })
              .addTo(map);

            // Store marker in array for later removal
            waypointMarkers.push(marker);
          }
        });
      }
    } catch (fallbackError) {
      console.error("Fallback parsing also failed:", fallbackError);
      showStatus("Error: Could not load GPX file with any method", 5000);
      updateGpxButtonStates(false);
    }
  }
}

// Define coordinate systems
// RD New (Dutch coordinate system)
proj4.defs(
  "EPSG:28992",
  "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs"
);

// WGS84 (GPS coordinates)
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

// Function to convert coordinates to WGS84
function convertToWGS84(x, y) {
  try {
    // First check if coordinates might already be in WGS84 range
    if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
      console.log("Coordinates appear to be in WGS84 already");
      return { lng: x, lat: y };
    }

    // Check if coordinates are in typical RD range
    if (x >= 0 && x <= 300000 && y >= 300000 && y <= 700000) {
      console.log("Coordinates appear to be in RD (EPSG:28992)");
      const result = proj4("EPSG:28992", "EPSG:4326", [x, y]);
      return { lng: result[0], lat: result[1] };
    }

    // Check if coordinates might be in Web Mercator (EPSG:3857)
    if (Math.abs(x) > 180 && Math.abs(y) > 90) {
      proj4.defs(
        "EPSG:3857",
        "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs"
      );
      const result = proj4("EPSG:3857", "EPSG:4326", [x, y]);
      return { lng: result[0], lat: result[1] };
    }

    // If nothing else works, try RD anyway
    const result = proj4("EPSG:28992", "EPSG:4326", [x, y]);
    return { lng: result[0], lat: result[1] };
  } catch (error) {
    console.error("Coordinate conversion error:", error);
    return null;
  }
}

fetch("./fk.json")
  .then((response) => response.json())
  .then((data) => {
    // Filter for points only (items where geom_type is "Point" or geom_point is not null)
    const pointsOnly = data.result.filter(
      (item) => item.geom_type === "Point" || item.geom_point !== null
    );

    console.log("Number of points found:", pointsOnly.length);

    // Log some sample coordinates to understand the coordinate system
    if (pointsOnly.length > 0) {
      console.log("Sample coordinates from JSON:");
      pointsOnly.slice(0, 3).forEach((point, index) => {
        if (point.geom_point) {
          console.log(
            `Point ${index}: [${point.geom_point[0]}, ${point.geom_point[1]}]`
          );

          // Test different coordinate system assumptions
          console.log("Testing different coordinate systems:");

          // Test as RD (EPSG:28992)
          const rdResult = convertToWGS84(
            point.geom_point[0],
            point.geom_point[1]
          );
          if (rdResult) {
            console.log(
              `  Converted to WGS84: [${rdResult.lat}, ${rdResult.lng}]`
            );
          }

          // Test as if already in WGS84 but swapped
          console.log(
            `  As WGS84 (direct): [${point.geom_point[1]}, ${point.geom_point[0]}]`
          );
          console.log(
            `  As WGS84 (swapped): [${point.geom_point[0]}, ${point.geom_point[1]}]`
          );
        }
      });
    }

    // Store for later filtering against GPX
    jsonPointsData = pointsOnly;

    // After loading fk.json, check for saved GPX in localStorage
    const savedGpx = loadGpxFromStorage();
    if (savedGpx) {
      console.log("Loading saved GPX from localStorage:", savedGpx.filename);
      showStatus(`Loading saved GPX: ${savedGpx.filename}`, 2000);
      processGpxContent(savedGpx.content, savedGpx.filename);
    } else {
      // No saved GPX, ensure buttons show load state
      updateGpxButtonStates(false);
    }
  })
  .catch((error) => {
    console.error("Error loading fk.json:", error);

    // Even if fk.json fails, still try to load saved GPX
    const savedGpx = loadGpxFromStorage();
    if (savedGpx) {
      console.log(
        "Loading saved GPX from localStorage (fk.json failed):",
        savedGpx.filename
      );
      showStatus(`Loading saved GPX: ${savedGpx.filename}`, 2000);
      processGpxContent(savedGpx.content, savedGpx.filename);
    } else {
      // No saved GPX, ensure buttons show load state
      updateGpxButtonStates(false);
    }
  });

// Initialize button states on page load
document.addEventListener("DOMContentLoaded", function () {
  const savedGpx = loadGpxFromStorage();
  if (!savedGpx) {
    updateGpxButtonStates(false);
  }
});

// Function to calculate distance between two lat/lng points in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Function to filter points by proximity to GPX track points
function filterPointsByProximity(jsonPoints, gpxTrackPoints, maxDistance = 50) {
  // First pass: calculate minimum distance to GPX track for each JSON point
  const pointsWithDistance = jsonPoints
    .map((jsonPoint) => {
      if (
        !jsonPoint.geom_point ||
        !jsonPoint.geom_point[0] ||
        !jsonPoint.geom_point[1]
      ) {
        return null;
      }

      // Convert coordinates to WGS84
      const converted = convertToWGS84(
        jsonPoint.geom_point[0],
        jsonPoint.geom_point[1]
      );
      if (!converted) {
        console.warn("Failed to convert coordinates for point:", jsonPoint);
        return null;
      }

      const jsonLat = converted.lat;
      const jsonLon = converted.lng;

      // Find minimum distance to any GPX track point
      let minDistance = Infinity;
      gpxTrackPoints.forEach((gpxPoint) => {
        const distance = calculateDistance(
          jsonLat,
          jsonLon,
          gpxPoint.lat,
          gpxPoint.lng
        );
        if (distance < minDistance) {
          minDistance = distance;
        }
      });

      return {
        ...jsonPoint,
        converted,
        minDistanceToTrack: minDistance,
      };
    })
    .filter(
      (point) => point !== null && point.minDistanceToTrack <= maxDistance
    );

  // Second pass: remove points that are too close to each other, keeping only the closest to track
  const filteredPoints = [];
  const minSeparation = 25; // Minimum separation between points in meters

  pointsWithDistance.forEach((point) => {
    const tooClose = filteredPoints.some((existingPoint) => {
      const distance = calculateDistance(
        point.converted.lat,
        point.converted.lng,
        existingPoint.converted.lat,
        existingPoint.converted.lng
      );
      return distance < minSeparation;
    });

    if (!tooClose) {
      filteredPoints.push(point);
    } else {
      // If this point is closer to the track than existing nearby points, replace them
      const nearbyPointIndex = filteredPoints.findIndex((existingPoint) => {
        const distance = calculateDistance(
          point.converted.lat,
          point.converted.lng,
          existingPoint.converted.lat,
          existingPoint.converted.lng
        );
        return (
          distance < minSeparation &&
          point.minDistanceToTrack < existingPoint.minDistanceToTrack
        );
      });

      if (nearbyPointIndex !== -1) {
        filteredPoints[nearbyPointIndex] = point;
      }
    }
  });

  return filteredPoints;
}

// Load GPX
document.getElementById("gpxFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  showStatus("Loading GPX file...", 1000);

  const reader = new FileReader();
  reader.onload = function (event) {
    const gpxText = event.target.result;

    // Save to localStorage
    saveGpxToStorage(gpxText, file.name);

    // Process the GPX content
    processGpxContent(gpxText, file.name);
  };
  reader.readAsText(file);
});

// Location marker
let userMarker = null;
let heading = 0;
let followMode = false;
let initialLocationSet = false;

// Arrow icon
const arrowIcon = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: `<svg class="arrow" width="30" height="30" viewBox="0 0 100 100">
           <polygon points="50,0 90,100 50,75 10,100" fill="blue"/>
         </svg>`,
});

// Follow mode toggle (for both desktop and mobile)
function toggleFollowMode() {
  followMode = !followMode;
  const followText = followMode ? "Unfollow" : "Follow";
  document.getElementById("toggleFollow").textContent = followText;
  document.getElementById("toggleFollowMobile").textContent = followText;

  // Show status
  showStatus(followMode ? "Follow mode enabled" : "Follow mode disabled");

  if (followMode && userMarker) {
    map.setView(userMarker.getLatLng());
  }
}

document
  .getElementById("toggleFollow")
  .addEventListener("click", toggleFollowMode);
document
  .getElementById("toggleFollowMobile")
  .addEventListener("click", toggleFollowMode);

// Center map button
document.getElementById("centerMap").addEventListener("click", () => {
  if (userMarker) {
    map.setView(userMarker.getLatLng(), map.getZoom());
    showStatus("Centered on your location");
  } else if (window.gpxLayer) {
    map.fitBounds(window.gpxLayer.getBounds());
    showStatus("Centered on GPX route");
  } else {
    showStatus("No location or route to center on");
  }
});

// Clear GPX function
function clearSavedGpx() {
  try {
    localStorage.removeItem("savedGpx");
    if (window.gpxLayer) {
      map.removeLayer(window.gpxLayer);
      window.gpxLayer = null;
    }
    // Clear all waypoint markers
    waypointMarkers.forEach((marker) => map.removeLayer(marker));
    waypointMarkers = [];

    // Update buttons to show load option since no GPX is loaded
    updateGpxButtonStates(false);
    showStatus("GPX and waypoints cleared");
  } catch (error) {
    console.error("Error clearing GPX from localStorage:", error);
    showStatus("Error clearing GPX");
  }
}

// Status display function
function showStatus(message, duration = 2000) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.style.display = "block";
  setTimeout(() => {
    status.style.display = "none";
  }, duration);
}

// Watch position
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const latlng = [pos.coords.latitude, pos.coords.longitude];

      if (!userMarker) {
        userMarker = L.marker(latlng, {
          icon: arrowIcon,
        }).addTo(map);

        // Center map on user's location when first detected
        if (!initialLocationSet) {
          map.setView(latlng, 16); // Higher zoom for mobile
          initialLocationSet = true;
        } else if (followMode) {
          map.setView(latlng, map.getZoom()); // Maintain current zoom level
        }
      } else {
        userMarker.setLatLng(latlng);
        if (followMode) map.setView(latlng, map.getZoom()); // Maintain current zoom
      }
    },
    (err) => {
      console.error("Geolocation error:", err);
      showStatus("Location access denied or unavailable", 3000);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
    }
  );
} else {
  showStatus("Geolocation not supported by this device", 3000);
}

// Handle compass heading
function handleOrientation(event) {
  if (event.absolute || event.webkitCompassHeading !== undefined) {
    heading = event.webkitCompassHeading || 360 - event.alpha;
    const svg = document.querySelector(".arrow");
    if (svg) {
      svg.style.transform = `rotate(${heading}deg)`;
    }
  }
}

if (window.DeviceOrientationEvent) {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then((permissionState) => {
        if (permissionState === "granted") {
          window.addEventListener("deviceorientation", handleOrientation, true);
        }
      })
      .catch(console.error);
  } else {
    window.addEventListener("deviceorientation", handleOrientation, true);
  }
}
