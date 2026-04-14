'use strict';
// ASHEN CHRONICLE v3 — app.js
const SCHEMA_VERSION = 3;
const STORAGE_KEY = 'ashen_v3';

function defaultState(){return{schemaVersion:SCHEMA_VERSION,player:{name:'Chosen Undead',ember:1.0,emberDays:0},attributes:Object.fromEntries(Object.keys(ATTR_CFG).map(id=>[id,{level:1,xp:0,totalXp:0}])),habits:Object.fromEntries(HABIT_IDS.map(id=>[id,{streak:0,longestStreak:0,daysPerWeek:HABIT_CFG[id].defDPW,target:HABIT_CFG[id].defTarget,dayCount:0,completions:{}}])),boss:{bossIndex:0,cycle:0,currentHp:null,maxHp:null,weekStart:null,phaseEffects:[],activePhases:[],triggeredCount:0,log:[],basicEnemies:[],history:[]},inventory:{materials:Object.fromEntries(Object.keys(MATERIALS).map(k=>[k,0])),weapons:[],armor:[],equipped:{weapon:null,head:null,chest:null,hands:null,legs:null}},titles:{earned:[],active:null},weaponState:{weaponArtDaysLeft:0,weaponArtLastWeek:null,doubleHabitToday:null,doubleUsedToday:false},quests:[],_flawlessWins:0,lastProcessed:null,pendingNotifs:[]};}

let S=null;

function loadState(){try{const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem('ashen_v2')||localStorage.getItem('ashen_v1');if(!raw)return null;const s=JSON.parse(raw),def=defaultState();if(!s.inventory)s.inventory=def.inventory;if(!s.inventory.weapons)s.inventory.weapons=[];if(!s.inventory.armor)s.inventory.armor=[];if(!s.inventory.equipped)s.inventory.equipped=def.inventory.equipped;if(!s.inventory.materials)s.inventory.materials=def.inventory.materials;if(!s.titles)s.titles=def.titles;if(!s.weaponState)s.weaponState=def.weaponState;if(!s.pendingNotifs)s.pendingNotifs=[];if(!s.boss.history)s.boss.history=[];if(!s.boss.basicEnemies)s.boss.basicEnemies=[];if(!s.quests)s.quests=[];if(s._flawlessWins===undefined)s._flawlessWins=0;for(const k of Object.keys(MATERIALS)){if(s.inventory.materials[k]===undefined)s.inventory.materials[k]=0;}for(const id of HABIT_IDS){if(!s.habits[id])s.habits[id]=def.habits[id];if(s.habits[id].dayCount===undefined)s.habits[id].dayCount=0;}return s;}catch(e){return null;}}

function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(S));}catch(e){}}

const today=()=>new Date().toISOString().split('T')[0];
function addDays(key,n){const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];}
function daysBetween(k1,k2){return Math.round((new Date(k2+'T12:00:00')-new Date(k1+'T12:00:00'))/86400000);}
function getWeekKey(){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().split('T')[0];}

function grantXP(xpMap){const lus=[];for(const[attr,raw]of Object.entries(xpMap)){if(!S.attributes[attr]||raw<=0)continue;const gained=Math.round(raw*S.player.ember*(1+getArmorXpBonus(attr))*10)/10;const a=S.attributes[attr];a.xp+=gained;a.totalXp+=gained;while(a.xp>=xpNeeded(a.level)){a.xp-=xpNeeded(a.level);a.level++;lus.push({attr,newLevel:a.level});}}return lus;}
function soulLevel(){return Object.values(S.attributes).reduce((t,a)=>t+a.level,0);}

function equippedArmorItems(){return['head','chest','hands','legs'].map(slot=>S.inventory.equipped[slot]?S.inventory.armor.find(a=>a.instanceId===S.inventory.equipped[slot]):null).filter(Boolean);}
function setCounts(){const c={};for(const item of equippedArmorItems()){const tpl=ARMOR_TEMPLATES.find(t=>t.id===item.templateId);if(tpl?.setId)c[tpl.setId]=(c[tpl.setId]||0)+1;}return c;}
function getArmorXpBonus(attr){let b=0;for(const item of equippedArmorItems()){const tpl=ARMOR_TEMPLATES.find(t=>t.id===item.templateId);if(!tpl)continue;if(tpl.bonus[attr])b+=tpl.bonus[attr];}for(const[sid,count]of Object.entries(setCounts())){const sb=SET_BONUSES[sid];if(!sb)continue;for(const[min,data]of Object.entries(sb)){if(count>=parseInt(min)){if(data.bonus[attr])b+=data.bonus[attr];if(data.bonus._all)b+=data.bonus._all;}}}return b;}
function activeSpecials(){const sp=new Set();for(const[sid,count]of Object.entries(setCounts())){const sb=SET_BONUSES[sid];if(!sb)continue;for(const[min,data]of Object.entries(sb)){if(count>=parseInt(min)&&data.special)sp.add(data.special);}}return sp;}
function bossDmgBonus(){let b=0;const sp=activeSpecials();if(sp.has('boss_dmg'))b+=0.10;if(sp.has('str_dmg'))b+=S.attributes.strength.level*0.002;return b;}
function emberProtection(){const sp=activeSpecials();return{half:sp.has('ember_prot'),floor:sp.has('ember_floor')?1.2:1.0};}

function equippedWeapon(){if(!S.inventory.equipped.weapon)return null;return S.inventory.weapons.find(w=>w.instanceId===S.inventory.equipped.weapon)||null;}
function weaponTpl(wpn){return wpn?WEAPON_TEMPLATES.find(t=>t.id===wpn.templateId)||null:null;}

function applyWeaponEffect(habitId,baseXpMap,baseDmg){const wpn=equippedWeapon(),tpl=weaponTpl(wpn);if(!tpl)return{xpMap:baseXpMap,damage:Math.round(baseDmg*(1+bossDmgBonus())),msg:null};let xpM=1.0,dmgM=1.0+bossDmgBonus(),msg=null;const streak=S.habits[habitId].streak;switch(tpl.effect){case'bleed':{const thr=tpl.rarity==='legendary'?5:3,bon=tpl.rarity==='legendary'?1.2:tpl.rarity==='rare'?0.8:0.6;if(streak>=thr){xpM+=bon;msg=`⚡ BLEED! +${Math.round(bon*100)}% XP`;}}break;case'crit':{const h=new Date().getHours(),bon=tpl.rarity==='legendary'?1.0:tpl.rarity==='rare'?0.6:0.5,always=tpl.rarity==='legendary'?0.25:0;if(h<12){xpM+=bon;msg=`⚡ CRITICAL! +${Math.round(bon*100)}% XP`;}else if(always>0){xpM+=always;msg=`⚡ Chaos +${Math.round(always*100)}% XP`;}}break;case'poison':{const bon=tpl.rarity==='legendary'?0.30:0.15;dmgM+=bon;msg=`☠ +${Math.round(bon*100)}% boss dmg`;}break;case'scaling':{const bon=Math.min(0.6,S.attributes.intelligence.level*(tpl.rarity==='epic'?0.015:0.01));xpM+=bon;if(bon>0.03)msg=`📈 Scaling +${Math.round(bon*100)}% XP`;}break;case'weapon_art':{if(S.weaponState.weaponArtDaysLeft>0){xpM+=0.3;msg=`🌟 Art +30% XP`;}}break;case'double':{if(!S.weaponState.doubleUsedToday&&S.weaponState.doubleHabitToday===habitId){xpM+=1.0;S.weaponState.doubleUsedToday=true;S.weaponState.doubleHabitToday=null;msg=`⚡ DOUBLE STRIKE!`;}}break;}const xpMap={};for(const[k,v]of Object.entries(baseXpMap))xpMap[k]=v*xpM;return{xpMap,damage:Math.round(baseDmg*dmgM),msg};}

