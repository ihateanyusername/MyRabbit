const STORAGE_KEY = "myrabbit-app-state-v3";
const LEGACY_STORAGE_KEYS = ["myrabbit-app-state-v2", "myrabbit-app-state-v1"];
const DEFAULT_AREA = {
  prefectureCode: "130000",
  municipalityCode: "1321200",
  prefectureName: "東京都",
  municipalityName: "日野市",
  forecastCode: "130010",
};
const DEFAULT_CHECKLIST_ITEMS = [
  { id: "feed", label: "喂食", repeatable: true, period: "daily", startDate: "", endDate: "" },
  { id: "snack", label: "喂零食", repeatable: true, period: "daily", startDate: "", endDate: "" },
  { id: "water", label: "加水", repeatable: true, period: "daily", startDate: "", endDate: "" },
  { id: "clean", label: "铲屎", repeatable: true, period: "daily", startDate: "", endDate: "" },
  { id: "weigh", label: "称重", repeatable: true, period: "daily", startDate: "", endDate: "" },
  { id: "nails", label: "剪指甲", repeatable: true, period: "biweekly", startDate: "", endDate: "" },
];
const EASTER_EGG_CHECKLIST_ITEM = {
  id: "easter_boyfriend_praise",
  label: "夸夸你的亲亲男朋友",
  repeatable: true,
  period: "daily",
  startDate: "",
  endDate: "",
  hiddenFromEditor: true,
  isEasterEgg: true,
};
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
let loadedStorageKey = STORAGE_KEY;

const state = {
  activePage: "weight",
  chartRange: "week",
  calendarView: "week",
  selectedDate: getLocalDateString(new Date()),
  calendarCursor: getMonday(new Date()),
  areaData: null,
  weather: null,
  weatherError: "",
  isLoadingWeather: false,
  modalDate: getLocalDateString(new Date()),
  checklistBurstId: "",
  editingChecklistItemId: "",
  app: loadState(),
};

const elements = {
  pages: [...document.querySelectorAll(".page")],
  navButtons: [...document.querySelectorAll("[data-nav-target]")],
  rangeToggle: document.querySelector("#range-toggle"),
  chart: document.querySelector("#weight-chart"),
  chartEmpty: document.querySelector("#chart-empty"),
  tableBody: document.querySelector("#record-table-body"),
  tableEmpty: document.querySelector("#table-empty"),
  calendar: document.querySelector("#calendar"),
  calendarTitle: document.querySelector("#calendar-title"),
  calendarModeToggle: document.querySelector("#calendar-mode-toggle"),
  prevMonth: document.querySelector("#prev-month"),
  nextMonth: document.querySelector("#next-month"),
  detail: document.querySelector("#record-detail"),
  editSelectedRecord: document.querySelector("#edit-selected-record"),
  addRecordButton: document.querySelector("#add-record-button"),
  modal: document.querySelector("#record-modal"),
  modalTitle: document.querySelector("#modal-title"),
  recordForm: document.querySelector("#record-form"),
  closeModal: document.querySelector("#close-modal"),
  cancelModal: document.querySelector("#cancel-modal"),
  titleInput: document.querySelector("#record-title-input"),
  weightInput: document.querySelector("#record-weight-input"),
  detailInput: document.querySelector("#record-detail-input"),
  imageInput: document.querySelector("#record-image-input"),
  imagePreviewWrap: document.querySelector("#image-preview-wrap"),
  imagePreview: document.querySelector("#image-preview"),
  replaceImageButton: document.querySelector("#replace-image-button"),
  prefectureSelect: document.querySelector("#prefecture-select"),
  municipalitySelect: document.querySelector("#municipality-select"),
  weatherGrid: document.querySelector("#weather-grid"),
  weatherError: document.querySelector("#weather-error"),
  todayCard: document.querySelector("#today-card"),
  tomorrowCard: document.querySelector("#tomorrow-card"),
  todayAlert: document.querySelector("#today-alert"),
  tomorrowAlert: document.querySelector("#tomorrow-alert"),
  todayIcon: document.querySelector("#today-icon"),
  tomorrowIcon: document.querySelector("#tomorrow-icon"),
  todayTemp: document.querySelector("#today-temp"),
  tomorrowTemp: document.querySelector("#tomorrow-temp"),
  todayText: document.querySelector("#today-text"),
  tomorrowText: document.querySelector("#tomorrow-text"),
  todayRange: document.querySelector("#today-range"),
  tomorrowRange: document.querySelector("#tomorrow-range"),
  todayBunny: document.querySelector("#today-bunny"),
  tomorrowBunny: document.querySelector("#tomorrow-bunny"),
  checklistList: document.querySelector("#checklist-list"),
  checklistSummary: document.querySelector("#checklist-summary"),
  checklistStatusBunny: document.querySelector("#checklist-status-bunny"),
  editChecklistButton: document.querySelector("#edit-checklist-button"),
  checklistModal: document.querySelector("#checklist-modal"),
  closeChecklistModal: document.querySelector("#close-checklist-modal"),
  newChecklistItemButton: document.querySelector("#new-checklist-item-button"),
  checklistManageList: document.querySelector("#checklist-manage-list"),
  checklistItemForm: document.querySelector("#checklist-item-form"),
  checklistItemLabel: document.querySelector("#checklist-item-label"),
  checklistItemRepeatable: document.querySelector("#checklist-item-repeatable"),
  checklistRepeatableField: document.querySelector("#checklist-repeatable-field"),
  checklistItemPeriod: document.querySelector("#checklist-item-period"),
  checklistDateRangeFields: document.querySelector("#checklist-date-range-fields"),
  checklistItemStartDate: document.querySelector("#checklist-item-start-date"),
  checklistItemEndDate: document.querySelector("#checklist-item-end-date"),
  deleteChecklistItemButton: document.querySelector("#delete-checklist-item-button"),
};

void boot();

async function boot() {
  hydrateChecklistState();
  bindEvents();
  await loadAreaData();
  render();
  void refreshWeather();
}

