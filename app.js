'use strict';
// ============================================================
// ASHEN CHRONICLE — app.js  (engine + rendering)
// ============================================================
const SCHEMA_VERSION = 2;
const STORAGE_KEY = 'ashen_v2';

// ── DEFAULT STATE ────────────────────────────────────────────
function defaultState(){
  return{
    schemaVersion:SCHEMA_VERSION,
    player:{name:'Chosen Undead',ember:1.0,emberDays:0},
    attributes:Object.fromEntries(Object.keys(ATTR_CFG).map(id=>[id,{level:1,xp:0,totalXp:0}])),
    habits:Object.fromEntries(HABIT_IDS.map(id=>[id,{streak:0,longestStreak:0,daysPerWeek:HABIT_CFG[id].defDPW,target:HABIT_CFG[id].defTarget,dayCount:0,completions:{}}])),
    boss:{bossIndex:0,cycle:0,currentHp:null,maxHp:null,weekStart:null,phaseEffects:[],activePhases:[],triggeredCount:0,log:[],basicEnemies:[],history:[]},
    inventory:{materials:Object.fromEntries(Object.keys(MATERIALS).map(k=>[k,0])),weapons:[],armor:[],equipped:{weapon:null,head:null,chest:null,hands:null,legs:null}},
    titles:{earned:[],active:null},
    weaponState:{weaponArtDaysLeft:0,weaponArtLastWeek:null,doubleHabitToday:null,doubleUsedToday:false},
    _flawlessWins:0, lastProcessed:null, pendingNotifs:[]
  };
}

let S = null;

function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem('ashen_v1');
    if(!raw)return null;
    const s=JSON.parse(raw), def=defaultState();
    if(!s.inventory)s.inventory=def.inventory;
    if(!s.inventory.weapons)s.inventory.weapons=[];
    if(!s.inventory.armor)s.inventory.armor=[];
    if(!s.inventory.equipped)s.inventory.equipped=def.inventory.equipped;
    if(!s.inventory.materials)s.inventory.materials=def.inventory.materials;
    if(!s.titles)s.titles=def.titles;
    if(!s.weaponState)s.weaponState=def.weaponState;
    if(!s.pendingNotifs)s.pendingNotifs=[];
    if(!s.boss.history)s.boss.history=[];
    if(!s.boss.basicEnemies)s.boss.basicEnemies=[];
    if(s._flawlessWins===undefined)s._flawlessWins=0;
    for(const k of Object.keys(MATERIALS)){if(s.inventory.materials[k]===undefined)s.inventory.materials[k]=0;}
    for(const id of HABIT_IDS){if(!s.habits[id])s.habits[id]=def.habits[id];if(s.habits[id].dayCount===undefined)s.habits[id].dayCount=0;}
    return s;
  }catch(e){return null;}
}

function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(S));}catch(e){}}

// ── DATE HELPERS ─────────────────────────────────────────────
const today=()=>new Date().toISOString().split('T')[0];
function addDays(key,n){const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];}
function daysBetween(k1,k2){return Math.round((new Date(k2+'T12:00:00')-new Date(k1+'T12:00:00'))/86400000);}
function getWeekKey(){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().split('T')[0];}

// ── XP & LEVELING ─────────────────────────────────────────────
function grantXP(xpMap){
  const lus=[];
  for(const[attr,raw]of Object.entries(xpMap)){
    if(!S.attributes[attr]||raw<=0)continue;
    const gained=Math.round(raw*S.player.ember*(1+getArmorXpBonus(attr))*10)/10;
    const a=S.attributes[attr]; a.xp+=gained; a.totalXp+=gained;
    while(a.xp>=xpNeeded(a.level)){a.xp-=xpNeeded(a.level);a.level++;lus.push({attr,newLevel:a.level});}
  }
  return lus;
}
function soulLevel(){return Object.values(S.attributes).reduce((t,a)=>t+a.level,0);}

// ── ARMOR BONUSES ─────────────────────────────────────────────
function equippedArmorItems(){
  return['head','chest','hands','legs'].map(slot=>S.inventory.equipped[slot]?S.inventory.armor.find(a=>a.instanceId===S.inventory.equipped[slot]):null).filter(Boolean);
}
function setCounts(){
  const c={};
  for(const item of equippedArmorItems()){const tpl=ARMOR_TEMPLATES.find(t=>t.id===item.templateId);if(tpl?.setId)c[tpl.setId]=(c[tpl.setId]||0)+1;}
  return c;
}
function getArmorXpBonus(attr){
  let b=0;
  for(const item of equippedArmorItems()){const tpl=ARMOR_TEMPLATES.find(t=>t.id===item.templateId);if(!tpl)continue;if(tpl.bonus[attr])b+=tpl.bonus[attr];}
  for(const[sid,count]of Object.entries(setCounts())){const sb=SET_BONUSES[sid];if(!sb)continue;for(const[min,data]of Object.entries(sb)){if(count>=parseInt(min)){if(data.bonus[attr])b+=data.bonus[attr];if(data.bonus._all)b+=data.bonus._all;}}}
  return b;
}
function activeSpecials(){
  const sp=new Set();
  for(const[sid,count]of Object.entries(setCounts())){const sb=SET_BONUSES[sid];if(!sb)continue;for(const[min,data]of Object.entries(sb)){if(count>=parseInt(min)&&data.special)sp.add(data.special);}}
  return sp;
}
function bossDmgBonus(){let b=0;const sp=activeSpecials();if(sp.has('boss_dmg'))b+=0.10;if(sp.has('str_dmg'))b+=S.attributes.strength.level*0.002;return b;}
function emberProtection(){const sp=activeSpecials();return{half:sp.has('ember_prot'),floor:sp.has('ember_floor')?1.2:1.0};}

// ── WEAPON EFFECTS ────────────────────────────────────────────
function equippedWeapon(){if(!S.inventory.equipped.weapon)return null;return S.inventory.weapons.find(w=>w.instanceId===S.inventory.equipped.weapon)||null;}
function weaponTpl(wpn){return wpn?WEAPON_TEMPLATES.find(t=>t.id===wpn.templateId)||null:null;}

