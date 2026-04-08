/* ══════════════════════════════════════════════
   RISE & BUILD — 90-Day Challenge Tracker JS
   ══════════════════════════════════════════════ */

/* ─── CONSTANTS ─── */
const CHALLENGE_START = (() => {
  const stored = localStorage.getItem('rb_start_date');
  if (stored) return new Date(stored);
  const now = new Date();
  now.setHours(0,0,0,0);
  localStorage.setItem('rb_start_date', now.toISOString());
  return now;
})();
const TOTAL_DAYS = 90;

const PRAYERS = [
  { id: 'fajr',         name: 'Fajr',         type: 'fard'   },
  { id: 'fajr_sun',     name: 'Fajr Sunnah',  type: 'sunnah' },
  { id: 'zuhr',         name: 'Zuhr',          type: 'fard'   },
  { id: 'zuhr_sun',     name: 'Zuhr Sunnah',   type: 'sunnah' },
  { id: 'asr',          name: 'Asr',           type: 'fard'   },
  { id: 'asr_sun',      name: 'Asr Sunnah',    type: 'sunnah' },
  { id: 'maghrib',      name: 'Maghrib',        type: 'fard'   },
  { id: 'maghrib_sun',  name: 'Maghrib Sunnah', type: 'sunnah' },
  { id: 'isha',         name: 'Isha',           type: 'fard'   },
  { id: 'isha_sun',     name: 'Isha Sunnah',    type: 'sunnah' },
];

/* ─── HELPERS ─── */
const todayKey  = () => new Date().toISOString().slice(0,10); // YYYY-MM-DD
const dayNum    = () => {
  const diff = new Date() - CHALLENGE_START;
  return Math.min(TOTAL_DAYS, Math.max(1, Math.floor(diff / 86400000) + 1));
};
const isPhase1  = (d) => d <= 25;
const dateStr   = (d) => d.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

const db = {
  get: (k, def=null)  => { try { const v=localStorage.getItem(k); return v!==null?JSON.parse(v):def; } catch{ return def; }},
  set: (k, v)         => localStorage.setItem(k, JSON.stringify(v)),
  key: (section, day) => `rb_${section}_${day}`,
};

/* ─── STATE ─── */
let activeView = 'today';
let sidebarOpen = window.innerWidth > 900;

/* ─── APP INIT ─── */
function init() {
  setTopbar();
  setPhaseUI();
  loadToday();
  renderPrayersView();
  renderDayGrid();
  renderJournal();
  renderStats();
  updateStreakUI();
  init3DBackground();
  initInteractive3D();

  // Update the phase note visibility
  const phase1Note = document.getElementById('phaseNote1');
  if (phase1Note) phase1Note.style.display = isPhase1(dayNum()) ? 'flex' : 'none';
}

