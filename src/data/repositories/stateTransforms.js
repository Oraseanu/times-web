const PROJECT_SEED_VERSION = "archived-demo-v1";
const TIMELOG_SEED_VERSION = "weekly-collapse-demo-v1";
const SUBACTIVITY_SEED_VERSION = "electric-seven-v1";

function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function mergeSubactivitySeeds(savedSubactivities, defaultSubactivities) {
  const nextSubactivities = { ...(savedSubactivities ?? {}) };
  for (const [activityName, defaultItems] of Object.entries(defaultSubactivities ?? {})) {
    const currentItems = nextSubactivities[activityName] ?? [];
    const currentIds = new Set(currentItems.map(item => item.id));
    const missingItems = defaultItems.filter(item => !currentIds.has(item.id));
    nextSubactivities[activityName] = [...currentItems, ...missingItems];
  }
  return nextSubactivities;
}

export function normalizeState(saved, defaultState) {
  if (!saved || typeof saved !== "object") return defaultState;

  const projects = saved.projectSeedVersion === PROJECT_SEED_VERSION
    ? saved.projects ?? defaultState.projects
    : mergeProjectSeeds(saved.projects ?? defaultState.projects, defaultState.projects);
  const timeLogs = saved.timeLogSeedVersion === TIMELOG_SEED_VERSION
    ? saved.timeLogs ?? defaultState.timeLogs
    : mergeTimeLogSeeds(saved.timeLogs ?? {}, defaultState.timeLogs);
  const subactivitiesByActivity = saved.subactivitySeedVersion === SUBACTIVITY_SEED_VERSION
    ? saved.subactivitiesByActivity ?? defaultState.subactivitiesByActivity
    : mergeSubactivitySeeds(saved.subactivitiesByActivity, defaultState.subactivitiesByActivity);

  return {
    ...defaultState,
    ...saved,
    projectSeedVersion: PROJECT_SEED_VERSION,
    timeLogSeedVersion: TIMELOG_SEED_VERSION,
    subactivitySeedVersion: SUBACTIVITY_SEED_VERSION,
    timeButtons: saved.timeButtons ?? defaultState.timeButtons,
    activityTypes: saved.activityTypes ?? defaultState.activityTypes,
    subactivitiesByActivity,
    favoriteSubactivities: saved.favoriteSubactivities ?? defaultState.favoriteSubactivities,
    pinnedWorkProjects: saved.pinnedWorkProjects ?? defaultState.pinnedWorkProjects,
    users: normalizeUsers(saved.users ?? defaultState.users),
    settings: {
      ...defaultState.settings,
      ...(saved.settings ?? {}),
    },
    projects: normalizeProjects(projects),
    timeLogs,
  };
}
