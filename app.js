'use strict';

const STORAGE_KEY_LOCS  = 'forecast_pptx_locations';
const STORAGE_KEY_START = 'forecast_pptx_start';
const STORAGE_KEY_END   = 'forecast_pptx_end';
const MAX_LOCATIONS = 5;
const MAX_DAYS      = 16;

// WMO code → icon key
const WMO_ICON = {
  0: 'sunny', 1: 'sunny',
  2: 'partly-cloudy',
  3: 'cloudy',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
  56: 'drizzle', 57: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'rain',
  66: 'rain', 67: 'rain',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
  80: 'showers', 81: 'showers', 82: 'showers',
  85: 'snow-showers', 86: 'snow-showers',
  95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm',
};

// WMO code → Japanese name (for alt text / fallback)
const WMO_NAME = {
  0:'快晴', 1:'晴れ', 2:'晴れ時々曇り', 3:'曇り',
  45:'霧', 48:'霧(着氷)',
  51:'霧雨(弱)', 53:'霧雨', 55:'霧雨(強)', 56:'凍雨(弱)', 57:'凍雨',
  61:'雨(弱)', 63:'雨', 65:'雨(強)', 66:'凍雨(弱)', 67:'凍雨(強)',
  71:'雪(弱)', 73:'雪', 75:'雪(強)', 77:'霧雪',
  80:'にわか雨(弱)', 81:'にわか雨', 82:'にわか雨(強)',
  85:'にわか雪(弱)', 86:'にわか雪(強)',
  95:'雷雨', 96:'雷雨(雹)', 99:'激しい雷雨',
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function getIconKey(code) {
  return (code != null && WMO_ICON[code]) ? WMO_ICON[code] : 'unknown';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoStr, n) {
  const d = new Date(isoStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function diffDays(start, end) {
  return Math.round((new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000) + 1;
}

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  locations:  [],
  startDate:  todayISO(),
  endDate:    addDays(todayISO(), 13),
};

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY_LOCS,  JSON.stringify(state.locations));
    localStorage.setItem(STORAGE_KEY_START, state.startDate);
    localStorage.setItem(STORAGE_KEY_END,   state.endDate);
  } catch (_) {}
}

function loadState() {
  try {
    const locs = localStorage.getItem(STORAGE_KEY_LOCS);
    state.locations = locs ? JSON.parse(locs) : [];
  } catch (_) { state.locations = []; }

  const today  = todayISO();
  const maxDay = addDays(today, MAX_DAYS - 1);

  let start = localStorage.getItem(STORAGE_KEY_START) || today;
  let end   = localStorage.getItem(STORAGE_KEY_END)   || addDays(today, 13);

  // Clamp to valid range
  if (start < today)  start = today;
  if (start > maxDay) start = today;
  if (end   < start)  end   = addDays(start, Math.min(13, MAX_DAYS - 1));
  if (end   > maxDay) end   = maxDay;

  state.startDate = start;
  state.endDate   = end;
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

function initDatePickers() {
  const today  = todayISO();
  const maxDay = addDays(today, MAX_DAYS - 1);

  const startEl = document.getElementById('start-date');
  const endEl   = document.getElementById('end-date');

  startEl.min = today;
  startEl.max = maxDay;
  endEl.min   = today;
  endEl.max   = maxDay;

  startEl.value = state.startDate;
  endEl.value   = state.endDate;

  updateDaysBadge();
}

function updateDaysBadge() {
  const n   = diffDays(state.startDate, state.endDate);
  const el  = document.getElementById('days-badge');
  const err = document.getElementById('date-error');
  if (n < 1 || n > MAX_DAYS) {
    el.style.display = 'none';
    err.textContent  = n < 1
      ? '終了日は開始日以降を選んでください'
      : `予報期間は最大 ${MAX_DAYS} 日までです`;
    err.style.display = 'block';
  } else {
    el.textContent    = `${n}日間`;
    el.style.display  = 'inline-block';
    err.style.display = 'none';
  }
}

// ── Open-Meteo API ────────────────────────────────────────────────────────────

async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=ja&format=json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('ジオコーディングに失敗しました');
  const data = await resp.json();
  return (data.results || []).map(r => ({
    name: r.name, lat: r.latitude, lon: r.longitude,
    country: r.country || '', admin1: r.admin1 || '',
  }));
}

