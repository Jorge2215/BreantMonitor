/* ============================================================
   editor.js — Data Editor for BreantMonitor
   Handles: theme, GitHub API, CRUD, validation, table rendering
   Architecture: browser-side REST calls — no backend required
   ============================================================ */

'use strict';

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const GITHUB_REPO   = 'Jorge2215/BreantMonitor';
const GITHUB_BRANCH = 'main';
const GITHUB_API    = 'https://api.github.com';

/** File paths relative to the repo root */
const FILES = {
  raw:   'Data/raw.json',
  dated: 'Data/dated-brent.json',
};

/** Column definitions for each tab (Date is always first) */
const COLUMNS = {
  raw:   ['Date', 'CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6', 'CO7', 'CO8', 'CO9', 'CO10'],
  dated: ['Date', 'DB'],
};

const PAGE_SIZE = 100; // Rows per page — keeps rendering fast for 500+ row datasets

// ── THEME ─────────────────────────────────────────────────────────────────────
// Theme state is shared with Index.html via localStorage key 'theme'.
// Apply immediately to avoid flash of wrong theme before DOM is ready.

const _savedTheme = localStorage.getItem('theme');
if (_savedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');

let darkMode = !document.documentElement.hasAttribute('data-theme');

/** Called by the theme-toggle button (onclick="toggleTheme()"). */
function toggleTheme() {
  darkMode = !darkMode;
  if (darkMode) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }
  _updateThemeUI();
}

function _updateThemeUI() {
  const label = document.getElementById('theme-label');
  const icon  = document.getElementById('theme-icon');
  if (!label || !icon) return;
  if (darkMode) {
    label.textContent = 'Claro';
    icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  } else {
    label.textContent = 'Oscuro';
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

// ── STATE ─────────────────────────────────────────────────────────────────────

/**
 * Internal row ID counter.
 * Each row gets a unique _id for stable identity across renders
 * (the _id is never written to the JSON files).
 */
let _idCounter = 0;
function _newId() { return ++_idCounter; }

const state = {
  raw: {
    data:       [],    // Array of row objects, each with a _id field
    sha:        null,  // Current file SHA from GitHub (required for PUT)
    dirty:      false, // True when local data differs from what was last loaded
    editingId:  null,  // _id of the row currently in edit mode (null = none)
    filterFrom: '',    // Date filter: lower bound (YYYY-MM-DD or empty)
    filterTo:   '',    // Date filter: upper bound (YYYY-MM-DD or empty)
    page:       0,     // Current page index (0-based)
  },
  dated: {
    data:       [],
    sha:        null,
    dirty:      false,
    editingId:  null,
    filterFrom: '',
    filterTo:   '',
    page:       0,
  },
};

// ── TOKEN MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * Returns the stored Personal Access Token, or null.
 * Stored in sessionStorage — automatically cleared when the tab is closed.
 * Never persisted to localStorage or cookies.
 */
function getToken() { return sessionStorage.getItem('gh_pat') || null; }

/** Called by the "Conectar" button. Verifies the PAT against GitHub API. */
async function connectToken() {
  const input = document.getElementById('token-input');
  const token = input.value.trim();
  if (!token) { showStatus('⚠️ Ingresá un token antes de conectar', 'warning'); return; }

  _setTokenStatus('verifying');
  try {
    const user = await _ghGetUser(token);
    sessionStorage.setItem('gh_pat', token);
    input.value = ''; // Clear immediately — never keep a PAT visible
    _setTokenStatus('connected', user.login);
    showStatus(`🟢 Conectado como @${user.login} — cargando datos…`, 'success');
    // Load both files in parallel
    await Promise.all([loadFromGitHub('raw'), loadFromGitHub('dated')]);
  } catch (err) {
    _setTokenStatus('disconnected');
    showStatus(`❌ Error de conexión: ${err.message}`, 'error');
  }
}

/**
 * On page load, checks for an existing sessionStorage token and re-verifies it.
 * If valid, loads both data files. If invalid, clears the stored token.
 */
async function _verifyStoredToken() {
  const token = getToken();
  if (!token) return;
  _setTokenStatus('verifying');
  try {
    const user = await _ghGetUser(token);
    _setTokenStatus('connected', user.login);
    showStatus(`🟢 Sesión restaurada — @${user.login} — cargando datos…`, 'success');
    await Promise.all([loadFromGitHub('raw'), loadFromGitHub('dated')]);
  } catch {
    sessionStorage.removeItem('gh_pat');
    _setTokenStatus('disconnected');
    showStatus('⚠️ Sesión expirada — ingresá tu token nuevamente', 'warning');
  }
}

async function _ghGetUser(token) {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`HTTP ${res.status}: ${body.message || 'Token inválido o sin permisos'}`);
  }
  return res.json();
}

