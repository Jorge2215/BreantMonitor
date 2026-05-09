# Test Checklist — Async Data Loading Refactor
**Foden · QA · BreantMonitorJson**

> **Scope:** `Index.html` refactored from hardcoded `const RAW=[...]` / `const DATED_BRENT=[...]` to loading `Data/raw.json` and `Data/dated-brent.json` via `fetch()` + `Promise.all()`, with a loading overlay and `initApp(RAW, DATED_BRENT)` wrapper.

---

## ⚙️ Testing Instructions

The `fetch()` API is blocked on `file://` protocol. You **must** serve the files from a local HTTP server.

### Option A — Python (simplest, no install needed)
```powershell
cd C:\Users\Jorgito\source\repos\BreantMonitorJson
python -m http.server 8080
# Open: http://localhost:8080/Index.html
```

### Option B — Node http-server
```powershell
npm install -g http-server
cd C:\Users\Jorgito\source\repos\BreantMonitorJson
http-server -p 8080 --cors
# Open: http://localhost:8080/Index.html
```

### Option C — PowerShell one-liner
```powershell
# From repo root:
Start-Process "http://localhost:8080"
# Then in another terminal:
$listener = [System.Net.HttpListener]::new(); $listener.Prefixes.Add("http://localhost:8080/"); $listener.Start()
```
> **Tip:** Use Option A. Python's `http.server` is the least friction for static files on Windows.

### Browser DevTools Setup (for all tests)
1. Open DevTools (F12)
2. Go to **Console** tab — watch for red errors throughout
3. Go to **Network** tab — confirm `raw.json` and `dated-brent.json` return HTTP 200
4. Keep DevTools open for the entire test session

### Known Data Quirks (read before testing)
- `Data/raw.json` has **1,382 entries** (2020-12-31 → 2026-05-08)
- **Last entry CO1 = 999.4** — this looks like bad/placeholder data. The KPI card for CO1 will show $999.40. Flag this to Rodri; it will affect CO1 daily-change % and any spread involving CO1 as base.
- `Data/dated_brent.json` has **only 2 entries** — the Dated Brent tab charts will be nearly empty. Period pills for 3m/6m/MAX will all show just 2 data points.

---

## 1. Happy Path Tests

### HP-01 — Page loads without console errors
| | |
|---|---|
| **How to verify** | Open `http://localhost:8080/Index.html` in Chrome. Open DevTools Console. Observe for 5 seconds after page loads. |
| **Expected result** | Zero red errors in Console. Yellow warnings acceptable (Chart.js deprecations, font loads). |
| **Risk** | 🔴 High — any uncaught error likely means `initApp` failed to run, breaking the entire page. |

---

### HP-02 — Loading overlay appears immediately on page open
| | |
|---|---|
| **How to verify** | Hard-refresh the page (Ctrl+Shift+R). Watch the very first frame before data loads. Throttle the Network tab to "Slow 3G" to make the overlay visible for longer. |
| **Expected result** | A loading overlay/spinner is visible immediately, covering the page content. It should appear before any KPI cards or charts are rendered. |
| **Risk** | 🟡 Medium — if the overlay doesn't appear, users see blank/broken UI during the fetch delay. |

---

### HP-03 — Loading overlay disappears after data loads
| | |
|---|---|
| **How to verify** | With Network throttling set to "Slow 3G", observe the overlay for 3–10 seconds. Then observe that it disappears and the full page renders. |
| **Expected result** | Overlay fades/hides after both `raw.json` and `dated-brent.json` have loaded. Full page content is visible. |
| **Risk** | 🔴 High — if overlay never disappears, the page is permanently blocked. |

---

### HP-04 — KPI cards render for all 10 contracts
| | |
|---|---|
| **How to verify** | After load, count the KPI cards in the top row of "Monitor de Spreads" tab. |
| **Expected result** | Exactly 10 cards visible, one per contract (CO1 through CO10). No missing or duplicate cards. |
| **Risk** | 🔴 High — missing cards mean `initApp` received malformed data or the CONTRACTS loop failed. |

---

