import { describe, expect, it } from 'vitest';
import {
  angularDistance,
  greatCircleFeature,
  interpolateGreatCircle,
  isNoNorthRoute,
} from './greatCircle';

describe('isNoNorthRoute', () => {
  it('allows travel due south', () => {
    expect(
      isNoNorthRoute({ lat: 50, lng: 10 }, { lat: -20, lng: 10 }),
    ).toBe(true);
  });

  it('rejects travel due north', () => {
    expect(
      isNoNorthRoute({ lat: -20, lng: 10 }, { lat: 50, lng: 10 }),
    ).toBe(false);
  });

  it('allows equatorial east and west travel', () => {
    expect(isNoNorthRoute({ lat: 0, lng: 0 }, { lat: 0, lng: 90 })).toBe(
      true,
    );
    expect(isNoNorthRoute({ lat: 0, lng: 0 }, { lat: 0, lng: -90 })).toBe(
      true,
    );
  });

  it('allows ordinary destinations from the North Pole', () => {
    expect(isNoNorthRoute({ lat: 90, lng: 0 }, { lat: 20, lng: 130 })).toBe(
      true,
    );
  });

  it('rejects ordinary destinations from the South Pole', () => {
    expect(isNoNorthRoute({ lat: -90, lng: 0 }, { lat: -20, lng: 50 })).toBe(
      false,
    );
  });

  it('rejects ambiguous antipodal routes', () => {
    expect(isNoNorthRoute({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBe(
      false,
    );
  });

  it('rejects a route that reaches north before a lower-latitude destination', () => {
    expect(isNoNorthRoute({ lat: 40, lng: 0 }, { lat: 30, lng: 170 })).toBe(
      false,
    );
  });
});

describe('great-circle geometry', () => {
  it('interpolates along the equator', () => {
    const midpoint = interpolateGreatCircle(
      { lat: 0, lng: 0 },
      { lat: 0, lng: 90 },
      0.5,
    );
    expect(midpoint.lat).toBeCloseTo(0, 8);
    expect(midpoint.lng).toBeCloseTo(45, 8);
  });

  it('uses the shorter arc', () => {
    expect(
      angularDistance({ lat: 0, lng: 170 }, { lat: 0, lng: -170 }),
    ).toBeCloseTo((20 * Math.PI) / 180, 8);
  });

  it('splits a route at the antimeridian', () => {
    const feature = greatCircleFeature(
      { lat: 10, lng: 170 },
      { lat: -10, lng: -170 },
    );
    expect(feature.geometry.coordinates).toHaveLength(2);
  });
});
