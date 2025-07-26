export class MarkerFactory {
  constructor(map) {
    this.map = map;
    this.waypointMarkers = [];
  }

  createNumberedIcon(pointNumber) {
    return L.divIcon({
      className: "custom-numbered-icon",
      iconSize: [60, 60],
      iconAnchor: [30, 60],
      popupAnchor: [0, -60],
      html: `<div style="
        background: #ff4444;
        color: white;
        width: 60px;
        height: 60px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 24px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 4px solid white;
      ">
        <span style="transform: rotate(45deg);">${pointNumber}</span>
      </div>`,
    });
  }

  createWaypointMarker(waypoint, index) {
    // Extract number from waypoint name, or use index + 1 as fallback
    const pointNumber = waypoint.name
      ? waypoint.name.match(/\d+/)?.[0] || (index + 1).toString()
      : (index + 1).toString();

    const numberedIcon = this.createNumberedIcon(pointNumber);

    const marker = L.marker([waypoint.lat, waypoint.lng], {
      icon: numberedIcon,
    })
      .on("click", function () {
        // Open Google Maps when marker is clicked
        window.open(
          `https://maps.google.com/?q=${waypoint.lat},${waypoint.lng}`,
          "_blank"
        );
      })
      .addTo(this.map);

    return marker;
  }

  createPointMarker(point, pointNumber) {
    const numberedIcon = this.createNumberedIcon(pointNumber);

    const marker = L.marker([point.converted.lat, point.converted.lng], {
      icon: numberedIcon,
    })
      .on("click", function () {
        // Open Google Maps when marker is clicked
        window.open(
          `https://maps.google.com/?q=${point.converted.lat},${point.converted.lng}`,
          "_blank"
        );
      })
      .addTo(this.map);

    return marker;
  }

  createStartEndMarkers(trackPoints) {
    const markers = [];
    if (trackPoints.length > 1) {
      const startPoint = trackPoints[0];
      const endPoint = trackPoints[trackPoints.length - 1];

      const startMarker = L.marker([startPoint.lat, startPoint.lng])
        .bindPopup("Start")
        .addTo(this.map);

      const endMarker = L.marker([endPoint.lat, endPoint.lng])
        .bindPopup("End")
        .addTo(this.map);

      markers.push(startMarker, endMarker);
    }
    return markers;
  }

  createArrowIcon() {
    return L.divIcon({
      className: "",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: `<svg class="arrow" width="30" height="30" viewBox="0 0 100 100">
               <polygon points="50,0 90,100 50,75 10,100" fill="blue"/>
             </svg>`,
    });
  }

  addWaypointMarker(marker) {
    this.waypointMarkers.push(marker);
  }

  clearWaypointMarkers() {
    this.waypointMarkers.forEach((marker) => this.map.removeLayer(marker));
    this.waypointMarkers = [];
  }

  getWaypointMarkers() {
    return this.waypointMarkers;
  }
}