function loadState() {
  const initial = readPersistedState();
  return {
    records: normalizeRecords(initial.records),
    checklist: initial.checklist || {},
    checklistItems: normalizeChecklistItems(initial.checklistItems || initial.checklistDefinitions),
    specialChecklistDates: normalizeSpecialChecklistDates(initial.specialChecklistDates),
    settings: {
      selectedArea: initial.settings?.selectedArea || migrateLegacyCity(initial.settings?.selectedCity),
    },
  };
}

function readPersistedState() {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      loadedStorageKey = key;
      return JSON.parse(raw);
    } catch {
      loadedStorageKey = STORAGE_KEY;
      return createDefaultAppState();
    }
  }
  loadedStorageKey = STORAGE_KEY;
  return createDefaultAppState();
}

function createDefaultAppState() {
  return {
    records: {},
    checklist: {},
    checklistItems: normalizeChecklistItems(),
    specialChecklistDates: {},
    settings: {
      selectedArea: DEFAULT_AREA,
    },
  };
}

function normalizeChecklistItems(items = DEFAULT_CHECKLIST_ITEMS) {
  const source = Array.isArray(items) && items.length ? items : DEFAULT_CHECKLIST_ITEMS;
  return source.map((item) => ({
    id: item.id || createChecklistItemId(),
    label: item.label || "",
    repeatable: item.repeatable !== false,
    period: item.repeatable === false ? "" : (item.period || "daily"),
    startDate: item.repeatable === false ? (item.startDate || getLocalDateString(new Date())) : "",
    endDate: item.repeatable === false ? (item.endDate || getLocalDateString(new Date())) : "",
  }));
}

function normalizeSpecialChecklistDates(schedule) {
  if (!schedule || typeof schedule !== "object") return {};
  const normalized = {};
  Object.entries(schedule).forEach(([monthKey, dates]) => {
    if (!/^\d{4}-\d{2}$/.test(monthKey) || !Array.isArray(dates)) return;
    const validDates = [...new Set(dates.filter((date) => isValidDateKey(date)))].sort();
    if (validDates.length) normalized[monthKey] = validDates;
  });
  return normalized;
}

function normalizeRecords(records) {
  if (!records || typeof records !== "object") return {};
  const normalized = {};
  Object.entries(records).forEach(([dateKey, rawRecord]) => {
    if (!isValidDateKey(dateKey) || !rawRecord || typeof rawRecord !== "object") return;
    const weight = Math.round(Number(rawRecord.weight));
    if (!Number.isFinite(weight) || weight <= 0) return;
    normalized[dateKey] = {
      date: dateKey,
      title: typeof rawRecord.title === "string" ? rawRecord.title : "",
      weight,
      detail: typeof rawRecord.detail === "string" ? rawRecord.detail : "",
      image: typeof rawRecord.image === "string" ? rawRecord.image : "",
      delta: 0,
      food: 0,
    };
  });
  return normalized;
}

function migrateLegacyCity(legacyCity) {
  if (legacyCity?.name === "东京都日野市") return DEFAULT_AREA;
  return DEFAULT_AREA;
}

function saveState() {
  const payload = JSON.stringify(state.app);
  try {
    if (loadedStorageKey !== STORAGE_KEY) {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      loadedStorageKey = STORAGE_KEY;
    }
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(STORAGE_KEY, payload);
      loadedStorageKey = STORAGE_KEY;
    } catch {
      console.warn("State persistence failed.", error);
    }
  }
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => switchPage(button.dataset.navTarget));
  });

  elements.rangeToggle.addEventListener("click", () => {
    state.chartRange = state.chartRange === "week" ? "month" : "week";
    renderRecordPage();
  });

  elements.calendarModeToggle.addEventListener("click", () => {
    state.calendarView = state.calendarView === "week" ? "month" : "week";
    if (state.calendarView === "week") {
      state.calendarCursor = getMonday(parseDateFromString(state.selectedDate));
    } else {
      state.calendarCursor = startOfMonth(parseDateFromString(state.selectedDate));
    }
    renderCalendar();
  });

  elements.prevMonth.addEventListener("click", () => {
    state.calendarCursor = state.calendarView === "week"
      ? addDays(state.calendarCursor, -7)
      : addMonths(state.calendarCursor, -1);
    renderCalendar();
  });

  elements.nextMonth.addEventListener("click", () => {
    state.calendarCursor = state.calendarView === "week"
      ? addDays(state.calendarCursor, 7)
      : addMonths(state.calendarCursor, 1);
    renderCalendar();
  });

  elements.addRecordButton.addEventListener("click", openTodayRecordModal);
  elements.editSelectedRecord.addEventListener("click", () => {
    if (state.selectedDate === getLocalDateString(new Date())) openTodayRecordModal();
  });

  elements.closeModal.addEventListener("click", closeModal);
  elements.cancelModal.addEventListener("click", closeModal);
  elements.recordForm.addEventListener("submit", onRecordSave);
  elements.imageInput.addEventListener("change", onImageSelected);
  elements.replaceImageButton.addEventListener("click", () => elements.imageInput.click());
  elements.modal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModal();
  });

  elements.editChecklistButton.addEventListener("click", openChecklistModal);
  elements.closeChecklistModal.addEventListener("click", closeChecklistModal);
  elements.newChecklistItemButton.addEventListener("click", () => startChecklistItemEdit());
  elements.checklistItemRepeatable.addEventListener("change", renderChecklistItemFormMode);
  elements.checklistItemForm.addEventListener("submit", onChecklistItemSave);
  elements.deleteChecklistItemButton.addEventListener("click", onChecklistItemDelete);
  elements.checklistModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeChecklistModal();
  });

  elements.prefectureSelect.addEventListener("change", async () => {
    selectPrefecture(elements.prefectureSelect.value);
    saveState();
    renderMonitorPage();
    await refreshWeather();
  });

  elements.municipalitySelect.addEventListener("change", async () => {
    updateSelectedArea(elements.prefectureSelect.value, elements.municipalitySelect.value);
    saveState();
    renderMonitorPage();
    await refreshWeather();
  });
}