function activateWeaponArt(){const wpn=equippedWeapon(),tpl=weaponTpl(wpn);if(!tpl||tpl.effect!=='weapon_art')return;const wk=getWeekKey();if(S.weaponState.weaponArtLastWeek===wk){showToast('Already used this week.','warn');return;}S.weaponState.weaponArtDaysLeft=3;S.weaponState.weaponArtLastWeek=wk;save();showToast('🌟 Weapon Art: +30% XP for 3 days!','loot');renderAll();}
function activateDoubleStrike(habitId){if(S.weaponState.doubleUsedToday){showToast('Already used today.','warn');return;}S.weaponState.doubleHabitToday=habitId;save();showToast(`⚡ Double Strike ready for ${HABIT_CFG[habitId].name}!`,'loot');renderHabits();}

function rollRarity(tier){const r=Math.random(),tables={1:[[0.70,'common'],[1.0,'uncommon']],2:[[0.30,'common'],[0.80,'uncommon'],[1.0,'rare']],3:[[0.20,'uncommon'],[0.75,'rare'],[1.0,'epic']],4:[[0.20,'rare'],[0.70,'epic'],[1.0,'legendary']],5:[[0.30,'epic'],[0.75,'legendary'],[1.0,'mythic']]};for(const[t,rar]of tables[tier])if(r<=t)return rar;return'legendary';}
function bossMatLoot(bc){const rnd=n=>Math.floor(Math.random()*n);switch(bc.tier){case 1:return{aschenglut:1+rnd(2)};case 2:return{aschenglut:2+rnd(2)};case 3:return{aschenglut:2,kohle:1};case 4:return{kohle:1+rnd(2)};case 5:return{kohle:2,titanitSplitter:1};default:return{};}}
function applyLoot(loot){for(const[mat,amt]of Object.entries(loot)){if(S.inventory.materials[mat]!==undefined)S.inventory.materials[mat]+=amt;}}
function generateLoot(bc){applyLoot(bossMatLoot(bc));if(Math.random()>[0.40,0.55,0.65,0.80,0.92][bc.tier-1])return;const rarity=rollRarity(bc.tier);if(Math.random()<0.6){const pool=WEAPON_TEMPLATES.filter(t=>t.rarity===rarity);if(!pool.length)return;const tpl=pool[Math.floor(Math.random()*pool.length)];S.inventory.weapons.push({instanceId:Date.now()+'w',templateId:tpl.id,rarity:tpl.rarity,name:tpl.name,obtainedFrom:bc.name});S.pendingNotifs.push({type:'loot',text:`⚔ ${RARITY_CFG[rarity].name}: ${tpl.name} dropped!`});}else{const pool=ARMOR_TEMPLATES.filter(t=>t.rarity===rarity);if(!pool.length)return;const tpl=pool[Math.floor(Math.random()*pool.length)];S.inventory.armor.push({instanceId:Date.now()+'a',templateId:tpl.id,rarity:tpl.rarity,name:tpl.name,slot:tpl.slot,obtainedFrom:bc.name});S.pendingNotifs.push({type:'loot',text:`🛡 ${RARITY_CFG[rarity].name}: ${tpl.name} dropped!`});}}
function equipItem(slot,id){S.inventory.equipped[slot]=id;save();renderInventory();showToast('Equipped!','success');}
function unequipSlot(slot){S.inventory.equipped[slot]=null;save();renderInventory();}

function currentBossConfig(){const base=BOSSES[S.boss.bossIndex%BOSSES.length];return{...base,maxHp:Math.round(base.maxHp*Math.pow(1.5,S.boss.cycle))};}
function startBoss(d){d=d||today();const bc=currentBossConfig();const maxPh=TIER_PHASES[bc.tier]||0;let phases=maxPh>0?(bc.tier>=5?maxPh:Math.floor(Math.random()*(maxPh+1))):0;if(bc.tier>=3&&phases===0&&maxPh>0)phases=1;const phaseEffects=[...PHASE_POOL].sort(()=>Math.random()-0.5).slice(0,phases).map(p=>p.id);const sh=[...HABIT_IDS].sort(()=>Math.random()-0.5);Object.assign(S.boss,{currentHp:bc.maxHp,maxHp:bc.maxHp,weekStart:d,phaseEffects,activePhases:[],triggeredCount:0,log:[{date:d,type:'appear',text:`${bc.name} appears! 7 days remain.`}],basicEnemies:[{day:1,habitId:sh[0],defeated:false,loot:{aschenglut:1}},{day:3,habitId:sh[1],defeated:false,loot:{aschenglut:2}}]});S.pendingNotifs.push({type:'warn',text:`⚔ ${bc.name} blocks your path!`});}
function dealDamage(dmg,source){if(S.boss.currentHp===null)return;let f=dmg;if(S.boss.activePhases.includes('armor'))f=Math.round(f*0.75);S.boss.currentHp=Math.max(0,S.boss.currentHp-f);logBoss('hit',`⚔ ${source}: −${f} HP`);checkPhases();if(S.boss.currentHp<=0)endBossWeek();}
function checkPhases(){if(!S.boss.phaseEffects.length)return;const pct=S.boss.currentHp/S.boss.maxHp,total=S.boss.phaseEffects.length;const thresholds=Array.from({length:total},(_,i)=>1-(i+1)/(total+1));const crossed=thresholds.filter(t=>pct<=t).length;while(S.boss.triggeredCount<crossed){const ph=PHASE_POOL.find(p=>p.id===S.boss.phaseEffects[S.boss.triggeredCount]);S.boss.activePhases.push(ph.id);S.boss.triggeredCount++;logBoss('phase',`${ph.icon} PHASE: ${ph.name}`);S.pendingNotifs.push({type:'phase',text:`${ph.icon} ${currentBossConfig().name} enters ${ph.name}!`});}}
function logBoss(type,text){S.boss.log.push({date:today(),type,text});if(S.boss.log.length>80)S.boss.log=S.boss.log.slice(-80);}
function endBossWeek(){const bc=currentBossConfig(),won=S.boss.currentHp<=0;if(won&&S.boss.weekStart){let fl=true;outer:for(let i=0;i<7;i++){const d=addDays(S.boss.weekStart,i);for(const id of HABIT_IDS){if(!S.habits[id].completions[d]){fl=false;break outer;}}}if(fl)S._flawlessWins=(S._flawlessWins||0)+1;}S.boss.history.unshift({name:bc.name,game:bc.game,tier:bc.tier,won,weekStart:S.boss.weekStart,finalHp:S.boss.currentHp,maxHp:S.boss.maxHp});if(S.boss.history.length>40)S.boss.history=S.boss.history.slice(0,40);if(won){generateLoot(bc);logBoss('victory',`${bc.name} SLAIN.`);S.pendingNotifs.push({type:'victory',text:`⚔ VICTORY! ${bc.name} defeated!`});S.boss.bossIndex++;if(S.boss.bossIndex>=BOSSES.length){S.boss.bossIndex=0;S.boss.cycle++;}}else{const ep=emberProtection();S.player.emberDays=Math.max(0,S.player.emberDays-4);S.player.ember=Math.max(ep.floor,1.0+S.player.emberDays*0.05);logBoss('defeat',`${bc.name} escapes. YOU DIED.`);S.pendingNotifs.push({type:'defeat',text:`💀 ${bc.name} escaped.`});}S.boss.currentHp=null;S.boss.maxHp=null;S.boss.weekStart=null;S.boss.activePhases=[];S.boss.phaseEffects=[];S.boss.basicEnemies=[];checkTitles();}