/* ─── 3D BACKGROUND (THREE.JS) ─── */
function init3DBackground() {
  const canvas = document.getElementById('canvas3d');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 1500;
  const posArray = new Float32Array(particlesCount * 3);

  for(let i=0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 15;
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

  const material = new THREE.PointsMaterial({
    size: 0.005,
    color: 0xd4a853,
    transparent: true,
    opacity: 0.8
  });

  const particlesMesh = new THREE.Points(particlesGeometry, material);
  scene.add(particlesMesh);

  // Mouse interaction for background
  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
  });

  function animate() {
    requestAnimationFrame(animate);
    particlesMesh.rotation.y += 0.001;
    particlesMesh.rotation.x += 0.0005;
    
    // Subtle parallax
    particlesMesh.position.x += (mouseX * 0.5 - particlesMesh.position.x) * 0.05;
    particlesMesh.position.y += (-mouseY * 0.5 - particlesMesh.position.y) * 0.05;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ─── INTERACTIVE 3D & CURSOR ─── */
function initInteractive3D() {
  const dot = document.getElementById('cursorDot');
  const glow = document.getElementById('cursorGlow');
  const blocks = document.querySelectorAll('.block, .sidebar, .prayer-card');

  window.addEventListener('mousemove', (e) => {
    const { clientX: x, clientY: y } = e;
    
    // Cursor move
    dot.style.transform = `translate(${x}px, ${y}px)`;
    glow.style.left = `${x}px`;
    glow.style.top = `${y}px`;

    // 3D Tilt for all blocks
    blocks.forEach(block => {
      const rect = block.getBoundingClientRect();
      const bx = x - (rect.left + rect.width / 2);
      const by = y - (rect.top + rect.height / 2);
      const dist = Math.sqrt(bx*bx + by*by);

      if (dist < 400) { // Interaction radius
        const rotateX = -by / 20;
        const rotateY = bx / 20;
        block.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      } else {
        block.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      }
    });
  });

  // Hover states
  document.querySelectorAll('button, input, .check-item, .declaration-banner').forEach(el => {
    el.addEventListener('mouseenter', () => {
      glow.style.width = '500px';
      glow.style.height = '500px';
      glow.style.background = 'radial-gradient(circle, rgba(212,168,83,0.3) 0%, transparent 70%)';
    });
    el.addEventListener('mouseleave', () => {
      glow.style.width = '300px';
      glow.style.height = '300px';
      glow.style.background = 'radial-gradient(circle, rgba(212,168,83,0.15) 0%, transparent 70%)';
    });
  });
}

function setTopbar() {
  const d = dayNum();
  document.getElementById('todayDate').textContent = dateStr(new Date());
  document.getElementById('dayBadge').textContent  = `Day ${d} of 90`;
  document.getElementById('topbarTitle').textContent = d === 1 ? 'Day 1 — The Journey Begins' : "Today's Mission";

  const pct = Math.round((d / TOTAL_DAYS) * 100);
  document.getElementById('overallBar').style.width = pct + '%';
  document.getElementById('overallPct').textContent = pct + '%';
}

function setPhaseUI() {
  const d = dayNum();
  const ph = isPhase1(d) ? 1 : 2;
  const chip = document.querySelector('.phase-chip');
  const phaseText = document.querySelector('.sidebar-phase p');
  if (chip)      chip.textContent = `Phase ${ph}`;
  if (phaseText) phaseText.textContent = ph === 1
    ? 'Days 1–25: Focus on structured reading and habit-building before deep skill work.'
    : 'Days 26–90: Deep skill work — code, cyber, build. Full intensity.';
}

/* ─── TODAY LOADING ─── */
function loadToday() {
  const key = todayKey();

  // Habits
  const blocks = ['morning','skill1','movement','skill2','reading','shutdown'];
  blocks.forEach(block => {
    const saved = db.get(db.key('habits', key), {});
    const items = document.querySelectorAll(`[data-block="${block}"]`);
    items.forEach(item => {
      const hk = item.dataset.key;
      const cb = item.querySelector('input[type="checkbox"]');
      if (cb && saved[block]?.[hk]) cb.checked = true;
    });
    updateBlockProgress(block);
  });

  // Skill logs
  ['skill1','skill2','reading'].forEach(id => {
    const el = document.getElementById(`${id}-log`);
    if (el) el.value = db.get(db.key('log_'+id, key), '');
  });

  // Wins & tasks
  const wins = db.get(db.key('wins', key), {});
  ['win1','win2','win3','task1','task2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = wins[id] || '';
  });

  // Declaration
  const decl = db.get(db.key('decl', key), {});
  if (decl.d1 || decl.d2 || decl.d3) {
    const pr = document.getElementById('declPreview');
    if (pr) pr.textContent = decl.d1 || 'Declaration written ✓';
    ['decl1','decl2','decl3'].forEach((id,i) => {
      const el = document.getElementById(id);
      if (el) el.value = decl[`d${i+1}`] || '';
    });
  }

  // Prayers
  loadPrayerState();
}

/* ─── HABIT TOGGLE ─── */
function toggleHabit(cb) {
  const item  = cb.closest('[data-block]');
  const block = item.dataset.block;
  const hkey  = item.dataset.key;
  const key   = todayKey();

  const saved = db.get(db.key('habits', key), {});
  if (!saved[block]) saved[block] = {};
  saved[block][hkey] = cb.checked;
  db.set(db.key('habits', key), saved);

  updateBlockProgress(block);
  updateStreakUI();

  if (cb.checked) showToast('Habit logged ✓');
}

