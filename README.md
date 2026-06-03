# TimeS Web - arhitectura proiectului

## Prezentare

`times-web` este o aplicatie web de pontaj si management de proiecte construita cu React si Vite. Aplicatia ruleaza in browser, fara backend, baza de date sau API extern. Datele initiale pornesc din module locale, iar modificarile facute in interfata sunt tinute in state React si salvate in `localStorage`.

Functional, aplicatia acopera:

- autentificare demo pentru administrator si workeri;
- lista de proiecte active si arhivate;
- pontaj pe proiect, activitate, subactivitate, utilizator si zi;
- vizualizare diferita pentru administrator si worker;
- administrare workeri;
- configurare activitati, subactivitati si butoane rapide de timp.

## Stack tehnic

- React `19.1.0` pentru UI si state local.
- React DOM `19.1.0` pentru randarea aplicatiei in browser.
- Vite `6.3.5` pentru server de dezvoltare, build si preview.
- `@vitejs/plugin-react` pentru suport React in Vite.
- JavaScript ES modules, configurat prin `"type": "module"` in `package.json`.

## Structura proiectului

```text
times-web/
|-- index.html
|-- package.json
|-- package-lock.json
|-- vite.config.js
|-- src/
|   |-- App.jsx
|   |-- main.jsx
|   |-- data/
|   |   `-- initialState.js
|   |-- state/
|   |   `-- persistence.js
|   |-- styles/
|   |   `-- app.css
|   `-- utils/
|       `-- timeTracking.js
|-- test/
|   `-- timeTracking.test.js
`-- README.md
```

Componenta principala este acum in interiorul proiectului, in `src/App.jsx`. Fisierul vechi `F:\ELECTRICIAN\TimeS.jsx` nu mai este folosit de entrypoint-ul Vite.

## Puncte de intrare

### `index.html`

Defineste documentul HTML minim si containerul React:

- seteaza limba paginii la romana prin `lang="ro"`;
- expune elementul `<div id="root"></div>`;
- incarca entrypoint-ul Vite `/src/main.jsx`.

### `src/main.jsx`

Este entrypoint-ul React:

- importa `StrictMode` din React;
- importa `createRoot` din `react-dom/client`;
- importa componenta `App` din `./App.jsx`;
- monteaza aplicatia in elementul `#root`.

### `vite.config.js`

Configureaza Vite cu pluginul React:

- `plugins: [react()]`;
- `server: { open: true }`, astfel incat serverul de development incearca sa deschida automat browserul.

## Componenta principala

Fisierul `src/App.jsx` contine componenta principala, contextul global si componentele de ecran:

- contextul global;
- componentele de ecran;
- logica de autentificare si navigatie interna;
- legatura dintre state, persistenta si UI.

Logica comuna a fost extrasa in module dedicate:

- `src/data/initialState.js`: date initiale si valori implicite;
- `src/data/repositories/`: repository-urile pentru demo, local si cloud;
- `src/config/environment.js`: configuratia derivata din variabile de mediu;
- `src/utils/timeTracking.js`: helper-e pentru activitati, date calendaristice, pontaje si totaluri;
- `src/styles/app.css`: stilurile aplicatiei;
- `test/timeTracking.test.js`: teste pentru calculul pontajelor si totalurilor.

## Modelul de stare

Starea globala porneste din `initialState`, este incarcata prin repository-ul injectat in `App` si este tinuta cu `useState` in componenta `App`.

Principalele zone de date sunt:

- `timeButtons`: valorile butoanelor rapide de pontaj, implicit `5`, `30`, `60` minute;
- `activityTypes`: lista activitatilor disponibile, de exemplu `Electric`, `Instalatii`, `Tamplarie`, `Administrativ`;
- `subactivitiesByActivity`: catalogul de subactivitati pentru fiecare tip de activitate;
- `users`: utilizatorii demo, cu roluri `admin` sau `worker`;
- `projects`: proiectele disponibile;
- `timeLogs`: pontajele pe proiect, activitate, subactivitate, utilizator si data.