function _setTokenStatus(statusKey, username = '') {
  const el = document.getElementById('token-status');
  if (!el) return;
  switch (statusKey) {
    case 'verifying':
      el.textContent = '🟡 Verificando…';
      el.style.color = '';
      break;
    case 'connected':
      el.textContent = `🟢 Conectado — @${username}`;
      el.style.color = 'var(--pos)';
      break;
    case 'disconnected':
    default:
      el.textContent = '🔴 No conectado';
      el.style.color = '';
      break;
  }
}

// ── GITHUB API HELPERS ────────────────────────────────────────────────────────

/**
 * Fetches a file from GitHub and returns its decoded JSON content and current SHA.
 * The SHA is required for all subsequent PUT (update) calls — GitHub uses it to
 * detect concurrent edits and prevent accidental overwrites.
 *
 * @param {string} path  - File path in repo (e.g. 'Data/raw.json')
 * @returns {{ content: Array, sha: string }}
 */
async function ghFetchFile(path) {
  const token = getToken();
  if (!token) throw new Error('No hay token — conectá primero');

  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`GitHub API ${res.status}: ${body.message || res.statusText}`);
  }

  const file = await res.json();
  // GitHub returns content as base64 with embedded \n — strip them before decoding.
  // All data is ASCII (dates + numbers), so atob is safe here.
  const json    = atob(file.content.replace(/\n/g, ''));
  const content = JSON.parse(json);
  return { content, sha: file.sha };
}

/**
 * Commits updated JSON to GitHub via the Contents API (PUT).
 * Content must be base64-encoded. The current file SHA prevents overwrite conflicts.
 * Commit message follows the project's chore: convention.
 *
 * @param {string} path     - File path in repo
 * @param {Array}  jsonData - Data array to save
 * @param {string} sha      - Current file SHA (from ghFetchFile)
 * @param {string} message  - Commit message
 * @returns {string}        - New commit SHA
 */
async function ghCommitFile(path, jsonData, sha, message) {
  const token = getToken();
  if (!token) throw new Error('No hay token — conectá primero');

  // btoa is safe for ASCII-only content (dates and numbers)
  const b64 = btoa(JSON.stringify(jsonData, null, 2));

  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization:  `Bearer ${token}`,
      Accept:         'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, content: b64, sha, branch: GITHUB_BRANCH }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`GitHub API ${res.status}: ${body.message || res.statusText}`);
  }

  const result = await res.json();
  return result.commit.sha;
}

// ── DATA LOADING ──────────────────────────────────────────────────────────────

async function loadFromGitHub(tab) {
  showStatus(`🔄 Cargando ${FILES[tab]}…`, 'info');
  try {
    const { content, sha } = await ghFetchFile(FILES[tab]);
    // Assign a stable _id to each row for identity tracking across renders
    state[tab].data      = content.map(row => ({ ...row, _id: _newId() }));
    state[tab].sha       = sha;
    state[tab].dirty     = false;
    state[tab].editingId = null;
    state[tab].page      = 0;
    _updateDirtyBadge(tab);
    renderTable(tab);
    showStatus(`✅ ${FILES[tab]} — ${content.length} filas cargadas`, 'success');
  } catch (err) {
    showStatus(`❌ Error al cargar ${FILES[tab]}: ${err.message}`, 'error');
  }
}

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────

/** Called by the tab bar buttons (onclick="switchEditorTab('raw', this)"). */
function switchEditorTab(tab, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  btn.classList.add('active');
}

