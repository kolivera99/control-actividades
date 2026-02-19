import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";

const ESTADOS = [
  { id: "pendiente", label: "Pendiente", color: "#F59E0B", bg: "#FEF3C7", text: "#92400E" },
  { id: "en_proceso", label: "En Proceso", color: "#3B82F6", bg: "#DBEAFE", text: "#1E40AF" },
  { id: "completado", label: "Completado", color: "#10B981", bg: "#D1FAE5", text: "#065F46" },
  { id: "bloqueado", label: "Bloqueado", color: "#EF4444", bg: "#FEE2E2", text: "#991B1B" },
  { id: "cancelado", label: "Cancelado", color: "#6B7280", bg: "#F3F4F6", text: "#374151" },
];
const PRIORIDADES = [
  { id: "alta", label: "Alta", color: "#EF4444", bg: "#FEE2E2", text: "#991B1B" },
  { id: "media", label: "Media", color: "#F59E0B", bg: "#FEF3C7", text: "#92400E" },
  { id: "baja", label: "Baja", color: "#6B7280", bg: "#F3F4F6", text: "#374151" },
];

const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD || "admin123";
const SESSION_HOURS = 8;
const CH = {
  dash: String.fromCharCode(8212),
  gear: String.fromCharCode(9881),
  check: String.fromCharCode(10003),
  cross: String.fromCharCode(10005),
  pencil: String.fromCharCode(9999) + String.fromCharCode(65039),
  trash: String.fromCharCode(55357, 56785) + String.fromCharCode(65039),
  clip: String.fromCharCode(55357, 56523),
  dots: String.fromCharCode(8226).repeat(8),
  n: String.fromCharCode(241),
  N: String.fromCharCode(209),
  a: String.fromCharCode(225),
  A: String.fromCharCode(193),
  e: String.fromCharCode(233),
  i: String.fromCharCode(237),
  o: String.fromCharCode(243),
  q: String.fromCharCode(191),
};

const today = () => new Date().toISOString().split("T")[0];
const daysDiff = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date(today())) / 86400000);
};
const fmtDate = (d) => {
  if (!d) return CH.dash;
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};

const LOGO_SRC = "/logo.png";
const CajaLogo = ({ size = 40 }) => (
  <img src={LOGO_SRC} alt="Caja Cusco" style={{ width: size, height: size, objectFit: "contain" }} />
);

/* SESSION */
const getSession = () => {
  try {
    const s = JSON.parse(localStorage.getItem("cc-session"));
    if (!s) return null;
    if (new Date(s.expires_at) < new Date()) { localStorage.removeItem("cc-session"); return null; }
    return s;
  } catch (e) { return null; }
};
const setSession = (user) => {
  const expires = new Date();
  expires.setHours(expires.getHours() + SESSION_HOURS);
  const s = { ...user, expires_at: expires.toISOString(), last_active: new Date().toISOString() };
  localStorage.setItem("cc-session", JSON.stringify(s));
  return s;
};
const refreshSession = () => {
  const s = getSession();
  if (s) {
    const expires = new Date();
    expires.setHours(expires.getHours() + SESSION_HOURS);
    s.expires_at = expires.toISOString();
    s.last_active = new Date().toISOString();
    localStorage.setItem("cc-session", JSON.stringify(s));
  }
};
const clearSession = () => localStorage.removeItem("cc-session");

