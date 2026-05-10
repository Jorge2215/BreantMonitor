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
