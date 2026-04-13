'use strict';
// ============================================================
// ASHEN CHRONICLE — v1.0
// ============================================================
const SCHEMA_VERSION = 1;

// ── ATTRIBUTES ───────────────────────────────────────────────
const ATTR_CFG = {
  vigor:        { name:'Vigor',        icon:'♥', color:'#d04040', desc:'Health & Vitality' },
  endurance:    { name:'Endurance',    icon:'◈', color:'#40a050', desc:'Stamina & Persistence' },
  strength:     { name:'Strength',     icon:'⚔', color:'#d07030', desc:'Physical Power' },
  dexterity:    { name:'Dexterity',    icon:'✦', color:'#4070d0', desc:'Agility & Flexibility' },
  intelligence: { name:'Intelligence', icon:'✧', color:'#8040d0', desc:'Knowledge & Mind' },
  willpower:    { name:'Willpower',    icon:'◉', color:'#40c0b0', desc:'Mental Discipline' },
  charisma:     { name:'Charisma',     icon:'★', color:'#d0a030', desc:'Social Presence' }
};

// XP required to advance from level N → N+1
// Exponential: L1→2=30, L5→6≈500, L10→11≈2800, L20→21≈18k, L40→41≈100k
const xpNeeded = n => Math.floor(30 * Math.pow(n, 1.75));

// ── HABITS ───────────────────────────────────────────────────
const HABIT_CFG = {
  reading: {
    id:'reading', name:'Lesen', icon:'📖', unit:'Seiten', defTarget:20,
    primaryAttr:'intelligence',
    xpFn: amt => ({ intelligence: amt * 1.0 }),
    defDPW:7, desc:'Bücher, Artikel, Fachliteratur'
  },
  running: {
    id:'running', name:'Laufen', icon:'🏃', unit:'Minuten', defTarget:30,
    primaryAttr:'endurance',
    xpFn: amt => ({ endurance: amt * 0.8, vigor: amt * 0.2 }),
    defDPW:5, desc:'Laufen, Joggen, Sprinten'
  },
  gym: {
    id:'gym', name:'Gym', icon:'🏋️', unit:'Minuten', defTarget:60,
    primaryAttr:'strength',
    xpFn: amt => ({ strength: amt * 1.0, vigor: amt * 0.3 }),
    defDPW:4, desc:'Krafttraining, Gewichtheben'
  },
  stretching: {
    id:'stretching', name:'Stretchen', icon:'🧘', unit:'Minuten', defTarget:15,
    primaryAttr:'dexterity',
    xpFn: amt => ({ dexterity: amt * 0.8, endurance: amt * 0.2 }),
    defDPW:5, desc:'Dehnen, Yoga, Mobilität'
  },
  journal: {
    id:'journal', name:'Tagebuch', icon:'📓', unit:'Einträge', defTarget:1,
    primaryAttr:'willpower',
    xpFn: amt => ({ willpower: amt * 20, intelligence: amt * 5 }),
    defDPW:6, desc:'Reflexion, Journaling'
  },
  progressive: {
    id:'progressive', name:'Progressive Challenge', icon:'⚡', unit:'Runden', defTarget:1,
    primaryAttr:'strength', isProgressive:true,
    xpFn: (amt, day) => ({ strength: day*0.4, endurance: day*0.25, vigor: day*0.1 }),
    defDPW:7, desc:'Tag N: N× Push-ups + Sit-ups + Squats'
  }
};
const HABIT_IDS = ['reading','running','gym','stretching','journal','progressive'];

// ── BOSSES ───────────────────────────────────────────────────
const BOSSES = [
  { id:'asylum',      name:'Asylum Demon',                game:'Dark Souls I',   tier:1, maxHp:400   },
  { id:'iudex',       name:'Iudex Gundyr',                game:'Dark Souls III', tier:1, maxHp:650   },
  { id:'vordt',       name:'Vordt of the Boreal Valley',  game:'Dark Souls III', tier:2, maxHp:950   },
  { id:'dragonrider', name:'Dragon Rider',                game:'Dark Souls II',  tier:2, maxHp:1100  },
  { id:'margit',      name:'Margit, the Fell Omen',       game:'Elden Ring',     tier:2, maxHp:1350  },
  { id:'watchers',    name:'Abyss Watchers',              game:'Dark Souls III', tier:3, maxHp:1950  },
  { id:'ape',         name:'Guardian Ape',                game:'Sekiro',         tier:3, maxHp:2100  },
  { id:'godrick',     name:'Godrick the Grafted',         game:'Elden Ring',     tier:3, maxHp:2450  },
  { id:'rennala',     name:'Rennala, Queen of the Full Moon', game:'Elden Ring', tier:3, maxHp:2750  },
  { id:'pontiff',     name:'Pontiff Sulyvahn',            game:'Dark Souls III', tier:4, maxHp:3900  },
  { id:'twins',       name:'Lothric, Younger Prince',     game:'Dark Souls III', tier:4, maxHp:4300  },
  { id:'isshin',      name:'Isshin, the Sword Saint',     game:'Sekiro',         tier:4, maxHp:4900  },
  { id:'morgott',     name:'Morgott, the Omen King',      game:'Elden Ring',     tier:4, maxHp:4500  },
  { id:'nameless',    name:'Nameless King',               game:'Dark Souls III', tier:5, maxHp:6800  },
  { id:'gael',        name:'Slave Knight Gael',           game:'Dark Souls III', tier:5, maxHp:7800  },
  { id:'friede',      name:'Sister Friede',               game:'Dark Souls III', tier:5, maxHp:8500  },
  { id:'malenia',     name:'Malenia, Blade of Miquella',  game:'Elden Ring',     tier:5, maxHp:10500 },
  { id:'elden',       name:'Elden Beast',                 game:'Elden Ring',     tier:5, maxHp:13500 }
];

