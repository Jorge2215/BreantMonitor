# Decision: Editor Page CSS Fix — 2026-05-10

**Author:** Nico (Frontend Dev)  
**Date:** 2026-05-10  
**Commit:** 66edcc4

## Root Cause

When Foden externalized the editor's `<style>` block into `Editor.css`, another refactor was already in progress (or recently done) that renamed `styles.css` → `Index.css` and `script.js` → `Index.js` for naming consistency with `Index.html`. Those renames were present on disk but **never committed**.

`editor.html` linked to `styles.css` — which no longer existed on disk — causing the entire editor page to render unstyled (white page). `Editor.css` references CSS custom properties (`--surface`, `--accent`, `--border`, etc.) that are defined in the shared base stylesheet. Without that base stylesheet loading, all tokens were `undefined` and the layout collapsed.

## What Was Fixed

1. `editor.html` `<link>`: `styles.css` → `Index.css`  
2. Committed the previously unstaged renames:
   - `styles.css` → `Index.css` (100% identical content)
   - `script.js` → `Index.js` (100% identical content)
   - `Index.html` updated references (already modified, unstaged)

## Rule Going Forward

**When renaming a shared CSS or JS file, search ALL HTML files in the repo for references before committing.** A single missed reference causes a silent white-page failure on Azure Static Web Apps (which is case-sensitive and serves missing files as 404 with no fallback).

Suggested check before any shared file rename:
```powershell
Select-String -Path "*.html" -Pattern "styles.css"
```
