import type { StyleSpecification } from 'maplibre-gl';
import { countries } from './worldData';

const emptyCollection = { type: 'FeatureCollection' as const, features: [] };

export const createMapStyle = (
  projection: 'globe' | 'mercator',
): StyleSpecification => ({
  version: 8,
  projection: { type: projection },
  sources: {
    countries: { type: 'geojson', data: countries },
    mask: { type: 'geojson', data: emptyCollection },
    route: { type: 'geojson', data: emptyCollection },
    points: { type: 'geojson', data: emptyCollection },
  },
  sky: {
    'sky-color': '#02030a',
    'horizon-color': '#02030a',
    'fog-color': '#02030a',
    'sky-horizon-blend': 0.08,
    'horizon-fog-blend': 0.08,
    'fog-ground-blend': 0,
    'atmosphere-blend': 0,
  },
  layers: [
    {
      id: 'ocean',
      type: 'background',
      paint: { 'background-color': '#115ca8' },
    },
    {
      id: 'land',
      type: 'fill',
      source: 'countries',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'name'], 'Antarctica'],
          '#f3f5ef',
          '#4ba95f',
        ],
        'fill-antialias': false,
      },
    },
    {
      id: 'valid-destination-mask',
      type: 'fill',
      source: 'mask',
      paint: {
        'fill-color': '#8b5cf6',
        'fill-opacity': 0.3,
        'fill-antialias': false,
      },
    },
    {
      id: 'route-shadow',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#161020',
        'line-width': 6,
        'line-opacity': 0.72,
      },
    },
    {
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#ffe8a3',
        'line-width': 3,
        'line-opacity': 1,
      },
    },
    {
      id: 'point-halo',
      type: 'circle',
      source: 'points',
      paint: {
        'circle-radius': 10,
        'circle-color': '#090913',
        'circle-opacity': 0.72,
      },
    },
    {
      id: 'points',
      type: 'circle',
      source: 'points',
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'match',
          ['get', 'kind'],
          'origin',
          '#fb7185',
          '#ffe8a3',
        ],
        'circle-stroke-color': '#fffdf5',
        'circle-stroke-width': 1.5,
      },
    },
  ],
});
