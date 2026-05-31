import { DEFAULT_ACTIVITY_TYPES, DEFAULT_TIME_BUTTONS } from "../data/initialState.js";

export const PROJECT_ARCHIVE_DAYS = 5;

export function uid() { return Math.random().toString(36).slice(2, 10); }

export function getActivityTypes(state) {
  return state.activityTypes?.length ? state.activityTypes : DEFAULT_ACTIVITY_TYPES;
}

export function getTimeButtons(state) {
  const btns = state.timeButtons?.filter(m => m > 0) || [];
  return btns.length ? [...btns].sort((a, b) => a - b) : DEFAULT_TIME_BUTTONS;
}

export function migrateSubactivitiesFromProjects(state) {
  const catalog = createEmptySubactivitiesMap(getActivityTypes(state));
  for (const project of state.projects) {
    if (!project.activities) continue;
    for (const activityName of getActivityTypes(state)) {
      const subs = project.activities[activityName]?.subactivities;
      if (subs?.length && !catalog[activityName].length) {
        catalog[activityName] = subs;
      }
    }
  }
  return catalog;
}

export function getSubactivitiesCatalog(state) {
  return state.subactivitiesByActivity ?? migrateSubactivitiesFromProjects(state);
}

export function getSubactivities(state, activityName) {
  return getSubactivitiesCatalog(state)[activityName] ?? [];
}

export function createEmptySubactivitiesMap(activityTypes) {
  return Object.fromEntries(activityTypes.map(name => [name, []]));
}

export function actSlug(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetweenDateKeys(fromDateKey, toDateKey) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((startOfLocalDay(toDateKey) - startOfLocalDay(fromDateKey)) / msPerDay);
}

export const RO_DAYS_SHORT = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];

export function getWeekDays(refDate = new Date()) {
  const d = new Date(refDate);
  const dow = d.getDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + toMonday);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

export function getWorkweekDays(refDate = new Date()) {
  return getWeekDays(refDate).slice(0, 5);
}

export function getProjectWorkweekDays(state, projectId, userId) {
  const todayKey = dateKeyLocal(new Date());
  const prefix = `${projectId}_`;
  const suffix = `_${userId}`;

  return getWorkweekDays().map((date) => {
    const dateKey = dateKeyLocal(date);
    let minutes = 0;
    for (const [key, entry] of Object.entries(state.timeLogs)) {
      if (!key.startsWith(prefix) || !key.endsWith(suffix)) continue;
      minutes += minutesOnDate(entry, dateKey);
    }
    return {
      dateKey,
      label: RO_DAYS_SHORT[date.getDay()],
      dayNum: date.getDate(),
      isToday: dateKey === todayKey,
      minutes,
    };
  });
}

export function formatDayLabel(d) {
  const key = dateKeyLocal(d);
  const todayKey = dateKeyLocal(new Date());
  const short = RO_DAYS_SHORT[d.getDay()];
  const dayNum = d.getDate();
  const month = d.toLocaleDateString("ro-RO", { month: "short" });
  if (key === todayKey) return `Azi · ${short} ${dayNum}`;
  return `${short} ${dayNum} ${month}`;
}

export function normalizeLog(entry) {
  if (entry == null) return {};
  if (typeof entry === "number") return { _legacy: entry };
  return entry;
}

export function getProjectLastLogDateKey(state, projectId) {
  const prefix = `${projectId}_`;
  let latest = null;

  for (const [key, entry] of Object.entries(state.timeLogs)) {
    if (!key.startsWith(prefix)) continue;
    const log = normalizeLog(entry);
    for (const dateKey of Object.keys(log)) {
      if (dateKey === "_legacy") continue;
      if (!latest || dateKey > latest) latest = dateKey;
    }
  }

  return latest;
}

export function getProjectArchiveReferenceDateKey(state, project) {
  return [getProjectLastLogDateKey(state, project.id), project.unarchivedAt, project.createdAt]
    .filter(Boolean)
    .sort()
    .at(-1) || null;
}

export function isProjectArchived(state, project, refDate = new Date()) {
  const referenceDateKey = getProjectArchiveReferenceDateKey(state, project);
  if (!referenceDateKey) return false;
  return daysBetweenDateKeys(referenceDateKey, dateKeyLocal(refDate)) >= PROJECT_ARCHIVE_DAYS;
}

export function totalLogMinutes(entry) {
  const log = normalizeLog(entry);
  return Object.values(log).reduce((a, b) => a + b, 0);
}

export function minutesOnDate(entry, dateStr) {
  const log = normalizeLog(entry);
  return log[dateStr] || 0;
}

