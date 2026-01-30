// script.js — soporte de "grupos de clases" (solo selector de grupos) y fusión automática por nombre
// Requiere lz-string cargado (ver index.html)

// Estado y referencias
let skillData = null;
const state = { transform: { x: 0, y: 0, scale: 1 }, selected: null };

const board = document.getElementById("board");
const svg = document.getElementById("connections");
const pointsInfo = document.getElementById("points-info");
const skillInfo = document.getElementById("skill-info");
const msg = document.getElementById("message");
// nota: jobSelect existía antes pero ya no se usa; solo funciona groupSelect
const groupSelect = document.getElementById("group-select");
const jobImageEl = document.getElementById("job-image");
const jobImageContainer = document.getElementById("job-image-container");
const groupJobsList = document.getElementById("group-jobs-list");

// GRUPOS: cada entrada es un grupo con jobs
// name ahora contiene el último job de la lista (representativo)
const GROUPS = [
  { key: "group1",  name: "Dragon Knight",    jobs: ["Swordman","Lord-Knight","Rune-Knight","Dragon Knight"] },
  { key: "group2",  name: "Imperial-Guard",   jobs: ["Swordman","Paladin","Royal-Guard","Imperial-Guard"] },
  { key: "group3",  name: "Arch-Mage",        jobs: ["Mage","High-Wizard","Warlock","Arch-Mage"] },
  { key: "group4",  name: "Elemental-Master", jobs: ["Mage","Scholar","Sorcerer","Elemental-Master"] },
  { key: "group5",  name: "Meister",          jobs: ["Merchant","Mastersmith","Mechanic","Meister"] },
  { key: "group6",  name: "Biolo",            jobs: ["Merchant","Biochemist","Geneticist","Biolo"] },
  { key: "group7",  name: "Cardinal",         jobs: ["Acolyte","High-Priest","Arch-Bishop","Cardinal"] },
  { key: "group8",  name: "Inquisitor",       jobs: ["Acolyte","Champion","Sura","Inquisitor"] },
  { key: "group9",  name: "Shadow-Cross",     jobs: ["Thief","Assassin-Cross","Guillotine-Cross","Shadow-Cross"] },
  { key: "group10", name: "Abyss-Chaser",     jobs: ["Thief","Stalker","Shadow-Chaser","Abyss-Chaser"] },
  { key: "group11", name: "Windhawk",         jobs: ["Archer","Sniper","Ranger","Windhawk"] },
  { key: "group12", name: "Troubadour",       jobs: ["Bard","Minstrel","Maestro","Troubadour"] },
  { key: "group13", name: "Trouvere",         jobs: ["Dancer","Gypsy","Wanderer","Trouvere"] },
  { key: "group14", name: "Sky-Emperor",      jobs: ["TaeKwon-Kid","TaeKWon-Master","Star-Emperor","Sky-Emperor"] },
  { key: "group15", name: "Soul-Ascetic",     jobs: ["TaeKwon-Kid","Soul-Linker","Soul-Reaper","Soul-Ascetic"] },
  { key: "group16", name: "Oboro",            jobs: ["Ninja","Kagerou","Oboro"] },
  { key: "group17", name: "Shinkiro",         jobs: ["Ninja","Shiranui","Shinkiro"] },
  { key: "group18", name: "Night-Watch",      jobs: ["Gunslinger","Rebel","Night-Watch"] },
  { key: "group19", name: "Hyper-Novice*",    jobs: ["Super-Novice","Expanded-Super-Novice","Hyper-Novice*"] },
  { key: "group20", name: "Spirit-Handler",   jobs: ["Doram","Summoner","Spirit-Handler"] }
];

// Util: transformar job -> filename safe
function jobToFilename(job) {
  return "skilltrees/" + job.replace(/[^a-z0-9\-_*]+/gi, "_").replace(/\*/g,'') + ".json";
}

// Cargar imagen del job desde src/img_job/<nombre>
function updateJobImage(job) {
  if (!job || !jobImageEl) return;
  const base = 'src/img_job/' + encodeURIComponent(job.replace(/[^a-z0-9\-_*]+/gi, "_").replace(/\*/g,''));
  const exts = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
  let idx = 0;
  jobImageEl.style.display = 'none';
  jobImageEl.src = '';
  jobImageEl.alt = '';

  function tryNext() {
    if (idx >= exts.length) {
      jobImageEl.style.display = 'none';
      jobImageContainer.setAttribute('aria-hidden','true');
      return;
    }
    const attempt = base + exts[idx++];
    jobImageEl.onerror = tryNext;
    jobImageEl.onload = () => {
      jobImageEl.style.display = 'block';
      jobImageEl.alt = job + " (imagen del job)";
      jobImageContainer.setAttribute('aria-hidden','false');
      jobImageEl.onerror = null;
      jobImageEl.onload = null;
    };
    jobImageEl.src = attempt;
  }
  tryNext();
}