function completionRate(dk){let d=0;for(const id of HABIT_IDS)if(S.habits[id].completions[dk])d++;return d/HABIT_IDS.length;}
function processDay(dk){const rate=completionRate(dk),ep=emberProtection();if(rate>=0.7){S.player.emberDays++;S.player.ember=Math.min(1.5,1.0+S.player.emberDays*0.05);}else if(rate<0.5){const drain=S.boss.activePhases.includes('drain')?2:0,loss=ep.half?1:2;S.player.emberDays=Math.max(0,S.player.emberDays-loss-drain);S.player.ember=Math.max(ep.floor,1.0+S.player.emberDays*0.05);}if(S.weaponState.weaponArtDaysLeft>0)S.weaponState.weaponArtDaysLeft--;S.weaponState.doubleUsedToday=false;S.weaponState.doubleHabitToday=null;for(const id of HABIT_IDS){const h=S.habits[id];if(h.completions[dk]){h.streak++;h.longestStreak=Math.max(h.longestStreak,h.streak);if(h.streak%5===0){S.inventory.materials.aschenglut++;S.pendingNotifs.push({type:'loot',text:`🔥 ${HABIT_CFG[id].name} ${h.streak}-day streak! +1 Aschenglut`});}if(h.streak%10===0){S.inventory.materials.kohle++;S.pendingNotifs.push({type:'loot',text:`⬛ ${HABIT_CFG[id].name} ${h.streak}-day streak! +1 Glühende Kohle`});}}else{if(id==='progressive')h.dayCount=0;h.streak=0;}}if(S.boss.currentHp!==null){const bc=currentBossConfig();if(rate<0.5){const m=S.boss.activePhases.includes('enrage')?2:1,h=Math.round(S.boss.maxHp*0.05*m);S.boss.currentHp=Math.min(S.boss.maxHp,S.boss.currentHp+h);logBoss('heal',`${bc.name} heals ${h} HP...`);}else if(S.boss.activePhases.includes('regen')){const h=Math.round(S.boss.maxHp*0.02);S.boss.currentHp=Math.min(S.boss.maxHp,S.boss.currentHp+h);logBoss('heal',`Regen +${h} HP.`);}const dif=S.boss.weekStart?daysBetween(S.boss.weekStart,dk):0;if(dif>=6)endBossWeek();}processQuestDeadlines();}
function processMissedDays(){const tk=today();if(!S.lastProcessed){S.lastProcessed=tk;if(S.boss.currentHp===null)startBoss(tk);return;}if(S.lastProcessed===tk)return;let cursor=addDays(S.lastProcessed,1);while(cursor<tk){if(S.boss.currentHp===null)startBoss(cursor);processDay(cursor);cursor=addDays(cursor,1);}if(S.boss.currentHp===null)startBoss(tk);S.lastProcessed=tk;}

function completeHabit(habitId,amount){const tk=today(),h=S.habits[habitId],cfg=HABIT_CFG[habitId];if(h.completions[tk]){showToast('Already completed today!','warn');return;}let dayCount=null;if(cfg.isProgressive){h.dayCount++;dayCount=h.dayCount;amount=1;}const baseXpMap=cfg.xpFn(amount,dayCount);const raw=Object.values(baseXpMap).reduce((s,v)=>s+v,0);const baseDmg=Math.round(raw*S.player.ember*(1+S.attributes[cfg.primaryAttr].level*0.03));const{xpMap,damage,msg:wMsg}=applyWeaponEffect(habitId,baseXpMap,baseDmg);h.completions[tk]={amount:cfg.isProgressive?dayCount:amount,xp:xpMap,damage};const lus=grantXP(xpMap);dealDamage(damage,cfg.name);if(S.boss.weekStart){const dif=daysBetween(S.boss.weekStart,tk);for(const e of S.boss.basicEnemies){if(!e.defeated&&e.day===dif&&e.habitId===habitId){e.defeated=true;applyLoot(e.loot);const mn=Object.keys(e.loot)[0],ma=Object.values(e.loot)[0];logBoss('loot',`⚔ Hollow slain! +${ma}× ${MATERIALS[mn].name}`);S.pendingNotifs.push({type:'loot',text:`⚔ Hollow slain! +${ma}× ${MATERIALS[mn].name}`});}}}save();const xpStr=Object.entries(xpMap).filter(([,v])=>v>0).map(([k,v])=>`+${Math.round(v*S.player.ember*(1+getArmorXpBonus(k)))} ${ATTR_CFG[k].name}`).join(' · ');showToast(`${cfg.icon} ${xpStr} | ⚔ −${damage} HP`+(wMsg?` | ${wMsg}`:''),'success');lus.forEach(lu=>pendingLUs.push(lu));if(!luShowing)showNextLU();checkTitles();renderAll();}

function checkTitles(){for(const td of TITLE_DEFS){if(!S.titles.earned.includes(td.id)&&td.check(S)){S.titles.earned.push(td.id);S.pendingNotifs.push({type:'loot',text:`🏆 Title unlocked: "${td.name}"`});if(!S.titles.active)S.titles.active=td.id;}}}
function setActiveTitle(id){S.titles.active=id;save();renderStats();showToast(`Title: "${TITLE_DEFS.find(t=>t.id===id)?.name}"`);}

const pendingLUs=[];let luShowing=false;
function showNextLU(){if(!pendingLUs.length){luShowing=false;return;}luShowing=true;const{attr,newLevel}=pendingLUs.shift();const cfg=ATTR_CFG[attr],quotes=LEVEL_QUOTES[attr];document.getElementById('lu-attr').textContent=`${cfg.icon}  ${cfg.name}`;document.getElementById('lu-attr').style.color=cfg.color;document.getElementById('lu-level').textContent=`Level ${newLevel}`;document.getElementById('lu-level').style.color=cfg.color;document.getElementById('lu-quote').textContent=`"${quotes[newLevel%quotes.length]}"`;document.getElementById('levelup-overlay').classList.remove('hidden');}
function closeLevelUp(){document.getElementById('levelup-overlay').classList.add('hidden');luShowing=false;setTimeout(showNextLU,300);}
let toastTimer=null;
function showToast(msg,type='info'){const el=document.getElementById('toast');el.textContent=msg;el.className=`toast ${type} show`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}

