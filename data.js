'use strict';
// ============================================================
// ASHEN CHRONICLE — data.js  (game constants)
// ============================================================

const ATTR_CFG = {
  vigor:        { name:'Vigor',        icon:'♥', color:'#d04040', desc:'Health & Vitality' },
  endurance:    { name:'Endurance',    icon:'◈', color:'#40a050', desc:'Stamina & Persistence' },
  strength:     { name:'Strength',     icon:'⚔', color:'#d07030', desc:'Physical Power' },
  dexterity:    { name:'Dexterity',    icon:'✦', color:'#4070d0', desc:'Agility & Flexibility' },
  intelligence: { name:'Intelligence', icon:'✧', color:'#8040d0', desc:'Knowledge & Mind' },
  willpower:    { name:'Willpower',    icon:'◉', color:'#40c0b0', desc:'Mental Discipline' },
  charisma:     { name:'Charisma',     icon:'★', color:'#d0a030', desc:'Social Presence' }
};
const xpNeeded = n => Math.floor(30 * Math.pow(n, 1.75));

const HABIT_CFG = {
  reading:     { id:'reading',     name:'Lesen',                icon:'📖', unit:'Seiten',   defTarget:20, primaryAttr:'intelligence', xpFn:a=>({intelligence:a*1.0}),                         defDPW:7, desc:'Bücher, Artikel, Fachliteratur' },
  running:     { id:'running',     name:'Laufen',               icon:'🏃', unit:'Minuten',  defTarget:30, primaryAttr:'endurance',    xpFn:a=>({endurance:a*0.8,vigor:a*0.2}),                defDPW:5, desc:'Laufen, Joggen, Sprinten' },
  gym:         { id:'gym',         name:'Gym',                  icon:'🏋️', unit:'Minuten',  defTarget:60, primaryAttr:'strength',     xpFn:a=>({strength:a*1.0,vigor:a*0.3}),                 defDPW:4, desc:'Krafttraining, Gewichtheben' },
  stretching:  { id:'stretching',  name:'Stretchen',            icon:'🧘', unit:'Minuten',  defTarget:15, primaryAttr:'dexterity',    xpFn:a=>({dexterity:a*0.8,endurance:a*0.2}),            defDPW:5, desc:'Dehnen, Yoga, Mobilität' },
  journal:     { id:'journal',     name:'Tagebuch',             icon:'📓', unit:'Einträge', defTarget:1,  primaryAttr:'willpower',    xpFn:a=>({willpower:a*20,intelligence:a*5}),             defDPW:6, desc:'Reflexion, Journaling' },
  progressive: { id:'progressive', name:'Progressive Challenge',icon:'⚡', unit:'Runden',   defTarget:1,  primaryAttr:'strength',     xpFn:(a,d)=>({strength:d*0.4,endurance:d*0.25,vigor:d*0.1}), defDPW:7, desc:'Tag N: N× Push-ups + Sit-ups + Squats', isProgressive:true }
};
const HABIT_IDS = ['reading','running','gym','stretching','journal','progressive'];

