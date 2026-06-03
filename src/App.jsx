import { useEffect, useRef, useState, createContext, useContext } from "react";
import "./styles/app.css";
import { initialState } from "./data/initialState.js";
import {
  actSlug,
  adjustTimeLogEntry,
  buildAdminActivityMatrix,
  buildWorkerTimesheet,
  createEmptySubactivitiesMap,
  dateKeyLocal,
  fmtCell,
  fmtTime,
  getActivityTypes,
  getProjectArchiveReferenceDateKey,
  getProjectActivityTotalMinutes,
  getProjectTotalMinutes,
  getProjectWorkweekDays,
  getSubactivities,
  getSubactivitiesCatalog,
  getTimeButtons,
  isProjectArchived,
  minutesOnDate,
  RO_DAYS_SHORT,
  timeLogKey,
  totalLogMinutes,
  uid,
} from "./utils/timeTracking.js";

const AppContext = createContext(null);
function ConfirmDialog({ message, onYes, onNo }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div style={{background:"#16181f",border:"1px solid #2a2d38",borderRadius:12,padding:"28px 32px",maxWidth:380,width:"90%",boxShadow:"0 24px 64px rgba(0,0,0,.5)"}}>
        <p style={{fontSize:15,marginBottom:24,lineHeight:1.5,color:"#e8eaf0"}}>{message}</p>
        <div style={{display:"flex",justifyContent:"flex-end",gap:12}}>
          <button onClick={onNo} style={{padding:"9px 16px",background:"transparent",border:"1px solid #2a2d38",borderRadius:8,color:"#8b8fa8",fontFamily:"inherit",fontSize:14,cursor:"pointer"}}>Anuleaza</button>
          <button onClick={onYes} style={{padding:"9px 16px",background:"#e05252",border:"none",borderRadius:8,color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer"}}>Șterge</button>
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ user, size = "" }) {
  return (
    <div className={`user-avatar ${size}`}>
      {user?.photo ? <img src={user.photo} alt="" /> : user?.name?.[0]}
    </div>
  );
}

function formatTenure(createdAt) {
  if (!createdAt) return "Necunoscuta";
  const start = new Date(`${createdAt}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "Necunoscuta";
  const today = new Date();
  const days = Math.max(0, Math.floor((today - start) / (24 * 60 * 60 * 1000)));
  if (days < 30) return `${days} zile`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} luni`;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  return restMonths ? `${years} ani și ${restMonths} luni` : `${years} ani`;
}

export default function App({ repository }) {
  const [state, setState] = useState(initialState);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("login");
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    let active = true;
    repository.loadState(initialState).then(loadedState => {
      if (!active) return;
      setState(loadedState);
      setIsStateLoaded(true);
    });
    return () => { active = false; };
  }, [repository]);

  useEffect(() => {
    if (!isStateLoaded) return;
    repository.saveState(state);
  }, [isStateLoaded, repository, state]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [view, selectedProject, selectedActivity, selectedWorker]);

  function notify(msg, type = "success") {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }
  function confirm(message, onYes) { setConfirmDialog({ message, onYes }); }
  function login(username, password) {
    const user = state.users.find(u => u.username === username && u.password === password);
    if (user) { setCurrentUser(user); setView("dashboard"); return true; }
    return false;
  }
  function logout() { setCurrentUser(null); setView("login"); setSelectedProject(null); setSelectedActivity(null); setSelectedWorker(null); }

  const activeUser = currentUser ? state.users.find(u => u.id === currentUser.id) ?? currentUser : null;
  const ctx = { state, setState, currentUser: activeUser, setCurrentUser, login, logout, view, setView, selectedProject, setSelectedProject, selectedActivity, setSelectedActivity, selectedWorker, setSelectedWorker, notify, confirm };

  return (
    <AppContext.Provider value={ctx}>
      {notification && <div className={`notif notif-${notification.type}`}>{notification.msg}</div>}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onYes={() => { confirmDialog.onYes(); setConfirmDialog(null); }}
          onNo={() => setConfirmDialog(null)}
        />
      )}
      {view === "login" && <LoginPage />}
      {view !== "login" && (
        <>
          <Shell />
          <MobileBottomNav />
        </>
      )}
    </AppContext.Provider>
  );
}

