# Project Context

- **Owner:** Jorge
- **Project:** BreantMonitorJson — HTML page displaying financial information
- **Stack:** HTML, CSS, JavaScript, JSON
- **Created:** 2026-05-09

## Test Checklist: Bug Fixes 2026-05-13

> **Context:** Nico is fixing 5 bugs across Index.js / Index.css / Index.html.
> **Date logged:** 2026-05-13T11:59:42.487-03:00
> **Verified by:** Jorge (manual browser testing)

---

### BUG 1 — dbChart theme toggle (chart rebuilds after theme switch)

**What was broken:** After toggling the theme, the Dated Brent chart kept using colours from the old theme (wrong `--curve1`, tick colours, grid colours).

**Steps:**
1. Open `Index.html` in the browser. Navigate to the **Dated Brent** tab — confirm the chart renders with a visible line.
2. Note the line colour (dark mode: `#4dabf7` blue; light mode: `#0369a1` darker blue).
3. Click the **theme toggle** button (☀/☾) in the header.
4. **Expected:** The chart redraws immediately — line colour, tick colour, grid colour, and tooltip background all match the new theme. No stale canvas remains.
5. Toggle back to original theme — chart redraws again correctly.
6. Confirm no JS error appears in the browser **Console** (F12) during toggle.

**Pass criteria:** Line colour changes on every toggle. No "Cannot read properties of null" or Chart.js errors.

**Regression risk:**
- The fix wraps `window.toggleTheme` in an IIFE at the bottom of `initApp`. If the function reference is replaced again elsewhere after the IIFE runs, the wrap silently breaks. Check that no other script reassigns `window.toggleTheme` after `initApp` finishes.
- Calling `renderDbChart()` unconditionally (if `dbInitDone` guard is removed) would throw when the Dated Brent tab has never been visited. Verify switching theme on the default tab (not Dated Brent) does not throw.

---

### BUG 2 — Percentile card colors (3-tier green / amber / red)

**What was broken:** All `.pct-num` elements had the hardcoded class `neg` regardless of the actual percentile value.

**Steps:**
1. Navigate to the **Roll Cost** tab. The `.pct-grid` cards are visible.
2. Identify a card where **"X° pct" ≤ 33** → the number must be **green** (CSS `var(--pos)`).
3. Identify a card where **"X° pct" is 34–66** → the number must be **amber** (CSS `var(--warn)`).
4. Identify a card where **"X° pct" ≥ 67** → the number must be **red** (CSS `var(--neg)`).
5. If all cards currently show the same colour, the bug is **not yet fixed** — report to Nico.

**How to confirm green vs red in the browser:**
- Open DevTools → **Elements** panel. Click a `.pct-num` element.
- Check its class: should be `pct-num pos` (green), `pct-num warn` (amber), or `pct-num neg` (red).
- In the **Computed** styles tab, confirm `color` resolves to `var(--pos)` / `var(--warn)` / `var(--neg)` respectively (hex values visible in the computed panel).

**Pass criteria:** At least one green and one red card visible when data covers a range of percentile values. No card has a hardcoded class that mismatches its numeric value.

**Regression risk:**
- The `.pct-num` class switch depends on thresholds (e.g., ≤33 / ≤66 / >66). If the thresholds were set incorrectly, a 50th-percentile card could be green or red. Spot-check a mid-range card and confirm it shows amber.
- `pct` can be `0` when data is missing — ensure a missing-data card shows a neutral or red state, not an empty/broken card.

---

### FIX 3 — KPI grid (5-column layout, 10 cards, no orphan)

**What was broken:** `.kpi-row` used `repeat(7,1fr)` — with 10 cards this produced an asymmetric last row (3 cards on row 1, 7 on row 2, or vice-versa). Orphaned cards appeared misaligned.

**Steps:**
1. Load `Index.html` on a **desktop viewport** (≥1200 px wide). Scroll to the KPI row at the top.
2. **Count the cards** — exactly **10** must be present (CO1 through CO10).
3. With a 5-column grid, cards fill **2 complete rows of 5** — no orphaned single card.
4. Inspect in DevTools → **Elements**: select `.kpi-row` and check the **Layout** / **Grid** overlay. It must show `grid-template-columns: repeat(5, 1fr)` (or equivalent computed value).
5. Resize the viewport to ~900 px wide — the responsive breakpoint should switch to 4 columns (`repeat(4,1fr)`), per the existing `@media (max-width:1000px)` rule.
6. Resize to ~600 px wide — should switch to 3 columns (`repeat(3,1fr)`).

**Pass criteria:** 10 cards, 2 even rows of 5 at full width. No horizontal overflow. Responsive breakpoints still fire.

