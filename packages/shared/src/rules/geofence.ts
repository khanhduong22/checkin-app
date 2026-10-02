/**
 * Geofencing & coordinate calculations (Haversine & Vincenty algorithms).
 * Inherited from @kt/geo-guard.
 */

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface CoordinatesInput {
  lat?: number;
  latitude?: number;
  lon?: number;
  lng?: number;
  longitude?: number;
}

export const SPHERICAL_EARTH_RADIUS_METERS = 6371000;

export function normalizeCoordinates(coords: CoordinatesInput): Coordinates {
  const lat = coords.lat ?? coords.latitude;
  const lon = coords.lon ?? coords.lng ?? coords.longitude;

  if (lat === undefined || lon === undefined) {
    throw new Error(
      "Coordinates must contain valid latitude (lat/latitude) and longitude (lon/lng/longitude)"
    );
  }

  if (lat < -90 || lat > 90) {
    throw new RangeError(`Latitude ${lat} is out of bounds [-90, 90]`);
  }

  if (lon < -180 || lon > 180) {
    throw new RangeError(`Longitude ${lon} is out of bounds [-180, 180]`);
  }

  return { lat, lon };
}

/**
 * Calculates great-circle distance between two points in meters using Haversine formula.
 */
export function haversineDistance(
  from: CoordinatesInput,
  to: CoordinatesInput
): number {
  const c1 = normalizeCoordinates(from);
  const c2 = normalizeCoordinates(to);

  if (c1.lat === c2.lat && c1.lon === c2.lon) {
    return 0;
  }

  const rad = Math.PI / 180;
  const dLat = (c2.lat - c1.lat) * rad;
  const dLon = (c2.lon - c1.lon) * rad;

  const lat1Rad = c1.lat * rad;
  const lat2Rad = c2.lat * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const distance = SPHERICAL_EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100;
}

export interface GeofenceResult {
  isInside: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  deltaMeters: number;
}

/**
 * Checks if user location is inside specified radius of a store/office location.
 */
export function isInsideGeofence(
  userLoc: CoordinatesInput,
  target: CoordinatesInput,
  radiusMeters: number = 100
): GeofenceResult {
  const distanceMeters = haversineDistance(userLoc, target);
  const isInside = distanceMeters <= radiusMeters;
  const deltaMeters = Math.round((distanceMeters - radiusMeters) * 100) / 100;

  return {
    isInside,
    distanceMeters,
    allowedRadiusMeters: radiusMeters,
    deltaMeters,
  };
}
