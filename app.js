"use strict";
/* DarkVault — plain HTML/CSS/JS version. Everything stays in this browser (IndexedDB).
   - 6-digit code: salted PBKDF2-SHA256 hash only
   - files: AES-256-GCM with a non-extractable device key
   - 5 wrong codes lock the app (30s, doubling, max 1h) */

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => crypto.randomUUID();
const enc = new TextEncoder();
const b64 = (buf) => { const b = new Uint8Array(buf); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const fmtBytes = (n) => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(1) + " MB";
const fmtDT = (t) => new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const initials = (n) => { const p = n.trim().split(/\s+/).filter(Boolean); return !p.length ? "DV" : p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase(); };

// ---------- rules ----------
const TONES = ["blue", "green", "orange", "purple", "cyan", "red"];
const DEFAULT_FOLDERS = [["education", "Education", "blue"], ["certifications", "Certifications", "green"], ["personal", "Personal", "orange"], ["resume", "Resume", "purple"]];
const CATEGORIES = { Education: "blue", Certifications: "green", Professional: "cyan", Personal: "orange", Hackathons: "purple" };
const ALERTS = [[0, "At event time"], [10, "10 min before"], [60, "1 hour before"], [1440, "1 day before"], [10080, "1 week before"]];
const validCode = (c) => /^\d{6}$/.test(c);
function validateFolder(name, folders, ignoreId) {
  const t = name.trim();
  if (!t) return "Folder name is required";
  if (t.length > 30) return "Folder name must be 30 characters or fewer";
  if (folders.some((f) => f.id !== ignoreId && f.name.trim().toLowerCase() === t.toLowerCase())) return "A folder with this name already exists";
  return null;
}
const isOverdue = (r, now) => r.status === "UPCOMING" && r.dateTime < now;
const MAX_ATTEMPTS = 5, BASE_LOCK = 30, MAX_LOCK = 3600;
const lockSecs = (lvl) => Math.min(BASE_LOCK * 2 ** Math.max(0, lvl - 1), MAX_LOCK);

// ---------- storage (IndexedDB key-value + blob store) ----------
const dbp = new Promise((res, rej) => {
  const r = indexedDB.open("darkvault-web", 1);
  r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("blobs"); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
async function idb(store, mode, fn) {
  const db = await dbp;
  return new Promise((res, rej) => { const tx = db.transaction(store, mode); const req = fn(tx.objectStore(store)); tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error); });
}
const kvGet = (k) => idb("kv", "readonly", (s) => s.get(k));
const kvSet = (k, v) => idb("kv", "readwrite", (s) => s.put(v, k));
const blobGet = (k) => idb("blobs", "readonly", (s) => s.get(k));
const blobSet = (k, v) => idb("blobs", "readwrite", (s) => s.put(v, k));
const blobDel = (k) => idb("blobs", "readwrite", (s) => s.delete(k));

const defaultSettings = { theme: "dark", rain: true, autoLock: 60, alerts: true };
let S = { user: null, settings: { ...defaultSettings }, folders: [], docs: [], reminders: [], lockout: { failed: 0, lockLevel: 0, lockedUntil: 0 } };
const save = () => kvSet("state", S);

// ---------- crypto ----------
async function pbkdf2(code, salt, iter) {
  const base = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, 256));
}
async function verifyCode(code) {
  const h = await pbkdf2(code, unb64(S.user.salt), S.user.iterations);
  let d = h.length ^ S.user.codeHash.length;
  for (let i = 0; i < h.length; i++) d |= h.charCodeAt(i) ^ (S.user.codeHash.charCodeAt(i) || 0);
  return d === 0;
}
async function deviceKey() {
  let k = await kvGet("deviceKey");
  if (!k) { k = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); await kvSet("deviceKey", k); }
  return k;
}
async function encryptFile(file) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deviceKey(), await file.arrayBuffer());
  return { iv, data };
}
async function decryptDoc(id) {
  const b = await blobGet(id);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: b.iv }, await deviceKey(), b.data);
}