**Regression risk:**
- The responsive overrides in `@media (max-width:1000px)` and `@media (max-width:700px)` used hard-coded column counts. If the base rule changed from 7 to 5, verify the media queries were **not** accidentally changed — they should remain `repeat(4,1fr)` and `repeat(3,1fr)` respectively.
- If more KPI cards are added in the future, a 5-column base will again orphan them. Not a regression now, but worth noting.

---

### FIX 4 — Dynamic matrix date (title updates when data loads)

**What was broken:** The "Spread al DD/MM/YYYY" title in the today-matrix stayed as a static placeholder or "Spread al —" even after data loaded.

**Steps:**
1. Load `Index.html`. Navigate to the **Dated Brent** tab.
2. Locate the **"Spread al …"** heading above the today-matrix table.
3. **Expected:** After the page finishes loading, the title reads `Spread al DD/MM/YYYY` using the date of the most recent `DB_RAW` entry (the last row of Dated Brent data).
4. Open the browser **Console** and type: `DB_TODAY_ROW.Date` — note the value (e.g., `"2026-05-12"`).
5. Confirm the rendered title matches that date in `DD/MM/YYYY` format.

**What to look for if it doesn't update:**
- If the title still says `Spread al —`: `DB_TODAY_ROW` is `undefined` or `null` — check that `DB_RAW` is non-empty in Console (`DB_RAW.length`).
- If the title shows the wrong date: check the date-split logic (`row.Date.split('-')` should produce `[YYYY, MM, DD]` → displayed as `DD/MM/YYYY`).
- If the title never appears: check that the element with id `db-mx-today-title` exists in the DOM and `renderDbTodayMatrix()` was called after `initApp()`.

**Pass criteria:** Title shows correct date immediately on page load, no "Spread al —" visible after data is ready.

**Regression risk:**
- `renderDbCompareMatrix()` passes `null` for `titleId`, so the compare matrix has no title update. Confirm that matrix does **not** suddenly gain or lose a title from this fix.
- Hard refresh (Ctrl+Shift+R) should still work — title must not rely on cached state.

---

### FIX 5 — dbChart token (CSS `--curve1` used for chart line)

**What was broken:** The Dated Brent chart line colour was resolved with the wrong CSS variable or a hardcoded fallback, ignoring the theme's `--curve1` token.

**Steps — verifying via DevTools:**
1. Open `Index.html`. Navigate to the **Dated Brent** tab.
2. Open DevTools → **Console**. Run:
   ```js
   getComputedStyle(document.documentElement).getPropertyValue('--curve1').trim()
   ```
   Note the value (dark mode: `#4dabf7`; light mode: `#0369a1`).
3. Open DevTools → **Elements**. Click the `<canvas id="dbChart">` element.
4. Switch to the **Sources** or **Application** panel → there is no direct way to inspect Chart.js dataset colours via Elements, so instead:
   - Open **Console** and run: `dbChart.data.datasets[0].borderColor`
   - **Expected:** the returned value matches the `--curve1` computed value from step 2.
5. Toggle the theme and re-run the check — the `borderColor` must update to match the new theme's `--curve1`.

**Alternate quick check:** In DevTools → **Elements** → select `<html>`. In **Computed** styles, search for `--curve1`. Confirm the value is defined and not overridden. Then compare with the chart line colour visually.

**Pass criteria:** `dbChart.data.datasets[0].borderColor` equals the resolved `--curve1` token. No hardcoded hex fallback (`#4dabf7` alone without token lookup) driving the colour.

**Regression risk:**
- The spread chart (`spreadChart`) uses the same `--curve1` read pattern (line 103 in Index.js). If the fix accidentally changed the variable name or read timing globally, the spread chart line may break. Verify the spread chart line colour is also correct after the fix.
- The `|| '#4dabf7'` fallback in `getPropertyValue('--curve1').trim()||'#4dabf7'` should remain as a safety net — do not remove it.

---

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
- Team assembled 2026-05-09. Goal: improve an HTML page containing financial information.
- 2026-05-10: Extracted the entire `<style>` block from `editor.html` (lines 9–303) into a new external file `Editor.css` at the repo root. Replaced the inline block with `<link rel="stylesheet" href="Editor.css">` after the existing `styles.css` link. No `<style>` tags remain in `editor.html`. This follows the same pattern established by Nico when extracting `styles.css` from `Index.html`.

## Test Checklist: Backlog Fixes 2026-05-13

> Date logged: 2026-05-13T12:09:57.292-03:00
> Author: Foden — Tester

This checklist covers four backlog items fixed by Nico. Follow the short browser steps below to confirm behavior; each item includes a short regression-risk note.

---