function Shell() {
  const { currentUser, view, setView, logout, setSelectedProject, setSelectedWorker } = useContext(AppContext);
  const isAdmin = currentUser?.role === "admin";
  function goDashboard() {
    setView("dashboard");
    setSelectedProject(null);
    setSelectedWorker(null);
  }
  function goProfile() {
    setView("profile");
    setSelectedProject(null);
    setSelectedWorker(null);
  }
  function goWorkers() {
    setView("workers");
    setSelectedProject(null);
    setSelectedWorker(null);
  }
  function goConfig() {
    setView("config");
    setSelectedProject(null);
    setSelectedWorker(null);
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-mark">PM</span>
          <span className="logo-text">ProjectManager</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${view === "dashboard" ? "active" : ""}`} onClick={goDashboard}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Proiecte
          </button>
          <button className={`nav-item ${view === "profile" ? "active" : ""}`} onClick={goProfile}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
            Profil
          </button>
          {isAdmin && (
            <button className={`nav-item ${["workers", "workerProjects", "workerProjectTimesheet"].includes(view) ? "active" : ""}`} onClick={goWorkers}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>
              Workeri
            </button>
          )}
          {isAdmin && (
            <button className={`nav-item ${view === "config" ? "active" : ""}`} onClick={goConfig}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              Configurare
            </button>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <UserAvatar user={currentUser} />
            <div>
              <div className="user-name">{currentUser?.name}</div>
              <div className="user-role">{currentUser?.role === "admin" ? "Administrator" : `Worker · ${currentUser?.activity}`}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>
      <main className="main-content">
        {view === "dashboard" && <Dashboard />}
        {view === "profile" && <ProfileView />}
        {view === "project" && <ProjectView />}
        {view === "todayTime" && <TodayTimeView />}
        {view === "workers" && <WorkersView />}
        {view === "workerProjects" && <WorkerProjectsView />}
        {view === "workerProjectTimesheet" && <WorkerProjectTimesheetView />}
        {view === "newProject" && <NewProjectForm />}
        {view === "newWorker" && <NewWorkerForm />}
        {view === "activity" && <ActivityView />}
        {view === "config" && <ConfigView />}
      </main>
    </div>
  );
}

function MobileBottomNav() {
  const { currentUser, view, setView, setSelectedProject, setSelectedWorker } = useContext(AppContext);
  const isAdmin = currentUser?.role === "admin";

  function goDashboard() {
    setView("dashboard");
    setSelectedProject(null);
    setSelectedWorker(null);
  }

  function goProfile() {
    setView("profile");
    setSelectedProject(null);
    setSelectedWorker(null);
  }

  function goWorkers() {
    setView("workers");
    setSelectedProject(null);
    setSelectedWorker(null);
  }

  function goTodayTime() {
    setView("todayTime");
    setSelectedProject(null);
    setSelectedWorker(null);
  }

  function goConfig() {
    setView("config");
    setSelectedProject(null);
    setSelectedWorker(null);
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigație principală">
      <button type="button" className={`mobile-nav-item ${view === "dashboard" ? "active" : ""}`} onClick={goDashboard}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        <span>Proiecte</span>
      </button>
      {!isAdmin && (
        <button type="button" className={`mobile-nav-item ${["todayTime", "project", "activity"].includes(view) ? "active" : ""}`} onClick={goTodayTime}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span>Pontaj</span>
        </button>
      )}
      {isAdmin && (
        <button type="button" className={`mobile-nav-item ${["workers", "workerProjects", "workerProjectTimesheet"].includes(view) ? "active" : ""}`} onClick={goWorkers}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>
          <span>Workeri</span>
        </button>
      )}
      {isAdmin && (
        <button type="button" className={`mobile-nav-item ${view === "config" ? "active" : ""}`} onClick={goConfig}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <span>Config</span>
        </button>
      )}
      <button type="button" className={`mobile-nav-item ${view === "profile" ? "active" : ""}`} onClick={goProfile}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
        <span>Profil</span>
      </button>
    </nav>
  );
}

function LoginPage() {
  const ctx = useContext(AppContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  function handleLogin() {
    if (!ctx.login(username, password)) setError("Utilizator sau parola incorectă.");
  }
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="logo-mark lg">PM</span>
          <h1>ProjectManager</h1>
          <p>Gestionează proiecte, activități și echipe</p>
        </div>
        <div className="login-form">
          <div className="field">
            <label>Utilizator</label>
            <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="ex: admin" autoFocus />
          </div>
          <div className="field">
            <label>Parolă</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="••••••••" />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn-primary full" onClick={handleLogin}>Autentificare</button>
        </div>
        <div className="login-hint"><strong>Demo:</strong> admin / admin123 &nbsp;·&nbsp; ion / worker123</div>
      </div>
      <div className="login-bg">
        <div className="bg-grid" />
        <div className="bg-accent" />
      </div>
    </div>
  );
}

function Dashboard() {
  const { state, setState, currentUser, setView, setSelectedProject, notify, confirm } = useContext(AppContext);
  const isAdmin = currentUser?.role === "admin";
  const activeProjects = state.projects.filter(p => !isProjectArchived(state, p));
  const archivedProjects = state.projects.filter(p => isProjectArchived(state, p));

  function deleteProject(id) {
    confirm("Ești sigur că vrei să Ștergi proiectul?", () => {
      setState(s => ({ ...s, projects: s.projects.filter(p => p.id !== id) }));
      notify("Proiect șters.", "info");
    });
  }

  function unarchiveProject(id) {
    const today = dateKeyLocal(new Date());
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === id ? { ...p, unarchivedAt: today } : p),
    }));
    notify("Proiect dezarhivat.", "success");
  }

  function togglePinnedProject(projectId) {
    togglePinnedProjectForWorker(setState, currentUser.id, projectId);
    notify(isProjectPinnedForWorker(state, currentUser.id, projectId) ? "Proiect scos din Pontaj." : "Proiect adăugat în Pontaj.");
  }

  function renderProjectCard(p) {
    const totalMins = getProjectTotalMinutes(state, p.id, isAdmin ? null : currentUser.id);
    const workerAct = currentUser?.activity ? actSlug(currentUser.activity) : "";
    const workweekDays = !isAdmin ? getProjectWorkweekDays(state, p.id, currentUser.id) : [];
    const pinnedForToday = !isAdmin && isProjectPinnedForWorker(state, currentUser.id, p.id);

    return (
      <div
        key={p.id}
        className={`project-card ${isAdmin ? "admin-project-card" : workerAct ? `worker-project-card act-${workerAct}` : ""}`}
        onClick={() => { setSelectedProject(p.id); setView("project"); }}
      >
        <div className="project-card-top">
          <div className="project-card-head">
            <div className="project-initials">{p.name[0]}{p.name.split(" ")[1]?.[0] || ""}</div>
            <div className="project-card-info">
              <h3 className="project-name">{p.name}</h3>
              <p className="project-client">{p.client}</p>
            </div>
          </div>
          <div className="project-actions">
            {!isAdmin && (
              <label className={`today-pin ${pinnedForToday ? "active" : ""}`} onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={pinnedForToday}
                  onChange={() => togglePinnedProject(p.id)}
                />
                <span>În Pontaj</span>
              </label>
            )}
            {isAdmin && (
              <button className="btn-icon danger" title="Șterge proiectul" aria-label="Șterge proiectul" onClick={e => { e.stopPropagation(); deleteProject(p.id); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            )}
          </div>
        </div>
        <div className={`project-time ${totalMins > 0 ? "has-time" : ""} ${!isAdmin && workerAct ? `project-time-act act-${workerAct}` : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span className="project-time-value">{fmtTime(totalMins)}</span>
          <span className="project-time-label">{isAdmin ? "total echipă" : currentUser.activity}</span>
        </div>
        {!isAdmin && (
          <div className="project-week-strip" title="S?pt?m?na curenta (Lun–Vin)">
            {workweekDays.map((day) => (
              <div
                key={day.dateKey}
                className={`project-day-box ${day.isToday ? "today" : ""} ${day.minutes > 0 ? "has-time" : ""}`}
              >
                <span className="project-day-label">{day.label} {day.dayNum}</span>
                <span className="project-day-value">{day.minutes > 0 ? fmtCell(day.minutes) : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderArchivedProjectRow(p) {
    const totalMins = getProjectTotalMinutes(state, p.id, isAdmin ? null : currentUser.id);
    const archiveReference = getProjectArchiveReferenceDateKey(state, p);

    return (
      <div key={p.id} className="archived-project-row" onClick={() => { setSelectedProject(p.id); setView("project"); }}>
        <div className="archived-project-main">
          <div className="project-initials sm">{p.name[0]}{p.name.split(" ")[1]?.[0] || ""}</div>
          <div className="archived-project-copy">
            <h4>{p.name}</h4>
            <p>{p.client}</p>
          </div>
        </div>
        <div className="archived-project-meta">
          <span className="archived-date">Fără pontaj după {archiveReference || "data necunoscută"}</span>
          <span className="archived-total">{fmtTime(totalMins)}</span>
        </div>
        <div className="project-actions">
          <button className="btn-icon restore" title="Dezarhiveaza proiectul" aria-label="Dezarhiveaza proiectul" onClick={e => { e.stopPropagation(); unarchiveProject(p.id); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/></svg>
          </button>
          {isAdmin && (
            <button className="btn-icon danger" title="Șterge proiectul" aria-label="Șterge proiectul" onClick={e => { e.stopPropagation(); deleteProject(p.id); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderProjectSection(title, projects, emptyMessage, archived = false) {
    return (
      <section className="project-section">
        <div className="project-section-head">
          <h3>{title}</h3>
          <span>{projects.length}</span>
        </div>
        {projects.length === 0 ? (
          <div className="empty-state small"><span>{emptyMessage}</span></div>
        ) : (
          archived ? (
            <div className="archived-project-list">
              {projects.map(renderArchivedProjectRow)}
            </div>
          ) : (
            <div className="project-grid">
              {projects.map(renderProjectCard)}
            </div>
          )
        )}
      </section>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Proiecte</h2>
          <p className="page-sub">{activeProjects.length} active · {archivedProjects.length} arhivate</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setView("newProject")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Proiect nou
          </button>
        )}
      </div>
      {state.projects.length === 0 && <div className="empty-state"><div className="empty-icon">📁</div><p>Niciun proiect. Creează primul proiect.</p></div>}
      {state.projects.length > 0 && (
        <>
          {renderProjectSection("Active", activeProjects, "Nu exista proiecte active.")}
          {renderProjectSection("Arhivate", archivedProjects, "Nu exista proiecte arhivate.", true)}
        </>
      )}
    </div>
  );
}

function WorkerWeekSummary({ project, visibleActivities, userId = null, title = "Istoric Pontaj" }) {
  const { state, currentUser } = useContext(AppContext);
  const targetUserId = userId ?? currentUser.id;
  const currentWeekKey = getWeekStartKey(new Date());
  const [expandedWeekKey, setExpandedWeekKey] = useState(currentWeekKey);
  const weekRows = buildWeeklyRows(state, project, targetUserId, visibleActivities);
  const weeks = buildSummaryWeeks(state, project.id, targetUserId, visibleActivities, currentWeekKey);
  const safeExpandedWeekKey = weeks.some(week => week.key === expandedWeekKey) ? expandedWeekKey : currentWeekKey;
  const columns = weeks.flatMap(week => {
    if (week.key !== safeExpandedWeekKey) {
      return [{ type: "week", key: week.key, label: week.label, week }];
    }
    return week.days.map(day => ({ type: "day", key: day.dateKey, label: day.head, isToday: day.isToday, day, week }));
  });
  const colTotals = columns.map(column =>
    weekRows.reduce((sum, row) => sum + getSummaryCellMinutes(row, column), 0)
  );
  const weekTotal = colTotals.reduce((sum, mins) => sum + mins, 0);
  const projectTotal = getProjectTotalMinutes(state, project.id, targetUserId);
  const legacyTotal = weekRows.reduce((sum, row) => sum + (row.legacyTotal || 0), 0);
  const mobileDays = columns.filter(column => column.type === "day").map(column => ({
    ...column,
    total: colTotals[columns.findIndex(col => col.key === column.key)],
    entries: weekRows
        .map(row => ({
          activity: row.activity,
          actClass: row.actClass,
          subName: row.subName,
          minutes: getSummaryCellMinutes(row, column),
        }))
        .filter(entry => entry.minutes > 0)
  }));

  return (
    <section className="week-summary">
      <div className="week-summary-header">
        <h3>{title}</h3>
      </div>
      <div className="timesheet-wrap">
        <table className="timesheet">
          <thead>
            <tr>
              <th className="th-task"><span>Activitate</span><small>Subactivitate</small></th>
              {columns.map(col => (
                <th key={col.key} className={`${col.type === "week" ? "th-week collapsed" : "th-day"} ${col.isToday ? "today" : ""}`} title={col.label}>
                  {col.type === "week" ? (
                    <button type="button" onClick={() => setExpandedWeekKey(col.week.key)}>
                      <span>{col.label}</span>
                      <small>total</small>
                    </button>
                  ) : (
                    <>
                      <span>{col.day.date.toLocaleDateString("ro-RO", { weekday: "short" })}</span>
                      <small>{col.day.date.getDate()}</small>
                    </>
                  )}
                </th>
              ))}
              <th className="th-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {weekRows.map(row => {
              const rowVisibleTotal = columns.reduce((sum, col) => sum + getSummaryCellMinutes(row, col), 0);
              return (
                <tr key={`${row.activity}-${row.subId ?? "empty"}`} className={`act-row act-${row.actClass}`}>
                  <td className="td-task">
                    <span className={`activity-code act-${row.actClass}`}>{row.activity.slice(0, 3).toUpperCase()}</span>
                    <span>{row.subName}</span>
                  </td>
                  {columns.map(col => {
                    const mins = getSummaryCellMinutes(row, col);
                    return (
                      <td key={col.key} className={`td-mins ${col.type === "week" ? "td-week-total" : ""} ${col.isToday ? "today" : ""} ${mins > 0 ? "has-time" : ""}`}>
                        {col.type === "week" ? (mins > 0 ? fmtTime(mins) : "—") : fmtCell(mins)}
                      </td>
                    );
                  })}
                  <td className="td-total">{rowVisibleTotal > 0 ? fmtTime(rowVisibleTotal) : "—"}</td>
                </tr>
              );
            })}
            {legacyTotal > 0 && (
              <tr className="legacy-row">
                <td className="td-task">Pontaj istoric</td>
                {columns.map(col => (
                  <td key={col.key} className="td-mins">—</td>
                ))}
                <td className="td-total" title="Ore înregistrate ?nainte de pontajul pe zile">{fmtTime(legacyTotal)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="timesheet-foot">
              <td className="td-foot-label">Total</td>
              {colTotals.map((mins, ci) => (
                <td key={columns[ci].key} className={`td-mins td-foot ${columns[ci].type === "week" ? "td-week-total" : ""} ${columns[ci].isToday ? "today" : ""}`}>
                  {mins > 0 ? fmtTime(mins) : "—"}
                </td>
              ))}
              <td className="td-total td-foot-week">{fmtTime(weekTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mobile-week-list">
        {mobileDays.map(day => (
          <div key={day.key} className={`mobile-day-card ${day.isToday ? "today" : ""}`}>
            <div className="mobile-day-head">
              <div>
                <h4>{day.label}</h4>
                <span>{day.day.dateKey}</span>
              </div>
              <strong>{day.total > 0 ? fmtTime(day.total) : "—"}</strong>
            </div>
            {day.entries.length > 0 ? (
              <div className="mobile-day-entries">
                {day.entries.map(entry => (
                  <div key={`${day.key}-${entry.activity}-${entry.subName}`} className="mobile-day-entry">
                    <div>
                      <span className={`pill pill-${entry.actClass}`}>{entry.activity}</span>
                      <p>{entry.subName}</p>
                    </div>
                    <strong>{fmtTime(entry.minutes)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mobile-day-empty">Fără pontaj în ziua aceasta.</p>
            )}
          </div>
        ))}
        {legacyTotal > 0 && (
          <div className="mobile-day-card legacy">
            <div className="mobile-day-head">
              <div>
                <h4>Pontaj istoric</h4>
                <span>?nainte de pontajul pe zile</span>
              </div>
              <strong>{fmtTime(legacyTotal)}</strong>
            </div>
          </div>
        )}
      </div>
      {legacyTotal > 0 && (
        <p className="week-legacy-note">
          Total proiect ({fmtTime(projectTotal)}) include {fmtTime(legacyTotal)} din pontajul istoric, neinclus în zilele saptamânii curente.
        </p>
      )}
    </section>
  );
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStartKey(date) {
  return dateKeyLocal(getWeekStart(date));
}

function getIsoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getCurrentMonthWeekKeys(referenceDate = new Date()) {
  const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  const weekKeys = new Set();
  for (let date = getWeekStart(firstDay); date <= lastDay; date = addDays(date, 7)) {
    weekKeys.add(dateKeyLocal(date));
  }
  return weekKeys;
}

function getLastCompletedMonth(referenceDate = new Date()) {
  const firstDayThisMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const firstDay = new Date(firstDayThisMonth.getFullYear(), firstDayThisMonth.getMonth() - 1, 1);
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
  const key = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}`;
  const label = firstDay.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  return { firstDay, lastDay, key, label };
}

function getMonthWorkDays(monthInfo) {
  const days = [];
  for (let date = new Date(monthInfo.firstDay); date <= monthInfo.lastDay; date = addDays(date, 1)) {
    const day = date.getDay();
    if (day === 0 || day === 6) continue;
    days.push({
      date,
      dateKey: dateKeyLocal(date),
      label: `${RO_DAYS_SHORT[day]} ${date.getDate()}`,
    });
  }
  return days;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function minutesForEntriesOnDate(entries, dateKey) {
  return entries.reduce((sum, entry) => sum + minutesOnDate(entry, dateKey), 0);
}

function downloadXlsWorkbook(filename, sheets) {
  const sheetHtml = sheets.map(sheet => `
    <h2>${escapeHtml(sheet.title)}</h2>
    <table border="1">
      <thead><tr>${sheet.headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${sheet.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `).join("<br/>");
  const html = `<!doctype html><html><head><meta charset="utf-8"/></head><body>${sheetHtml}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportAdminProjectMonthXls(state, project, workers, activityTypes) {
  const month = getLastCompletedMonth();
  const days = getMonthWorkDays(month);
  const sheets = activityTypes.map(activityName => {
    const rows = buildAdminActivityRows(state, project, activityName, workers)
      .filter(row => row.subId || row.rowTotal > 0)
      .map(row => {
        const dayMinutes = days.map(day => minutesForEntriesOnDate(row.entries, day.dateKey));
        const total = dayMinutes.reduce((sum, mins) => sum + mins, 0);
        return [
          activityName,
          row.subName,
          ...dayMinutes.map(fmtCell),
          fmtTime(total),
        ];
      });
    return {
      title: `${project.name} - ${activityName} - ${month.label}`,
      headers: ["Activitate", "Subactivitate", ...days.map(day => day.label), "Total"],
      rows: rows.length ? rows : [["Fără pontaj", "", ...days.map(() => ""), "0h"]],
    };
  });
  downloadXlsWorkbook(`pontaj-proiect-${project.name}-${month.key}.xls`, sheets);
}

function exportWorkerMonthXls(state, worker, projects) {
  const month = getLastCompletedMonth();
  const days = getMonthWorkDays(month);
  const visibleActivities = ["Administrativ", worker.activity].filter(Boolean);
  const rows = [];

  for (const project of projects) {
    for (const activityName of visibleActivities) {
      for (const sub of getSubactivities(state, activityName)) {
        const entry = state.timeLogs[timeLogKey(project.id, activityName, sub.id, worker.id)];
        const dayMinutes = days.map(day => minutesOnDate(entry, day.dateKey));
        const total = dayMinutes.reduce((sum, mins) => sum + mins, 0);
        if (total === 0) continue;
        rows.push([
          project.name,
          activityName,
          sub.name,
          ...dayMinutes.map(fmtCell),
          fmtTime(total),
        ]);
      }
    }
  }

  downloadXlsWorkbook(`pontaj-worker-${worker.name}-${month.key}.xls`, [{
    title: `${worker.name} - ${month.label}`,
    headers: ["Proiect", "Activitate", "Subactivitate", ...days.map(day => day.label), "Total"],
    rows: rows.length ? rows : [["Fără pontaj", "", "", ...days.map(() => ""), "0h"]],
  }]);
}

function buildSummaryWeeks(state, projectId, userId, visibleActivities, currentWeekKey) {
  const weekKeys = new Set([currentWeekKey, ...getCurrentMonthWeekKeys()]);
  for (const [key, entry] of Object.entries(state.timeLogs)) {
    const belongsToVisibleActivity = visibleActivities.some(activityName =>
      key.startsWith(`${projectId}_${activityName}_`) && key.endsWith(`_${userId}`)
    );
    if (!belongsToVisibleActivity) continue;
    for (const dateKey of Object.keys(entry && typeof entry === "object" ? entry : {})) {
      if (dateKey === "_legacy") continue;
      weekKeys.add(getWeekStartKey(parseDateKey(dateKey)));
    }
  }

  return [...weekKeys].sort((a, b) => a.localeCompare(b)).map(weekKey => {
    const monday = parseDateKey(weekKey);
    const days = Array.from({ length: 5 }, (_, i) => {
      const date = addDays(monday, i);
      const dateKey = dateKeyLocal(date);
      return {
        date,
        dateKey,
        head: `${RO_DAYS_SHORT[date.getDay()]} ${date.getDate()}`,
        isToday: dateKey === dateKeyLocal(new Date()),
      };
    });
    return {
      key: weekKey,
      label: `W${String(getIsoWeekNumber(monday)).padStart(2, "0")}`,
      days,
    };
  });
}

function buildWeeklyRows(state, project, userId, visibleActivities) {
  return visibleActivities.flatMap(activityName => {
    const subs = getSubactivities(state, activityName);
    if (subs.length === 0) {
      return [{
        activity: activityName,
        actClass: actSlug(activityName),
        subId: null,
        subName: "—",
        entry: null,
        rowTotal: 0,
        legacyTotal: 0,
      }];
    }

    return subs.map(sub => {
      const entry = state.timeLogs[timeLogKey(project.id, activityName, sub.id, userId)];
      const normalized = entry == null ? {} : (typeof entry === "number" ? { _legacy: entry } : entry);
      return {
        activity: activityName,
        actClass: actSlug(activityName),
        subId: sub.id,
        subName: sub.name,
        entry,
        rowTotal: totalLogMinutes(entry),
        legacyTotal: normalized._legacy || 0,
      };
    });
  });
}

function getSummaryCellMinutes(row, column) {
  if (!row.entry) return 0;
  if (column.type === "day") return minutesOnDate(row.entry, column.day.dateKey);
  return column.week.days.reduce((sum, day) => sum + minutesOnDate(row.entry, day.dateKey), 0);
}

function buildCumulativeSummaryWeeks(state, projectIds, userId, visibleActivities, currentWeekKey) {
  const weekKeys = new Set([currentWeekKey, ...getCurrentMonthWeekKeys()]);
  for (const [key, entry] of Object.entries(state.timeLogs)) {
    if (!key.endsWith(`_${userId}`)) continue;
    const belongsToVisibleActivity = projectIds.some(projectId =>
      visibleActivities.some(activityName => key.startsWith(`${projectId}_${activityName}_`))
    );
    if (!belongsToVisibleActivity) continue;
    for (const dateKey of Object.keys(entry && typeof entry === "object" ? entry : {})) {
      if (dateKey === "_legacy") continue;
      weekKeys.add(getWeekStartKey(parseDateKey(dateKey)));
    }
  }

  return [...weekKeys].sort((a, b) => a.localeCompare(b)).map(weekKey => {
    const monday = parseDateKey(weekKey);
    const days = Array.from({ length: 5 }, (_, i) => {
      const date = addDays(monday, i);
      const dateKey = dateKeyLocal(date);
      return {
        date,
        dateKey,
        head: `${RO_DAYS_SHORT[date.getDay()]} ${date.getDate()}`,
        isToday: dateKey === dateKeyLocal(new Date()),
      };
    });
    return {
      key: weekKey,
      label: `W${String(getIsoWeekNumber(monday)).padStart(2, "0")}`,
      days,
    };
  });
}

function buildCumulativeWeeklyRows(state, projects, userId, visibleActivities) {
  return visibleActivities.flatMap(activityName => {
    const subs = getSubactivities(state, activityName);
    if (subs.length === 0) {
      return [{
        activity: activityName,
        actClass: actSlug(activityName),
        subId: null,
        subName: "—",
        entries: [],
        rowTotal: 0,
        legacyTotal: 0,
      }];
    }

    return subs.map(sub => {
      const entries = projects
        .map(project => state.timeLogs[timeLogKey(project.id, activityName, sub.id, userId)])
        .filter(Boolean);
      const legacyTotal = entries.reduce((sum, entry) => {
        const normalized = typeof entry === "number" ? { _legacy: entry } : entry;
        return sum + (normalized?._legacy || 0);
      }, 0);
      return {
        activity: activityName,
        actClass: actSlug(activityName),
        subId: sub.id,
        subName: sub.name,
        entries,
        rowTotal: entries.reduce((sum, entry) => sum + totalLogMinutes(entry), 0),
        legacyTotal,
      };
    });
  });
}

function getCumulativeSummaryCellMinutes(row, column) {
  if (column.type === "day") {
    return row.entries.reduce((sum, entry) => sum + minutesOnDate(entry, column.day.dateKey), 0);
  }
  return column.week.days.reduce((sum, day) => {
    return sum + row.entries.reduce((entrySum, entry) => entrySum + minutesOnDate(entry, day.dateKey), 0);
  }, 0);
}

function CumulativeWorkerWeekSummary({ projects, visibleActivities, title = "Istoric Pontaj" }) {
  const { state, currentUser } = useContext(AppContext);
  const currentWeekKey = getWeekStartKey(new Date());
  const [expandedWeekKey, setExpandedWeekKey] = useState(currentWeekKey);
  const projectIds = projects.map(project => project.id);
  const weekRows = buildCumulativeWeeklyRows(state, projects, currentUser.id, visibleActivities);
  const weeks = buildCumulativeSummaryWeeks(state, projectIds, currentUser.id, visibleActivities, currentWeekKey);
  const safeExpandedWeekKey = weeks.some(week => week.key === expandedWeekKey) ? expandedWeekKey : currentWeekKey;
  const columns = weeks.flatMap(week => {
    if (week.key !== safeExpandedWeekKey) {
      return [{ type: "week", key: week.key, label: week.label, week }];
    }
    return week.days.map(day => ({ type: "day", key: day.dateKey, label: day.head, isToday: day.isToday, day, week }));
  });
  const colTotals = columns.map(column =>
    weekRows.reduce((sum, row) => sum + getCumulativeSummaryCellMinutes(row, column), 0)
  );
  const weekTotal = colTotals.reduce((sum, mins) => sum + mins, 0);
  const grandTotal = weekRows.reduce((sum, row) => sum + row.rowTotal, 0);
  const legacyTotal = weekRows.reduce((sum, row) => sum + (row.legacyTotal || 0), 0);
  const mobileDays = columns.filter(column => column.type === "day").map(column => ({
    ...column,
    total: colTotals[columns.findIndex(col => col.key === column.key)],
    entries: weekRows
      .map(row => ({
        activity: row.activity,
        actClass: row.actClass,
        subName: row.subName,
        minutes: getCumulativeSummaryCellMinutes(row, column),
      }))
      .filter(entry => entry.minutes > 0),
  }));

  if (projects.length === 0) {
    return (
      <section className="week-summary">
        <div className="week-summary-header">
          <h3>{title}</h3>
        </div>
        <div className="empty-state small"><span>Bifează proiecte în Pontaj ca să vezi istoricul cumulat.</span></div>
      </section>
    );
  }

  return (
    <section className="week-summary">
      <div className="week-summary-header">
        <h3>{title}</h3>
        <span className="week-project-badge">Total cumulat: <strong>{fmtTime(grandTotal)}</strong></span>
      </div>
      <div className="timesheet-wrap">
        <table className="timesheet">
          <thead>
            <tr>
              <th className="th-task"><span>Activitate</span><small>Subactivitate</small></th>
              {columns.map(col => (
                <th key={col.key} className={`${col.type === "week" ? "th-week collapsed" : "th-day"} ${col.isToday ? "today" : ""}`} title={col.label}>
                  {col.type === "week" ? (
                    <button type="button" onClick={() => setExpandedWeekKey(col.week.key)}>
                      <span>{col.label}</span>
                      <small>total</small>
                    </button>
                  ) : (
                    <>
                      <span>{col.day.date.toLocaleDateString("ro-RO", { weekday: "short" })}</span>
                      <small>{col.day.date.getDate()}</small>
                    </>
                  )}
                </th>
              ))}
              <th className="th-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {weekRows.map(row => {
              const rowVisibleTotal = columns.reduce((sum, col) => sum + getCumulativeSummaryCellMinutes(row, col), 0);
              return (
                <tr key={`${row.activity}-${row.subId ?? "empty"}`} className={`act-row act-${row.actClass}`}>
                  <td className="td-task">
                    <span className={`activity-code act-${row.actClass}`}>{row.activity.slice(0, 3).toUpperCase()}</span>
                    <span>{row.subName}</span>
                  </td>
                  {columns.map(col => {
                    const mins = getCumulativeSummaryCellMinutes(row, col);
                    return (
                      <td key={col.key} className={`td-mins ${col.type === "week" ? "td-week-total" : ""} ${col.isToday ? "today" : ""} ${mins > 0 ? "has-time" : ""}`}>
                        {col.type === "week" ? (mins > 0 ? fmtTime(mins) : "—") : fmtCell(mins)}
                      </td>
                    );
                  })}
                  <td className="td-total">{rowVisibleTotal > 0 ? fmtTime(rowVisibleTotal) : "—"}</td>
                </tr>
              );
            })}
            {legacyTotal > 0 && (
              <tr className="legacy-row">
                <td className="td-task">Pontaj istoric</td>
                {columns.map(col => (
                  <td key={col.key} className="td-mins">—</td>
                ))}
                <td className="td-total" title="Ore înregistrate ?nainte de pontajul pe zile">{fmtTime(legacyTotal)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="timesheet-foot">
              <td className="td-foot-label">Total</td>
              {colTotals.map((mins, ci) => (
                <td key={columns[ci].key} className={`td-mins td-foot ${columns[ci].type === "week" ? "td-week-total" : ""} ${columns[ci].isToday ? "today" : ""}`}>
                  {mins > 0 ? fmtTime(mins) : "—"}
                </td>
              ))}
              <td className="td-total td-foot-week">{fmtTime(weekTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mobile-week-list">
        {mobileDays.map(day => (
          <div key={day.key} className={`mobile-day-card ${day.isToday ? "today" : ""}`}>
            <div className="mobile-day-head">
              <div>
                <h4>{day.label}</h4>
                <span>{day.day.dateKey}</span>
              </div>
              <strong>{day.total > 0 ? fmtTime(day.total) : "—"}</strong>
            </div>
            {day.entries.length > 0 ? (
              <div className="mobile-day-entries">
                {day.entries.map(entry => (
                  <div key={`${day.key}-${entry.activity}-${entry.subName}`} className="mobile-day-entry">
                    <div>
                      <span className={`pill pill-${entry.actClass}`}>{entry.activity}</span>
                      <p>{entry.subName}</p>
                    </div>
                    <strong>{fmtTime(entry.minutes)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mobile-day-empty">Fără pontaj în ziua aceasta.</p>
            )}
          </div>
        ))}
        {legacyTotal > 0 && (
          <div className="mobile-day-card legacy">
            <div className="mobile-day-head">
              <div>
                <h4>Pontaj istoric</h4>
                <span>?nainte de pontajul pe zile</span>
              </div>
              <strong>{fmtTime(legacyTotal)}</strong>
            </div>
          </div>
        )}
      </div>
      {legacyTotal > 0 && (
        <p className="week-legacy-note">
          Totalul cumulat include {fmtTime(legacyTotal)} din pontajul istoric, neinclus în zilele saptamânii curente.
        </p>
      )}
    </section>
  );
}

function hasWorkerTimeOnProject(state, projectId, workerId) {
  return Object.entries(state.timeLogs).some(([key, entry]) =>
    key.startsWith(`${projectId}_`) && key.endsWith(`_${workerId}`) && totalLogMinutes(entry) > 0
  );
}

function isProjectPinnedForWorker(state, workerId, projectId) {
  return Boolean(state.pinnedWorkProjects?.[workerId]?.includes(projectId));
}

function togglePinnedProjectForWorker(setState, workerId, projectId) {
  setState(s => {
    const current = s.pinnedWorkProjects?.[workerId] ?? [];
    const nextForWorker = current.includes(projectId)
      ? current.filter(id => id !== projectId)
      : [...current, projectId];

    return {
      ...s,
      pinnedWorkProjects: {
        ...(s.pinnedWorkProjects ?? {}),
        [workerId]: nextForWorker,
      },
    };
  });
}

function buildAdminActivityWeeks(state, projectId, activityName, currentWeekKey) {
  const weekKeys = new Set([currentWeekKey, ...getCurrentMonthWeekKeys()]);
  const prefix = `${projectId}_${activityName}_`;
  for (const [key, entry] of Object.entries(state.timeLogs)) {
    if (!key.startsWith(prefix)) continue;
    for (const dateKey of Object.keys(entry && typeof entry === "object" ? entry : {})) {
      if (dateKey === "_legacy") continue;
      weekKeys.add(getWeekStartKey(parseDateKey(dateKey)));
    }
  }

  return [...weekKeys].sort((a, b) => a.localeCompare(b)).map(weekKey => {
    const monday = parseDateKey(weekKey);
    const days = Array.from({ length: 5 }, (_, i) => {
      const date = addDays(monday, i);
      const dateKey = dateKeyLocal(date);
      return {
        date,
        dateKey,
        head: `${RO_DAYS_SHORT[date.getDay()]} ${date.getDate()}`,
        isToday: dateKey === dateKeyLocal(new Date()),
      };
    });
    return {
      key: weekKey,
      label: `W${String(getIsoWeekNumber(monday)).padStart(2, "0")}`,
      days,
    };
  });
}

function buildAdminActivityRows(state, project, activityName, workers) {
  const subs = getSubactivities(state, activityName);
  if (subs.length === 0) {
    return [{
      activity: activityName,
      actClass: actSlug(activityName),
      subId: null,
      subName: "—",
      entries: [],
      rowTotal: 0,
      legacyTotal: 0,
    }];
  }

  return subs.map(sub => {
    const entries = workers.map(worker => state.timeLogs[timeLogKey(project.id, activityName, sub.id, worker.id)]).filter(Boolean);
    const legacyTotal = entries.reduce((sum, entry) => {
      const normalized = typeof entry === "number" ? { _legacy: entry } : entry;
      return sum + (normalized?._legacy || 0);
    }, 0);
    return {
      activity: activityName,
      actClass: actSlug(activityName),
      subId: sub.id,
      subName: sub.name,
      entries,
      rowTotal: entries.reduce((sum, entry) => sum + totalLogMinutes(entry), 0),
      legacyTotal,
    };
  });
}

function getAdminActivityCellMinutes(row, column) {
  if (column.type === "day") {
    return row.entries.reduce((sum, entry) => sum + minutesOnDate(entry, column.day.dateKey), 0);
  }
  return column.week.days.reduce((sum, day) => {
    return sum + row.entries.reduce((entrySum, entry) => entrySum + minutesOnDate(entry, day.dateKey), 0);
  }, 0);
}

function AdminProjectActivityTable({ project, activityName, workers }) {
  const { state } = useContext(AppContext);
  const currentWeekKey = getWeekStartKey(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [expandedWeekKey, setExpandedWeekKey] = useState(currentWeekKey);
  const actClass = actSlug(activityName);
  const activityTotal = getProjectActivityTotalMinutes(state, project.id, activityName);
  const rows = buildAdminActivityRows(state, project, activityName, workers);
  const weeks = buildAdminActivityWeeks(state, project.id, activityName, currentWeekKey);
  const safeExpandedWeekKey = weeks.some(week => week.key === expandedWeekKey) ? expandedWeekKey : currentWeekKey;
  const columns = weeks.flatMap(week => {
    if (week.key !== safeExpandedWeekKey) {
      return [{ type: "week", key: week.key, label: week.label, week }];
    }
    return week.days.map(day => ({ type: "day", key: day.dateKey, label: day.head, isToday: day.isToday, day, week }));
  });
  const colTotals = columns.map(column =>
    rows.reduce((sum, row) => sum + getAdminActivityCellMinutes(row, column), 0)
  );
  const visibleTotal = colTotals.reduce((sum, mins) => sum + mins, 0);
  const legacyTotal = rows.reduce((sum, row) => sum + (row.legacyTotal || 0), 0);
  const mobileWeek = weeks.find(week => week.key === safeExpandedWeekKey) ?? weeks[0];
  const mobileAdminDays = (mobileWeek?.days ?? []).map(day => {
    const dayColumn = { type: "day", key: day.dateKey, label: day.head, isToday: day.isToday, day, week: mobileWeek };
    return {
      ...dayColumn,
      total: rows.reduce((sum, row) => sum + getAdminActivityCellMinutes(row, dayColumn), 0),
      entries: rows
        .map(row => ({
          subName: row.subName,
          minutes: getAdminActivityCellMinutes(row, dayColumn),
        }))
        .filter(entry => entry.minutes > 0),
    };
  });

  return (
    <section className={`admin-project-activity act-${actClass} ${isOpen ? "open" : ""}`}>
      <button type="button" className="admin-activity-toggle" onClick={() => setIsOpen(open => !open)} aria-expanded={isOpen}>
        <span className="admin-activity-main">
          <span className="admin-activity-icon">{actIcon(activityName)}</span>
          <span>{activityName}</span>
        </span>
        <span className={`admin-activity-hours ${activityTotal > 0 ? "has-time" : ""}`}>{fmtTime(activityTotal)}</span>
        <span className="admin-activity-chevron">{isOpen ? "-" : "+"}</span>
      </button>

      {isOpen && (
        <div className="admin-activity-panel">
          <div className="admin-activity-panel-head">
            <h3>{activityName}</h3>
            <strong>{fmtTime(activityTotal)} total ore</strong>
          </div>
          <div className="timesheet-wrap">
            <table className="timesheet admin-project-timesheet">
              <thead>
                <tr>
                  <th className="th-task"><span>Subactivitate</span><small>Total echipa</small></th>
                  {columns.map(col => (
                    <th key={col.key} className={`${col.type === "week" ? "th-week collapsed" : "th-day"} ${col.isToday ? "today" : ""}`} title={col.label}>
                      {col.type === "week" ? (
                        <button type="button" onClick={() => setExpandedWeekKey(col.week.key)}>
                          <span>{col.label}</span>
                          <small>total</small>
                        </button>
                      ) : (
                        <>
                          <span>{col.day.date.toLocaleDateString("ro-RO", { weekday: "short" })}</span>
                          <small>{col.day.date.getDate()}</small>
                        </>
                      )}
                    </th>
                  ))}
                  <th className="th-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const rowVisibleTotal = columns.reduce((sum, col) => sum + getAdminActivityCellMinutes(row, col), 0);
                  return (
                    <tr key={`${activityName}-${row.subId ?? "empty"}`} className={`act-row act-${row.actClass}`}>
                      <td className="td-task">
                        <span className={`activity-code act-${row.actClass}`}>{activityName.slice(0, 3).toUpperCase()}</span>
                        <span>{row.subName}</span>
                      </td>
                      {columns.map(col => {
                        const mins = getAdminActivityCellMinutes(row, col);
                        return (
                          <td key={col.key} className={`td-mins ${col.type === "week" ? "td-week-total" : ""} ${col.isToday ? "today" : ""} ${mins > 0 ? "has-time" : ""}`}>
                            {col.type === "week" ? (mins > 0 ? fmtTime(mins) : "—") : fmtCell(mins)}
                          </td>
                        );
                      })}
                      <td className="td-total">{rowVisibleTotal > 0 ? fmtTime(rowVisibleTotal) : "—"}</td>
                    </tr>
                  );
                })}
                {legacyTotal > 0 && (
                  <tr className="legacy-row">
                    <td className="td-task">Pontaj istoric</td>
                    {columns.map(col => (
                      <td key={col.key} className="td-mins">—</td>
                    ))}
                    <td className="td-total" title="Ore înregistrate ?nainte de pontajul pe zile">{fmtTime(legacyTotal)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="timesheet-foot">
                  <td className="td-foot-label">Total</td>
                  {colTotals.map((mins, ci) => (
                    <td key={columns[ci].key} className={`td-mins td-foot ${columns[ci].type === "week" ? "td-week-total" : ""} ${columns[ci].isToday ? "today" : ""}`}>
                      {mins > 0 ? fmtTime(mins) : "—"}
                    </td>
                  ))}
                  <td className="td-total td-foot-week">{fmtTime(visibleTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mobile-admin-week-tabs" role="tablist" aria-label="Saptamâni pontaj">
            {weeks.map(week => (
              <button
                key={week.key}
                type="button"
                className={week.key === safeExpandedWeekKey ? "active" : ""}
                onClick={() => setExpandedWeekKey(week.key)}
              >
                {week.label}
              </button>
            ))}
          </div>
          <div className="mobile-admin-day-list">
            {mobileAdminDays.map(day => (
              <div key={day.key} className={`mobile-day-card ${day.isToday ? "today" : ""}`}>
                <div className="mobile-day-head">
                  <div>
                    <h4>{day.label}</h4>
                    <span>{day.day.dateKey}</span>
                  </div>
                  <strong>{day.total > 0 ? fmtTime(day.total) : "—"}</strong>
                </div>
                {day.entries.length > 0 ? (
                  <div className="mobile-day-entries">
                    {day.entries.map(entry => (
                      <div key={`${day.key}-${entry.subName}`} className="mobile-day-entry">
                        <div>
                          <span className={`pill pill-${actClass}`}>{activityName}</span>
                          <p>{entry.subName}</p>
                        </div>
                        <strong>{fmtTime(entry.minutes)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mobile-day-empty">Fără pontaj în ziua aceasta.</p>
                )}
              </div>
            ))}
          </div>
          {legacyTotal > 0 && (
            <p className="week-legacy-note">
              Total activitate ({fmtTime(activityTotal)}) include {fmtTime(legacyTotal)} din pontajul istoric, neinclus în zilele saptamânilor.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ProjectView() {
  const { state, currentUser, selectedProject, setView, setSelectedProject } = useContext(AppContext);
  const project = state.projects.find(p => p.id === selectedProject);
  if (!project) return null;
  const isAdmin = currentUser?.role === "admin";
  const activityTypes = getActivityTypes(state);
  const visibleActivities = isAdmin ? activityTypes : ["Administrativ", currentUser?.activity].filter(Boolean);
  const workers = state.users.filter(u => u.role === "worker");

  if (!isAdmin) {
    return <WorkerProjectPontaj project={project} visibleActivities={visibleActivities} />;
  }

  return (
    <div className="page">
      <div className="breadcrumb">
        <button onClick={() => { setView("dashboard"); setSelectedProject(null); }}>Proiecte</button>
        <span>/</span><span className="breadcrumb-current">{project.name}</span>
      </div>
      <div className="page-header">
        <div><h2>{project.name}</h2><p className="page-sub">Client: <strong>{project.client}</strong></p></div>
        <button type="button" className="btn-ghost export-btn" onClick={() => exportAdminProjectMonthXls(state, project, workers, visibleActivities)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/></svg>
          Export XLS {getLastCompletedMonth().label}
        </button>
      </div>
      <div className="admin-project-activity-list">
        {visibleActivities.map(actName => (
          <AdminProjectActivityTable
            key={actName}
            project={project}
            activityName={actName}
            workers={workers}
          />
        ))}
      </div>
    </div>
  );
}

function TodayTimeView() {
  const { state, setState, currentUser, setView, setSelectedProject, notify } = useContext(AppContext);
  const activeProjects = state.projects.filter(p => !isProjectArchived(state, p));
  const visibleActivities = ["Administrativ", currentUser.activity].filter(Boolean);
  const pinnedIds = state.pinnedWorkProjects?.[currentUser.id] ?? [];
  const pinnedProjects = pinnedIds
    .map(id => activeProjects.find(project => project.id === id) ?? state.projects.find(project => project.id === id))
    .filter(Boolean);
  const availableProjects = activeProjects.filter(project => !pinnedIds.includes(project.id));
  const today = dateKeyLocal(new Date());
  const todayTotal = pinnedProjects.reduce((sum, project) => {
    return sum + visibleActivities.reduce((activitySum, activityName) => {
      return activitySum + getSubactivities(state, activityName).reduce((subSum, sub) => {
        const entry = state.timeLogs[timeLogKey(project.id, activityName, sub.id, currentUser.id)];
        return subSum + minutesOnDate(entry, today);
      }, 0);
    }, 0);
  }, 0);

  function toggleProject(projectId) {
    togglePinnedProjectForWorker(setState, currentUser.id, projectId);
    notify(isProjectPinnedForWorker(state, currentUser.id, projectId) ? "Proiect scos din Pontaj." : "Proiect adăugat în Pontaj.");
  }

  function openProject(projectId) {
    setSelectedProject(projectId);
    setView("project");
  }

  function renderPinnedProject(project) {
    const projectTotal = getProjectTotalMinutes(state, project.id, currentUser.id);
    const todayMins = visibleActivities.reduce((activitySum, activityName) => {
      return activitySum + getSubactivities(state, activityName).reduce((subSum, sub) => {
        const entry = state.timeLogs[timeLogKey(project.id, activityName, sub.id, currentUser.id)];
        return subSum + minutesOnDate(entry, today);
      }, 0);
    }, 0);

    return (
      <article key={project.id} className="today-project-card">
        <button type="button" className="today-project-main" onClick={() => openProject(project.id)}>
          <div className="project-initials sm">{project.name[0]}{project.name.split(" ")[1]?.[0] || ""}</div>
          <div>
            <h3>{project.name}</h3>
            <p>{project.client}</p>
          </div>
        </button>
        <div className="today-project-meta">
          <span>Azi <strong>{fmtTime(todayMins)}</strong></span>
          <span>Total <strong>{fmtTime(projectTotal)}</strong></span>
        </div>
        <div className="today-project-actions">
          <button type="button" className="btn-primary" onClick={() => openProject(project.id)}>Ponteaza</button>
          <label className="today-pin active">
            <input type="checkbox" checked onChange={() => toggleProject(project.id)} />
            <span>În Pontaj</span>
          </label>
        </div>
      </article>
    );
  }

  return (
    <div className="page">
      <div className="page-header today-header">
        <div>
          <h2>Pontaj azi</h2>
          <p className="page-sub">{new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>
        <div className={`today-total ${todayTotal > 0 ? "has-time" : ""}`}>
          <span>Total azi</span>
          <strong>{fmtTime(todayTotal)}</strong>
        </div>
      </div>

      <section className="today-section">
        <div className="project-section-head">
          <h3>În Pontaj</h3>
          <span>{pinnedProjects.length}</span>
        </div>
        {pinnedProjects.length === 0 ? (
          <div className="empty-state small">
            <span>Bifează proiecte din lista de mai jos ca să apară aici. Rămân în Pontaj până le debifezi manual.</span>
          </div>
        ) : (
          <div className="today-project-list">
            {pinnedProjects.map(renderPinnedProject)}
          </div>
        )}
      </section>

      <CumulativeWorkerWeekSummary
        projects={pinnedProjects}
        visibleActivities={visibleActivities}
        title="Istoric pontaj"
      />

      <section className="today-section">
        <div className="project-section-head">
          <h3>Adaugă proiecte</h3>
          <span>{availableProjects.length}</span>
        </div>
        {availableProjects.length === 0 ? (
          <div className="empty-state small"><span>Toate proiectele active sunt deja în Pontaj.</span></div>
        ) : (
          <div className="today-add-list">
            {availableProjects.map(project => (
              <label key={project.id} className="today-add-row">
                <input type="checkbox" checked={false} onChange={() => toggleProject(project.id)} />
                <span>
                  <strong>{project.name}</strong>
                  <small>{project.client}</small>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WorkerProjectPontaj({ project, visibleActivities }) {
  const { state, setState, currentUser, setView, setSelectedProject, notify } = useContext(AppContext);
  const [timeMode, setTimeMode] = useState("add");
  const [selectedMinutes, setSelectedMinutes] = useState(() => getTimeButtons(state)[0] || 30);
  const [favoritePulseKey, setFavoritePulseKey] = useState(null);
  const isSubtractMode = timeMode === "subtract";
  const timeButtons = getTimeButtons(state);
  const safeSelectedMinutes = timeButtons.includes(selectedMinutes) ? selectedMinutes : (timeButtons[0] || 30);
  const today = dateKeyLocal(new Date());
  const dateLabel = new Date().toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
  const favoriteMap = state.favoriteSubactivities ?? {};
  const todayTotal = visibleActivities.reduce((sum, activityName) => {
    return sum + getSubactivities(state, activityName).reduce((activitySum, sub) => {
      const entry = state.timeLogs[timeLogKey(project.id, activityName, sub.id, currentUser.id)];
      return activitySum + minutesOnDate(entry, today);
    }, 0);
  }, 0);
  const reachedDailyTarget = todayTotal >= 480;

  function favoriteKey(activityName, subId) {
    return `${currentUser.id}_${activityName}_${subId}`;
  }

  function isFavorite(activityName, subId) {
    return Boolean(favoriteMap[favoriteKey(activityName, subId)]);
  }

  function favoriteOrder(activityName, subId) {
    const value = favoriteMap[favoriteKey(activityName, subId)];
    if (!value) return Number.POSITIVE_INFINITY;
    return typeof value === "number" ? value : 0;
  }

  function toggleFavorite(activityName, subId) {
    const key = favoriteKey(activityName, subId);
    const willPromote = !favoriteMap[key];
    setState(s => {
      const nextFavorites = { ...(s.favoriteSubactivities ?? {}) };
      if (nextFavorites[key]) {
        delete nextFavorites[key];
      } else {
        nextFavorites[key] = Date.now();
      }
      return { ...s, favoriteSubactivities: nextFavorites };
    });
    if (willPromote) {
      setFavoritePulseKey(key);
      setTimeout(() => setFavoritePulseKey(current => current === key ? null : current), 900);
    }
  }

  function sortedSubactivities(activityName) {
    return [...getSubactivities(state, activityName)].sort((a, b) => {
      const favDelta = Number(isFavorite(activityName, b.id)) - Number(isFavorite(activityName, a.id));
      if (favDelta !== 0) return favDelta;
      if (isFavorite(activityName, a.id) && isFavorite(activityName, b.id)) {
        return favoriteOrder(activityName, a.id) - favoriteOrder(activityName, b.id);
      }
      return a.name.localeCompare(b.name, "ro");
    });
  }

  function adjustTime(activityName, subId) {
    const key = timeLogKey(project.id, activityName, subId, currentUser.id);
    const mins = safeSelectedMinutes;
    const delta = isSubtractMode ? -mins : mins;
    const prev = state.timeLogs[key];
    const todayBefore = minutesOnDate(prev, today);

    if (isSubtractMode && todayBefore === 0) {
      notify("Nu ai timp de scazut azi pe aceasta subactivitate.", "info");
      return;
    }
    if (isSubtractMode && todayBefore < mins) {
      notify(`Ai doar ${fmtTime(todayBefore)} de scazut azi pe aceasta subactivitate.`, "info");
      return;
    }

    setState(s => {
      const entry = s.timeLogs[key];
      const daily = adjustTimeLogEntry(entry, delta, today);
      const nextLogs = { ...s.timeLogs };
      if (!daily || (typeof daily === "object" && Object.keys(daily).length === 0)) {
        delete nextLogs[key];
      } else {
        nextLogs[key] = daily;
      }
      return { ...s, timeLogs: nextLogs };
    });

    notify(isSubtractMode ? `-${mins} min scăzute!` : `+${mins} min adăugate!`);
  }

  function getTime(activityName, subId) {
    return minutesOnDate(state.timeLogs[timeLogKey(project.id, activityName, subId, currentUser.id)], today);
  }

  return (
    <div className="page page-wide pontaj-page">
      <div className="breadcrumb">
        <button onClick={() => { setView("dashboard"); setSelectedProject(null); }}>Proiecte</button>
        <span>/</span><span className="breadcrumb-current">{project.name}</span>
      </div>
      <div className="page-header pontaj-header">
        <div>
          <h2>{project.name} - pontaj {currentUser.name} {dateLabel}</h2>
          <p className="page-sub">Client: <strong>{project.client}</strong></p>
        </div>
      </div>

      <div className="activity-legend">
        {visibleActivities.map(activityName => (
          <div key={activityName} className="activity-legend-item">
            <span className={`activity-code act-${actSlug(activityName)}`}>{activityName.slice(0, 3).toUpperCase()}</span>
            <span>{activityName}</span>
          </div>
        ))}
      </div>

      <div className="pontaj-mode-slot">
        <div className="time-mode-bar pontaj-mode-bar">
          <div className="pontaj-sticky-context">
            <span className="time-mode-label">Pontaj</span>
            <strong>{project.name}</strong>
            <small>Azi {fmtTime(todayTotal)}</small>
          </div>
          <div className="time-amount-picker" role="radiogroup" aria-label="Cantitate timp">
            {timeButtons.map(mins => (
              <label key={mins} className={`time-amount-option ${safeSelectedMinutes === mins ? "active" : ""}`}>
                <input
                  type="radio"
                  name="pontaj-minutes"
                  checked={safeSelectedMinutes === mins}
                  onChange={() => setSelectedMinutes(mins)}
                />
                <span>{mins}</span>
              </label>
            ))}
          </div>
          <span className="time-mode-hint">{isSubtractMode ? "Scade timp la click" : "Adaugă timp la click"}</span>
          {reachedDailyTarget && (
            <span className="daily-target-note">
              Azi: {fmtTime(todayTotal)} · prag 8h atins
            </span>
          )}
          <div className="time-mode-switch" role="group" aria-label="Mod pontaj">
            <button
              type="button"
              className={`time-mode-btn ${!isSubtractMode ? "active" : ""}`}
              onClick={() => setTimeMode("add")}
              aria-pressed={!isSubtractMode}
            >
              +
            </button>
            <button
              type="button"
              className={`time-mode-btn ${isSubtractMode ? "active" : ""}`}
              onClick={() => setTimeMode("subtract")}
              aria-pressed={isSubtractMode}
            >
              -
            </button>
          </div>
        </div>
      </div>

      <div className="pontaj-table-wrap">
        <table className="pontaj-table" aria-label="Pontaj proiect">
          <tbody>
            {visibleActivities.map(activityName => {
              const subs = sortedSubactivities(activityName);
              if (subs.length === 0) {
                return (
                  <tr key={`${activityName}-empty`} className="pontaj-row">
                    <td className="pontaj-activity-cell">
                      <span className={`activity-code act-${actSlug(activityName)}`}>{activityName.slice(0, 3).toUpperCase()}</span>
                    </td>
                    <td className="pontaj-sub-cell">
                      <span className="pontaj-sub-name muted">Nicio subactivitate definită</span>
                    </td>
                    <td className="pontaj-time-cell" />
                    <td className="pontaj-total-cell">—</td>
                  </tr>
                );
              }

              return subs.map(sub => {
                const actClass = actSlug(activityName);
                const myTime = getTime(activityName, sub.id);
                const favorite = isFavorite(activityName, sub.id);
                const rowKey = favoriteKey(activityName, sub.id);
                return (
                  <tr key={`${activityName}-${sub.id}`} className={`pontaj-row ${favoritePulseKey === rowKey ? "favorite-promoted" : ""}`}>
                    <td className="pontaj-activity-cell">
                      <span className={`activity-code act-${actClass}`}>{activityName.slice(0, 3).toUpperCase()}</span>
                    </td>
                    <td className="pontaj-sub-cell">
                      <span className="pontaj-sub-name">{sub.name}</span>
                      <button
                        type="button"
                        className={`favorite-btn ${favorite ? "active" : ""}`}
                        aria-label={favorite ? "Scoate de la favorite" : "Marchează ca favorit"}
                        title={favorite ? "Scoate de la favorite" : "Marchează ca favorit"}
                        onClick={() => toggleFavorite(activityName, sub.id)}
                      >
                        {favorite ? "\u2605" : "\u2606"}
                      </button>
                    </td>
                    <td className="pontaj-time-cell">
                      <button
                        type="button"
                        className={`btn-time btn-time-single act-${actClass} ${isSubtractMode ? "subtract" : ""}`}
                        onClick={() => adjustTime(activityName, sub.id)}
                        aria-label={`${isSubtractMode ? "Scade" : "Adaugă"} ${safeSelectedMinutes} minute`}
                      >
                        {safeSelectedMinutes}
                      </button>
                    </td>
                    <td className={`pontaj-total-cell ${myTime > 0 ? "has-time" : ""}`}>{fmtTime(myTime)}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-pontaj-list" aria-label="Pontaj proiect mobil">
        {visibleActivities.map(activityName => {
          const subs = sortedSubactivities(activityName);
          const actClass = actSlug(activityName);

          if (subs.length === 0) {
            return (
              <div key={`${activityName}-mobile-empty`} className="mobile-pontaj-row">
                <div className="mobile-pontaj-main">
                  <span className={`activity-code act-${actClass}`}>{activityName.slice(0, 3).toUpperCase()}</span>
                  <span className="mobile-pontaj-name muted">Nicio subactivitate definită</span>
                </div>
                <div className="mobile-pontaj-actions">
                  <span className="mobile-pontaj-total">—</span>
                </div>
              </div>
            );
          }

          return subs.map(sub => {
            const myTime = getTime(activityName, sub.id);
            const favorite = isFavorite(activityName, sub.id);
            const rowKey = favoriteKey(activityName, sub.id);
            return (
              <div key={`${activityName}-${sub.id}-mobile`} className={`mobile-pontaj-row ${favoritePulseKey === rowKey ? "favorite-promoted" : ""}`}>
                <div className="mobile-pontaj-main">
                  <span className={`activity-code act-${actClass}`}>{activityName.slice(0, 3).toUpperCase()}</span>
                  <span className="mobile-pontaj-name">{sub.name}</span>
                  <button
                    type="button"
                    className={`favorite-btn ${favorite ? "active" : ""}`}
                    aria-label={favorite ? "Scoate de la favorite" : "Marchează ca favorit"}
                    title={favorite ? "Scoate de la favorite" : "Marchează ca favorit"}
                    onClick={() => toggleFavorite(activityName, sub.id)}
                  >
                    {favorite ? "\u2605" : "\u2606"}
                  </button>
                </div>
                <div className="mobile-pontaj-actions">
                  <button
                    type="button"
                    className={`btn-time btn-time-single act-${actClass} ${isSubtractMode ? "subtract" : ""}`}
                    onClick={() => adjustTime(activityName, sub.id)}
                    aria-label={`${isSubtractMode ? "Scade" : "Adaugă"} ${safeSelectedMinutes} minute`}
                  >
                    {safeSelectedMinutes}
                  </button>
                  <span className={`mobile-pontaj-total ${myTime > 0 ? "has-time" : ""}`}>{fmtTime(myTime)}</span>
                </div>
              </div>
            );
          });
        })}
      </div>

    </div>
  );
}

function AdminActivityTimesheet({ projectId, activityName, subactivities, workers }) {
  const { state } = useContext(AppContext);
  const { rows, colTotals, grandTotal } = buildAdminActivityMatrix(state, projectId, activityName, subactivities, workers);

  if (subactivities.length === 0) {
    return (
      <div className="empty-state small">
        <span>Nicio subactivitate. Adaugă din Configurare.</span>
      </div>
    );
  }

  return (
    <section className="week-summary admin-activity-sheet">
      <div className="week-summary-header">
        <h3>Pontaj echipa</h3>
        <span className="week-total-badge">Total activitate: <strong>{fmtTime(grandTotal)}</strong></span>
      </div>
      <div className="timesheet-wrap">
        <table className="timesheet">
          <thead>
            <tr>
              <th className="th-worker">Worker</th>
              {subactivities.map(sub => (
                <th key={sub.id} className="th-sub-col" title={sub.name}>{sub.name}</th>
              ))}
              <th className="th-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {workers.length === 0 && (
              <tr>
                <td colSpan={subactivities.length + 2} className="td-empty">Niciun worker definit.</td>
              </tr>
            )}
            {rows.map(({ worker, cells, rowTotal }) => (
              <tr key={worker.id}>
                <td className="td-worker">
                  <div className="worker-name">
                    <div className="user-avatar sm">{worker.name[0]}</div>
                    <div>
                      <div>{worker.name}</div>
                      <div className="worker-username">@{worker.username}</div>
                    </div>
                  </div>
                </td>
                {cells.map((mins, ci) => (
                  <td key={subactivities[ci].id} className={`td-mins ${mins > 0 ? "has-time" : ""}`}>
                    {fmtCell(mins)}
                  </td>
                ))}
                <td className="td-total">{rowTotal > 0 ? fmtTime(rowTotal) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="timesheet-foot">
              <td className="td-foot-label">Total</td>
              {colTotals.map((mins, ci) => (
                <td key={subactivities[ci].id} className={`td-mins td-foot ${mins > 0 ? "has-time" : ""}`}>
                  {mins > 0 ? fmtTime(mins) : "—"}
                </td>
              ))}
              <td className="td-total td-foot-week">{fmtTime(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function ActivityView() {
  const { state, setState, currentUser, selectedProject, selectedActivity, setView, notify } = useContext(AppContext);
  const [timeMode, setTimeMode] = useState("add");
  const project = state.projects.find(p => p.id === selectedProject);
  const isAdmin = currentUser?.role === "admin";
  const timeButtons = getTimeButtons(state);
  if (!project || !selectedActivity) return null;

  const subactivities = getSubactivities(state, selectedActivity);
  const workers = state.users.filter(u => u.role === "worker");
  const isSubtractMode = timeMode === "subtract";

  function adjustTime(subId, mins) {
    const key = timeLogKey(selectedProject, selectedActivity, subId, currentUser.id);
    const today = dateKeyLocal(new Date());
    const delta = isSubtractMode ? -mins : mins;
    const prev = state.timeLogs[key];
    const todayBefore = minutesOnDate(prev, today);

    if (isSubtractMode && todayBefore === 0) {
      notify("Nu ai timp de scazut azi pe aceasta subactivitate.", "info");
      return;
    }

    setState(s => {
      const entry = s.timeLogs[key];
      const daily = adjustTimeLogEntry(entry, delta, today);
      const nextLogs = { ...s.timeLogs };
      if (!daily || (typeof daily === "object" && Object.keys(daily).length === 0)) {
        delete nextLogs[key];
      } else {
        nextLogs[key] = daily;
      }
      return { ...s, timeLogs: nextLogs };
    });

    notify(isSubtractMode ? `-${mins} min scăzute!` : `+${mins} min adăugate!`);
  }

  function getTime(subId) {
    return totalLogMinutes(state.timeLogs[timeLogKey(selectedProject, selectedActivity, subId, currentUser.id)]);
  }

  return (
    <div className={`page ${isAdmin ? "page-wide" : ""}`}>
      <div className="breadcrumb">
        <button onClick={() => setView("dashboard")}>Proiecte</button>
        <span>/</span>
        <button onClick={() => setView("project")}>{project.name}</button>
        <span>/</span><span className="breadcrumb-current">{selectedActivity}</span>
      </div>
      <div className="page-header">
        <div>
          <h2>{project.name}</h2>
          <p className={`page-sub page-sub-act act-${actSlug(selectedActivity)}`}>{selectedActivity}</p>
        </div>
      </div>

      {isAdmin ? (
        <>
          <p className="config-hint">Pontajul se face doar de workeri. Gestionează subactivitățile din <button type="button" className="link-btn" onClick={() => setView("config")}>Configurare</button>.</p>
          <AdminActivityTimesheet
            projectId={selectedProject}
            activityName={selectedActivity}
            subactivities={subactivities}
            workers={workers}
          />
        </>
      ) : (
        <>
        <div className="time-mode-bar">
          <span className="time-mode-label">Mod pontaj</span>
          <div className="time-mode-switch" role="group" aria-label="Mod pontaj">
            <button
              type="button"
              className={`time-mode-btn ${!isSubtractMode ? "active" : ""}`}
              onClick={() => setTimeMode("add")}
              aria-pressed={!isSubtractMode}
            >
              +
            </button>
            <button
              type="button"
              className={`time-mode-btn ${isSubtractMode ? "active" : ""}`}
              onClick={() => setTimeMode("subtract")}
              aria-pressed={isSubtractMode}
            >
              -
            </button>
          </div>
          <span className="time-mode-hint">{isSubtractMode ? "Scade timp la click" : "Adaugă timp la click"}</span>
        </div>
        <div className="subact-list">
          {subactivities.length === 0 && (
            <div className="empty-state small">
              <span>Nicio subactivitate definită de admin.</span>
            </div>
          )}
          {subactivities.map((sub, i) => {
            const myTime = getTime(sub.id);
            const actClass = actSlug(selectedActivity);
            return (
              <div key={sub.id} className="subact-item">
                <span className="subact-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="subact-name">{sub.name}</span>
                <div className="time-controls">
                  {timeButtons.map(m => (
                    <button
                      key={m}
                      className={`btn-time act-${actClass} ${isSubtractMode ? "subtract" : ""}`}
                      onClick={() => adjustTime(sub.id, m)}
                    >
                      {isSubtractMode ? "-" : "+"}{m}min
                    </button>
                  ))}
                  <span className={`time-badge ${myTime > 0 ? "has-time" : ""}`}>
                    {fmtTime(myTime)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}

function ConfigView() {
  const { state, setState, notify, confirm } = useContext(AppContext);
  const [tab, setTab] = useState("time");
  const [newBtnMins, setNewBtnMins] = useState("");
  const [newActivity, setNewActivity] = useState("");
  const [newSubByAct, setNewSubByAct] = useState({});

  const activityTypes = getActivityTypes(state);
  const timeButtons = getTimeButtons(state);

  function addTimeButton() {
    const mins = parseInt(newBtnMins, 10);
    if (!mins || mins < 1 || mins > 480) return;
    const current = getTimeButtons(state);
    if (current.includes(mins)) { notify("Acest buton exista deja.", "info"); return; }
    setState(s => ({ ...s, timeButtons: [...getTimeButtons(s), mins] }));
    setNewBtnMins("");
    notify("Buton adăugat!");
  }

  function removeTimeButton(mins) {
    if (getTimeButtons(state).length <= 1) { notify("Trebuie să rămână cel puțin un buton.", "info"); return; }
    confirm(`Ștergi butonul +${mins} min?`, () => {
      setState(s => ({ ...s, timeButtons: getTimeButtons(s).filter(m => m !== mins) }));
      notify("Buton șters.", "info");
    });
  }

  function addActivityType() {
    const name = newActivity.trim();
    if (!name) return;
    if (activityTypes.some(a => a.toLowerCase() === name.toLowerCase())) {
      notify("Activitatea exista deja.", "info");
      return;
    }
    setState(s => ({
      ...s,
      activityTypes: [...getActivityTypes(s), name],
      subactivitiesByActivity: { ...getSubactivitiesCatalog(s), [name]: [] },
    }));
    setNewActivity("");
    notify("Activitate adăugata!");
  }

  function removeActivityType(actName) {
    const usedByWorker = state.users.some(u => u.role === "worker" && u.activity === actName);
    if (usedByWorker) { notify("Activitatea e folosita de un worker.", "info"); return; }
    if (activityTypes.length <= 1) { notify("Trebuie să rămână cel puțin o activitate.", "info"); return; }
    confirm(`Ștergi activitatea „${actName}”?`, () => {
      setState(s => {
        const { [actName]: _, ...restSubs } = getSubactivitiesCatalog(s);
        return {
          ...s,
          activityTypes: getActivityTypes(s).filter(a => a !== actName),
          subactivitiesByActivity: restSubs,
        };
      });
      notify("Activitate ștearsă.", "info");
    });
  }

  function addSubactivity(actName) {
    const name = (newSubByAct[actName] || "").trim();
    if (!name) return;
    setState(s => ({
      ...s,
      subactivitiesByActivity: {
        ...getSubactivitiesCatalog(s),
        [actName]: [...getSubactivities(s, actName), { id: uid(), name }],
      },
    }));
    setNewSubByAct(prev => ({ ...prev, [actName]: "" }));
    notify("Subactivitate adăugata!");
  }

  function deleteSubactivity(actName, subId) {
    confirm("Ștergi această subactivitate?", () => {
      setState(s => ({
        ...s,
        subactivitiesByActivity: {
          ...getSubactivitiesCatalog(s),
          [actName]: getSubactivities(s, actName).filter(sub => sub.id !== subId),
        },
      }));
      notify("Subactivitate ștearsă.", "info");
    });
  }

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h2>Configurare</h2>
          <p className="page-sub">Butoane de pontaj, activități și subactivități</p>
        </div>
      </div>

      <div className="config-tabs">
        <button className={`config-tab ${tab === "time" ? "active" : ""}`} onClick={() => setTab("time")}>Butoane timp</button>
        <button className={`config-tab ${tab === "activities" ? "active" : ""}`} onClick={() => setTab("activities")}>Activități & subactivități</button>
      </div>

      {tab === "time" && (
        <div className="config-panel">
          <p className="config-panel-desc">Aceste butoane apar la workeri când ponteaza timp pe o subactivitate.</p>
          <div className="config-btn-list">
            {timeButtons.map(mins => (
              <div key={mins} className="config-btn-item">
                <span className="config-btn-preview">+{mins} min</span>
                <button className="btn-icon danger sm" onClick={() => removeTimeButton(mins)} title="Șterge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="add-row">
            <input
              type="number"
              min={1}
              max={480}
              value={newBtnMins}
              onChange={e => setNewBtnMins(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTimeButton()}
              placeholder="Minute (ex: 15)"
            />
            <button className="btn-primary" onClick={addTimeButton}>Adaugă buton</button>
          </div>
        </div>
      )}

      {tab === "activities" && (
        <div className="config-panel">
          <section className="config-section">
            <h3 className="config-section-title">Tipuri de activități</h3>
            <p className="config-panel-desc">Lista globală de activități. "Administrativ" e vizibil tuturor workerilor.</p>
            <div className="config-act-types">
              {activityTypes.map(act => (
                <div key={act} className="config-act-type-row">
                  <span className={`pill pill-${actSlug(act)}`}>{act}</span>
                  {act !== "Administrativ" && (
                    <button className="btn-icon danger sm" onClick={() => removeActivityType(act)} title="Șterge activitate">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="add-row">
              <input value={newActivity} onChange={e => setNewActivity(e.target.value)} onKeyDown={e => e.key === "Enter" && addActivityType()} placeholder="Activitate noua (ex: Zugraveli)" />
              <button className="btn-primary" onClick={addActivityType}>Adaugă activitate</button>
            </div>
          </section>

          <section className="config-section">
            <h3 className="config-section-title">Subactivități</h3>
            <p className="config-panel-desc">
              Aceleași subactivități se aplică la toate proiectele, pentru fiecare tip de activitate.
            </p>
            {activityTypes.map(actName => {
              const subs = getSubactivities(state, actName);
              return (
                <div key={actName} className={`config-act-block act-${actSlug(actName)}`}>
                  <div className="config-act-block-head">
                    <span className={`pill pill-${actSlug(actName)}`}>{actName}</span>
                    <span className="config-act-count">{subs.length} subactivit.</span>
                  </div>
                  <ul className="config-sub-list">
                    {subs.length === 0 && <li className="config-sub-empty">Nicio subactivitate</li>}
                    {subs.map(sub => (
                      <li key={sub.id} className="config-sub-item">
                        <span>{sub.name}</span>
                        <button className="btn-icon danger sm" onClick={() => deleteSubactivity(actName, sub.id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="add-row">
                    <input
                      value={newSubByAct[actName] || ""}
                      onChange={e => setNewSubByAct(prev => ({ ...prev, [actName]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addSubactivity(actName)}
                      placeholder="Subactivitate noua..."
                    />
                    <button className="btn-primary" onClick={() => addSubactivity(actName)}>Adaugă</button>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}

function WorkersView() {
  const { state, setState, setView, setSelectedWorker, notify, confirm } = useContext(AppContext);
  const workers = state.users.filter(u => u.role === "worker");

  function openWorker(workerId) {
    setSelectedWorker(workerId);
    setView("workerProjects");
  }

  function deleteWorker(id) {
    confirm("Ești sigur că vrei să Ștergi acest worker?", () => {
      setState(s => ({ ...s, users: s.users.filter(u => u.id !== id) }));
      notify("Worker șters.", "info");
    });
  }
  return (
    <div className="page">
      <div className="page-header">
        <div><h2>Workeri</h2><p className="page-sub">{workers.length} utilizatori activi</p></div>
        <button className="btn-primary" onClick={() => setView("newWorker")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Worker nou
        </button>
      </div>
      <div className="workers-table">
        <div className="table-header"><span>Nume</span><span>Username</span><span>Email</span><span>Activitate</span><span></span></div>
        {workers.length === 0 && <div className="empty-state small"><span>Niciun worker creat.</span></div>}
        {workers.map(w => (
          <div key={w.id} className="table-row clickable-row" onClick={() => openWorker(w.id)}>
            <span className="worker-name"><UserAvatar user={w} size="sm" />{w.name}</span>
            <span className="worker-username">@{w.username}</span>
            <span className="worker-email">{w.email || "-"}</span>
            <span><span className={`pill pill-${actSlug(w.activity || "")}`}>{w.activity}</span></span>
            <span>
              <button className="btn-icon danger" onClick={e => { e.stopPropagation(); deleteWorker(w.id); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkerProjectsView() {
  const { state, selectedWorker, setSelectedWorker, setSelectedProject, setView } = useContext(AppContext);
  const worker = state.users.find(u => u.id === selectedWorker && u.role === "worker");
  if (!worker) return null;
  const projects = state.projects.filter(project => hasWorkerTimeOnProject(state, project.id, worker.id));

  function openProject(projectId) {
    setSelectedProject(projectId);
    setView("workerProjectTimesheet");
  }

  return (
    <div className="page">
      <div className="breadcrumb">
        <button onClick={() => { setView("workers"); setSelectedWorker(null); }}>Workeri</button>
        <span>/</span><span className="breadcrumb-current">{worker.name}</span>
      </div>
      <div className="page-header">
        <div>
          <h2>{worker.name}</h2>
          <p className="page-sub">@{worker.username} · {worker.activity || "Administrativ"}</p>
        </div>
        <button type="button" className="btn-ghost export-btn" onClick={() => exportWorkerMonthXls(state, worker, projects)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/></svg>
          Export XLS {getLastCompletedMonth().label}
        </button>
      </div>
      {projects.length === 0 ? (
        <div className="empty-state small"><span>Workerul nu are pontaje pe niciun proiect.</span></div>
      ) : (
        <div className="worker-project-list">
          {projects.map(project => {
            const totalMins = getProjectTotalMinutes(state, project.id, worker.id);
            return (
              <button key={project.id} type="button" className="worker-project-row" onClick={() => openProject(project.id)}>
                <div className="archived-project-main">
                  <div className="project-initials sm">{project.name[0]}{project.name.split(" ")[1]?.[0] || ""}</div>
                  <div className="archived-project-copy">
                    <h4>{project.name}</h4>
                    <p>{project.client}</p>
                  </div>
                </div>
                <span className={`archived-total ${totalMins > 0 ? "has-time" : ""}`}>{fmtTime(totalMins)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkerProjectTimesheetView() {
  const { state, selectedWorker, selectedProject, setSelectedWorker, setSelectedProject, setView } = useContext(AppContext);
  const worker = state.users.find(u => u.id === selectedWorker && u.role === "worker");
  const project = state.projects.find(p => p.id === selectedProject);
  if (!worker || !project) return null;
  const visibleActivities = ["Administrativ", worker.activity].filter(Boolean);

  return (
    <div className="page page-wide">
      <div className="breadcrumb">
        <button onClick={() => { setView("workers"); setSelectedWorker(null); setSelectedProject(null); }}>Workeri</button>
        <span>/</span><button onClick={() => { setView("workerProjects"); setSelectedProject(null); }}>{worker.name}</button>
        <span>/</span><span className="breadcrumb-current">{project.name}</span>
      </div>
      <div className="page-header">
        <div>
          <h2>{project.name}</h2>
          <p className="page-sub">{worker.name} · <strong>{fmtTime(getProjectTotalMinutes(state, project.id, worker.id))}</strong></p>
        </div>
        <button type="button" className="btn-ghost export-btn" onClick={() => exportWorkerMonthXls(state, worker, [project])}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/></svg>
          Export XLS {getLastCompletedMonth().label}
        </button>
      </div>
      <WorkerWeekSummary
        project={project}
        visibleActivities={visibleActivities}
        userId={worker.id}
        title={`Pontaj ${worker.name}`}
      />
    </div>
  );
}

function ProfileView() {
  const { state, setState, currentUser, setCurrentUser, notify } = useContext(AppContext);
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [companyName, setCompanyName] = useState(state.settings?.companyName ?? "");
  const [passwordErrors, setPasswordErrors] = useState({});
  const [companyError, setCompanyError] = useState("");
  const isAdmin = currentUser?.role === "admin";
  const companyLocked = Boolean(state.settings?.companyName);

  function updateUser(patch) {
    setState(s => ({
      ...s,
      users: s.users.map(u => u.id === currentUser.id ? { ...u, ...patch } : u),
    }));
    setCurrentUser(u => u?.id === currentUser.id ? { ...u, ...patch } : u);
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateUser({ photo: reader.result });
      notify("Poza de profil a fost salvata.");
    };
    reader.readAsDataURL(file);
  }

  function savePassword() {
    const nextErrors = {};
    if (!password.trim()) nextErrors.password = "Introdu parola noua.";
    else if (password.length < 4) nextErrors.password = "Parola trebuie să aibă cel puțin 4 caractere.";
    if (password && password !== passwordAgain) nextErrors.passwordAgain = "Parolele nu coincid.";
    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors);
      return;
    }
    updateUser({ password });
    setPassword("");
    setPasswordAgain("");
    setPasswordErrors({});
    notify("Parola a fost schimbată.");
  }

  function saveCompany() {
    const value = companyName.trim();
    if (!isAdmin || companyLocked) return;
    if (!value) {
      setCompanyError("Completează numele firmei.");
      return;
    }
    setState(s => ({ ...s, settings: { ...(s.settings ?? {}), companyName: value } }));
    setCompanyError("");
    notify("Numele firmei a fost setat.");
  }

  return (
    <div className="page profile-page">
      <div className="page-header">
        <div>
          <h2>Profil utilizator</h2>
          <p className="page-sub">{state.settings?.companyName || "Firma nu a fost setată încă"}</p>
        </div>
      </div>

      <div className="profile-layout">
        <section className="profile-card profile-identity">
          <UserAvatar user={currentUser} size="xl" />
          <div>
            <h3>{currentUser.name}</h3>
            <p>@{currentUser.username}</p>
          </div>
          <label className="btn-ghost profile-photo-btn">
            Schimba poza
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </label>
        </section>

        <section className="profile-card profile-info">
          <h3>Detalii</h3>
          <div className="profile-facts">
            <div><span>Vechime</span><strong>{formatTenure(currentUser.createdAt)}</strong></div>
            <div><span>Tip cont</span><strong>{isAdmin ? "Administrator" : "Worker"}</strong></div>
            <div><span>Tip worker</span><strong>{currentUser.activity || "Administrativ"}</strong></div>
            <div><span>Firmă</span><strong>{state.settings?.companyName || "Nesetată"}</strong></div>
          </div>
        </section>

        <section className="profile-card">
          <h3>Schimbare parola</h3>
          <div className="field">
            <label>Parolă nou?</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setPasswordErrors(errors => ({ ...errors, password: "" })); }} placeholder="••••••••" />
            {passwordErrors.password && <p className="field-error">{passwordErrors.password}</p>}
          </div>
          <div className="field">
            <label>Confirma parola</label>
            <input type="password" value={passwordAgain} onChange={e => { setPasswordAgain(e.target.value); setPasswordErrors(errors => ({ ...errors, passwordAgain: "" })); }} placeholder="••••••••" />
            {passwordErrors.passwordAgain && <p className="field-error">{passwordErrors.passwordAgain}</p>}
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={savePassword}>Salveaza parola</button>
          </div>
        </section>

        {isAdmin && (
          <section className="profile-card">
            <h3>Firma</h3>
            <div className="field">
              <label>Numele firmei</label>
              <input
                value={companyName}
                onChange={e => { setCompanyName(e.target.value); setCompanyError(""); }}
                placeholder="ex: SC Electric Pro SRL"
                disabled={companyLocked}
              />
              {companyError && <p className="field-error">{companyError}</p>}
              <p className="field-note">
                {companyLocked ? "Numele firmei este setat și apare la toți workerii." : "Se poate seta o singură dată de administrator."}
              </p>
            </div>
            {!companyLocked && (
              <div className="form-actions">
                <button className="btn-primary" onClick={saveCompany}>Seteaza firma</button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function NewProjectForm() {
  const { state, setState, setView, notify } = useContext(AppContext);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [errors, setErrors] = useState({});
  const activityTypes = getActivityTypes(state);
  function submit() {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "Completează numele proiectului.";
    if (!client.trim()) nextErrors.client = "Completează clientul.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setState(s => ({ ...s, projects: [...s.projects, { id: uid(), name: name.trim(), client: client.trim(), createdAt: dateKeyLocal(new Date()) }] }));
    notify("Proiect creat cu succes!");
    setView("dashboard");
  }
  return (
    <div className="page">
      <div className="breadcrumb"><button onClick={() => setView("dashboard")}>Proiecte</button><span>/</span><span>Proiect nou</span></div>
      <div className="form-card">
        <h2>Proiect nou</h2>
        <div className="field">
          <label>Numele proiectului</label>
          <input value={name} onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: "" })); }} placeholder="ex: Renovare Sediu Central" autoFocus />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>
        <div className="field">
          <label>Client</label>
          <input value={client} onChange={e => { setClient(e.target.value); setErrors(prev => ({ ...prev, client: "" })); }} placeholder="ex: SC Construcșii Alpha SRL" />
          {errors.client && <p className="field-error">{errors.client}</p>}
        </div>
        <div className="field-info"><p>Proiectul folosește activitățile și subactivitățile globale din Configurare: <strong>{activityTypes.join(", ")}</strong>.</p></div>
        <div className="form-actions">
          <button className="btn-ghost" onClick={() => setView("dashboard")}>Anuleaza</button>
          <button className="btn-primary" onClick={submit}>Creeaza proiect</button>
        </div>
      </div>
    </div>
  );
}

function NewWorkerForm() {
  const { state, setState, setView, notify } = useContext(AppContext);
  const nameInputRef = useRef(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lastInvite, setLastInvite] = useState(null);
  const [errors, setErrors] = useState({});
  const workerActivities = getActivityTypes(state).filter(a => a !== "Administrativ");
  const [activity, setActivity] = useState(workerActivities[0] || "Electric");

  function buildInviteMessage(workerName, workerUsername, workerPassword) {
    return `Salut ${workerName},

și-am creat contul în TimeS.

User: ${workerUsername}
Parolă: ${workerPassword}

Te poși autentifica în aplicașie cu datele de mai sus.`;
  }

  async function copyInvite() {
    if (!lastInvite) return;
    try {
      await navigator.clipboard.writeText(lastInvite.body);
      notify("Mesajul a fost copiat.");
    } catch {
      notify("Nu am putut copia automat. Selecteaza textul din caseta.", "info");
    }
  }

  function openGmailInvite() {
    if (!lastInvite) return;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lastInvite.email)}&su=${encodeURIComponent(lastInvite.subject)}&body=${encodeURIComponent(lastInvite.body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openMailAppInvite() {
    if (!lastInvite) return;
    window.location.href = `mailto:${lastInvite.email}?subject=${encodeURIComponent(lastInvite.subject)}&body=${encodeURIComponent(lastInvite.body)}`;
  }

  function closeInvitePopup() {
    setLastInvite(null);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }

  function submit() {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const nextErrors = {};
    if (!trimmedName) nextErrors.name = "Completează numele complet.";
    if (!trimmedUsername) nextErrors.username = "Completează username-ul.";
    else if (state.users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase())) nextErrors.username = "Username-ul este deja folosit.";
    if (!trimmedEmail) nextErrors.email = "Completează adresa de email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) nextErrors.email = "Introdu o adresă de email validă.";
    if (!trimmedPassword) nextErrors.password = "Completează parola.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setState(s => ({
      ...s,
      users: [
        ...s.users,
        {
          id: uid(),
          name: trimmedName,
          username: trimmedUsername,
          email: trimmedEmail,
          password: trimmedPassword,
          role: "worker",
          activity,
          createdAt: dateKeyLocal(new Date()),
          photo: "",
        },
      ],
    }));

    setLastInvite({
      email: trimmedEmail,
      subject: "Contul tau TimeS",
      body: buildInviteMessage(trimmedName, trimmedUsername, trimmedPassword),
    });

    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setErrors({});
    notify("Worker creat. Mesajul pentru email este pregatit.");
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }
  return (
    <div className="page">
      {lastInvite && (
        <div className="invite-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
          <div className="invite-modal">
            <div className="invite-modal-header">
              <div>
                <h3 id="invite-modal-title">Email pregatit</h3>
                <p>{lastInvite.email}</p>
              </div>
              <button className="btn-icon" type="button" aria-label="Închide" onClick={closeInvitePopup}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <p className="invite-modal-note">Trimite mesajul din Gmail, din aplicașia de mail sau copiază textul.</p>
            <textarea value={lastInvite.body} readOnly />
            <div className="invite-actions">
              <button className="btn-primary" type="button" onClick={openGmailInvite}>Deschide Gmail</button>
              <button className="btn-ghost" type="button" onClick={openMailAppInvite}>Email app</button>
              <button className="btn-ghost" type="button" onClick={copyInvite}>Copiaza text</button>
              <button className="btn-ghost" type="button" onClick={closeInvitePopup}>Închide</button>
            </div>
          </div>
        </div>
      )}
      <div className="breadcrumb"><button onClick={() => setView("workers")}>Workeri</button><span>/</span><span>Worker nou</span></div>
      <div className="form-card">
        <h2>Worker nou</h2>
        <div className="field">
          <label>Nume complet</label>
          <input ref={nameInputRef} value={name} onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: "" })); }} placeholder="ex: Gheorghe Marin" autoFocus />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>
        <div className="field">
          <label>Username</label>
          <input value={username} onChange={e => { setUsername(e.target.value); setErrors(prev => ({ ...prev, username: "" })); }} placeholder="ex: gheorghe sau gheorghe@email.ro" />
          {errors.username && <p className="field-error">{errors.username}</p>}
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "" })); }} placeholder="ex: gheorghe@email.ro" />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div className="field">
          <label>Parolă</label>
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: "" })); }} placeholder="••••••••" />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <div className="field">
          <label>Activitate asignat?</label>
          <div className="activity-select">
            {workerActivities.map(a => (
              <button key={a} className={`act-btn act-${actSlug(a)} ${activity === a ? "selected" : ""}`} onClick={() => setActivity(a)}>
                {actIcon(a)} {a}
              </button>
            ))}
          </div>
          <p className="field-note">Fiecare worker poate fi asignat la o singură activitate. Administrativ este vizibil pentru toți.</p>
        </div>
        <div className="form-actions">
          <button className="btn-ghost" onClick={() => setView("workers")}>Anuleaza</button>
          <button className="btn-primary" onClick={submit}>Creeaza worker</button>
        </div>
      </div>
    </div>
  );
}

function actIcon(n) { return n==="Electric"?"EL":n==="Instalatii"?"IN":n==="Tamplarie"?"TA":"AD"; }
function actDesc(n) { return n==="Electric"?"Lucrări electrice, tablouri, cablaje":n==="Instalatii"?"Instalașii sanitare, termice, HVAC":n==="Tamplarie"?"Uși, ferestre, mobilier, finisaje":"Informașii generale, documente, note"; }
