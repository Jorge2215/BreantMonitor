# Azure Static Web App — Brent Monitor Deployment Plan

**Author:** Haaland (Lead)  
**Date:** 2026-05-09  
**Status:** Ready for Jorge to execute

---

## 1. Repository Structure

The repo is already clean. No restructuring needed.

```
BreantMonitorJson/
├── Index.html              ← 75 KB — entry point
├── Data/
│   ├── raw.json            ← 307 KB — CO1–CO10 futures history
│   └── dated-brent.json   ← 73 KB — Dated Brent spot prices
├── staticwebapp.config.json  ← CREATE THIS (section 2)
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml  ← CREATE THIS (section 5)
└── .gitignore
```

### .gitignore concern — JSON files

The current `.gitignore` does **not** exclude `Data/*.json`. Those files are tracked and will be committed and deployed. **This is correct.** No change needed.

File sizes are well within Azure Static Web App limits:
- Free tier max: 250 MB total storage
- Per-file: no hard limit below 100 MB (Azure CDN limit)
- Largest file: `raw.json` at 307 KB — not a concern

---

## 2. Azure Static Web App Config (`staticwebapp.config.json`)

Create this file at the **repo root** (same level as `Index.html`):

```json
{
  "routes": [
    {
      "route": "/Data/*.json",
      "headers": {
        "Cache-Control": "public, max-age=3600, must-revalidate",
        "Content-Type": "application/json; charset=utf-8"
      }
    },
    {
      "route": "/*",
      "headers": {
        "Cache-Control": "public, max-age=600, must-revalidate"
      }
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/Index.html",
      "statusCode": 200
    }
  },
  "mimeTypes": {
    ".json": "application/json"
  }
}
```

### Rationale per field

| Setting | Why |
|---|---|
| `Cache-Control: max-age=3600` on JSON | Data updates periodically — 1-hour cache is a reasonable balance. Adjust to `max-age=300` (5 min) if data refreshes more frequently. |
| `Content-Type: application/json` on JSON | Azure serves `.json` as `application/json` by default, but the `mimeTypes` block plus explicit header makes it bullet-proof. |
| `Cache-Control: max-age=600` on `/*` | HTML/JS assets get a 10-min cache. Short enough to pick up updates quickly. |
| `404 rewrite → /Index.html` | Standard SPA fallback. Not strictly needed for a single HTML file, but prevents Azure's generic 404 page if someone hits an undefined route. |
| **No CORS rules** | `fetch('Data/raw.json')` is a same-origin relative request. The Azure SWA URL is the same origin for both HTML and JSON. CORS is not needed. |

---

## 3. Deployment Method — Recommendation

### Decision: Option A — GitHub Actions CI/CD ✅ RECOMMENDED

**Reason:** The repo already has a `.github/workflows/` directory with active squad workflows. Adding an Azure deploy workflow is zero friction. Every push to `main` auto-deploys — Jorge never runs a manual command after initial setup.

### Option B (Manual) — Not recommended for this project
`az staticwebapp` CLI upload is a one-shot deploy with no CI/CD. Every time `raw.json` or `Index.html` changes, Jorge must manually re-run the command. Maintenance burden is higher with no benefit.

---

## 4. Pre-Deploy Checklist

Jorge must complete these before running deploy commands:

- [ ] **Azure subscription active** — verify with `az account show`
- [ ] **Azure CLI installed** — `az --version` (need 2.40+)
- [ ] **Logged into Azure** — `az login`
- [ ] **GitHub repo is public OR Azure has repo access** — Azure SWA GitHub integration requires repo access; if private, grant it via Azure Portal during resource creation
- [ ] **`staticwebapp.config.json` committed to `main`** — must be in the repo before deploy
- [ ] **`Index.html` at repo root** — confirmed ✅
- [ ] **`Data/` directory committed** — confirmed ✅ (both JSON files tracked)

---

## 5. Deploy Commands — Exact Steps

### Step 1 — Create Azure Resource Group and Static Web App

```bash
# Set your variables
RESOURCE_GROUP="rg-brentmonitor"
APP_NAME="brentmonitor"
LOCATION="eastus2"
GITHUB_REPO_URL="https://github.com/YOUR_GITHUB_USERNAME/BreantMonitorJson"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create the Static Web App (this also sets up GitHub Actions automatically)
az staticwebapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --source $GITHUB_REPO_URL \
  --location $LOCATION \
  --branch main \
  --app-location "/" \
  --output-location "" \
  --login-with-github
```

> `--login-with-github` opens a browser for GitHub OAuth. Azure will automatically:
> - Generate a deployment token
> - Add the token as a GitHub Actions secret (`AZURE_STATIC_WEB_APPS_API_TOKEN_...`)
> - Create the GitHub Actions workflow file in your repo

### Step 2 — Create the GitHub Actions Workflow (if not auto-generated)

If `az staticwebapp create` did not create the workflow, create it manually:

```bash
# Get the deployment token
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiKey" -o tsv)

echo "Deployment token: $DEPLOY_TOKEN"
# Copy this token → GitHub repo → Settings → Secrets → Actions → New secret
# Name it: AZURE_STATIC_WEB_APPS_API_TOKEN
```