async function loadAreaData() {
  try {
    const response = await fetch("https://www.jma.go.jp/bosai/common/const/area.json");
    if (!response.ok) throw new Error("area fetch failed");
    state.areaData = buildAreaIndex(await response.json());
    ensureSelectedAreaIsValid();
  } catch {
    state.areaData = null;
    state.weatherError = "地区数据加载失败，请稍后刷新页面。";
  }
}

function buildAreaIndex(raw) {
  const offices = raw.offices || {};
  const class10s = raw.class10s || {};
  const class15s = raw.class15s || {};
  const class20s = raw.class20s || {};
  const prefectures = Object.entries(offices).map(([code, office]) => ({
    code,
    name: office.name,
    children: office.children || [],
  })).sort((a, b) => a.code.localeCompare(b.code));

  const municipalitiesByPrefecture = {};
  prefectures.forEach((prefecture) => {
    const list = [];
    const visit = (code, trail) => {
      if (class20s[code]) {
        list.push({ code, name: class20s[code].name, forecastCode: findForecastCode(trail) });
        return;
      }
      const node = class15s[code] || class10s[code];
      if (!node) return;
      const nextTrail = [code, ...trail];
      const children = node.children || [];
      if (!children.length) {
        list.push({ code, name: node.name, forecastCode: findForecastCode(nextTrail) });
        return;
      }
      children.forEach((childCode) => visit(childCode, nextTrail));
    };
    prefecture.children.forEach((childCode) => visit(childCode, [prefecture.code]));
    municipalitiesByPrefecture[prefecture.code] = dedupeMunicipalities(list);
  });
  return { prefectures, municipalitiesByPrefecture };
}

function findForecastCode(trail) {
  return trail.find((code) => code.length === 6 && code.endsWith("0")) || trail.find((code) => code.length === 6) || "";
}

function dedupeMunicipalities(list) {
  const map = new Map();
  list.forEach((item) => {
    if (!map.has(item.code)) map.set(item.code, item);
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

function ensureSelectedAreaIsValid() {
  if (!state.areaData) return;
  const current = state.app.settings.selectedArea || DEFAULT_AREA;
  if (!state.areaData.prefectures.some((item) => item.code === current.prefectureCode)) {
    state.app.settings.selectedArea = DEFAULT_AREA;
    saveState();
    return;
  }
  const municipalities = state.areaData.municipalitiesByPrefecture[current.prefectureCode] || [];
  if (!municipalities.some((item) => item.code === current.municipalityCode)) {
    const fallback = municipalities.find((item) => item.name === DEFAULT_AREA.municipalityName) || municipalities[0];
    if (fallback) {
      updateSelectedArea(current.prefectureCode, fallback.code);
      saveState();
    }
  }
}

function updateSelectedArea(prefectureCode, municipalityCode) {
  const prefecture = state.areaData?.prefectures.find((item) => item.code === prefectureCode);
  const municipality = state.areaData?.municipalitiesByPrefecture[prefectureCode]?.find((item) => item.code === municipalityCode);
  if (!prefecture || !municipality) return;
  state.app.settings.selectedArea = {
    prefectureCode,
    municipalityCode,
    prefectureName: prefecture.name,
    municipalityName: municipality.name,
    forecastCode: municipality.forecastCode || prefectureCode,
  };
}

function selectPrefecture(prefectureCode) {
  const municipalities = state.areaData?.municipalitiesByPrefecture[prefectureCode] || [];
  const preferred = municipalities.find((item) => item.name === DEFAULT_AREA.municipalityName);
  const next = preferred || municipalities[0];
  if (next) updateSelectedArea(prefectureCode, next.code);
}

function render() {
  switchPage(state.activePage, false);
  renderRecordPage();
  renderMonitorPage();
}

function switchPage(page, rerender = true) {
  state.activePage = page;
  elements.pages.forEach((section) => section.classList.toggle("page--active", section.dataset.page === page));
  document.querySelectorAll("[data-nav-target]").forEach((button) => {
    const isActive = button.dataset.navTarget === page;
    button.classList.toggle("chip--active", button.classList.contains("chip") && isActive);
    button.classList.toggle("bottom-nav__item--active", button.classList.contains("bottom-nav__item") && isActive);
  });
  if (rerender) {
    if (page === "weight" || page === "calendar") renderRecordPage();
    if (page === "weather" || page === "checklist") renderMonitorPage();
  }
}

function renderRecordPage() {
  renderChart();
  renderTable();
  renderCalendar();
  renderRecordDetail();
  elements.rangeToggle.textContent = state.chartRange === "week" ? "切换到月视图" : "切换到周视图";
}

function renderChart() {
  const records = getRangeRecords(state.chartRange);
  if (!records.length) {
    elements.chart.innerHTML = "";
    elements.chartEmpty.classList.remove("hidden");
    return;
  }
  elements.chartEmpty.classList.add("hidden");
  const weights = records.map((item) => item.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = Math.max(20, maxWeight - minWeight || 20);
  const floor = Math.floor((minWeight - range * 0.2) / 5) * 5;
  const ceil = Math.ceil((maxWeight + range * 0.2) / 5) * 5;
  const width = 640;
  const height = 190;
  const pad = { left: 54, top: 24, right: 18, bottom: 44 };
  const points = records.map((record, index) => {
    const x = pad.left + (index * (width - pad.left - pad.right)) / Math.max(records.length - 1, 1);
    const ratio = (record.weight - floor) / Math.max(ceil - floor, 1);
    const y = height - pad.bottom - ratio * (height - pad.top - pad.bottom);
    return { x, y, record };
  });
  const gridLines = [];
  for (let i = 0; i <= 4; i += 1) {
    const value = floor + ((ceil - floor) / 4) * i;
    const y = height - pad.bottom - ((value - floor) / Math.max(ceil - floor, 1)) * (height - pad.top - pad.bottom);
    gridLines.push(`<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="rgba(180, 199, 232, 0.65)" stroke-dasharray="4 6"></line><text x="${pad.left - 10}" y="${y + 4}" text-anchor="end" font-size="14" fill="#7a8fb5">${Math.round(value)}</text>`);
  }
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x} ${height - pad.bottom} L ${points[0].x} ${height - pad.bottom} Z`;
  const xLabels = points.map((point) => `<text x="${point.x}" y="${height - 12}" text-anchor="middle" font-size="13" fill="#7a8fb5">${formatShortDate(point.record.date)}</text>`).join("");
  const dots = points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#4b89ff"></circle><text x="${point.x}" y="${point.y - 14}" text-anchor="middle" font-size="14" fill="#4b89ff">${point.record.weight}</text>`).join("");
  elements.chart.innerHTML = `
    <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="rgba(75, 137, 255, 0.34)"></stop><stop offset="100%" stop-color="rgba(75, 137, 255, 0.04)"></stop></linearGradient></defs>
    ${gridLines.join("")}
    <path d="${areaPath}" fill="url(#chart-fill)"></path>
    <path d="${linePath}" fill="none" stroke="#4b89ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
    ${dots}
    ${xLabels}
  `;
}

function renderTable() {
  const records = getSortedRecordsDescending();
  if (!records.length) {
    elements.tableBody.innerHTML = "";
    elements.tableEmpty.classList.remove("hidden");
    return;
  }
  elements.tableEmpty.classList.add("hidden");
  elements.tableBody.innerHTML = records.map((record) => `
    <tr data-record-date="${record.date}">
      <td>${formatShortDate(record.date)}</td>
      <td>${record.weight} g</td>
      <td><strong>${formatDelta(record.delta)}</strong></td>
      <td>${record.food} g</td>
      <td>${escapeHtml(record.title || "—")}</td>
    </tr>
  `).join("");
  [...elements.tableBody.querySelectorAll("tr")].forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedDate = row.dataset.recordDate;
      state.calendarCursor = getMonday(parseDateFromString(state.selectedDate));
      renderCalendar();
      renderRecordDetail();
    });
  });
}