// ---------- UI primitives ----------
let unlocked = false, route = "home", arg = null, lastActive = Date.now();
const app = $("#app");
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600); }
function modal(html, onMount) {
  const m = $("#modal"); m.innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  onMount && onMount(m);
}
const closeModal = () => { $("#modal").hidden = true; $("#modal").innerHTML = ""; };
const confirmDlg = (title, text, label, fn) => modal(`<h3>${esc(title)}</h3><p class="muted" style="margin:8px 0 16px">${esc(text)}</p>
  <div class="grid2"><button class="btn outline" id="c-no">Cancel</button><button class="btn danger" id="c-yes">${esc(label)}</button></div>`,
  (m) => { $("#c-no", m).onclick = closeModal; $("#c-yes", m).onclick = async () => { closeModal(); await fn(); }; });
function go(r, a = null) { route = r; arg = a; render(); window.scrollTo(0, 0); }
const header = (title, back) => `<div class="header">${back ? `<button class="ghost" data-go="${back[0]}" data-arg="${back[1] ?? ""}" aria-label="Back">←</button>` : ""}<h1>${esc(title)}</h1></div>`;
const brand = (sub) => `<div class="brand"><div class="logo">🔒</div><b>Dark<i>Vault</i></b><span class="muted">${esc(sub)}</span></div>`;

// PIN pad component: calls onDone(code) after 6 digits
function pinPad(onDone) {
  let code = "", busy = false;
  const html = `<div class="code" id="dots">${"<i></i>".repeat(6)}</div><div class="keypad" id="pad">
    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join("")}<button class="blank"></button><button data-k="0">0</button><button data-k="⌫" aria-label="Delete">⌫</button></div>`;
  const mount = () => {
    const dots = [...$("#dots").children];
    const paint = () => dots.forEach((d, i) => d.classList.toggle("on", i < code.length));
    $("#pad").onclick = async (e) => {
      const k = e.target.closest("[data-k]")?.dataset.k; if (!k || busy) return;
      if (k === "⌫") code = code.slice(0, -1); else if (code.length < 6) code += k;
      paint();
      if (code.length === 6) { const c = code; code = ""; busy = true; try { await onDone(c); } finally { busy = false; } paint(); }
    };
  };
  return { html, mount, shake: () => { const d = $("#dots"); d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); } };
}

// ---------- screens ----------
function screenSetup() {
  let step = 1, first = "";
  const draw = () => {
    const p = pinPad(async (c) => {
      if (step === 1) { first = c; step = 2; return draw(); }
      if (c !== first) { toast("Codes didn't match. Try again."); step = 1; first = ""; return draw(); }
      const name = $("#name")?.value?.trim() || S._pendingName || "Agent";
      const salt = crypto.getRandomValues(new Uint8Array(16)), iterations = 310000;
      S.user = { name, salt: b64(salt), iterations, codeHash: await pbkdf2(c, salt, iterations), createdAt: Date.now() };
      S.folders = DEFAULT_FOLDERS.map(([id, n, color]) => ({ id, name: n, color, isDefault: true, createdAt: Date.now() }));
      delete S._pendingName; await save(); unlocked = true; lastActive = Date.now(); go("home");
    });
    app.innerHTML = brand(step === 1 ? "Create your 6-digit security code" : "Confirm your code") +
      (step === 1 ? `<label class="field"><span>Your name</span><input id="name" type="text" maxlength="40" placeholder="Agent" value="${esc(S._pendingName || "")}" /></label>` : "") + p.html +
      `<p class="muted center">Stored only as a salted hash. If you forget it, the vault can't be recovered.</p>`;
    $("#name") && ($("#name").oninput = (e) => (S._pendingName = e.target.value));
    p.mount();
  };
  draw();
}

