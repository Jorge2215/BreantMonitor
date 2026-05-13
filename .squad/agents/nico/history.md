# Project Context

- **Owner:** Jorge
- **Project:** BreantMonitorJson — HTML page displaying financial information
- **Stack:** HTML, CSS, JavaScript, JSON
- **Created:** 2026-05-09

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
- Team assembled 2026-05-09. Goal: improve an HTML page containing financial information.

### 2026-05-09 — CSS extraction to styles.css
- **What was done:** Extracted ~780 lines of CSS from the single `<style>` block in `Index.html` (plus a tiny inline `<style>@keyframes spin` block) into a new external `styles.css` at the repo root. `Index.html` now links the sheet with `<link rel="stylesheet" href="styles.css">` and contains zero `<style>` tags.
- **Key patterns found:** The CSS was already well-structured with shared component classes (`.card`, `.kpi-card`, `.stat-strip`, `.pct-card`, etc.). CO1–CO10 cards share a single `.kpi-card` rule — there were no per-contract overrides to remove.
- **Consolidation decisions:**
  - Added descriptive section banner comments (e.g. `KPI ROW`, `CARD`, `CONTROLS`, `HEATMAP TABLE`) to make the external file navigable.
  - Moved `@keyframes spin` (loading spinner) from its isolated second `<style>` tag into `styles.css` under a "LOADING SPINNER ANIMATION" section.
  - No visual rules were altered — pixel-perfect parity with the original is preserved.
  - `[data-theme="light"]` overrides kept immediately after `:root` tokens, consistent with the original ordering.

### 2026-05-09 — JS extraction to script.js
- **JS externalization completed:** All 663 lines of inline JavaScript extracted from `Index.html` (lines 306–970) into new `script.js` at repo root. `Index.html` now has `<script src="script.js"></script>` before `</body>` and zero inline `<script>` blocks (only the Chart.js CDN tag in `<head>` remains).
- **Simplifications applied:**
  - `isLight()` — module-level helper replacing every `document.documentElement.getAttribute('data-theme')==='light'` pattern.
  - `getChartColors()` — module-level helper returning `{ gridC, tickC }`, eliminating the repeated `_gridC`/`_tickC` derivation in every chart render function.
  - `getTooltipConfig()` — module-level helper returning the 4 theme-aware base tooltip fields (`backgroundColor`, `borderColor`, `titleColor`, `bodyColor`); each chart spreads it and adds its own callbacks/fonts.
  - `subtractPeriod` consolidated — the former `dbSubtractPeriod` (inside initApp, used local-time `setMonth`) replaced by the shared `subtractPeriod` (UTC-based); `dbSubtractPeriod` is gone.
- **Key file paths:** `Index.html` (updated — inline JS removed), `script.js` (new — all JS lives here).
- **Architecture note:** Module-level helpers (`isLight`, `getChartColors`, `getTooltipConfig`) are defined outside `initApp` at the top of `script.js` so they are available as soon as the file loads, independently of data.

### 2026-05-09 — Editor page (editor.html + editor.js)
- **What was built:** A standalone two-tab data editor (`editor.html` / `editor.js`) for `Data/raw.json` and `Data/dated-brent.json`. No backend — GitHub Contents API called directly from the browser using a user-supplied PAT stored in `sessionStorage`.
- **Token flow:** Input cleared immediately after verification. `sessionStorage` is used (session-only, tab-close clears it). On page load, existing token is re-verified via `GET /user` before data is loaded.
- **Stale SHA prevention:** Every save re-fetches the current file SHA before committing (`PUT /repos/.../contents/{path}` requires the current SHA). This prevents conflicts when multiple sessions edit the same file.
- **Performance strategy for 500+ rows:** Pagination (100 rows/page) + `DocumentFragment` batch DOM construction + single event delegation listener per table. Avoids per-row handler attachment.
- **Internal `_id` field:** Each row gets a stable `_id` counter field assigned on load. Used for edit/delete tracking. Stripped from JSON before saving to GitHub.
- **Sort convention:** Display order = DESC (newest first). File order on GitHub = ASC (oldest first). Sort applied at render and at save time respectively.
- **Validation:** Date = YYYY-MM-DD regex + real calendar check. Numeric = `parseFloat` + `isFinite`. Values rounded to 2dp on row-save. Full dataset validated before GitHub commit.
- **Dirty badge:** Shown when any row has been locally saved (`_saveRow`) or deleted (`deleteRow`). Adding then canceling a new row does NOT trigger the dirty badge (no real change occurred).
- **styles.css untouched:** Editor-specific CSS lives in a `<style>` block inside `editor.html`. All tokens reference the same CSS custom properties from `styles.css`.

