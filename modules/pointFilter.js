import { CoordinateConverter } from "./coordinates.js";
import { CONFIG } from "./config.js";

export class PointFilter {
  constructor() {
    this.converter = new CoordinateConverter();
  }

  filterByProximity(
    jsonPoints,
    gpxTrackPoints,
    maxDistance = CONFIG.PROXIMITY.MAX_DISTANCE
  ) {
    // First pass: calculate minimum distance to GPX track for each JSON point
    const pointsWithDistance = this.calculatePointDistances(
      jsonPoints,
      gpxTrackPoints,
      maxDistance
    );

    // Second pass: remove points that are too close to each other
    return this.removeDuplicatePoints(pointsWithDistance);
  }

  calculatePointDistances(jsonPoints, gpxTrackPoints, maxDistance) {
    return jsonPoints
      .map((jsonPoint) => {
        if (
          !jsonPoint.geom_point ||
          !jsonPoint.geom_point[0] ||
          !jsonPoint.geom_point[1]
        ) {
          return null;
        }

        // Convert coordinates to WGS84
        const converted = this.converter.convertToWGS84(
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
          const distance = this.converter.calculateDistance(
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
  }

  removeDuplicatePoints(
    pointsWithDistance,
    minSeparation = CONFIG.PROXIMITY.MIN_SEPARATION
  ) {
    const filteredPoints = [];

    pointsWithDistance.forEach((point) => {
      const tooClose = filteredPoints.some((existingPoint) => {
        const distance = this.converter.calculateDistance(
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
          const distance = this.converter.calculateDistance(
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
}
