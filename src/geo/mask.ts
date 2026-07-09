import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { isNoNorthRoute } from './greatCircle';
import type { Coordinates } from './types';

const GRID_STEP = 0.5;

const rectangle = (
  west: number,
  east: number,
  south: number,
  north: number,
): Feature<Polygon> => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  },
});

/**
 * Converts the exact predicate to thin run-length encoded bands. MapLibre then
 * projects these polygons natively onto either the globe or Mercator map.
 */
export const createNoNorthMask = (
  origin: Coordinates,
): FeatureCollection<Polygon> => {
  const features: Feature<Polygon>[] = [];
  const longitudeCells = Math.round(360 / GRID_STEP);

  for (let south = -90; south < 90; south += GRID_STEP) {
    const north = Math.min(90, south + GRID_STEP);
    const latitude = (south + north) / 2;
    let runStart: number | null = null;

    for (let cell = 0; cell <= longitudeCells; cell += 1) {
      const valid =
        cell < longitudeCells &&
        isNoNorthRoute(origin, {
          lat: latitude,
          lng: -180 + (cell + 0.5) * GRID_STEP,
        });

      if (valid && runStart === null) runStart = cell;
      if (!valid && runStart !== null) {
        features.push(
          rectangle(
            -180 + runStart * GRID_STEP,
            -180 + cell * GRID_STEP,
            south,
            north,
          ),
        );
        runStart = null;
      }
    }
  }

  return { type: 'FeatureCollection', features };
};