function renderCalendar() {
  elements.calendarModeToggle.textContent = state.calendarView === "week" ? "展开月历" : "收起月历";
  if (state.calendarView === "month") {
    renderMonthCalendar();
    return;
  }
  const weekStart = getMonday(state.calendarCursor);
  const weekEnd = addDays(weekStart, 6);
  const cells = [];
  elements.calendarTitle.textContent = `${formatShortDate(getLocalDateString(weekStart))} - ${formatShortDate(getLocalDateString(weekEnd))}`;
  WEEKDAYS.forEach((weekday) => cells.push(`<div class="calendar__label">${weekday}</div>`));
  for (let day = 0; day < 7; day += 1) {
    const date = addDays(weekStart, day);
    const dateKey = getLocalDateString(date);
    const hasRecord = Boolean(state.app.records[dateKey]);
    const selected = state.selectedDate === dateKey;
    cells.push(`<button class="calendar__day ${selected ? "calendar__day--selected" : ""}" type="button" data-date="${dateKey}" data-has-record="${hasRecord}">${date.getDate()}</button>`);
  }
  elements.calendar.innerHTML = cells.join("");
  [...elements.calendar.querySelectorAll("[data-date]")].forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date;
      state.calendarCursor = getMonday(parseDateFromString(button.dataset.date));
      renderCalendar();
      renderRecordDetail();
    });
  });
}

function renderMonthCalendar() {
  const year = state.calendarCursor.getFullYear();
  const month = state.calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  elements.calendarTitle.textContent = `${year}年${month + 1}月`;
  WEEKDAYS.forEach((weekday) => cells.push(`<div class="calendar__label">${weekday}</div>`));
  for (let i = 0; i < offset; i += 1) cells.push(`<div class="calendar__day" data-disabled="true"></div>`);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = getLocalDateString(date);
    const hasRecord = Boolean(state.app.records[dateKey]);
    const selected = state.selectedDate === dateKey;
    cells.push(`<button class="calendar__day ${selected ? "calendar__day--selected" : ""}" type="button" data-date="${dateKey}" data-has-record="${hasRecord}">${day}</button>`);
  }
  elements.calendar.innerHTML = cells.join("");
  [...elements.calendar.querySelectorAll("[data-date]")].forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date;
      state.calendarCursor = startOfMonth(parseDateFromString(button.dataset.date));
      renderCalendar();
      renderRecordDetail();
    });
  });
}

function renderRecordDetail() {
  const record = getRecordByDate(state.selectedDate);
  const isToday = state.selectedDate === getLocalDateString(new Date());
  elements.editSelectedRecord.classList.toggle("hidden", !isToday);
  if (isToday) elements.editSelectedRecord.textContent = record ? "编辑今日记录" : "新增今日记录";
  if (!record) {
    elements.detail.innerHTML = `<h3>${formatDate(state.selectedDate)}</h3><p class="muted">尚无记录</p>`;
    return;
  }
  const detailText = record.detail ? escapeHtml(record.detail).replace(/\n/g, "<br>") : `<span class="muted">暂无详情记录</span>`;
  const imageHtml = record.image ? `<img class="detail-image" src="${record.image}" alt="记录图片">` : `<p class="muted">暂无图片</p>`;
  elements.detail.innerHTML = `
    <h3>${escapeHtml(record.title || "未命名记录")}</h3>
    <p><strong>日期：</strong>${formatDate(record.date)}</p>
    <p><strong>今日体重：</strong>${record.weight} g</p>
    <p><strong>详细记录：</strong></p>
    <p>${detailText}</p>
    ${imageHtml}
  `;
}

function openTodayRecordModal() {
  const today = getLocalDateString(new Date());
  state.modalDate = today;
  const existing = getRecordByDate(today);
  elements.modalTitle.textContent = existing ? "编辑今日记录" : "新增今日记录";
  elements.titleInput.value = existing?.title || "";
  elements.weightInput.value = existing?.weight || "";
  elements.detailInput.value = existing?.detail || "";
  elements.imageInput.value = "";
  syncImagePreview(existing?.image || "");
  openModal();
}

function openModal() {
  if (typeof elements.modal.showModal === "function") {
    if (!elements.modal.open) elements.modal.showModal();
  } else {
    elements.modal.setAttribute("open", "open");
  }
}

function closeModal() {
  if (typeof elements.modal.close === "function") elements.modal.close();
  else elements.modal.removeAttribute("open");
}