// Encode/Decode build
function encodeBuildState(stateObj) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(stateObj));
}
function decodeBuildState(token) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(token);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) { console.error("decode error", e); return null; }
}

// populate group select: mostrar el name (ya contiene el último job)
function populateGroupSelect() {
  groupSelect.innerHTML = '<option value="">— Grupo de clases —</option>';
  GROUPS.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.key;
    // name ya es el último job en cada entrada
    opt.innerText = g.name;
    opt.title = g.name; // tooltip (puede conservarse o eliminarse)
    groupSelect.appendChild(opt);
  });
}

// LAYOUT automático vertical
function layoutSkillTree(data) {
  if (!data || !data.skills) return;
  const skills = data.skills;
  const map = {}; skills.forEach(s => map[s.id] = s);
  const levels = {}; skills.forEach(s => levels[s.id] = null);

  function computeLevel(id, visited = new Set()) {
    if (levels[id] !== null && levels[id] !== undefined) return levels[id];
    if (visited.has(id)) return 0;
    visited.add(id);
    const s = map[id];
    if (!s) { levels[id] = 0; return 0; }
    if (!s.prerequisites || s.prerequisites.length === 0) { levels[id] = 0; return 0; }
    let maxLvl = 0;
    for (const p of s.prerequisites) {
      const pl = computeLevel(p.id, new Set(visited));
      if (pl + 1 > maxLvl) maxLvl = pl + 1;
    }
    levels[id] = maxLvl; return maxLvl;
  }
  skills.forEach(s => computeLevel(s.id));
  const groups = {}; Object.keys(levels).forEach(id => { const lvl = levels[id] || 0; if (!groups[lvl]) groups[lvl]=[]; groups[lvl].push(map[id]); });
  const levelGapX = 220, rowGapY = 150, startX = 200, startY = 120;
  Object.keys(groups).forEach(l => { const arr = groups[l]; arr.forEach((node, idx)=>{ node.position = node.position || {}; node.position.x = startX + Number(l)*levelGapX; node.position.y = startY + idx*rowGapY; }); });
  const maxRows = Math.max(...Object.values(groups).map(a=>a.length));
  const neededHeight = Math.max(2000, startY + maxRows*rowGapY + 400);
  board.style.height = neededHeight + "px";
}

// CARGA de un grupo: carga cada job y genera skillData combinado (fusión automática por nombre)
async function loadGroup(groupKey) {
  if (!groupKey) {
    // si se limpia el select, seleccionar primer grupo por defecto
    if (GROUPS.length) {
      groupSelect.value = GROUPS[0].key;
      groupKey = GROUPS[0].key;
    } else return;
  }
  const group = GROUPS.find(g => g.key === groupKey);
  if (!group) return;

  // siempre combinar por nombre
  const combineByName = true;

  // nombre representativo: el campo name ya contiene el último job
  const lastJobName = group.name;

  // intentar cargar todos los job JSONs
  const loadPromises = group.jobs.map(job => fetch(jobToFilename(job)).then(r => r.ok ? r.json() : Promise.reject(job)).catch(err => ({ __errorJob: typeof err === 'string' ? err : job })));
  const results = await Promise.all(loadPromises);
  const loaded = [];
  const missing = [];
  for (let i=0;i<results.length;i++) {
    const r = results[i];
    const jobName = group.jobs[i];
    if (r && r.__errorJob) { missing.push(jobName); continue; }
    if (!r || !r.skills) { missing.push(jobName); continue; }
    r.meta = r.meta || {}; r.meta.job = r.meta.job || jobName;
    loaded.push({ job: jobName, data: r });
  }

  // Mostrar listado con título = lastJobName y lista de cargados/faltantes
  groupJobsList.innerHTML = `<strong>${lastJobName}</strong><br/>Cargados: ${loaded.map(x=>x.job).join(", ") || "(ninguno)"}${missing.length ? "<br/>Faltantes: "+missing.join(", ") : ""}`;

  if (!loaded.length) {
    showMessage("No se cargó ningún skilltree del grupo.", true);
    return;
  }

  // Construir skillData combinado (combinación por nombre)
  const map = {};
  let totalPoints = 0;
  for (const item of loaded) {
    const jd = item.data;
    totalPoints += (jd.rules && jd.rules.totalSkillPoints) ? Number(jd.rules.totalSkillPoints) : 0;
    jd.skills.forEach(s => {
      const nameKey = (s.name || "").trim().toLowerCase();
      if (!map[nameKey]) {
        map[nameKey] = {
          id: nameKey.replace(/\s+/g,"_") + "__combined",
          name: s.name,
          description: s.description || "",
          position: { x: 0, y: 0 },
          maxLevel: Number(s.maxLevel || 0),
          currentLevel: 0,
          prerequisites: [],
          connections: [],
          effects: Array.isArray(s.effects) ? JSON.parse(JSON.stringify(s.effects)) : []
        };
      } else {
        map[nameKey].maxLevel += Number(s.maxLevel || 0);
        (s.effects||[]).forEach(e => {
          const ex = map[nameKey].effects.find(x => x.stat === e.stat);
          if (ex) ex.perLevel = Number(ex.perLevel||0) + Number(e.perLevel||0);
          else map[nameKey].effects.push(Object.assign({}, e));
        });
      }
    });
  }
  const combined = { meta: { name: lastJobName, job: lastJobName }, rules: { totalSkillPoints: totalPoints }, skills: Object.values(map) };
  skillData = combined;

  // usar imagen del lastJobName (si existe)
  updateJobImage(lastJobName);

  layoutSkillTree(skillData);
  state.transform = { x: 0, y: 0, scale: 1 }; applyTransform(); clearSelection();
  renderAll();
  showMessage(`Grupo cargado: ${lastJobName} (${loaded.length} cargados, ${missing.length} faltantes)`);
}