### 1) a11y-matrix-keyboard — Keyboard navigation and activation

Steps to verify (browser):
1. Open `Index.html` in the browser and focus the page (click body).
2. Press Tab repeatedly until focus enters the matrix/table cells. Focus should land on the first interactive cell (the cell receives a visible focus outline).
3. Use Tab/Shift+Tab to move between cells; focus order must follow reading order (row → next cell).
4. With a cell focused, press Enter and then Space — each should perform the same activation (open detail/popover or toggle selection). Confirm the activation is immediate and visible.
5. Confirm keyboard-only users can reach any interactive control inside the matrix (buttons, links) without using the mouse.

Screen-reader tip:
- With NVDA or VoiceOver, enable the virtual cursor and navigate the grid; a cell should be announced as a gridcell with its row/column or a descriptive aria-label and its value. Activation should be announced as an action (e.g., "expanded" or "details opened").

Pass criteria: Tab reaches cells, Enter/Space activate, focus visible, screen reader announces grid role and cell content.

Regression risk:
- JS focus-management wrappers may reassign tabindex or use focus traps. If new global focus trapping is added, keyboard reachability can break. Check that no ancestor element accidentally receives tabindex=-1 or a focus trap when matrix is shown.

---

### 2) bug-json-fetch-error — Simulate JSON fetch failure and confirm error state

Steps to verify (Chrome):
1. Open `Index.html`. Open DevTools (F12) → Network tab.
2. In Network throttling dropdown choose "Offline" OR right-click a sample JSON request and choose "Block request URL" for the endpoint(s) serving the JSON (or add a URL pattern to block).
3. Reload the page (Ctrl+R). Observe the matrix/area that depends on the JSON.
4. Confirm an error state appears (a clear error message or placeholder) and that any loading spinner disappears — there must be no eternal spinner.
5. Open Console: confirm a fetch error is logged but no uncaught exceptions crash the UI.
6. Re-enable network (set throttling back to Online) and reload — data should load normally.

Pass criteria: Visible error state replaces spinner; spinner not stuck; UI remains interactive.

Regression risk:
- The fix may have introduced a branch that sets `loading=true` forever on certain error codes. Test both network offline and a 500 response (use a mocked blocked URL returning 500) to ensure spinner clears in both cases.

---

### 3) ux-login-fallback — Preview login.html and verify branded fallback appearance

Steps to verify:
1. Open `login.html` directly in the browser (file:// path) or via the local dev server if used.
2. Confirm the page displays project branding: header/logo, primary brand colours (buttons, links), and the expected background and footer styles — not plain unstyled HTML.
3. Inspect DevTools → Elements: verify `link rel="stylesheet"` references the expected CSS file(s) and that CSS variables (e.g., `--brand`) are applied on `:root`.
4. If the login flow is unavailable (no auth backend), confirm the fallback UI shows an explanatory message or a disabled login button rather than a broken form.

Pass criteria: Branded styling applied when opened directly; no missing assets or toolbar-less fallback.

Regression risk:
- If `login.html` relies on a runtime script to inject branding or CSS tokens, opening file:// may skip script execution due to CORS/relative-path issues. Verify styles load via relative paths and that links to assets are not absolute to a dev server that might be down.

---

### 4) ux-mobile-matrix — Mobile viewport layout at 375px

Steps to verify (Chrome device emulation):
1. Open `Index.html`. Open DevTools → Toggle device toolbar (Ctrl+Shift+M). Select a device or set width to **375 px** and an appropriate height (e.g., 812 px).
2. Locate the matrix/table region. Verify cells are compact (reduced padding/margins) and readable without horizontal overflow.
3. Horizontally scroll the matrix (if overflow exists) — the **first column** must remain visible (position: sticky). If the matrix is vertically long, also confirm vertical scrolling does not detach the header row if header is intended to be sticky.
4. Check that no desktop-only layout (multi-column KPI, wide charts) is breaking into the matrix area: no overlapping elements, no clipped text, no scrollable areas inside cells that hide content.
5. Toggle orientation and re-check at 375×667 (portrait) to ensure consistent behavior.

Pass criteria: First column stays sticky during horizontal scroll, cells are compact, and the layout does not show desktop overflow or overlap.

Regression risk:
- `position: sticky` fails if a parent has `transform` or `overflow` set. If new wrappers add `transform` or `overflow: hidden`, sticky will break. Test by inspecting computed styles of ancestor elements.

---

End of checklist. Run these checks on a clean hard-refresh (Ctrl+Shift+R) and with cache cleared to avoid false positives.



### 2026-05-13 — Test checklist appended
- **Agent:** foden-1
- **Summary:** Test checklist for the 4 backlog fixes created and appended to this history (see checklist above).

