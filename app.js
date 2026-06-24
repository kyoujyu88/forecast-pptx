'use strict';

const STORAGE_KEY_LOCS = 'forecast_pptx_locations';
const STORAGE_KEY_DAYS = 'forecast_pptx_days';
const MAX_LOCATIONS = 5;

// WMO weather code → [emoji, Japanese name]
const WMO_MAP = {
  0:  ['☀',  '快晴'],
  1:  ['🌤', '晴れ'],
  2:  ['⛅', '晴れ時々曇り'],
  3:  ['☁',  '曇り'],
  45: ['🌫', '霧'],
  48: ['🌫', '霧(着氷)'],
  51: ['🌦', '霧雨(弱)'],
  53: ['🌦', '霧雨'],
  55: ['🌦', '霧雨(強)'],
  56: ['🌧', '凍雨(弱)'],
  57: ['🌧', '凍雨'],
  61: ['🌧', '雨(弱)'],
  63: ['🌧', '雨'],
  65: ['🌧', '雨(強)'],
  66: ['🌧', '凍雨(弱)'],
  67: ['🌧', '凍雨(強)'],
  71: ['❄',  '雪(弱)'],
  73: ['❄',  '雪'],
  75: ['❄',  '雪(強)'],
  77: ['❄',  '霧雪'],
  80: ['🌦', 'にわか雨(弱)'],
  81: ['🌦', 'にわか雨'],
  82: ['🌦', 'にわか雨(強)'],
  85: ['🌨', 'にわか雪(弱)'],
  86: ['🌨', 'にわか雪(強)'],
  95: ['⛈',  '雷雨'],
  96: ['⛈',  '雷雨(雹)'],
  99: ['⛈',  '激しい雷雨'],
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function getWeather(code) {
  return WMO_MAP[code] ?? ['❓', '不明'];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  locations: [],  // [{name, lat, lon}, ...]
  days: 14,
};

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

// ── Open-Meteo API ────────────────────────────────────────────────────────────

async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=ja&format=json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('ジオコーディングに失敗しました');
  const data = await resp.json();
  return (data.results || []).map(r => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    country: r.country || '',
    admin1:  r.admin1  || '',
  }));
}

async function fetchForecast(lat, lon, days) {
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'Asia/Tokyo',
    forecast_days: days,
  });
  const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!resp.ok) throw new Error('予報データの取得に失敗しました');
  return (await resp.json()).daily;
}

// ── Search ────────────────────────────────────────────────────────────────────