function applyWeaponEffect(habitId,baseXpMap,baseDmg){
  const wpn=equippedWeapon(),tpl=weaponTpl(wpn);
  if(!tpl)return{xpMap:baseXpMap,damage:Math.round(baseDmg*(1+bossDmgBonus())),msg:null};
  let xpM=1.0,dmgM=1.0+bossDmgBonus(),msg=null;
  const streak=S.habits[habitId].streak;
  switch(tpl.effect){
    case'bleed':{const thr=tpl.rarity==='legendary'?5:3,bon=tpl.rarity==='legendary'?1.2:tpl.rarity==='rare'?0.8:0.6;if(streak>=thr){xpM+=bon;msg=`⚡ BLEED! +${Math.round(bon*100)}% XP`;}}break;
    case'crit':{const h=new Date().getHours(),bon=tpl.rarity==='legendary'?1.0:tpl.rarity==='rare'?0.6:0.5,always=tpl.rarity==='legendary'?0.25:0;if(h<12){xpM+=bon;msg=`⚡ CRITICAL! +${Math.round(bon*100)}% XP`;}else if(always>0){xpM+=always;msg=`⚡ Chaos +${Math.round(always*100)}% XP`;}}break;
    case'poison':{const bon=tpl.rarity==='legendary'?0.30:0.15;dmgM+=bon;msg=`☠ +${Math.round(bon*100)}% boss dmg`;}break;
    case'scaling':{const bon=Math.min(0.6,S.attributes.intelligence.level*(tpl.rarity==='epic'?0.015:0.01));xpM+=bon;if(bon>0.03)msg=`📈 Scaling +${Math.round(bon*100)}% XP`;}break;
    case'weapon_art':{if(S.weaponState.weaponArtDaysLeft>0){xpM+=0.3;msg=`🌟 Art +30% XP (${S.weaponState.weaponArtDaysLeft}d)`;}}break;
    case'double':{if(!S.weaponState.doubleUsedToday&&S.weaponState.doubleHabitToday===habitId){xpM+=1.0;S.weaponState.doubleUsedToday=true;S.weaponState.doubleHabitToday=null;msg=`⚡ DOUBLE STRIKE! 2× XP`;}}break;
  }
  const xpMap={};for(const[k,v]of Object.entries(baseXpMap))xpMap[k]=v*xpM;
  return{xpMap,damage:Math.round(baseDmg*dmgM),msg};
}

function activateWeaponArt(){
  const wpn=equippedWeapon(),tpl=weaponTpl(wpn);
  if(!tpl||tpl.effect!=='weapon_art')return;
  const wk=getWeekKey();
  if(S.weaponState.weaponArtLastWeek===wk){showToast('Already used this week.','warn');return;}
  S.weaponState.weaponArtDaysLeft=3;S.weaponState.weaponArtLastWeek=wk;
  save();showToast('🌟 Weapon Art: +30% XP for 3 days!','loot');renderAll();
}
function activateDoubleStrike(habitId){
  if(S.weaponState.doubleUsedToday){showToast('Already used today.','warn');return;}
  S.weaponState.doubleHabitToday=habitId;
  save();showToast(`⚡ Double Strike ready for ${HABIT_CFG[habitId].name}!`,'loot');renderHabits();
}

// ── LOOT ──────────────────────────────────────────────────────
function rollRarity(tier){
  const r=Math.random(),tables={1:[[0.70,'common'],[1.0,'uncommon']],2:[[0.30,'common'],[0.80,'uncommon'],[1.0,'rare']],3:[[0.20,'uncommon'],[0.75,'rare'],[1.0,'epic']],4:[[0.20,'rare'],[0.70,'epic'],[1.0,'legendary']],5:[[0.30,'epic'],[0.75,'legendary'],[1.0,'mythic']]};
  for(const[t,rar]of tables[tier])if(r<=t)return rar;return'legendary';
}
function bossMatLoot(bc){const rnd=n=>Math.floor(Math.random()*n);switch(bc.tier){case 1:return{aschenglut:1+rnd(2)};case 2:return{aschenglut:2+rnd(2)};case 3:return{aschenglut:2,kohle:1};case 4:return{kohle:1+rnd(2)};case 5:return{kohle:2,titanitSplitter:1};default:return{};}}
function applyLoot(loot){for(const[mat,amt]of Object.entries(loot)){if(S.inventory.materials[mat]!==undefined)S.inventory.materials[mat]+=amt;}}

function generateLoot(bc){
  applyLoot(bossMatLoot(bc));
  if(Math.random()>[0.40,0.55,0.65,0.80,0.92][bc.tier-1])return;
  const rarity=rollRarity(bc.tier);
  if(Math.random()<0.6){
    const pool=WEAPON_TEMPLATES.filter(t=>t.rarity===rarity);if(!pool.length)return;
    const tpl=pool[Math.floor(Math.random()*pool.length)];
    S.inventory.weapons.push({instanceId:Date.now()+'w',templateId:tpl.id,rarity:tpl.rarity,name:tpl.name,obtainedFrom:bc.name});
    S.pendingNotifs.push({type:'loot',text:`⚔ ${RARITY_CFG[rarity].name}: ${tpl.name} dropped!`});
  }else{
    const pool=ARMOR_TEMPLATES.filter(t=>t.rarity===rarity);if(!pool.length)return;
    const tpl=pool[Math.floor(Math.random()*pool.length)];
    S.inventory.armor.push({instanceId:Date.now()+'a',templateId:tpl.id,rarity:tpl.rarity,name:tpl.name,slot:tpl.slot,obtainedFrom:bc.name});
    S.pendingNotifs.push({type:'loot',text:`🛡 ${RARITY_CFG[rarity].name}: ${tpl.name} dropped!`});
  }
}

function equipItem(slot,id){S.inventory.equipped[slot]=id;save();renderInventory();showToast('Equipped!','success');}
function unequipSlot(slot){S.inventory.equipped[slot]=null;save();renderInventory();}

// ── BOSS SYSTEM ───────────────────────────────────────────────
function currentBossConfig(){const base=BOSSES[S.boss.bossIndex%BOSSES.length];return{...base,maxHp:Math.round(base.maxHp*Math.pow(1.5,S.boss.cycle))};}

function startBoss(d){
  d=d||today();const bc=currentBossConfig();
  const maxPh=TIER_PHASES[bc.tier]||0;
  let phases=maxPh>0?(bc.tier>=5?maxPh:Math.floor(Math.random()*(maxPh+1))):0;
  if(bc.tier>=3&&phases===0&&maxPh>0)phases=1;
  const phaseEffects=[...PHASE_POOL].sort(()=>Math.random()-0.5).slice(0,phases).map(p=>p.id);
  const sh=[...HABIT_IDS].sort(()=>Math.random()-0.5);
  Object.assign(S.boss,{currentHp:bc.maxHp,maxHp:bc.maxHp,weekStart:d,phaseEffects,activePhases:[],triggeredCount:0,
    log:[{date:d,type:'appear',text:`${bc.name} appears! 7 days remain.`}],
    basicEnemies:[{day:1,habitId:sh[0],defeated:false,loot:{aschenglut:1}},{day:3,habitId:sh[1],defeated:false,loot:{aschenglut:2}}]});
  S.pendingNotifs.push({type:'warn',text:`⚔ ${bc.name} blocks your path!`});
}

function dealDamage(dmg,source){
  if(S.boss.currentHp===null)return;
  let f=dmg;if(S.boss.activePhases.includes('armor'))f=Math.round(f*0.75);
  S.boss.currentHp=Math.max(0,S.boss.currentHp-f);
  logBoss('hit',`⚔ ${source}: −${f} HP`);checkPhases();
  if(S.boss.currentHp<=0)endBossWeek();
}