function syncImagePreview(imageDataUrl) {
  if (!imageDataUrl) {
    elements.imagePreviewWrap.classList.add("hidden");
    elements.imagePreview.removeAttribute("src");
    elements.imagePreview.dataset.pending = "";
    return;
  }
  elements.imagePreview.src = imageDataUrl;
  elements.imagePreview.dataset.pending = imageDataUrl;
  elements.imagePreviewWrap.classList.remove("hidden");
}

async function onImageSelected(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  const dataUrl = await readFileAsDataUrl(file);
  syncImagePreview(dataUrl);
}

function onRecordSave(event) {
  event.preventDefault();
  const date = state.modalDate;
  const title = elements.titleInput.value.trim();
  const weight = Math.round(Number(elements.weightInput.value));
  const detail = elements.detailInput.value.trim();
  if (!Number.isFinite(weight) || weight <= 0) return;
  const existing = state.app.records[date];
  const image = elements.imagePreview.dataset.pending || existing?.image || "";
  state.app.records[date] = { date, title, weight, detail, image };
  normalizeRecordMetrics();
  saveState();
  state.selectedDate = date;
  state.calendarCursor = getMonday(parseDateFromString(date));
  renderRecordPage();
  closeModal();
}

function normalizeRecordMetrics() {
  state.app.records = normalizeRecords(state.app.records);
  const sortedDates = Object.keys(state.app.records).sort();
  let previousWeight = null;
  sortedDates.forEach((date) => {
    const record = state.app.records[date];
    if (!record) return;
    record.delta = previousWeight == null ? 0 : record.weight - previousWeight;
    record.food = calculateFoodAmount(date, record.weight);
    previousWeight = record.weight;
  });
}

function calculateFoodAmount(dateString, weight) {
  const date = parseDateFromString(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  let ratio = 0.02;
  if (year < 2026 || (year === 2026 && month <= 4)) ratio = 0.07;
  else if (year === 2026 && month === 5) ratio = 0.06;
  else if (year === 2026 && month === 6) ratio = 0.05;
  else if (year === 2026 && month === 7) ratio = 0.04;
  else if (year === 2026 && month === 8) ratio = 0.03;
  return Math.round(weight * ratio);
}

function getSortedRecordsDescending() {
  normalizeRecordMetrics();
  return Object.keys(state.app.records).sort((a, b) => b.localeCompare(a)).map((date) => state.app.records[date]);
}

function getRangeRecords(range) {
  normalizeRecordMetrics();
  const anchorDate = getChartAnchorDate();
  const count = range === "week" ? 7 : 30;
  const dates = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(anchorDate);
    date.setDate(anchorDate.getDate() - i);
    dates.push(getLocalDateString(date));
  }
  return dates.map((date) => state.app.records[date]).filter(Boolean);
}

function getChartAnchorDate() {
  const today = new Date();
  const recordDates = Object.keys(state.app.records).sort();
  if (!recordDates.length) return today;
  const latestRecordDate = parseDateFromString(recordDates[recordDates.length - 1]);
  return latestRecordDate > today ? latestRecordDate : today;
}

function getRecordByDate(date) {
  normalizeRecordMetrics();
  return state.app.records[date] || null;
}

async function refreshWeather() {
  const area = state.app.settings.selectedArea;
  if (!area) return;
  state.isLoadingWeather = true;
  state.weatherError = "";
  renderMonitorPage();
  try {
    const response = await fetch(`https://www.jma.go.jp/bosai/forecast/data/forecast/${area.prefectureCode}.json`);
    if (!response.ok) throw new Error("weather failed");
    state.weather = extractJmaWeather(await response.json(), area);
    state.weatherError = "";
  } catch {
    state.weather = null;
    state.weatherError = "天气加载失败，请稍后重试或更换地区。";
  } finally {
    state.isLoadingWeather = false;
    renderMonitorPage();
  }
}

function extractJmaWeather(payload, area) {
  const primary = Array.isArray(payload) ? payload[0] : null;
  const weekly = Array.isArray(payload) ? payload[1] : null;
  if (!primary?.timeSeries?.length) throw new Error("invalid JMA payload");
  const weatherSeries = primary.timeSeries.find((series) => series.areas?.[0]?.weathers);
  const tempSeries = primary.timeSeries.find((series) => series.areas?.[0]?.temps);
  const weeklyTempSeries = weekly?.timeSeries?.find((series) => series.areas?.[0]?.tempsMax);
  const targetForecastCode = area.forecastCode || area.prefectureCode;
  const weatherArea = pickBestJmaArea(weatherSeries?.areas || [], targetForecastCode) || weatherSeries?.areas?.[0];
  const tempArea = pickRepresentativeTempArea(tempSeries?.areas || [], area) || tempSeries?.areas?.[0];
  const weeklyTempArea = pickRepresentativeTempArea(weeklyTempSeries?.areas || [], area) || weeklyTempSeries?.areas?.[0];
  return {
    today: {
      mainTemp: toNumber(tempArea?.temps?.[1]) ?? toNumber(weeklyTempArea?.tempsMax?.[1]) ?? 0,
      text: weatherArea?.weathers?.[1] || weatherArea?.weathers?.[0] || "天气未知",
      max: toNumber(weeklyTempArea?.tempsMax?.[1]) ?? toNumber(tempArea?.temps?.[1]) ?? 0,
      min: toNumber(weeklyTempArea?.tempsMin?.[1]) ?? toNumber(tempArea?.temps?.[0]) ?? 0,
      weatherCode: weatherArea?.weatherCodes?.[1] || weatherArea?.weatherCodes?.[0] || "100",
    },
    tomorrow: {
      mainTemp: toNumber(weeklyTempArea?.tempsMax?.[2]) ?? toNumber(weeklyTempArea?.tempsMax?.[1]) ?? 0,
      text: weatherArea?.weathers?.[2] || weatherArea?.weathers?.[1] || "天气未知",
      max: toNumber(weeklyTempArea?.tempsMax?.[2]) ?? toNumber(weeklyTempArea?.tempsMax?.[1]) ?? 0,
      min: toNumber(weeklyTempArea?.tempsMin?.[2]) ?? toNumber(weeklyTempArea?.tempsMin?.[1]) ?? 0,
      weatherCode: weatherArea?.weatherCodes?.[2] || weatherArea?.weatherCodes?.[1] || "100",
    },
  };
}