/* CSS */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');
:root { --red:#c41e3a; --red-dark:#a01830; --red-light:#fce8ec; --red-dim:rgba(196,30,58,0.08); --black:#1a1a1a; --gray-dark:#6c757d; --gray-mid:#95a5a6; --gray-light:#e0e0e0; --gray-bg:#f8f9fa; --white:#ffffff; --green:#10B981; --green-bg:#D1FAE5; --yellow:#F59E0B; --yellow-bg:#FEF3C7; --blue:#3B82F6; --blue-bg:#DBEAFE; --danger:#EF4444; --danger-bg:#FEE2E2; --font:'DM Sans',sans-serif; --mono:'JetBrains Mono',monospace; --radius:8px; --radius-lg:12px; --shadow-sm:0 1px 3px rgba(0,0,0,0.06); --shadow-md:0 4px 12px rgba(0,0,0,0.08); --shadow-lg:0 8px 30px rgba(0,0,0,0.12); }
* { margin:0; padding:0; box-sizing:border-box; }
body, #root { font-family:var(--font); background:var(--gray-bg); color:var(--black); min-height:100vh; }
.app { min-height:100vh; display:flex; flex-direction:column; }
.login-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(160deg,var(--white) 0%,var(--gray-bg) 50%,var(--gray-light) 100%); position:relative; }
.login-wrap::before { content:''; position:absolute; top:0; right:0; width:40%; height:100%; background:var(--red); clip-path:polygon(30% 0,100% 0,100% 100%,0% 100%); opacity:0.04; }
.login-card { position:relative; background:var(--white); border:1px solid var(--gray-light); border-radius:16px; padding:48px 40px; width:380px; max-width:90vw; box-shadow:var(--shadow-lg); animation:slideUp .45s ease-out; }
@keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
.logo-area { display:flex; align-items:center; gap:8px; margin-bottom:32px; }
.logo-text h1 { font-size:18px; font-weight:700; color:var(--black); letter-spacing:-.3px; line-height:1.2; }
.logo-text span { font-size:11px; color:var(--gray-mid); font-weight:400; }
.login-subtitle { font-size:13px; color:var(--gray-dark); margin-bottom:24px; }
.red-line { width:40px; height:3px; background:var(--red); border-radius:2px; margin-bottom:20px; }
.field { margin-bottom:16px; } .field label { display:block; font-size:11px; font-weight:600; color:var(--gray-dark); margin-bottom:5px; text-transform:uppercase; letter-spacing:.5px; }
.input { width:100%; padding:10px 14px; background:var(--white); border:1.5px solid var(--gray-light); border-radius:var(--radius); color:var(--black); font-family:var(--font); font-size:14px; transition:border-color .2s,box-shadow .2s; outline:none; }
.input:focus { border-color:var(--red); box-shadow:0 0 0 3px var(--red-dim); } .input::placeholder { color:var(--gray-mid); }
select.input { cursor:pointer; } textarea.input { resize:vertical; min-height:60px; }
.btn { padding:10px 20px; border-radius:var(--radius); font-family:var(--font); font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .2s; display:inline-flex; align-items:center; gap:6px; }
.btn-red { background:var(--red); color:var(--white); width:100%; justify-content:center; padding:12px; font-size:14px; } .btn-red:hover { background:var(--red-dark); transform:translateY(-1px); box-shadow:var(--shadow-md); }
.btn-outline { background:var(--white); color:var(--black); border:1.5px solid var(--gray-light); } .btn-outline:hover { border-color:var(--gray-mid); background:var(--gray-bg); }
.btn-ghost { background:var(--red-dim); color:var(--red); border:1px solid rgba(196,30,58,.15); } .btn-ghost:hover { background:rgba(196,30,58,.14); }
.btn-danger-outline { background:var(--danger-bg); color:var(--danger); border:1px solid rgba(239,68,68,.2); }
.btn-sm { padding:6px 12px; font-size:12px; }
.topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; background:var(--white); border-bottom:1px solid var(--gray-light); position:sticky; top:0; z-index:50; box-shadow:var(--shadow-sm); }
.topbar-left { display:flex; align-items:center; gap:14px; } .topbar-brand { display:flex; align-items:center; gap:6px; }
.topbar-brand .name { font-size:15px; font-weight:700; color:var(--black); letter-spacing:-.3px; } .topbar-brand .pipe { width:1px; height:22px; background:var(--gray-light); }
.topbar-badge { font-size:10px; font-family:var(--mono); font-weight:600; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:.5px; }
.topbar-badge.gerente { background:var(--red-light); color:var(--red); } .topbar-badge.area { background:var(--blue-bg); color:var(--blue); }
.topbar-right { display:flex; align-items:center; gap:8px; }
.main { flex:1; padding:24px 28px; max-width:1400px; margin:0 auto; width:100%; }
.tabs { display:flex; gap:2px; margin-bottom:20px; background:var(--white); padding:4px; border-radius:var(--radius-lg); border:1px solid var(--gray-light); overflow-x:auto; box-shadow:var(--shadow-sm); }
.tab { padding:7px 16px; font-size:12px; font-weight:500; color:var(--gray-mid); background:transparent; border:none; border-radius:var(--radius); cursor:pointer; white-space:nowrap; transition:all .2s; font-family:var(--font); } .tab:hover { color:var(--gray-dark); } .tab.active { background:var(--red); color:var(--white); box-shadow:var(--shadow-sm); }
.stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(145px,1fr)); gap:12px; margin-bottom:20px; }
.stat { background:var(--white); border:1px solid var(--gray-light); border-radius:var(--radius-lg); padding:16px 18px; transition:border-color .2s,box-shadow .2s; box-shadow:var(--shadow-sm); } .stat:hover { border-color:var(--gray-mid); box-shadow:var(--shadow-md); }
.stat .label { font-size:10px; color:var(--gray-mid); text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; font-weight:600; } .stat .value { font-size:28px; font-weight:700; font-family:var(--mono); line-height:1.1; } .stat .sub { font-size:10px; color:var(--gray-dark); margin-top:2px; }
.stat.alert { border-left:3px solid var(--danger); } .stat.warn { border-left:3px solid var(--yellow); }
.table-wrap { background:var(--white); border:1px solid var(--gray-light); border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-sm); }
.table-bar { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--gray-light); flex-wrap:wrap; gap:10px; } .table-bar h2 { font-size:14px; font-weight:600; color:var(--black); }
.table-actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.filter-sel { padding:6px 10px; background:var(--white); border:1.5px solid var(--gray-light); border-radius:var(--radius); color:var(--gray-dark); font-size:12px; font-family:var(--font); cursor:pointer; outline:none; } .filter-sel:focus { border-color:var(--red); }
table { width:100%; border-collapse:collapse; }
thead th { text-align:left; padding:10px 14px; font-size:10px; font-weight:700; color:var(--gray-mid); text-transform:uppercase; letter-spacing:.5px; background:var(--gray-bg); border-bottom:1px solid var(--gray-light); white-space:nowrap; }
tbody tr { border-bottom:1px solid var(--gray-light); transition:background .12s; cursor:pointer; } tbody tr:hover { background:var(--gray-bg); } tbody tr:last-child { border-bottom:none; }
tbody td { padding:11px 14px; font-size:13px; vertical-align:top; }
.task-name { font-weight:600; color:var(--black); margin-bottom:1px; display:flex; align-items:center; gap:6px; } .task-notes { font-size:12px; color:var(--gray-dark); line-height:1.4; max-width:280px; }
.area-tag { font-size:10px; font-family:var(--mono); padding:2px 8px; border-radius:4px; background:var(--red-dim); color:var(--red); font-weight:600; white-space:nowrap; }
.date-cell { font-family:var(--mono); font-size:12px; color:var(--gray-dark); white-space:nowrap; } .date-cell.overdue { color:var(--danger); font-weight:600; } .date-cell.soon { color:var(--yellow); font-weight:600; }
.days-pill { font-size:10px; font-family:var(--mono); padding:2px 8px; border-radius:10px; font-weight:700; white-space:nowrap; } .days-pill.overdue { background:var(--danger-bg); color:var(--danger); } .days-pill.soon { background:var(--yellow-bg); color:#92400E; } .days-pill.ok { background:var(--green-bg); color:#065F46; }
.status-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
.inline-sel { padding:4px 8px; background:var(--white); border:1.5px solid var(--gray-light); border-radius:6px; color:var(--black); font-size:12px; font-family:var(--font); cursor:pointer; outline:none; } .inline-sel:focus { border-color:var(--red); }
.overlay { position:fixed; inset:0; background:rgba(26,26,26,.45); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; z-index:100; animation:fadeIn .2s; } @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
.modal { background:var(--white); border:1px solid var(--gray-light); border-radius:16px; padding:32px; width:520px; max-width:92vw; max-height:90vh; overflow-y:auto; box-shadow:var(--shadow-lg); animation:modalIn .3s ease-out; } @keyframes modalIn { from { opacity:0; transform:translateY(12px) scale(.98) } to { opacity:1; transform:translateY(0) scale(1) } }
.modal h2 { font-size:17px; font-weight:700; margin-bottom:20px; color:var(--black); } .modal-foot { display:flex; gap:10px; margin-top:24px; justify-content:flex-end; }
.area-row { display:flex; align-items:center; justify-content:space-between; padding:9px 12px; background:var(--gray-bg); border-radius:var(--radius); border:1px solid var(--gray-light); margin-bottom:6px; } .area-row .aname { font-size:13px; font-weight:500; }
.add-row { display:flex; gap:8px; margin-top:10px; } .add-row input { flex:1; }
.empty { text-align:center; padding:50px 20px; color:var(--gray-mid); } .empty .icon { font-size:36px; margin-bottom:10px; opacity:.4; }
.err { color:var(--danger); font-size:12px; margin-top:8px; } .ok-msg { color:var(--green); font-size:12px; margin-top:8px; }
.responsive { overflow-x:auto; }
.loading { display:flex; align-items:center; justify-content:center; height:100vh; color:var(--gray-mid); font-size:15px; }
.new-dot { width:8px; height:8px; border-radius:50%; background:var(--red); flex-shrink:0; animation:pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.confirm-overlay { position:fixed; inset:0; background:rgba(26,26,26,.5); display:flex; align-items:center; justify-content:center; z-index:200; }
.confirm-box { background:var(--white); border-radius:12px; padding:24px; width:360px; max-width:90vw; box-shadow:var(--shadow-lg); text-align:center; }
.confirm-box h3 { font-size:15px; margin-bottom:8px; color:var(--black); }
.confirm-box p { font-size:13px; color:var(--gray-dark); margin-bottom:20px; }
.confirm-actions { display:flex; gap:10px; justify-content:center; }
@media(max-width:768px) { .main { padding:16px; } .topbar { padding:0 16px; } .stats { grid-template-columns:repeat(2,1fr); } .modal { padding:24px 20px; } }
`;

/* COMPONENTS */

const DaysBadge = ({ fecha, estado }) => {
  if (estado === "completado" || estado === "cancelado") return <span className="days-pill ok">{CH.dash}</span>;
  const d = daysDiff(fecha);
  if (d === null) return null;
  if (d < 0) return <span className="days-pill overdue">{Math.abs(d)}d vencido</span>;
  if (d <= 7) return <span className="days-pill soon">{d}d</span>;
  return <span className="days-pill ok">{d}d</span>;
};

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="confirm-overlay" onClick={onCancel}>
    <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
      <h3>Confirmar</h3>
      <p>{message}</p>
      <div className="confirm-actions">
        <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-danger-outline btn-sm" onClick={onConfirm}>Eliminar</button>
      </div>
    </div>
  </div>
);

const Login = ({ onLogin }) => {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!pw.trim()) return;
    setLoading(true);
    if (pw === MASTER_PASSWORD) { setLoading(false); return onLogin({ role: "gerente", area: null }); }
    const { data } = await supabase.rpc("verify_login", { input_password: pw });
    setLoading(false);
    if (data && data.length > 0 && data[0].is_valid) return onLogin({ role: "area", area: data[0].nombre });
    setErr("Contrase" + CH.n + "a incorrecta");
    setTimeout(() => setErr(""), 3000);
  };
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="logo-area">
          <CajaLogo size={96} />
          <div className="logo-text">
            <h1>caja <span style={{ fontWeight: 800 }}>cusco</span></h1>
            <span>Control de Actividades</span>
          </div>
        </div>
        <div className="red-line" />
        <p className="login-subtitle">{"Ingresa tu contrase" + CH.n + "a para acceder al sistema."}</p>
        <div className="field">
          <label>{"Contrase" + CH.n + "a"}</label>
          <input className="input" type="password" placeholder={CH.dots} value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn btn-red" onClick={submit} style={{ marginTop: 8 }}>
          {loading ? "Verificando..." : "Ingresar"}
        </button>
      </div>
    </div>
  );
};

const TaskForm = ({ onClose, onSave, areasList, edit, userArea }) => {
  const [f, setF] = useState(edit ? {
    actividad: edit.actividad, area: edit.area, responsable: edit.responsable,
    fecha_inicio: edit.fecha_inicio || today(), fecha_limite: edit.fecha_limite || "",
    estado: edit.estado, notas: edit.notas || "", descripcion: edit.descripcion || "",
    prioridad: edit.prioridad || "media",
  } : {
    actividad: "", area: userArea || (areasList[0] && areasList[0].nombre) || "",
    responsable: "", fecha_inicio: today(), fecha_limite: "", estado: "pendiente",
    notas: "", descripcion: "", prioridad: "media",
  });
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const ok = f.actividad.trim() && f.area && f.responsable.trim() && f.fecha_limite;
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!ok || saving) return;
    setSaving(true);
    await onSave({ ...f, id: edit ? edit.id : undefined });
    setSaving(false);
    onClose();
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{edit ? "Editar Actividad" : "Nueva Actividad"}</h2>
        <div className="field">
          <label>{CH.A + "rea"}</label>
          <select className="input" value={f.area} onChange={(e) => upd("area", e.target.value)} disabled={!!userArea}>
            {(userArea ? [{ nombre: userArea }] : areasList).map((a) => <option key={a.nombre} value={a.nombre}>{a.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Actividad</label>
          <input className="input" placeholder={"Descripci" + CH.o + "n de la actividad"} value={f.actividad} onChange={(e) => upd("actividad", e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Responsable</label>
          <input className="input" placeholder="Nombre" value={f.responsable} onChange={(e) => upd("responsable", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field"><label>Fecha Inicio</label><input className="input" type="date" value={f.fecha_inicio} onChange={(e) => upd("fecha_inicio", e.target.value)} /></div>
          <div className="field"><label>{"Fecha L" + CH.i + "mite"}</label><input className="input" type="date" value={f.fecha_limite} onChange={(e) => upd("fecha_limite", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field"><label>Estado</label><select className="input" value={f.estado} onChange={(e) => upd("estado", e.target.value)}>{ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          <div className="field"><label>Prioridad</label><select className="input" value={f.prioridad} onChange={(e) => upd("prioridad", e.target.value)}>{PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
        </div>
        <div className="field"><label>{"Descripci" + CH.o + "n detallada"}</label><textarea className="input" placeholder={"Descripci" + CH.o + "n extendida..."} value={f.descripcion} onChange={(e) => upd("descripcion", e.target.value)} rows={3} /></div>
        <div className="field"><label>Notas / Seguimiento</label><textarea className="input" placeholder="Comentarios, avances..." value={f.notas} onChange={(e) => upd("notas", e.target.value)} rows={2} /></div>
        <div className="modal-foot">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-ghost" onClick={handleSave} style={{ opacity: ok ? 1 : 0.5 }}>{saving ? "Guardando..." : edit ? "Guardar" : "Crear"}</button>
        </div>
      </div>
    </div>
  );
};

const DetailModal = ({ task, onClose, onEdit }) => {
  const est = ESTADOS.find((s) => s.id === task.estado);
  const pri = PRIORIDADES.find((p) => p.id === (task.prioridad || "media"));
  const d = daysDiff(task.fecha_limite);
  const active = !["completado", "cancelado"].includes(task.estado);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <span className="area-tag" style={{ marginBottom: 8, display: "inline-block" }}>{task.area}</span>
            <h2 style={{ marginBottom: 4 }}>{task.actividad}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
            <span className="status-badge" style={{ background: est?.bg, color: est?.text }}>{est?.label}</span>
            <span className="status-badge" style={{ background: pri?.bg, color: pri?.text, fontSize: 10 }}>{"Prioridad: " + pri?.label}</span>
          </div>
        </div>
        {task.descripcion && (
          <div style={{ background: "var(--gray-bg)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16, border: "1px solid var(--gray-light)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-mid)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{"Descripci" + CH.o + "n"}</div>
            <p style={{ fontSize: 13, color: "var(--black)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{task.descripcion}</p>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "var(--gray-bg)", borderRadius: "var(--radius)", padding: "10px 14px", border: "1px solid var(--gray-light)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-mid)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Responsable</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{task.responsable}</div>
          </div>
          <div style={{ background: "var(--gray-bg)", borderRadius: "var(--radius)", padding: "10px 14px", border: "1px solid var(--gray-light)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-mid)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Inicio</div>
            <div style={{ fontSize: 13, fontFamily: "var(--mono)" }}>{fmtDate(task.fecha_inicio)}</div>
          </div>
          <div style={{ background: "var(--gray-bg)", borderRadius: "var(--radius)", padding: "10px 14px", border: "1px solid var(--gray-light)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-mid)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{"L" + CH.i + "mite"}</div>
            <div style={{ fontSize: 13, fontFamily: "var(--mono)", color: active && d < 0 ? "var(--danger)" : active && d <= 7 ? "var(--yellow)" : undefined }}>{fmtDate(task.fecha_limite)}</div>
            {active && d !== null && <div style={{ fontSize: 10, marginTop: 2, color: d < 0 ? "var(--danger)" : d <= 7 ? "#92400E" : "var(--green)" }}>{d < 0 ? `Vencido hace ${Math.abs(d)} d${CH.i}as` : `${d} d${CH.i}as restantes`}</div>}
          </div>
        </div>
        {task.notas && (
          <div style={{ background: "var(--yellow-bg)", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16, border: "1px solid rgba(245,158,11,0.2)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Notas de seguimiento</div>
            <p style={{ fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>{task.notas}</p>
          </div>
        )}
        <div className="modal-foot">
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
          <button className="btn btn-ghost" onClick={() => { onClose(); onEdit(task); }}>{CH.pencil + " Editar"}</button>
        </div>
      </div>
    </div>
  );
};

const ConfigModal = ({ onClose, areas, onUpdate }) => {
  const [la, setLa] = useState(areas.map((a) => ({ ...a })));
  const [na, setNa] = useState(""); const [np, setNp] = useState("");
  const [saved, setSaved] = useState(false); const [saving, setSaving] = useState(false);
  const add = () => {
    const n = na.trim();
    if (!n || la.find((a) => a.nombre === n)) return;
    setLa((p) => [...p, { nombre: n, password: np || n.toLowerCase().replace(/[\s/]/g, "").slice(0, 12), isNew: true }]);
    setNa(""); setNp("");
  };
  const rm = (nombre) => setLa((p) => p.filter((x) => x.nombre !== nombre));
  const updPw = (nombre, pw) => setLa((p) => p.map((a) => a.nombre === nombre ? { ...a, password: pw, changed: true } : a));
  const handleSave = async () => {
    setSaving(true);
    await onUpdate(la);
    setSaving(false); setSaved(true);
    setTimeout(onClose, 600);
  };
  return (
    <div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 580 }}>
      <h2>{"Configurar " + CH.A + "reas y Contrase" + CH.n + "as"}</h2>
      <p style={{ fontSize: 13, color: "var(--gray-dark)", marginBottom: 18 }}>{"Cada " + CH.a + "rea tiene su propia contrase" + CH.n + "a de acceso."}</p>
      <div>{la.map((a) => (
        <div className="area-row" key={a.nombre}>
          <span className="aname">{a.nombre}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input className="input" style={{ width: 130, padding: "5px 10px", fontSize: 12, fontFamily: "var(--mono)" }}
              value={a.password || ""} onChange={(e) => updPw(a.nombre, e.target.value)} placeholder={"nueva contrase" + CH.n + "a"} />
            <button className="btn btn-danger-outline btn-sm" onClick={() => rm(a.nombre)}>{CH.cross}</button>
          </div>
        </div>
      ))}</div>
      <div className="add-row">
        <input className="input" placeholder={"Nueva " + CH.a + "rea"} value={na} onChange={(e) => setNa(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input className="input" style={{ maxWidth: 130, fontFamily: "var(--mono)", fontSize: 12 }} placeholder={"contrase" + CH.n + "a"} value={np} onChange={(e) => setNp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn btn-ghost btn-sm" onClick={add}>+ Agregar</button>
      </div>
      {saved && <div className="ok-msg" style={{ marginTop: 10 }}>{CH.check + " Guardado"}</div>}
      <div className="modal-foot">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ghost" onClick={handleSave}>{saving ? "Guardando..." : "Guardar"}</button>
      </div>
    </div></div>
  );
};

/* MAIN APP */

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [tab, setTab] = useState("todas");
  const [filtro, setFiltro] = useState("todos");
  const [filtroPri, setFiltroPri] = useState("todos");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const sessionCheckRef = useRef(null);

  useEffect(() => { const saved = getSession(); if (saved) setUser(saved); }, []);
  useEffect(() => {
    sessionCheckRef.current = setInterval(() => {
      if (user) { const s = getSession(); if (!s) setUser(null); else refreshSession(); }
    }, 60000);
    return () => clearInterval(sessionCheckRef.current);
  }, [user]);

  const handleLogin = (u) => { const s = setSession(u); setUser(s); };
  const handleLogout = () => { clearSession(); setUser(null); setTab("todas"); setFiltro("todos"); setFiltroPri("todos"); };

  const loadData = useCallback(async () => {
    const [areasRes, tasksRes] = await Promise.all([
      supabase.from("areas").select("id,nombre").order("id"),
      supabase.from("actividades").select("*").order("id"),
    ]);
    if (areasRes.data) setAreas(areasRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    setLoaded(true);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const saveTask = useCallback(async (task) => {
    const isGer = user?.role === "gerente";
    const row = { area: task.area, actividad: task.actividad, responsable: task.responsable,
      fecha_inicio: task.fecha_inicio || null, fecha_limite: task.fecha_limite,
      estado: task.estado, prioridad: task.prioridad || "media",
      notas: task.notas || "", descripcion: task.descripcion || "",
      visto_gerencia: isGer ? true : false };
    if (task.id) { await supabase.from("actividades").update(row).eq("id", task.id); }
    else { await supabase.from("actividades").insert(row); }
    await loadData(); setEditTask(null);
  }, [loadData, user]);

  const updField = useCallback(async (id, k, v) => {
    const isGer = user?.role === "gerente";
    const upd = { [k]: v };
    if (!isGer) upd.visto_gerencia = false;
    await supabase.from("actividades").update(upd).eq("id", id);
    setTasks((p) => p.map((t) => t.id === id ? { ...t, ...upd } : t));
  }, [user]);

  const deleteTask = useCallback(async (id) => {
    await supabase.from("actividades").delete().eq("id", id);
    setTasks((p) => p.filter((t) => t.id !== id));
    setConfirmDelete(null);
  }, []);

  const markSeen = useCallback(async (task) => {
    if (user?.role === "gerente" && !task.visto_gerencia) {
      await supabase.from("actividades").update({ visto_gerencia: true }).eq("id", task.id);
      setTasks((p) => p.map((t) => t.id === task.id ? { ...t, visto_gerencia: true } : t));
    }
    setDetailTask(task);
  }, [user]);

  const updAreas = useCallback(async (newAreas) => {
    const current = areas.map((a) => a.nombre);
    const updated = newAreas.map((a) => a.nombre);
    const removed = current.filter((n) => !updated.includes(n));
    for (const n of removed) { await supabase.from("areas").delete().eq("nombre", n); }
    for (const a of newAreas) {
      if (a.isNew) { await supabase.from("areas").insert({ nombre: a.nombre, password: a.password }); }
      else if (a.changed && a.password) { await supabase.from("areas").update({ password: a.password }).eq("nombre", a.nombre); }
    }
    await loadData();
  }, [areas, loadData]);

  const isG = user?.role === "gerente";
  const filtered = useMemo(() => {
    let r = tasks;
    if (!isG) r = r.filter((t) => t.area === user?.area);
    else if (tab !== "todas") r = r.filter((t) => t.area === tab);
    if (filtro !== "todos") r = r.filter((t) => t.estado === filtro);
    if (filtroPri !== "todos") r = r.filter((t) => (t.prioridad || "media") === filtroPri);
    return r.sort((a, b) => {
      if (a.estado === "completado" && b.estado !== "completado") return 1;
      if (a.estado !== "completado" && b.estado === "completado") return -1;
      return (daysDiff(a.fecha_limite) ?? 999) - (daysDiff(b.fecha_limite) ?? 999);
    });
  }, [tasks, user, tab, filtro, filtroPri, isG]);

  const unseenCount = useMemo(() => isG ? tasks.filter((t) => !t.visto_gerencia).length : 0, [tasks, isG]);
  const stats = useMemo(() => {
    const scope = isG ? tasks : tasks.filter((t) => t.area === user?.area);
    const total = scope.length; const byE = {};
    ESTADOS.forEach((e) => { byE[e.id] = scope.filter((t) => t.estado === e.id).length; });
    const vencidas = scope.filter((t) => !["completado", "cancelado"].includes(t.estado) && daysDiff(t.fecha_limite) !== null && daysDiff(t.fecha_limite) < 0).length;
    const porVencer = scope.filter((t) => !["completado", "cancelado"].includes(t.estado) && daysDiff(t.fecha_limite) !== null && daysDiff(t.fecha_limite) >= 0 && daysDiff(t.fecha_limite) <= 7).length;
    const avance = total > 0 ? Math.round((byE.completado || 0) / total * 100) : 0;
    return { total, byE, vencidas, porVencer, avance };
  }, [tasks, user, isG]);

  if (!loaded) return <div className="app"><style>{CSS}</style><div className="loading">Cargando...</div></div>;
  if (!user) return <div className="app"><style>{CSS}</style><Login onLogin={handleLogin} /></div>;

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="topbar">
        <div className="topbar-left"><div className="topbar-brand">
          <CajaLogo size={50} />
          <span className="name">caja <b>cusco</b></span>
          <span className="pipe" />
          <span className={`topbar-badge ${isG ? "gerente" : "area"}`}>{isG ? "GERENTE" : user.area}</span>
          {isG && unseenCount > 0 && <span style={{ background: "var(--red)", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, fontFamily: "var(--mono)" }}>{unseenCount + " nuevo" + (unseenCount > 1 ? "s" : "")}</span>}
        </div></div>
        <div className="topbar-right">
          {isG && <button className="btn btn-outline btn-sm" onClick={() => setShowConfig(true)}>{CH.gear + " Configurar"}</button>}
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>Salir</button>
        </div>
      </div>
      <div className="main">
        <div className="stats">
          <div className="stat"><div className="label">Total</div><div className="value" style={{ color: "var(--black)" }}>{stats.total}</div><div className="sub">{stats.avance}% completado</div></div>
          <div className="stat"><div className="label">En Proceso</div><div className="value" style={{ color: "var(--blue)" }}>{stats.byE.en_proceso || 0}</div></div>
          <div className="stat"><div className="label">Pendientes</div><div className="value" style={{ color: "var(--yellow)" }}>{stats.byE.pendiente || 0}</div></div>
          <div className="stat"><div className="label">Completadas</div><div className="value" style={{ color: "var(--green)" }}>{stats.byE.completado || 0}</div></div>
          <div className={`stat ${stats.vencidas > 0 ? "alert" : ""}`}><div className="label">Vencidas</div><div className="value" style={{ color: "var(--danger)" }}>{stats.vencidas}</div></div>
          <div className={`stat ${stats.porVencer > 0 ? "warn" : ""}`}><div className="label">Por vencer (7d)</div><div className="value" style={{ color: stats.porVencer > 0 ? "var(--yellow)" : "var(--gray-mid)" }}>{stats.porVencer}</div></div>
        </div>
        {isG && (<div className="tabs">
          <button className={`tab ${tab === "todas" ? "active" : ""}`} onClick={() => setTab("todas")}>Todas</button>
          {areas.map((a) => <button key={a.nombre} className={`tab ${tab === a.nombre ? "active" : ""}`} onClick={() => setTab(a.nombre)}>{a.nombre}</button>)}
        </div>)}
        <div className="table-wrap">
          <div className="table-bar">
            <h2>{isG ? (tab === "todas" ? `Todas las actividades (${filtered.length})` : `${tab} (${filtered.length})`) : `${user.area} (${filtered.length})`}</h2>
            <div className="table-actions">
              <select className="filter-sel" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="todos">Todos los estados</option>
                {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select className="filter-sel" value={filtroPri} onChange={(e) => setFiltroPri(e.target.value)}>
                <option value="todos">Toda prioridad</option>
                {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditTask(null); setShowForm(true); }}>+ Nueva Actividad</button>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="empty"><div className="icon">{CH.clip}</div><p>No hay actividades</p></div>
          ) : (
            <div className="responsive">
              <table>
                <thead><tr>{isG && <th>{CH.A + "rea"}</th>}<th>Actividad</th><th>Responsable</th><th>Inicio</th><th>{"L" + CH.i + "mite"}</th><th>Estado</th><th>Plazo</th><th>Notas</th><th></th></tr></thead>
                <tbody>
                  {filtered.map((t) => {
                    const d = daysDiff(t.fecha_limite);
                    const active = !["completado", "cancelado"].includes(t.estado);
                    const est = ESTADOS.find((s) => s.id === t.estado);
                    const isUnseen = isG && !t.visto_gerencia;
                    return (
                      <tr key={t.id} onDoubleClick={() => markSeen(t)} style={isUnseen ? { background: "rgba(196,30,58,0.03)" } : undefined}>
                        {isG && <td><span className="area-tag">{t.area}</span></td>}
                        <td><div className="task-name">{isUnseen && <span className="new-dot" />}{t.actividad}</div></td>
                        <td style={{ whiteSpace: "nowrap" }}>{t.responsable}</td>
                        <td><span className="date-cell">{fmtDate(t.fecha_inicio)}</span></td>
                        <td><span className={`date-cell ${active && d < 0 ? "overdue" : active && d <= 7 ? "soon" : ""}`}>{fmtDate(t.fecha_limite)}</span></td>
                        <td>
                          <select className="inline-sel" value={t.estado}
                            onChange={(e) => updField(t.id, "estado", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: est?.bg, color: est?.text, fontWeight: 600, borderColor: est?.bg }}>
                            {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </td>
                        <td><DaysBadge fecha={t.fecha_limite} estado={t.estado} /></td>
                        <td><div className="task-notes">{t.notas}</div></td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setEditTask(t); setShowForm(true); }}>{CH.pencil}</button>
                            <button className="btn btn-danger-outline btn-sm" onClick={(e) => { e.stopPropagation(); setConfirmDelete(t); }}>{CH.trash}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {showForm && <TaskForm onClose={() => { setShowForm(false); setEditTask(null); }} onSave={saveTask} areasList={areas} edit={editTask} userArea={isG ? null : user.area} />}
      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} areas={areas} onUpdate={updAreas} />}
      {detailTask && <DetailModal task={detailTask} onClose={() => setDetailTask(null)} onEdit={(t) => { setEditTask(t); setShowForm(true); }} />}
      {confirmDelete && <ConfirmDialog message={CH.q + 'Eliminar "' + confirmDelete.actividad + '"? Esta acci' + CH.o + 'n no se puede deshacer.'} onConfirm={() => deleteTask(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />}
    </div>
  );
}
