import { useEffect, useRef } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { FeatureCollection, MultiLineString, Point, Polygon } from 'geojson';
import { createMapStyle } from '../map/mapStyle';
import type { Coordinates } from '../geo/types';

type Projection = 'globe' | 'mercator';

type Camera = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

type Props = {
  projection: Projection;
  origin: Coordinates | null;
  destination: Coordinates | null;
  mask: FeatureCollection<Polygon>;
  route: FeatureCollection<MultiLineString>;
  pickMode: 'origin' | 'destination';
  onPick: (coordinates: Coordinates) => void;
};

const EMPTY_MASK: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [],
};

const cameraDefaults: Record<Projection, Camera> = {
  globe: { center: [-24, 18], zoom: 1.15, bearing: 0, pitch: 0 },
  mercator: { center: [0, 8], zoom: 0.7, bearing: 0, pitch: 0 },
};

const pointCollection = (
  origin: Coordinates | null,
  destination: Coordinates | null,
): FeatureCollection<Point> => ({
  type: 'FeatureCollection',
  features: [
    ...(origin
      ? [
          {
            type: 'Feature' as const,
            properties: { kind: 'origin' },
            geometry: {
              type: 'Point' as const,
              coordinates: [
                origin.lng,
                Math.max(-89.999, Math.min(89.999, origin.lat)),
              ],
            },
          },
        ]
      : []),
    ...(destination
      ? [
          {
            type: 'Feature' as const,
            properties: { kind: 'destination' },
            geometry: {
              type: 'Point' as const,
              coordinates: [
                destination.lng,
                Math.max(-89.999, Math.min(89.999, destination.lat)),
              ],
            },
          },
        ]
      : []),
  ],
});

export function MapExplorer({
  projection,
  origin,
  destination,
  mask,
  route,
  pickMode,
  onPick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onPickRef = useRef(onPick);
  const previousOriginRef = useRef<Coordinates | null>(null);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initial = cameraDefaults[projection];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createMapStyle(projection),
      center: initial.center,
      zoom: initial.zoom,
      bearing: initial.bearing,
      pitch: initial.pitch,
      minZoom: projection === 'globe' ? 0.35 : 0,
      maxZoom: 9,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
      'bottom-right',
    );
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Geography: Natural Earth',
      }),
      'bottom-right',
    );

    map.on('click', (event) => {
      onPickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      (map.getSource('mask') as GeoJSONSource | undefined)?.setData(
        origin ? mask : EMPTY_MASK,
      );
      (map.getSource('route') as GeoJSONSource | undefined)?.setData(route);
      (map.getSource('points') as GeoJSONSource | undefined)?.setData(
        pointCollection(origin, destination),
      );
    };

    if (map.isStyleLoaded()) update();
    else map.once('load', update);
  }, [origin, destination, mask, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin || previousOriginRef.current === origin) return;
    previousOriginRef.current = origin;

    const displayLatitude = Math.max(-84, Math.min(84, origin.lat));
    map.easeTo({
      center: [origin.lng, displayLatitude],
      duration: 900,
      zoom: Math.max(map.getZoom(), projection === 'globe' ? 1.45 : 1.2),
    });
  }, [origin, projection]);

  return (
    <div className="map-frame">
      <div
        ref={containerRef}
        className={`map-container map-container--${projection}`}
        aria-label={`${projection === 'globe' ? 'Interactive globe' : 'Interactive Mercator map'}. Click to choose a ${pickMode}.`}
      />
      <div className="map-cursor-hint" aria-hidden="true">
        <span className={`cursor-dot cursor-dot--${pickMode}`} />
        Click to choose {pickMode === 'origin' ? 'an origin' : 'a destination'}
      </div>
      {projection === 'mercator' && origin && Math.abs(origin.lat) === 90 && (
        <div
          className={`pole-indicator pole-indicator--${origin.lat > 0 ? 'north' : 'south'}`}
        >
          <span>{origin.lat > 0 ? '↑' : '↓'}</span>
          {origin.lat > 0 ? 'North' : 'South'} Pole lies beyond the Mercator edge
        </div>
      )}
    </div>
  );
}