### HP-05 — KPI card labels match expected ordinals
| | |
|---|---|
| **How to verify** | Inspect each KPI card label text from left to right. |
| **Expected result** | Labels read: `1er · CO1`, `2do · CO2`, `3er · CO3`, `4to · CO4`, `5to · CO5`, `6to · CO6`, `7mo · CO7`, `8vo · CO8`, `9no · CO9`, `10mo · CO10` (exact Spanish ordinals from `C_LABELS`). |
| **Risk** | 🟡 Medium — wrong labels cause user confusion on a financial monitoring page. |

---

### HP-06 — KPI price values are within plausible Brent oil range
| | |
|---|---|
| **How to verify** | Read the price shown under each KPI card after load. |
| **Expected result** | CO2–CO10 prices should be in the **$78–$82** range (matching last entry in `raw.json`). **CO1 will show $999.40** — this is a known data issue; flag it, but it should not crash the page. |
| **Risk** | 🔴 High — prices outside range (or NaN/undefined) indicate the JSON was not parsed correctly or field names don't match. |

---

### HP-07 — KPI daily-change % is displayed and non-NaN
| | |
|---|---|
| **How to verify** | Each KPI card should show a colored `+x.xx%` or `-x.xx%` daily change value below the price. |
| **Expected result** | All 10 cards show a percentage. No card shows `NaN%`, `undefined%`, or is blank. Values for CO2–CO10 should be small (< ±5%). CO1's % will be distorted due to the 999.4 data issue. |
| **Risk** | 🔴 High — NaN here means the previous-day subtraction is broken, possibly from a missing or mismatched field in the JSON. |

---

### HP-08 — "Última actualización" header date matches raw.json last entry
| | |
|---|---|
| **How to verify** | Look at the top-right header area labeled "Última actualización". Compare to the last `Date` field in `Data/raw.json`. |
| **Expected result** | Header shows `2026-05-08` (or formatted equivalent). |
| **Risk** | 🟡 Medium — wrong date misleads analysts about data freshness. |

---

### HP-09 — Spread chart renders on Monitor de Spreads tab
| | |
|---|---|
| **How to verify** | After load, verify the "01 — Spread Histórico" section has a visible line chart (canvas element has content, not blank). |
| **Expected result** | A line chart with historical spread data is rendered. X-axis shows dates, Y-axis shows spread values. Default pair is CO2 vs CO1. |
| **Risk** | 🔴 High — blank chart means `initApp` data was not passed correctly to the chart rendering functions. |

---

