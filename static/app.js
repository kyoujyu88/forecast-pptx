'use strict';

const STORAGE_KEY_LOCS = 'forecast_pptx_locations';
const STORAGE_KEY_DAYS = 'forecast_pptx_days';
const MAX_LOCATIONS = 5;

const state = {
  locations: [],  // [{name, lat, lon}, ...]
  days: 14,
};

// ── Storage ──────────────────────────────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY_LOCS, JSON.stringify(state.locations));
    localStorage.setItem(STORAGE_KEY_DAYS, String(state.days));
  } catch (_) {}
}

function loadState() {
  try {
    const locs = localStorage.getItem(STORAGE_KEY_LOCS);
    state.locations = locs ? JSON.parse(locs) : [];
  } catch (_) {
    state.locations = [];
  }
  const days = localStorage.getItem(STORAGE_KEY_DAYS);
  if (days && ['7', '10', '14', '16'].includes(days)) {
    state.days = parseInt(days, 10);
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderLocationList() {
  const container = document.getElementById('location-list');
  container.innerHTML = '';
  state.locations.forEach((loc, i) => {
    const chip = document.createElement('div');
    chip.className = 'location-chip';
    chip.innerHTML = `
      <span class="loc-name">${escapeHtml(loc.name)}</span>
      <span class="coords">${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}</span>
      <button class="remove-btn" data-index="${i}" title="削除">×</button>`;
    container.appendChild(chip);
  });
  document.getElementById('add-location-btn').disabled =
    state.locations.length >= MAX_LOCATIONS;
}

function syncDaysRadio() {
  document.querySelectorAll('input[name="days"]').forEach(r => {
    r.checked = parseInt(r.value, 10) === state.days;
  });
}

// ── Search / Dropdown ─────────────────────────────────────────────────────────

async function searchLocation() {
  const input = document.getElementById('search-input');
  const query = input.value.trim();
  if (!query) return;

  setStatus('検索中…', 'info');
  try {
    const resp = await fetch(`/api/geocode?name=${encodeURIComponent(query)}`);
    if (!resp.ok) throw new Error('検索に失敗しました');
    const data = await resp.json();
    showDropdown(data.results || []);
    clearStatus();
  } catch (e) {
    setStatus(e.message, 'error');
  }
}

function showDropdown(results) {
  const dropdown = document.getElementById('search-dropdown');
  dropdown.innerHTML = '';
  if (results.length === 0) {
    const li = document.createElement('li');
    li.className = 'no-results';
    li.textContent = '候補が見つかりませんでした';
    dropdown.appendChild(li);
  } else {
    results.forEach(r => {
      const li = document.createElement('li');
      const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
      li.textContent = label;
      li.addEventListener('click', () => confirmLocation(r));
      dropdown.appendChild(li);
    });
  }
  dropdown.style.display = 'block';
}

function hideDropdown() {
  const dropdown = document.getElementById('search-dropdown');
  dropdown.style.display = 'none';
  dropdown.innerHTML = '';
}

function confirmLocation(r) {
  if (state.locations.length >= MAX_LOCATIONS) return;
  // Avoid exact duplicates by lat/lon
  const already = state.locations.some(
    l => l.lat === r.lat && l.lon === r.lon
  );
  if (!already) {
    state.locations.push({ name: r.name, lat: r.lat, lon: r.lon });
    saveState();
    renderLocationList();
  }
  hideDropdown();
  document.getElementById('search-input').value = '';
  clearStatus();
}

// ── Generate ──────────────────────────────────────────────────────────────────

async function generatePPTX() {
  if (state.locations.length === 0) {
    setStatus('地点を1件以上追加してください', 'error');
    return;
  }
  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.textContent = '生成中…';
  setStatus('予報データを取得してスライドを生成しています…', 'info');

  try {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: state.locations, days: state.days }),
    });
    if (!resp.ok) {
      let msg = 'サーバーエラーが発生しました';
      try { msg = (await resp.json()).detail || msg; } catch (_) {}
      throw new Error(msg);
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_${todayStr()}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('ダウンロードを開始しました', 'success');
  } catch (e) {
    setStatus(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'PPTX を生成してダウンロード';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(msg, type) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
  el.style.display = 'block';
}

function clearStatus() {
  const el = document.getElementById('status-msg');
  el.style.display = 'none';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderLocationList();
  syncDaysRadio();

  // Search button
  document.getElementById('search-btn').addEventListener('click', searchLocation);

  // Search on Enter
  document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchLocation();
  });

  // Remove location chips (event delegation)
  document.getElementById('location-list').addEventListener('click', e => {
    if (e.target.classList.contains('remove-btn')) {
      const i = parseInt(e.target.dataset.index, 10);
      state.locations.splice(i, 1);
      saveState();
      renderLocationList();
    }
  });

  // Clear search button
  document.getElementById('add-location-btn').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    hideDropdown();
    document.getElementById('search-input').focus();
  });

  // Days radio
  document.querySelectorAll('input[name="days"]').forEach(r => {
    r.addEventListener('change', () => {
      state.days = parseInt(r.value, 10);
      saveState();
    });
  });

  // Generate button
  document.getElementById('generate-btn').addEventListener('click', generatePPTX);

  // Close dropdown when clicking outside search area
  document.addEventListener('click', e => {
    if (!e.target.closest('#search-area')) hideDropdown();
  });
});