// ── FILTER ────────────────────────────────────────────────────────────────────

/** Called by filter date inputs (onchange="applyFilter('raw')"). */
function applyFilter(tab) {
  state[tab].filterFrom = document.getElementById(`${tab}-filter-from`).value || '';
  state[tab].filterTo   = document.getElementById(`${tab}-filter-to`).value   || '';
  state[tab].page = 0; // Reset to first page when filter changes
  renderTable(tab);
}

// ── TABLE RENDERING ───────────────────────────────────────────────────────────

/**
 * Returns the filtered + sorted (DESC by Date) display view for the given tab.
 * Rows without a date (new rows not yet filled in) are always placed first.
 * The row currently in edit mode always passes the date filter to stay visible.
 */
function _getDisplayData(tab) {
  const { data, filterFrom, filterTo, editingId } = state[tab];
  let rows = [...data];

  if (filterFrom || filterTo) {
    rows = rows.filter(row => {
      // New rows and the editing row always pass the filter
      if (!row.Date || row._id === editingId) return true;
      if (filterFrom && row.Date < filterFrom) return false;
      if (filterTo   && row.Date > filterTo)   return false;
      return true;
    });
  }

  // Sort DESC: empty-date rows float to top; the rest newest-first
  rows.sort((a, b) => {
    if (!a.Date && !b.Date) return 0;
    if (!a.Date) return -1;
    if (!b.Date) return 1;
    return b.Date.localeCompare(a.Date);
  });

  return rows;
}

/**
 * Renders the data table for the given tab using a DocumentFragment for efficiency.
 * This approach handles 500+ rows per page without freezing by minimising reflows.
 * Uses event delegation (set up once in _setupTableDelegation) for all row actions.
 */
function renderTable(tab) {
  const cols  = COLUMNS[tab];
  const tbody = document.getElementById(`${tab}-tbody`);
  if (!tbody) return;

  const allDisplay = _getDisplayData(tab);
  const total      = allDisplay.length;
  const page       = state[tab].page;
  const start      = page * PAGE_SIZE;
  const end        = Math.min(start + PAGE_SIZE, total);
  const pageData   = allDisplay.slice(start, end);
  const editId     = state[tab].editingId;

  // Build all rows into a fragment before touching the DOM — one reflow
  const frag = document.createDocumentFragment();

  for (const row of pageData) {
    const tr        = document.createElement('tr');
    const isEditing = row._id === editId;
    tr.dataset.id   = row._id;

    if (isEditing) tr.classList.add('editing-row');
    if (row.isNew)  tr.classList.add('new-row');

    if (isEditing) {
      // ── EDIT MODE: input cells ────────────────────────────────────────────
      for (const col of cols) {
        const td    = document.createElement('td');
        const input = document.createElement('input');
        input.type        = col === 'Date' ? 'date' : 'number';
        input.className   = `cell-input${col === 'Date' ? ' date-input' : ''}`;
        input.dataset.col = col;
        input.value       = (row[col] !== undefined && row[col] !== null) ? row[col] : '';
        if (col !== 'Date') { input.step = '0.01'; }
        td.appendChild(input);
        tr.appendChild(td);
      }
      // Save / Cancel buttons
      const actTd = document.createElement('td');
      actTd.innerHTML = `<div class="actions-cell">
        <button class="btn-row save" data-action="save-edit">✓ Guardar</button>
        <button class="btn-row"     data-action="cancel-edit">✕ Cancelar</button>
      </div>`;
      tr.appendChild(actTd);

    } else {
      // ── DISPLAY MODE: value cells ─────────────────────────────────────────
      for (const col of cols) {
        const td  = document.createElement('td');
        if (col === 'Date') td.className = 'date-cell';
        const val = row[col];
        td.textContent = (val !== undefined && val !== null && val !== '') ? val : '—';
        tr.appendChild(td);
      }
      // Edit / Delete buttons
      const actTd = document.createElement('td');
      actTd.innerHTML = `<div class="actions-cell">
        <button class="btn-row" data-action="edit">✎ Editar</button>
        <button class="btn-row del" data-action="delete">✕ Borrar</button>
      </div>`;
      tr.appendChild(actTd);
    }

    frag.appendChild(tr);
  }

  tbody.innerHTML = '';  // Single clear
  tbody.appendChild(frag); // Single DOM insert

  _renderPagination(tab, total, page);

  // Row count info label
  const countEl = document.getElementById(`${tab}-row-count`);
  if (countEl) {
    const totalData = state[tab].data.length;
    countEl.textContent = total < totalData
      ? `Mostrando ${total} de ${totalData} filas`
      : `${totalData} ${totalData === 1 ? 'fila' : 'filas'}`;
  }
}