let lockTimer;
function screenUnlock() {
  const p = pinPad(async (c) => {
    const now = Date.now();
    if (S.lockout.lockedUntil > now) return;
    if (await verifyCode(c)) { S.lockout = { failed: 0, lockLevel: 0, lockedUntil: 0 }; await save(); unlocked = true; lastActive = Date.now(); return go("home"); }
    p.shake();
    const l = S.lockout; l.failed++;
    if (l.failed >= MAX_ATTEMPTS) { l.lockLevel++; l.failed = 0; l.lockedUntil = Date.now() + lockSecs(l.lockLevel) * 1000; }
    await save(); status();
  });
  app.innerHTML = brand(`Welcome back, ${S.user.name}`) + p.html + `<p class="err center" id="st"></p>`;
  p.mount();
  const status = () => {
    clearInterval(lockTimer);
    const st = $("#st"), pad = $("#pad"); if (!st) return;
    const tick = () => {
      const left = Math.ceil((S.lockout.lockedUntil - Date.now()) / 1000);
      if (left > 0) { st.textContent = `Too many attempts. Try again in ${left}s`; pad.style.pointerEvents = "none"; pad.style.opacity = ".4"; }
      else { clearInterval(lockTimer); pad.style.pointerEvents = ""; pad.style.opacity = ""; st.textContent = S.lockout.failed ? `Wrong code. ${MAX_ATTEMPTS - S.lockout.failed} attempts left` : ""; }
    };
    tick(); lockTimer = setInterval(tick, 500);
  };
  status();
}

const upcoming = () => S.reminders.filter((r) => r.status === "UPCOMING").sort((a, b) => a.dateTime - b.dateTime);

function screenHome() {
  const now = Date.now(), up = upcoming();
  const used = S.docs.reduce((n, d) => n + d.size, 0);
  app.innerHTML = `<div class="header"><div class="avatar">${S.user.avatar ? `<img src="${esc(S.user.avatar)}" alt="">` : initials(S.user.name)}</div>
    <div class="grow"><h1>Hi, ${esc(S.user.name)}</h1><span class="muted">Your vault is encrypted &amp; offline</span></div><button class="ghost" id="lock" aria-label="Lock">🔒</button></div>
    <div class="grid2"><div class="card stat"><b>${S.docs.length}</b><span class="muted">Documents</span></div><div class="card stat"><b>${up.length}</b><span class="muted">Upcoming</span></div></div>
    <p class="muted" style="margin-top:8px">Encrypted storage used: ${fmtBytes(used)}</p>
    <h2>Next reminders</h2><div class="list">${up.slice(0, 3).map((r) => reminderCard(r, now)).join("") || `<div class="empty">Nothing coming up.</div>`}</div>
    <h2>Folders</h2><div class="grid2">${S.folders.map(folderCard).join("")}</div>`;
  $("#lock").onclick = lockNow;
}
const folderCard = (f) => `<div class="card click row tone-${f.color}" data-go="folder" data-arg="${f.id}"><div class="icon">▤</div><div class="grow"><b>${esc(f.name)}</b><div class="muted">${S.docs.filter((d) => d.folderId === f.id).length} files</div></div></div>`;
const reminderCard = (r, now) => { const od = isOverdue(r, now); return `<div class="card click row tone-${CATEGORIES[r.category] || "blue"} ${od ? "overdue" : ""}" data-go="reminder" data-arg="${r.id}">
  <div class="icon">◷</div><div class="grow"><b>${esc(r.title)}</b><div class="muted">${fmtDT(r.dateTime)}</div></div>${od ? `<span class="chip">Overdue</span>` : `<span class="chip">${esc(r.category)}</span>`}</div>`; };

