import type { Feature, MultiLineString } from 'geojson';
import type { Coordinates } from './types';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371.0088;
const EPSILON = 1e-10;

type Vector3 = { x: number; y: number; z: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toVector = ({ lat, lng }: Coordinates): Vector3 => {
  const phi = lat * DEG;
  const lambda = lng * DEG;
  const cosPhi = Math.cos(phi);
  return {
    x: cosPhi * Math.cos(lambda),
    y: cosPhi * Math.sin(lambda),
    z: Math.sin(phi),
  };
};

const dot = (a: Vector3, b: Vector3) =>
  a.x * b.x + a.y * b.y + a.z * b.z;

export const angularDistance = (from: Coordinates, to: Coordinates) =>
  Math.acos(clamp(dot(toVector(from), toVector(to)), -1, 1));

/**
 * Returns true when latitude never increases along the shorter spherical arc.
 * The z derivative of a great circle is sinusoidal. On an arc shorter than pi,
 * checking it at both endpoints is sufficient to rule out a northward segment.
 */
export const isNoNorthRoute = (origin: Coordinates, destination: Coordinates) => {
  const a = toVector(origin);
  const b = toVector(destination);
  const cosine = clamp(dot(a, b), -1, 1);

  if (1 - cosine < EPSILON) return true;
  if (1 + cosine < EPSILON) return false;

  const startLatitudeDerivative = b.z - a.z * cosine;
  const endLatitudeDerivative = b.z * cosine - a.z;

  return (
    startLatitudeDerivative <= EPSILON &&
    endLatitudeDerivative <= EPSILON
  );
};

export const distanceKm = (from: Coordinates, to: Coordinates) =>
  angularDistance(from, to) * EARTH_RADIUS_KM;

export const initialBearing = (from: Coordinates, to: Coordinates) => {
  const phi1 = from.lat * DEG;
  const phi2 = to.lat * DEG;
  const deltaLambda = (to.lng - from.lng) * DEG;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (Math.atan2(y, x) * RAD + 360) % 360;
};

export const finalBearing = (from: Coordinates, to: Coordinates) =>
  (initialBearing(to, from) + 180) % 360;

const fromVector = ({ x, y, z }: Vector3): Coordinates => ({
  lat: Math.asin(clamp(z, -1, 1)) * RAD,
  lng: Math.atan2(y, x) * RAD,
});

export const interpolateGreatCircle = (
  from: Coordinates,
  to: Coordinates,
  fraction: number,
) => {
  const a = toVector(from);
  const b = toVector(to);
  const angle = Math.acos(clamp(dot(a, b), -1, 1));

  if (angle < EPSILON) return { ...from };
  if (Math.PI - angle < EPSILON) {
    throw new Error('Antipodal points do not define a unique great-circle route.');
  }

  const denominator = Math.sin(angle);
  const weightA = Math.sin((1 - fraction) * angle) / denominator;
  const weightB = Math.sin(fraction * angle) / denominator;
  return fromVector({
    x: weightA * a.x + weightB * b.x,
    y: weightA * a.y + weightB * b.y,
    z: weightA * a.z + weightB * b.z,
  });
};

const splitAtAntimeridian = (points: Coordinates[]) => {
  const lines: number[][][] = [];
  let line: number[][] = [[points[0].lng, points[0].lat]];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const delta = current.lng - previous.lng;

    if (delta > 180 || delta < -180) {
      const adjustedCurrentLng =
        delta > 180 ? current.lng - 360 : current.lng + 360;
      const boundary = delta > 180 ? -180 : 180;
      const fraction =
        (boundary - previous.lng) / (adjustedCurrentLng - previous.lng);
      const latitude =
        previous.lat + fraction * (current.lat - previous.lat);

      line.push([boundary, latitude]);
      lines.push(line);
      line = [[-boundary, latitude], [current.lng, current.lat]];
    } else {
      line.push([current.lng, current.lat]);
    }
  }

  lines.push(line);
  return lines;
};

export const greatCircleFeature = (
  from: Coordinates,
  to: Coordinates,
): Feature<MultiLineString> => {
  const angle = angularDistance(from, to);
  const steps = Math.max(32, Math.ceil(angle * RAD * 2));
  const points = Array.from({ length: steps + 1 }, (_, index) =>
    interpolateGreatCircle(from, to, index / steps),
  );

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiLineString',
      coordinates: splitAtAntimeridian(points),
    },
  };
};

export const formatCoordinate = ({ lat, lng }: Coordinates) => {
  const latDirection = lat < 0 ? 'S' : 'N';
  const lngDirection = lng < 0 ? 'W' : 'E';
  return `${Math.abs(lat).toFixed(2)}° ${latDirection}, ${Math.abs(lng).toFixed(2)}° ${lngDirection}`;
};

export const compassBearing = (bearing: number) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return `${Math.round(bearing)}° ${directions[Math.round(bearing / 45) % 8]}`;
};
