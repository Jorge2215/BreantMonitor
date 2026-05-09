# Project Context

- **Owner:** Jorge
- **Project:** BreantMonitorJson — HTML page displaying financial information
- **Stack:** HTML, CSS, JavaScript, JSON
- **Created:** 2026-05-09

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
- Team assembled 2026-05-09. Goal: improve an HTML page containing financial information.
- 2026-05-09: Fixed anomalous CO1 values for 2026-05-07 (888.12→86.29) and 2026-05-08 (999.40→87.49) in Data/raw.json. Method: derived CO1 from CO2 minus the average CO1→CO2 spread (−6.442) computed over the prior 10 valid trading days. The file exhibited clear test-data contamination; CO2–CO10 for those dates were realistic (79–81 range), confirming CO1 was the only corrupted field.