// Max phases by tier
const TIER_PHASES = { 1:1, 2:1, 3:2, 4:3, 5:4 };

const PHASE_POOL = [
  { id:'enrage',  name:'ENRAGED',      icon:'🔥', desc:'Missed habits cause double boss healing.' },
  { id:'armor',   name:'ARMORED',      icon:'🛡',  desc:'Your damage is reduced by 25%.' },
  { id:'regen',   name:'REGENERATING', icon:'♥',  desc:'Boss passively heals 2% max HP per day.' },
  { id:'frenzy',  name:'FRENZIED',     icon:'⚡',  desc:'Need 90%+ habits daily or suffer a debuff.' },
  { id:'drain',   name:'SOUL DRAIN',   icon:'💀',  desc:'Ember decays faster on missed days.' }
];

// ── MATERIALS ────────────────────────────────────────────────
const MATERIALS = {
  aschenglut:      { name:'Aschenglut',       icon:'🔥', tier:1, color:'#aaaaaa' },
  kohle:           { name:'Glühende Kohle',   icon:'⬛', tier:2, color:'#50c050' },
  titanitSplitter: { name:'Titanit-Splitter', icon:'💎', tier:3, color:'#4090ff' },
  grossesTitanit:  { name:'Großes Titanit',   icon:'💜', tier:4, color:'#c050ff' },
  drachenschuppe:  { name:'Drachenschuppe',   icon:'🐉', tier:5, color:'#ffd700' },
  seelenkern:      { name:'Seelenkern',       icon:'✨', tier:6, color:'#ffffff' }
};

const UPGRADE_GUIDE = [
  { range:'+0→+1', mat:'aschenglut',      need:1,  plus:'—',                  req:'5-day streak (any habit)' },
  { range:'+1→+2', mat:'aschenglut',      need:3,  plus:'—',                  req:'5-day streak' },
  { range:'+2→+3', mat:'aschenglut',      need:6,  plus:'—',                  req:'5-day streak' },
  { range:'+3→+4', mat:'kohle',           need:1,  plus:'4× Aschenglut',      req:'10-day streak, 2 habits' },
  { range:'+4→+5', mat:'kohle',           need:2,  plus:'8× Aschenglut',      req:'10-day streak, 2 habits' },
  { range:'+5→+6', mat:'titanitSplitter', need:1,  plus:'2× Kohle',           req:'21-day streak, 3 habits + weekly task' },
  { range:'+6→+7', mat:'titanitSplitter', need:2,  plus:'4× Kohle',           req:'21-day streak, 3 habits' },
  { range:'+7→+8', mat:'grossesTitanit',  need:1,  plus:'2× Splitter',        req:'30-day streak, monthly goal' },
  { range:'+8→+9', mat:'grossesTitanit',  need:2,  plus:'4× Splitter',        req:'30-day streak' },
  { range:'+9→+10',mat:'drachenschuppe',  need:1,  plus:'2× Großes Titanit',  req:'60-day streak, 4 habits' },
  { range:'+10→+11',mat:'seelenkern',     need:1,  plus:'2× Drachenschuppe',  req:'90-day streak, 5 habits' },
  { range:'+11→+15',mat:'seelenkern',     need:'↑', plus:'↑',                 req:'Increasingly mythic requirements' }
];

const LEVEL_QUOTES = {
  vigor:        ['Your will to survive strengthens.','Death is merely a setback.','Life bends to your resolve.'],
  endurance:    ['You push further than before.','Fatigue is a lie the weak tell themselves.','The road is long. You are longer.'],
  strength:     ['Your strikes grow heavier.','The weak cower. You grow stronger.','Iron does not fear the forge.'],
  dexterity:    ['Your movements become precise.','Grace and power — unbreakable.','Flow like water, strike like lightning.'],
  intelligence: ['Insight floods your mind.','Knowledge is the sharpest weapon.','To understand is to overcome.'],
  willpower:    ['Your mind fortifies against despair.','The hardest battles are within.','Discipline is freedom.'],
  charisma:     ['Others notice your presence.','Words too can move mountains.','Leadership is earned, not given.']
};

// ============================================================
// STATE
// ============================================================
const STORAGE_KEY = 'ashen_v1';

function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    player: { name:'Chosen Undead', ember:1.0, emberDays:0 },
    attributes: Object.fromEntries(
      Object.keys(ATTR_CFG).map(id => [id, { level:1, xp:0, totalXp:0 }])
    ),
    habits: Object.fromEntries(
      HABIT_IDS.map(id => [id, {
        streak:0, longestStreak:0,
        daysPerWeek: HABIT_CFG[id].defDPW,
        target: HABIT_CFG[id].defTarget,
        dayCount:0,
        completions:{}
      }])
    ),
    boss: {
      bossIndex:0, cycle:0,
      currentHp:null, maxHp:null,
      weekStart:null,
      phaseEffects:[], activePhases:[], triggeredCount:0,
      log:[], basicEnemies:[], history:[]
    },
    inventory: {
      materials: Object.fromEntries(Object.keys(MATERIALS).map(k => [k,0]))
    },
    lastProcessed: null,
    pendingNotifs:[]
  };
}

let S = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Migrate: fill missing keys from default
    const def = defaultState();
    if (!saved.inventory) saved.inventory = def.inventory;
    if (!saved.inventory.materials) saved.inventory.materials = def.inventory.materials;
    for (const k of Object.keys(MATERIALS)) {
      if (saved.inventory.materials[k] === undefined) saved.inventory.materials[k] = 0;
    }
    if (!saved.pendingNotifs) saved.pendingNotifs = [];
    if (!saved.boss.basicEnemies) saved.boss.basicEnemies = [];
    if (!saved.boss.history) saved.boss.history = [];
    for (const id of HABIT_IDS) {
      if (!saved.habits[id]) saved.habits[id] = def.habits[id];
      if (saved.habits[id].dayCount === undefined) saved.habits[id].dayCount = 0;
    }
    return saved;
  } catch(e) { return null; }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch(e) {}
}

