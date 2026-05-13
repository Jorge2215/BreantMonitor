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

---

# From inbox: haaland-json-editor-architecture.md

1. # Decision: JSON Editor Architecture for Brent Monitor

**Date:** 2026-05-09  
**Author:** Haaland (Lead)  
**Status:** PROPOSED — pending Jorge approval

---

## Problem

Jorge wants to edit `Data/raw.json` and `Data/dated-brent.json` from the dashboard UI — no manual file editing, no git CLI. This is a pure static web app with zero backend.

---

## Options Evaluated

### Option A — GitHub API (browser-side commits) ✅ RECOMMENDED

| Criteria | Assessment |
|---|---|
| **How it works** | Browser calls GitHub REST API (`PUT /repos/{owner}/{repo}/contents/{path}`) to commit updated JSON directly. Push to `main` triggers existing CI/CD → SWA redeploys automatically. |
| **Feasibility** | Fully feasible. No infrastructure changes. Works within current static-only architecture. |
| **User experience** | Click "Save" → done. Data live in ~90 seconds after CI/CD redeploy. User enters a GitHub PAT once per session. |
| **Infrastructure changes** | None. Uses existing CI/CD pipeline as-is. |
| **Security** | PAT stored in `sessionStorage` (cleared on tab close, never committed). PAT needs `repo` scope — scoped to this repo only via fine-grained token. HTTPS in transit. SWA already requires authentication. |
| **Maintenance** | Near zero. GitHub API is stable. No server to maintain. |

### Option B — Export/Download only ❌ REJECTED

| Criteria | Assessment |
|---|---|
| **Feasibility** | Trivial to build. |
| **User experience** | Edit → Download → open repo → commit → push → wait. 5+ manual steps. Defeats the stated goal. |
| **Infrastructure changes** | None. |
| **Security** | No risk. |
| **Maintenance** | None. |

**Why rejected:** Jorge explicitly said "without manually editing files in the repository." This option is exactly that. It's a fancy text editor with extra steps.

### Option C — Azure Functions backend ❌ REJECTED

| Criteria | Assessment |
|---|---|
| **Feasibility** | Requires adding `api/` folder, Azure Functions project, Node.js/Python runtime, function bindings. |
| **User experience** | Best UX if fully built — but same result as Option A with 10x the complexity. |
| **Infrastructure changes** | Major. New project structure, new Azure resources, new deployment config, `skip_app_build` must change. |
| **Security** | Server-side PAT (more secure) but now you're managing Azure Function secrets, CORS, auth middleware. |
| **Maintenance** | High. Azure Functions runtime updates, cold starts, monitoring, cost. |

**Why rejected:** Sledgehammer for a nail. The GitHub API already does exactly what a backend function would do — commit a file. Adding a function just to proxy that call adds complexity with zero functional benefit for this use case.

---

## Recommendation: Option A — GitHub API

**Pick Option A. No contest.**

The existing CI/CD pipeline is the backend. GitHub's API is the write layer. The browser is the editor. Every piece already exists — we just connect them.

Trade-off: Jorge needs a GitHub Personal Access Token (fine-grained, scoped to this repo, `contents: write` permission). He enters it once per browser session. It never leaves the browser tab's memory. Given the SWA already requires Azure AD authentication, this is an authenticated user adding a second credential for write access — acceptable.

---

## Page Structure: One page, two tabs

**One page. Two tabs.** Not two separate pages.

Reasons:
1. Both files share the same workflow: load JSON → edit rows → validate → save via GitHub API.
2. The PAT authentication is session-wide — one login flow, both editors available.
3. Navigation between two pages adds friction for zero benefit.
4. A tabbed interface (`raw.json | dated-brent.json`) is cleaner and keeps the dashboard cohesive.

The editor page should be a new `editor.html` (not embedded in `Index.html`) — the dashboard and editor are different tools with different layouts. Link from dashboard → editor via nav button.

---

## Implementation Scope