function pickBestJmaArea(areas, targetForecastCode) {
  return areas.find((item) => item.area?.code === targetForecastCode)
    || areas.find((item) => item.area?.code === state.app.settings.selectedArea?.prefectureCode)
    || null;
}

function pickRepresentativeTempArea(areas, area) {
  const municipalityName = area.municipalityName?.replace(/（.*?）/g, "");
  return areas.find((item) => item.area?.name === municipalityName)
    || areas.find((item) => item.area?.name.includes(municipalityName || ""))
    || areas[0]
    || null;
}

function renderMonitorPage() {
  renderAreaSelectors();
  renderWeather();
  renderChecklist();
}

function renderAreaSelectors() {
  if (!state.areaData) {
    elements.prefectureSelect.innerHTML = `<option>地区数据加载失败</option>`;
    elements.municipalitySelect.innerHTML = `<option>地区数据加载失败</option>`;
    elements.prefectureSelect.disabled = true;
    elements.municipalitySelect.disabled = true;
    return;
  }
  const selectedArea = state.app.settings.selectedArea;
  elements.prefectureSelect.disabled = false;
  elements.municipalitySelect.disabled = false;
  elements.prefectureSelect.innerHTML = state.areaData.prefectures.map((prefecture) => `<option value="${prefecture.code}" ${prefecture.code === selectedArea.prefectureCode ? "selected" : ""}>${escapeHtml(prefecture.name)}</option>`).join("");
  const municipalities = state.areaData.municipalitiesByPrefecture[selectedArea.prefectureCode] || [];
  elements.municipalitySelect.innerHTML = municipalities.map((municipality) => `<option value="${municipality.code}" ${municipality.code === selectedArea.municipalityCode ? "selected" : ""}>${escapeHtml(municipality.name)}</option>`).join("");
}

function renderWeather() {
  if (state.isLoadingWeather) {
    elements.weatherError.classList.remove("hidden");
    elements.weatherError.textContent = "天气加载中...";
    elements.weatherGrid.classList.add("hidden");
    return;
  }
  if (state.weatherError || !state.weather) {
    elements.weatherError.classList.remove("hidden");
    elements.weatherError.textContent = state.weatherError || "天气加载失败，请稍后重试。";
    elements.weatherGrid.classList.add("hidden");
    return;
  }
  elements.weatherError.classList.add("hidden");
  elements.weatherGrid.classList.remove("hidden");
  fillWeatherCard(elements.todayCard, elements.todayAlert, elements.todayIcon, elements.todayTemp, elements.todayText, elements.todayRange, elements.todayBunny, state.weather.today);
  fillWeatherCard(elements.tomorrowCard, elements.tomorrowAlert, elements.tomorrowIcon, elements.tomorrowTemp, elements.tomorrowText, elements.tomorrowRange, elements.tomorrowBunny, state.weather.tomorrow);
}

function fillWeatherCard(cardNode, alertNode, iconNode, tempNode, textNode, rangeNode, bunnyNode, data) {
  const status = getTemperatureStatus(data.max, data.min);
  cardNode.className = `weather-card ${status.cardClass}`;
  alertNode.textContent = status.label;
  alertNode.className = `alert-badge ${status.badgeClass}`;
  iconNode.textContent = iconForWeather(data.weatherCode);
  tempNode.textContent = `${data.mainTemp}°C`;
  textNode.textContent = normalizeWeatherText(data.text);
  rangeNode.textContent = `最高 ${data.max}°C / 最低 ${data.min}°C`;
  bunnyNode.className = `bunny-sprite ${status.bunnyClass}`;
}

function getTemperatureStatus(max, min) {
  if (max > 27) return { label: "高温注意", badgeClass: "alert-badge--warm", bunnyClass: "bunny-sprite--hot", cardClass: "weather-card--hot" };
  if (min < 15) return { label: "低温注意", badgeClass: "alert-badge--cool", bunnyClass: "bunny-sprite--cold", cardClass: "weather-card--cold" };
  return { label: "常温状态", badgeClass: "alert-badge--normal", bunnyClass: "bunny-sprite--normal", cardClass: "weather-card--normal" };
}

function hydrateChecklistState() {
  const now = new Date();
  const currentPeriodKeys = {
    daily: getDailyPeriodKey(now),
    weekly: getWeeklyPeriodKey(now),
    biweekly: getBiWeeklyPeriodKey(now),
    bimonthly: getBiMonthlyPeriodKey(now),
  };
  state.app.checklistItems.forEach((item) => {
    const currentKey = getChecklistPeriodKey(item, currentPeriodKeys);
    const entry = state.app.checklist[item.id];
    if (!entry || entry.periodKey !== currentKey) {
      state.app.checklist[item.id] = { checked: false, periodKey: currentKey };
    }
  });
  const easterEggItem = getTodayEasterEggChecklistItem();
  if (easterEggItem) {
    const easterEggKey = getChecklistPeriodKey(easterEggItem, currentPeriodKeys);
    const easterEggEntry = state.app.checklist[easterEggItem.id];
    if (!easterEggEntry || easterEggEntry.periodKey !== easterEggKey) {
      state.app.checklist[easterEggItem.id] = { checked: false, periodKey: easterEggKey };
    }
  }
  saveState();
}