// ============================================================
// DATE HELPERS
// ============================================================
const today = () => new Date().toISOString().split('T')[0];

function addDays(key, n) {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysBetween(k1, k2) {
  return Math.round((new Date(k2+'T12:00:00') - new Date(k1+'T12:00:00')) / 86400000);
}

// ============================================================
// XP & LEVELING
// ============================================================
function grantXP(xpMap) {
  const ember = S.player.ember;
  const levelUps = [];
  for (const [attr, raw] of Object.entries(xpMap)) {
    if (!S.attributes[attr] || raw <= 0) continue;
    const gained = Math.round(raw * ember * 10) / 10;
    const a = S.attributes[attr];
    a.xp     += gained;
    a.totalXp += gained;
    while (a.xp >= xpNeeded(a.level)) {
      a.xp -= xpNeeded(a.level);
      a.level++;
      levelUps.push({ attr, newLevel: a.level });
    }
  }
  return levelUps;
}

function soulLevel() {
  return Object.values(S.attributes).reduce((s,a) => s + a.level, 0);
}

// ============================================================
// BOSS SYSTEM
// ============================================================
function currentBossConfig() {
  const idx  = S.boss.bossIndex % BOSSES.length;
  const base = BOSSES[idx];
  const mult = Math.pow(1.5, S.boss.cycle);
  return { ...base, maxHp: Math.round(base.maxHp * mult) };
}

function startBoss(startDate) {
  const d  = startDate || today();
  const bc = currentBossConfig();

  // Random phases for this boss
  const maxPh = TIER_PHASES[bc.tier] || 0;
  let phases  = maxPh > 0 ? (bc.tier >= 5 ? maxPh : Math.floor(Math.random() * (maxPh + 1))) : 0;
  if (bc.tier >= 3 && phases === 0 && maxPh > 0) phases = 1;

  const pool = [...PHASE_POOL].sort(() => Math.random() - 0.5);
  const phaseEffects = pool.slice(0, phases).map(p => p.id);

  // Basic enemies on day 1 and day 3
  const shuffled = [...HABIT_IDS].sort(() => Math.random() - 0.5);
  const basicEnemies = [
    { day:1, habitId:shuffled[0], defeated:false, loot:{ aschenglut:1 } },
    { day:3, habitId:shuffled[1], defeated:false, loot:{ aschenglut:2 } }
  ];

  Object.assign(S.boss, {
    currentHp: bc.maxHp, maxHp: bc.maxHp,
    weekStart: d, phaseEffects,
    activePhases:[], triggeredCount:0,
    log:[{ date:d, type:'appear', text:`${bc.name} appears! 7 days remain.` }],
    basicEnemies
  });

  S.pendingNotifs.push({ type:'warn', text:`⚔ ${bc.name} blocks your path!` });
}

function dealDamage(dmg, source) {
  if (S.boss.currentHp === null) return;
  let final = dmg;
  if (S.boss.activePhases.includes('armor')) final = Math.round(final * 0.75);
  S.boss.currentHp = Math.max(0, S.boss.currentHp - final);
  logBoss('hit', `⚔ ${source}: −${final} HP`);
  checkPhases();
  if (S.boss.currentHp <= 0) endBossWeek();
}

function checkPhases() {
  if (!S.boss.phaseEffects.length) return;
  const hpPct  = S.boss.currentHp / S.boss.maxHp;
  const total  = S.boss.phaseEffects.length;
  const thresholds = Array.from({length:total}, (_,i) => 1 - (i+1)/(total+1));
  const crossed = thresholds.filter(t => hpPct <= t).length;
  while (S.boss.triggeredCount < crossed) {
    const phId = S.boss.phaseEffects[S.boss.triggeredCount];
    const ph   = PHASE_POOL.find(p => p.id === phId);
    S.boss.activePhases.push(phId);
    S.boss.triggeredCount++;
    logBoss('phase', `${ph.icon} PHASE: ${ph.name} — ${ph.desc}`);
    S.pendingNotifs.push({ type:'phase', text:`${ph.icon} ${currentBossConfig().name} enters ${ph.name}!` });
  }
}

function logBoss(type, text) {
  S.boss.log.push({ date:today(), type, text });
  if (S.boss.log.length > 80) S.boss.log = S.boss.log.slice(-80);
}

function endBossWeek() {
  const bc  = currentBossConfig();
  const won = S.boss.currentHp <= 0;

  S.boss.history.unshift({
    name:bc.name, game:bc.game, tier:bc.tier,
    won, weekStart:S.boss.weekStart,
    finalHp:S.boss.currentHp, maxHp:S.boss.maxHp
  });
  if (S.boss.history.length > 30) S.boss.history = S.boss.history.slice(0,30);

  if (won) {
    applyLoot(bossLoot(bc));
    logBoss('victory', `${bc.name} SLAIN. VICTORY!`);
    S.pendingNotifs.push({ type:'victory', text:`⚔ VICTORY! ${bc.name} defeated!` });
    S.boss.bossIndex++;
    if (S.boss.bossIndex >= BOSSES.length) { S.boss.bossIndex = 0; S.boss.cycle++; }
  } else {
    S.player.emberDays = Math.max(0, S.player.emberDays - 4);
    S.player.ember     = Math.max(1.0, 1.0 + S.player.emberDays * 0.05);
    logBoss('defeat', `${bc.name} escapes. YOU DIED.`);
    S.pendingNotifs.push({ type:'defeat', text:`💀 ${bc.name} escaped. Ember dims.` });
  }

  S.boss.currentHp = null; S.boss.maxHp = null;
  S.boss.weekStart = null; S.boss.activePhases = [];
  S.boss.phaseEffects = []; S.boss.basicEnemies = [];
}

function bossLoot(bc) {
  const r = n => Math.floor(Math.random() * n);
  switch(bc.tier) {
    case 1: return { aschenglut: 1 + r(2) };
    case 2: return { aschenglut: 2 + r(2) };
    case 3: return { aschenglut: 2, kohle: 1 };
    case 4: return { kohle: 1 + r(2) };
    case 5: return { kohle: 2, titanitSplitter: 1 };
    default: return {};
  }
}

function applyLoot(loot) {
  for (const [mat, amt] of Object.entries(loot)) {
    if (S.inventory.materials[mat] !== undefined) S.inventory.materials[mat] += amt;
  }
}

// ============================================================
// DAILY PROCESSING
// ============================================================
function completionRate(dateKey) {
  let done = 0;
  for (const id of HABIT_IDS) if (S.habits[id].completions[dateKey]) done++;
  return done / HABIT_IDS.length;
}

function processDay(dateKey) {
  const rate = completionRate(dateKey);

  // Ember
  if (rate >= 0.7) {
    S.player.emberDays++;
    S.player.ember = Math.min(1.5, 1.0 + S.player.emberDays * 0.05);
  } else if (rate < 0.5) {
    const drain = S.boss.activePhases.includes('drain') ? 2 : 0;
    S.player.emberDays = Math.max(0, S.player.emberDays - 2 - drain);
    S.player.ember     = Math.max(1.0, 1.0 + S.player.emberDays * 0.05);
  }

  // Streaks & materials
  for (const id of HABIT_IDS) {
    const h = S.habits[id];
    if (h.completions[dateKey]) {
      h.streak++;
      h.longestStreak = Math.max(h.longestStreak, h.streak);
      if (h.streak % 5  === 0) { S.inventory.materials.aschenglut++; S.pendingNotifs.push({ type:'loot', text:`🔥 ${HABIT_CFG[id].name} ${h.streak}-day streak! +1 Aschenglut` }); }
      if (h.streak % 10 === 0) { S.inventory.materials.kohle++;      S.pendingNotifs.push({ type:'loot', text:`⬛ ${HABIT_CFG[id].name} ${h.streak}-day streak! +1 Glühende Kohle` }); }
    } else {
      if (id === 'progressive') h.dayCount = 0;
      h.streak = 0;
    }
  }

  // Boss healing / day-end logic
  if (S.boss.currentHp !== null) {
    const bc = currentBossConfig();
    if (rate < 0.5) {
      const mult  = S.boss.activePhases.includes('enrage') ? 2 : 1;
      const heal  = Math.round(S.boss.maxHp * 0.05 * mult);
      S.boss.currentHp = Math.min(S.boss.maxHp, S.boss.currentHp + heal);
      logBoss('heal', `${bc.name} heals ${heal} HP...`);
    } else if (S.boss.activePhases.includes('regen')) {
      const heal = Math.round(S.boss.maxHp * 0.02);
      S.boss.currentHp = Math.min(S.boss.maxHp, S.boss.currentHp + heal);
      logBoss('heal', `Regen: ${bc.name} heals ${heal} HP.`);
    }
    // Week end check
    const dayInFight = S.boss.weekStart ? daysBetween(S.boss.weekStart, dateKey) : 0;
    if (dayInFight >= 6) endBossWeek();
  }
}

function processMissedDays() {
  const todayKey = today();
  if (!S.lastProcessed) {
    S.lastProcessed = todayKey;
    if (S.boss.currentHp === null) startBoss(todayKey);
    return;
  }
  if (S.lastProcessed === todayKey) return;
  let cursor = addDays(S.lastProcessed, 1);
  while (cursor < todayKey) {
    if (S.boss.currentHp === null) startBoss(cursor);
    processDay(cursor);
    cursor = addDays(cursor, 1);
  }
  if (S.boss.currentHp === null) startBoss(todayKey);
  S.lastProcessed = todayKey;
}

// ============================================================
// HABIT COMPLETION
// ============================================================
function completeHabit(habitId, amount) {
  const todayKey = today();
  const h   = S.habits[habitId];
  const cfg = HABIT_CFG[habitId];
  if (h.completions[todayKey]) { showToast('Already completed today!','warn'); return; }

  let dayCount = null;
  if (cfg.isProgressive) { h.dayCount++; dayCount = h.dayCount; amount = 1; }

  const xpMap = cfg.xpFn(amount, dayCount);
  const raw   = Object.values(xpMap).reduce((s,v)=>s+v,0);
  const attrLv = S.attributes[cfg.primaryAttr].level;
  const damage = Math.round(raw * S.player.ember * (1 + attrLv * 0.03));

  h.completions[todayKey] = { amount: cfg.isProgressive ? dayCount : amount, xp:xpMap, damage };
  const levelUps = grantXP(xpMap);
  dealDamage(damage, cfg.name);

  // Same-day basic enemy check
  if (S.boss.weekStart) {
    const dayInFight = daysBetween(S.boss.weekStart, todayKey);
    for (const e of S.boss.basicEnemies) {
      if (!e.defeated && e.day === dayInFight && e.habitId === habitId) {
        e.defeated = true;
        applyLoot(e.loot);
        const mn = Object.keys(e.loot)[0]; const ma = Object.values(e.loot)[0];
        logBoss('loot', `⚔ Hollow slain! +${ma}× ${MATERIALS[mn].name}`);
        S.pendingNotifs.push({ type:'loot', text:`⚔ Hollow slain! +${ma}× ${MATERIALS[mn].name}` });
      }
    }
  }
  save();

  const xpStr = Object.entries(xpMap).filter(([,v])=>v>0)
    .map(([k,v])=>`+${Math.round(v*S.player.ember)} ${ATTR_CFG[k].name}`).join(' · ');
  showToast(`${cfg.icon} ${xpStr} | ⚔ −${damage} HP`, 'success');

  levelUps.forEach(lu => pendingLUs.push(lu));
  if (!luShowing) showNextLU();
  renderAll();
}

// ============================================================
// LEVEL-UP QUEUE
// ============================================================
const pendingLUs = [];
let luShowing = false;

function showNextLU() {
  if (!pendingLUs.length) { luShowing = false; return; }
  luShowing = true;
  const { attr, newLevel } = pendingLUs.shift();
  const cfg = ATTR_CFG[attr];
  const quotes = LEVEL_QUOTES[attr];
  const ov = document.getElementById('levelup-overlay');
  document.getElementById('lu-attr').textContent  = `${cfg.icon}  ${cfg.name}`;
  document.getElementById('lu-attr').style.color  = cfg.color;
  document.getElementById('lu-level').textContent = `Level ${newLevel}`;
  document.getElementById('lu-level').style.color = cfg.color;
  document.getElementById('lu-quote').textContent = `"${quotes[newLevel % quotes.length]}"`;
  ov.classList.remove('hidden');
}

function closeLevelUp() {
  document.getElementById('levelup-overlay').classList.add('hidden');
  luShowing = false;
  setTimeout(showNextLU, 300);
}

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(msg, type='info') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ============================================================
// NAVIGATION
// ============================================================
let activeTab = 'dashboard';

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  renderTab(tab);
}