function screenDocuments() {
  app.innerHTML = header("Documents") + `<div class="grid2">${S.folders.map(folderCard).join("")}</div><div style="margin-top:16px"><button class="btn" id="nf">+ New folder</button></div>`;
  $("#nf").onclick = () => folderDialog();
}
function folderDialog(f) {
  modal(`<h3>${f ? "Rename folder" : "New folder"}</h3><label class="field" style="margin-top:12px"><span>Name</span><input id="fn" type="text" maxlength="40" value="${esc(f?.name || "")}"></label>
    <p class="err" id="fe"></p><div class="grid2"><button class="btn outline" id="x">Cancel</button><button class="btn" id="ok">Save</button></div>`, (m) => {
    $("#fn", m).focus(); $("#x", m).onclick = closeModal;
    $("#ok", m).onclick = async () => {
      const name = $("#fn", m).value, e = validateFolder(name, S.folders, f?.id); if (e) return ($("#fe", m).textContent = e);
      if (f) f.name = name.trim(); else S.folders.push({ id: uid(), name: name.trim(), color: TONES[S.folders.length % TONES.length], isDefault: false, createdAt: Date.now() });
      await save(); closeModal(); render();
    };
  });
}
function screenFolder() {
  const f = S.folders.find((x) => x.id === arg); if (!f) return go("documents");
  const docs = S.docs.filter((d) => d.folderId === f.id).sort((a, b) => b.addedOn - a.addedOn);
  app.innerHTML = header(f.name, ["documents"]) + `<button class="btn" id="up">+ Add files</button><input type="file" id="fi" multiple hidden>
    <div class="list" style="margin-top:14px">${docs.map((d) => `<div class="card row tone-${f.color}"><div class="icon">📄</div><div class="grow"><b style="word-break:break-all">${esc(d.fileName)}</b>
      <div class="muted">${fmtBytes(d.size)} · ${new Date(d.addedOn).toLocaleDateString()}</div></div>
      <button class="ghost" data-open="${d.id}" aria-label="Open">⬇</button><button class="ghost" data-del="${d.id}" aria-label="Delete">🗑</button></div>`).join("") || `<div class="empty">No files yet. Added files are encrypted.</div>`}</div>
    ${f.isDefault ? "" : `<div class="grid2" style="margin-top:20px"><button class="btn outline" id="rn">Rename</button><button class="btn danger" id="rm">Delete folder</button></div>`}`;
  $("#up").onclick = () => $("#fi").click();
  $("#fi").onchange = async (e) => {
    for (const file of e.target.files) { const id = uid(); await blobSet(id, await encryptFile(file)); S.docs.push({ id, folderId: f.id, fileName: file.name, mime: file.type, size: file.size, addedOn: Date.now() }); }
    await save(); toast("Encrypted & saved"); render();
  };
  app.querySelectorAll("[data-open]").forEach((b) => (b.onclick = async () => {
    const d = S.docs.find((x) => x.id === b.dataset.open), url = URL.createObjectURL(new Blob([await decryptDoc(d.id)], { type: d.mime || "application/octet-stream" }));
    const a = document.createElement("a"); a.href = url; a.download = d.fileName; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }));
  app.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => confirmDlg("Delete file?", "This can't be undone.", "Delete", async () => {
    await blobDel(b.dataset.del); S.docs = S.docs.filter((x) => x.id !== b.dataset.del); await save(); render();
  })));
  $("#rn") && ($("#rn").onclick = () => folderDialog(f));
  $("#rm") && ($("#rm").onclick = () => confirmDlg("Delete folder?", `"${f.name}" and all its files will be deleted.`, "Delete", async () => {
    for (const d of S.docs.filter((x) => x.folderId === f.id)) await blobDel(d.id);
    S.docs = S.docs.filter((x) => x.folderId !== f.id); S.folders = S.folders.filter((x) => x.id !== f.id); await save(); go("documents");
  }));
}