### 2026-05-09 — Decisions inbox merged
- Scribe merged three inbox proposals (haaland-deployment-arch.md, nico-css-extraction.md, nico-js-extraction.md) into `.squad/decisions/decisions.md` and removed the inbox files.
- Session log and orchestration log created for JS externalization.
- README.md created with full technical documentation (2026-05-09)

### 2026-05-09 — Team updates
- nico: built editor.html (428 lines) and editor.js (744 lines); added nav link; committed to dev branch (4f2c762).

### 2026-05-10 — Editor page styles bug fix (commit 66edcc4)
- **Root cause:** `styles.css` was renamed to `Index.css` (and `script.js` to `Index.js`) as a naming-consistency refactor, but those renames were never committed and `editor.html` still referenced the old `styles.css` path. With the file gone from disk, all CSS custom properties (`--surface`, `--accent`, etc.) were missing and the editor page rendered white/unstyled.
- **Fix:** Updated `editor.html` `<link>` from `styles.css` → `Index.css`. Also staged and committed the unstaged renames (`styles.css`→`Index.css`, `script.js`→`Index.js`) and the `Index.html` update that referenced them, so all files are consistent.
- **Lesson:** When renaming shared CSS/JS files that other pages depend on, always search ALL HTML files for references before committing. Azure SWA is case-sensitive — a missing file silently produces a white page with no console error in some environments.

### 2026-05-13 — Comprehensive design review (analysis only, no code changes)

**Architecture overview confirmed:**
- Three pages: `Index.html` (main dashboard), `editor.html` (data CRUD), `login.html` (Azure Entra ID redirect shim).
- Shared design system: `Index.css` (30+ CSS custom properties, dark/light tokens), extended by `Editor.css` for editor-specific UI.
- All JS in `Index.js` (`initApp` closure, module-level chart helpers) and `editor.js`.
- Data sources: `Data/raw.json` (CO1–CO10 daily prices), `Data/dated-brent.json` (Dated Brent prices).

**Tab structure of the dashboard:**
1. **Monitor de Spreads** — KPI row (10 CO cards) · Spread histórico chart · Dual spread matrices · Forward curve overlay.
2. **Heatmap Costo de Roll** — Year×Month heatmap (7-intensity scale) · Percentile mini-cards · Bar chart vs historical avg.
3. **Dated Brent** — Dated vs CO1 spread chart · Dual matrix (same pattern as Monitor tab).
- Heatmap and Dated tabs use lazy initialization (only compute on first visit).

**Design strengths identified:**
- Token system: ~30 CSS custom properties give full dark/light coverage with a single `[data-theme="light"]` block.
- Dual typography: Open Sans (UI/labels) + JetBrains Mono (all numeric data) — strong information hierarchy.
- Color language consistent across all sections: red = negative/backwardation, green = positive/contango, amber = neutral stats.
- Matrix click-through to spread chart is excellent linked-view UX.
- Stat strip (4-cell summary) pattern reused consistently across all three tabs.
- Subtle body grid overlay (`56×56px`) gives a Bloomberg-terminal aesthetic without visual noise.
- Theme toggle rebuilds all charts on switch (except dbChart — see gap below).

**Notable gaps identified (no fixes applied this session):**
1. **KPI row grid: `repeat(7,1fr)` with 10 cards** — last row always orphaned (3 cards). Should be `repeat(5,1fr)` or `repeat(10,1fr)`.
2. **Hardcoded date in spread matrix card title** (`"Spreads al 05/05/2026"` in Index.html line 93) — should be dynamically populated from `LAST_DATE` like the header date is.
3. **`dbChart` not rebuilt on theme toggle** — `toggleTheme()` calls `renderSpreadChart()`, `buildForwardChart()`, `renderPctChart()` but NOT `renderDbChart()`. Dated Brent chart keeps old colors after a theme switch if that tab was already open.
4. **`pct-num` class is always `neg` (red)** on percentile cards — value is always rendered alarming-red regardless of whether the percentile is high (cheap roll) or low (expensive roll). Should be conditional on value.
5. **No keyboard navigation on matrix cells** — clickable `<td>` elements have no `tabindex` or `role="button"`. Accessibility gap.
6. **Login page has no loading state / brand** — bare `<p>Redirigiendo…</p>` on white. If AAD redirect fails, user sees an unstyled blank page.

