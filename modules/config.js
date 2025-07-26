export const CONFIG = {
  MAP: {
    DEFAULT_VIEW: [52.3676, 4.9041],
    DEFAULT_ZOOM: 8,
    MOBILE_ZOOM: 16,
    TILE_URL: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    ATTRIBUTION: "© OpenStreetMap contributors",
  },
  PROXIMITY: {
    MAX_DISTANCE: 50,
    MIN_SEPARATION: 25,
  },
  STORAGE_KEYS: {
    LAST_GPX: "last_gpx",
    GPX_PREFIX: "gpx_",
    WAYPOINT_SUFFIX: "_wp",
  },
  GPX: {
    MARKER_OPTIONS: {
      startIconUrl: "https://unpkg.com/leaflet-gpx@1.5.1/pin-icon-start.png",
      endIconUrl: "https://unpkg.com/leaflet-gpx@1.5.1/pin-icon-end.png",
      shadowUrl: "https://unpkg.com/leaflet-gpx@1.5.1/pin-shadow.png",
    },
    POLYLINE_OPTIONS: {
      color: "blue",
      weight: 4,
      opacity: 0.8,
    },
  },
  GEOLOCATION: {
    enableHighAccuracy: true,
    maximumAge: 1000,
  },
  COORDINATES: {
    EPSG_28992:
      "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs",
    EPSG_4326: "+proj=longlat +datum=WGS84 +no_defs",
    EPSG_3857:
      "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs",
  },
};
