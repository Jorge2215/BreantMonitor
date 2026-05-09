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
