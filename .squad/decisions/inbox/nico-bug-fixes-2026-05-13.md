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