async function fetchForecast(lat, lon, startDate, endDate) {
  const params = new URLSearchParams({
    latitude:  lat, longitude: lon,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'Asia/Tokyo',
    start_date: startDate,
    end_date:   endDate,
  });
  const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!resp.ok) throw new Error('予報データの取得に失敗しました');
  return (await resp.json()).daily;
}

// ── Icon loading ──────────────────────────────────────────────────────────────

const ICON_KEYS = [
  'sunny', 'partly-cloudy', 'cloudy', 'fog',
  'drizzle', 'rain', 'snow', 'showers', 'snow-showers',
  'thunderstorm', 'unknown',
];

async function loadIcons() {
  const map = {};
  await Promise.all(ICON_KEYS.map(async key => {
    try {
      const resp = await fetch(`icons/${key}.svg`);
      if (!resp.ok) return;
      const svg = await resp.text();
      map[key] = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    } catch (_) {}
  }));
  return map;
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
  } catch (e) { setStatus(e.message, 'error'); }
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

// ── PPTX Generation ───────────────────────────────────────────────────────────

async function generatePPTX() {
  if (state.locations.length === 0) {
    setStatus('地点を1件以上追加してください', 'error'); return;
  }
  const days = diffDays(state.startDate, state.endDate);
  if (days < 1 || days > MAX_DAYS) {
    setStatus(`予報期間は1〜${MAX_DAYS}日の範囲で指定してください`, 'error'); return;
  }

  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.textContent = '生成中…';
  setStatus('予報データを取得しています…', 'info');

  try {
    const [allForecasts, iconMap] = await Promise.all([
      Promise.all(state.locations.map(loc =>
        fetchForecast(loc.lat, loc.lon, state.startDate, state.endDate)
      )),
      loadIcons(),
    ]);
    setStatus('スライドを生成しています…', 'info');
    await buildPptx(state.locations, allForecasts, iconMap);
    setStatus('ダウンロードを開始しました', 'success');
  } catch (e) {
    setStatus(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'PPTX を生成してダウンロード';
  }
}

async function buildPptx(locations, allForecasts, iconMap) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';  // 13.33" × 7.5"

  const MARGIN    = 0.2;
  const CONTENT_W = 12.93;
  const LOC_W     = 1.1;
  const TABLE_TOP = 2.55;
  const TABLE_H   = 4.6;
  const HDR_H     = 0.28;

  const times      = allForecasts[0]?.time ?? [];
  const actualDays = times.length;
  const dateColW   = +((CONTENT_W - LOC_W) / actualDays).toFixed(4);
  const dataRowH   = +((TABLE_H - HDR_H) / locations.length).toFixed(4);

  const slide = pptx.addSlide();

  // ── Schedule box ────────────────────────────────────────────────────────────
  slide.addText('予定欄', {
    x: MARGIN, y: MARGIN, w: CONTENT_W, h: 2.1,
    align: 'left', valign: 'top', inset: 0.08,
    fontSize: 9, color: 'BBBBBB',
    line: { color: 'BBBBBB', pt: 0.75 },
    fill: { color: 'FFFFFF', transparency: 100 },
  });

  // ── Grid header row ─────────────────────────────────────────────────────────
  // [0,0] corner
  drawTextCell(slide,
    { x: MARGIN, y: TABLE_TOP, w: LOC_W, h: HDR_H },
    '地点', 'D9D9D9', { bold: true, fontSize: 8 });

  // Date columns
  times.forEach((d, j) => {
    drawTextCell(slide,
      { x: MARGIN + LOC_W + j * dateColW, y: TABLE_TOP, w: dateColW, h: HDR_H },
      formatDate(d), 'BDD7EE', { bold: true, fontSize: 8 });
  });

  // ── Data rows ───────────────────────────────────────────────────────────────
  locations.forEach((loc, i) => {
    const rowY = TABLE_TOP + HDR_H + i * dataRowH;

    // Location name cell
    drawTextCell(slide,
      { x: MARGIN, y: rowY, w: LOC_W, h: dataRowH },
      loc.name.length > 8 ? loc.name.slice(0, 8) : loc.name,
      'FFE5CC', { bold: true, fontSize: 8 });

    // Weather cells
    const daily = allForecasts[i];
    times.forEach((_, j) => {
      drawWeatherCell(slide,
        { x: MARGIN + LOC_W + j * dateColW, y: rowY, w: dateColW, h: dataRowH },
        daily, j, iconMap);
    });
  });

  // ── Credit ──────────────────────────────────────────────────────────────────
  slide.addText('出典: Open-Meteo (CC BY 4.0)', {
    x: MARGIN, y: 7.2, w: CONTENT_W, h: 0.25,
    align: 'right', fontSize: 7, color: '999999',
  });

  await pptx.writeFile({ fileName: `forecast_${todayStr()}.pptx` });
}