let activeTab='habits';
function switchTab(tab){activeTab=tab;document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${tab}`));renderTab(tab);}
function renderAll(){renderRealm();renderTab(activeTab);}
function renderTab(t){switch(t){case'habits':renderHabits();break;case'quests':renderQuests();break;case'boss':renderBoss();break;case'stats':renderStats();break;case'inventory':renderInventory();break;}}

// ── AVATAR SVG ────────────────────────────────────────────────
function renderAvatarSVG(){
  const eq=S.inventory.equipped;
  const gSlot=slot=>eq[slot]?S.inventory.armor.find(a=>a.instanceId===eq[slot]):null;
  const gWpn=()=>eq.weapon?S.inventory.weapons.find(w=>w.instanceId===eq.weapon):null;
  const H=gSlot('head'),C=gSlot('chest'),A=gSlot('hands'),L=gSlot('legs'),W=gWpn();
  const rc=(item,fb='#4a4a5a')=>item?RARITY_CFG[item.rarity].color:fb;
  const hc=rc(H,'#3a3a4a'),cc=rc(C,'#3a3a4a'),ac=rc(A,'#2e2e3e'),lc=rc(L,'#2e2e3e'),wc=W?RARITY_CFG[W.rarity].color:'#888888';
  const allEq=[H,C,A,L,W].filter(Boolean);
  const topR=allEq.reduce((best,item)=>RARITY_ORDER.indexOf(item.rarity)>RARITY_ORDER.indexOf(best)?item.rarity:best,'common');
  const glow=['epic','legendary','mythic'].includes(topR);
  const glowC=glow?RARITY_CFG[topR].color:'#c07020';
  const mythic=topR==='mythic',legendary=topR==='legendary'||mythic;
  const uid=Math.random().toString(36).slice(2,8);
  const fid=`f${uid}`;
  const hasHelm=!!H, hasChest=!!C, hasArms=!!A, hasLegs=!!L, hasWpn=!!W;
  const rareHelm=H&&['epic','legendary','mythic'].includes(H.rarity);
  const rareChest=C&&['epic','legendary','mythic'].includes(C.rarity);
  const glowFilter=glow?`filter="url(#${fid})"`:'' ;

  return `<svg width="160" height="270" viewBox="0 0 160 270" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
<defs>
  <linearGradient id="g_h_${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#080808" stop-opacity=".95"/><stop offset="45%" stop-color="${hc}"/><stop offset="100%" stop-color="#060606" stop-opacity=".9"/></linearGradient>
  <linearGradient id="g_c_${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#080808" stop-opacity=".95"/><stop offset="40%" stop-color="${cc}"/><stop offset="100%" stop-color="#050505" stop-opacity=".9"/></linearGradient>
  <linearGradient id="g_l_${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#090909"/><stop offset="50%" stop-color="${lc}"/><stop offset="100%" stop-color="#090909"/></linearGradient>
  <linearGradient id="g_aL_${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${ac}"/><stop offset="70%" stop-color="${ac}bb"/><stop offset="100%" stop-color="#111"/></linearGradient>
  <linearGradient id="g_aR_${uid}" x1="1" y1="0" x2="0" y2="0"><stop offset="0%" stop-color="${ac}"/><stop offset="70%" stop-color="${ac}bb"/><stop offset="100%" stop-color="#111"/></linearGradient>
  <linearGradient id="g_v_${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity=".13"/><stop offset="100%" stop-color="#000" stop-opacity=".4"/></linearGradient>
  <linearGradient id="g_sk_${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d4956a"/><stop offset="100%" stop-color="#8a5535"/></linearGradient>
  <linearGradient id="g_w_${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#111"/><stop offset="40%" stop-color="${wc}"/><stop offset="100%" stop-color="#333"/></linearGradient>
  <linearGradient id="g_cape_${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${glowC}" stop-opacity=".75"/><stop offset="100%" stop-color="${glowC}" stop-opacity=".04"/></linearGradient>
  ${glow?`<filter id="${fid}" x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="0" stdDeviation="${mythic?16:9}" flood-color="${glowC}" flood-opacity="${mythic?.9:.65}"/>${mythic?`<feDropShadow dx="0" dy="0" stdDeviation="28" flood-color="${glowC}" flood-opacity=".35"/>`:''}
  </filter>`:''}
</defs>

<!-- Ground shadow -->
<ellipse cx="80" cy="263" rx="40" ry="6" fill="#000" opacity=".5"/>

<!-- Cape (legendary+) -->
${legendary?`<path d="M52,86 Q28,125 20,198 Q28,212 48,216 Q58,158 80,153 Q102,158 112,216 Q132,212 140,198 Q132,125 108,86 Z" fill="url(#g_cape_${uid})" opacity=".65"/>`:'' }

<!-- LEGS -->
<path d="M54,155 L50,155 Q40,160 38,182 L38,218 L57,218 L59,182 Z" fill="url(#g_l_${uid})"/>
<path d="M106,155 L110,155 Q120,160 122,182 L122,218 L103,218 L101,182 Z" fill="url(#g_l_${uid})"/>
<path d="M54,155 L50,155 Q40,160 38,182 L38,218 L57,218 L59,182 Z" fill="url(#g_v_${uid})" opacity=".35"/>
<path d="M106,155 L110,155 Q120,160 122,182 L122,218 L103,218 L101,182 Z" fill="url(#g_v_${uid})" opacity=".35"/>
<!-- Kneecaps -->
<ellipse cx="47" cy="195" rx="10" ry="7" fill="${lc}" opacity=".9"/>
<ellipse cx="113" cy="195" rx="10" ry="7" fill="${lc}" opacity=".9"/>
<ellipse cx="47" cy="195" rx="10" ry="7" fill="url(#g_v_${uid})" opacity=".5"/>
<ellipse cx="113" cy="195" rx="10" ry="7" fill="url(#g_v_${uid})" opacity=".5"/>
<path d="M41,194 Q47,190 53,194" stroke="${hc}88" stroke-width="1" fill="none"/>
<path d="M107,194 Q113,190 119,194" stroke="${hc}88" stroke-width="1" fill="none"/>
<!-- Shins -->
<path d="M38,218 Q36,243 38,256 L57,256 Q59,243 57,218 Z" fill="url(#g_l_${uid})"/>
<path d="M122,218 Q124,243 122,256 L103,256 Q101,243 103,218 Z" fill="url(#g_l_${uid})"/>
<line x1="41" y1="222" x2="41" y2="251" stroke="${lc}77" stroke-width="1.5"/>
<line x1="119" y1="222" x2="119" y2="251" stroke="${lc}77" stroke-width="1.5"/>
<!-- Boots -->
<path d="M34,253 Q32,264 33,268 L61,268 Q63,260 57,256 Z" fill="${lc}"/>
<path d="M126,253 Q128,264 127,268 L99,268 Q97,260 103,256 Z" fill="${lc}"/>
<line x1="34" y1="261" x2="60" y2="261" stroke="${lc}55" stroke-width="1"/>
<line x1="126" y1="261" x2="100" y2="261" stroke="${lc}55" stroke-width="1"/>

<!-- Belt -->
<path d="M50,149 L110,149 L113,160 L47,160 Z" fill="#18100a"/>
<path d="M50,149 L110,149 L110,154 L50,154 Z" fill="${cc}55"/>
<rect x="72" y="150" width="16" height="10" rx="2" fill="#b89020" opacity=".9"/>
<rect x="75" y="152" width="10" height="6" rx="1" fill="#7a5c10"/>

<!-- CHEST -->
<path d="M47,87 L52,85 L80,82 L108,85 L113,87 L116,149 L44,149 Z" fill="url(#g_c_${uid})"/>
<path d="M47,87 L52,85 L80,82 L108,85 L113,87 L116,149 L44,149 Z" fill="url(#g_v_${uid})" opacity=".38"/>
<!-- Chest center line -->
<line x1="80" y1="85" x2="80" y2="148" stroke="${cc}44" stroke-width="1.5"/>
<!-- Chest plate etchings -->
<path d="M52,105 Q80,101 108,105" stroke="${cc}55" stroke-width="1" fill="none"/>
<path d="M50,122 Q80,118 110,122" stroke="${cc}44" stroke-width="1" fill="none"/>
<path d="M50,137 Q80,133 110,137" stroke="${cc}33" stroke-width="1" fill="none"/>
${rareChest?`<ellipse cx="80" cy="113" rx="7" ry="9" fill="${cc}" opacity=".85"/>
<ellipse cx="80" cy="113" rx="4.5" ry="6" fill="${cc}dd" opacity=".7"/>
<ellipse cx="80" cy="113" rx="2" ry="3" fill="#fff" opacity=".35"/>`:''}

<!-- RIGHT ARM (left in scene) -->
<path d="M47,87 L30,97 L26,137 L40,146 L47,122 Z" fill="url(#g_aL_${uid})"/>
<path d="M47,87 L30,97 L26,137 L40,146 L47,122 Z" fill="url(#g_v_${uid})" opacity=".28"/>
<path d="M40,143 L23,136 L20,160 L39,163 Z" fill="url(#g_aL_${uid})"/>
<line x1="36" y1="150" x2="24" y2="146" stroke="${ac}66" stroke-width="1"/>
<ellipse cx="22" cy="163" rx="7" ry="5" fill="url(#g_sk_${uid})"/>

<!-- LEFT ARM (right in scene, weapon hand) -->
<path d="M113,87 L130,97 L134,137 L120,146 L113,122 Z" fill="url(#g_aR_${uid})"/>
<path d="M113,87 L130,97 L134,137 L120,146 L113,122 Z" fill="url(#g_v_${uid})" opacity=".28"/>
<path d="M120,143 L137,136 L140,160 L121,163 Z" fill="url(#g_aR_${uid})"/>
<line x1="124" y1="150" x2="136" y2="146" stroke="${ac}66" stroke-width="1"/>
<ellipse cx="138" cy="163" rx="7" ry="5" fill="url(#g_sk_${uid})"/>

<!-- PAULDRONS -->
<path d="M47,87 Q30,79 24,88 Q20,98 27,109 Q35,115 47,110 Z" fill="url(#g_h_${uid})"/>
<path d="M47,87 Q30,79 24,88 Q20,98 27,109 Q35,115 47,110 Z" fill="url(#g_v_${uid})" opacity=".4"/>
<path d="M113,87 Q130,79 136,88 Q140,98 133,109 Q125,115 113,110 Z" fill="url(#g_h_${uid})"/>
<path d="M113,87 Q130,79 136,88 Q140,98 133,109 Q125,115 113,110 Z" fill="url(#g_v_${uid})" opacity=".4"/>
<path d="M27,93 Q36,88 46,91" stroke="${hc}55" stroke-width="1" fill="none"/>
<path d="M133,93 Q124,88 114,91" stroke="${hc}55" stroke-width="1" fill="none"/>
${rareHelm?`<path d="M24,88 L16,74 L28,86" fill="${hc}" opacity=".85"/>
<path d="M136,88 L144,74 L132,86" fill="${hc}" opacity=".85"/>`:''}

<!-- NECK -->
<rect x="73" y="63" width="14" height="21" rx="3" fill="url(#g_sk_${uid})"/>

<!-- HEAD / HELMET -->
${hasHelm?`
<ellipse cx="80" cy="50" rx="27" ry="29" fill="${hc}" opacity=".92"/>
<path d="M55,40 Q57,18 80,16 Q103,18 105,40 L105,63 Q103,71 80,73 Q57,71 55,63 Z" fill="url(#g_h_${uid})"/>
<path d="M55,40 Q57,18 80,16 Q103,18 105,40 L105,63 Q103,71 80,73 Q57,71 55,63 Z" fill="url(#g_v_${uid})" opacity=".32"/>
<path d="M59,45 L101,45 L101,54 L59,54 Z" fill="#000" opacity=".95"/>
<path d="M71,16 Q80,6 89,16" stroke="${hc}" stroke-width="3.5" fill="none" opacity=".8"/>
<path d="M56,47 Q52,55 54,65 L60,67 L60,47 Z" fill="url(#g_h_${uid})" opacity=".88"/>
<path d="M104,47 Q108,55 106,65 L100,67 L100,47 Z" fill="url(#g_h_${uid})" opacity=".88"/>
${rareHelm?`<line x1="62" y1="49" x2="98" y2="49" stroke="${hc}cc" stroke-width="1.5" opacity=".9"/>
<rect x="59" y="44" width="42" height="11" fill="${hc}" opacity=".25"/>`:
`<line x1="62" y1="49" x2="98" y2="49" stroke="${hc}44" stroke-width="1" opacity=".5"/>`}
`:`
<!-- BARE HEAD -->
<ellipse cx="80" cy="46" rx="22" ry="25" fill="url(#g_sk_${uid})"/>
<path d="M58,37 Q60,15 80,13 Q100,15 102,37 Q96,26 80,24 Q64,26 58,37 Z" fill="#1a0e07"/>
<ellipse cx="71" cy="43" rx="4.5" ry="3.5" fill="#14100a"/>
<ellipse cx="89" cy="43" rx="4.5" ry="3.5" fill="#14100a"/>
<ellipse cx="70.5" cy="42.5" rx="2.2" ry="2" fill="#1e1408"/>
<ellipse cx="88.5" cy="42.5" rx="2.2" ry="2" fill="#1e1408"/>
<path d="M77,51 L75,57 L85,57" stroke="#8a5535" stroke-width="1" fill="none" opacity=".55"/>
<path d="M73,61 Q80,65 87,61" stroke="#5a3018" stroke-width="1.5" fill="none"/>
<path d="M66,50 L73,57" stroke="#5a3018" stroke-width="1" opacity=".35"/>
`}

<!-- WEAPON -->
${hasWpn?`<g ${glowFilter}>
  <rect x="146" y="16" width="6" height="145" rx="2.5" fill="url(#g_w_${uid})"/>
  <rect x="132" y="88" width="34" height="7" rx="2" fill="${wc}99"/>
  <rect x="133" y="89" width="32" height="5" rx="1.5" fill="${wc}cc"/>
  <rect x="147" y="95" width="4" height="30" rx="1.5" fill="#241408"/>
  <ellipse cx="149" cy="129" rx="7" ry="6" fill="${wc}cc"/>
  <line x1="149" y1="18" x2="149" y2="87" stroke="${wc}99" stroke-width="1.5" opacity=".6"/>
  ${W&&['legendary','mythic'].includes(W.rarity)?`
  <line x1="149" y1="30" x2="151" y2="42" stroke="${glowC}" stroke-width="1" opacity=".85"/>
  <line x1="149" y1="50" x2="147" y2="62" stroke="${glowC}" stroke-width="1" opacity=".8"/>
  <line x1="149" y1="68" x2="151" y2="78" stroke="${glowC}" stroke-width="1" opacity=".75"/>`:''}
</g>`:`<rect x="147" y="28" width="3.5" height="95" rx="1.5" fill="#38383a" opacity=".55"/>
<rect x="140" y="82" width="17" height="4" rx="1" fill="#28283a" opacity=".5"/>`}

<!-- Body glow aura (epic+) -->
${glow?`<ellipse cx="80" cy="155" rx="48" ry="85" fill="${glowC}" opacity=".06" ${glowFilter}/>`:'' }

<!-- Ground ember -->
<ellipse cx="80" cy="262" rx="33" ry="5" fill="${glowC}" opacity="${glow?.28:.1}"/>
</svg>`;
}

// ── REALM HEADER ──────────────────────────────────────────────
function renderRealm(){
  const tk=today(),sl=soulLevel(),ember=S.player.ember,pct=((ember-1.0)/0.5)*100;
  let done=0;for(const id of HABIT_IDS)if(S.habits[id].completions[tk])done++;
  const bc=currentBossConfig(),hpPct=S.boss.currentHp!==null?(S.boss.currentHp/S.boss.maxHp*100):0;
  const wkDay=S.boss.weekStart?daysBetween(S.boss.weekStart,tk):0,daysLeft=Math.max(0,7-wkDay);
  const at=S.titles.active?TITLE_DEFS.find(t=>t.id===S.titles.active):null;
  document.getElementById('realm-header').innerHTML=`
  <div class="realm-inner">
    <div class="realm-left">
      <div class="realm-sl">SL ${sl}</div>
      <div class="realm-name">${S.player.name}</div>
      ${at?`<div class="realm-title">"${at.name}"</div>`:''}
      <div class="realm-habits">${HABIT_IDS.map(id=>`<span class="rh-dot ${S.habits[id].completions[tk]?'done':''}">${HABIT_CFG[id].icon}</span>`).join('')}</div>
    </div>
    <div class="realm-mid">
      <div class="realm-ember-lbl">Ember</div>
      <div class="realm-ember-val">${ember.toFixed(2)}×</div>
      <div class="realm-ebar"><div class="realm-efill" style="width:${pct}%"></div></div>
    </div>
    ${S.boss.currentHp!==null?`
    <div class="realm-right" onclick="switchTab('boss')" style="cursor:pointer">
      <div class="realm-boss-name">${bc.name.split(',')[0]}</div>
      <div class="realm-boss-hp-bar"><div class="realm-boss-hp-fill" style="width:${hpPct}%"></div></div>
      <div class="realm-boss-days ${daysLeft<=2?'urgent':''}">${daysLeft}d left</div>
    </div>`:`<div class="realm-right" style="text-align:center;color:var(--text3);font-size:11px"><div style="font-size:18px">🕯</div><div>Bonfire</div></div>`}
    <button class="settings-cog" style="position:static;margin-left:6px" onclick="openSettings()">⚙</button>
  </div>`;
  if(S.pendingNotifs.length){const n=S.pendingNotifs.shift();setTimeout(()=>showToast(n.text,n.type),400);save();}
}

// ── RENDER: HABITS ────────────────────────────────────────────
function renderHabits(){
  const tk=today(),wpn=equippedWeapon(),tpl=weaponTpl(wpn);
  const hasArt=tpl?.effect==='weapon_art',hasDbl=tpl?.effect==='double';
  let ab='';
  if(hasArt){const used=S.weaponState.weaponArtLastWeek===getWeekKey(),active=S.weaponState.weaponArtDaysLeft>0;ab=`<div class="card" style="margin-bottom:12px"><div class="card-label">Weapon Art · ${wpn.name}</div><div style="font-size:13px;color:var(--text2);margin-bottom:8px">${tpl.effectDesc}</div>${active?`<div style="color:var(--ember2);font-size:13px">🌟 Active: ${S.weaponState.weaponArtDaysLeft} days remaining</div>`:`<button class="btn-secondary" onclick="activateWeaponArt()" ${used?'disabled style="opacity:.4"':''}>Activate${used?' (used)':''}</button>`}</div>`;}
  const items=HABIT_IDS.map(id=>{const h=S.habits[id],cfg=HABIT_CFG[id],done=!!h.completions[tk],comp=h.completions[tk],attr=ATTR_CFG[cfg.primaryAttr];const goal=cfg.isProgressive?`Day ${h.dayCount+(done?0:1)} — ${h.dayCount+(done?0:1)} reps each`:`Goal: ${h.target} ${cfg.unit}`;const isDbl=hasDbl&&S.weaponState.doubleHabitToday===id&&!done;return`<div class="habit-item ${done?'done':''}"><div class="habit-main"><div class="habit-ico">${cfg.icon}</div><div class="habit-body"><div class="habit-name">${cfg.name}${isDbl?` <span style="color:var(--ember2);font-size:11px">⚡ 2×</span>`:''}</div><div class="habit-sub"><span style="color:${attr.color}">${attr.icon} ${attr.name}</span> · ${goal}</div><div class="habit-streak-row"><span>🔥 ${h.streak}-day streak</span>${h.longestStreak>0?`<span class="habit-streak-best">Best: ${h.longestStreak}</span>`:''}</div>${done?`<div class="habit-done-info">✓ ${cfg.isProgressive?comp.amount+'× reps':comp.amount+' '+cfg.unit} · ⚔ ${comp.damage} dmg</div>`:''}</div>${!done?`<button class="btn-complete" onclick="openHabitModal('${id}')">Complete</button>`:`<div class="check-mark">✓</div>`}</div></div>`;}).join('');
  document.getElementById('tab-habits').innerHTML=`${ab}<div class="section-title">Daily Habits</div><div class="habits-list">${items}</div>`;
}

let _cHabit=null;
function openHabitModal(habitId){
  _cHabit=habitId;const cfg=HABIT_CFG[habitId],h=S.habits[habitId],attrLv=S.attributes[cfg.primaryAttr].level;
  let content='';
  if(cfg.isProgressive){const nd=h.dayCount+1,xpMap=cfg.xpFn(1,nd);const xpStr=Object.entries(xpMap).map(([k,v])=>`+${Math.round(v*S.player.ember)} ${ATTR_CFG[k].name}`).join(' · ');const dmg=Math.round(Object.values(xpMap).reduce((s,v)=>s+v,0)*S.player.ember*(1+attrLv*0.03));content=`<div class="modal-title">${cfg.icon} ${cfg.name}</div><div class="modal-desc">${cfg.desc}</div><div class="modal-day-info"><div class="modal-day-num">Day ${nd}</div><div class="modal-day-reps">${nd}× Push-ups · ${nd}× Sit-ups · ${nd}× Squats</div></div><div class="modal-preview">${xpStr} · ⚔ ~${dmg}</div><div class="modal-btns"><button class="btn-primary" onclick="doComplete('${habitId}',1)">Done! ⚔</button><button class="btn-ghost" onclick="closeHabitModal()">Cancel</button></div>`;}
  else{content=`<div class="modal-title">${cfg.icon} ${cfg.name}</div><div class="modal-desc">${cfg.desc}</div><label class="modal-input-lbl">How many ${cfg.unit}?</label><input id="h-amount" class="modal-input" type="number" value="${h.target}" min="1" oninput="refreshPreview()"><div class="modal-preview" id="h-preview">…</div><div class="modal-btns"><button class="btn-primary" onclick="doCompleteFromInput('${habitId}')">Complete ⚔</button><button class="btn-ghost" onclick="closeHabitModal()">Cancel</button></div>`;}
  document.getElementById('habit-modal-box').innerHTML=content;document.getElementById('habit-overlay').classList.remove('hidden');if(!cfg.isProgressive)setTimeout(refreshPreview,10);
}
function refreshPreview(){const id=_cHabit;if(!id)return;const cfg=HABIT_CFG[id],attrLv=S.attributes[cfg.primaryAttr].level;const el=document.getElementById('h-amount');if(!el)return;const amt=Math.max(1,parseInt(el.value)||1),xpMap=cfg.xpFn(amt),raw=Object.values(xpMap).reduce((s,v)=>s+v,0);const dmg=Math.round(raw*S.player.ember*(1+attrLv*0.03));const xpStr=Object.entries(xpMap).filter(([,v])=>v>0).map(([k,v])=>`+${Math.round(v*S.player.ember)} ${ATTR_CFG[k].name}`).join(' · ');const pv=document.getElementById('h-preview');if(pv)pv.textContent=`${xpStr} · ⚔ ~${dmg}`;}
function doCompleteFromInput(id){const el=document.getElementById('h-amount');closeHabitModal();completeHabit(id,Math.max(1,parseInt(el?.value)||1));}
function doComplete(id,amt){closeHabitModal();completeHabit(id,amt);}
function closeHabitModal(){document.getElementById('habit-overlay').classList.add('hidden');_cHabit=null;}

// ── RENDER: BOSS ──────────────────────────────────────────────
function renderBoss(){
  const bc=currentBossConfig(),tk=today();
  const wkDay=S.boss.weekStart?daysBetween(S.boss.weekStart,tk):0,daysLeft=Math.max(0,7-wkDay);
  const hpPct=S.boss.currentHp!==null?(S.boss.currentHp/S.boss.maxHp*100):0;
  if(S.boss.currentHp===null){const hist=S.boss.history.slice(0,6).map(h=>`<div class="history-row ${h.won?'victory':'defeat'}"><span>${h.name}</span><span>${h.won?'⚔ Victory':'💀 Defeat'}</span></div>`).join('')||'<div style="color:var(--text3);font-size:13px">No battles yet.</div>';document.getElementById('tab-boss').innerHTML=`<div class="boss-waiting"><div class="boss-waiting-ico">🕯</div><h2>Resting at the Bonfire</h2><p>A new adversary will appear soon.</p></div><div class="card"><div class="card-label">Battle History</div>${hist}</div>`;return;}
  const markers=S.boss.phaseEffects.map((_,i)=>{const t=(1-(i+1)/(S.boss.phaseEffects.length+1))*100;return`<div style="position:absolute;left:${t}%;top:-4px;width:2px;height:calc(100%+8px);background:${S.boss.triggeredCount>i?'#55555588':'#c8a04088'};transform:translateX(-50%);z-index:2"></div>`;}).join('');
  const phasesHtml=S.boss.activePhases.map(id=>{const ph=PHASE_POOL.find(p=>p.id===id);return`<div class="phase-card"><strong>${ph.icon} ${ph.name}</strong> ${ph.desc}</div>`;}).join('');
  const enemiesHtml=S.boss.basicEnemies.map(e=>`<div class="enemy-row ${e.defeated?'defeated':''}"><span>${e.defeated?'☠ Hollow (defeated)':'⚔ Hollow — '+HABIT_CFG[e.habitId].name+' on day '+e.day}</span><span style="color:var(--gold)">${e.defeated?'+loot':MATERIALS[Object.keys(e.loot)[0]].icon}</span></div>`).join('');
  const logHtml=[...S.boss.log].reverse().slice(0,25).map(e=>{const cls={hit:'log-hit',heal:'log-heal',phase:'log-phase',appear:'log-appear',victory:'log-victory',defeat:'log-defeat',loot:'log-loot'}[e.type]||'';return`<div class="log-entry ${cls}">${e.date} · ${e.text}</div>`;}).join('');
  const histHtml=S.boss.history.slice(0,5).map(h=>`<div class="history-row ${h.won?'victory':'defeat'}"><span>${h.name}</span><span>${h.won?'⚔ Victory':'💀 Defeat'}</span></div>`).join('')||'<div style="color:var(--text3);font-size:13px">No previous battles.</div>';
  document.getElementById('tab-boss').innerHTML=`
  <div class="boss-portrait t${bc.tier}"><div class="boss-bg-glow"></div><div class="boss-sil">${BOSS_ICONS[bc.tier]}</div></div>
  <div class="boss-info-row"><div><div class="boss-game-tag">${bc.game}</div><div class="boss-name-big">${bc.name}</div></div><div class="boss-tier-stars">${'★'.repeat(bc.tier)}${'☆'.repeat(5-bc.tier)}</div></div>
  <div class="boss-meta"><div class="boss-meta-stat"><div class="boss-meta-val ${daysLeft<=2?'urgent':''}">${daysLeft}</div><div class="boss-meta-lbl">Days Left</div></div><div class="boss-meta-stat"><div class="boss-meta-val">${Math.round(hpPct)}%</div><div class="boss-meta-lbl">HP Remaining</div></div><div class="boss-meta-stat"><div class="boss-meta-val">${S.boss.activePhases.length}/${S.boss.phaseEffects.length}</div><div class="boss-meta-lbl">Phases</div></div></div>
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
  const titlesHtml=S.titles.earned.map(id=>{const td=TITLE_DEFS.find(t=>t.id===id);return td?`<div class="title-row ${S.titles.active===id?'title-active':''}" onclick="setActiveTitle('${id}')"><span class="title-name">${td.name}</span><span class="title-desc">${td.desc}</span></div>`:'' ;}).join('');
  const achHtml=TITLE_DEFS.map(td=>{const e=S.titles.earned.includes(td.id);return`<div class="ach-row ${e?'earned':'locked'}"><span>${e?'🏆':'🔒'}</span><div><div class="ach-name">${e||!td.hidden?td.name:'???'}</div><div class="ach-desc">${e||!td.hidden?td.desc:'A hidden achievement — keep playing.'}</div></div></div>`;}).join('');
  document.getElementById('tab-stats').innerHTML=`<div class="stats-hero"><div class="sl-label">SOUL LEVEL</div><div class="sl-big">${sl}</div><div class="ember-detail">⚡ Ember ${ember.toFixed(2)}× (${S.player.emberDays} ember days)</div></div><div class="attrs-grid">${attrsHtml}</div>${S.titles.earned.length?`<div class="card" style="margin-top:12px"><div class="card-label">Titles — tap to equip</div>${titlesHtml}</div>`:''}<div class="card" style="margin-top:12px"><div class="card-label">Achievements</div>${achHtml}</div>`;
}