// render pipeline y utilidades
function renderAll() { clearBoard(); createNodes(); drawConnections(); updatePointsInfo(); clearSelection(); }
function clearBoard() { Array.from(document.querySelectorAll(".node")).forEach(n=>n.remove()); while (svg.firstChild) svg.removeChild(svg.firstChild); }
function createNodes() {
  if (!skillData || !skillData.skills) return;
  const skills = skillData.skills;
  skills.forEach(s => {
    const el = document.createElement("div");
    el.className = "node";
    el.dataset.id = s.id;
    const pos = s.position || { x:200, y:120 };
    el.style.left = (pos.x - 55) + "px";
    el.style.top = (pos.y - 55) + "px";
    const title = document.createElement("div"); title.className = "title"; title.innerText = s.name; el.appendChild(title);
    const levelBadge = document.createElement("div"); levelBadge.className = "level"; levelBadge.innerText = `${s.currentLevel || 0}/${s.maxLevel || 0}`; el.appendChild(levelBadge);

    const controls = document.createElement("div"); controls.className = "controls";
    const btnDec = document.createElement("button"); btnDec.innerText = "−";
    const btnInc = document.createElement("button"); btnInc.innerText = "+";
    btnInc.title = "Aumentar nivel"; btnDec.title = "Disminuir nivel";
    btnInc.addEventListener("click", (e)=>{ e.stopPropagation(); changeLevel(s.id,1); });
    btnDec.addEventListener("click", (e)=>{ e.stopPropagation(); changeLevel(s.id,-1); });
    controls.appendChild(btnDec); controls.appendChild(btnInc); el.appendChild(controls);

    el.addEventListener("click", ()=> selectNode(s.id));
    if (!canAllocate(s.id,1)) el.classList.add("locked");
    if ((s.currentLevel||0) > 0) el.classList.add("active");

    board.appendChild(el);
  });
}
function drawConnections() {
  if (!skillData || !skillData.skills) return;
  svg.setAttribute("width", board.style.width || board.clientWidth);
  svg.setAttribute("height", board.style.height || board.clientHeight);
  const skillsMap = indexById(skillData.skills);
  skillData.skills.forEach(s => {
    if (s.connections && s.connections.length) {
      s.connections.forEach(destId => {
        const dest = skillsMap[destId];
        if (!dest) return;
        const sx = (s.position && s.position.x) || s.position.x;
        const sy = (s.position && s.position.y) || s.position.y;
        const dx = (dest.position && dest.position.x) || dest.position.x;
        const dy = (dest.position && dest.position.y) || dest.position.y;
        const line = document.createElementNS("http://www.w3.org/2000/svg","line");
        line.setAttribute("x1", sx);
        line.setAttribute("y1", sy + 44);
        line.setAttribute("x2", dx);
        line.setAttribute("y2", dy - 44);
        line.setAttribute("stroke", "rgba(255,255,255,0.06)");
        line.setAttribute("stroke-width", "3");
        svg.appendChild(line);
      });
    }
  });
}
function indexById(arr) { const map = {}; arr.forEach(a=>map[a.id]=a); return map; }