function drawTextCell(slide, { x, y, w, h }, text, fillHex, textOpts = {}) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: fillHex },
    line: { color: 'C0C0C0', pt: 0.5 },
  });
  slide.addText(text, {
    x: x + 0.02, y, w: w - 0.04, h,
    align: 'center', valign: 'middle',
    color: '333333', fontSize: 8,
    ...textOpts,
  });
}

function drawWeatherCell(slide, { x, y, w, h }, daily, j, iconMap) {
  const code   = daily?.weather_code?.[j];
  const precip = daily?.precipitation_probability_max?.[j];
  const tmax   = daily?.temperature_2m_max?.[j];
  const tmin   = daily?.temperature_2m_min?.[j];

  // Background
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: 'FFFFFF' },
    line: { color: 'C0C0C0', pt: 0.5 },
  });

  // Icon (top ~50% of cell, centered)
  const iconSize = +Math.min(w * 0.62, h * 0.50).toFixed(3);
  const iconX    = +(x + (w - iconSize) / 2).toFixed(3);
  const iconY    = +(y + h * 0.03).toFixed(3);
  const iconKey  = getIconKey(code);
  const iconData = iconMap[iconKey] || iconMap['unknown'];

  if (iconData) {
    slide.addImage({ data: iconData, x: iconX, y: iconY, w: iconSize, h: iconSize });
  }

  // Precipitation (below icon)
  const precipStr = precip != null ? `降水 ${precip}%` : '降水 -';
  slide.addText(precipStr, {
    x: x + 0.02, y: y + h * 0.55, w: w - 0.04, h: h * 0.22,
    align: 'center', valign: 'middle',
    fontSize: 6.5, color: '1A56DB',
  });

  // Temperature (max in red / min in blue)
  const tmaxStr = tmax != null ? `${Math.round(tmax)}°` : '--';
  const tminStr = tmin != null ? `${Math.round(tmin)}°` : '--';
  slide.addText(
    [
      { text: tmaxStr + '/', options: { color: 'CC2200', bold: true } },
      { text: tminStr,       options: { color: '0055CC', bold: true } },
    ],
    {
      x: x + 0.02, y: y + h * 0.77, w: w - 0.04, h: h * 0.22,
      align: 'center', valign: 'middle', fontSize: 8,
    }
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(msg, type) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className   = `status-msg ${type}`;
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
  initDatePickers();

  // Search
  document.getElementById('search-btn').addEventListener('click', searchLocation);
  document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchLocation();
  });

  // Remove location chips
  document.getElementById('location-list').addEventListener('click', e => {
    if (e.target.classList.contains('remove-btn')) {
      const i = parseInt(e.target.dataset.index, 10);
      state.locations.splice(i, 1);
      saveState();
      renderLocationList();
    }
  });

  // Clear search
  document.getElementById('add-location-btn').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    hideDropdown();
    document.getElementById('search-input').focus();
  });

  // Date range
  document.getElementById('start-date').addEventListener('change', e => {
    state.startDate = e.target.value;
    // Ensure end >= start
    if (state.endDate < state.startDate) {
      state.endDate = addDays(state.startDate, 0);
      document.getElementById('end-date').value = state.endDate;
    }
    document.getElementById('end-date').min = state.startDate;
    updateDaysBadge();
    saveState();
  });
  document.getElementById('end-date').addEventListener('change', e => {
    state.endDate = e.target.value;
    updateDaysBadge();
    saveState();
  });

  // Generate
  document.getElementById('generate-btn').addEventListener('click', generatePPTX);

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#search-area')) hideDropdown();
  });
});
