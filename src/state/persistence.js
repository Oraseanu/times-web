const STORAGE_KEY = "times-web-state";
const PROJECT_SEED_VERSION = "archived-demo-v1";
const TIMELOG_SEED_VERSION = "weekly-collapse-demo-v1";

function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadState(defaultState) {
  const storage = getStorage();
  if (!storage) return defaultState;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const saved = JSON.parse(raw);
    const projects = saved.projectSeedVersion === PROJECT_SEED_VERSION
      ? saved.projects ?? defaultState.projects
      : mergeProjectSeeds(saved.projects ?? defaultState.projects, defaultState.projects);
    const timeLogs = saved.timeLogSeedVersion === TIMELOG_SEED_VERSION
      ? saved.timeLogs ?? defaultState.timeLogs
      : mergeTimeLogSeeds(saved.timeLogs ?? {}, defaultState.timeLogs);
    return {
      ...defaultState,
      ...saved,
      projectSeedVersion: PROJECT_SEED_VERSION,
      timeLogSeedVersion: TIMELOG_SEED_VERSION,
      timeButtons: saved.timeButtons ?? defaultState.timeButtons,
      activityTypes: saved.activityTypes ?? defaultState.activityTypes,
      subactivitiesByActivity: saved.subactivitiesByActivity ?? defaultState.subactivitiesByActivity,
      favoriteSubactivities: saved.favoriteSubactivities ?? defaultState.favoriteSubactivities,
      users: normalizeUsers(saved.users ?? defaultState.users),
      settings: {
        ...defaultState.settings,
        ...(saved.settings ?? {}),
      },
      projects: normalizeProjects(projects),
      timeLogs,
    };
  } catch (error) {
    console.warn("Nu s-a putut incarca starea salvata.", error);
    return defaultState;
  }
}

function normalizeUsers(users) {
  const today = dateKeyLocal(new Date());
  return users.map(user => ({
    ...user,
    createdAt: user.createdAt ?? today,
    email: user.email ?? "",
    photo: user.photo ?? "",
  }));
}

function normalizeProjects(projects) {
  const today = dateKeyLocal(new Date());
  return projects.map(project => ({
    ...project,
    createdAt: project.createdAt ?? today,
  }));
}

function mergeProjectSeeds(savedProjects, defaultProjects) {
  const existingIds = new Set(savedProjects.map(project => project.id));
  const missingSeeds = defaultProjects.filter(project => !existingIds.has(project.id));
  return [...savedProjects, ...missingSeeds];
}

function mergeTimeLogSeeds(savedLogs, defaultLogs) {
  const nextLogs = { ...savedLogs };
  for (const [key, entry] of Object.entries(defaultLogs)) {
    nextLogs[key] = {
      ...(entry && typeof entry === "object" ? entry : {}),
      ...(nextLogs[key] && typeof nextLogs[key] === "object" ? nextLogs[key] : {}),
    };
  }
  return nextLogs;
}

export function saveState(state) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Nu s-a putut salva starea aplicatiei.", error);
  }
}