function _renderPagination(tab, total, page) {
  const pag = document.getElementById(`${tab}-pagination`);
  if (!pag) return;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) { pag.innerHTML = ''; return; }

  const prevDis = page === 0              ? 'disabled' : '';
  const nextDis = page >= totalPages - 1  ? 'disabled' : '';
  pag.innerHTML = `
    <button class="btn-page" data-tab="${tab}" data-page="${page - 1}" ${prevDis}>← Anterior</button>
    <span class="page-info">Pág. ${page + 1} / ${totalPages}</span>
    <button class="btn-page" data-tab="${tab}" data-page="${page + 1}" ${nextDis}>Siguiente →</button>
  `;
}

// ── EVENT DELEGATION ─────────────────────────────────────────────────────────
// Single click listener per table body — avoids per-row handler overhead.

function _setupTableDelegation(tab) {
  const tbody = document.getElementById(`${tab}-tbody`);
  if (!tbody) return;

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const tr = btn.closest('tr');
    const id = Number(tr?.dataset.id);
    if (!id) return;

    switch (btn.dataset.action) {
      case 'edit':        _editRow(tab, id);       break;
      case 'delete':      deleteRow(tab, id);      break;
      case 'save-edit':   _saveRow(tab, id, tr);   break;
      case 'cancel-edit': cancelEdit(tab, id);     break;
    }
  });
}

function _setupPaginationDelegation(tab) {
  const pag = document.getElementById(`${tab}-pagination`);
  if (!pag) return;

  pag.addEventListener('click', e => {
    const btn = e.target.closest('.btn-page');
    if (!btn || btn.disabled) return;
    const newPage = parseInt(btn.dataset.page, 10);
    if (!isNaN(newPage) && newPage >= 0) {
      state[tab].page = newPage;
      renderTable(tab);
    }
  });
}

// ── CRUD OPERATIONS ───────────────────────────────────────────────────────────

/**
 * Prepends a new blank row in edit mode to the top of the table.
 * Called by the "+ Agregar Fila" toolbar button.
 */
function addRow(tab) {
  if (state[tab].editingId !== null) {
    showStatus('⚠️ Guardá o cancelá la edición actual antes de agregar una fila nueva', 'warning');
    return;
  }

  const newRow = { _id: _newId(), isNew: true, Date: '' };
  for (const col of COLUMNS[tab]) {
    if (col !== 'Date') newRow[col] = '';
  }

  state[tab].data.unshift(newRow);    // Prepend so it sorts to top in DESC view
  state[tab].editingId = newRow._id;
  state[tab].page      = 0;           // Jump to page 0 so the new row is visible
  renderTable(tab);
}

/** Switches a row from display mode to edit mode. */
function _editRow(tab, id) {
  if (state[tab].editingId !== null && state[tab].editingId !== id) {
    showStatus('⚠️ Guardá o cancelá la edición actual antes de editar otra fila', 'warning');
    return;
  }
  state[tab].editingId = id;
  renderTable(tab);
}

/**
 * Reads inputs from the editing row, validates them, and commits to local state.
 * Numeric values are rounded to 2 decimal places on save.
 */