const BOSSES = [
  {id:'asylum',     name:'Asylum Demon',                   game:'Dark Souls I',   tier:1, maxHp:400},
  {id:'iudex',      name:'Iudex Gundyr',                   game:'Dark Souls III', tier:1, maxHp:650},
  {id:'vordt',      name:'Vordt of the Boreal Valley',     game:'Dark Souls III', tier:2, maxHp:950},
  {id:'dragonrider',name:'Dragon Rider',                   game:'Dark Souls II',  tier:2, maxHp:1100},
  {id:'margit',     name:'Margit, the Fell Omen',          game:'Elden Ring',     tier:2, maxHp:1350},
  {id:'watchers',   name:'Abyss Watchers',                 game:'Dark Souls III', tier:3, maxHp:1950},
  {id:'ape',        name:'Guardian Ape',                   game:'Sekiro',         tier:3, maxHp:2100},
  {id:'godrick',    name:'Godrick the Grafted',            game:'Elden Ring',     tier:3, maxHp:2450},
  {id:'rennala',    name:'Rennala, Queen of the Full Moon',game:'Elden Ring',     tier:3, maxHp:2750},
  {id:'pontiff',    name:'Pontiff Sulyvahn',               game:'Dark Souls III', tier:4, maxHp:3900},
  {id:'twins',      name:'Lothric, Younger Prince',        game:'Dark Souls III', tier:4, maxHp:4300},
  {id:'isshin',     name:'Isshin, the Sword Saint',        game:'Sekiro',         tier:4, maxHp:4900},
  {id:'morgott',    name:'Morgott, the Omen King',         game:'Elden Ring',     tier:4, maxHp:4500},
  {id:'nameless',   name:'Nameless King',                  game:'Dark Souls III', tier:5, maxHp:6800},
  {id:'gael',       name:'Slave Knight Gael',              game:'Dark Souls III', tier:5, maxHp:7800},
  {id:'friede',     name:'Sister Friede',                  game:'Dark Souls III', tier:5, maxHp:8500},
  {id:'malenia',    name:'Malenia, Blade of Miquella',     game:'Elden Ring',     tier:5, maxHp:10500},
  {id:'elden',      name:'Elden Beast',                    game:'Elden Ring',     tier:5, maxHp:13500}
];
const TIER_PHASES = {1:1, 2:1, 3:2, 4:3, 5:4};
const PHASE_POOL = [
  {id:'enrage', name:'ENRAGED',      icon:'🔥', desc:'Missed habits cause double boss healing.'},
  {id:'armor',  name:'ARMORED',      icon:'🛡',  desc:'Your damage is reduced by 25%.'},
  {id:'regen',  name:'REGENERATING', icon:'♥',  desc:'Boss passively heals 2% max HP per day.'},
  {id:'frenzy', name:'FRENZIED',     icon:'⚡',  desc:'Need 90%+ habits daily or suffer a debuff.'},
  {id:'drain',  name:'SOUL DRAIN',   icon:'💀', desc:'Ember decays faster on missed days.'}
];
const BOSS_ICONS = {1:'👤', 2:'🧌', 3:'🐉', 4:'💀', 5:'🌟'};

const RARITY_CFG = {
  common:   {name:'Common',   color:'#9d9d9d', glow:false},
  uncommon: {name:'Uncommon', color:'#1eff00', glow:false},
  rare:     {name:'Rare',     color:'#0070dd', glow:false},
  epic:     {name:'Epic',     color:'#a335ee', glow:true},
  legendary:{name:'Legendary',color:'#ff8000', glow:true},
  mythic:   {name:'Mythic',   color:'#e6cc80', glow:true}
};
const RARITY_ORDER = ['common','uncommon','rare','epic','legendary','mythic'];