// ── RENDER: INVENTORY ─────────────────────────────────────────
function renderInventory(){
  const eq=S.inventory.equipped;
  const SLOTS=[['head','Head'],['chest','Chest'],['hands','Hands'],['legs','Legs'],['weapon','Weapon']];
  const slotRows=SLOTS.map(([slot,label])=>{const id=eq[slot];let item=null;if(id&&slot==='weapon')item=S.inventory.weapons.find(w=>w.instanceId===id);else if(id)item=S.inventory.armor.find(a=>a.instanceId===id);const rc=item?RARITY_CFG[item.rarity].color:'#3a3020';return`<div class="equip-slot-row"><span class="equip-slot-lbl">${label}</span><div class="equip-slot-item ${item?'has-item':'empty-slot'}" style="border-color:${rc}44"><span style="color:${rc};font-size:12px">${item?item.name:'— empty —'}</span>${item?`<button class="slot-unequip" onclick="unequipSlot('${slot}')">✕</button>`:''}</div></div>`;}).join('');
  const sc=setCounts();
  const setsHtml=Object.entries(sc).filter(([,c])=>c>=2).map(([sid,count])=>{const sb=SET_BONUSES[sid];if(!sb)return'';const b=[];if(sb[2])b.push(`<span class="${count>=2?'bonus-active':'bonus-inactive'}">(2) ${sb[2].desc}</span>`);if(sb[4])b.push(`<span class="${count>=4?'bonus-active':'bonus-inactive'}">(4) ${sb[4].desc}</span>`);return`<div class="set-bonus-row"><strong>${SET_NAMES[sid]||sid}</strong> (${count}/4) ${b.join(' ')}</div>`;}).join('');
  const wpnHtml=S.inventory.weapons.map(w=>{const tpl=WEAPON_TEMPLATES.find(t=>t.id===w.templateId),rc=RARITY_CFG[w.rarity].color,isEq=eq.weapon===w.instanceId;return`<div class="item-card ${isEq?'item-equipped':''}"><div class="item-rarity-bar" style="background:${rc}"></div><div class="item-body"><div class="item-name" style="color:${rc}">${w.name}</div><div class="item-sub">${tpl?.game||''} · <span style="color:${rc}">${RARITY_CFG[w.rarity].name}</span></div>${tpl?`<div class="item-effect">⚡ ${tpl.effectName}: ${tpl.effectDesc}</div>`:''}</div><button class="btn-equip ${isEq?'btn-unequip':''}" onclick="${isEq?`unequipSlot('weapon')`:`equipItem('weapon','${w.instanceId}')`}">${isEq?'Unequip':'Equip'}</button></div>`;}).join('')||`<div style="color:var(--text3);font-size:13px;padding:8px 0">Defeat bosses to obtain weapons.</div>`;
  const armorBySlot={head:[],chest:[],hands:[],legs:[]};for(const a of S.inventory.armor){if(armorBySlot[a.slot])armorBySlot[a.slot].push(a);}
  const armorHtml=Object.entries(armorBySlot).map(([slot,items])=>{if(!items.length)return'';const rows=items.map(a=>{const tpl=ARMOR_TEMPLATES.find(t=>t.id===a.templateId),rc=RARITY_CFG[a.rarity].color,isEq=eq[slot]===a.instanceId;const bonStr=tpl?Object.entries(tpl.bonus).map(([k,v])=>`+${Math.round(v*100)}% ${ATTR_CFG[k]?.name||k}`).join(' · '):'';return`<div class="item-card ${isEq?'item-equipped':''}"><div class="item-rarity-bar" style="background:${rc}"></div><div class="item-body"><div class="item-name" style="color:${rc}">${a.name}</div><div class="item-sub"><span style="color:${rc}">${RARITY_CFG[a.rarity].name}</span>${tpl?.setId?` · ${SET_NAMES[tpl.setId]||''}`:''}</div>${bonStr?`<div class="item-effect">${bonStr}</div>`:''}</div><button class="btn-equip ${isEq?'btn-unequip':''}" onclick="${isEq?`unequipSlot('${slot}')`:`equipItem('${slot}','${a.instanceId}')`}">${isEq?'Unequip':'Equip'}</button></div>`;}).join('');return`<div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">${slot.charAt(0).toUpperCase()+slot.slice(1)}</div>${rows}</div>`;}).join('');
  const matsHtml=Object.entries(MATERIALS).map(([id,cfg])=>{const count=S.inventory.materials[id]||0;return`<div class="material-row ${count===0?'empty':''}"><div class="mat-ico">${cfg.icon}</div><div class="mat-body"><div class="mat-name" style="color:${cfg.color}">${cfg.name}</div><div class="mat-tier">Tier ${cfg.tier}</div></div><div class="mat-count ${count>0?'has':''}">${count}</div></div>`;}).join('');
  document.getElementById('tab-inventory').innerHTML=`<div class="equip-grid"><div class="avatar-wrap">${renderAvatarSVG()}</div><div class="equip-slots">${slotRows}</div></div>${setsHtml?`<div class="card"><div class="card-label">Set Bonuses</div>${setsHtml}</div>`:''}<div class="card"><div class="card-label">Weapons (${S.inventory.weapons.length})</div>${wpnHtml}</div>${S.inventory.armor.length?`<div class="card"><div class="card-label">Armor (${S.inventory.armor.length})</div>${armorHtml}</div>`:`<div class="card" style="text-align:center;padding:16px;color:var(--text3)">No armor yet — defeat bosses!</div>`}<div class="card"><div class="card-label">Upgrade Materials</div><div class="materials-list">${matsHtml}</div></div>`;
}