let remTab = "upcoming";
function screenReminders() {
  const now = Date.now();
  const list = remTab === "upcoming" ? upcoming() : S.reminders.filter((r) => r.status === "COMPLETED").sort((a, b) => b.completedAt - a.completedAt);
  const d = new Date(), first = new Date(d.getFullYear(), d.getMonth(), 1), days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const marked = new Set(upcoming().map((r) => new Date(r.dateTime)).filter((x) => x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear()).map((x) => x.getDate()));
  app.innerHTML = header("Reminders") + `<div class="card"><div class="muted center" style="margin-bottom:8px">${d.toLocaleString([], { month: "long", year: "numeric" })}</div><div class="cal">
    ${"SMTWTFS".split("").map((c) => `<b>${c}</b>`).join("")}${"<span></span>".repeat(first.getDay())}
    ${Array.from({ length: days }, (_, i) => `<span class="${i + 1 === d.getDate() ? "today" : ""} ${marked.has(i + 1) ? "has" : ""}">${i + 1}</span>`).join("")}</div></div>
    <div class="tabs" style="margin-top:14px"><button data-tab="upcoming" class="${remTab === "upcoming" ? "on" : ""}">Upcoming</button><button data-tab="history" class="${remTab === "history" ? "on" : ""}">History</button></div>
    <div class="list">${list.map((r) => reminderCard(r, now)).join("") || `<div class="empty">${remTab === "upcoming" ? "No upcoming reminders." : "No completed reminders."}</div>`}</div>
    <div style="margin-top:16px"><button class="btn" id="nr">+ New reminder</button></div>`;
  app.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { remTab = b.dataset.tab; render(); }));
  $("#nr").onclick = () => go("reminder-form");
}
function screenReminderForm() {
  const r = arg ? S.reminders.find((x) => x.id === arg) : null;
  const dt = r ? new Date(r.dateTime - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  const offs = r ? r.alertOffsets : [0];
  app.innerHTML = header(r ? "Edit reminder" : "New reminder", ["reminders"]) + `<form class="stack" id="rf">
    <label class="field"><span>Title</span><input type="text" id="t" maxlength="80" required value="${esc(r?.title || "")}"></label>
    <label class="field"><span>Category</span><select id="c">${Object.keys(CATEGORIES).map((c) => `<option ${r?.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
    <label class="field"><span>Date &amp; time</span><input type="datetime-local" id="d" required value="${dt}"></label>
    <div class="field"><span>Alerts</span><div class="checks">${ALERTS.map(([m, l]) => `<label><input type="checkbox" value="${m}" ${offs.includes(m) ? "checked" : ""}>${l}</label>`).join("")}</div></div>
    <label class="field"><span>Notes</span><textarea id="n" maxlength="500">${esc(r?.description || "")}</textarea></label><p class="err" id="e"></p>
    <button class="btn">${r ? "Save changes" : "Create reminder"}</button></form>`;
  $("#rf").onsubmit = async (e) => {
    e.preventDefault();
    const title = $("#t").value.trim(), when = new Date($("#d").value).getTime();
    if (!title) return ($("#e").textContent = "Title is required");
    if (isNaN(when)) return ($("#e").textContent = "Pick a date and time");
    const alertOffsets = [...app.querySelectorAll(".checks input:checked")].map((i) => +i.value);
    if (alertOffsets.length && S.settings.alerts && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
    const data = { title, category: $("#c").value, dateTime: when, alertOffsets, description: $("#n").value.trim(), firedAlerts: [] };
    if (r) Object.assign(r, data); else S.reminders.push({ id: uid(), status: "UPCOMING", createdAt: Date.now(), ...data });
    await save(); go("reminders");
  };
}
function screenReminder() {
  const r = S.reminders.find((x) => x.id === arg); if (!r) return go("reminders");
  const od = isOverdue(r, Date.now());
  app.innerHTML = header("Reminder", ["reminders"]) + `<div class="card stack tone-${CATEGORIES[r.category] || "blue"}"><div class="row between"><h2 style="margin:0">${esc(r.title)}</h2><span class="chip">${esc(r.category)}</span></div>
    <div>${fmtDT(r.dateTime)} ${od ? `<span class="chip overdue">Overdue</span>` : ""}</div>
    <div class="muted">Alerts: ${r.alertOffsets.length ? r.alertOffsets.map((m) => (ALERTS.find((a) => a[0] === m) || [0, m + " min before"])[1]).join(", ") : "none"}</div>
    ${r.description ? `<p>${esc(r.description)}</p>` : ""}${r.status === "COMPLETED" ? `<div class="muted">Completed ${fmtDT(r.completedAt)}</div>` : ""}</div>
    <div class="stack" style="margin-top:16px">${r.status === "UPCOMING" ? `<button class="btn ok" id="done">Mark complete</button><button class="btn outline" id="ed">Edit</button>` : `<button class="btn outline" id="re">Move back to upcoming</button>`}
    <button class="btn danger" id="del">Delete</button></div>`;
  $("#done") && ($("#done").onclick = async () => { r.status = "COMPLETED"; r.completedAt = Date.now(); await save(); go("reminders"); });
  $("#re") && ($("#re").onclick = async () => { r.status = "UPCOMING"; r.completedAt = undefined; await save(); go("reminders"); });
  $("#ed") && ($("#ed").onclick = () => go("reminder-form", r.id));
  $("#del").onclick = () => confirmDlg("Delete reminder?", "This can't be undone.", "Delete", async () => { S.reminders = S.reminders.filter((x) => x.id !== r.id); await save(); go("reminders"); });
}

function screenSettings() {
  const s = S.settings;
  app.innerHTML = header("Settings") + `<div class="stack">
    <div class="card stack"><label class="field"><span>Display name</span><input id="nm" type="text" maxlength="40" value="${esc(S.user.name)}"></label>
      <div class="row"><div class="avatar">${S.user.avatar ? `<img src="${esc(S.user.avatar)}" alt="">` : initials(S.user.name)}</div><button class="btn outline sm" id="av">Change photo</button>${S.user.avatar ? `<button class="btn outline sm" id="rav">Remove</button>` : ""}<input type="file" id="avf" accept="image/*" hidden></div></div>
    <div class="card row between"><span>Light theme</span><input class="switch" type="checkbox" id="th" ${s.theme === "light" ? "checked" : ""}></div>
    <div class="card row between"><span>Binary rain background</span><input class="switch" type="checkbox" id="rn" ${s.rain ? "checked" : ""}></div>
    <div class="card row between"><span>Reminder notifications</span><input class="switch" type="checkbox" id="al" ${s.alerts ? "checked" : ""}></div>
    <label class="card field"><span>Auto-lock after leaving the app</span><select id="al2">${[[0, "Immediately"], [60, "1 minute"], [300, "5 minutes"], [900, "15 minutes"]].map(([v, l]) => `<option value="${v}" ${s.autoLock === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <button class="btn outline" id="cc">Change security code</button><button class="btn outline" id="bk">Export encrypted backup</button><button class="btn outline" id="rs">Restore from backup</button><input type="file" id="rsf" accept=".dvbackup,application/json" hidden>
    <button class="btn" id="lk">Lock vault now</button><button class="btn danger" id="wp">Erase all data</button>
    <p class="muted center">DarkVault · all data stays on this device</p></div>`;
  const chg = (id, fn) => ($(id).onchange = async (e) => { fn(e.target); await save(); applyTheme(); });
  $("#nm").onchange = async (e) => { const v = e.target.value.trim(); if (v) { S.user.name = v; await save(); toast("Name saved"); } };
  chg("#th", (t) => (s.theme = t.checked ? "light" : "dark")); chg("#rn", (t) => (s.rain = t.checked)); chg("#al", (t) => (s.alerts = t.checked)); chg("#al2", (t) => (s.autoLock = +t.value));
  $("#av").onclick = () => $("#avf").click();
  $("#avf").onchange = (e) => { const f = e.target.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = async () => { S.user.avatar = fr.result; await save(); render(); }; fr.readAsDataURL(f); };
  $("#rav") && ($("#rav").onclick = async () => { delete S.user.avatar; await save(); render(); });
  $("#lk").onclick = lockNow;
  $("#cc").onclick = changeCodeDialog;
  $("#bk").onclick = backupDialog;
  $("#rs").onclick = () => $("#rsf").click();
  $("#rsf").onchange = (e) => e.target.files[0] && restoreDialog(e.target.files[0]);
  $("#wp").onclick = () => confirmDlg("Erase everything?", "All documents, reminders and your code will be permanently deleted from this device.", "Erase", async () => { indexedDB.deleteDatabase("darkvault-web"); location.reload(); });
}
function changeCodeDialog() {
  modal(`<h3>Change security code</h3><div class="stack" style="margin-top:12px">
    ${["Current code", "New code (6 digits)", "Confirm new code"].map((l, i) => `<label class="field"><span>${l}</span><input type="password" inputmode="numeric" maxlength="6" pattern="\\d{6}" id="p${i}" autocomplete="off"></label>`).join("")}
    <p class="err" id="pe"></p><div class="grid2"><button class="btn outline" id="x">Cancel</button><button class="btn" id="ok">Change</button></div></div>`, (m) => {
    $("#x", m).onclick = closeModal;
    $("#ok", m).onclick = async () => {
      const [a, b, c] = [0, 1, 2].map((i) => $("#p" + i, m).value), e = $("#pe", m);
      if (!(await verifyCode(a))) return (e.textContent = "Current code is wrong");
      if (!validCode(b)) return (e.textContent = "New code must be exactly 6 digits");
      if (b !== c) return (e.textContent = "New codes don't match");
      const salt = crypto.getRandomValues(new Uint8Array(16));
      S.user.salt = b64(salt); S.user.iterations = 310000; S.user.codeHash = await pbkdf2(b, salt, 310000); await save(); closeModal(); toast("Security code changed");
    };
  });
}
// Backups: JSON with metadata + files, encrypted with a key derived from the security code
async function backupKey(code, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
function backupDialog() {
  modal(`<h3>Export backup</h3><p class="muted" style="margin:8px 0">Enter your security code. The backup is encrypted with it.</p>
    <input type="password" inputmode="numeric" maxlength="6" id="bc"><p class="err" id="be"></p><div class="grid2"><button class="btn outline" id="x">Cancel</button><button class="btn" id="ok">Export</button></div>`, (m) => {
    $("#x", m).onclick = closeModal;
    $("#ok", m).onclick = async () => {
      const code = $("#bc", m).value; if (!(await verifyCode(code))) return ($("#be", m).textContent = "Wrong code");
      const files = {}; for (const d of S.docs) files[d.id] = b64(await decryptDoc(d.id));
      const { user, folders, docs, reminders, settings } = S;
      const plain = enc.encode(JSON.stringify({ user, folders, docs, reminders, settings, files }));
      const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await backupKey(code, salt), plain);
      const blob = new Blob([JSON.stringify({ v: 1, salt: b64(salt), iv: b64(iv), data: b64(ct) })], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `darkvault-${new Date().toISOString().slice(0, 10)}.dvbackup`; a.click(); closeModal(); toast("Backup exported");
    };
  });
}
function restoreDialog(file) {
  modal(`<h3>Restore backup</h3><p class="muted" style="margin:8px 0">This replaces current data. Enter the code used for the backup.</p>
    <input type="password" inputmode="numeric" maxlength="6" id="bc"><p class="err" id="be"></p><div class="grid2"><button class="btn outline" id="x">Cancel</button><button class="btn" id="ok">Restore</button></div>`, (m) => {
    $("#x", m).onclick = closeModal;
    $("#ok", m).onclick = async () => {
      try {
        const j = JSON.parse(await file.text());
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(j.iv) }, await backupKey($("#bc", m).value, unb64(j.salt)), unb64(j.data));
        const d = JSON.parse(new TextDecoder().decode(plain));
        for (const old of S.docs) await blobDel(old.id);
        for (const [id, data] of Object.entries(d.files)) { const iv = crypto.getRandomValues(new Uint8Array(12)); const buf = unb64(data).buffer; await blobSet(id, { iv, data: await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deviceKey(), buf) }); }
        Object.assign(S, { user: d.user, folders: d.folders, docs: d.docs, reminders: d.reminders, settings: { ...defaultSettings, ...d.settings } });
        await save(); closeModal(); applyTheme(); toast("Backup restored"); go("home");
      } catch { $("#be", m).textContent = "Wrong code or invalid backup file"; }
    };
  });
}

// ---------- shell ----------
const SCREENS = { home: screenHome, documents: screenDocuments, folder: screenFolder, reminders: screenReminders, "reminder-form": screenReminderForm, reminder: screenReminder, settings: screenSettings };
function render() {
  const nav = $("#nav");
  if (!S.user) { nav.hidden = true; return screenSetup(); }
  if (!unlocked) { nav.hidden = true; return screenUnlock(); }
  nav.hidden = false;
  const tab = { folder: "documents", "reminder-form": "reminders", reminder: "reminders" }[route] || route;
  nav.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.go === tab));
  (SCREENS[route] || screenHome)();
}
function lockNow() { unlocked = false; closeModal(); render(); }
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-go]");
  if (t && unlocked) go(t.dataset.go, t.dataset.arg || null);
});
function applyTheme() { document.documentElement.classList.toggle("light", S.settings.theme === "light"); $("#rain").style.display = S.settings.rain ? "" : "none"; }

