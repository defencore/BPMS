# BPMS — Blood Pressure Monitoring System

BPMS is a browser-based application for collecting, reviewing, and analyzing blood-pressure measurements. It runs entirely on the client, supports pluggable data connectors, and can be published as a static GitHub Pages site.

> BPMS is research and data-comparison software. It is not intended or certified as a medical device, does not provide diagnoses or medical recommendations, and must not be used as an emergency-warning system.

## Table of contents

- [Features](#features)
- [Browser and device requirements](#browser-and-device-requirements)
- [Quick start](#quick-start)
- [Development commands](#development-commands)
- [Project architecture](#project-architecture)
- [Application settings](#application-settings)
- [Connectors](#connectors)
- [Remote API contract](#remote-api-contract)
- [Data import and export](#data-import-and-export)
- [Localization](#localization)
- [Device protocol](#device-protocol)
- [GitHub Pages deployment](#github-pages-deployment)
- [Security and privacy](#security-and-privacy)
- [License](#license)

## Features

- Pluggable Hingmed, Manual, and Remote data connectors.
- Direct Hingmed USB/UART communication through Web Serial.
- Automatic transmission of browser-local time after every successful Hingmed connection, plus a separate confirmation-protected device-memory clear action with record-count verification.
- Measurement history with systolic, diastolic, pulse, posture, status, and ESC 2024 classification.
- Every history entry, including imported, UART, Remote, and manual data, supports correction, deletion, and exportable comments. Local edits retain the original source type and receive edit metadata.
- Session-based 24-hour analysis with awake/asleep summaries, quality gates, dipping, morning change, PP, SD, CV, ARV, scaled RPP, reading load, time-above-boundary, and hyperbaric indices.
- Measurement-linked context events for medication (name and dose), procedures, activities, food, caffeine, exercise, stress, symptoms, and custom events, entered directly beside comments in measurement history.
- Browser-local quick-event presets with signed before/after offsets such as `-00:15` and `+00:30`.
- Exploratory before/after event comparison with per-event windows, paired measurement counts, repeated-observation grouping, and explicit non-causality warnings for patients and clinicians.
- Trend charts, distributions, daily profiles, context timelines, heatmaps, and research-pattern analysis.
- Canonical, validated JSON import and export.
- Deterministic merging, chronological sorting, and duplicate removal.
- Localized PDF reports with an executive summary, session-quality gates, a 30-day pressure calendar, gap-aware pressure dynamics, an hourly daily profile, configurable ESC 2024 distribution, awake/asleep averages, dipping, morning change, pressure load, variability metrics, daily summaries, and an appendix containing every recorded measurement.
- Device, schedule, user, and Wi-Fi configuration commands.
- Browser-persisted measurements, linked context events, ESC 2024, risk-zone, pattern, connector, and remote-server settings.
- Versioned first-run research-use policy acknowledgement with English, Ukrainian, and Russian content.
- Ukrainian, English, and Russian user interfaces.
- Dependency-free application build and automated GitHub Pages deployment.

## Browser and device requirements

- Node.js 22 or later for verification and production builds.
- A browser that implements the Web Serial API, such as current Chrome or Edge, is required for the Hingmed connector.
- HTTPS or `localhost`; Web Serial is unavailable in an ordinary insecure HTTP context.
- A compatible blood-pressure monitor or serial adapter configured for `19200 8N1`:
  - baud rate: `19200`;
  - data bits: `8`;
  - parity: `none`;
  - stop bits: `1`.

Firefox and Safari do not currently expose the Web Serial API required by the application.

## Quick start

```bash
npm run verify
python3 -m http.server 8000 --directory dist
```

Open [http://localhost:8000](http://localhost:8000), select **Connect**, and choose the serial port exposed by the device.

The source files can also be served directly during development:

```bash
python3 -m http.server 8000
```

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run check` | Validate JavaScript syntax, the ES-module/DOM graph, and unused named exports. |
| `npm test` | Run protocol, CRC, classification, schema, and merge tests. |
| `npm run build` | Generate the static site in `dist/`. |
| `npm run check:dist` | Validate required deployment files and local asset links in `dist/`. |
| `npm run fonts` | Regenerate the embedded Unicode PDF-font module from `assets/fonts/`. |
| `npm run verify` | Run checks and tests, build, then validate the production artifact. |

The application has no npm runtime dependencies. Bootstrap, Font Awesome, Chart.js, and jsPDF are loaded from a CDN; project code uses native ES modules.

## Project architecture

```text
src/
├── main.js                    # application composition and startup
├── connectors/
│   ├── controller.js          # connector lifecycle and shared controls
│   ├── registry.js            # validated connector registry
│   ├── hingmed.js             # USB/UART adapter
│   ├── manual.js              # manual measurement adapter
│   └── remote.js              # remote HTTP(S) API adapter
├── infrastructure/
│   └── hingmed/
│       ├── packet-buffer.js   # framed UART stream assembly
│       ├── serial-session.js  # Web Serial lifecycle and response routing
│       └── client.js          # typed Hingmed protocol operations
├── core/
│   ├── blood-pressure.js      # ESC classification and time periods
│   ├── alert-evaluator.js     # pure configurable alert decision logic
│   ├── analysis-data.js       # analytics quality filtering
│   ├── analytics/             # pure session, event-association, statistics, circadian, exposure, quality, and pattern modules
│   ├── body-positions.js      # canonical posture values and labels
│   ├── clinical-config.js     # default clinical thresholds
│   ├── clinical-sources.js    # primary-reference metadata and links
│   ├── constants.js           # protocol commands, flags, and error codes
│   ├── data-schema.js         # canonical JSON contract and validation
│   ├── event-schema.js        # structured context-event contract
│   ├── event-store.js         # replacement and cleanup of measurement-linked events
│   ├── event-presets.js       # reusable local context presets
│   ├── local-dataset.js       # browser-only dataset persistence
│   ├── measurement-context.js # measurement/event identities and relative time
│   ├── files.js               # browser file reading and downloads
│   ├── merge-measurements.js  # deterministic merge and deduplication
│   ├── protocol.js            # hex, CRC-16, and measurement packet codec
│   ├── settings-store.js      # versioned local settings and validation
│   ├── measurement-store.js   # canonical add, correction, and deletion
│   ├── usage-policy.js        # versioned policy acknowledgement storage
│   └── state.js               # centralized application state
├── features/
│   ├── analytics.js           # analytics orchestration and visualization
│   ├── charts/                # combined, histogram, ESC, threshold, and lifecycle modules
│   ├── dashboard/             # statistics, classification, and dashboard refresh
│   ├── data-processing.js     # multi-file merge workflow
│   ├── data-transfer.js       # canonical JSON import and export
│   ├── hingmed/               # device, Wi-Fi, user, and terminal controllers
│   ├── device-info-view.js    # connector-independent device summary
│   ├── event-correlation.js   # localized before/after event analysis UI
│   ├── clinical-alerts.js     # configurable high-reading notifications
│   ├── measurement-editor.js  # shared editor for all history records
│   ├── measurement-context-editor.js # linked context-event editor
│   ├── measurement-history.js # history rendering and actions
│   ├── research-report.js     # PDF export orchestration
│   ├── report/                # report model, sections, formatting, Unicode fonts, vector charts, and layout writer
│   ├── settings.js            # settings behavior and persistence
│   ├── settings-view.js       # modular settings UI
│   ├── usage-policy.js        # first-run policy dialog and repeat access
│   └── user-guide.js          # multilingual in-application guide dialog
├── i18n/
│   ├── i18n.js                # locale selection and DOM translation
│   ├── locales.js             # language registry
│   └── locales/
│       ├── en.js              # English catalog
│       ├── ru.js              # Russian catalog
│       └── uk.js              # Ukrainian semantic messages
└── ui/
    ├── alerts.js
    ├── html.js
    ├── information-dialog.js
    ├── responsive-layout.js
    ├── tab-state.js
    └── terminal.js

styles/
├── base.css
├── analytics.css
├── components.css
├── layout.css
├── settings.css
└── policy-and-research.css
```

[src/main.js](src/main.js) is the only application entry point. HTML contains no inline event handlers, and internal dependencies are expressed through `import` and `export` declarations. The project check imports every module under Node.js, validates every relative dependency and static DOM reference, rejects circular dependencies, unused named exports, and duplicate HTML IDs, and rejects ordinary JavaScript modules larger than 320 lines to prevent new monoliths. Translation catalogs have a separate 900-line limit because they contain data rather than application logic. The deployment check validates required files and every local asset reference in the generated GitHub Pages artifact.

## Application settings

The **Settings → Application settings** workspace contains six sections:

- **Connectors** — select the active data source and configure Manual or Remote input;
- **ESC 2024** — select Office, Home, or 24-hour ABPM context; configure awake/asleep schedules, quality gates, ambulatory comparison boundaries, classification thresholds, and visualization bands;
- **Patterns** — configure numeric pattern thresholds, minimum sample sizes, alert windows, and data-quality filters;
- **Context presets** — maintain reusable medication, procedure, activity, and other event templates with default before/after offsets and analysis windows;
- **Methodology** — review calculation scope, safety limitations, and primary clinical references;
- **Local data** — review local persistence and clear the BPMS dataset, presets, and settings from this browser.

Settings are validated and stored under the versioned `bpms.settings.v2` local-storage key. The current canonical dataset is stored under `bpms.dataset.v2`; it contains measurements, linked context events, and device metadata. Office classification remains separate from Home and 24-hour ABPM comparison profiles. The ABPM profile defaults to separate 24-hour, awake, and asleep boundaries. Local alert, low-reading, comparison-band, and pattern heuristics are identified as configurable non-diagnostic logic. Invalid ordering, percentages, intervals, and alert windows are rejected. The clear action removes only keys beginning with `bpms.`.

The interface links to the official ESC 2024 guideline page, its public summary, the European Heart Journal publication, and the 2025 corrigendum. ESC states that using protected guideline content in software requires a formal licence, so the project does not reproduce protected tables or recommendations. It uses only facts stated in the public ESC summary and labels the remaining analytics as local exploratory heuristics.

On first launch, a blocking research-use policy explains the intended purpose, individual-context limitations, non-medical status, emergency limitation, data quality, browser-local processing, local-storage clearing, Remote-connector exception, and warranty terms. Acceptance is stored under `bpms.usage-policy.v1`; a changed policy version requires a new acknowledgement. The full policy remains available from **Settings → Methodology**. The header also provides a multilingual user guide that explains the complete workflow without leaving the application. This application is intended only for research, education, data organisation, and comparison. It does not diagnose disease, provide patient-specific recommendations, or replace clinical assessment.

## Connectors

Every connector implements the same contract: identity and translation metadata, capability flags, support detection, `connect()`, `disconnect()`, `fetchMeasurements()`, and `publishMeasurements()`. The validated registry in `src/connectors/registry.js` is the single connector list used by the UI and controller.

| Connector | Transport | Use case |
| --- | --- | --- |
| Hingmed | Web Serial, `19200 8N1` | Current USB/UART monitor and its device commands. |
| Manual | In-browser form | Add a validated reading without external hardware. |
| Remote | HTTP(S) JSON API | Retrieve canonical datasets from a server or send locally formed measurements and events to it. |

To add a device or service, implement the connector contract, register it, and add localized metadata. The monitoring controls need no connector-specific handlers.

The command terminal, device configuration, Wi-Fi configuration, and device-user configuration are exposed only by the Hingmed connector through its `deviceManagement` capability. Manual and Remote keep the general application settings available without showing Hingmed protocol controls.

## Remote API contract

The Remote connector derives its base URL from **protocol**, **Server IP address / host**, **port**, and **API base path**. With `https`, `api.example.com`, `443`, and `/api`, it calls:

```text
GET https://api.example.com:443/api/health
GET https://api.example.com:443/api/measurements
POST https://api.example.com:443/api/measurements
```

`GET /health` must return any successful (`2xx`) response. `GET /measurements` must return the canonical BPMS JSON payload documented in [Data import and export](#data-import-and-export). `POST /measurements` receives that same canonical payload with `Content-Type: application/json` and must return a successful (`2xx`) response. This allows BPMS to operate either as an API client that receives device data collected by the server or as a data-entry client that sends manually formed measurements and contextual events. Requests time out after ten seconds.

The API must permit the deployed GitHub Pages origin through CORS. GitHub Pages uses HTTPS, so browsers block a Remote connector configured with plain HTTP as mixed content.

## Data import and export

BPMS uses one canonical contract. An import is rejected when its schema, version, structure, date, or physiological values are invalid.

```json
{
  "schema": "bpms",
  "version": 2,
  "exportedAt": "2026-08-10T00:00:00.000Z",
  "device": {
    "id": "WBP-02A",
    "numRecords": 1,
    "username": "Example User",
    "userId": "EXAMPLE-1",
    "serialNumber": "SN-001",
    "macAddress": "00:11:22:33:44:55"
  },
  "measurements": [
    {
      "systolic": 118,
      "diastolic": 72,
      "pulse": 61,
      "datetime": "2026-08-10 12:30",
      "errorCode": 0,
      "error": "none",
      "bodyPosition": "lying",
      "measurementMethod": "automatic",
      "hasMovement": false
    }
  ],
  "events": [
    {
      "id": "event-1",
      "type": "coffee",
      "datetime": "2026-08-10T09:15",
      "anchorMeasurementKey": "2026-08-10 09:30|118|72|61",
      "offsetMinutes": -15,
      "presetId": "preset-coffee",
      "label": "Morning coffee",
      "name": "",
      "dose": "",
      "durationMinutes": 15,
      "intensity": 2,
      "analysisWindowMinutes": 120,
      "note": "Morning coffee",
      "edited": false,
      "editedAt": null
    }
  ],
  "sources": []
}
```

Measurement timestamps use `YYYY-MM-DD HH:mm`; event timestamps use `YYYY-MM-DDTHH:mm`. `anchorMeasurementKey` links an event to the measurement identity and `offsetMinutes` records when it occurred relative to that reading. The UI renders these values as `-HH:MM`, `±00:00`, or `+HH:MM`. `presetId` and `label` preserve the reusable preset identity and user-facing name in exported data. Medication events may carry `name` and `dose`; procedures, activities, and exercise use `name`. `analysisWindowMinutes` controls the comparison interval before and after an event. For an event with a duration, the after-window begins when that duration ends. Duplicate measurement identity contains the timestamp and all three vital values (`systolic`, `diastolic`, and `pulse`), so distinct readings taken at the same minute are preserved.

Version 2 is the canonical export format. Version 1 files remain importable through an explicit one-way migration that supplies an empty context-event collection; all new exports use version 2.

The schema implementation is in [src/core/data-schema.js](src/core/data-schema.js). A complete fixture is available at [test/fixtures/valid-bpms.json](test/fixtures/valid-bpms.json).

PDF export is independent of the selected analytics session. Its primary summary respects the configured movement/error filters, while the session table, completeness section, charts, and full appendix make exclusions explicit and preserve every recorded row. Visual analysis includes a dataset-anchored 30-day pressure calendar, pressure dynamics, an hourly SYS/DIA/pulse profile with the configured sleep interval, and the configured ESC 2024 category distribution. The report also lists measurement-linked event details, signed offsets, and the same before/after comparison shown in analytics, including sample counts and a non-causality warning. It shows which sessions satisfy every configured quality gate and explains the meaning of coverage, dipping, morning change, and pressure load. Large gaps in irregular recordings are not joined by misleading diagonal lines. The report uses embedded DejaVu Sans fonts for English, Ukrainian, and Russian text and draws graphs directly as PDF vectors instead of copying a dashboard canvas. Its cover links to [https://bpms.global.agency](https://bpms.global.agency).

## Localization

The interface supports:

- `uk` — Ukrainian;
- `en` — English;
- `ru` — Russian.

The selected language is stored in local storage. It can also be supplied through a query parameter, for example `?lang=en`. Browser locale is used only when there is no saved or explicit selection; English is the fallback language. English is also the canonical language of source strings, code comments, and project documentation. Ukrainian and Russian text is isolated in their respective translation catalogs.

Each language has an independent module under `src/i18n/locales/`. To add another language:

1. Create `src/i18n/locales/<code>.js` and export a frozen translation catalog.
2. Import that catalog in `src/i18n/locales.js`.
3. Add one `{ code, locale, catalog }` entry to `LANGUAGE_DEFINITIONS`.
4. Run `npm run verify`; localization tests report missing semantic or static-interface translations.

The language selector is generated from `LANGUAGE_DEFINITIONS` and uses `Intl.DisplayNames`, so no HTML changes are required when a locale is added.

## Device protocol

Serial frames use the following high-level layout:

```text
[0x5A] [LENGTH] [COMMAND] [PARAMETERS...] [CRC_HIGH] [CRC_LOW]
```

The protocol is reverse-engineered from captured sessions and the current implementation. The full specification includes evidence levels, byte offsets, CRC behavior, record parsing, flags, error codes, commands, and configuration sequences:

- [Serial Device Protocol](SERIAL_PROTOCOL.md)
- [Protocol implementation](src/core/protocol.js)
- [Command constants](src/core/constants.js)
- [Protocol tests](test/protocol.test.js)

The dashboard action **Clear local dataset** affects only browser storage and never changes device memory. Each successful Hingmed connection sends the browser-local time through `0x4F` without save/exit, so connection-time synchronization does not erase records. The separate **Clear device memory** action asks for confirmation, then follows the official programming workflow: `0x57`, the complete profile displayed under Device settings, clock synchronization, save/exit, and a record-count readback. The target firmware does not commit an erase after `0x57` alone, so the schedule is reapplied as part of clearing; local browser data remains unchanged. The known protocol has no clock-readback command, so BPMS can verify transmission of the time frame but cannot independently verify the clock displayed by the monitor.

## GitHub Pages deployment

The workflow at [.github/workflows/pages.yml](.github/workflows/pages.yml) validates the project, builds `dist/`, uploads the Pages artifact, and deploys it.

1. Push the project to the `main` branch of a GitHub repository.
2. Open **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions**.
4. Push another commit or run **Deploy to GitHub Pages** manually.

All internal asset URLs are relative, so the build works both at [https://bpms.global.agency](https://bpms.global.agency), a GitHub Pages domain root, and under `https://owner.github.io/repository/`.

## SEO, link previews, GA4, and Search Console

SEO settings live in [`site.config.json`](site.config.json). It contains the public title, description, ABPM/BPMS/blood-pressure keywords, social-preview image path, and optional Google integration values. The build writes these values directly into `dist/index.html`, because messenger and social-network crawlers commonly do not execute application JavaScript.

The generated deployment includes:

- Open Graph and Twitter/X large-image metadata;
- a 1200 × 630 PNG preview at `assets/social-preview-v8.png`;
- `WebApplication` JSON-LD structured data;
- canonical URL, `robots.txt`, and `sitemap.xml` when a public site URL is available;
- optional GA4 and Google Search Console verification tags.

For a local or custom-domain build, edit these values in `site.config.json`:

```json
{
  "siteUrl": "https://bpms.global.agency/",
  "googleAnalyticsId": "G-XXXXXXXXXX",
  "googleSiteVerification": "paste-the-meta-content-token-here"
}
```

For GitHub Pages, repository **Settings → Secrets and variables → Actions → Variables** can define `SITE_URL`, `GA4_MEASUREMENT_ID`, and `GOOGLE_SITE_VERIFICATION`. Environment values override the JSON file. When `SITE_URL` is empty, GitHub Actions automatically derives `https://owner.github.io/repository/` from `GITHUB_REPOSITORY`. Google tags are completely omitted when their values are empty.

After changing SEO configuration, run `npm run build`. Link previews may remain cached by individual messenger platforms after deployment.

## Security and privacy

- Measurements, linked context events, presets, and settings are stored only in this browser's `localStorage` and in files explicitly exported by the user.
- Browser storage is not encrypted by BPMS. Anyone with access to the same browser profile may be able to read it; use **Settings → Local data** to remove BPMS-owned local data.
- BPMS includes no backend data service and performs no background upload. The Remote connector exchanges a canonical dataset only when the user explicitly configures and invokes it.
- Imported, USB/UART, Remote, and manual measurements share the same local canonical format and export/import path.
- Imported JSON is size-limited, schema-validated, and rendered without trusting imported HTML.
- Port selection requires an explicit browser permission prompt.
- Wi-Fi credentials entered into the settings form are sent to the connected device. They are not intentionally persisted by BPMS.

## License

Application code is licensed under the [MIT License](LICENSE). Embedded DejaVu font files use the terms in [assets/fonts/LICENSE_DEJAVU](assets/fonts/LICENSE_DEJAVU).