function checkPhases(){
  if(!S.boss.phaseEffects.length)return;
  const pct=S.boss.currentHp/S.boss.maxHp,total=S.boss.phaseEffects.length;
  const thresholds=Array.from({length:total},(_,i)=>1-(i+1)/(total+1));
  const crossed=thresholds.filter(t=>pct<=t).length;
  while(S.boss.triggeredCount<crossed){
    const ph=PHASE_POOL.find(p=>p.id===S.boss.phaseEffects[S.boss.triggeredCount]);
    S.boss.activePhases.push(ph.id);S.boss.triggeredCount++;
    logBoss('phase',`${ph.icon} PHASE: ${ph.name} — ${ph.desc}`);
    S.pendingNotifs.push({type:'phase',text:`${ph.icon} ${currentBossConfig().name} enters ${ph.name}!`});
  }
}

function logBoss(type,text){S.boss.log.push({date:today(),type,text});if(S.boss.log.length>80)S.boss.log=S.boss.log.slice(-80);}

function endBossWeek(){
  const bc=currentBossConfig(),won=S.boss.currentHp<=0;
  if(won&&S.boss.weekStart){
    let fl=true;
    outer:for(let i=0;i<7;i++){const d=addDays(S.boss.weekStart,i);for(const id of HABIT_IDS){if(!S.habits[id].completions[d]){fl=false;break outer;}}}
    if(fl){S._flawlessWins=(S._flawlessWins||0)+1;logBoss('victory','FLAWLESS VICTORY!');}
  }
  S.boss.history.unshift({name:bc.name,game:bc.game,tier:bc.tier,won,weekStart:S.boss.weekStart,finalHp:S.boss.currentHp,maxHp:S.boss.maxHp});
  if(S.boss.history.length>40)S.boss.history=S.boss.history.slice(0,40);
  if(won){
    generateLoot(bc);logBoss('victory',`${bc.name} SLAIN.`);
    S.pendingNotifs.push({type:'victory',text:`⚔ VICTORY! ${bc.name} defeated!`});
    S.boss.bossIndex++;if(S.boss.bossIndex>=BOSSES.length){S.boss.bossIndex=0;S.boss.cycle++;}
  }else{
    const ep=emberProtection();
    S.player.emberDays=Math.max(0,S.player.emberDays-4);
    S.player.ember=Math.max(ep.floor,1.0+S.player.emberDays*0.05);
    logBoss('defeat',`${bc.name} escapes. YOU DIED.`);
    S.pendingNotifs.push({type:'defeat',text:`💀 ${bc.name} escaped. Ember dims.`});
  }
  S.boss.currentHp=null;S.boss.maxHp=null;S.boss.weekStart=null;
  S.boss.activePhases=[];S.boss.phaseEffects=[];S.boss.basicEnemies=[];
  checkTitles();
}

// ── DAILY PROCESSING ──────────────────────────────────────────
function completionRate(dk){let d=0;for(const id of HABIT_IDS)if(S.habits[id].completions[dk])d++;return d/HABIT_IDS.length;}

function processDay(dk){
  const rate=completionRate(dk),ep=emberProtection();
  if(rate>=0.7){S.player.emberDays++;S.player.ember=Math.min(1.5,1.0+S.player.emberDays*0.05);}
  else if(rate<0.5){const drain=S.boss.activePhases.includes('drain')?2:0,loss=ep.half?1:2;S.player.emberDays=Math.max(0,S.player.emberDays-loss-drain);S.player.ember=Math.max(ep.floor,1.0+S.player.emberDays*0.05);}
  if(S.weaponState.weaponArtDaysLeft>0)S.weaponState.weaponArtDaysLeft--;
  S.weaponState.doubleUsedToday=false;S.weaponState.doubleHabitToday=null;
  for(const id of HABIT_IDS){
    const h=S.habits[id];
    if(h.completions[dk]){
      h.streak++;h.longestStreak=Math.max(h.longestStreak,h.streak);
      if(h.streak%5===0){S.inventory.materials.aschenglut++;S.pendingNotifs.push({type:'loot',text:`🔥 ${HABIT_CFG[id].name} ${h.streak}-day streak! +1 Aschenglut`});}
      if(h.streak%10===0){S.inventory.materials.kohle++;S.pendingNotifs.push({type:'loot',text:`⬛ ${HABIT_CFG[id].name} ${h.streak}-day streak! +1 Glühende Kohle`});}
    }else{if(id==='progressive')h.dayCount=0;h.streak=0;}
  }
  if(S.boss.currentHp!==null){
    const bc=currentBossConfig();
    if(rate<0.5){const m=S.boss.activePhases.includes('enrage')?2:1,h=Math.round(S.boss.maxHp*0.05*m);S.boss.currentHp=Math.min(S.boss.maxHp,S.boss.currentHp+h);logBoss('heal',`${bc.name} heals ${h} HP...`);}
    else if(S.boss.activePhases.includes('regen')){const h=Math.round(S.boss.maxHp*0.02);S.boss.currentHp=Math.min(S.boss.maxHp,S.boss.currentHp+h);logBoss('heal',`Regen +${h} HP.`);}
    const dif=S.boss.weekStart?daysBetween(S.boss.weekStart,dk):0;
    if(dif>=6)endBossWeek();
  }
}

function processMissedDays(){
  const tk=today();
  if(!S.lastProcessed){S.lastProcessed=tk;if(S.boss.currentHp===null)startBoss(tk);return;}
  if(S.lastProcessed===tk)return;
  let cursor=addDays(S.lastProcessed,1);
  while(cursor<tk){if(S.boss.currentHp===null)startBoss(cursor);processDay(cursor);cursor=addDays(cursor,1);}
  if(S.boss.currentHp===null)startBoss(tk);
  S.lastProcessed=tk;
}

// ── HABIT COMPLETION ──────────────────────────────────────────
function completeHabit(habitId,amount){
  const tk=today(),h=S.habits[habitId],cfg=HABIT_CFG[habitId];
  if(h.completions[tk]){showToast('Already completed today!','warn');return;}
  let dayCount=null;
  if(cfg.isProgressive){h.dayCount++;dayCount=h.dayCount;amount=1;}
  const baseXpMap=cfg.xpFn(amount,dayCount);
  const raw=Object.values(baseXpMap).reduce((s,v)=>s+v,0);
  const baseDmg=Math.round(raw*S.player.ember*(1+S.attributes[cfg.primaryAttr].level*0.03));
  const{xpMap,damage,msg:wMsg}=applyWeaponEffect(habitId,baseXpMap,baseDmg);
  h.completions[tk]={amount:cfg.isProgressive?dayCount:amount,xp:xpMap,damage};
  const lus=grantXP(xpMap);dealDamage(damage,cfg.name);
  if(S.boss.weekStart){
    const dif=daysBetween(S.boss.weekStart,tk);
    for(const e of S.boss.basicEnemies){
      if(!e.defeated&&e.day===dif&&e.habitId===habitId){
        e.defeated=true;applyLoot(e.loot);
        const mn=Object.keys(e.loot)[0],ma=Object.values(e.loot)[0];
        logBoss('loot',`⚔ Hollow slain! +${ma}× ${MATERIALS[mn].name}`);
        S.pendingNotifs.push({type:'loot',text:`⚔ Hollow slain! +${ma}× ${MATERIALS[mn].name}`});
      }
    }
  }
  save();
  const xpStr=Object.entries(xpMap).filter(([,v])=>v>0).map(([k,v])=>`+${Math.round(v*S.player.ember*(1+getArmorXpBonus(k)))} ${ATTR_CFG[k].name}`).join(' · ');
  showToast(`${cfg.icon} ${xpStr} | ⚔ −${damage} HP`+(wMsg?` | ${wMsg}`:''),'success');
  lus.forEach(lu=>pendingLUs.push(lu));if(!luShowing)showNextLU();
  checkTitles();renderAll();
}

