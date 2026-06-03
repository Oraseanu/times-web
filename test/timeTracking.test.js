import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/data/initialState.js";
import { normalizeState } from "../src/data/repositories/stateTransforms.js";
import {
  adjustTimeLogEntry,
  buildAdminActivityMatrix,
  buildWorkerTimesheet,
  getProjectTotalMinutes,
  isProjectArchived,
  timeLogKey,
  totalLogMinutes,
} from "../src/utils/timeTracking.js";

test("adjustTimeLogEntry adauga si scade minute pe aceeasi data", () => {
  const entry = adjustTimeLogEntry(undefined, 30, "2026-05-25");
  assert.deepEqual(entry, { "2026-05-25": 30 });

  const increased = adjustTimeLogEntry(entry, 15, "2026-05-25");
  assert.deepEqual(increased, { "2026-05-25": 45 });

  const decreased = adjustTimeLogEntry(increased, -20, "2026-05-25");
  assert.deepEqual(decreased, { "2026-05-25": 25 });
});

test("adjustTimeLogEntry nu permite valori negative", () => {
  const entry = adjustTimeLogEntry({ "2026-05-25": 10 }, -60, "2026-05-25");
  assert.deepEqual(entry, {});
});

test("totalLogMinutes pastreaza compatibilitatea cu intrarile legacy", () => {
  assert.equal(totalLogMinutes(45), 45);
  assert.equal(totalLogMinutes({ _legacy: 20, "2026-05-25": 30 }), 50);
});

test("getProjectTotalMinutes calculeaza totalul pe proiect si optional pe utilizator", () => {
  const state = {
    ...initialState,
    timeLogs: {
      [timeLogKey("p1", "Electric", "s1", "u2")]: { "2026-05-25": 30 },
      [timeLogKey("p1", "Electric", "s2", "u3")]: { "2026-05-25": 45 },
      [timeLogKey("p2", "Electric", "s1", "u2")]: { "2026-05-25": 60 },
    },
  };

  assert.equal(getProjectTotalMinutes(state, "p1"), 75);
  assert.equal(getProjectTotalMinutes(state, "p1", "u2"), 30);
});

test("buildAdminActivityMatrix produce totaluri pe randuri si coloane", () => {
  const workers = [
    { id: "u2", name: "Ion" },
    { id: "u3", name: "Maria" },
  ];
  const subactivities = [
    { id: "s1", name: "Tablou electric" },
    { id: "s2", name: "Prize" },
  ];
  const state = {
    ...initialState,
    timeLogs: {
      [timeLogKey("p1", "Electric", "s1", "u2")]: { "2026-05-25": 30 },
      [timeLogKey("p1", "Electric", "s2", "u2")]: { "2026-05-25": 15 },
      [timeLogKey("p1", "Electric", "s1", "u3")]: { "2026-05-25": 45 },
    },
  };

  const matrix = buildAdminActivityMatrix(state, "p1", "Electric", subactivities, workers);

  assert.deepEqual(matrix.rows.map((row) => row.rowTotal), [45, 45]);
  assert.deepEqual(matrix.colTotals, [75, 15]);
  assert.equal(matrix.grandTotal, 90);
});

test("buildWorkerTimesheet include totalul proiectului pentru worker", () => {
  const state = {
    ...initialState,
    timeLogs: {
      [timeLogKey("p1", "Electric", "s1", "u2")]: { "2026-05-25": 30 },
      [timeLogKey("p1", "Electric", "s2", "u2")]: { "2026-05-25": 15 },
      [timeLogKey("p1", "Instalatii", "s3", "u2")]: { "2026-05-25": 60 },
    },
  };
  const project = { id: "p1", name: "Renovare Birouri" };

  const timesheet = buildWorkerTimesheet(state, project, "u2", ["Electric"]);

  assert.equal(timesheet.projectTotal, 45);
  assert.equal(timesheet.groups.length, 1);
  assert.equal(timesheet.groups[0].rows.length, 7);
});

test("normalizeState completeaza subactivitatile Electric implicite in starile vechi", () => {
  const saved = {
    ...initialState,
    subactivitySeedVersion: "old",
    subactivitiesByActivity: {
      ...initialState.subactivitiesByActivity,
      Electric: initialState.subactivitiesByActivity.Electric.slice(0, 2),
    },
  };

  const normalized = normalizeState(saved, initialState);

  assert.equal(normalized.subactivitiesByActivity.Electric.length, 7);
  assert.deepEqual(
    normalized.subactivitiesByActivity.Electric.map(item => item.name),
    initialState.subactivitiesByActivity.Electric.map(item => item.name),
  );
});

test("isProjectArchived arhiveaza proiectul dupa 5 zile fara pontaj", () => {
  const state = {
    ...initialState,
    projects: [{ id: "p1", name: "Renovare Birouri", client: "SC Alpha SRL", createdAt: "2026-05-20" }],
    timeLogs: {
      [timeLogKey("p1", "Electric", "s1", "u2")]: { "2026-05-20": 30 },
    },
  };

  assert.equal(isProjectArchived(state, state.projects[0], new Date(2026, 4, 24)), false);
  assert.equal(isProjectArchived(state, state.projects[0], new Date(2026, 4, 25)), true);
});

test("isProjectArchived foloseste dezarhivarea manuala ca reper nou", () => {
  const state = {
    ...initialState,
    projects: [{ id: "p1", name: "Renovare Birouri", client: "SC Alpha SRL", createdAt: "2026-05-10", unarchivedAt: "2026-05-24" }],
    timeLogs: {},
  };

  assert.equal(isProjectArchived(state, state.projects[0], new Date(2026, 4, 25)), false);
  assert.equal(isProjectArchived(state, state.projects[0], new Date(2026, 4, 29)), true);
});

test("isProjectArchived foloseste cel mai recent pontaj peste data dezarhivarii", () => {
  const state = {
    ...initialState,
    projects: [{ id: "p1", name: "Renovare Birouri", client: "SC Alpha SRL", createdAt: "2026-05-10", unarchivedAt: "2026-05-12" }],
    timeLogs: {
      [timeLogKey("p1", "Electric", "s1", "u2")]: { "2026-05-23": 30 },
    },
  };

  assert.equal(isProjectArchived(state, state.projects[0], new Date(2026, 4, 27)), false);
  assert.equal(isProjectArchived(state, state.projects[0], new Date(2026, 4, 28)), true);
});

test("isProjectArchived tine cont de dezarhivare cand pontajul este mai vechi", () => {
  const state = {
    ...initialState,
    projects: [{ id: "p1", name: "Renovare Birouri", client: "SC Alpha SRL", createdAt: "2026-05-10", unarchivedAt: "2026-05-24" }],
    timeLogs: {
      [timeLogKey("p1", "Electric", "s1", "u2")]: { "2026-05-15": 30 },
    },
  };

  assert.equal(isProjectArchived(state, state.projects[0], new Date(2026, 4, 25)), false);
  assert.equal(isProjectArchived(state, state.projects[0], new Date(2026, 4, 29)), true);
});