function updateBlockProgress(block) {
  const items = document.querySelectorAll(`[data-block="${block}"] input[type="checkbox"]`);
  if (!items.length) return;
  const done = [...items].filter(i => i.checked).length;
  const pct  = Math.round((done / items.length) * 100);
  const bar  = document.getElementById(`prog-${block}`);
  if (bar) bar.style.width = pct + '%';
}

/* ─── SKILL LOGS ─── */
function saveSkillLog(id) {
  const el = document.getElementById(`${id}-log`);
  if (!el) return;
  db.set(db.key('log_'+id, todayKey()), el.value);
}

/* ─── WINS & TASKS ─── */
function saveWins() {
  const data = {};
  ['win1','win2','win3','task1','task2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  db.set(db.key('wins', todayKey()), data);
}

/* ─── DECLARATION ─── */
function saveDeclaration() {
  const d = {
    d1: document.getElementById('decl1')?.value || '',
    d2: document.getElementById('decl2')?.value || '',
    d3: document.getElementById('decl3')?.value || '',
  };
  db.set(db.key('decl', todayKey()), d);
  const pr = document.getElementById('declPreview');
  if (pr && (d.d1||d.d2||d.d3)) pr.textContent = d.d1 || 'Declaration written ✓';
}

/* ─── PRAYERS ─── */
function renderPrayersView() {
  const grid = document.getElementById('prayersGrid');
  if (!grid) return;
  grid.innerHTML = '';
  PRAYERS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'prayer-card';
    card.innerHTML = `
      <div class="prayer-name">${p.name}</div>
      <div class="prayer-type ${p.type}">${p.type === 'fard' ? 'Fard (Obligatory)' : 'Sunnah'}</div>
      <div class="prayer-btn-row">
        <button class="prayer-btn" id="pbtn_${p.id}_done" onclick="setPrayer('${p.id}','done')">✓ Prayed</button>
        <button class="prayer-btn" id="pbtn_${p.id}_missed" onclick="setPrayer('${p.id}','missed')">✗ Missed</button>
      </div>
    `;
    grid.appendChild(card);
  });
  loadPrayerState();
}

function setPrayer(id, state) {
  const key = todayKey();
  const saved = db.get(db.key('prayers', key), {});
  saved[id] = state;
  db.set(db.key('prayers', key), saved);
  loadPrayerState();
  renderStats();
  if (state === 'done') showToast('Prayer logged — BarakAllahu feek 🤲');
}

function loadPrayerState() {
  const key   = todayKey();
  const saved = db.get(db.key('prayers', key), {});
  PRAYERS.forEach(p => {
    const doneBtn   = document.getElementById(`pbtn_${p.id}_done`);
    const missedBtn = document.getElementById(`pbtn_${p.id}_missed`);
    if (!doneBtn) return;
    doneBtn.classList.remove('done','missed');
    missedBtn.classList.remove('done','missed');
    if (saved[p.id] === 'done')   doneBtn.classList.add('done');
    if (saved[p.id] === 'missed') missedBtn.classList.add('missed');
  });
}

/* ─── 90-DAY GRID ─── */
function renderDayGrid() {
  const grid = document.getElementById('dayGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const today = dayNum();

  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const cellDate = new Date(CHALLENGE_START);
    cellDate.setDate(cellDate.getDate() + d - 1);
    const cellKey = cellDate.toISOString().slice(0,10);

    const habits  = db.get(db.key('habits', cellKey), {});
    const prayers = db.get(db.key('prayers', cellKey), {});

    if (d > today) {
      cell.classList.add('future');
      cell.title = `Day ${d} — Future`;
    } else {
      const score  = getDayScore(habits, prayers);
      const status = score >= 0.8 ? 'complete' : score >= 0.3 ? 'partial' : 'missed';
      cell.classList.add(status);
      if (d === today) cell.classList.add('today');
      cell.title = `Day ${d} — ${Math.round(score*100)}%`;
      cell.onclick = () => openDayModal(d, cellDate, cellKey);
    }

    cell.textContent = d;
    grid.appendChild(cell);
  }
}

function getDayScore(habits, prayers) {
  let total = 0, done = 0;
  // habits
  const blocks = ['morning','skill1','movement','skill2','reading','shutdown'];
  blocks.forEach(b => {
    if (habits[b]) {
      const vals = Object.values(habits[b]);
      total += vals.length;
      done  += vals.filter(Boolean).length;
    }
  });
  // prayers (fard only for score)
  const fards = ['fajr','zuhr','asr','maghrib','isha'];
  fards.forEach(f => {
    total++;
    if (prayers[f] === 'done') done++;
  });
  return total === 0 ? 0 : done / total;
}