function selectNode(id) {
  state.selected = id;
  const s = indexById(skillData.skills)[id];
  if (!s) return;
  skillInfo.innerHTML = `<strong>${s.name}</strong><p>${s.description||""}</p><p>Nivel: ${s.currentLevel||0} / ${s.maxLevel||0}</p><p>Requisitos: ${s.prerequisites && s.prerequisites.length ? s.prerequisites.map(r=> r.id + (r.minLevel?(" ≥"+r.minLevel):"")).join(", ") : "Ninguno"}</p>`;
  document.querySelectorAll(".node").forEach(n=>{ n.style.boxShadow = ""; if (n.dataset.id === id) n.style.boxShadow = "0 18px 40px rgba(255,180,110,0.18)"; });
}
function clearSelection() { state.selected = null; skillInfo.innerText = "Ninguno"; document.querySelectorAll(".node").forEach(n=>n.style.boxShadow=""); }

function changeLevel(id, delta) {
  const skill = indexById(skillData.skills)[id];
  if (!skill) return;
  const newLevel = (skill.currentLevel||0) + delta;
  if (delta>0) {
    if (newLevel > skill.maxLevel) { showMessage("Has alcanzado el nivel máximo", true); return; }
    if (!canAllocate(id,delta)) { showMessage("No se cumplen requisitos o no hay puntos", true); return; }
    skill.currentLevel = newLevel;
  } else {
    if (newLevel < 0) return;
    skill.currentLevel = newLevel;
    const lowered = enforceDependenciesAfterLower(skill.id);
    if (lowered.length) showMessage("Se han reducido niveles en: " + lowered.join(", "));
  }
  refreshUI();
}

function canAllocate(skillId, delta) {
  const rules = skillData.rules || {};
  const totalAllowed = rules.totalSkillPoints || 999;
  const currentAllocated = computeAllocatedPoints();
  if (delta>0 && currentAllocated + delta > totalAllowed) return false;
  if (delta>0) {
    const skill = indexById(skillData.skills)[skillId];
    if (!skill) return false;
    if (!skill.prerequisites || skill.prerequisites.length===0) return true;
    const map = indexById(skillData.skills);
    for (const p of skill.prerequisites) {
      const req = map[p.id]; const min = p.minLevel || 1;
      if (!req || req.currentLevel < min) return false;
    }
  }
  return true;
}
function computeAllocatedPoints() { return skillData.skills.reduce((acc,s)=>acc + (s.currentLevel||0),0); }

function enforceDependenciesAfterLower(loweredId) {
  const map = indexById(skillData.skills);
  const lowered = []; let changed = true;
  while (changed) {
    changed = false;
    skillData.skills.forEach(s=>{
      if (s.prerequisites && s.prerequisites.length>0 && (s.currentLevel||0)>0) {
        for (const p of s.prerequisites) {
          const req = map[p.id]; const min = p.minLevel || 1;
          if (!req || req.currentLevel < min) { lowered.push(s.id); s.currentLevel = 0; changed = true; break; }
        }
      }
    });
  }
  return Array.from(new Set(lowered));
}

function refreshUI() {
  const map = indexById(skillData.skills);
  document.querySelectorAll(".node").forEach(n => {
    const id = n.dataset.id; const s = map[id];
    n.querySelector(".level").innerText = `${s.currentLevel||0}/${s.maxLevel||0}`;
    if ((s.currentLevel||0) > 0) n.classList.add("active"); else n.classList.remove("active");
    if (!canAllocate(id,1)) n.classList.add("locked"); else n.classList.remove("locked");
    const btns = n.querySelectorAll(".controls button");
    if (btns && btns.length===2) { btns[0].disabled = (s.currentLevel||0) <= 0; btns[1].disabled = (s.currentLevel||0) >= (s.maxLevel||0) || !canAllocate(id,1); }
  });
  updatePointsInfo();
  if (state.selected) selectNode(state.selected);
}

function updatePointsInfo() {
  const used = computeAllocatedPoints();
  const total = (skillData.rules && skillData.rules.totalSkillPoints) || "∞";
  pointsInfo.innerText = `Puntos: ${used} / ${total}`;
}

let msgTimer = null;
function showMessage(text,isError=false,timeout=3500) { msg.textContent = text; msg.style.color = isError ? "#ff9b9b" : "#9bd3ff"; if (msgTimer) clearTimeout(msgTimer); msgTimer = setTimeout(()=>{ msg.textContent = ""; }, timeout); }

