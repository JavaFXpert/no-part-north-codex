import { useCallback, useMemo, useState } from 'react';
import type { FeatureCollection, MultiLineString } from 'geojson';
import { MapExplorer } from './components/MapExplorer';
import {
  angularDistance,
  compassBearing,
  distanceKm,
  finalBearing,
  formatCoordinate,
  greatCircleFeature,
  initialBearing,
  isNoNorthRoute,
} from './geo/greatCircle';
import { createNoNorthMask } from './geo/mask';
import { PRESETS } from './geo/presets';
import type { Coordinates } from './geo/types';

type Projection = 'globe' | 'mercator';
type PickMode = 'origin' | 'destination';

const EMPTY_ROUTE: FeatureCollection<MultiLineString> = {
  type: 'FeatureCollection',
  features: [],
};

const findPresetName = (coordinates: Coordinates) =>
  PRESETS.find(
    (preset) =>
      Math.abs(preset.lat - coordinates.lat) < 1e-6 &&
      Math.abs(preset.lng - coordinates.lng) < 1e-6,
  )?.name;

export default function App() {
  const [projection, setProjection] = useState<Projection>('globe');
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [originName, setOriginName] = useState<string | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>('origin');
  const [notice, setNotice] = useState(
    'Choose a preset or click anywhere on Earth to begin.',
  );

  const mask = useMemo(
    () =>
      origin
        ? createNoNorthMask(origin)
        : { type: 'FeatureCollection' as const, features: [] },
    [origin],
  );

  const route = useMemo<FeatureCollection<MultiLineString>>(() => {
    if (!origin || !destination) return EMPTY_ROUTE;
    return {
      type: 'FeatureCollection',
      features: [greatCircleFeature(origin, destination)],
    };
  }, [origin, destination]);

  const chooseOrigin = useCallback((coordinates: Coordinates, name?: string) => {
    setOrigin(coordinates);
    setOriginName(name ?? findPresetName(coordinates) ?? null);
    setDestination(null);
    setPickMode('destination');
    setNotice('Purple destinations can be reached without ever heading north.');
  }, []);

  const chooseDestination = useCallback(
    (coordinates: Coordinates) => {
      if (!origin) {
        chooseOrigin(coordinates);
        return;
      }

      const angle = angularDistance(origin, coordinates);
      if (angle < 1e-5) {
        setNotice('Choose a destination away from the origin.');
        return;
      }
      if (Math.PI - angle < 1e-5) {
        setNotice('That point is antipodal, so there is no unique shortest route.');
        return;
      }
      if (!isNoNorthRoute(origin, coordinates)) {
        setNotice('That route contains a northward component. Try inside the purple region.');
        return;
      }

      setDestination(coordinates);
      setNotice('Route selected. Switch projections to see why its shape changes.');
    },
    [chooseOrigin, origin],
  );

  const handleMapPick = useCallback(
    (coordinates: Coordinates) => {
      if (pickMode === 'origin') chooseOrigin(coordinates);
      else chooseDestination(coordinates);
    },
    [chooseDestination, chooseOrigin, pickMode],
  );

  const startOriginPick = () => {
    setOrigin(null);
    setOriginName(null);
    setDestination(null);
    setPickMode('origin');
    setNotice('Click anywhere on Earth, or choose a preset.');
  };

  const clearDestination = () => {
    setDestination(null);
    setPickMode('destination');
    setNotice('Choose another destination inside the purple region.');
  };

  const routeStats =
    origin && destination
      ? {
          distance: distanceKm(origin, destination),
          departure: initialBearing(origin, destination),
          arrival: finalBearing(origin, destination),
        }
      : null;

  return (
    <main className="app-shell">
      <MapExplorer
        key={projection}
        projection={projection}
        origin={origin}
        destination={destination}
        mask={mask}
        route={route}
        pickMode={pickMode}
        onPick={handleMapPick}
      />

      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <div>
            <h1>No Part North</h1>
            <p>Great circles, one rule</p>
          </div>
        </div>

        <nav className="projection-tabs" aria-label="Map projection">
          <button
            className={projection === 'globe' ? 'active' : ''}
            aria-pressed={projection === 'globe'}
            onClick={() => setProjection('globe')}
          >
            <span aria-hidden="true">◉</span> Globe
          </button>
          <button
            className={projection === 'mercator' ? 'active' : ''}
            aria-pressed={projection === 'mercator'}
            onClick={() => setProjection('mercator')}
          >
            <span aria-hidden="true">▱</span> Mercator
          </button>
        </nav>
      </header>

      <aside className="control-panel" aria-label="Route controls">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Explore the constraint</span>
            <h2>Go anywhere. Just not north.</h2>
          </div>
          <button
            className="info-button"
            title="A valid route has a bearing from 90° through 270° at every point."
            aria-label="About the route rule"
          >
            i
          </button>
        </div>

        <div className="steps" aria-label="Selection progress">
          <div className={`step ${origin ? 'complete' : 'active'}`}>
            <span>1</span>
            <div>
              <strong>Origin</strong>
              <small>{origin ? originName ?? formatCoordinate(origin) : 'Choose a point'}</small>
            </div>
          </div>
          <div className={`step ${destination ? 'complete' : origin ? 'active' : ''}`}>
            <span>2</span>
            <div>
              <strong>Destination</strong>
              <small>
                {destination ? formatCoordinate(destination) : origin ? 'Choose from purple' : 'Waiting for origin'}
              </small>
            </div>
          </div>
        </div>

        <div className="preset-section">
          <div className="section-label">
            <span>Preset origins</span>
            {origin && (
              <button className="text-button" onClick={startOriginPick}>
                Pick on map
              </button>
            )}
          </div>
          <div className="preset-grid">
            {PRESETS.map((preset) => {
              const selected = originName === preset.name;
              return (
                <button
                  key={preset.id}
                  className={`preset-button ${selected ? 'selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() =>
                    chooseOrigin(
                      { lat: preset.lat, lng: preset.lng },
                      preset.name,
                    )
                  }
                >
                  <span className="preset-dot" />
                  {preset.shortName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="notice" role="status" aria-live="polite">
          <span className="notice-icon" aria-hidden="true">✦</span>
          <p>{notice}</p>
        </div>

        {routeStats && destination && (
          <div className="route-card">
            <div className="route-card-title">
              <div>
                <span className="eyebrow">Selected great circle</span>
                <h3>{Math.round(routeStats.distance).toLocaleString()} km</h3>
              </div>
              <button className="text-button" onClick={clearDestination}>Clear</button>
            </div>
            <div className="route-metrics">
              <div>
                <small>Depart</small>
                <strong>{compassBearing(routeStats.departure)}</strong>
              </div>
              <span aria-hidden="true">→</span>
              <div>
                <small>Arrive</small>
                <strong>{compassBearing(routeStats.arrival)}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="legend" aria-label="Map legend">
          <span><i className="legend-swatch legend-swatch--origin" /> Origin</span>
          <span><i className="legend-swatch legend-swatch--valid" /> No-north region</span>
          <span><i className="legend-line" /> Route</span>
        </div>

        <p className="rule-copy">
          “No north” means the forward bearing stays between 90° and 270° along the entire shorter arc—not only at departure.
        </p>
      </aside>
    </main>
  );
}
