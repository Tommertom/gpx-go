import { CONFIG } from "./config.js";

export class CoordinateConverter {
  constructor() {
    this.initProjections();
  }

  initProjections() {
    // Define coordinate systems
    proj4.defs("EPSG:28992", CONFIG.COORDINATES.EPSG_28992);
    proj4.defs("EPSG:4326", CONFIG.COORDINATES.EPSG_4326);
  }

  convertToWGS84(x, y) {
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
        proj4.defs("EPSG:3857", CONFIG.COORDINATES.EPSG_3857);
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

  calculateDistance(lat1, lon1, lat2, lon2) {
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
}
