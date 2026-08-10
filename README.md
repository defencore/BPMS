# BPMS

BPMS is a client-side application for entering, importing, reviewing, analysing, and exporting blood-pressure measurements. It runs as a static site and stores its data in the user's browser.

> BPMS is a research and data-comparison tool, not a medical device. It does not diagnose conditions, provide treatment recommendations, or replace professional assessment or emergency services.

## What it provides

- Manual entry, Hingmed USB/UART, and Remote API connectors.
- Editable measurement history with comments, body position, and contextual events.
- Browser-local event presets for medication, procedures, activity, symptoms, and other context.
- Trend, daily-profile, ESC-distribution, calendar, variability, and exploratory pattern views.
- English, Ukrainian, and Russian interfaces and PDF reports.
- Validated JSON import/export and structured PDF export.
- Configurable ESC 2024 comparison thresholds, analysis parameters, and alerts.
- Static GitHub Pages deployment with optional SEO, GA4, and Search Console metadata.

All measurements, events, device information, preferences, and policy acceptance stay in `localStorage` unless the user explicitly exports a file or starts an exchange through the Remote connector. **Settings → Local data** removes BPMS-owned browser data.

## Run locally

Requirements: Node.js 22 or later.

```bash
npm run verify
python3 -m http.server 8000 --directory dist
```

Open [http://localhost:8000](http://localhost:8000).

For source-level development without a build:

```bash
python3 -m http.server 8000
```

## Connectors

| Connector | Purpose |
| --- | --- |
| Manual | Default. Enter measurements in the browser and configure the identity included in exports. |
| Hingmed USB/UART | Read and configure a compatible monitor through Web Serial at `19200 8N1`. Requires Chrome/Edge and HTTPS or localhost. |
| Remote | Retrieve or send the canonical BPMS dataset through a user-configured HTTP(S) API. |

The Remote connector uses:

```text
GET  {baseUrl}/health
GET  {baseUrl}/measurements
POST {baseUrl}/measurements
```

The server must return/accept the canonical BPMS JSON payload and permit the deployed site origin through CORS. Browsers block HTTP APIs from an HTTPS page.

Hingmed-specific terminal, device, Wi-Fi, session-ID, time-sync, and memory-clear controls are shown only for the Hingmed connector. Protocol details and verified limitations are documented in [SERIAL_PROTOCOL.md](SERIAL_PROTOCOL.md).

## Data and localization

The canonical schema is implemented in [src/core/data-schema.js](src/core/data-schema.js); a complete example is in [test/fixtures/valid-bpms.json](test/fixtures/valid-bpms.json). Imports are validated, merged chronologically, and deduplicated. Device information is preserved in JSON and PDF exports.

Language selection order is:

1. `?lang=en`, `?lang=uk`, or `?lang=ru`;
2. the saved browser preference;
3. Ukrainian or Russian when that is the browser language;
4. English for every other system language.

Each language has its own module in `src/i18n/locales/`. To add one, create a catalog, register it in `src/i18n/locales.js`, and run `npm run verify`.

## Project structure

```text
src/
├── main.js             application composition
├── connectors/         connector contract, registry, and adapters
├── infrastructure/     Hingmed serial transport and client
├── core/               schemas, state, storage, analytics, and protocol logic
├── features/           dashboard, settings, reports, history, and charts
├── i18n/locales/       independent EN, UA, and RU catalogs
└── ui/                 shared browser UI utilities
styles/                 modular responsive styles
scripts/                validation, build, SEO, and asset scripts
test/                   Node test suite and fixtures
```

Project code uses native ES modules. `src/main.js` is the only entry point. The application has no npm runtime dependencies; browser libraries are loaded from CDNs.

## Development commands

| Command | Result |
| --- | --- |
| `npm run check` | Validate syntax, module/DOM references, cycles, exports, and project constraints. |
| `npm test` | Run unit and contract tests. |
| `npm run build` | Build the static site into `dist/`. |
| `npm run check:dist` | Validate deployment files and local asset links. |
| `npm run verify` | Run all checks, tests, build, and deployment validation. |

## GitHub Pages

The workflow in [.github/workflows/pages.yml](.github/workflows/pages.yml) verifies, builds, and deploys the site.

1. In the GitHub repository, open **Settings → Pages**.
2. Select **GitHub Actions** as the source.
3. Push to `main` or run the Pages workflow manually.

Relative asset paths support both custom domains and `owner.github.io/repository/` paths.

Public URL and Google metadata are configured in [site.config.json](site.config.json). GitHub Actions variables can override them:

- `SITE_URL`
- `GA4_MEASUREMENT_ID`
- `GOOGLE_SITE_VERIFICATION`

The build generates Open Graph/Twitter metadata, JSON-LD, `robots.txt`, and `sitemap.xml` when applicable.

## Licence

Code is distributed under the [MIT License](LICENSE). Embedded DejaVu fonts use [their included licence](assets/fonts/LICENSE_DEJAVU).
