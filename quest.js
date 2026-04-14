'use strict';
// ============================================================
// ASHEN CHRONICLE — quest.js
// Quest system: To-Do, Weekly Oath, Monthly Trial, Project
// ============================================================

// ── QUEST XP REWARDS ─────────────────────────────────────────
const QUEST_XP = {
  todo:    { base: 30,  onTime: 1.5 },  // +50% if before deadline
  weekly:  { base: 120, onTime: 1.4 },
  monthly: { base: 400, onTime: 1.3 },
  project: { base: 800, onTime: 1.25 }
};
const QUEST_BOSS_DMG = { weekly: 80 }; // weekly oath deals boss damage on completion

// ── QUEST CREATION ────────────────────────────────────────────
function createQuest(type, name, attr, deadline, opts = {}) {
  return {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    type, name, attr, deadline,
    created: today(),
    completed: false,
    completedDate: null,
    failed: false,
    subtasks: opts.subtasks || [],   // [{id, name, done}]
    desc: opts.desc || '',
    xpAwarded: 0
  };
}

function addQuest(type, name, attr, deadline, opts = {}) {
  if (!S.quests) S.quests = [];
  S.quests.push(createQuest(type, name, attr, deadline, opts));
  save();
  renderQuests();
  showToast(`Quest added: ${name}`, 'success');
}

function completeQuest(questId) {
  const tk = today();
  const q = S.quests.find(q => q.id === questId);
  if (!q || q.completed) return;

  // Check all subtasks done for projects
  if (q.type === 'project' && q.subtasks.length > 0) {
    const allDone = q.subtasks.every(s => s.done);
    if (!allDone) { showToast('Complete all subtasks first!', 'warn'); return; }
  }

  q.completed = true;
  q.completedDate = tk;

  const onTime = !q.deadline || tk <= q.deadline;
  const cfg = QUEST_XP[q.type];
  const mult = onTime ? cfg.onTime : 1.0;
  const xp = Math.round(cfg.base * mult * S.player.ember);
  q.xpAwarded = xp;

  // Grant XP to chosen attribute
  const xpMap = {};
  xpMap[q.attr] = xp;
  const lus = grantXP(xpMap);

  // Ember bonus for on-time completion
  if (onTime && q.deadline) {
    S.player.emberDays = Math.min(S.player.emberDays + 1, 99);
    S.player.ember = Math.min(1.5, 1.0 + S.player.emberDays * 0.05);
    showToast(`✓ ${q.name} — On time! +${xp} ${ATTR_CFG[q.attr].name} XP · Ember +`, 'success');
  } else {
    showToast(`✓ ${q.name} — +${xp} ${ATTR_CFG[q.attr].name} XP`, 'success');
  }

  // Weekly oath → boss damage
  if (q.type === 'weekly' && S.boss.currentHp !== null) {
    const dmg = QUEST_BOSS_DMG.weekly;
    dealDamage(dmg, `Weekly Oath: ${q.name}`);
    S.pendingNotifs.push({ type: 'loot', text: `⚔ Weekly Oath dealt ${dmg} boss damage!` });
  }

  // Material drops for monthly/project
  if (q.type === 'monthly' && onTime) applyLoot({ kohle: 1 });
  if (q.type === 'project' && onTime) applyLoot({ titanitSplitter: 1 });

  lus.forEach(lu => pendingLUs.push(lu));
  if (!luShowing) showNextLU();
  checkTitles();
  save();
  renderAll();
}

function toggleSubtask(questId, subtaskId) {
  const q = S.quests.find(q => q.id === questId);
  if (!q) return;
  const s = q.subtasks.find(s => s.id === subtaskId);
  if (!s) return;
  s.done = !s.done;

  // XP for completing a subtask
  if (s.done) {
    const partialXp = Math.round(QUEST_XP.project.base * 0.15 * S.player.ember);
    const xpMap = {}; xpMap[q.attr] = partialXp;
    const lus = grantXP(xpMap);
    lus.forEach(lu => pendingLUs.push(lu));
    if (!luShowing) showNextLU();
    showToast(`✓ Subtask done — +${partialXp} ${ATTR_CFG[q.attr].name} XP`, 'success');
  }
  save();
  renderQuests();
}

function deleteQuest(questId) {
  if (!confirm('Delete this quest?')) return;
  S.quests = S.quests.filter(q => q.id !== questId);
  save();
  renderQuests();
}

function processQuestDeadlines() {
  const tk = today();
  if (!S.quests) return;
  for (const q of S.quests) {
    if (q.completed || q.failed) continue;
    if (q.deadline && tk > q.deadline) {
      q.failed = true;
      // Small ember malus — only if not completed
      S.player.emberDays = Math.max(0, S.player.emberDays - 1);
      S.player.ember = Math.max(1.0, 1.0 + S.player.emberDays * 0.05);
      S.pendingNotifs.push({ type: 'warn', text: `⌛ "${q.name}" expired. Ember dims slightly.` });
    }
  }
}