// ── TITLES ────────────────────────────────────────────────────
function checkTitles(){
  for(const td of TITLE_DEFS){
    if(!S.titles.earned.includes(td.id)&&td.check(S)){
      S.titles.earned.push(td.id);
      S.pendingNotifs.push({type:'loot',text:`🏆 Title unlocked: "${td.name}"`});
      if(!S.titles.active)S.titles.active=td.id;
    }
  }
}
function setActiveTitle(id){S.titles.active=id;save();renderStats();showToast(`Title: "${TITLE_DEFS.find(t=>t.id===id)?.name}"`);}

// ── LEVEL-UP QUEUE ────────────────────────────────────────────
const pendingLUs=[];let luShowing=false;
function showNextLU(){
  if(!pendingLUs.length){luShowing=false;return;}
  luShowing=true;const{attr,newLevel}=pendingLUs.shift();
  const cfg=ATTR_CFG[attr],quotes=LEVEL_QUOTES[attr];
  document.getElementById('lu-attr').textContent=`${cfg.icon}  ${cfg.name}`;
  document.getElementById('lu-attr').style.color=cfg.color;
  document.getElementById('lu-level').textContent=`Level ${newLevel}`;
  document.getElementById('lu-level').style.color=cfg.color;
  document.getElementById('lu-quote').textContent=`"${quotes[newLevel%quotes.length]}"`;
  document.getElementById('levelup-overlay').classList.remove('hidden');
}
function closeLevelUp(){document.getElementById('levelup-overlay').classList.add('hidden');luShowing=false;setTimeout(showNextLU,300);}

// ── TOAST ─────────────────────────────────────────────────────
let toastTimer=null;
function showToast(msg,type='info'){
  const el=document.getElementById('toast');el.textContent=msg;el.className=`toast ${type} show`;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);
}

