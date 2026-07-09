import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { geoMercator, geoPath } from 'd3-geo';
import sharp from 'sharp';
import { feature } from 'topojson-client';

const TILE_SIZE = 256;
const MAX_ZOOM = 3;
const WORLD_SIZE = TILE_SIZE * 2 ** MAX_ZOOM;
const outputRoot = new URL('../public/tiles/', import.meta.url);

const topology = JSON.parse(
  await readFile(
    new URL('../node_modules/world-atlas/countries-110m.json', import.meta.url),
    'utf8',
  ),
);
const countries = feature(topology, topology.objects.countries);
const land = {
  type: 'FeatureCollection',
  features: countries.features.filter(
    (country) => country.properties.name !== 'Antarctica',
  ),
};
const antarctica = countries.features.find(
  (country) => country.properties.name === 'Antarctica',
);

const projection = geoMercator()
  .scale(WORLD_SIZE / (2 * Math.PI))
  .translate([WORLD_SIZE / 2, WORLD_SIZE / 2])
  .precision(0.1)
  .clipExtent([
    [0, 0],
    [WORLD_SIZE, WORLD_SIZE],
  ]);
const path = geoPath(projection);
const southPolarCapY = projection([0, -82])[1];

const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${WORLD_SIZE}" height="${WORLD_SIZE}" viewBox="0 0 ${WORLD_SIZE} ${WORLD_SIZE}">
    <rect width="100%" height="100%" fill="#115ca8"/>
    <path d="${path(land)}" fill="#4ba95f"/>
    <rect y="${southPolarCapY}" width="100%" height="${WORLD_SIZE - southPolarCapY}" fill="#f3f5ef"/>
    <path d="${path(antarctica)}" fill="#f3f5ef"/>
  </svg>
`;

const master = await sharp(Buffer.from(svg)).png().toBuffer();

for (let zoom = 0; zoom <= MAX_ZOOM; zoom += 1) {
  const tilesPerAxis = 2 ** zoom;
  const levelSize = TILE_SIZE * tilesPerAxis;
  const level = await sharp(master)
    .resize(levelSize, levelSize, { kernel: 'lanczos3' })
    .png()
    .toBuffer();

  for (let x = 0; x < tilesPerAxis; x += 1) {
    const column = new URL(`${zoom}/${x}/`, outputRoot);
    await mkdir(column, { recursive: true });

    for (let y = 0; y < tilesPerAxis; y += 1) {
      await sharp(level)
        .extract({
          left: x * TILE_SIZE,
          top: y * TILE_SIZE,
          width: TILE_SIZE,
          height: TILE_SIZE,
        })
        .png({ compressionLevel: 9, palette: true, colours: 64 })
        .toFile(fileURLToPath(new URL(`${y}.png`, column)));
    }
  }
}

console.log(`Generated zoom 0-${MAX_ZOOM} map tiles in public/tiles.`);