const WEAPON_TEMPLATES = [
  {id:'uchigatana',  name:'Uchigatana',            game:'Dark Souls I',   rarity:'uncommon', effect:'bleed',      effectName:'Bleed',         effectDesc:'3-day streak → next completion +60% XP.'},
  {id:'claymore',    name:'Claymore',              game:'Dark Souls',     rarity:'uncommon', effect:'crit',       effectName:'Morning Crit',  effectDesc:'Complete before noon → +50% XP.'},
  {id:'sage_rapier', name:"Crystal Sage's Rapier", game:'Dark Souls III', rarity:'uncommon', effect:'scaling',    effectName:'Int Scaling',   effectDesc:'+1% XP per Intelligence level.'},
  {id:'wingedspear', name:'Winged Spear',          game:'Dark Souls I',   rarity:'rare',     effect:'poison',     effectName:'Poison',        effectDesc:'+15% extra boss damage per completion.'},
  {id:'composite',   name:'Composite Bow',         game:'Dark Souls',     rarity:'rare',     effect:'crit',       effectName:'Sharpshooter',  effectDesc:'Complete before noon → +60% XP.'},
  {id:'ringedsword', name:'Ringed Knight Sword',   game:'Dark Souls III', rarity:'rare',     effect:'bleed',      effectName:'Bleed+',        effectDesc:'3-day streak → next completion +80% XP.'},
  {id:'moonlight',   name:'Moonlight Greatsword',  game:'Dark Souls III', rarity:'epic',     effect:'scaling',    effectName:'Moonlight',     effectDesc:'+1.5% XP per Intelligence level.'},
  {id:'friede_sc',   name:"Friede's Great Scythe", game:'Dark Souls III', rarity:'epic',     effect:'weapon_art', effectName:'Weapon Art',    effectDesc:'Once/week activate: +30% XP on all habits for 3 days.'},
  {id:'farron',      name:'Farron Greatsword',     game:'Dark Souls III', rarity:'epic',     effect:'double',     effectName:'Double Strike', effectDesc:'Once/day: select one habit to earn 2× XP.'},
  {id:'gaels_sword', name:"Gael's Greatsword",     game:'Dark Souls III', rarity:'legendary',effect:'bleed',      effectName:'Bloodlust',     effectDesc:'5-day streak → next completion +120% XP.'},
  {id:'ds_greataxe', name:'Dragonslayer Greataxe', game:'Dark Souls III', rarity:'legendary',effect:'poison',     effectName:'Dragonfire',    effectDesc:'+30% extra boss damage per completion.'},
  {id:'chaos_blade', name:'Chaos Blade',           game:'Dark Souls',     rarity:'legendary',effect:'crit',       effectName:'Chaos',         effectDesc:'Before noon: +100% XP. Any time: +25% XP.'}
];

const ARMOR_TEMPLATES = [
  {id:'fk_helm', name:'Fallen Knight Helm',      slot:'head', rarity:'uncommon', setId:'fk', bonus:{strength:0.05}},
  {id:'fk_chest',name:'Fallen Knight Armor',     slot:'chest',rarity:'uncommon', setId:'fk', bonus:{strength:0.05}},
  {id:'fk_hands',name:'Fallen Knight Gauntlets', slot:'hands',rarity:'uncommon', setId:'fk', bonus:{strength:0.05}},
  {id:'fk_legs', name:'Fallen Knight Leggings',  slot:'legs', rarity:'uncommon', setId:'fk', bonus:{strength:0.05}},
  {id:'nk_helm', name:'Knight Helm',             slot:'head', rarity:'uncommon', setId:'nk', bonus:{endurance:0.05}},
  {id:'nk_chest',name:'Knight Armor',            slot:'chest',rarity:'uncommon', setId:'nk', bonus:{endurance:0.05}},
  {id:'nk_hands',name:'Knight Gauntlets',        slot:'hands',rarity:'uncommon', setId:'nk', bonus:{endurance:0.05}},
  {id:'nk_legs', name:'Knight Leggings',         slot:'legs', rarity:'uncommon', setId:'nk', bonus:{endurance:0.05}},
  {id:'da_helm', name:"Dancer's Crown",          slot:'head', rarity:'rare',     setId:'da', bonus:{dexterity:0.08}},
  {id:'da_chest',name:"Dancer's Armor",          slot:'chest',rarity:'rare',     setId:'da', bonus:{dexterity:0.08}},
  {id:'da_hands',name:"Dancer's Gauntlets",      slot:'hands',rarity:'rare',     setId:'da', bonus:{dexterity:0.08}},
  {id:'da_legs', name:"Dancer's Leggings",       slot:'legs', rarity:'rare',     setId:'da', bonus:{dexterity:0.08}},
  {id:'rk_helm', name:'Ringed Knight Helm',      slot:'head', rarity:'epic',     setId:'rk', bonus:{strength:0.10,endurance:0.10}},
  {id:'rk_chest',name:'Ringed Knight Armor',     slot:'chest',rarity:'epic',     setId:'rk', bonus:{strength:0.10,endurance:0.10}},
  {id:'rk_hands',name:'Ringed Knight Gauntlets', slot:'hands',rarity:'epic',     setId:'rk', bonus:{strength:0.10}},
  {id:'rk_legs', name:'Ringed Knight Leggings',  slot:'legs', rarity:'epic',     setId:'rk', bonus:{endurance:0.10}},
  {id:'fl_helm', name:"Fire Keeper's Veil",      slot:'head', rarity:'legendary',setId:'fl', bonus:{willpower:0.15,intelligence:0.10}},
  {id:'fl_chest',name:"Firekeeper's Robe",       slot:'chest',rarity:'legendary',setId:'fl', bonus:{willpower:0.15,intelligence:0.10}},
  {id:'fl_hands',name:'Sun Princess Gloves',     slot:'hands',rarity:'legendary',setId:'fl', bonus:{charisma:0.15}},
  {id:'fl_legs', name:'Firekeeper Skirt',        slot:'legs', rarity:'legendary',setId:'fl', bonus:{vigor:0.15}},
  {id:'ec',      name:'Elden Lord Crown',        slot:'head', rarity:'mythic',   setId:null,  bonus:{intelligence:0.25,willpower:0.20}},
  {id:'ma',      name:"Malenia's Armor",         slot:'chest',rarity:'mythic',   setId:null,  bonus:{strength:0.25,dexterity:0.20}}
];

