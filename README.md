# BreantMonitor — Brent Futures Spread Dashboard

BreantMonitor is a lightweight, static financial dashboard for monitoring Brent oil futures spreads and roll costs. It is implemented with plain HTML5, CSS3 and vanilla JavaScript and designed for deployment to Azure Static Web Apps.

## Features

- KPI Row: 10 contract cards (CO1–CO10) showing today’s price and 1-day % change.
- Spread Historical Chart: Interactive chart for any base/long contract pair with % or USD mode and period/date-range filters.
- Spread Matrix (Today): Clickable 10×10 grid showing latest spreads between all contracts.
- Spread Matrix (Comparison): Compare current spreads versus historical periods (1M/2M/3M/6M/1Y/custom).
- Forward Curve: Two-curve term structure comparing today to a prior date.
- Heatmap "Costo de Roll": Monthly roll spread % heatmap by year with seasonality statistics.
- Percentile Grid: Roll-cost percentile cards for adjacent pairs (CO1→CO2 … CO9→CO10).
- Dated Brent Spread: Chart and matrix for Dated Brent vs CO1 spread.

## Tech Stack

- HTML5 (Index.html)
- CSS3 (styles.css) — dark financial theme with optional light mode
- Vanilla JavaScript (script.js)
- Chart.js v4.4.1 (via CDN) for all charts
- Static hosting: Azure Static Web Apps

## Project Structure

- Index.html — App shell: layout for the 3 main tabs, references CSS and JS.
- styles.css — All styling, design tokens in :root and [data-theme="light"] overrides.
- script.js — Application logic: data bootstrap, initApp(RAW, DATED_BRENT), chart rendering and helpers.
- Data\raw.json — Historical contract series (CO1–CO10) (see Data Sources).
- Data\dated-brent.json — Dated Brent time series (see Data Sources).
- staticwebapp.config.json — Azure Static Web App routing and configuration.

## Data Sources

- Data/raw.json
  - Format: JSON array of objects. Each object represents a date row:
    {
      "Date": "YYYY-MM-DD",
      "CO1": 80.5,
      "CO2": 80.1,
      ...
      "CO10": 79.2
    }
  - Contains historical settlement prices for contracts CO1 through CO10.

- Data/dated-brent.json
  - Format: JSON array of objects. Each row:
    {
      "Date": "YYYY-MM-DD",
      "DB": 80.3
    }
  - Dated Brent spot/assessment series used for Dated Brent spread calculations.

Both files are consumed at bootstrap via Promise.all in script.js.

## Getting Started — Local Development

1. Serve the repo locally with a static server. From the project root run:

```bash
npx http-server . -p 8080
```

2. Open http://localhost:8080 in your browser. The app will fetch Data/raw.json and Data/dated-brent.json and bootstrap the UI.

Notes:
- No build step required — this is a pure static site.
- Charts are rendered with Chart.js from the CDN (internet access required for charts unless the library is vendored locally).

## Deployment — Azure Static Web App (example)

1. Login and create resource group (replace placeholders):

```bash
az login
az group create --name <RESOURCE_GROUP_NAME> --location eastus
```

2. Create the Static Web App (replace placeholders):

```bash
az staticwebapp create --name <STATIC_WEB_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --subscription <SUBSCRIPTION_NAME> \
  --location eastus \
  --source . --branch main
```

3. After creation, push the repo to the branch configured in the Static Web App and the site will deploy automatically.

## Architecture Notes

- Separation of concerns: Index.html contains the shell and references to external assets; styles.css holds all visual rules and theme tokens; script.js contains app logic, chart creation, and data plumbing.
- script.js follows a helper pattern: lightweight module-level helpers (isLight, getChartColors, getTooltipConfig, subtractPeriod) live outside initApp to be reused by multiple chart renderers.
- Charts are rebuilt when theme changes to ensure correct color tokens are applied.
- No framework or build tooling: the app is intentionally simple to keep it portable for static hosting.

## Updating Data

To refresh application data, replace the JSON files in the Data folder:

- Update Data/raw.json with a new array of date rows containing CO1–CO10 values.
- Update Data/dated-brent.json with the Dated Brent series.

The app reads the JSON files at load time. For local testing, reloading the page will fetch the latest files. For production, deploy updated JSON files with your static site update (push to the branch configured in Azure Static Web Apps or upload to the deployment artifact).

----

If you need a CSV/ETL guideline or a small script to transform source CSVs into the expected JSON layout, open an issue or ask and I will add a small converter script to the repo.