Then create `.github/workflows/azure-static-web-apps.yml`:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
          lfs: false

      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          output_location: ""
          skip_app_build: true

  close_pull_request_job:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request Job
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
```

> **Key settings:** `app_location: "/"` (repo root), `output_location: ""` (no build output dir), `skip_app_build: true` (no npm/webpack — pure static files).

### Step 3 — Commit and Push

```bash
git add staticwebapp.config.json .github/workflows/azure-static-web-apps.yml
git commit -m "Add Azure Static Web App deployment config

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push origin main
```

The push triggers the GitHub Actions workflow. Deploy completes in ~2 minutes.

### Step 4 — Get the Live URL

```bash
az staticwebapp show \
  --name brentmonitor \
  --resource-group rg-brentmonitor \
  --query "defaultHostname" -o tsv
```

Output will be something like: `brentmonitor.azurestaticapps.net`

---

## 6. Post-Deploy Verification

Replace `YOUR_APP_URL` with the actual hostname from Step 4.

### Quick smoke test (browser)

1. Open `https://YOUR_APP_URL.azurestaticapps.net` — page should load
2. Open browser DevTools → Network tab → Reload
3. Verify:
   - `Index.html` → 200, `text/html`
   - `Data/raw.json` → 200, `application/json`
   - `Data/dated-brent.json` → 200, `application/json`
4. Check KPI cards and charts render (CO1–CO10 spreads visible)
5. No console errors

### CLI verification

```bash
# Test the HTML loads
curl -I "https://YOUR_APP_URL.azurestaticapps.net/"

# Test JSON files are served with correct Content-Type
curl -I "https://YOUR_APP_URL.azurestaticapps.net/Data/raw.json"
# Expect: Content-Type: application/json

curl -I "https://YOUR_APP_URL.azurestaticapps.net/Data/dated-brent.json"
# Expect: Content-Type: application/json

# Check Cache-Control headers on JSON
curl -sI "https://YOUR_APP_URL.azurestaticapps.net/Data/raw.json" | grep -i cache-control
# Expect: Cache-Control: public, max-age=3600, must-revalidate

# Spot-check data integrity — first entry
curl -s "https://YOUR_APP_URL.azurestaticapps.net/Data/raw.json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0])"
```

### Functional verification

- CO1–CO10 spread table renders ✅
- Historical chart (if present) shows 1,382 data points ✅
- Dated Brent section shows 1,345 entries ✅
- No CORS errors in console ✅ (same-origin, should be clean)

---

## 7. Risk Flags

### Risk 1 — File sizes (LOW RISK ✅)

| File | Size | Azure SWA Limit | Status |
|---|---|---|---|
| `raw.json` | 307 KB | ~100 MB per file | ✅ No issue |
| `dated-brent.json` | 73 KB | ~100 MB per file | ✅ No issue |
| `Index.html` | 75 KB | ~100 MB per file | ✅ No issue |

Azure Static Web Apps has a **250 MB total storage** limit on the free tier (Sku: Free). Total deploy is ~455 KB — well within limits.

### Risk 2 — fetch() same-origin on Azure URL (NO RISK ✅)

`Index.html` fetches `Data/raw.json` and `Data/dated-brent.json` as relative paths. On Azure, all three files are served from `https://YOUR_APP.azurestaticapps.net`. The fetch calls resolve to `https://YOUR_APP.azurestaticapps.net/Data/raw.json` — same origin, same protocol, no CORS issues.

### Risk 3 — MIME type for .json (LOW RISK, MITIGATED ✅)

Azure Static Web Apps serves `.json` as `application/json` by default in most configurations, but behavior can vary by region or CDN edge node. The `staticwebapp.config.json` we create explicitly sets `mimeTypes: { ".json": "application/json" }` AND a `Content-Type` header override on the `/Data/*.json` route. Double coverage eliminates this risk.

### Risk 4 — GitHub Actions secret not set (MEDIUM RISK ⚠️)

If `az staticwebapp create --login-with-github` does not auto-inject the secret, the workflow will fail with an auth error. Mitigation: manually get the token (Step 2 above) and add it as `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub repo settings before pushing.

### Risk 5 — Azure Free tier staging environments (LOW RISK ℹ️)

The Azure SWA Free tier supports **preview environments** for pull requests. The squad's existing PR workflows (squad-triage, squad-heartbeat) may trigger the Azure deploy workflow on PRs. This is fine — Azure SWA creates isolated preview URLs per PR, which is actually useful. No action needed, but Jorge should be aware.

### Risk 6 — Data staleness (ONGOING CONCERN ⚠️)

`raw.json` and `dated-brent.json` are static files committed to the repo. When new Brent data comes in, someone must update the JSON files and push to `main`. There is no automated data ingestion. The Cache-Control of `max-age=3600` means users may see up to 1-hour stale data after a new deploy — acceptable for daily-updated financial data, but document this for Jorge.

---

## Summary

| Step | Action | Owner |
|---|---|---|
| 1 | Create `staticwebapp.config.json` at repo root | Jorge |
| 2 | `az group create` + `az staticwebapp create` | Jorge |
| 3 | Verify GitHub Actions secret is set | Jorge |
| 4 | Create workflow YAML if not auto-generated | Jorge |
| 5 | `git push origin main` | Jorge |
| 6 | Confirm live URL with `az staticwebapp show` | Jorge |
| 7 | Run curl smoke tests | Jorge |