export function adjustTimeLogEntry(existingEntry, deltaMinutes, dateKey = dateKeyLocal(new Date())) {
  if (deltaMinutes === 0) return existingEntry ?? {};

  if (typeof existingEntry === "number") {
    if (deltaMinutes < 0) {
      const legacy = Math.max(0, existingEntry + deltaMinutes);
      return legacy > 0 ? { _legacy: legacy } : {};
    }
    return { _legacy: existingEntry, [dateKey]: deltaMinutes };
  }

  if (existingEntry && typeof existingEntry === "object") {
    const todayMinutes = existingEntry[dateKey] || 0;
    const nextToday = Math.max(0, todayMinutes + deltaMinutes);
    const next = { ...existingEntry, [dateKey]: nextToday };
    if (nextToday === 0) delete next[dateKey];
    if (Object.keys(next).length === 0) return {};
    return next;
  }

  if (deltaMinutes < 0) return {};
  return { [dateKey]: deltaMinutes };
}

export function timeLogKey(projectId, activity, subId, userId) {
  return `${projectId}_${activity}_${subId}_${userId}`;
}

export function getProjectTotalMinutes(state, projectId, userId = null) {
  const prefix = `${projectId}_`;
  let total = 0;
  for (const [key, entry] of Object.entries(state.timeLogs)) {
    if (!key.startsWith(prefix)) continue;
    if (userId != null && !key.endsWith(`_${userId}`)) continue;
    total += totalLogMinutes(entry);
  }
  return total;
}

export function getProjectActivityTotalMinutes(state, projectId, activityName) {
  const prefix = `${projectId}_${activityName}_`;
  let total = 0;
  for (const [key, entry] of Object.entries(state.timeLogs)) {
    if (key.startsWith(prefix)) total += totalLogMinutes(entry);
  }
  return total;
}

export function buildAdminActivityMatrix(state, projectId, activityName, subactivities, workers) {
  const rows = workers.map(w => {
    const cells = subactivities.map(sub => totalLogMinutes(state.timeLogs[timeLogKey(projectId, activityName, sub.id, w.id)]));
    return { worker: w, cells, rowTotal: cells.reduce((a, b) => a + b, 0) };
  });
  const colTotals = subactivities.map((_, ci) => rows.reduce((s, r) => s + r.cells[ci], 0));
  const grandTotal = colTotals.reduce((a, b) => a + b, 0);
  return { rows, colTotals, grandTotal };
}

export function buildWorkerTimesheet(state, project, userId, visibleActivities) {
  const weekDays = getWorkweekDays();
  const dateKeys = weekDays.map(dateKeyLocal);
  const columns = weekDays.map((d, i) => ({
    date: dateKeys[i],
    label: formatDayLabel(d),
    head: `${RO_DAYS_SHORT[d.getDay()]} ${d.getDate()}`,
    isToday: dateKeys[i] === dateKeyLocal(new Date()),
  }));

  const groups = [];
  let projectTotal = 0;
  let legacyTotal = 0;

  for (const actName of visibleActivities) {
    const subs = getSubactivities(state, actName);
    const rows = [];

    if (subs.length === 0) {
      rows.push({ subId: null, subName: "—", dayMins: dateKeys.map(() => 0), rowTotal: 0, lineProjectTotal: 0 });
    } else {
      for (const sub of subs) {
        const entry = state.timeLogs[timeLogKey(project.id, actName, sub.id, userId)];
        const log = normalizeLog(entry);
        const lineProjectTotal = totalLogMinutes(entry);
        projectTotal += lineProjectTotal;
        legacyTotal += log._legacy || 0;
        const dayMins = dateKeys.map(dk => minutesOnDate(entry, dk));
        rows.push({
          subId: sub.id,
          subName: sub.name,
          dayMins,
          rowTotal: dayMins.reduce((a, b) => a + b, 0),
          lineProjectTotal,
        });
      }
    }
    groups.push({ activity: actName, actClass: actSlug(actName), rows });
  }

  const allRows = groups.flatMap(g => g.rows);
  const colTotals = dateKeys.map((_, ci) => allRows.reduce((s, r) => s + r.dayMins[ci], 0));
  const weekTotal = colTotals.reduce((a, b) => a + b, 0);

  return { groups, columns, colTotals, weekTotal, projectTotal, legacyTotal };
}

export function fmtTime(mins) {
  if (!mins) return "0 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function fmtCell(mins) {
  if (!mins) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h${m}m` : `${h}h`;
}