function exportBuild() {
  const payload = { meta: skillData.meta || {}, build: skillData.skills.reduce((acc,s)=>{ acc[s.id] = s.currentLevel||0; return acc; }, {}) };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = (skillData.meta && skillData.meta.name ? skillData.meta.name.replace(/\s+/g,"_") : "build") + ".json";
  document.body.appendChild(a); a.click(); a.remove();
}

function applyBuild(obj) {
  const map = indexById(skillData.skills);
  Object.keys(obj).forEach(k => { if (map[k]) map[k].currentLevel = Math.max(0, Math.min(map[k].maxLevel, Number(obj[k] || 0))); });
  enforceDependenciesAfterLower(); refreshUI();
}

function handleFileImport(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (parsed && parsed.build) { applyBuild(parsed.build); showMessage("Build importado"); }
      else if (parsed && parsed.skills) { skillData = parsed; skillData.skills.forEach(s=>{ if (typeof s.currentLevel==='undefined') s.currentLevel = 0; }); layoutSkillTree(skillData); showMessage("Skilltree reemplazado por el JSON importado"); renderAll(); }
      else showMessage("JSON no válido (esperado campo 'build' o 'skills')", true);
    } catch (e) { showMessage("Error leyendo JSON: " + e.message, true); }
  };
  reader.readAsText(file);
}

function generateShareLink() {
  const build = skillData.skills.reduce((acc,s)=>{ acc[s.id] = s.currentLevel||0; return acc; }, {});
  const token = encodeBuildState(build);
  const jobParam = (skillData.meta && skillData.meta.job) ? ("&job=" + encodeURIComponent(skillData.meta.job)) : "";
  const url = window.location.origin + window.location.pathname + "?build=" + token + jobParam;
  navigator.clipboard.writeText(url).then(()=> { showMessage("Enlace copiado al portapapeles"); }).catch(()=> { prompt("Copia este enlace:", url); });
}

function resetBuild() { skillData.skills.forEach(s => s.currentLevel = 0); refreshUI(); showMessage("Build reiniciado"); }

// Zoom/pan (igual que antes)
let isPanning=false; let panStart={x:0,y:0};
function applyTransform() { board.style.transform = `translate(${state.transform.x}px, ${state.transform.y}px) scale(${state.transform.scale})`; }
board.addEventListener("mousedown",(e)=>{ if (e.target.closest(".node")) return; isPanning=true; panStart={x:e.clientX - state.transform.x, y:e.clientY - state.transform.y}; board.classList.add("grabbing"); });
window.addEventListener("mousemove",(e)=>{ if (!isPanning) return; state.transform.x = e.clientX - panStart.x; state.transform.y = e.clientY - panStart.y; applyTransform();});
window.addEventListener("mouseup",()=>{ isPanning=false; board.classList.remove("grabbing");});
window.addEventListener("wheel",(e)=>{ if (!e.ctrlKey && !e.shiftKey && Math.abs(e.deltaY) < 100) return; e.preventDefault(); const delta = -e.deltaY; const factor = delta>0 ? 1.08 : 1/1.08; const rect = board.getBoundingClientRect(); const cx = (e.clientX - rect.left); const cy = (e.clientY - rect.top); const prevScale = state.transform.scale; const newScale = Math.max(0.3, Math.min(3, prevScale * factor)); state.transform.scale = newScale; state.transform.x = state.transform.x - (cx / prevScale) * (newScale - prevScale); state.transform.y = state.transform.y - (cy / prevScale) * (newScale - prevScale); applyTransform(); }, { passive:false });

// UI buttons
document.getElementById("btn-reset").addEventListener("click", ()=>{ if (confirm("Reiniciar build a cero?")) resetBuild(); });
document.getElementById("btn-export").addEventListener("click", exportBuild);
const fileInput = document.getElementById("file-import");
document.getElementById("btn-import").addEventListener("click", ()=> fileInput.click());
fileInput.addEventListener("change", (ev)=>{ if (ev.target.files && ev.target.files[0]) handleFileImport(ev.target.files[0]); });
document.getElementById("btn-share").addEventListener("click", generateShareLink);

// group select listener
groupSelect.addEventListener("change", async (e)=> {
  const key = e.target.value;
  await loadGroup(key);
});

// init: sólo populateGroupSelect y carga primer grupo
async function loadDefault() {
  populateGroupSelect();
  const params = new URLSearchParams(window.location.search);
  const groupParam = params.get("group");
  const initialKey = groupParam && GROUPS.some(g=>g.key===groupParam) ? groupParam : (GROUPS.length ? GROUPS[0].key : "");
  if (initialKey) {
    groupSelect.value = initialKey;
    await loadGroup(initialKey);
  }
}
loadDefault();