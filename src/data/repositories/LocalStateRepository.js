import { normalizeState } from "./stateTransforms.js";

const STORAGE_KEY = "times-web-state";

function getStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export class LocalStateRepository {
  async loadState(defaultState) {
    const storage = getStorage();
    if (!storage) return defaultState;

    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return defaultState;
      return normalizeState(JSON.parse(raw), defaultState);
    } catch (error) {
      console.warn("Nu s-a putut incarca starea locala.", error);
      return defaultState;
    }
  }

  async saveState(state) {
    const storage = getStorage();
    if (!storage) return;

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Nu s-a putut salva starea locala.", error);
    }
  }
}