// ── QUEST MODAL ───────────────────────────────────────────────
let _questType = null;
const subtaskBuffer = [];

function openQuestModal(type) {
  _questType = type;
  subtaskBuffer.length = 0;

  const typeNames = { todo: 'Side Quest', weekly: 'Weekly Oath', monthly: 'Monthly Trial', project: 'Grand Covenant' };
  const typeIcons = { todo: '📋', weekly: '🗡', monthly: '⚔', project: '🏰' };
  const isProject = type === 'project';
  const isSimple = type === 'todo' || type === 'weekly';

  const attrOptions = Object.entries(ATTR_CFG).map(([id, cfg]) =>
    `<option value="${id}">${cfg.icon} ${cfg.name}</option>`
  ).join('');

  const deadlineSection = `
    <div class="modal-field">
      <label class="modal-input-lbl">Deadline ${isSimple ? '(optional)' : ''}</label>
      <input id="q-deadline" type="date" class="modal-input" style="font-size:14px;padding:8px 14px">
    </div>`;

  const descSection = isProject ? `
    <div class="modal-field">
      <label class="modal-input-lbl">Description (optional)</label>
      <textarea id="q-desc" class="modal-input" style="font-size:14px;padding:8px 14px;height:64px;resize:none" placeholder="What is this project about?"></textarea>
    </div>` : '';

  const subtaskSection = isProject ? `
    <div class="modal-field">
      <label class="modal-input-lbl">Subtasks</label>
      <div id="q-subtasks-list" style="margin-bottom:8px"></div>
      <div style="display:flex;gap:8px">
        <input id="q-subtask-input" class="modal-input" style="font-size:14px;padding:7px 12px;flex:1" placeholder="Add subtask...">
        <button onclick="addSubtaskToBuffer()" class="btn-secondary" style="width:auto;margin:0;padding:8px 14px">+</button>
      </div>
    </div>` : '';

  document.getElementById('habit-modal-box').innerHTML = `
    <div class="modal-title">${typeIcons[type]} ${typeNames[type]}</div>
    <div class="modal-field">
      <label class="modal-input-lbl">Quest Name</label>
      <input id="q-name" class="modal-input" style="font-size:16px;padding:8px 14px" placeholder="Name your quest...">
    </div>
    <div class="modal-field">
      <label class="modal-input-lbl">Attribute</label>
      <select id="q-attr" class="modal-input" style="font-size:14px;padding:8px 14px">${attrOptions}</select>
    </div>
    ${deadlineSection}
    ${descSection}
    ${subtaskSection}
    <div class="modal-btns">
      <button class="btn-primary" onclick="submitQuestModal()">Create Quest ⚔</button>
      <button class="btn-ghost" onclick="closeHabitModal()">Cancel</button>
    </div>`;

  document.getElementById('habit-overlay').classList.remove('hidden');

  // Set default deadline
  const inp = document.getElementById('q-deadline');
  if (inp) {
    if (type === 'weekly') {
      // End of current week (Sunday)
      const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay()));
      inp.value = d.toISOString().split('T')[0];
    } else if (type === 'monthly') {
      // End of current month
      const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0);
      inp.value = d.toISOString().split('T')[0];
    }
  }
}

function addSubtaskToBuffer() {
  const inp = document.getElementById('q-subtask-input');
  const name = inp?.value?.trim();
  if (!name) return;
  subtaskBuffer.push({ id: Date.now() + '_s', name, done: false });
  inp.value = '';
  renderSubtaskBuffer();
}

function removeSubtaskFromBuffer(id) {
  const idx = subtaskBuffer.findIndex(s => s.id === id);
  if (idx >= 0) subtaskBuffer.splice(idx, 1);
  renderSubtaskBuffer();
}