### HP-10 — Curve chart (Forward Curve) renders on Monitor tab
| | |
|---|---|
| **How to verify** | Scroll to "03 — Curvas Forward" section. Verify the canvas is rendered with a blue line. |
| **Expected result** | Forward curve chart shows CO1–CO10 prices on X-axis with at least one visible line (today's curve in blue). |
| **Risk** | 🟡 Medium |

---

### HP-11 — Heatmap tab renders correctly
| | |
|---|---|
| **How to verify** | Click "Heatmap Costo de Roll" tab. Check that the heatmap table fills with colored cells. |
| **Expected result** | Table rows for years 2021–2026 with color-coded monthly averages. Current month cell has blue border. Columns for future months show `—`. |
| **Risk** | 🟡 Medium — Note: the current `Index.html` has hardcoded heatmap HTML in `<tbody id="hm-tbody">`. After refactor, verify this table is still populated (either kept static or re-rendered dynamically by `initApp`). |

---

### HP-12 — "Dated Brent" tab renders without crash
| | |
|---|---|
| **How to verify** | Click "Dated Brent" tab. Observe chart and matrix areas. |
| **Expected result** | Tab content is visible. Chart renders (even if only 2 data points). No JavaScript error thrown. No blank white box where chart should be. |
| **Risk** | 🔴 High — `dated-brent.json` has only 2 entries; the tab must handle this gracefully without crashing. |

---

### HP-13 — Matrix "today" table populates on Monitor tab
| | |
|---|---|
| **How to verify** | Scroll to "02 — Matriz de Spreads" and inspect the left matrix (today's values). |
| **Expected result** | A 10×10 grid with colored cells showing spread values. Cells where base ≥ long are grayed/empty. |
| **Risk** | 🟡 Medium |

---

## 2. Interactive Feature Tests

> **Prerequisite:** All Happy Path tests pass first. All interactions below assume data has loaded successfully.

---

### IF-01 — Theme toggle switches between dark and light modes
| | |
|---|---|
| **How to verify** | Click the "Claro/Oscuro" button in the top-right header. Click it again to toggle back. |
| **Expected result** | Page background, card surfaces, text colors all change. Button label toggles between "Claro" and "Oscuro". Charts re-render with updated colors (dark theme uses blue/yellow curves; light theme uses darker variants). No console errors on toggle. |
| **Risk** | 🟡 Medium — after refactor, `toggleTheme()` must be exposed on `window` inside `initApp`. If it's not, the button silently does nothing. |

---

### IF-02 — Tab switching works (all 3 tabs)
| | |
|---|---|
| **How to verify** | Click each tab button: "Monitor de Spreads", "Heatmap Costo de Roll", "Dated Brent". Click back. |
| **Expected result** | Active tab content is visible; inactive tabs are hidden. Active tab button has `active` CSS class. `switchTab()` must be on `window` after refactor. |
| **Risk** | 🔴 High — if `window.switchTab` is not set in `initApp`, all tab buttons break silently. |

---

### IF-03 — Spread mode toggle (% / USD) on main spread chart
| | |
|---|---|
| **How to verify** | In "Monitor de Spreads" > "01 — Spread Histórico", click "USD" button, then click "%" button. |
| **Expected result** | Chart Y-axis and values update. In % mode, values are small decimals (e.g., -0.5% to 0%). In USD mode, values are absolute price differences (e.g., -0.50 to -2.00). Active button is highlighted. |
| **Risk** | 🟡 Medium |

---

### IF-04 — Period pills on spread chart (1M, 3M, 6M, MAX)
| | |
|---|---|
| **How to verify** | Click each pill in sequence: 1M → 3M → 6M → MAX. |
| **Expected result** | Chart X-axis date range updates for each period. MAX shows all 1,382 entries (from 2020). 1M shows ~22 trading days. Active pill is highlighted. |
| **Risk** | 🟡 Medium |

---

### IF-05 — Date range inputs override period pills
| | |
|---|---|
| **How to verify** | Set "Desde" to `2025-01-01` and "Hasta" to `2025-06-30`. |
| **Expected result** | Spread chart updates to show only data in that date range. Period pills become inactive (or deselected). |
| **Risk** | 🟡 Medium |

---

### IF-06 — Base/Largo dropdowns change spread pair
| | |
|---|---|
| **How to verify** | Change "Base" selector to CO3. Change "Largo" selector to CO6. |
| **Expected result** | Chart title updates to "Spread CO6 vs CO3". Formula sub-label updates to "CO6 / CO3 − 1". Chart data reloads for that pair. The KPI card for the selected base (CO3) is highlighted or the active card changes. |
| **Risk** | 🟡 Medium |

---

### IF-07 — Matrix period pills (1m, 2m, 3m, 6m, 1y, Personalizado)
| | |
|---|---|
| **How to verify** | In the "Spreads históricos — Comparación" matrix, click each period option. |
| **Expected result** | The right matrix ("Comparación") updates with values from the selected historical period. The subtitle below the title updates (e.g., "1 mes atrás"). |
| **Risk** | 🟡 Medium |

---

### IF-08 — Matrix mode toggle (% / USD) on both matrices
| | |
|---|---|
| **How to verify** | Click "USD" button on the "Spreads al [date]" matrix. Then on the comparison matrix. |
| **Expected result** | Both matrices update to show USD differences instead of %. Values change from small percentages to dollar amounts. `setMatrixMode()` must be on `window`. |
| **Risk** | 🟡 Medium |

---

### IF-09 — Matrix cell click loads spread chart pair
| | |
|---|---|
| **How to verify** | Click a non-diagonal, non-empty cell in the "today" matrix (e.g., CO3 row × CO6 column). |
| **Expected result** | The spread chart in "01 — Spread Histórico" updates to show that specific CO pair. Chart title and formula sub-label update accordingly. |
| **Risk** | 🟡 Medium |

---

### IF-10 — Custom date picker in comparison matrix
| | |
|---|---|
| **How to verify** | Select "Personalizado" in the matrix period options. A date input should appear. Enter a date that exists in `raw.json` (e.g., `2025-01-15`). |
| **Expected result** | The comparison matrix populates with data from that specific date. If the date is a weekend/holiday (no data), verify graceful handling (shows nearest date or stays blank without crashing). |
| **Risk** | 🟡 Medium |

---

### IF-11 — Heatmap pair selector changes displayed pair
| | |
|---|---|
| **How to verify** | Switch to "Heatmap" tab. Change the "Par" dropdown from CO1→CO2 to CO5→CO6. |
| **Expected result** | Table values update to reflect the CO5→CO6 spread. Title updates. `renderHeatmap()` must be on `window`. |
| **Risk** | 🟡 Medium |

---

### IF-12 — Dated Brent period pills and date range
| | |
|---|---|
| **How to verify** | Switch to "Dated Brent" tab. Click period pills (1M, 3M, 6M, MAX). |
| **Expected result** | Chart updates (even if it only has 2 data points, no crash). `setDbPeriodPill()` on `window`. |
| **Risk** | 🟡 Medium — only 2 entries in `dated-brent.json`; period filtering must not crash when the filtered set is empty. |

---

### IF-13 — Dated Brent matrix comparison period buttons
| | |
|---|---|
| **How to verify** | In "Dated Brent" tab, click each comparison period (1 mes, 2 meses, 3 meses, 6 meses, 1 año). |
| **Expected result** | Comparison matrix updates. With only 2 entries in `dated_brent.json`, most periods will show no data — this is expected, but should not throw a JavaScript error. |
| **Risk** | 🟡 Medium |

---

## 3. Error / Edge Case Tests

> These tests simulate failures. Use DevTools → Network → right-click a request to block it, or temporarily rename JSON files.

---

### EC-01 — `raw.json` returns HTTP 404
| | |
|---|---|
| **How to verify** | In DevTools Network tab, right-click `raw.json` request → "Block request URL". Reload the page. |
| **Expected result** | Loading overlay is replaced by a visible error message (not a blank page). No uncaught exception. Error message should indicate data failed to load. |
| **Risk** | 🔴 High — a 404 that silently crashes leaves the user staring at a spinner forever. |

---

### EC-02 — `dated-brent.json` returns HTTP 404
| | |
|---|---|
| **How to verify** | Block `dated-brent.json` in DevTools Network. Reload. |
| **Expected result** | Same as EC-01 — error message shown, no crash. Both fetches are in a `Promise.all()`, so one failure should reject the whole promise and show the error state. |
| **Risk** | 🔴 High |

---

### EC-03 — `raw.json` returns malformed JSON
| | |
|---|---|
| **How to verify** | Create a temporary `Data/raw.json` with content `[{invalid json}]`. Reload. Restore afterwards. |
| **Expected result** | `JSON.parse` throws; the `catch` block catches it. Error message is displayed. No uncaught exception in console. |
| **Risk** | 🔴 High |

---

### EC-04 — `raw.json` has only 1 entry (no previous day for delta calculation)
| | |
|---|---|
| **How to verify** | Temporarily replace `Data/raw.json` with `[{"Date":"2026-05-08","CO1":80.0,"CO2":79.5,"CO3":79.0,"CO4":78.6,"CO5":78.2,"CO6":77.8,"CO7":77.4,"CO8":77.0,"CO9":76.6,"CO10":76.2}]`. Reload. |
| **Expected result** | KPI cards render with prices but daily change % shows `0.00%` or `—` (not NaN or crash). No divide-by-zero exception. Spread chart renders with a single point or gracefully shows empty. |
| **Risk** | 🔴 High — the KPI delta calculation does `(today - prev) / prev * 100`. If `prev` is undefined, this is `NaN`. |

---

### EC-05 — A CO field is missing from the last entry
| | |
|---|---|
| **How to verify** | Temporarily edit last entry in `raw.json` to remove `"CO5"`. Reload. |
| **Expected result** | The CO5 KPI card shows `—` or `N/A` for price and delta. No JavaScript error propagates. Other 9 cards render normally. |
| **Risk** | 🔴 High — missing fields that aren't null-checked will throw `TypeError: Cannot read properties of undefined`. |

---

### EC-06 — User clicks theme toggle during loading (overlay active)
| | |
|---|---|
| **How to verify** | Throttle Network to "Slow 3G". Reload. While overlay is showing, click the theme toggle button (it's in the `<header>`, which should be behind the overlay). |
| **Expected result** | The click is blocked by the overlay (pointer-events: none on the content behind, or overlay covers the header). No theme switch occurs during loading. After load completes, theme toggle works normally. |
| **Risk** | 🟡 Medium — if the overlay doesn't cover the header, partial-loaded UI state + theme change could produce visual glitches. |

---

### EC-07 — User clicks a tab button during loading
| | |
|---|---|
| **How to verify** | Throttle Network to "Slow 3G". Reload. While overlay shows, click "Heatmap" tab button. |
| **Expected result** | Either the click is blocked by the overlay, or tab switching occurs but shows empty content (not a crash). After load, all tabs should work normally. |
| **Risk** | 🟡 Medium |

---

### EC-08 — `raw.json` contains a date with all CO values as 0
| | |
|---|---|
| **How to verify** | Insert `{"Date":"2025-12-31","CO1":0,"CO2":0,"CO3":0,"CO4":0,"CO5":0,"CO6":0,"CO7":0,"CO8":0,"CO9":0,"CO10":0}` as the last entry in `raw.json`. Reload. |
| **Expected result** | No divide-by-zero crash. Spread formula `CO2/CO1 - 1` with CO1=0 should return `Infinity` or `NaN`. The page must handle this gracefully (show `—` or skip). |
| **Risk** | 🔴 High — this is a critical financial data edge case. |

---

### EC-09 — Network goes offline after page loads
| | |
|---|---|
| **How to verify** | Load page fully. Then in DevTools Network tab, click "Offline" toggle. Interact with the page. |
| **Expected result** | All client-side interactivity works (no re-fetches on user interactions). The page should be fully functional after the initial load — no features should require a second fetch. |
| **Risk** | 🟡 Medium |

---

### EC-10 — Page opened via `file://` protocol
| | |
|---|---|
| **How to verify** | Double-click `Index.html` in File Explorer to open it directly (not via HTTP server). |
| **Expected result** | The `fetch()` calls fail with a CORS/protocol error. The page should display the error message from the catch block — not hang on the loading overlay indefinitely. The error message should indicate that the page requires a web server. |
| **Risk** | 🟡 Medium — likely to happen when a user shares the HTML file directly. |

---

## 4. Data Integrity Tests

> These tests verify that displayed numbers match the actual data in the JSON files.

---

### DI-01 — Spread % formula matches manual calculation
| | |
|---|---|
| **How to verify** | From `raw.json` last entry: CO2=81.05, CO1=999.4 (bad data — use CO3=80.70, CO2=81.05 as a clean pair instead). Calculate manually: `(CO3/CO2 - 1) × 100 = (80.70/81.05 - 1) × 100 = -0.432%`. Set Base=CO2, Largo=CO3 in the spread chart. Read the rightmost value on the chart. |
| **Expected result** | Chart's last data point matches the manual calculation within ±0.01%. |
| **Risk** | 🔴 High — incorrect spread formula is a critical financial calculation error. |

---

### DI-02 — USD spread formula matches manual calculation
| | |
|---|---|
| **How to verify** | Set spread mode to USD. Using CO3 vs CO2: CO3 - CO2 = 80.70 - 81.05 = **-0.35 USD**. Read the last value on the chart. |
| **Expected result** | Last data point shows -0.35 (±0.01). |
| **Risk** | 🔴 High |

---

### DI-03 — KPI price matches raw.json last entry
| | |
|---|---|
| **How to verify** | Read CO2 price in KPI card. Compare to `raw.json` last entry `CO2` field. |
| **Expected result** | KPI CO2 shows **$81.05**. CO3 shows **$80.70**. CO10 shows **$78.30**. |
| **Risk** | 🔴 High — wrong price shown to financial analyst is a critical defect. |

---

### DI-04 — Daily change % calculation for CO2
| | |
|---|---|
| **How to verify** | Find the second-to-last entry in `raw.json` (2026-05-07 or nearest trading day before 2026-05-08). Get `CO2` value. Calculate: `(81.05 / prev_CO2 - 1) × 100`. Compare to KPI card CO2 delta. |
| **Expected result** | KPI CO2 daily % matches manual calculation within ±0.01%. |
| **Risk** | 🔴 High |

---

### DI-05 — Number of KPI cards equals CONTRACTS array length
| | |
|---|---|
| **How to verify** | In DevTools Console, run: `document.querySelectorAll('.kpi-card').length`. |
| **Expected result** | Returns `10`. |
| **Risk** | 🟡 Medium |

---

### DI-06 — "Última actualización" date equals raw.json last Date field
| | |
|---|---|
| **How to verify** | In DevTools Console, run: `document.getElementById('last-date').textContent`. Compare to `Data/raw.json` last entry `Date`. |
| **Expected result** | Value equals `"2026-05-08"` (or formatted version). |
| **Risk** | 🟡 Medium |

---

### DI-07 — Roll statistics (stat-strip) use correct adjacent pairs
| | |
|---|---|
| **How to verify** | For CO2 vs CO1 spread, inspect the stat strip below the chart. Look for min, max, average values. Manually calculate the average from `raw.json` data for CO2/CO1-1. |
| **Expected result** | Values are consistent with the dataset. No NaN in stat strip. |
| **Risk** | 🟡 Medium |

---

### DI-08 — Heatmap monthly average matches raw data
| | |
|---|---|
| **How to verify** | From the heatmap, read the April 2026 CO1→CO2 cell value. In DevTools Console, filter `raw.json` data for 2026-04-* dates and compute average `(CO2/CO1 - 1) × 100` manually. |
| **Expected result** | Heatmap value matches manual calculation within ±0.01%. **Note:** CO1=999.4 for May 2026 will distort calculations — this is a known data issue. |
| **Risk** | 🔴 High |

---

### DI-09 — CO1 = 999.4 anomaly flagged ⚠️
| | |
|---|---|
| **How to verify** | Check `Data/raw.json` last entry. `CO1` is `999.4` while CO2–CO10 are in the 78–81 range. This is **not** a realistic Brent price. |
| **Expected result** | This is a **data quality issue to report to Rodri**. The refactored code must not silently accept or hide outlier values. Ideally, the page should warn when a value is implausibly outside range (e.g., > 200 for Brent). After the refactor is complete, this entry should be corrected in `raw.json`. |
| **Risk** | 🔴 High — CO1=999.4 breaks CO1 KPI delta, all CO1-based spread charts, and heatmap calculations for any row using CO1. |

---

## 5. Compatibility / Environment Tests

---

### CE-01 — Works in Chrome (latest)
| | |
|---|---|
| **How to verify** | Run full happy-path test suite in Google Chrome. |
| **Expected result** | All features work. No browser-specific errors. |
| **Risk** | 🟢 Low — Chart.js 4.4.1 + modern fetch are well-supported in Chrome. |

---

### CE-02 — Works in Firefox (latest)
| | |
|---|---|
| **How to verify** | Open `http://localhost:8080/Index.html` in Firefox. Run HP-01 through HP-13. |
| **Expected result** | All features work. Check for CSS variable rendering differences. Date input styling may differ. |
| **Risk** | 🟡 Medium — date inputs behave differently in Firefox. |

---

### CE-03 — Works in Edge (latest)
| | |
|---|---|
| **How to verify** | Open in Microsoft Edge. Run HP-01 through HP-13. |
| **Expected result** | All features work. |
| **Risk** | 🟢 Low — Edge is Chromium-based. |

---

### CE-04 — Azure Static Web App deployment (same-origin fetch)
| | |
|---|---|
| **How to verify** | After deployment to Azure Static Web Apps, open the production URL. Check Network tab — `raw.json` and `dated-brent.json` should be fetched from the same origin (no CORS headers needed). |
| **Expected result** | Both JSON files load with HTTP 200. No CORS errors in console. Page loads fully. |
| **Risk** | 🔴 High — if JSON files are not included in the deployment package, this will fail in production even if it works locally. |

---

### CE-05 — `file://` protocol fails gracefully
| | |
|---|---|
| **How to verify** | Double-click `Index.html` directly from File Explorer (no HTTP server). |
| **Expected result** | Error is caught and displayed. Loading overlay is replaced by an error state — not an infinite spinner. Consider adding a specific message: "Este archivo debe ser servido desde un servidor web." |
| **Risk** | 🟡 Medium |

---

### CE-06 — Responsive layout at mobile viewport (375px)
| | |
|---|---|
| **How to verify** | In DevTools, set device emulation to iPhone SE (375×667). Reload page. |
| **Expected result** | KPI cards reflow to 3 or 2 columns (CSS breakpoints at 782px→4col, 787px→3col per stylesheet). Charts remain visible and readable. No horizontal scroll on main content. |
| **Risk** | 🟡 Medium |

---

### CE-07 — Responsive layout at tablet viewport (768px)
| | |
|---|---|
| **How to verify** | Set DevTools device to iPad (768×1024). Reload page. |
| **Expected result** | Layout adapts. KPI row shows 4+ columns. Controls don't overflow. |
| **Risk** | 🟢 Low |

---

## 6. Accessibility Tests

---

### AC-01 — Loading overlay is screen-reader announced
| | |
|---|---|
| **How to verify** | Inspect the loading overlay HTML (DevTools Elements). Check for `aria-live="polite"` or `aria-label` on the overlay container. |
| **Expected result** | The overlay element has either `role="status"` + `aria-live="polite"` or `aria-label="Cargando datos..."`. Screen reader users are informed the page is loading. |
| **Risk** | 🟡 Medium — WCAG 2.1 AA requires dynamic content changes to be announced. |

---

### AC-02 — Error message is screen-reader accessible
| | |
|---|---|
| **How to verify** | Trigger EC-01 (block `raw.json`). Inspect the error message element in DevTools. |
| **Expected result** | Error message element has `role="alert"` or `aria-live="assertive"` so screen readers announce it immediately. |
| **Risk** | 🟡 Medium |

---

### AC-03 — Keyboard navigation after load
| | |
|---|---|
| **How to verify** | After page loads, press Tab repeatedly from the top of the page. Verify focus moves through interactive elements in a logical order. |
| **Expected result** | Tab order goes: theme toggle → tab bar buttons → selects/inputs → period pills. All interactive elements are reachable by keyboard. Focused elements have a visible focus ring. |
| **Risk** | 🟡 Medium |

---

### AC-04 — Theme toggle button has accessible label
| | |
|---|---|
| **How to verify** | Inspect `<button id="theme-toggle">` in DevTools. |
| **Expected result** | Has `aria-label="Cambiar tema"` (already present in source). Screen reader announces "Cambiar tema, button". |
| **Risk** | 🟢 Low — already implemented in current HTML. Verify it isn't removed during refactor. |

---

### AC-05 — Color is not the only indicator in KPI cards
| | |
|---|---|
| **How to verify** | Inspect KPI cards for positive/negative daily change. Look at the `.kpi-var` element — it uses `.pos` (green) or `.neg` (red) classes. Check if a `+` or `-` sign is present in the text. |
| **Expected result** | The sign (`+` or `-`) accompanies the color change. Color-blind users can distinguish positive from negative without relying solely on green/red. |
| **Risk** | 🟡 Medium — WCAG 1.4.1: Color is not used as the only visual means of conveying information. |

---

### AC-06 — Heatmap color scale has text values (not color-only)
| | |
|---|---|
| **How to verify** | Inspect the heatmap table cells. Each cell should contain a numeric value (e.g., `-0.94`). |
| **Expected result** | Numeric values are visible in each cell, so the information isn't lost for color-blind or low-vision users. (Already present in current implementation — verify not removed by refactor.) |
| **Risk** | 🟡 Medium |

---

## 7. Post-Refactor Regression Tests

> Run these specifically after Nico applies the refactor, to confirm nothing broke that was working before.

---

### RG-01 — All `window.*` function assignments verified
| | |
|---|---|
| **How to verify** | After page loads, open DevTools Console and run: `['toggleTheme','switchTab','setSpreadMode','setPeriodPill','onDateRangeChange','setMatrixMode','setMx2Period','onMx2CustomDate','renderHeatmap','setDbMode','setDbPeriodPill','onDbDateRangeChange','setDbMatrixMode','setDbMx2Period','onDbMx2CustomDate'].filter(fn => typeof window[fn] !== 'function')` |
| **Expected result** | Returns an empty array `[]`. Any function in the list means that `onclick` handler will fail silently. |
| **Risk** | 🔴 High — all `onclick=` attributes in HTML call global functions; after wrapping in `initApp`, these must be explicitly assigned to `window`. |

---

### RG-02 — No inline `const RAW` or `const DATED_BRENT` remain
| | |
|---|---|
| **How to verify** | Open DevTools Sources → `Index.html`. Search (Ctrl+F) for `const RAW` and `const DATED_BRENT`. |
| **Expected result** | Neither string found in the page source. The data is no longer inline. |
| **Risk** | 🟡 Medium — if both the inline data and the fetch remain, the page might work but send unnecessary data over the wire and confuse future maintainers. |

---

### RG-03 — `initApp` is not exposed on `window`
| | |
|---|---|
| **How to verify** | In DevTools Console, type `window.initApp`. |
| **Expected result** | Returns `undefined`. `initApp` is a private bootstrapping function — it should not be callable from outside. |
| **Risk** | 🟢 Low — minor encapsulation concern. |

---

### RG-04 — Page title and header text unchanged after refactor
| | |
|---|---|
| **How to verify** | Check `<title>` tag and header `div.logo-title` text. |
| **Expected result** | Title: "Monitor de Spreads -— Análisis de Futuros". Header: "Monitor de Spreads". Subtitle: "CO1 · CO2 · CO3 · CO4 · CO5 · CO6 · CO7 · CO8 · CO9 · CO10". |
| **Risk** | 🟢 Low |

---

## Summary Table

| Category | # Tests | High Risk | Medium Risk | Low Risk |
|---|---|---|---|---|
| Happy Path | 13 | 7 | 6 | 0 |
| Interactive Features | 13 | 1 | 12 | 0 |
| Error / Edge Cases | 10 | 5 | 5 | 0 |
| Data Integrity | 9 | 6 | 3 | 0 |
| Compatibility | 7 | 1 | 3 | 3 |
| Accessibility | 6 | 0 | 5 | 1 |
| Post-Refactor Regression | 4 | 1 | 1 | 2 |
| **TOTAL** | **62** | **21** | **35** | **6** |

---

## ⚠️ Critical Issues Found During Checklist Review

These are pre-existing issues that the refactor must not hide or worsen:

1. **`Data/raw.json` last entry — `CO1 = 999.4`** (DI-09): Not a valid Brent price. Will distort CO1 KPI card, all CO1-based spreads, and heatmap calculations. Must be corrected in the data pipeline (Rodri's domain).

2. **`Data/dated_brent.json` has only 2 entries** (HP-12, IF-12, IF-13): Dated Brent tab will be nearly useless in testing. All period pills except MAX will likely return empty sets. Rodri needs to confirm this is expected or populate the file properly.

3. **Heatmap `<tbody>` is currently hardcoded HTML** (HP-11): If the refactor moves heatmap rendering into `initApp()`, the static HTML will be overwritten correctly. If `initApp()` re-renders the heatmap from JSON data, the heatmap must be tested to verify it produces the same values as the hardcoded version.

---

*Foden — "I'm not trying to break your work. I'm trying to make sure users can't."*
