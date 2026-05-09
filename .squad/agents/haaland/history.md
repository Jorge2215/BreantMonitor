# Project Context

- **Owner:** Jorge
- **Project:** BreantMonitorJson — HTML page displaying financial information
- **Stack:** HTML, CSS, JavaScript, JSON
- **Created:** 2026-05-09

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
- Team assembled 2026-05-09. Goal: improve an HTML page containing financial information.

### 2026-05-09 — Azure Static Web App Deployment Design

- **Deployment architecture chosen:** GitHub Actions CI/CD via `Azure/static-web-apps-deploy@v1`. Repo already has `.github/workflows/` so friction is zero. Every push to `main` auto-deploys.
- **No build step:** `skip_app_build: true`, `app_location: "/"`, `output_location: ""`. Pure static HTML/JSON — no npm or webpack.
- **`staticwebapp.config.json` created at repo root** with: explicit `mimeTypes` for `.json`, `Cache-Control: max-age=3600` on `Data/*.json`, `Cache-Control: max-age=600` on all other routes, 404 rewrite to `Index.html`.
- **No CORS needed:** `fetch('Data/raw.json')` is a relative same-origin call. Azure serves HTML and JSON from the same hostname.
- **File sizes are safe:** `raw.json` (307 KB), `dated-brent.json` (73 KB), `Index.html` (75 KB) — total ~455 KB, well under the 250 MB Free tier limit.
- **Key risk identified:** Data staleness. JSON files are static in the repo. When Brent data updates, Jorge must commit new JSON and push to `main` to trigger a redeploy.
- **Plan document:** `.squad/agents/haaland/deployment-plan.md`
- **Decision proposals:** `.squad/decisions/inbox/haaland-deployment-arch.md` (3 decisions: CI/CD method, config file, no build step)

### 2026-05-09 — Proposal promoted
- Proposal file `.squad/decisions/inbox/haaland-deployment-arch.md` promoted to `.squad/decisions/decisions.md` by Scribe on 2026-05-09.