// auto-lock when tab is hidden longer than the chosen delay
document.addEventListener("visibilitychange", () => {
  if (!S.user || !unlocked) return;
  if (document.hidden) lastActive = Date.now();
  else if (Date.now() - lastActive >= S.settings.autoLock * 1000) lockNow();
});

// reminder alerts (while the app is open)
setInterval(async () => {
  if (!S.user || !S.settings.alerts) return;
  const now = Date.now(); let changed = false;
  for (const r of S.reminders) {
    if (r.status !== "UPCOMING") continue;
    for (const m of new Set(r.alertOffsets)) {
      const t = r.dateTime - m * 60000;
      if (!r.firedAlerts.includes(m) && now >= t && now - t <= 12 * 3600000) {
        r.firedAlerts.push(m); changed = true;
        toast(`⏰ ${r.title}`);
        if ("Notification" in window && Notification.permission === "granted") new Notification("DarkVault reminder", { body: unlocked ? r.title : "You have a reminder" });
      }
    }
  }
  if (changed) { await save(); if (unlocked && route.startsWith("reminder")) render(); }
}, 15000);

// binary rain
(function rain() {
  const c = $("#rain"), x = c.getContext("2d"); let cols, drops;
  const size = () => { c.width = innerWidth; c.height = innerHeight; cols = Math.ceil(c.width / 16); drops = Array.from({ length: cols }, () => Math.random() * c.height / 16); };
  size(); addEventListener("resize", size);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  setInterval(() => {
    if (document.hidden || c.style.display === "none") return;
    x.fillStyle = "rgba(7,11,26,.12)"; if (document.documentElement.classList.contains("light")) x.fillStyle = "rgba(238,243,255,.15)";
    x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#3b82f6"; x.font = "14px JetBrains Mono, monospace";
    drops.forEach((y, i) => { x.fillText(Math.random() > .5 ? "1" : "0", i * 16, y * 16); drops[i] = y * 16 > c.height && Math.random() > .975 ? 0 : y + 1; });
  }, 70);
})();

// boot
(async () => {
  const saved = await kvGet("state");
  if (saved) S = { ...S, ...saved, settings: { ...defaultSettings, ...saved.settings } };
  applyTheme(); render();
})();
