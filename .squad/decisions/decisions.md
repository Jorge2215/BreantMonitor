# Decisions

Project: BreantMonitorJson

Generated: 2026-05-09

---

## From inbox: haaland-deployment-arch.md

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

## From inbox: nico-css-extraction.md

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


---

## From inbox: nico-js-extraction.md

# Decision: JS Extraction — script.js

**Date:** 2026-05-09  
**Author:** Nico (Frontend Dev)  
**Files affected:** `Index.html` (updated), `script.js` (new)

## What Was Done

Extracted all inline JavaScript from `Index.html` into a new external `script.js` at the repo root.  
`Index.html` previously contained a single `<script>` block spanning lines 306–970 (~663 lines).  
It was removed and replaced with `<script src="script.js"></script>` immediately before `</body>`.  
The Chart.js CDN `<script>` in `<head>` is unchanged.

## Simplifications Applied

| Simplification | Detail |
|---|---|
| `isLight()` helper | Module-level boolean; replaces every repeated `document.documentElement.getAttribute('data-theme')==='light'` expression across all chart render functions and theme toggle. |
| `getChartColors()` helper | Returns `{ gridC, tickC }` based on current theme. Eliminates the repeated two-liner `_gridC`/`_tickC` derivation that appeared in `renderSpreadChart`, `buildForwardChart`, `renderPctChart`, and `renderDbChart`. |
| `getTooltipConfig()` helper | Returns the 4 theme-aware base tooltip fields (`backgroundColor`, `borderColor`, `titleColor`, `bodyColor`). Each chart spreads it (`...getTooltipConfig()`) and appends its own `callbacks`, font overrides, `borderWidth`, etc. |
| `subtractPeriod` consolidated | `dbSubtractPeriod` (formerly a near-duplicate using local-time `setMonth`) was removed. All period-subtraction calls in the Dated Brent tab now use the shared `subtractPeriod` (UTC-based). |

## Why

- **Maintainability:** JS in a dedicated file is easier to navigate, version-diff, and review.
- **Cacheability:** Browsers cache external scripts across page loads; inline scripts are re-parsed on every navigation.
- **Separation of concerns:** HTML stays focused on structure; logic lives in its own file.
- **DRY helpers:** The four simplifications eliminate ~20 repeated inline expressions, making future theme or chart-colour changes a single-file edit.

## What Was NOT Changed

- All `window.xxx = xxx` global exports are preserved — required for `onclick=` HTML attributes.
- Data paths `Data/raw.json` and `Data/dated-brent.json` are unchanged.
- Bootstrap IIFE remains at the bottom of `script.js`.
- No visual behaviour, chart logic, or data transformation was modified.

---

## From inbox: nico-readme-doc.md

README created: technical documentation for BreantMonitor (2026-05-09)

- File: README.md at repo root
- Purpose: Provide complete developer-oriented reference for features, data formats, local dev and Azure deployment.
- Created by: Nico (Frontend)



---

## From inbox: haaland-cicd-workflow.md

# Decision: GitHub Actions CI/CD Workflow — Azure Static Web App

**Author:** Haaland (Lead)
**Date:** 2026-05-09
**Status:** IMPLEMENTED — file committed to `.github/workflows/azure-static-web-apps.yml`

---

## Summary

A GitHub Actions workflow was created to continuously deploy the Brent Spread Monitor
(`brent-spread-monitor-swa`) to Azure Static Web Apps on every push to `main`.

---

## Deployment Architecture

| Setting | Value |
|---|---|
| Azure SWA name | `brent-spread-monitor-swa` |
| Resource group | `brent-spread-monitor-rg` |
| Subscription | `bb5ffe61-553c-4019-a657-79878bed7e08` |
| GitHub Action | `Azure/static-web-apps-deploy@v1` |
| Auth secret | `AZURE_STATIC_WEB_APPS_API_TOKEN` (GitHub Actions secret) |
| `app_location` | `.` (repo root) |
| `output_location` | `.` (same as app_location — no dist folder) |
| `skip_app_build` | `true` |

---

## Trigger Design

| Event | Behaviour |
|---|---|
| `push` to `main` | Full production deploy |
| `pull_request` → `opened / synchronize / reopened` | PR preview environment created |
| `pull_request` → `closed` | PR preview environment torn down (via `action: close`) |

PRs targeting `main` get a temporary staging URL from Azure SWA.
On merge or close, the `close_pull_request` job runs the `close` action to delete the staging slot.

---

## Key Decisions

### 1. `skip_app_build: true` is mandatory

This is a pure static site — no `package.json`, no npm, no webpack.
Without `skip_app_build: true`, the SWA Oryx builder would scan for a build system,
find nothing it understands, and either fail or produce an empty deploy.

### 2. `output_location: "."` — no dist folder

Files (`Index.html`, `styles.css`, `script.js`, `Data/*.json`) are served as-is
from the repo root. There is no compilation step that produces a separate output directory.

### 3. Two-job structure

- `build_and_deploy`: conditional on non-closed PRs and all main pushes
- `close_pull_request`: conditional on PR closed event only

This avoids the anti-pattern of a single job with branching shell logic and keeps each
job's intent unambiguous.

### 4. No environment variables or matrix needed

Single-environment deploy. All configuration lives in `staticwebapp.config.json`
(already committed at repo root) and the workflow file itself.

---

## Files Affected

- `.github/workflows/azure-static-web-apps.yml` — **created**
- `staticwebapp.config.json` — pre-existing (created in prior session)
- `.squad/agents/haaland/history.md` — updated with this session's work

---

## Prerequisite

Jorge must ensure `AZURE_STATIC_WEB_APPS_API_TOKEN` is set in:
`GitHub → Jorge2215/BreantMonitor → Settings → Secrets and variables → Actions`

The token is obtained from the Azure Portal under the Static Web App resource
(Manage deployment token / Deployment token).