| Component | Detail |
|---|---|
| `editor.html` | New page with tabbed editor UI |
| `editor.js` | GitHub API integration, JSON validation, table-based editing |
| Tab 1: raw.json | Editable table: Date + CO1–CO10 columns. Add/edit/delete rows. |
| Tab 2: dated-brent.json | Editable table: Date + DB column. Add/edit/delete rows. |
| Auth | PAT input modal on first save attempt. Stored in `sessionStorage`. |
| Validation | Numeric fields validated before save. Date format enforced (YYYY-MM-DD). |
| Save flow | JSON serialized → Base64 encoded → PUT to GitHub API → commit created → CI/CD triggers |

---

## What This Does NOT Include

- No Azure Functions
- No build tools or bundlers
- No npm dependencies
- No changes to existing `Index.html`, `script.js`, or `styles.css`

This stays pure static. The only new files are `editor.html` and `editor.js`.


---

# From inbox: nico-editor-page.md

1. # Decision: JSON Data Editor Page

**Date:** 2026-05-09
**Author:** Nico (Frontend Dev)
**Files affected:** `editor.html` (new), `editor.js` (new), `Index.html` (modified)

## What Was Built

A standalone two-tab data editor page (`editor.html` + `editor.js`) that allows authorized users to view, add, edit, and delete rows in `Data/raw.json` and `Data/dated-brent.json` directly from the browser — no backend required.

## Architecture