function _saveRow(tab, id, tr) {
  const cols   = COLUMNS[tab];
  const inputs = tr.querySelectorAll('[data-col]');
  const rowData = {};
  inputs.forEach(inp => { rowData[inp.dataset.col] = inp.value.trim(); });

  const { valid, error } = validateRow(rowData, cols);
  if (!valid) {
    // Highlight invalid inputs
    inputs.forEach(inp => {
      inp.classList.toggle('error', !validateField(inp.dataset.col, inp.value.trim()));
    });
    showStatus(`❌ ${error}`, 'error');
    return;
  }

  // Parse and round numerics; preserve _id, strip isNew
  const parsed = { _id: id };
  for (const col of cols) {
    parsed[col] = col === 'Date'
      ? rowData[col]
      : parseFloat(parseFloat(rowData[col]).toFixed(2));
  }

  const idx = state[tab].data.findIndex(r => r._id === id);
  if (idx === -1) return;
  state[tab].data[idx] = parsed; // isNew is intentionally not carried over

  state[tab].editingId = null;
  _markDirty(tab);
  renderTable(tab);
  showStatus('✅ Fila actualizada localmente — guardá en GitHub para persistir', 'info');
}

/**
 * Cancels edit mode.
 * If the row was newly added and never saved (isNew: true), it is removed.
 */
function cancelEdit(tab, id) {
  const idx = state[tab].data.findIndex(r => r._id === id);
  if (idx !== -1 && state[tab].data[idx].isNew) {
    state[tab].data.splice(idx, 1); // Discard the unsaved new row
  }
  state[tab].editingId = null;
  renderTable(tab);
}

/** Removes a row from local data after user confirmation. */
function deleteRow(tab, id) {
  if (!confirm('¿Eliminar esta fila? El cambio es local hasta que guardes en GitHub.')) return;

  const idx = state[tab].data.findIndex(r => r._id === id);
  if (idx === -1) return;
  state[tab].data.splice(idx, 1);
  if (state[tab].editingId === id) state[tab].editingId = null;

  _markDirty(tab);
  renderTable(tab);
  showStatus('✅ Fila eliminada localmente — guardá en GitHub para persistir', 'info');
}

// ── VALIDATION ────────────────────────────────────────────────────────────────

/**
 * Validates a single field value.
 * Date: must match YYYY-MM-DD and be a real calendar date.
 * Numeric: must be a valid, finite number.
 *
 * @param {string} col    - Column name
 * @param {string} value  - Raw string value to validate
 * @returns {boolean}
 */
function validateField(col, value) {
  if (col === 'Date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T12:00:00Z`);
    return !isNaN(d.getTime());
  }
  // Numeric field: must parse to a finite number
  if (value === '' || value === null || value === undefined) return false;
  const n = parseFloat(value);
  return isFinite(n) && !isNaN(n);
}

/**
 * Validates all fields in a row object.
 * Returns the first validation error found, or { valid: true }.
 *
 * @param {Object}   rowData - Map of column name → raw string value
 * @param {string[]} cols    - Ordered list of column names
 * @returns {{ valid: boolean, error: string }}
 */
function validateRow(rowData, cols) {
  for (const col of cols) {
    if (!validateField(col, String(rowData[col] ?? ''))) {
      return {
        valid: false,
        error: col === 'Date'
          ? `Fecha inválida en "${col}" — debe ser una fecha real en formato YYYY-MM-DD`
          : `Valor inválido en "${col}" — debe ser un número válido`,
      };
    }
  }
  return { valid: true, error: '' };
}

// ── DIRTY STATE ───────────────────────────────────────────────────────────────

function _markDirty(tab) {
  state[tab].dirty = true;
  _updateDirtyBadge(tab);
}

function _clearDirty(tab) {
  state[tab].dirty = false;
  _updateDirtyBadge(tab);
}

function _updateDirtyBadge(tab) {
  const badge = document.getElementById(`${tab}-dirty-badge`);
  if (badge) badge.style.display = state[tab].dirty ? 'inline-flex' : 'none';
}

// ── SAVE TO GITHUB ────────────────────────────────────────────────────────────