### 2026-05-13 — Backlog fixes (4 items)

- **ITEM 1 — Keyboard accessibility for matrix cells** (`Index.js`): Added `tabindex="0"` and `role="button"` to every clickable `<td>` in `renderMatrix()`. Added `onkeydown` inline handler that fires `onMatrixCellClick()` on Enter or Space, with `event.preventDefault()` to block page scroll on Space. No visual change.
- **ITEM 2 — JSON fetch error handling with timeout** (`Index.js`): Added `AbortController` + 15-second `setTimeout` wrapping both `fetch()` calls in the bootstrap IIFE. `clearTimeout` called on both success and error paths. `showError()` helper renders user-friendly message using CSS tokens (`--neg`, `--text2`) — no hardcoded colours. Abort errors display "Tiempo de espera agotado"; HTTP/network errors display "Error al cargar datos. Por favor recargue la página." plus the technical detail.
- **ITEM 3 — Branded login.html fallback** (`login.html`): Replaced bare `<p>` text with a branded splash screen. Inline `<style>` block: dark bg `#0a0e13` (resolved `--bg`), centred layout, "Análisis de Futuros" tag + "Brent Monitor" heading, animated ellipsis via pure CSS `@keyframes`. No JS, no external deps, 24 lines total.
- **ITEM 4 — Mobile matrix layout below 700px** (`Index.css`): Added 5 rules inside the existing `@media (max-width:700px)` block. `.matrix-wrap table` → `font-size:.7rem`. `.matrix-wrap th/td` → `min-width:36px; padding:4px 2px`. First column (`td:first-child` / `th:first-child`) → `position:sticky; left:0; z-index:1/2` with explicit background (`--surface` / `--surface2`) to prevent bleed. Desktop layout unaffected.


- **BUG 1 — dbChart theme toggle** (`Index.js`): Added `if (dbChart) renderDbChart();` directly inside `toggleTheme()` after the other chart rebuilds. Removed the redundant wrapper IIFE that had previously patched this via `window.toggleTheme` re-wrapping. Guard: `dbChart !== null`.
- **BUG 2 — Percentile card color** (`Index.js`): Replaced hardcoded `neg` class on `.pct-num` with `var pctCls = pct <= 33 ? 'pos' : pct >= 67 ? 'neg' : 'warn'`. Low percentile = green (cheap), medium = amber, high = red (expensive).
- **FIX 3 — KPI grid columns** (`Index.css`): Changed default `.kpi-row` from `repeat(7,1fr)` → `repeat(5,1fr)` (2 clean rows of 5). Updated `@media (max-width:1000px)` from 4 cols → 5 cols (no orphan). Updated `@media (max-width:700px)` from 3 cols → 2 cols. Added new `@media (max-width:400px)` for 1 col.
- **FIX 4 — Dynamic matrix date** (`Index.html` + `Index.js`): Added `id="matrix-title"` to the spread matrix card title element. In JS, set its content to `'Spreads al ' + LAST_DATE.split('-').reverse().join('/')` (DD/MM/YYYY format) after data loads, same pattern as `last-date`.
- **FIX 5 — dbChart color token** (`Index.js`): Changed `renderDbChart()` from `getPropertyValue('--accent')` → `getPropertyValue('--curve1')` for the primary line color. Aligns with the spread chart token convention.

### 2026-05-13 — Backlog fixes implemented
- **Agent:** nico-2
- **Summary:** Implemented 4 backlog fixes: a11y keyboard nav in matrix (Index.js), JSON fetch timeout + error handling (Index.js), branded login.html fallback, mobile matrix sticky column (Index.css).
- **Notes:** fixes are surgical; no behavioural changes beyond accessibility and error handling improvements.