function renderAll() { renderTab(activeTab); }

function renderTab(t) {
  switch(t) {
    case 'dashboard': renderDashboard(); break;
    case 'habits':    renderHabits();    break;
    case 'boss':      renderBoss();      break;
    case 'stats':     renderStats();     break;
    case 'inventory': renderInventory(); break;
  }
}

// ============================================================
// RENDER: DASHBOARD
// ============================================================
function renderDashboard() {
  const todayKey = today();
  const sl       = soulLevel();
  const ember    = S.player.ember;
  const emberPct = ((ember - 1.0) / 0.5) * 100;

  let done = 0;
  for (const id of HABIT_IDS) if (S.habits[id].completions[todayKey]) done++;

  const bc = currentBossConfig();
  const hpPct  = S.boss.currentHp !== null ? (S.boss.currentHp / S.boss.maxHp * 100) : 0;
  const wkDay  = S.boss.weekStart ? daysBetween(S.boss.weekStart, todayKey) : 0;
  const daysLeft = Math.max(0, 7 - wkDay);

  // Active basic enemy today
  let enemyAlert = '';
  if (S.boss.weekStart) {
    const e = S.boss.basicEnemies.find(e => e.day === wkDay && !e.defeated);
    if (e) enemyAlert = `<div class="enemy-alert">⚠ A Hollow blocks your path!<br>Complete <strong>${HABIT_CFG[e.habitId].name}</strong> today to defeat it.</div>`;
  }

  const attrsHtml = Object.entries(S.attributes).map(([id,a]) => {
    const cfg = ATTR_CFG[id];
    const pct = (a.xp / xpNeeded(a.level)) * 100;
    return `<div class="attr-mini">
      <div class="attr-mini-ico" style="color:${cfg.color}">${cfg.icon}</div>
      <div class="attr-mini-body">
        <div class="attr-mini-top">
          <span class="attr-mini-name">${cfg.name}</span>
          <span class="attr-mini-lv" style="color:${cfg.color}">Lv${a.level}</span>
        </div>
        <div class="attr-xp-bar"><div class="attr-xp-fill" style="width:${pct}%;background:${cfg.color}"></div></div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('tab-dashboard').innerHTML = `
    <button class="settings-cog" onclick="openSettings()">⚙</button>
    <div style="padding-top:4px">
      <div class="player-header">
        <div>
          <div class="player-sl">Soul Level ${sl}</div>
          <div class="player-name">${S.player.name}</div>
        </div>
        <div class="ember-section">
          <div class="ember-lbl">Ember Bonus</div>
          <div class="ember-val">${ember.toFixed(2)}×</div>
          <div class="ember-bar"><div class="ember-fill" style="width:${emberPct}%"></div></div>
        </div>
      </div>

      ${enemyAlert}

      <div class="card">
        <div class="card-label">Today's Habits</div>
        <div class="habit-today-row">
          <div class="habit-fraction">${done}<span>/${HABIT_IDS.length}</span></div>
          <div class="habit-dots">
            ${HABIT_IDS.map(id=>`<span class="h-dot ${S.habits[id].completions[todayKey]?'done':''}">${HABIT_CFG[id].icon}</span>`).join('')}
          </div>
        </div>
        <div class="bar-wrap"><div class="bar-fill progress-fill" style="width:${(done/HABIT_IDS.length)*100}%"></div></div>
        <button class="btn-primary" onclick="switchTab('habits')">Complete Habits →</button>
      </div>

      ${S.boss.currentHp !== null ? `
      <div class="card">
        <div class="card-label">${bc.game}</div>
        <div class="boss-preview-name">${bc.name}</div>
        <div class="boss-preview-sub">${'★'.repeat(bc.tier)}${'☆'.repeat(5-bc.tier)}</div>
        <div class="hp-bar-wrap" style="height:10px;border-radius:4px;position:relative;overflow:visible;">
          <div class="hp-bar-fill" style="width:${hpPct}%;height:100%;border-radius:4px;transition:width .5s"></div>
          ${S.boss.phaseEffects.map((_,i)=>{const t=(1-(i+1)/(S.boss.phaseEffects.length+1))*100;return `<div class="phase-marker ${S.boss.triggeredCount>i?'triggered':''}" style="left:${t}%;position:absolute;top:-3px;width:2px;height:calc(100% + 6px);background:${S.boss.triggeredCount>i?'#555':'#c8a040'}88;transform:translateX(-50%);z-index:2"></div>`;}).join('')}
        </div>
        <div class="boss-days">
          <span>${Math.round(S.boss.currentHp).toLocaleString()} / ${S.boss.maxHp.toLocaleString()} HP</span>
          <span class="${daysLeft<=2?'urgent':''}">${daysLeft} day${daysLeft!==1?'s':''} left</span>
        </div>
        <button class="btn-secondary" onclick="switchTab('boss')">View Battle →</button>
      </div>` : `
      <div class="card" style="text-align:center;padding:24px">
        <div style="font-size:34px;margin-bottom:10px">🕯</div>
        <div style="color:var(--text2);font-style:italic">Resting by the bonfire...<br>A new adversary approaches.</div>
      </div>`}

      <div class="card">
        <div class="card-label">Attributes</div>
        <div class="attrs-mini-grid">${attrsHtml}</div>
      </div>
    </div>`;

  // Show queued notification
  if (S.pendingNotifs.length) {
    const n = S.pendingNotifs.shift();
    setTimeout(() => showToast(n.text, n.type), 400);
    save();
  }
}

// ============================================================
// RENDER: HABITS
// ============================================================
function renderHabits() {
  const todayKey = today();
  const items = HABIT_IDS.map(id => {
    const h   = S.habits[id];
    const cfg = HABIT_CFG[id];
    const done = !!h.completions[todayKey];
    const comp = h.completions[todayKey];
    const attr = ATTR_CFG[cfg.primaryAttr];
    const goal = cfg.isProgressive
      ? `Day ${h.dayCount + (done?0:1)} · ${h.dayCount+(done?0:1)} reps each`
      : `Goal: ${h.target} ${cfg.unit}`;
    return `
    <div class="habit-item ${done?'done':''}">
      <div class="habit-main">
        <div class="habit-ico">${cfg.icon}</div>
        <div class="habit-body">
          <div class="habit-name">${cfg.name}</div>
          <div class="habit-sub"><span style="color:${attr.color}">${attr.icon} ${attr.name}</span> · ${goal}</div>
          <div class="habit-streak-row">
            <span>🔥 ${h.streak}-day streak</span>
            ${h.longestStreak>0?`<span class="habit-streak-best">Best: ${h.longestStreak}</span>`:''}
          </div>
          ${done?`<div class="habit-done-info">✓ ${cfg.isProgressive?comp.amount+'× reps':comp.amount+' '+cfg.unit} · ⚔ ${comp.damage} damage</div>`:''}
        </div>
        ${!done
          ? `<button class="btn-complete" onclick="openHabitModal('${id}')">Complete</button>`
          : `<div class="check-mark">✓</div>`}
      </div>
    </div>`;
  }).join('');

  document.getElementById('tab-habits').innerHTML = `
    <div class="section-title">Daily Habits</div>
    <div class="habits-list">${items}</div>`;
}

// ── Habit modal ──────────────────────────────────────────────
let _currentHabitModal = null;

function openHabitModal(habitId) {
  _currentHabitModal = habitId;
  const cfg    = HABIT_CFG[habitId];
  const h      = S.habits[habitId];
  const attrLv = S.attributes[cfg.primaryAttr].level;

  let content = '';
  if (cfg.isProgressive) {
    const nd = h.dayCount + 1;
    const xpMap = cfg.xpFn(1, nd);
    const xpStr = Object.entries(xpMap).map(([k,v])=>`+${Math.round(v*S.player.ember)} ${ATTR_CFG[k].name}`).join(' · ');
    const dmg = Math.round(Object.values(xpMap).reduce((s,v)=>s+v,0)*S.player.ember*(1+attrLv*0.03));
    content = `
      <div class="modal-title">${cfg.icon} ${cfg.name}</div>
      <div class="modal-desc">${cfg.desc}</div>
      <div class="modal-day-info">
        <div class="modal-day-num">Day ${nd}</div>
        <div class="modal-day-reps">${nd}× Push-ups · ${nd}× Sit-ups · ${nd}× Squats</div>
      </div>
      <div class="modal-preview">${xpStr} · ⚔ ~${dmg} boss damage</div>
      <div class="modal-btns">
        <button class="btn-primary" onclick="doComplete('${habitId}',1)">Done! ⚔</button>
        <button class="btn-ghost" onclick="closeHabitModal()">Cancel</button>
      </div>`;
  } else {
    content = `
      <div class="modal-title">${cfg.icon} ${cfg.name}</div>
      <div class="modal-desc">${cfg.desc}</div>
      <label class="modal-input-lbl">How many ${cfg.unit}?</label>
      <input id="h-amount" class="modal-input" type="number" value="${h.target}" min="1" oninput="refreshPreview()">
      <div class="modal-preview" id="h-preview">…</div>
      <div class="modal-btns">
        <button class="btn-primary" onclick="doCompleteFromInput('${habitId}')">Complete ⚔</button>
        <button class="btn-ghost" onclick="closeHabitModal()">Cancel</button>
      </div>`;
  }

  document.getElementById('habit-modal-box').innerHTML = content;
  document.getElementById('habit-overlay').classList.remove('hidden');
  if (!cfg.isProgressive) setTimeout(refreshPreview, 10);
}

function refreshPreview() {
  const id     = _currentHabitModal; if (!id) return;
  const cfg    = HABIT_CFG[id];
  const attrLv = S.attributes[cfg.primaryAttr].level;
  const el     = document.getElementById('h-amount'); if (!el) return;
  const amt    = Math.max(1, parseInt(el.value)||1);
  const xpMap  = cfg.xpFn(amt);
  const raw    = Object.values(xpMap).reduce((s,v)=>s+v,0);
  const dmg    = Math.round(raw * S.player.ember * (1 + attrLv * 0.03));
  const xpStr  = Object.entries(xpMap).filter(([,v])=>v>0).map(([k,v])=>`+${Math.round(v*S.player.ember)} ${ATTR_CFG[k].name}`).join(' · ');
  const pv = document.getElementById('h-preview'); if (pv) pv.textContent = `${xpStr} · ⚔ ~${dmg} boss damage`;
}

function doCompleteFromInput(id) {
  const el = document.getElementById('h-amount');
  const amt = Math.max(1, parseInt(el?.value)||1);
  closeHabitModal();
  completeHabit(id, amt);
}

function doComplete(id, amt) {
  closeHabitModal();
  completeHabit(id, amt);
}

function closeHabitModal() {
  document.getElementById('habit-overlay').classList.add('hidden');
  _currentHabitModal = null;
}

// ============================================================
// RENDER: BOSS
// ============================================================
function renderBoss() {
  const bc      = currentBossConfig();
  const wkDay   = S.boss.weekStart ? daysBetween(S.boss.weekStart, today()) : 0;
  const daysLeft= Math.max(0, 7 - wkDay);
  const hpPct   = S.boss.currentHp !== null ? (S.boss.currentHp/S.boss.maxHp*100) : 0;

  const BOSS_ICONS = { 1:'👤', 2:'🧌', 3:'🐉', 4:'💀', 5:'🌟' };

  if (S.boss.currentHp === null) {
    const hist = S.boss.history.slice(0,5).map(h=>`
      <div class="history-row ${h.won?'victory':'defeat'}">
        <span>${h.name}</span>
        <span>${h.won?'⚔ Victory':'💀 Defeat'}</span>
      </div>`).join('') || '<div style="color:var(--text3);font-size:13px">No battles yet.</div>';
    document.getElementById('tab-boss').innerHTML = `
      <div class="boss-waiting">
        <div class="boss-waiting-ico">🕯</div>
        <h2>Resting at the Bonfire</h2>
        <p>A new adversary will appear soon.</p>
      </div>
      <div class="card">
        <div class="card-label">Battle History</div>
        ${hist}
      </div>`;
    return;
  }

  // Phase markers
  const markers = S.boss.phaseEffects.map((_,i) => {
    const t = (1-(i+1)/(S.boss.phaseEffects.length+1))*100;
    return `<div style="position:absolute;left:${t}%;top:-4px;width:2px;height:calc(100%+8px);background:${S.boss.triggeredCount>i?'#55555588':'#c8a04088'};transform:translateX(-50%);z-index:2;pointer-events:none"></div>`;
  }).join('');

  // Active phases
  const phasesHtml = S.boss.activePhases.map(phId => {
    const ph = PHASE_POOL.find(p=>p.id===phId);
    return `<div class="phase-card"><strong>${ph.icon} ${ph.name}</strong> ${ph.desc}</div>`;
  }).join('');

  // Basic enemies
  const enemiesHtml = S.boss.basicEnemies.map(e => `
    <div class="enemy-row ${e.defeated?'defeated':''}">
      <span>${e.defeated?'☠':'⚔'} ${e.defeated?'Hollow (defeated)':'Hollow — complete '+HABIT_CFG[e.habitId].name+' on day '+e.day}</span>
      <span style="color:var(--gold)">${e.defeated?'+loot':MATERIALS[Object.keys(e.loot)[0]].icon}</span>
    </div>`).join('');

  // Combat log (newest first)
  const logHtml = [...S.boss.log].reverse().slice(0,25).map(e => {
    const cls = { hit:'log-hit', heal:'log-heal', phase:'log-phase', appear:'log-appear', victory:'log-victory', defeat:'log-defeat', loot:'log-loot' }[e.type] || '';
    return `<div class="log-entry ${cls}">${e.date} · ${e.text}</div>`;
  }).join('');

  // History
  const histHtml = S.boss.history.slice(0,5).map(h=>`
    <div class="history-row ${h.won?'victory':'defeat'}">
      <span>${h.name}</span>
      <span>${h.won?'⚔ Victory':'💀 Defeat'}</span>
    </div>`).join('') || '<div style="color:var(--text3);font-size:13px">No previous battles.</div>';

  document.getElementById('tab-boss').innerHTML = `
    <div class="boss-portrait t${bc.tier}">
      <div class="boss-bg-glow"></div>
      <div class="boss-sil">${BOSS_ICONS[bc.tier]}</div>
    </div>

    <div class="boss-info-row">
      <div>
        <div class="boss-game-tag">${bc.game}</div>
        <div class="boss-name-big">${bc.name}</div>
      </div>
      <div class="boss-tier-stars">${'★'.repeat(bc.tier)}${'☆'.repeat(5-bc.tier)}</div>
    </div>

    <div class="boss-meta">
      <div class="boss-meta-stat"><div class="boss-meta-val ${daysLeft<=2?'urgent':''}">${daysLeft}</div><div class="boss-meta-lbl">Days Left</div></div>
      <div class="boss-meta-stat"><div class="boss-meta-val">${Math.round(hpPct)}%</div><div class="boss-meta-lbl">HP Remaining</div></div>
      <div class="boss-meta-stat"><div class="boss-meta-val">${S.boss.activePhases.length}/${S.boss.phaseEffects.length}</div><div class="boss-meta-lbl">Phases Active</div></div>
    </div>

    <div class="hp-section">
      <div class="hp-header"><span>Boss HP</span><span>${Math.round(S.boss.currentHp).toLocaleString()} / ${S.boss.maxHp.toLocaleString()}</span></div>
      <div class="hp-bar-wrap" style="position:relative;overflow:visible">
        <div class="hp-bar-fill" style="width:${hpPct}%"></div>
        ${markers}
      </div>
    </div>

    ${phasesHtml ? `<div class="phases-active">${phasesHtml}</div>` : ''}

    <div class="card">
      <div class="card-label">Hollows on the Path</div>
      <div>${enemiesHtml || '<div style="color:var(--text3);font-size:13px">No hollows remain.</div>'}</div>
    </div>

    <div class="card">
      <div class="card-label">Combat Log</div>
      <div class="log-entries">${logHtml}</div>
    </div>

    <div class="card">
      <div class="card-label">Past Battles</div>
      ${histHtml}
    </div>`;
}

// ============================================================
// RENDER: STATS
// ============================================================
function renderStats() {
  const sl    = soulLevel();
  const ember = S.player.ember;
  const emberDays = S.player.emberDays;

  const attrsHtml = Object.entries(S.attributes).map(([id,a]) => {
    const cfg = ATTR_CFG[id];
    const pct = (a.xp / xpNeeded(a.level)) * 100;
    return `
    <div class="attr-card">
      <div class="attr-card-top">
        <div class="attr-ico-big" style="border-color:${cfg.color};color:${cfg.color}">${cfg.icon}</div>
        <div class="attr-body">
          <div class="attr-name-big">${cfg.name}</div>
          <div class="attr-desc-small">${cfg.desc}</div>
        </div>
        <div class="attr-level-badge" style="color:${cfg.color}">${a.level}</div>
      </div>
      <div class="attr-xp-bar-lg">
        <div class="attr-xp-fill-lg" style="width:${pct}%;background:${cfg.color}"></div>
      </div>
      <div class="attr-xp-row">
        <span>${Math.round(a.xp)} / ${xpNeeded(a.level)} XP</span>
        <span>Total: ${Math.round(a.totalXp)}</span>
      </div>
    </div>`;
  }).join('');

  document.getElementById('tab-stats').innerHTML = `
    <div class="stats-hero">
      <div class="sl-label">SOUL LEVEL</div>
      <div class="sl-big">${sl}</div>
      <div class="ember-detail">⚡ Ember ${ember.toFixed(2)}× (${emberDays} ember days)</div>
    </div>
    <div class="attrs-grid">${attrsHtml}</div>`;
}

// ============================================================
// RENDER: INVENTORY
// ============================================================
function renderInventory() {
  const matsHtml = Object.entries(MATERIALS).map(([id,cfg]) => {
    const count = S.inventory.materials[id] || 0;
    return `
    <div class="material-row ${count===0?'empty':''}">
      <div class="mat-ico">${cfg.icon}</div>
      <div class="mat-body">
        <div class="mat-name" style="color:${cfg.color}">${cfg.name}</div>
        <div class="mat-tier">Tier ${cfg.tier} Upgrade Material</div>
      </div>
      <div class="mat-count ${count>0?'has':''}">${count}</div>
    </div>`;
  }).join('');

  const guideHtml = UPGRADE_GUIDE.map((row,i) => {
    const mat = MATERIALS[row.mat];
    const mats = `${row.need}× ${mat.icon}${row.plus!=='—'?' + '+row.plus:''}`;
    return `
    <div class="upgrade-row ${i===0?'':'muted'}">
      <span>${row.range}</span>
      <span style="color:${mat.color}">${mats}</span>
      <span style="font-size:11px;color:var(--text3)">${row.req}</span>
    </div>`;
  }).join('');

  document.getElementById('tab-inventory').innerHTML = `
    <div class="inv-section-gap">
      <div class="section-title">Upgrade Materials</div>
      <div class="materials-list">${matsHtml}</div>
    </div>

    <div class="card">
      <div class="card-label">Weapon Upgrade Path</div>
      <div class="upgrade-guide">${guideHtml}</div>
    </div>

    <div class="card coming-soon">
      <div class="coming-soon-ico">⚔</div>
      <p>Weapons, Armor & Avatar<br>are coming in the next update.<br>Collect materials now!</p>
    </div>`;
}

// ============================================================
// SETTINGS
// ============================================================
function openSettings() {
  document.getElementById('settings-box').innerHTML = `
    <div class="settings-title">⚙ Settings</div>
    <div class="settings-field">
      <label>Player Name</label>
      <input id="s-name" type="text" value="${S.player.name}" maxlength="30">
    </div>
    <div class="settings-divider"></div>
    <div class="settings-field">
      <label style="font-size:13px;color:var(--text3);margin-bottom:8px;display:block">Habit Goals (per session)</label>
      ${HABIT_IDS.filter(id=>!HABIT_CFG[id].isProgressive).map(id=>`
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="width:22px;font-size:18px">${HABIT_CFG[id].icon}</span>
          <span style="flex:1;font-size:14px">${HABIT_CFG[id].name}</span>
          <input type="number" id="s-${id}" value="${S.habits[id].target}" min="1" style="width:70px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:4px 8px;font-size:14px;text-align:center">
          <span style="font-size:12px;color:var(--text3)">${HABIT_CFG[id].unit}</span>
        </div>`).join('')}
    </div>
    <button class="btn-primary" onclick="saveSettings()">Save Changes</button>
    <button class="settings-danger" onclick="resetState()">⚠ Reset All Progress</button>
    <button class="btn-ghost" style="margin-top:8px;width:100%" onclick="closeSettings()">Close</button>`;
  document.getElementById('settings-overlay').classList.remove('hidden');
}

function saveSettings() {
  const name = document.getElementById('s-name')?.value?.trim();
  if (name) S.player.name = name;
  for (const id of HABIT_IDS) {
    if (HABIT_CFG[id].isProgressive) continue;
    const el = document.getElementById(`s-${id}`);
    if (el) S.habits[id].target = Math.max(1, parseInt(el.value)||1);
  }
  save(); closeSettings(); renderAll();
  showToast('Settings saved.', 'success');
}

function closeSettings() {
  document.getElementById('settings-overlay').classList.add('hidden');
}

// ============================================================
// INIT
// ============================================================
function init() {
  const saved = loadState();
  S = saved || defaultState();
  processMissedDays();
  save();

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  renderDashboard();
}

document.addEventListener('DOMContentLoaded', init);