// ── NAVIGATION ────────────────────────────────────────────────
let activeTab='dashboard';
function switchTab(tab){
  activeTab=tab;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${tab}`));
  renderTab(tab);
}
function renderAll(){renderTab(activeTab);}
function renderTab(t){switch(t){case'dashboard':renderDashboard();break;case'habits':renderHabits();break;case'boss':renderBoss();break;case'stats':renderStats();break;case'inventory':renderInventory();break;}}

// ── AVATAR SVG ────────────────────────────────────────────────
function renderAvatarSVG(){
  const eq=S.inventory.equipped;
  const gSlot=slot=>eq[slot]?S.inventory.armor.find(a=>a.instanceId===eq[slot]):null;
  const gWpn=()=>eq.weapon?S.inventory.weapons.find(w=>w.instanceId===eq.weapon):null;
  const col=(item,fb='#1a1610')=>item?RARITY_CFG[item.rarity].color:fb;
  const H=gSlot('head'),C=gSlot('chest'),A=gSlot('hands'),L=gSlot('legs'),W=gWpn();
  const hc=col(H),cc=col(C),ac=col(A),lc=col(L),wc=W?RARITY_CFG[W.rarity].color:null;
  const allEq=[H,C,A,L,W].filter(Boolean);
  const topR=allEq.reduce((best,item)=>RARITY_ORDER.indexOf(item.rarity)>RARITY_ORDER.indexOf(best)?item.rarity:best,'common');
  const glow=['epic','legendary','mythic'].includes(topR);
  const glowC=glow?RARITY_CFG[topR].color:'#c07020';
  const flt=glow?`<filter id="cg" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="${glowC}" flood-opacity="0.8"/></filter>`:'';
  const gA=glow?'filter="url(#cg)"':'';
  const faceC=H?'#000':'#3a2818';
  return`<svg width="120" height="190" viewBox="0 0 120 190" xmlns="http://www.w3.org/2000/svg">
  <defs>${flt}</defs>
  <ellipse cx="52" cy="184" rx="30" ry="5" fill="#00000050"/>
  <g ${gA}>
    <rect x="28" y="8"  width="44" height="5"  fill="${hc}" rx="3" shape-rendering="crispEdges"/>
    <rect x="22" y="13" width="56" height="32" fill="${hc}" shape-rendering="crispEdges"/>
    <rect x="36" y="18" width="32" height="22" fill="${faceC}" shape-rendering="crispEdges"/>
    <rect x="28" y="26" width="48" height="8"  fill="#000" shape-rendering="crispEdges"/>
    <rect x="22" y="44" width="18" height="8"  fill="${hc}" shape-rendering="crispEdges"/>
    <rect x="64" y="44" width="18" height="8"  fill="${hc}" shape-rendering="crispEdges"/>
    <rect x="4"  y="50" width="24" height="14" fill="${hc}" rx="3" shape-rendering="crispEdges"/>
    <rect x="76" y="50" width="24" height="14" fill="${hc}" rx="3" shape-rendering="crispEdges"/>
    <rect x="22" y="50" width="60" height="54" fill="${cc}" shape-rendering="crispEdges"/>
    <rect x="28" y="58" width="48" height="2"  fill="#00000025" shape-rendering="crispEdges"/>
    <rect x="28" y="68" width="48" height="2"  fill="#00000025" shape-rendering="crispEdges"/>
    <rect x="28" y="78" width="48" height="2"  fill="#00000025" shape-rendering="crispEdges"/>
    <rect x="20" y="100" width="64" height="8" fill="#2a1c0e" shape-rendering="crispEdges"/>
    <rect x="4"  y="64"  width="20" height="46" fill="${ac}" shape-rendering="crispEdges"/>
    <rect x="80" y="64"  width="20" height="46" fill="${ac}" shape-rendering="crispEdges"/>
    <rect x="22" y="108" width="26" height="66" fill="${lc}" shape-rendering="crispEdges"/>
    <rect x="56" y="108" width="26" height="66" fill="${lc}" shape-rendering="crispEdges"/>
    <rect x="48" y="108" width="8"  height="66" fill="#080604" shape-rendering="crispEdges"/>
    <rect x="22" y="134" width="26" height="6"  fill="#00000030" shape-rendering="crispEdges"/>
    <rect x="56" y="134" width="26" height="6"  fill="#00000030" shape-rendering="crispEdges"/>
    <rect x="18" y="170" width="30" height="10" fill="${lc}" rx="2" shape-rendering="crispEdges"/>
    <rect x="56" y="170" width="30" height="10" fill="${lc}" rx="2" shape-rendering="crispEdges"/>
  </g>
  ${W?`<g ${gA}><rect x="106" y="14" width="6" height="110" fill="${wc}" shape-rendering="crispEdges"/><rect x="97" y="54" width="24" height="5" fill="#6b5030" shape-rendering="crispEdges"/><rect x="107" y="59" width="4" height="32" fill="#3a2818" shape-rendering="crispEdges"/></g>`:`<rect x="108" y="28" width="3" height="90" fill="#2a2018" rx="1" shape-rendering="crispEdges"/>`}
  <ellipse cx="52" cy="178" rx="22" ry="3" fill="${glowC}" opacity="0.18"/>
  </svg>`;
}

// ── RENDER: DASHBOARD ─────────────────────────────────────────
function renderDashboard(){
  const tk=today(),sl=soulLevel(),ember=S.player.ember,pct=((ember-1.0)/0.5)*100;
  let done=0;for(const id of HABIT_IDS)if(S.habits[id].completions[tk])done++;
  const bc=currentBossConfig(),hpPct=S.boss.currentHp!==null?(S.boss.currentHp/S.boss.maxHp*100):0;
  const wkDay=S.boss.weekStart?daysBetween(S.boss.weekStart,tk):0,daysLeft=Math.max(0,7-wkDay);
  let ea='';if(S.boss.weekStart){const e=S.boss.basicEnemies.find(e=>e.day===wkDay&&!e.defeated);if(e)ea=`<div class="enemy-alert">⚠ A Hollow blocks your path! Complete <strong>${HABIT_CFG[e.habitId].name}</strong> today.</div>`;}
  const activeTitle=S.titles.active?TITLE_DEFS.find(t=>t.id===S.titles.active):null;
  const attrsHtml=Object.entries(S.attributes).map(([id,a])=>{const cfg=ATTR_CFG[id],xpPct=(a.xp/xpNeeded(a.level))*100;return`<div class="attr-mini"><div class="attr-mini-ico" style="color:${cfg.color}">${cfg.icon}</div><div class="attr-mini-body"><div class="attr-mini-top"><span class="attr-mini-name">${cfg.name}</span><span class="attr-mini-lv" style="color:${cfg.color}">Lv${a.level}</span></div><div class="attr-xp-bar"><div class="attr-xp-fill" style="width:${xpPct}%;background:${cfg.color}"></div></div></div></div>`;}).join('');
  const markers=S.boss.currentHp!==null?S.boss.phaseEffects.map((_,i)=>{const t=(1-(i+1)/(S.boss.phaseEffects.length+1))*100;return`<div style="position:absolute;left:${t}%;top:-3px;width:2px;height:calc(100% + 6px);background:${S.boss.triggeredCount>i?'#55555588':'#c8a04088'};transform:translateX(-50%);z-index:2"></div>`;}).join(''):'';

  document.getElementById('tab-dashboard').innerHTML=`
  <button class="settings-cog" onclick="openSettings()">⚙</button>
  <div style="padding-top:4px">
    <div class="player-header">
      <div><div class="player-sl">Soul Level ${sl}</div><div class="player-name">${S.player.name}</div>${activeTitle?`<div style="font-size:12px;color:var(--gold);margin-top:3px">"${activeTitle.name}"</div>`:''}</div>
      <div class="ember-section"><div class="ember-lbl">Ember Bonus</div><div class="ember-val">${ember.toFixed(2)}×</div><div class="ember-bar"><div class="ember-fill" style="width:${pct}%"></div></div></div>
    </div>
    ${ea}
    <div class="card">
      <div class="card-label">Today's Habits</div>
      <div class="habit-today-row"><div class="habit-fraction">${done}<span>/${HABIT_IDS.length}</span></div><div class="habit-dots">${HABIT_IDS.map(id=>`<span class="h-dot ${S.habits[id].completions[tk]?'done':''}">${HABIT_CFG[id].icon}</span>`).join('')}</div></div>
      <div class="bar-wrap"><div class="bar-fill progress-fill" style="width:${(done/HABIT_IDS.length)*100}%"></div></div>
      <button class="btn-primary" onclick="switchTab('habits')">Complete Habits →</button>
    </div>
    ${S.boss.currentHp!==null?`
    <div class="card">
      <div class="card-label">${bc.game}</div>
      <div class="boss-preview-name">${bc.name}</div>
      <div class="boss-preview-sub">${'★'.repeat(bc.tier)}${'☆'.repeat(5-bc.tier)}</div>
      <div class="hp-bar-wrap" style="height:10px;border-radius:4px;position:relative;overflow:visible"><div class="hp-bar-fill" style="width:${hpPct}%;height:100%;border-radius:4px;transition:width .5s"></div>${markers}</div>
      <div class="boss-days"><span>${Math.round(S.boss.currentHp).toLocaleString()} / ${S.boss.maxHp.toLocaleString()} HP</span><span class="${daysLeft<=2?'urgent':''}">${daysLeft} day${daysLeft!==1?'s':''} left</span></div>
      <button class="btn-secondary" onclick="switchTab('boss')">View Battle →</button>
    </div>`:`<div class="card" style="text-align:center;padding:24px"><div style="font-size:34px;margin-bottom:10px">🕯</div><div style="color:var(--text2);font-style:italic">Resting by the bonfire...<br>A new adversary approaches.</div></div>`}
    <div class="card"><div class="card-label">Attributes</div><div class="attrs-mini-grid">${attrsHtml}</div></div>
  </div>`;
  if(S.pendingNotifs.length){const n=S.pendingNotifs.shift();setTimeout(()=>showToast(n.text,n.type),400);save();}
}

// ── RENDER: HABITS ────────────────────────────────────────────
function renderHabits(){
  const tk=today(),wpn=equippedWeapon(),tpl=weaponTpl(wpn);
  const hasArt=tpl?.effect==='weapon_art',hasDbl=tpl?.effect==='double';
  let actionBar='';
  if(hasArt){const used=S.weaponState.weaponArtLastWeek===getWeekKey(),active=S.weaponState.weaponArtDaysLeft>0;actionBar=`<div class="card" style="margin-bottom:12px"><div class="card-label">Weapon Art · ${wpn.name}</div><div style="font-size:13px;color:var(--text2);margin-bottom:8px">${tpl.effectDesc}</div>${active?`<div style="color:var(--ember2);font-size:13px">🌟 Active: ${S.weaponState.weaponArtDaysLeft} days remaining</div>`:`<button class="btn-secondary" onclick="activateWeaponArt()" ${used?'disabled style="opacity:.4"':''}>Activate Weapon Art${used?' (used this week)':''}</button>`}</div>`;}

  const items=HABIT_IDS.map(id=>{
    const h=S.habits[id],cfg=HABIT_CFG[id],done=!!h.completions[tk],comp=h.completions[tk],attr=ATTR_CFG[cfg.primaryAttr];
    const goal=cfg.isProgressive?`Day ${h.dayCount+(done?0:1)} — ${h.dayCount+(done?0:1)} reps each`:`Goal: ${h.target} ${cfg.unit}`;
    const isDblTarget=hasDbl&&S.weaponState.doubleHabitToday===id&&!done;
    return`<div class="habit-item ${done?'done':''}">
      <div class="habit-main">
        <div class="habit-ico">${cfg.icon}</div>
        <div class="habit-body">
          <div class="habit-name">${cfg.name}${isDblTarget?` <span style="color:var(--ember2);font-size:11px">⚡ 2×</span>`:''}</div>
          <div class="habit-sub"><span style="color:${attr.color}">${attr.icon} ${attr.name}</span> · ${goal}</div>
          <div class="habit-streak-row"><span>🔥 ${h.streak}-day streak</span>${h.longestStreak>0?`<span class="habit-streak-best">Best: ${h.longestStreak}</span>`:''}</div>
          ${done?`<div class="habit-done-info">✓ ${cfg.isProgressive?comp.amount+'× reps':comp.amount+' '+cfg.unit} · ⚔ ${comp.damage} damage</div>`:''}
          ${!done&&hasDbl&&!S.weaponState.doubleUsedToday&&S.weaponState.doubleHabitToday!==id?`<button style="background:none;border:1px solid var(--ember)44;border-radius:4px;color:var(--ember2);font-size:11px;padding:3px 8px;cursor:pointer;margin-top:4px" onclick="activateDoubleStrike('${id}')">⚡ Set as Double Strike</button>`:''}
        </div>
        ${!done?`<button class="btn-complete" onclick="openHabitModal('${id}')">Complete</button>`:`<div class="check-mark">✓</div>`}
      </div>
    </div>`;
  }).join('');
  document.getElementById('tab-habits').innerHTML=`${actionBar}<div class="section-title">Daily Habits</div><div class="habits-list">${items}</div>`;
}

let _cHabit=null;
function openHabitModal(habitId){
  _cHabit=habitId;const cfg=HABIT_CFG[habitId],h=S.habits[habitId],attrLv=S.attributes[cfg.primaryAttr].level;
  let content='';
  if(cfg.isProgressive){
    const nd=h.dayCount+1,xpMap=cfg.xpFn(1,nd);
    const xpStr=Object.entries(xpMap).map(([k,v])=>`+${Math.round(v*S.player.ember)} ${ATTR_CFG[k].name}`).join(' · ');
    const dmg=Math.round(Object.values(xpMap).reduce((s,v)=>s+v,0)*S.player.ember*(1+attrLv*0.03));
    content=`<div class="modal-title">${cfg.icon} ${cfg.name}</div><div class="modal-desc">${cfg.desc}</div><div class="modal-day-info"><div class="modal-day-num">Day ${nd}</div><div class="modal-day-reps">${nd}× Push-ups · ${nd}× Sit-ups · ${nd}× Squats</div></div><div class="modal-preview">${xpStr} · ⚔ ~${dmg}</div><div class="modal-btns"><button class="btn-primary" onclick="doComplete('${habitId}',1)">Done! ⚔</button><button class="btn-ghost" onclick="closeHabitModal()">Cancel</button></div>`;
  }else{
    content=`<div class="modal-title">${cfg.icon} ${cfg.name}</div><div class="modal-desc">${cfg.desc}</div><label class="modal-input-lbl">How many ${cfg.unit}?</label><input id="h-amount" class="modal-input" type="number" value="${h.target}" min="1" oninput="refreshPreview()"><div class="modal-preview" id="h-preview">…</div><div class="modal-btns"><button class="btn-primary" onclick="doCompleteFromInput('${habitId}')">Complete ⚔</button><button class="btn-ghost" onclick="closeHabitModal()">Cancel</button></div>`;
  }
  document.getElementById('habit-modal-box').innerHTML=content;
  document.getElementById('habit-overlay').classList.remove('hidden');
  if(!cfg.isProgressive)setTimeout(refreshPreview,10);
}
function refreshPreview(){
  const id=_cHabit;if(!id)return;const cfg=HABIT_CFG[id],attrLv=S.attributes[cfg.primaryAttr].level;
  const el=document.getElementById('h-amount');if(!el)return;
  const amt=Math.max(1,parseInt(el.value)||1),xpMap=cfg.xpFn(amt),raw=Object.values(xpMap).reduce((s,v)=>s+v,0);
  const dmg=Math.round(raw*S.player.ember*(1+attrLv*0.03));
  const xpStr=Object.entries(xpMap).filter(([,v])=>v>0).map(([k,v])=>`+${Math.round(v*S.player.ember)} ${ATTR_CFG[k].name}`).join(' · ');
  const pv=document.getElementById('h-preview');if(pv)pv.textContent=`${xpStr} · ⚔ ~${dmg}`;
}
function doCompleteFromInput(id){const el=document.getElementById('h-amount');closeHabitModal();completeHabit(id,Math.max(1,parseInt(el?.value)||1));}
function doComplete(id,amt){closeHabitModal();completeHabit(id,amt);}
function closeHabitModal(){document.getElementById('habit-overlay').classList.add('hidden');_cHabit=null;}

// ── RENDER: BOSS ──────────────────────────────────────────────
function renderBoss(){
  const bc=currentBossConfig(),tk=today();
  const wkDay=S.boss.weekStart?daysBetween(S.boss.weekStart,tk):0,daysLeft=Math.max(0,7-wkDay);
  const hpPct=S.boss.currentHp!==null?(S.boss.currentHp/S.boss.maxHp*100):0;
  if(S.boss.currentHp===null){
    const hist=S.boss.history.slice(0,6).map(h=>`<div class="history-row ${h.won?'victory':'defeat'}"><span>${h.name}</span><span>${h.won?'⚔ Victory':'💀 Defeat'}</span></div>`).join('')||'<div style="color:var(--text3);font-size:13px">No battles yet.</div>';
    document.getElementById('tab-boss').innerHTML=`<div class="boss-waiting"><div class="boss-waiting-ico">🕯</div><h2>Resting at the Bonfire</h2><p>A new adversary will appear soon.</p></div><div class="card"><div class="card-label">Battle History</div>${hist}</div>`;
    return;
  }
  const markers=S.boss.phaseEffects.map((_,i)=>{const t=(1-(i+1)/(S.boss.phaseEffects.length+1))*100;return`<div style="position:absolute;left:${t}%;top:-4px;width:2px;height:calc(100%+8px);background:${S.boss.triggeredCount>i?'#55555588':'#c8a04088'};transform:translateX(-50%);z-index:2"></div>`;}).join('');
  const phasesHtml=S.boss.activePhases.map(id=>{const ph=PHASE_POOL.find(p=>p.id===id);return`<div class="phase-card"><strong>${ph.icon} ${ph.name}</strong> ${ph.desc}</div>`;}).join('');
  const enemiesHtml=S.boss.basicEnemies.map(e=>`<div class="enemy-row ${e.defeated?'defeated':''}"><span>${e.defeated?'☠ Hollow (defeated)':'⚔ Hollow — '+HABIT_CFG[e.habitId].name+' on day '+e.day}</span><span style="color:var(--gold)">${e.defeated?'+loot':MATERIALS[Object.keys(e.loot)[0]].icon}</span></div>`).join('');
  const logHtml=[...S.boss.log].reverse().slice(0,25).map(e=>{const cls={hit:'log-hit',heal:'log-heal',phase:'log-phase',appear:'log-appear',victory:'log-victory',defeat:'log-defeat',loot:'log-loot'}[e.type]||'';return`<div class="log-entry ${cls}">${e.date} · ${e.text}</div>`;}).join('');
  const histHtml=S.boss.history.slice(0,5).map(h=>`<div class="history-row ${h.won?'victory':'defeat'}"><span>${h.name}</span><span>${h.won?'⚔ Victory':'💀 Defeat'}</span></div>`).join('')||'<div style="color:var(--text3);font-size:13px">No previous battles.</div>';

  document.getElementById('tab-boss').innerHTML=`
  <div class="boss-portrait t${bc.tier}"><div class="boss-bg-glow"></div><div class="boss-sil">${BOSS_ICONS[bc.tier]}</div></div>
  <div class="boss-info-row"><div><div class="boss-game-tag">${bc.game}</div><div class="boss-name-big">${bc.name}</div></div><div class="boss-tier-stars">${'★'.repeat(bc.tier)}${'☆'.repeat(5-bc.tier)}</div></div>
  <div class="boss-meta">
    <div class="boss-meta-stat"><div class="boss-meta-val ${daysLeft<=2?'urgent':''}">${daysLeft}</div><div class="boss-meta-lbl">Days Left</div></div>
    <div class="boss-meta-stat"><div class="boss-meta-val">${Math.round(hpPct)}%</div><div class="boss-meta-lbl">HP Remaining</div></div>
    <div class="boss-meta-stat"><div class="boss-meta-val">${S.boss.activePhases.length}/${S.boss.phaseEffects.length}</div><div class="boss-meta-lbl">Phases</div></div>
  </div>
  <div class="hp-section"><div class="hp-header"><span>Boss HP</span><span>${Math.round(S.boss.currentHp).toLocaleString()} / ${S.boss.maxHp.toLocaleString()}</span></div><div class="hp-bar-wrap" style="position:relative;overflow:visible"><div class="hp-bar-fill" style="width:${hpPct}%"></div>${markers}</div></div>
  ${phasesHtml?`<div class="phases-active">${phasesHtml}</div>`:''}
  <div class="card"><div class="card-label">Hollows on the Path</div>${enemiesHtml||'<div style="color:var(--text3);font-size:13px">No hollows remain.</div>'}</div>
  <div class="card"><div class="card-label">Combat Log</div><div class="log-entries">${logHtml}</div></div>
  <div class="card"><div class="card-label">Past Battles</div>${histHtml}</div>`;
}

// ── RENDER: STATS ─────────────────────────────────────────────
function renderStats(){
  const sl=soulLevel(),ember=S.player.ember;
  const attrsHtml=Object.entries(S.attributes).map(([id,a])=>{const cfg=ATTR_CFG[id],xpPct=(a.xp/xpNeeded(a.level))*100,bonus=getArmorXpBonus(id);return`<div class="attr-card"><div class="attr-card-top"><div class="attr-ico-big" style="border-color:${cfg.color};color:${cfg.color}">${cfg.icon}</div><div class="attr-body"><div class="attr-name-big">${cfg.name}</div><div class="attr-desc-small">${cfg.desc}${bonus>0?` · <span style="color:var(--gold)">+${Math.round(bonus*100)}% XP</span>`:''}</div></div><div class="attr-level-badge" style="color:${cfg.color}">${a.level}</div></div><div class="attr-xp-bar-lg"><div class="attr-xp-fill-lg" style="width:${xpPct}%;background:${cfg.color}"></div></div><div class="attr-xp-row"><span>${Math.round(a.xp)} / ${xpNeeded(a.level)} XP</span><span>Total: ${Math.round(a.totalXp)}</span></div></div>`;}).join('');
  const titlesHtml=S.titles.earned.map(id=>{const td=TITLE_DEFS.find(t=>t.id===id);return td?`<div class="title-row ${S.titles.active===id?'title-active':''}" onclick="setActiveTitle('${id}')"><span class="title-name">${td.name}</span><span class="title-desc">${td.desc}</span></div>`:'';}).join('');
  const achHtml=TITLE_DEFS.map(td=>{const e=S.titles.earned.includes(td.id);return`<div class="ach-row ${e?'earned':'locked'}"><span>${e?'🏆':'🔒'}</span><div><div class="ach-name">${e||!td.hidden?td.name:'???'}</div><div class="ach-desc">${e||!td.hidden?td.desc:'A hidden achievement — keep playing.'}</div></div></div>`;}).join('');

  document.getElementById('tab-stats').innerHTML=`
  <div class="stats-hero"><div class="sl-label">SOUL LEVEL</div><div class="sl-big">${sl}</div><div class="ember-detail">⚡ Ember ${ember.toFixed(2)}× (${S.player.emberDays} ember days)</div></div>
  <div class="attrs-grid">${attrsHtml}</div>
  ${S.titles.earned.length?`<div class="card" style="margin-top:12px"><div class="card-label">Titles — tap to equip</div>${titlesHtml}</div>`:''}
  <div class="card" style="margin-top:12px"><div class="card-label">Achievements</div>${achHtml}</div>`;
}

// ── RENDER: INVENTORY ─────────────────────────────────────────
function renderInventory(){
  const eq=S.inventory.equipped;
  const SLOTS=[['head','Head'],['chest','Chest'],['hands','Hands'],['legs','Legs'],['weapon','Weapon']];
  const slotRows=SLOTS.map(([slot,label])=>{
    const id=eq[slot];let item=null;
    if(id&&slot==='weapon')item=S.inventory.weapons.find(w=>w.instanceId===id);
    else if(id)item=S.inventory.armor.find(a=>a.instanceId===id);
    const rc=item?RARITY_CFG[item.rarity].color:'#3a3020';
    return`<div class="equip-slot-row"><span class="equip-slot-lbl">${label}</span><div class="equip-slot-item ${item?'has-item':'empty-slot'}" style="border-color:${rc}44"><span style="color:${rc};font-size:12px">${item?item.name:'— empty —'}</span>${item?`<button class="slot-unequip" onclick="unequipSlot('${slot}')">✕</button>`:''}</div></div>`;
  }).join('');

  const sc=setCounts();
  const activeSetsHtml=Object.entries(sc).filter(([,c])=>c>=2).map(([sid,count])=>{
    const sb=SET_BONUSES[sid];if(!sb)return'';
    const bonuses=[];
    if(sb[2])bonuses.push(`<span class="${count>=2?'bonus-active':'bonus-inactive'}">(2) ${sb[2].desc}</span>`);
    if(sb[4])bonuses.push(`<span class="${count>=4?'bonus-active':'bonus-inactive'}">(4) ${sb[4].desc}</span>`);
    return`<div class="set-bonus-row"><strong>${SET_NAMES[sid]||sid}</strong> (${count}/4) ${bonuses.join(' ')}</div>`;
  }).join('');

  const wpnHtml=S.inventory.weapons.map(w=>{const tpl=WEAPON_TEMPLATES.find(t=>t.id===w.templateId),rc=RARITY_CFG[w.rarity].color,isEq=eq.weapon===w.instanceId;return`<div class="item-card ${isEq?'item-equipped':''}"><div class="item-rarity-bar" style="background:${rc}"></div><div class="item-body"><div class="item-name" style="color:${rc}">${w.name}</div><div class="item-sub">${tpl?.game||''} · <span style="color:${rc}">${RARITY_CFG[w.rarity].name}</span></div>${tpl?`<div class="item-effect">⚡ ${tpl.effectName}: ${tpl.effectDesc}</div>`:''}</div><button class="btn-equip ${isEq?'btn-unequip':''}" onclick="${isEq?`unequipSlot('weapon')`:`equipItem('weapon','${w.instanceId}')`}">${isEq?'Unequip':'Equip'}</button></div>`;}).join('')||`<div style="color:var(--text3);font-size:13px;padding:8px 0">Defeat bosses to obtain weapons.</div>`;

  const armorBySlot={head:[],chest:[],hands:[],legs:[]};
  for(const a of S.inventory.armor){if(armorBySlot[a.slot])armorBySlot[a.slot].push(a);}
  const armorHtml=Object.entries(armorBySlot).map(([slot,items])=>{
    if(!items.length)return'';
    const rows=items.map(a=>{const tpl=ARMOR_TEMPLATES.find(t=>t.id===a.templateId),rc=RARITY_CFG[a.rarity].color,isEq=eq[slot]===a.instanceId;const bonStr=tpl?Object.entries(tpl.bonus).map(([k,v])=>`+${Math.round(v*100)}% ${ATTR_CFG[k]?.name||k}`).join(' · '):'';return`<div class="item-card ${isEq?'item-equipped':''}"><div class="item-rarity-bar" style="background:${rc}"></div><div class="item-body"><div class="item-name" style="color:${rc}">${a.name}</div><div class="item-sub"><span style="color:${rc}">${RARITY_CFG[a.rarity].name}</span>${tpl?.setId?` · ${SET_NAMES[tpl.setId]||''}`:''}</div>${bonStr?`<div class="item-effect">${bonStr}</div>`:''}</div><button class="btn-equip ${isEq?'btn-unequip':''}" onclick="${isEq?`unequipSlot('${slot}')`:`equipItem('${slot}','${a.instanceId}')`}">${isEq?'Unequip':'Equip'}</button></div>`;}).join('');
    return`<div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">${slot.charAt(0).toUpperCase()+slot.slice(1)}</div>${rows}</div>`;
  }).join('');

  const matsHtml=Object.entries(MATERIALS).map(([id,cfg])=>{const count=S.inventory.materials[id]||0;return`<div class="material-row ${count===0?'empty':''}"><div class="mat-ico">${cfg.icon}</div><div class="mat-body"><div class="mat-name" style="color:${cfg.color}">${cfg.name}</div><div class="mat-tier">Tier ${cfg.tier}</div></div><div class="mat-count ${count>0?'has':''}">${count}</div></div>`;}).join('');

  document.getElementById('tab-inventory').innerHTML=`
  <div class="equip-grid"><div class="avatar-wrap">${renderAvatarSVG()}</div><div class="equip-slots">${slotRows}</div></div>
  ${activeSetsHtml?`<div class="card"><div class="card-label">Set Bonuses</div>${activeSetsHtml}</div>`:''}
  <div class="card"><div class="card-label">Weapons (${S.inventory.weapons.length})</div>${wpnHtml}</div>
  ${S.inventory.armor.length?`<div class="card"><div class="card-label">Armor (${S.inventory.armor.length})</div>${armorHtml}</div>`:`<div class="card" style="text-align:center;padding:16px;color:var(--text3)">No armor yet — defeat bosses!</div>`}
  <div class="card"><div class="card-label">Upgrade Materials</div><div class="materials-list">${matsHtml}</div></div>`;
}