const SET_NAMES = {fk:'Fallen Knight', nk:'Nameless Knight', da:"Dancer's", rk:'Ringed Knight', fl:'Firelink'};
const SET_BONUSES = {
  fk: {2:{desc:'+10% Vigor XP',     bonus:{vigor:0.10}},          4:{desc:'+5% all XP · Str scales boss dmg', bonus:{_all:0.05}, special:'str_dmg'}},
  nk: {2:{desc:'+5% Vigor XP',      bonus:{vigor:0.05}},          4:{desc:'+10% all XP', bonus:{_all:0.10}}},
  da: {2:{desc:'+8% Endurance XP',  bonus:{endurance:0.08}},      4:{desc:'+5% Charisma · Ember loss halved', bonus:{charisma:0.05}, special:'ember_prot'}},
  rk: {2:{desc:'+10% all XP',       bonus:{_all:0.10}},           4:{desc:'+10% boss damage', bonus:{}, special:'boss_dmg'}},
  fl: {2:{desc:'+15% all XP',       bonus:{_all:0.15}},           4:{desc:'+25% all XP · Ember floor 1.2×', bonus:{_all:0.25}, special:'ember_floor'}}
};

const MATERIALS = {
  aschenglut:      {name:'Aschenglut',       icon:'🔥', tier:1, color:'#aaaaaa'},
  kohle:           {name:'Glühende Kohle',   icon:'⬛', tier:2, color:'#50c050'},
  titanitSplitter: {name:'Titanit-Splitter', icon:'💎', tier:3, color:'#4090ff'},
  grossesTitanit:  {name:'Großes Titanit',   icon:'💜', tier:4, color:'#c050ff'},
  drachenschuppe:  {name:'Drachenschuppe',   icon:'🐉', tier:5, color:'#ffd700'},
  seelenkern:      {name:'Seelenkern',       icon:'✨', tier:6, color:'#ffffff'}
};

const LEVEL_QUOTES = {
  vigor:        ['Your will to survive strengthens.','Death is merely a setback.','Life bends to your resolve.'],
  endurance:    ['You push further than before.','Fatigue is a lie the weak tell themselves.','The road is long. You are longer.'],
  strength:     ['Your strikes grow heavier.','The weak cower. You grow stronger.','Iron does not fear the forge.'],
  dexterity:    ['Your movements become precise.','Grace and power — unbreakable.','Flow like water, strike like lightning.'],
  intelligence: ['Insight floods your mind.','Knowledge is the sharpest weapon.','To understand is to overcome.'],
  willpower:    ['Your mind fortifies against despair.','The hardest battles are within.','Discipline is freedom.'],
  charisma:     ['Others notice your presence.','Words too can move mountains.','Leadership is earned, not given.']
};