/* ─── DAY MODAL ─── */
function openDayModal(dayNum, date, key) {
  const habits  = db.get(db.key('habits', key), {});
  const prayers = db.get(db.key('prayers', key), {});
  const wins    = db.get(db.key('wins', key), {});
  const decl    = db.get(db.key('decl', key), {});
  const score   = getDayScore(habits, prayers);

  const fards   = ['fajr','zuhr','asr','maghrib','isha'];
  const prayerHTML = fards.map(f => {
    const s = prayers[f] === 'done' ? '<span class="ok">✓ Prayed</span>' : '<span class="miss">✗ Missed</span>';
    return `<div class="day-detail-row"><span style="text-transform:capitalize">${f}</span>${s}</div>`;
  }).join('');

  const winList = [wins.win1,wins.win2,wins.win3].filter(Boolean);
  const winsHTML = winList.length
    ? `<div class="day-detail-wins"><p class="day-detail-wins-title">✨ Wins</p>${winList.map(w=>`<div class="day-detail-win">${w}</div>`).join('')}</div>`
    : '';

  const declHTML = decl.d1 ? `<div style="font-size:0.82rem;color:var(--text2);margin-bottom:12px;line-height:1.6;font-style:italic;">"${decl.d1}"</div>` : '';

  document.getElementById('dayModalContent').innerHTML = `
    <p class="day-detail-date">${date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>
    <h2 class="day-detail-title">Day ${dayNum} — ${Math.round(score*100)}% Complete</h2>
    ${declHTML}
    <p style="font-size:0.78rem;color:var(--gold);font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Prayers</p>
    ${prayerHTML}
    ${winsHTML}
  `;
  openModal('dayModal');
}

