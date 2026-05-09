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