const TITLE_DEFS = [
  {id:'unkindled',   name:'The Unkindled',    desc:'Defeat your first boss.',                         hidden:false, check:s=>s.boss.history.some(h=>h.won)},
  {id:'ashen_one',   name:'The Ashen One',     desc:'Reach Soul Level 50.',                            hidden:false, check:s=>calcSL(s)>=50},
  {id:'twice_born',  name:'Twice-Born',        desc:'Reach Soul Level 100.',                           hidden:false, check:s=>calcSL(s)>=100},
  {id:'dragonslayer',name:'Dragonslayer',       desc:'Defeat 10 bosses.',                               hidden:false, check:s=>s.boss.history.filter(h=>h.won).length>=10},
  {id:'demonslayer', name:'Slayer of Demons',  desc:'Defeat 50 bosses.',                               hidden:false, check:s=>s.boss.history.filter(h=>h.won).length>=50},
  {id:'iron_will',   name:'Iron Will',          desc:'30-day streak on 3 habits simultaneously.',      hidden:false, check:s=>HABIT_IDS.filter(id=>s.habits[id].streak>=30).length>=3},
  {id:'undying',     name:'The Undying',        desc:'100-day streak on any habit.',                    hidden:false, check:s=>HABIT_IDS.some(id=>s.habits[id].longestStreak>=100)},
  {id:'scholar',     name:'The Scholar',        desc:'Reach Intelligence Level 20.',                    hidden:false, check:s=>s.attributes.intelligence.level>=20},
  {id:'strongman',   name:'The Strong',         desc:'Reach Strength Level 20.',                        hidden:false, check:s=>s.attributes.strength.level>=20},
  {id:'collector',   name:'The Collector',      desc:'Own 5 different weapons.',                        hidden:false, check:s=>(s.inventory.weapons||[]).length>=5},
  {id:'polymath',    name:'Polymath',            desc:'Reach Level 15 in every attribute.',             hidden:false, check:s=>Object.values(s.attributes).every(a=>a.level>=15)},
  {id:'flawless',    name:'Flawless Victory',   desc:'Perfect week: 100% habits every day while fighting a boss.', hidden:true, check:s=>(s._flawlessWins||0)>0},
  {id:'monk',        name:'The Monk',            desc:'60-day journal streak + Willpower Level 25.',    hidden:true, check:s=>s.habits.journal.longestStreak>=60&&s.attributes.willpower.level>=25},
  {id:'shape_water', name:'Shape of Water',      desc:'All habits completed every day for 7 days.',    hidden:true, check:s=>_checkAllHabitsWeek(s)},
  {id:'unbreakable', name:'Unbreakable',         desc:'5 boss victories in a row, no defeats.',         hidden:true, check:s=>_checkWinStreak(s,5)},
  {id:'universalge', name:'Universalgelehrter',  desc:'Intelligence Level 40 + 500 hours reading.',    hidden:true, check:s=>s.attributes.intelligence.level>=40&&_readingHours(s)>=500},
  {id:'legend',      name:'The Legend',          desc:'365-day streak on any habit.',                   hidden:true, check:s=>HABIT_IDS.some(id=>s.habits[id].longestStreak>=365)}
];

// Helper functions used in title checks (defined here to be available)
function calcSL(s){return Object.values(s.attributes).reduce((t,a)=>t+a.level,0);}
function _addDays(key,n){const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];}
function _checkAllHabitsWeek(s){
  const tk=new Date().toISOString().split('T')[0];
  for(let i=0;i<7;i++){const d=_addDays(tk,-i);for(const id of HABIT_IDS){if(!s.habits[id].completions[d])return false;}}
  return true;
}
function _checkWinStreak(s,n){if(s.boss.history.length<n)return false;return s.boss.history.slice(0,n).every(h=>h.won);}
function _readingHours(s){return Object.values(s.habits.reading.completions).reduce((sum,c)=>sum+(c.amount/20),0);}
