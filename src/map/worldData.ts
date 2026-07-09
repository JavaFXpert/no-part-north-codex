import { feature } from 'topojson-client';
import countriesTopology from 'world-atlas/countries-110m.json';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

const topology = countriesTopology as Topology<{
  countries: GeometryCollection<{ name: string }>;
}>;

export const countries = feature(
  topology,
  topology.objects.countries,
) as FeatureCollection<Geometry, { name: string }>;
