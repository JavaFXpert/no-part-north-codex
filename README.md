# No Part North

An interactive way to explore great-circle routes whose forward bearing never
has a northward component. Choose an origin, inspect the purple valid region,
and compare the same route on a 3D globe and a 2D Mercator projection.

## Run locally

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm test
npm run build
npm run preview
```

## How the rule is evaluated

The app uses the shorter great-circle arc on a spherical Earth. A destination
is valid only if latitude never increases anywhere on that arc—equivalently,
its forward bearing remains between 90° and 270°, inclusive. Exact antipodes
are excluded because they do not define a unique shorter route.

Calculations, geography, and rendering all run in the browser. The Natural
Earth geography is provided by the `world-atlas` package and no map API key is
required.

The projection-safe base-map tiles are committed under `public/tiles`. They can
be regenerated after changing the map palette with `npm run generate:tiles`.

## Deploy to GitHub Pages

The included workflow builds and deploys the site whenever `main` changes.

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Run the **Deploy to GitHub Pages** workflow, or push to `main`.

Vite emits relative asset URLs, so the build works under a repository path such
as `https://username.github.io/no-part-north-codex/` and under a custom domain.