function renderChecklist() {
  hydrateChecklistState();
  const visibleItems = getTodayChecklistItems();
  const completed = visibleItems.filter((item) => state.app.checklist[item.id]?.checked).length;
  elements.checklistSummary.textContent = `已完成 ${completed} / ${visibleItems.length}`;
  renderChecklistStatusBunny(visibleItems, completed);
  if (!visibleItems.length) {
    elements.checklistList.innerHTML = `<div class="empty-inline">当前没有可显示的 checklist 条目</div>`;
    return;
  }
  elements.checklistList.innerHTML = visibleItems.map((item) => {
    const checked = Boolean(state.app.checklist[item.id]?.checked);
    return `
      <label class="checklist-item ${checked ? "checklist-item--done" : ""} ${state.checklistBurstId === item.id ? "checklist-item--animate" : ""}">
        <span class="checklist-check-wrap">
          <input type="checkbox" data-check-id="${item.id}" ${checked ? "checked" : ""}>
          <span class="checklist-bunny-burst" aria-hidden="true">${getChecklistBunnyBurstMarkup()}</span>
        </span>
        <div>
          <div class="checklist-item__title">${escapeHtml(item.label)}</div>
          <div class="checklist-item__meta">${formatChecklistMeta(item)}</div>
        </div>
        <div class="checklist-item__state">${checked ? "已完成" : "待完成"}</div>
      </label>
    `;
  }).join("");
  [...elements.checklistList.querySelectorAll("[data-check-id]")].forEach((input) => {
    input.addEventListener("change", () => {
      const entry = state.app.checklist[input.dataset.checkId];
      entry.checked = input.checked;
      state.checklistBurstId = input.checked ? input.dataset.checkId : "";
      saveState();
      renderChecklist();
      if (state.checklistBurstId) {
        window.setTimeout(() => {
          state.checklistBurstId = "";
          renderChecklist();
        }, 850);
      }
    });
  });
}

function getChecklistBunnyBurstMarkup() {
  return `
    <img class="checklist-bunny-image" src="ListClear.png" alt="">
  `;
}

function renderChecklistStatusBunny(visibleItems, completed) {
  const isAllDone = visibleItems.length === 0 || completed === visibleItems.length;
  const isLateInJapan = getJapanHour() >= 22;
  let statusClass = "bunny-sprite--checklist-done";
  if (!isAllDone) {
    statusClass = isLateInJapan ? "bunny-sprite--checklist-late" : "bunny-sprite--checklist-pending";
  }
  elements.checklistStatusBunny.className = `checklist-status-bunny bunny-sprite ${statusClass}`;
}

function getVisibleChecklistItems() {
  const businessDate = getBusinessDate();
  return state.app.checklistItems.filter((item) => {
    if (item.repeatable) return true;
    if (!item.startDate || !item.endDate) return false;
    return item.startDate <= businessDate && businessDate <= item.endDate;
  });
}

function getTodayChecklistItems() {
  const items = [...getVisibleChecklistItems()];
  const easterEggItem = getTodayEasterEggChecklistItem();
  if (easterEggItem) items.push(easterEggItem);
  return items;
}

function getTodayEasterEggChecklistItem() {
  const businessDate = getBusinessDate();
  return shouldShowEasterEggChecklist(businessDate) ? EASTER_EGG_CHECKLIST_ITEM : null;
}

function shouldShowEasterEggChecklist(dateKey) {
  if (dateKey === "2026-04-26" || dateKey === "2026-04-30") return true;
  if (dateKey < "2026-05-01") return false;
  const monthDates = ensureMonthlyEasterEggDates(getMonthKey(dateKey));
  return monthDates.includes(dateKey);
}

function ensureMonthlyEasterEggDates(monthKey) {
  if (state.app.specialChecklistDates[monthKey]?.length) {
    return state.app.specialChecklistDates[monthKey];
  }
  if (monthKey < "2026-05") return [];
  const generatedDates = generateMonthlyEasterEggDates(monthKey);
  state.app.specialChecklistDates[monthKey] = generatedDates;
  saveState();
  return generatedDates;
}

function generateMonthlyEasterEggDates(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const pool = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    pool.push(`${monthKey}-${String(day).padStart(2, "0")}`);
  }
  const selected = [];
  while (pool.length && selected.length < 2) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected.sort();
}

function openChecklistModal() {
  renderChecklistManager();
  startChecklistItemEdit(state.editingChecklistItemId || state.app.checklistItems[0]?.id || "");
  if (typeof elements.checklistModal.showModal === "function") {
    if (!elements.checklistModal.open) elements.checklistModal.showModal();
  } else {
    elements.checklistModal.setAttribute("open", "open");
  }
}

function closeChecklistModal() {
  if (typeof elements.checklistModal.close === "function") elements.checklistModal.close();
  else elements.checklistModal.removeAttribute("open");
}

function renderChecklistManager() {
  elements.checklistManageList.innerHTML = state.app.checklistItems.map((item) => `
    <button class="checklist-manage-item ${state.editingChecklistItemId === item.id ? "checklist-manage-item--active" : ""}" type="button" data-manage-id="${item.id}">
      ${escapeHtml(item.label || "未命名条目")}
      <span class="checklist-manage-item__meta">${describeChecklistItem(item)}</span>
    </button>
  `).join("");
  [...elements.checklistManageList.querySelectorAll("[data-manage-id]")].forEach((button) => {
    button.addEventListener("click", () => startChecklistItemEdit(button.dataset.manageId));
  });
}

function startChecklistItemEdit(itemId = "") {
  state.editingChecklistItemId = itemId;
  const item = state.app.checklistItems.find((entry) => entry.id === itemId);
  if (!item) {
    const today = getLocalDateString(new Date());
    elements.checklistItemLabel.value = "";
    elements.checklistItemRepeatable.checked = true;
    elements.checklistItemPeriod.value = "daily";
    elements.checklistItemStartDate.value = today;
    elements.checklistItemEndDate.value = today;
    elements.deleteChecklistItemButton.disabled = true;
  } else {
    elements.checklistItemLabel.value = item.label;
    elements.checklistItemRepeatable.checked = item.repeatable;
    elements.checklistItemPeriod.value = item.period || "daily";
    elements.checklistItemStartDate.value = item.startDate || "";
    elements.checklistItemEndDate.value = item.endDate || "";
    elements.deleteChecklistItemButton.disabled = false;
  }
  renderChecklistItemFormMode();
  renderChecklistManager();
}

function renderChecklistItemFormMode() {
  const repeatable = elements.checklistItemRepeatable.checked;
  elements.checklistRepeatableField.classList.toggle("hidden", !repeatable);
  elements.checklistDateRangeFields.classList.toggle("hidden", repeatable);
}