/* ─── JOURNAL ─── */
function renderJournal() {
  const list = document.getElementById('journalList');
  if (!list) return;

  const today = dayNum();
  const entries = [];

  for (let d = today; d >= 1; d--) {
    const cellDate = new Date(CHALLENGE_START);
    cellDate.setDate(cellDate.getDate() + d - 1);
    const key   = cellDate.toISOString().slice(0,10);
    const decl  = db.get(db.key('decl', key), {});
    const wins  = db.get(db.key('wins', key), {});
    const hasData = decl.d1 || decl.d2 || decl.d3 || wins.win1 || wins.win2 || wins.win3;
    if (!hasData) continue;

    const winItems = [wins.win1,wins.win2,wins.win3].filter(Boolean);
    entries.push({ date: cellDate, day: d, decl, wins: winItems });
  }

  if (!entries.length) {
    list.innerHTML = '<p class="journal-empty">No journal entries yet. Complete today\'s blocks to fill your journal.</p>';
    return;
  }

  list.innerHTML = entries.map(e => `
    <div class="journal-entry">
      <p class="journal-date">Day ${e.day} — ${e.date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
      ${e.decl.d1 ? `<p class="journal-decl">📜 ${e.decl.d1}</p>` : ''}
      <div class="journal-wins">
        ${e.wins.map(w=>`<span class="journal-win">✓ ${w}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

/* ─── STATS ─── */
function renderStats() {
  const today  = dayNum();
  let streak   = 0, prayers = 0, skill = 0, move = 0, read = 0, wins = 0;

  for (let d = today; d >= 1; d--) {
    const cellDate = new Date(CHALLENGE_START);
    cellDate.setDate(cellDate.getDate() + d - 1);
    const key    = cellDate.toISOString().slice(0,10);
    const habits = db.get(db.key('habits', key), {});
    const pray   = db.get(db.key('prayers', key), {});
    const w      = db.get(db.key('wins', key), {});

    const score  = getDayScore(habits, prayers);
    if (d === today || (score > 0 && streak === d - 1 + (d === today ? 0 : 0))) {
      // Simple streak: consecutive days with any activity
      if (Object.keys(habits).length > 0 || Object.keys(pray).length > 0) streak++;
      else if (d < today) break;
    }

    // prayers done
    PRAYERS.forEach(p => { if (pray[p.id] === 'done') prayers++; });
    // skill
    if (habits.skill1?.session || habits.skill2?.session) skill++;
    // move
    if (habits.movement?.move) move++;
    // read
    if (habits.reading?.read) read++;
    // wins
    if (w.win1) wins++; if (w.win2) wins++; if (w.win3) wins++;
  }

  // Recalculate streak properly
  streak = 0;
  for (let d = today; d >= 1; d--) {
    const cellDate = new Date(CHALLENGE_START);
    cellDate.setDate(cellDate.getDate() + d - 1);
    const key    = cellDate.toISOString().slice(0,10);
    const habits = db.get(db.key('habits', key), {});
    const pray   = db.get(db.key('prayers', key), {});
    const hasActivity = Object.keys(habits).length > 0 || Object.keys(pray).length > 0;
    if (hasActivity) streak++;
    else break;
  }

  document.getElementById('stat-streak').textContent = streak;
  document.getElementById('stat-prayers').textContent = prayers;
  document.getElementById('stat-skill').textContent   = skill;
  document.getElementById('stat-move').textContent    = move;
  document.getElementById('stat-read').textContent    = read;
  document.getElementById('stat-wins').textContent    = wins;

  document.getElementById('streakNum').textContent = streak;
  document.getElementById('stat-streak').textContent = streak;

  // Streak ring
  const ring = document.getElementById('streakCircle');
  if (ring) {
    const pct = Math.min(1, streak / 90);
    ring.style.strokeDashoffset = 251.2 * (1 - pct);
  }

  renderChart();
}

function updateStreakUI() {
  renderStats();
}

/* ─── HABIT CHART ─── */
function renderChart() {
  const chart = document.getElementById('habitChart');
  if (!chart) return;
  chart.innerHTML = '';

  const days = Math.min(30, dayNum());
  for (let i = days; i >= 1; i--) {
    const cellDate = new Date(CHALLENGE_START);
    cellDate.setDate(cellDate.getDate() + i - 1);
    const key    = cellDate.toISOString().slice(0,10);
    const habits = db.get(db.key('habits', key), {});
    const pray   = db.get(db.key('prayers', key), {});
    const score  = getDayScore(habits, pray);

    const wrap = document.createElement('div');
    wrap.className = 'chart-bar-wrap';

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    const h = Math.max(4, Math.round(score * 100));
    bar.style.height = h + 'px';
    bar.title = `Day ${i}: ${Math.round(score*100)}%`;

    const lbl = document.createElement('div');
    lbl.className = 'chart-day-label';
    lbl.textContent = i;

    wrap.appendChild(bar);
    wrap.appendChild(lbl);
    chart.appendChild(wrap);
  }
}

/* ─── VIEW SWITCHING ─── */
function switchView(view) {
  activeView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const viewEl = document.getElementById(`view-${view}`);
  const navEl  = document.querySelector(`[data-view="${view}"]`);
  if (viewEl) viewEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  // Update topbar title
  const titles = { today:'Today\'s Mission', prayers:'Daily Prayers', progress:'90-Day Grid', journal:'Journal', stats:'Stats & Progress' };
  document.getElementById('topbarTitle').textContent = titles[view] || 'Rise & Build';

  // Refresh data
  if (view === 'progress') { renderDayGrid(); }
  if (view === 'journal')  { renderJournal(); }
  if (view === 'stats')    { renderStats(); }
  if (view === 'prayers')  { renderPrayersView(); }

  // Close sidebar on mobile
  if (window.innerWidth <= 900) toggleSidebar(false);
}

/* ─── SIDEBAR TOGGLE ─── */
function toggleSidebar(force) {
  const sb = document.getElementById('sidebar');
  sidebarOpen = force !== undefined ? force : !sidebarOpen;
  sb.classList.toggle('open', sidebarOpen);
}

/* ─── MODALS ─── */
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
}
function openDeclarationModal() {
  openModal('declModal');
}

/* ─── TOAST ─── */
function showToast(msg, duration=2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

/* ─── KEYBOARD SHORTCUTS ─── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('declModal');
    closeModal('dayModal');
  }
});

/* ─── BOOT ─── */
document.addEventListener('DOMContentLoaded', init);
