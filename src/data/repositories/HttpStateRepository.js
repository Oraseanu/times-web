import { normalizeState } from "./stateTransforms.js";

export class HttpStateRepository {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl?.replace(/\/$/, "");
  }

  async loadState(defaultState) {
    if (!this.baseUrl) {
      console.warn("Nu exista API configurat pentru repository.");
      return defaultState;
    }

    try {
      const response = await fetch(`${this.baseUrl}/state`);
      if (response.status === 404) return defaultState;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return normalizeState(await response.json(), defaultState);
    } catch (error) {
      console.warn("Nu s-a putut incarca starea din API.", error);
      return defaultState;
    }
  }

  async saveState(state) {
    if (!this.baseUrl) return;

    try {
      const response = await fetch(`${this.baseUrl}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.warn("Nu s-a putut salva starea in API.", error);
    }
  }
}