async function searchLocation() {
  const input = document.getElementById('search-input');
  const query = input.value.trim();
  if (!query) return;
  setStatus('検索中…', 'info');
  try {
    const results = await geocode(query);
    showDropdown(results);
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
      li.textContent = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
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
  const already = state.locations.some(l => l.lat === r.lat && l.lon === r.lon);
  if (!already) {
    state.locations.push({ name: r.name, lat: r.lat, lon: r.lon });
    saveState();
    renderLocationList();
  }
  hideDropdown();
  document.getElementById('search-input').value = '';
  clearStatus();
}

// ── PPTX Generation (PptxGenJS) ───────────────────────────────────────────────

async function generatePPTX() {
  if (state.locations.length === 0) {
    setStatus('地点を1件以上追加してください', 'error');
    return;
  }
  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.textContent = '生成中…';
  setStatus('予報データを取得しています…', 'info');

  try {
    const allForecasts = await Promise.all(
      state.locations.map(loc => fetchForecast(loc.lat, loc.lon, state.days))
    );
    setStatus('スライドを生成しています…', 'info');
    await buildPptx(state.locations, allForecasts, state.days);
    setStatus('ダウンロードを開始しました', 'success');
  } catch (e) {
    setStatus(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'PPTX を生成してダウンロード';
  }
}

async function buildPptx(locations, allForecasts, days) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';  // 13.33" × 7.5"

  const MARGIN     = 0.2;
  const SLIDE_W    = 13.33;
  const SLIDE_H    = 7.5;
  const CONTENT_W  = SLIDE_W - MARGIN * 2;   // 12.93"
  const LOC_COL_W  = 1.1;

  // Clamp to actual returned days
  const times      = allForecasts[0]?.time ?? [];
  const actualDays = Math.min(days, times.length);
  const dateColW   = +((CONTENT_W - LOC_COL_W) / actualDays).toFixed(3);

  const slide = pptx.addSlide();

  // ── Schedule box (top 1/3) ───────────────────────────────────────────────
  const SCHED_H = 2.1;
  slide.addText('予定欄', {
    x: MARGIN, y: MARGIN,
    w: CONTENT_W, h: SCHED_H,
    align: 'left', valign: 'top',
    fontSize: 9, color: 'BBBBBB',
    inset: 0.08,
    line:  { color: 'BBBBBB', pt: 0.75 },
    fill:  { color: 'FFFFFF', transparency: 100 },
  });

  // ── Weather table (bottom 2/3) ────────────────────────────────────────────
  const TABLE_TOP = MARGIN + SCHED_H + 0.15;
  const TABLE_H   = SLIDE_H - TABLE_TOP - 0.35;
  const HDR_ROW_H = 0.28;
  const dataRowH  = +((TABLE_H - HDR_ROW_H) / locations.length).toFixed(3);

  const colW = [LOC_COL_W, ...Array(actualDays).fill(dateColW)];
  const rowH = [HDR_ROW_H, ...Array(locations.length).fill(dataRowH)];

  // Header row
  const headerRow = [
    cell('地点', { fill: 'D9D9D9', bold: true, fontSize: 8 }),
    ...times.slice(0, actualDays).map(d =>
      cell(formatDate(d), { fill: 'BDD7EE', bold: true, fontSize: 8 })
    ),
  ];

  // Data rows
  const dataRows = locations.map((loc, i) => {
    const daily = allForecasts[i];
    return [
      cell(loc.name.length > 8 ? loc.name.slice(0, 8) : loc.name,
           { fill: 'FFE5CC', bold: true, fontSize: 8 }),
      ...Array.from({ length: actualDays }, (_, j) => weatherCell(daily, j)),
    ];
  });

  slide.addTable([headerRow, ...dataRows], {
    x: MARGIN, y: TABLE_TOP,
    colW, rowH,
    border: { type: 'solid', color: 'C0C0C0', pt: 0.5 },
  });

  // ── Credit ────────────────────────────────────────────────────────────────
  slide.addText('出典: Open-Meteo (CC BY 4.0)', {
    x: MARGIN, y: SLIDE_H - 0.3,
    w: CONTENT_W, h: 0.25,
    align: 'right', fontSize: 7, color: '999999',
  });

  await pptx.writeFile({ fileName: `forecast_${todayStr()}.pptx` });
}

function cell(text, { fill, bold = false, fontSize = 7 } = {}) {
  return {
    text,
    options: {
      fill: { color: fill },
      bold, fontSize,
      align: 'center', valign: 'middle',
      color: '333333',
    },
  };
}

function weatherCell(daily, j) {
  const code   = daily?.weather_code?.[j];
  const precip = daily?.precipitation_probability_max?.[j];
  const tmax   = daily?.temperature_2m_max?.[j];
  const tmin   = daily?.temperature_2m_min?.[j];

  const [emoji, wname] = getWeather(code);
  const precipStr = precip != null ? `降水 ${precip}%` : '降水 -';
  const tmaxStr   = tmax  != null ? `${Math.round(tmax)}°`  : '--';
  const tminStr   = tmin  != null ? `${Math.round(tmin)}°`  : '--';

  return {
    text: [
      { text: `${emoji} ${wname}`, options: { breakLine: true } },
      { text: precipStr,           options: { breakLine: true } },
      { text: `${tmaxStr}/${tminStr}` },
    ],
    options: { fontSize: 7, align: 'center', valign: 'middle', color: '333333' },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(msg, type) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
  el.style.display = 'block';
}

function clearStatus() {
  document.getElementById('status-msg').style.display = 'none';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

// ── Events ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderLocationList();
  syncDaysRadio();

  document.getElementById('search-btn').addEventListener('click', searchLocation);
  document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchLocation();
  });

  document.getElementById('location-list').addEventListener('click', e => {
    if (e.target.classList.contains('remove-btn')) {
      const i = parseInt(e.target.dataset.index, 10);
      state.locations.splice(i, 1);
      saveState();
      renderLocationList();
    }
  });

  document.getElementById('add-location-btn').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    hideDropdown();
    document.getElementById('search-input').focus();
  });

  document.querySelectorAll('input[name="days"]').forEach(r => {
    r.addEventListener('change', () => {
      state.days = parseInt(r.value, 10);
      saveState();
    });
  });

  document.getElementById('generate-btn').addEventListener('click', generatePPTX);

  document.addEventListener('click', e => {
    if (!e.target.closest('#search-area')) hideDropdown();
  });
});
