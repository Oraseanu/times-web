import { normalizeState } from "./stateTransforms.js";

export class MemoryStateRepository {
  constructor() {
    this.state = null;
  }

  async loadState(defaultState) {
    if (!this.state) {
      this.state = structuredClone(defaultState);
    }
    return normalizeState(this.state, defaultState);
  }

  async saveState(state) {
    this.state = structuredClone(state);
  }
}
