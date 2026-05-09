# Squad Decisions

## Active Decisions

# Decision: CO1 Anomaly Correction — 2026-05-07 & 2026-05-08

**Date:** 2026-05-09  
**Author:** Rodri (Data/Finance agent)  
**File affected:** `Data/raw.json`

## Problem

The last two entries in `Data/raw.json` contained clearly erroneous CO1 values:

| Date       | CO1 (bad) | CO2   |
|------------|-----------|-------|
| 2026-05-07 | 888.12    | 79.85 |
| 2026-05-08 | 999.40    | 81.05 |

CO2–CO10 for those dates were realistic (79–81 range), consistent with surrounding market data. CO1 was the only corrupted field — characteristic of test/placeholder data left in production.

## Method

**Spread-based reconstruction** using the CO1→CO2 spread (CO2 − CO1) from the 10 valid trading days immediately preceding the anomalous entries (2026-04-22 through 2026-05-05).

| Window     | 10 days prior to anomalies |
|------------|---------------------------|
| Avg spread | −6.442 (backwardation: CO1 > CO2) |

Formula applied:
```
CO1_corrected = CO2 - avg_spread
```

## Result

| Date       | CO1 (old) | CO1 (new) | CO2   | Spread |
|------------|-----------|-----------|-------|--------|
| 2026-05-07 | 888.12    | 86.29     | 79.85 | +6.44  |
| 2026-05-08 | 999.40    | 87.49     | 81.05 | +6.44  |

The corrected values are consistent with the backwardation structure observed in all prior entries (CO1 consistently above CO2 by ~6 points).

## Rationale

- The spread method is source-traceable and auditable — every input value comes from the same raw.json file.
- It preserves the term structure shape (backwardation) without assuming any external price reference.
- Rounding to 2 decimal places matches the precision of all other entries in the dataset.

## Alternatives Considered

- **Manual estimate / external source:** No external Brent price feed available at fix time; spread method is self-consistent.
- **Leave as NaN/null:** Would break downstream calculations; a derived estimate with documented provenance is preferable.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

---

# Decision Proposal: Azure Static Web App Deployment Architecture

**Author:** Haaland (Lead)  
**Date:** 2026-05-09  
**Status:** PROPOSED — pending Jorge approval

---

## Decision 1: GitHub Actions CI/CD over manual deploy

**Chosen:** Option A — GitHub Actions workflow with `Azure/static-web-apps-deploy@v1`

**Rejected:** Option B — manual `az staticwebapp` CLI upload

**Rationale:**
- Repo already has `.github/workflows/` with active squad workflows — zero friction to add one more
- Every `git push origin main` auto-deploys; no manual intervention needed as data files update
- Free tier Azure SWA GitHub integration generates the workflow automatically
- Manual deploy creates maintenance burden: every `raw.json` update requires a CLI command

**Constraint:** Jorge must have an Azure subscription. Free tier (Sku: Free) is sufficient — 250 MB storage limit, 307 KB total payload.

---

## Decision 2: `staticwebapp.config.json` is required and committed to root

**Chosen:** Create `staticwebapp.config.json` at repo root with explicit MIME types and Cache-Control headers

**Rationale:**
- Azure SWA typically serves `.json` as `application/json` but this varies by edge node
- Explicit `mimeTypes` + route-level `Content-Type` header double-covers the risk
- Cache-Control `max-age=3600` on JSON files: appropriate for daily-updated financial data
- Cache-Control `max-age=600` on HTML: short enough to pick up deploy changes quickly
- 404 rewrite to `Index.html`: defensive fallback, prevents Azure's generic error page

**No CORS config needed:** `fetch('Data/raw.json')` is relative — same origin as `Index.html` on Azure.

---

## Decision 3: No build step in deployment pipeline

**Chosen:** `skip_app_build: true`, `output_location: ""`

**Rationale:**
- Pure static HTML/JS/JSON — no npm, no webpack, no framework
- `app_location: "/"` deploys the repo root as-is
- Adding a build step would add complexity with zero benefit

---

## Impact

- Files to create: `staticwebapp.config.json` (root), `.github/workflows/azure-static-web-apps.yml`
- Files to commit: both above + existing `Index.html`, `Data/raw.json`, `Data/dated-brent.json`
- Azure resources needed: 1 resource group, 1 Static Web App (Free tier)
- No existing code changes required

## To promote to decisions.md

Review with Jorge. If approved, move content to `## Active Decisions` in `decisions.md`.

---

# Decision: CSS Extraction — styles.css

**Date:** 2026-05-09  
**Author:** Nico (Frontend Dev)  
**Files affected:** `Index.html`, `styles.css` (new)

## What Was Done

Extracted all CSS from `Index.html` into a new external `styles.css` at the repo root.  
`Index.html` previously contained two `<style>` blocks (~780 lines total):

1. A large main block covering all component styles.
2. A tiny inline block containing only `@keyframes spin` (loading spinner).

Both were removed and replaced with a single `<link rel="stylesheet" href="styles.css">` in `<head>`.

## What Was Consolidated

| Item | Decision |
|---|---|
| `@keyframes spin` inline block | Merged into `styles.css` under a "LOADING SPINNER ANIMATION" section — eliminates a second parse of a `<style>` tag. |
| CO1–CO10 card rules | Already shared a single `.kpi-card` selector — no duplication existed to remove. |
| Section structure | Added block-level banner comments to each logical group so the external file is navigable without tooling. |

## Why

- **Maintainability:** CSS in a dedicated file is easier to navigate, version, and review than an inline block of 780 lines.
- **Cacheability:** Browsers cache external stylesheets across page loads; inline styles are re-parsed every time.
- **Separation of concerns:** Keeps HTML focused on structure; CSS focused on presentation.
- **Zero visual change:** All class names, IDs, custom properties, and `[data-theme]` overrides are byte-for-byte identical to the original — no risk of regression.

## Governance Note

No JavaScript was modified. The page's runtime behaviour (Chart.js, JSON fetch, theme toggle) is unaffected.