function onChecklistItemSave(event) {
  event.preventDefault();
  const label = elements.checklistItemLabel.value.trim();
  const repeatable = elements.checklistItemRepeatable.checked;
  const period = elements.checklistItemPeriod.value;
  const startDate = elements.checklistItemStartDate.value;
  const endDate = elements.checklistItemEndDate.value;
  if (!label) return;
  if (!repeatable && (!startDate || !endDate || startDate > endDate)) return;
  const id = state.editingChecklistItemId || createChecklistItemId();
  const nextItem = { id, label, repeatable, period: repeatable ? period : "", startDate: repeatable ? "" : startDate, endDate: repeatable ? "" : endDate };
  const index = state.app.checklistItems.findIndex((item) => item.id === id);
  if (index >= 0) state.app.checklistItems[index] = nextItem;
  else state.app.checklistItems.push(nextItem);
  state.editingChecklistItemId = id;
  saveState();
  hydrateChecklistState();
  renderChecklist();
  startChecklistItemEdit(id);
}

function onChecklistItemDelete() {
  if (!state.editingChecklistItemId) return;
  state.app.checklistItems = state.app.checklistItems.filter((item) => item.id !== state.editingChecklistItemId);
  delete state.app.checklist[state.editingChecklistItemId];
  state.editingChecklistItemId = "";
  saveState();
  hydrateChecklistState();
  renderChecklist();
  renderChecklistManager();
  startChecklistItemEdit(state.app.checklistItems[0]?.id || "");
}

function describeChecklistItem(item) {
  if (item.repeatable) {
    return { daily: "每日重复", weekly: "每周重复", biweekly: "每两周重复", bimonthly: "每两月重复" }[item.period] || "周期重复";
  }
  return `${item.startDate} - ${item.endDate}`;
}

function formatChecklistMeta(item) {
  const now = new Date();
  if (!item.repeatable) return `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
  switch (item.period) {
    case "daily":
      return `${formatDate(getLocalDateString(now))} 刷新`;
    case "weekly":
      return `本周 ${formatPeriodRange(getMonday(now), addDays(getMonday(now), 6))}`;
    case "biweekly": {
      const monday = getBiWeeklyStart(now);
      return `双周 ${formatPeriodRange(monday, addDays(monday, 13))}`;
    }
    case "bimonthly": {
      const start = getBiMonthlyStart(now);
      const end = new Date(start.getFullYear(), start.getMonth() + 2, 0);
      return `双月 ${formatPeriodRange(start, end)}`;
    }
    default:
      return "";
  }
}

function formatPeriodRange(start, end) {
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

function getDailyPeriodKey(date) {
  return getLocalDateString(shiftByResetHour(date));
}

function getWeeklyPeriodKey(date) {
  return getLocalDateString(getMonday(shiftByResetHour(date)));
}

function getBiWeeklyPeriodKey(date) {
  return getLocalDateString(getBiWeeklyStart(shiftByResetHour(date)));
}

function getBiMonthlyStart(date) {
  const shifted = shiftByResetHour(date);
  const firstOfMonth = new Date(shifted.getFullYear(), shifted.getMonth(), 1);
  const diffMonths = (firstOfMonth.getFullYear() - 2026) * 12 + firstOfMonth.getMonth();
  const bucket = Math.floor(diffMonths / 2);
  return new Date(2026, bucket * 2, 1);
}

function getBiMonthlyPeriodKey(date) {
  const start = getBiMonthlyStart(date);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
}

function getChecklistPeriodKey(item, currentPeriodKeys) {
  if (item.repeatable) return currentPeriodKeys[item.period] || currentPeriodKeys.daily;
  return `${item.startDate}_${item.endDate}`;
}

function shiftByResetHour(date) {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() - 4, shifted.getMinutes(), shifted.getSeconds(), shifted.getMilliseconds());
  return shifted;
}

function getMonday(date) {
  const target = new Date(date);
  const day = target.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  target.setDate(target.getDate() + diff);
  target.setHours(0, 0, 0, 0);
  return target;
}

function getBiWeeklyStart(date) {
  const monday = getMonday(date);
  const anchor = new Date(2026, 0, 5);
  const diffDays = Math.floor((monday - anchor) / 86400000);
  const bucket = Math.floor(diffDays / 14);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() + bucket * 14);
  return start;
}

function getBusinessDate() {
  return getLocalDateString(shiftByResetHour(new Date()));
}

function getMonthKey(dateKey) {
  return dateKey.slice(0, 7);
}

function getJapanHour() {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  return Number(hour);
}

function normalizeWeatherText(text) {
  return String(text || "天气未知").replace(/\s+/g, " ").trim();
}

function describeWeatherCode(code) {
  const map = {
    "100": "晴",
    "101": "晴时多云",
    "102": "晴一时雨",
    "103": "晴时有雨",
    "104": "晴一时雪",
    "110": "晴后阴",
    "111": "晴后多云",
    "200": "阴",
    "201": "阴时晴",
    "202": "阴一时雨",
    "203": "阴时有雨",
    "300": "雨",
    "301": "雨时晴",
    "302": "雨时止",
    "303": "雨时雪",
    "311": "雨后晴",
    "313": "雨后阴",
    "400": "雪",
    "401": "雪时晴",
    "402": "雪时止",
    "403": "雪时雨",
  };
  return map[String(code)] || "天气";
}

function iconForWeather(code) {
  const normalized = String(code);
  if (normalized.startsWith("1")) return "☀️";
  if (normalized.startsWith("2")) return "☁️";
  if (normalized.startsWith("3")) return "🌧️";
  if (normalized.startsWith("4")) return "❄️";
  return describeWeatherCode(code);
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = parseDateFromString(dateString);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function formatShortDate(dateString) {
  const date = parseDateFromString(dateString);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateFromString(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateFromString(value);
  return Number.isFinite(date.getTime()) && getLocalDateString(date) === value;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDelta(value) {
  return value > 0 ? `+${value}` : String(value);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createChecklistItemId() {
  return `check_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