// ── SETTINGS ──────────────────────────────────────────────────
function openSettings(){
  document.getElementById('settings-box').innerHTML=`<div class="settings-title">⚙ Settings</div><div class="settings-field"><label>Player Name</label><input id="s-name" type="text" value="${S.player.name}" maxlength="30"></div><div class="settings-divider"></div><div class="settings-field"><label style="font-size:13px;color:var(--text3);margin-bottom:8px;display:block">Habit Goals</label>${HABIT_IDS.filter(id=>!HABIT_CFG[id].isProgressive).map(id=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="width:22px;font-size:18px">${HABIT_CFG[id].icon}</span><span style="flex:1;font-size:14px">${HABIT_CFG[id].name}</span><input type="number" id="s-${id}" value="${S.habits[id].target}" min="1" style="width:70px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:4px 8px;font-size:14px;text-align:center"><span style="font-size:12px;color:var(--text3)">${HABIT_CFG[id].unit}</span></div>`).join('')}</div><button class="btn-primary" onclick="saveSettings()">Save Changes</button><button class="settings-danger" onclick="resetState()">⚠ Reset All Progress</button><button class="btn-ghost" style="margin-top:8px;width:100%" onclick="closeSettings()">Close</button>`;
  document.getElementById('settings-overlay').classList.remove('hidden');
}
function saveSettings(){const name=document.getElementById('s-name')?.value?.trim();if(name)S.player.name=name;for(const id of HABIT_IDS){if(HABIT_CFG[id].isProgressive)continue;const el=document.getElementById(`s-${id}`);if(el)S.habits[id].target=Math.max(1,parseInt(el.value)||1);}save();closeSettings();renderAll();showToast('Settings saved.','success');}
function closeSettings(){document.getElementById('settings-overlay').classList.add('hidden');}
function resetState(){if(!confirm('DELETE all progress?'))return;['ashen_v3','ashen_v2','ashen_v1'].forEach(k=>localStorage.removeItem(k));S=defaultState();startBoss();save();renderAll();showToast('Darkness reigns anew...','warn');}

// ── INIT ──────────────────────────────────────────────────────
function init(){
  S=loadState()||defaultState();
  processMissedDays();checkTitles();save();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  renderRealm();renderHabits();
}
document.addEventListener('DOMContentLoaded',init);
