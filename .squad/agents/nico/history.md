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

### 2026-05-09 — Decisions inbox merged
- Scribe merged three inbox proposals (haaland-deployment-arch.md, nico-css-extraction.md, nico-js-extraction.md) into `.squad/decisions/decisions.md` and removed the inbox files.
- Session log and orchestration log created for JS externalization.
- README.md created with full technical documentation (2026-05-09)