/**
 * Full save workflow:
 * 1. Check token exists — abort with warning if not.
 * 2. Check data was loaded (sha must be known) — abort if not.
 * 3. Check no row is in edit mode — abort if so.
 * 4. Validate every row in local data — abort on first error.
 * 5. Re-fetch the current file SHA from GitHub (prevents stale-SHA conflicts
 *    when another editor or process has updated the file since we loaded it).
 * 6. Sort data ASC by Date (canonical file order — newest is always last in file).
 * 7. Strip internal _id / isNew fields before encoding.
 * 8. PUT to GitHub Contents API.
 * 9. Re-fetch to capture the new SHA, clear dirty flag, show commit SHA.
 */
async function saveToGitHub(tab) {
  if (!getToken()) {
    showStatus('⚠️ No hay token — conectá con GitHub primero', 'warning');
    return;
  }
  if (!state[tab].sha) {
    showStatus('⚠️ Los datos no han sido cargados desde GitHub — recargá primero', 'warning');
    return;
  }
  if (state[tab].editingId !== null) {
    showStatus('⚠️ Guardá o cancelá la edición actual antes de subir a GitHub', 'warning');
    return;
  }

  // Validate all rows before committing
  const cols = COLUMNS[tab];
  for (const row of state[tab].data) {
    const rowData = {};
    for (const col of cols) rowData[col] = row[col];
    const { valid, error } = validateRow(rowData, cols);
    if (!valid) {
      showStatus(`❌ Datos inválidos — ${error}`, 'error');
      return;
    }
  }

  showStatus('🔄 Guardando en GitHub…', 'info');
  try {
    // Re-fetch current SHA to prevent stale-SHA conflicts
    const current    = await ghFetchFile(FILES[tab]);
    const latestSha  = current.sha;

    // Sort ASC (oldest first — canonical file order), strip internal fields
    const toSave = [...state[tab].data]
      .sort((a, b) => a.Date.localeCompare(b.Date))
      // eslint-disable-next-line no-unused-vars
      .map(({ _id, isNew, ...clean }) => clean);

    const filename  = FILES[tab].split('/').pop();
    const commitSha = await ghCommitFile(
      FILES[tab],
      toSave,
      latestSha,
      `chore: update ${filename} via editor`
    );

    // Re-fetch to capture the new SHA that GitHub assigned after the commit
    const updated    = await ghFetchFile(FILES[tab]);
    state[tab].sha   = updated.sha;
    _clearDirty(tab);

    showStatus(`✅ Guardado — commit: ${commitSha.slice(0, 8)}`, 'success');
  } catch (err) {
    showStatus(`❌ Error al guardar: ${err.message}`, 'error');
  }
}

/**
 * Reloads the file from GitHub, discarding all local unsaved changes.
 * Asks for confirmation if there are unsaved changes.
 */
async function reloadFromGitHub(tab) {
  if (state[tab].dirty) {
    if (!confirm('Hay cambios sin guardar. ¿Recargar desde GitHub y descartarlos?')) return;
  }
  if (!getToken()) {
    showStatus('⚠️ No hay token — conectá con GitHub primero', 'warning');
    return;
  }
  await loadFromGitHub(tab);
}

// ── STATUS LOG ────────────────────────────────────────────────────────────────

let _statusTimer = null;

/**
 * Shows a message in the fixed-bottom status log bar.
 * Automatically clears after 8 seconds.
 *
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 */
function showStatus(message, type = 'info') {
  const el = document.getElementById('status-log');
  if (!el) return;
  el.textContent = message;
  el.className   = `status-log visible ${type}`;
  clearTimeout(_statusTimer);
  _statusTimer = setTimeout(() => { el.className = 'status-log'; }, 8000);
}

// ── INITIALIZATION ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Sync theme icon with the theme that was applied before DOM was ready
  _updateThemeUI();

  // Wire up event delegation — one listener per table, one per pagination bar
  _setupTableDelegation('raw');
  _setupTableDelegation('dated');
  _setupPaginationDelegation('raw');
  _setupPaginationDelegation('dated');

  // Render empty placeholder tables so the UI is not blank on load
  renderTable('raw');
  renderTable('dated');

  // Check for an existing session token and load data if it's still valid
  if (getToken()) {
    _verifyStoredToken();
  } else {
    showStatus('⚠️ Ingresá tu GitHub Personal Access Token para comenzar', 'warning');
  }
});
