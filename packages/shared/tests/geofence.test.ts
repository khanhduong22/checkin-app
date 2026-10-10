import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  isInsideGeofence,
  normalizeCoordinates,
} from "../src/rules/geofence";

describe("geofence utilities", () => {
  const storeLocation = { lat: 10.7769, lon: 106.7009 }; // Saigon Center

  it("normalizes varied coordinate keys", () => {
    const c1 = normalizeCoordinates({ latitude: 10.5, longitude: 106.5 });
    expect(c1).toEqual({ lat: 10.5, lon: 106.5 });

    const c2 = normalizeCoordinates({ lat: 10.5, lng: 106.5 });
    expect(c2).toEqual({ lat: 10.5, lon: 106.5 });
  });

  it("returns 0 distance for identical coordinates", () => {
    expect(haversineDistance(storeLocation, storeLocation)).toBe(0);
  });

  it("detects location inside geofence boundary", () => {
    // 10 meters away
    const userLoc = { lat: 10.77695, lon: 106.70095 };
    const res = isInsideGeofence(userLoc, storeLocation, 100);
    expect(res.isInside).toBe(true);
    expect(res.distanceMeters).toBeLessThan(100);
  });

  it("detects location outside geofence boundary", () => {
    // ~1 km away
    const farLoc = { lat: 10.785, lon: 106.71 };
    const res = isInsideGeofence(farLoc, storeLocation, 50);
    expect(res.isInside).toBe(false);
    expect(res.distanceMeters).toBeGreaterThan(50);
  });
});