function renderSubtaskBuffer() {
  const el = document.getElementById('q-subtasks-list');
  if (!el) return;
  el.innerHTML = subtaskBuffer.map(s => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:var(--bg);border-radius:4px;margin-bottom:4px;font-size:13px">
      <span>${s.name}</span>
      <button onclick="removeSubtaskFromBuffer('${s.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px">✕</button>
    </div>`).join('');
}

function submitQuestModal() {
  const name = document.getElementById('q-name')?.value?.trim();
  const attr = document.getElementById('q-attr')?.value;
  const deadline = document.getElementById('q-deadline')?.value || null;
  const desc = document.getElementById('q-desc')?.value?.trim() || '';
  if (!name) { showToast('Enter a quest name!', 'warn'); return; }
  const opts = { subtasks: [...subtaskBuffer], desc };
  addQuest(_questType, name, attr, deadline, opts);
  closeHabitModal();
}

// ── RENDER: QUESTS TAB ────────────────────────────────────────
function renderQuests() {
  if (!S.quests) S.quests = [];
  const tk = today();

  const sections = [
    { type: 'todo',    label: 'Side Quests',     icon: '📋', desc: 'One-off tasks' },
    { type: 'weekly',  label: 'Weekly Oaths',    icon: '🗡',  desc: 'Deals boss damage on completion' },
    { type: 'monthly', label: 'Monthly Trials',  icon: '⚔',  desc: 'Earn Kohle on time' },
    { type: 'project', label: 'Grand Covenants', icon: '🏰', desc: 'Long-term goals with subtasks' }
  ];

  const sectionsHtml = sections.map(sec => {
    const quests = S.quests.filter(q => q.type === sec.type);
    const active = quests.filter(q => !q.completed && !q.failed);
    const done   = quests.filter(q => q.completed).slice(0, 3);
    const failed = quests.filter(q => q.failed && !q.completed).slice(0, 2);

    const activeHtml = active.map(q => questCard(q, tk)).join('') ||
      `<div style="color:var(--text3);font-size:13px;padding:8px 0">No active ${sec.label.toLowerCase()}.</div>`;
    const doneHtml = done.map(q => `
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text3);padding:4px 0;border-bottom:1px solid var(--bg3)">
        <span>✓ ${q.name}</span>
        <span style="color:var(--gold);font-size:11px">+${q.xpAwarded} XP</span>
      </div>`).join('');
    const failedHtml = failed.map(q => `
      <div style="font-size:13px;color:var(--red);padding:4px 0;opacity:.6">✕ ${q.name} <span style="font-size:11px">(expired)</span></div>`).join('');

    return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <div class="card-label">${sec.icon} ${sec.label}</div>
          <div style="font-size:11px;color:var(--text3)">${sec.desc}</div>
        </div>
        <button class="btn-add-quest" onclick="openQuestModal('${sec.type}')">+ New</button>
      </div>
      ${activeHtml}
      ${doneHtml || failedHtml ? `<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">${doneHtml}${failedHtml}</div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('tab-quests').innerHTML = sectionsHtml;
}

function questCard(q, tk) {
  const attr = ATTR_CFG[q.attr];
  const cfg = QUEST_XP[q.type];
  const overdue = q.deadline && tk > q.deadline;
  const onTimeBonus = q.deadline && !overdue;
  const daysLeft = q.deadline ? daysBetween(tk, q.deadline) : null;
  const urgent = daysLeft !== null && daysLeft <= 1;

  const deadlineStr = q.deadline
    ? `<span class="${urgent ? 'urgent' : ''}" style="font-size:11px;color:${overdue ? 'var(--red)' : urgent ? 'var(--red)' : 'var(--text3)'}">${overdue ? '⌛ Overdue' : daysLeft === 0 ? '⚠ Due today' : `${daysLeft}d left`}</span>`
    : '';

  const xpPreview = Math.round(cfg.base * (onTimeBonus ? cfg.onTime : 1.0) * S.player.ember);

  // Subtasks for projects
  const subtasksHtml = q.subtasks.length ? `
    <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">
      ${q.subtasks.map(s => `
        <div style="display:flex;align-items:center;gap:8px;font-size:13px">
          <button onclick="toggleSubtask('${q.id}','${s.id}')" style="width:18px;height:18px;border-radius:3px;border:1px solid ${s.done ? 'var(--green)' : 'var(--border)'};background:${s.done ? 'var(--green)22' : 'var(--bg)'};color:var(--green);cursor:pointer;font-size:11px;flex-shrink:0">${s.done ? '✓' : ''}</button>
          <span style="color:${s.done ? 'var(--text3)' : 'var(--text)'};text-decoration:${s.done ? 'line-through' : 'none'}">${s.name}</span>
        </div>`).join('')}
      <div style="font-size:11px;color:var(--text3);margin-top:2px">${q.subtasks.filter(s=>s.done).length}/${q.subtasks.length} complete</div>
    </div>` : '';

  const canComplete = q.type !== 'project' || q.subtasks.every(s => s.done) || q.subtasks.length === 0;

  return `
  <div class="quest-card ${overdue ? 'quest-overdue' : ''}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div style="flex:1;min-width:0">
        <div class="quest-name">${q.name}</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:3px;flex-wrap:wrap">
          <span style="font-size:11px;color:${attr.color}">${attr.icon} ${attr.name}</span>
          ${deadlineStr}
          ${onTimeBonus ? `<span style="font-size:11px;color:var(--gold)">⚡ On-time bonus: +${Math.round((cfg.onTime-1)*100)}% XP</span>` : ''}
        </div>
        ${q.desc ? `<div style="font-size:12px;color:var(--text3);margin-top:4px;font-style:italic">${q.desc}</div>` : ''}
        ${subtasksHtml}
        <div style="font-size:11px;color:var(--text3);margin-top:5px">~${xpPreview} ${attr.name} XP on completion</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
        ${canComplete ? `<button class="btn-complete-quest" onclick="completeQuest('${q.id}')">✓ Done</button>` : `<button class="btn-complete-quest" style="opacity:.4" disabled>✓ Done</button>`}
        <button onclick="deleteQuest('${q.id}')" style="background:none;border:none;color:var(--text3);font-size:12px;cursor:pointer;padding:0">✕</button>
      </div>
    </div>
  </div>`;
}