Pe langa `state`, componenta `App` mai tine local:

- `currentUser`: utilizatorul autentificat;
- `view`: ecranul curent;
- `selectedProject`: proiectul selectat;
- `selectedActivity`: activitatea selectata;
- `notification`: mesaj temporar de feedback;
- `confirmDialog`: dialog de confirmare pentru actiuni destructive.

## Context global

Aplicatia foloseste `AppContext`, creat cu `createContext(null)`.

`AppContext.Provider` expune catre componente:

- `state` si `setState`;
- utilizatorul curent;
- functiile `login` si `logout`;
- navigatia interna prin `view` si `setView`;
- selectiile curente pentru proiect si activitate;
- utilitare UI precum `notify` si `confirm`.

Aceasta abordare inlocuieste un router sau un store separat. Navigatia este in continuare controlata prin valoarea string `view`, deoarece numarul de ecrane este inca redus si nu necesita o dependenta de routing.

## Navigatie si ecrane

Nu exista React Router. Componenta `Shell` decide ce ecran se afiseaza in functie de `view`.

Ecranele principale sunt:

- `LoginPage`: formular de autentificare demo;
- `Dashboard`: lista proiectelor si sumarul timpului;
- `ProjectView`: detalii proiect si lista de activitati;
- `ActivityView`: subactivitati si controale de pontaj;
- `WorkersView`: administrarea workerilor;
- `NewProjectForm`: formular pentru proiect nou;
- `NewWorkerForm`: formular pentru worker nou;
- `ConfigView`: configurarea activitatilor, subactivitatilor si butoanelor de timp.

`Shell` afiseaza si navigatia laterala, plus informatiile despre utilizatorul curent.

## Roluri

Aplicatia separa comportamentul pe doua roluri:

- `admin`: poate vedea totaluri de echipa, poate crea/sterge proiecte, poate administra workeri si configurari;
- `worker`: vede proiectele si pontajele relevante pentru propria activitate si propriul utilizator.

Rolul este citit din `currentUser.role`.

## Proiecte active si arhivate

Dashboard-ul imparte proiectele in doua sectiuni:

- `Active`: proiectele care au avut pontaj recent sau au fost create/dezarhivate recent;
- `Arhivate`: proiectele pentru care nu s-a inregistrat niciun pontaj timp de 5 zile.

Arhivarea este calculata automat in `src/utils/timeTracking.js`, prin `isProjectArchived`. Reperul folosit este cea mai recenta data dintre:

- ultimul pontaj inregistrat pe proiect;
- data ultimei dezarhivari manuale;
- data crearii proiectului.

Orice utilizator autentificat poate dezarhiva un proiect arhivat din cardul proiectului. Dezarhivarea seteaza `unarchivedAt` la data curenta, iar proiectul ramane activ pana cand trec din nou 5 zile fara pontaj.

## Pontaj si chei de date

Pontajele sunt salvate in `state.timeLogs`.

Cheia unui pontaj este generata prin:

```js
timeLogKey(projectId, activity, subId, userId)
```

Formatul rezultat este:

```text
projectId_activity_subId_userId
```

Valoarea asociata unei chei poate fi:

- un numar, pentru date vechi/legacy;
- un obiect cu minute pe data, de forma:

```js
{
  "YYYY-MM-DD": minutes,
  "_legacy": minutes
}
```

Helper-ele relevante pentru pontaj sunt:

- `adjustTimeLogEntry`: adauga sau scade minute pentru o data;
- `normalizeLog`: normalizeaza formatul vechi si cel nou;
- `minutesOnDate`: extrage minutele pentru o zi;
- `totalLogMinutes`: calculeaza totalul unei intrari;
- `getProjectTotalMinutes`: total pe proiect;
- `getProjectActivityTotalMinutes`: total pe proiect si activitate;
- `buildWorkerTimesheet`: construieste tabelul saptamanal pentru worker;
- `buildAdminActivityMatrix`: construieste matricea de timp pentru administrator.