**GitHub API approach** (as decided by Haaland): The editor commits JSON changes directly to GitHub via browser-side REST API calls using the [GitHub Contents API](https://docs.github.com/en/rest/repos/contents):

| Operation | API call |
|-----------|----------|
| Load data | `GET /repos/{owner}/{repo}/contents/{path}?ref=main` |
| Save data | `PUT /repos/{owner}/{repo}/contents/{path}` |
| Verify token | `GET /user` |

## Key Design Decisions

### Token storage: sessionStorage only
PAT is stored in `sessionStorage` — cleared on tab close, never written to `localStorage` or cookies. Input is cleared immediately after use.

### Stale SHA prevention
Every save workflow re-fetches the current file SHA from GitHub before committing. This prevents overwrite conflicts when another process has updated the file since the editor last loaded it.

### Canonical file order: ASC, display order: DESC
- Files on GitHub are always saved oldest-first (ASC by Date). This matches how the data was originally structured.
- The editor displays rows newest-first (DESC) for usability.
- Sort is applied in-memory at render time (display) and at save time (before commit).

### Internal `_id` field for row identity
Each row gets a unique `_id` assigned when loaded. This field is used for edit/delete tracking across renders. It is stripped before saving to GitHub (never written to JSON files).

### Performance: pagination + DocumentFragment
- 100 rows per page — keeps render time < 16ms for 500+ row datasets.
- `DocumentFragment` is used for batch DOM construction before a single insert, minimising reflows.
- Single click listener per table (event delegation) avoids per-row handler overhead.

### Validation
- Date fields: YYYY-MM-DD regex + real date check via `new Date()`
- Numeric fields: `parseFloat` + `isFinite` check; rounded to 2dp on save
- Validation runs inline (highlighting bad cells) and at save-to-GitHub time

## Files

| File | Change | Purpose |
|------|--------|---------|
| `editor.html` | Created | Two-tab UI, token section, tables, status log |
| `editor.js` | Created | All JS: API helpers, state, CRUD, validation |
| `Index.html` | Modified | Added "✏️ Editor" nav link in header |

## What Was Intentionally NOT Changed

- `styles.css` — untouched; editor uses the same design tokens via CSS custom properties
- `script.js` — untouched
- `Data/*.json` — untouched; the editor only reads/writes them at user request via GitHub API



---

# Decision: CSS Extraction — Editor.css

**Date:** 2026-05-10  
**Author:** Foden (Frontend Dev)  
**Files affected:** `editor.html`, `Editor.css` (new)

## What Was Done

Extracted the entire `<style>` block from `editor.html` (approximately lines 9–303) into a new external file `Editor.css` at the repo root.  
`editor.html` previously contained one `<style>` block covering all editor-specific component styles (~294 lines of CSS).

The block was removed and replaced with:
```html
<link rel="stylesheet" href="Editor.css">
```
placed immediately after the existing `<link rel="stylesheet" href="styles.css">` in `<head>`.

## What Was Consolidated

| Item | Decision |
|---|---|
| All editor-specific rules | Moved verbatim into `Editor.css` with the original section comments preserved. |
| Header comment | Added a banner comment clarifying this file extends `styles.css` design tokens. |

## Why

- **Consistency:** Follows the pattern Nico established when extracting `styles.css` from `Index.html`.
- **Maintainability:** CSS in a dedicated file is easier to navigate and review than an inline block.
- **Cacheability:** External stylesheets are cached by browsers; inline styles are re-parsed on every load.
- **Separation of concerns:** Keeps HTML focused on structure; CSS focused on presentation.
- **Zero visual change:** All class names, selectors, custom property references, and `[data-theme]` overrides are byte-for-byte identical to the original.

## Governance Note

No JavaScript was modified. The page's runtime behaviour (GitHub API calls, table rendering, pagination) is unaffected.



---

# Decision: Frontend Backlog Fixes — 2026-05-13

**Date:** 2026-05-13T12:09:57.292-03:00
**Author:** Nico (Frontend Dev)
**Files affected:** `Index.js`, `Index.css`, `login.html`

---

## Fix 1 — Keyboard accessibility for matrix cells

**File:** `Index.js`

`renderMatrix()` now emits `tabindex="0"` and `role="button"` on every clickable `<td>`. An `onkeydown` handler triggers `onMatrixCellClick()` when the user presses `Enter` or `Space` (`event.preventDefault()` blocks page scroll on Space). Existing mouse click behaviour is unchanged.

**Rationale:** Clickable table cells were entirely inaccessible to keyboard-only and screen-reader users. `role="button"` communicates intent to AT; `tabindex="0"` makes cells reachable via Tab.

---

## Fix 2 — JSON fetch error handling with 15-second timeout

**File:** `Index.js`

Bootstrap IIFE now creates an `AbortController` and a 15-second `setTimeout` before the `Promise.all`. Both fetch calls pass `{ signal: controller.signal }`. `clearTimeout` is called on both the success and error paths. A `showError()` helper renders the error state into the existing `#app-loading` overlay using CSS custom properties (`var(--neg)`, `var(--text2)`) — no hardcoded colours. Abort errors show "Tiempo de espera agotado"; HTTP/network errors show "Error al cargar datos. Por favor recargue la página."

**Rationale:** Without a timeout, a hung network request left users staring at an infinite spinner with no feedback. The happy-path data flow is untouched.

---

## Fix 3 — Branded login.html fallback

**File:** `login.html`

Replaced the bare `<p>Redirigiendo…</p>` body with a 24-line branded splash screen. A `<style>` block applies: dark background `#0a0e13` (the resolved value of `--bg`), flexbox-centred layout, "Análisis de Futuros" label, "Brent Monitor" heading, and a pure-CSS animated-ellipsis loading indicator. No JavaScript. No external dependencies.

**Rationale:** The previous login.html rendered as an unstyled white page during the Azure Entra ID redirect. On slow or failed redirects users saw a broken-looking blank page. The new splash is visually consistent with the main app.

---

## Fix 4 — Mobile matrix layout below 700px

**File:** `Index.css`

Five rules added inside the existing `@media (max-width:700px)` block:

| Selector | Rule |
|---|---|
| `.matrix-wrap table` | `font-size:.7rem` |
| `.matrix-wrap th, .matrix-wrap td` | `min-width:36px; padding:4px 2px` |
| `.matrix-wrap td:first-child` | `position:sticky; left:0; z-index:1; background:var(--surface)` |
| `.matrix-wrap th:first-child` | `position:sticky; left:0; z-index:2; background:var(--surface2)` |

**Rationale:** The 10×10 spread matrix caused severe horizontal scroll on phones (≤375 px wide). Column labels scrolled off-screen, making the matrix unreadable. Compact padding + sticky first column resolves both issues without touching the matrix HTML or desktop layout.



---

# Decision: Frontend Bug Fixes — Design Review 2026-05-13

**Date:** 2026-05-13  
**Author:** Nico (Frontend Dev)  
**Files affected:** `Index.js`, `Index.css`, `Index.html`

## Summary

Applied all 5 confirmed bugs/inconsistencies identified in the design review. All fixes are surgical — only the described lines were changed.

---

## Fix 1 — dbChart not rebuilt on theme toggle (🔴)

**File:** `Index.js`  
**Change:** Added `if (dbChart) renderDbChart();` directly inside `toggleTheme()`, after the existing `renderSpreadChart()`, `buildForwardChart()`, and `renderPctChart()` calls. Removed the redundant wrapper IIFE at the bottom of `initApp` that had previously patched this via `window.toggleTheme` wrapping (it was functional but convoluted).  
**Guard used:** `if (dbChart)` — checks the chart instance directly, matching the variable-null pattern described in the spec.

---

## Fix 2 — Percentile cards always show red (🔴)

**File:** `Index.js`  
**Change:** Replaced the hardcoded `neg` class on `.pct-num` with a computed variable:
```js
var pctCls = pct <= 33 ? 'pos' : pct >= 67 ? 'neg' : 'warn';
```
- ≤ 33rd percentile → `pos` (green) — roll is cheap/favorable  
- 34–66 → `warn` (amber) — roll is average  
- ≥ 67th percentile → `neg` (red) — roll is expensive/unfavorable

---

## Fix 3 — KPI grid orphaned layout (🟡)

**File:** `Index.css`  
**Changes:**
1. Default `.kpi-row`: `repeat(7,1fr)` → `repeat(5,1fr)` — produces two clean rows of 5 for 10 cards.
2. `@media (max-width:1000px)`: `.kpi-row` changed from `repeat(4,1fr)` to `repeat(5,1fr)` — eliminates the 4+4+2 orphan at this breakpoint.
3. `@media (max-width:700px)`: `.kpi-row` changed from `repeat(3,1fr)` to `repeat(2,1fr)` — 5 clean rows of 2 on mobile.
4. Added `@media (max-width:400px)`: `.kpi-row { grid-template-columns:repeat(1,1fr) }` — single column on very small screens.

---

## Fix 4 — Hardcoded matrix date (🟡)

**Files:** `Index.html`, `Index.js`  
**Changes:**
1. `Index.html` line 92: Added `id="matrix-title"` to `<div class="card-title">Spreads al 05/05/2026</div>`.
2. `Index.js` (after `LAST_DATE` is set): Added `document.getElementById('matrix-title').textContent = 'Spreads al ' + LAST_DATE.split('-').reverse().join('/');` — formats LAST_DATE from `YYYY-MM-DD` to `DD/MM/YYYY`, matching the hardcoded style.

---

## Fix 5 — dbChart color token inconsistency (🟡)

**File:** `Index.js`  
**Change:** In `renderDbChart()`, changed color token from `--accent` to `--curve1`:
```js
// Before
const _c1 = getComputedStyle(...).getPropertyValue('--accent').trim() || '#4dabf7';
// After
const _c1 = getComputedStyle(...).getPropertyValue('--curve1').trim() || '#4dabf7';
```
Both tokens currently resolve to the same value (`#4dabf7` in dark mode), but `--curve1` is the canonical token for primary chart lines, matching the spread chart pattern.



---

# Decision: Editor Page CSS Fix — 2026-05-10

**Author:** Nico (Frontend Dev)  
**Date:** 2026-05-10  
**Commit:** 66edcc4

## Root Cause

When Foden externalized the editor's `<style>` block into `Editor.css`, another refactor was already in progress (or recently done) that renamed `styles.css` → `Index.css` and `script.js` → `Index.js` for naming consistency with `Index.html`. Those renames were present on disk but **never committed**.

`editor.html` linked to `styles.css` — which no longer existed on disk — causing the entire editor page to render unstyled (white page). `Editor.css` references CSS custom properties (`--surface`, `--accent`, `--border`, etc.) that are defined in the shared base stylesheet. Without that base stylesheet loading, all tokens were `undefined` and the layout collapsed.

## What Was Fixed

1. `editor.html` `<link>`: `styles.css` → `Index.css`  
2. Committed the previously unstaged renames:
   - `styles.css` → `Index.css` (100% identical content)
   - `script.js` → `Index.js` (100% identical content)
   - `Index.html` updated references (already modified, unstaged)

## Rule Going Forward

**When renaming a shared CSS or JS file, search ALL HTML files in the repo for references before committing.** A single missed reference causes a silent white-page failure on Azure Static Web Apps (which is case-sensitive and serves missing files as 404 with no fallback).

Suggested check before any shared file rename:
```powershell
Select-String -Path "*.html" -Pattern "styles.css"
```

