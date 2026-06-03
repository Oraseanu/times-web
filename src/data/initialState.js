export const DEFAULT_ACTIVITY_TYPES = ["Electric", "Instalatii", "Tamplarie", "Administrativ"];
export const DEFAULT_TIME_BUTTONS = [5, 30, 60];

const initialSubactivitiesByActivity = {
  Electric: [
    { id: "s1", name: "Tablou electric" },
    { id: "s2", name: "Prize și întrerupătoare" },
    { id: "s5", name: "Trasee cabluri" },
    { id: "s6", name: "Montaj corpuri iluminat" },
    { id: "s7", name: "Doze și conexiuni" },
    { id: "s8", name: "Verificări și măsurători" },
    { id: "s9", name: "Punere în funcțiune" },
  ],
  Instalatii: [{ id: "s3", name: "Țevi apă rece" }],
  Tamplarie: [],
  Administrativ: [{ id: "s4", name: "Ședință de coordonare" }],
};

export const initialState = {
  timeButtons: [...DEFAULT_TIME_BUTTONS],
  activityTypes: [...DEFAULT_ACTIVITY_TYPES],
  subactivitiesByActivity: { ...initialSubactivitiesByActivity },
  users: [
    { id: "u1", username: "admin", password: "admin123", role: "admin", name: "Administrator", email: "", createdAt: "2026-05-01" },
    { id: "u2", username: "ion", password: "worker123", role: "worker", name: "Ion Popescu", email: "ion@example.com", activity: "Electric", createdAt: "2026-05-03" },
    { id: "u3", username: "maria", password: "worker123", role: "worker", name: "Maria Ionescu", email: "maria@example.com", activity: "Instalatii", createdAt: "2026-05-10" },
  ],
  settings: {
    companyName: "",
  },
  favoriteSubactivities: {},
  pinnedWorkProjects: {},
  projects: [
    { id: "p1", name: "Renovare Birouri", client: "SC Alpha SRL", createdAt: "2026-05-25" },
    { id: "p-demo-arch-1", name: "Modernizare Tablouri Nord", client: "SC Beta Instal SRL", createdAt: "2026-05-08" },
    { id: "p-demo-arch-2", name: "Revizie Iluminat Depozit", client: "Logistic Park SA", createdAt: "2026-05-12" },
    { id: "p-demo-arch-3", name: "Extindere Prize Atelier", client: "Atelier Metal Pro", createdAt: "2026-05-15" },
  ],
  // timeLogs[key]: number (vechi) sau { "YYYY-MM-DD": minutes, _legacy?: minutes }
  timeLogs: {
    p1_Electric_s1_u2: {
      "2026-05-04": 120,
      "2026-05-05": 180,
      "2026-05-06": 240,
      "2026-05-12": 300,
      "2026-05-13": 120,
      "2026-05-19": 240,
      "2026-05-20": 180,
      "2026-05-25": 240,
      "2026-05-26": 180,
    },
    p1_Electric_s2_u2: {
      "2026-05-05": 180,
      "2026-05-07": 240,
      "2026-05-14": 300,
      "2026-05-15": 120,
      "2026-05-21": 240,
      "2026-05-22": 180,
      "2026-05-26": 120,
      "2026-05-27": 240,
    },
    p1_Administrativ_s4_u2: {
      "2026-05-09": 60,
      "2026-05-16": 90,
      "2026-05-23": 60,
      "2026-05-27": 60,
    },
  },
};