// ── SETTINGS ──────────────────────────────────────────────────
function openSettings(){
  document.getElementById('settings-box').innerHTML=`
  <div class="settings-title">⚙ Settings</div>
  <div class="settings-field"><label>Player Name</label><input id="s-name" type="text" value="${S.player.name}" maxlength="30"></div>
  <div class="settings-divider"></div>
  <div class="settings-field"><label style="font-size:13px;color:var(--text3);margin-bottom:8px;display:block">Habit Goals</label>
    ${HABIT_IDS.filter(id=>!HABIT_CFG[id].isProgressive).map(id=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="width:22px;font-size:18px">${HABIT_CFG[id].icon}</span><span style="flex:1;font-size:14px">${HABIT_CFG[id].name}</span><input type="number" id="s-${id}" value="${S.habits[id].target}" min="1" style="width:70px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:4px 8px;font-size:14px;text-align:center"><span style="font-size:12px;color:var(--text3)">${HABIT_CFG[id].unit}</span></div>`).join('')}
  </div>
  <button class="btn-primary" onclick="saveSettings()">Save Changes</button>
  <button class="settings-danger" onclick="resetState()">⚠ Reset All Progress</button>
  <button class="btn-ghost" style="margin-top:8px;width:100%" onclick="closeSettings()">Close</button>`;
  document.getElementById('settings-overlay').classList.remove('hidden');
}
function saveSettings(){
  const name=document.getElementById('s-name')?.value?.trim();if(name)S.player.name=name;
  for(const id of HABIT_IDS){if(HABIT_CFG[id].isProgressive)continue;const el=document.getElementById(`s-${id}`);if(el)S.habits[id].target=Math.max(1,parseInt(el.value)||1);}
  save();closeSettings();renderAll();showToast('Settings saved.','success');
}
function closeSettings(){document.getElementById('settings-overlay').classList.add('hidden');}
function resetState(){
  if(!confirm('DELETE all progress and start fresh?'))return;
  localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('ashen_v1');
  S=defaultState();startBoss();save();renderAll();showToast('Darkness reigns anew...','warn');
}

// ── INIT ──────────────────────────────────────────────────────
function init(){
  S=loadState()||defaultState();
  processMissedDays();checkTitles();save();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  renderDashboard();
}
document.addEventListener('DOMContentLoaded',init);