## Date calendaristice

Aplicatia lucreaza cu date locale:

- `dateKeyLocal` produce formatul `YYYY-MM-DD`;
- `getWeekDays` calculeaza saptamana curenta de luni pana duminica;
- `getWorkweekDays` limiteaza afisarea la luni-vineri;
- `formatDayLabel` produce etichete prietenoase pentru UI.

## Stilizare

Stilurile sunt definite in `src/styles/app.css` si sunt importate in `src/App.jsx` prin:

```js
import "./styles/app.css";
```

Nu sunt folosite CSS Modules, Tailwind sau alte solutii externe de styling.

## Persistenta si backend

Aplicatia foloseste un strat de repository pentru persistenta, injectat la pornire in functie de variabilele de mediu.

`APP_MODE` poate avea valorile:

- `demo`: foloseste `MemoryStateRepository`, cu date doar in memorie, fara persistenta intre refresh-uri;
- `local_prod`: foloseste un API local configurat prin `LOCAL_API_BASE_URL`, sau `localStorage` ca fallback daca URL-ul lipseste;
- `cloud_prod`: foloseste un API remote configurat prin `CLOUD_API_BASE_URL`.

Repository-urile expun aceleasi metode:

```js
loadState(defaultState)
saveState(state)
```

Pentru `local_prod` si `cloud_prod`, contractul API este:

```text
GET /state
PUT /state
```

Backend-ul concret poate salva datele intr-o baza locala, intr-un fisier SQLite sau intr-o baza cloud, fara sa schimbe codul UI.

Pentru `local_prod`, proiectul include si un API local minimal, fara dependinte externe:

```bash
npm run local-api
```

Acesta expune `GET /state` si `PUT /state` si salveaza datele in `LOCAL_DB_FILE`, implicit `local-db/state.json`. Folderul `local-db/` este ignorat de Git.

Configuratia se copiaza din `.env.example` intr-un fisier local `.env`, care nu se urca in Git.

Pentru rulare in reteaua Wi-Fi a unei cladiri, seteaza de exemplu:

```env
APP_MODE=local_prod
VITE_HOST=0.0.0.0
VITE_PORT=5173
LOCAL_API_BASE_URL=http://IP-UL-SERVERULUI:8787
LOCAL_API_HOST=0.0.0.0
LOCAL_API_PORT=8787
LOCAL_DB_FILE=local-db/state.json
```

## Comenzi disponibile

Instalare dependinte:

```bash
npm install
```

Pornire server de dezvoltare:

```bash
npm run dev
```

Build de productie:

```bash
npm run build
```

Preview pentru build:

```bash
npm run preview
```

Pornire API local:

```bash
npm run local-api
```

Deploy API cloud Cloudflare Worker:

```bash
npm run cloud-api:deploy
```

Aplicare migrari cloud D1:

```bash
npm run cloud-db:migrate
```

Rulare teste:

```bash
npm run test
```

Ghidul complet pentru Cloudflare Pages + Worker + D1 este in `docs/CLOUD_DEPLOY.md`.

## Directii recomandate de evolutie

Imbunatatirile de baza au fost aplicate:

- `TimeS.jsx` a fost mutat functional in `src/App.jsx`;
- aplicatia este impartita in `data/`, `state/`, `styles/`, `utils/` si `test/`;
- helper-ele de timp si pontaj sunt in `src/utils/timeTracking.js`;
- starea se salveaza local prin `localStorage`;
- calculele de pontaj si totaluri au teste automate.

Pentru etape viitoare, un router dedicat poate fi introdus daca navigatia devine mai complexa sau daca apar URL-uri separate pentru ecrane.
