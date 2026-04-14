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

// ============================================================
// BOSS LORE
// Each boss is a manifestation of a human weakness.
// ============================================================
const BOSS_LORE = {
  asylum: {
    epithet: 'Wächter der leeren Tage',
    intro: 'Er schläft nicht. Er wartet. Schon immer hat er an dieser Schwelle gestanden und zugeschaut, wie Menschen umkehren, bevor sie überhaupt beginnen.',
    challenge: 'Was hält dich heute von dem ab, was du dir gestern versprochen hast?',
    quotes: {
      full:  'Er beobachtet dich reglos. Er kennt dieses Gesicht — das Gesicht von jemandem, der es diesmal wirklich ernst meint.',
      half:  'Er hebt den Kopf. Die Hälfte seiner Besucher sind schon weg. Du noch nicht.',
      low:   'Er wankt. Er hat das noch nicht oft erlebt.',
      dying: 'Zum ersten Mal in langer Zeit: Unruhe in seinen Augen.'
    },
    victory: 'Der Wächter fällt. Irgendwo öffnet sich eine Tür, die du nie bemerkt hattest.',
    defeat:  'Er setzt sich wieder hin. Er weiß: Die meisten kommen zurück. Und die meisten gehen wieder.'
  },
  iudex: {
    epithet: 'Der Richter, der nicht glaubt',
    intro: 'Er wurde einst geschickt, um den Würdigen den Weg zu öffnen. Dann wartete er so lange, dass er aufgehört hat, an Würdige zu glauben.',
    challenge: 'Bist du würdig — oder erzählst du dir das nur?',
    quotes: {
      full:  'Er mustert dich mit der Gleichgültigkeit eines Mannes, der tausend solche Versprechen gehört hat.',
      half:  'Sein Griff um die Hellebarde wird fester. Vielleicht doch.',
      low:   'Er kämpft jetzt mit einer Intensität, die nach Überraschung aussieht.',
      dying: 'Ein letzter Blick. Diesmal ohne Zweifel.'
    },
    victory: 'Gundyr fällt auf ein Knie. Der Weg ist frei — nicht weil er dich durchlässt, sondern weil er aufgehört hat, dir im Weg zu stehen.',
    defeat:  'Er tritt zur Seite. Noch nicht bereit, sagt sein Blick. Beweis das Gegenteil.'
  },
  vordt: {
    epithet: 'Das Tier der frühen Aufgabe',
    intro: 'Er war einmal ein Ritter. Dann kam eine Kälte, die nicht aus dem Winter kam — sie kam von innen. Seitdem ist nur noch das Tier übrig.',
    challenge: 'Wie lange hältst du durch, wenn es unangenehm wird?',
    quotes: {
      full:  'Die Kälte um ihn herum ist kein Wetter. Sie ist Gewohnheit. Die Gewohnheit, nicht weiterzumachen.',
      half:  'Er spürt die Wärme deiner Konsistenz. Sie irritiert ihn.',
      low:   'Das Eis bricht. Nicht das seiner Umgebung — das in seiner Brust.',
      dying: 'Er friert ein letztes Mal. Diesmal aus Überraschung.'
    },
    victory: 'Die Kälte weicht. Dort wo er stand, ist jetzt etwas Warmes — schwer zu benennen, aber spürbar.',
    defeat:  'Die Kälte breitet sich wieder aus. Morgen ist sie schon vertraut.'
  },
  dragonrider: {
    epithet: 'Hüter verlorener Schwüre',
    intro: 'Er hat einen Eid geleistet. Dann vergessen, wozu. Jetzt bewacht er die Form des Versprechens, ohne dessen Inhalt zu kennen.',
    challenge: 'Welche Versprechen hast du dir selbst schon gebrochen?',
    quotes: {
      full:  'Er bewegt sich mechanisch. Ein Ritual ohne Bedeutung — bis du es mit Bedeutung füllst.',
      half:  'Er stockt. In ihm regt sich etwas, das er längst begraben glaubte.',
      low:   'Die Bewegungen werden unregelmäßiger. Etwas wacht auf.',
      dying: 'Er erinnert sich. Zu spät — aber er erinnert sich.'
    },
    victory: 'Der Dragonrider sinkt. Ein Schwur ist gebrochen worden — aber der richtige.',
    defeat:  'Das Ritual geht weiter. Wie immer. Wie jeden Tag, wenn du nicht erscheinst.'
  },
  margit: {
    epithet: 'Herold der tausend Gründe',
    intro: 'Er braucht keine Waffe. Seine stärkste Fähigkeit ist das Wort. Kein Mensch, der je aufgehört hat, hatte keinen Grund dafür — und Margit kennt sie alle.',
    challenge: 'Welchen Grund hast du dir heute schon zurechtgelegt?',
    quotes: {
      full:  '"Du bist müde. Du hast Stress. Morgen wäre besser." Er lächelt. Er hat Recht — und er weiß, dass das das Problem ist.',
      half:  'Er ist ruhiger geworden. Weniger Worte. Das ist gefährlicher.',
      low:   '"Interessant." Er meint es ernst. Er sieht das nicht oft.',
      dying: 'Die Worte versiegen. Was bleibt, ist Stille — und Respekt.'
    },
    victory: 'Margit fällt schweigend. Das ist das lauteste Geräusch, das du je gehört hast.',
    defeat:  'Er verbeugt sich leicht. "Bis morgen," sagt er. "Ich bin immer da."'
  },
  watchers: {
    epithet: 'Das Chaos der halben Entscheidungen',
    intro: 'Sie waren einmal eins. Dann spaltete sich ihr Wille — jeder in eine andere Richtung. Seitdem kämpfen sie gegeneinander und gegen alles andere gleichzeitig.',
    challenge: 'Wie viele Dinge tust du halbherzig, statt eines vollständig?',
    quotes: {
      full:  'Sie bewegen sich unkoordiniert. Jeder will etwas anderes. Zusammen blockieren sie jeden Fortschritt.',
      half:  'Ein Wächter fällt — und steht wieder auf, stärker. Das Chaos organisiert sich.',
      low:   'Sie kämpfen jetzt wie ein einziger Körper. Zu spät gelernt, aber gelernt.',
      dying: 'Die letzte Flamme flackert. In ihr: alle Wege, die nicht gegangen wurden.'
    },
    victory: 'Die Wächter sinken. Der Staub setzt sich. Und du merkst: Du hast dich entschieden.',
    defeat:  'Das Chaos bleibt bestehen. Es wartet geduldig auf die nächste unfertige Woche.'
  },
  ape: {
    epithet: 'Das ungezähmte Ich',
    intro: 'Er hat kein Ziel. Er hat keinen Plan. Er handelt aus reinem Instinkt — und Instinkt sagt: Ruh dich aus. Iss. Vermeide Unbehagen. Tu, was sich gut anfühlt.',
    challenge: 'Wann hast du zuletzt etwas getan, das sich nicht sofort gut anfühlte, aber gut war?',
    quotes: {
      full:  'Er greift an, ohne nachzudenken. Impuls. Reaktion. Kein Raum für Disziplin.',
      half:  'Er ist verwirrt. Du weichst nicht aus — du gehst weiter. Das kennt er nicht.',
      low:   'Etwas in ihm bricht. Nicht der Körper — die Gewissheit, dass Instinkt immer gewinnt.',
      dying: 'Er schreit. Kein Schmerz — Unverständnis.'
    },
    victory: 'Der Affe fällt. Und du bemerkst: Es fühlt sich gut an. Besser als Aufhören je täte.',
    defeat:  'Er brüllt triumphierend. Der Instinkt hat gewonnen. Diesmal.'
  },
  godrick: {
    epithet: 'Sammler unvollendeter Versprechen',
    intro: 'Er hat alles gesammelt. Kraft von anderen. Fähigkeiten, die er nicht verdient hat. Er ist groß — und hohl. Denn nichts davon gehört wirklich ihm.',
    challenge: 'Was hast du dir in den letzten Wochen wirklich erarbeitet — und was nur geplant?',
    quotes: {
      full:  'Er protzt. Mit fremder Stärke, fremden Siegen. Er weiß selbst nicht mehr, was darunter liegt.',
      half:  'Die Fassade bekommt Risse. Etwas Echtes kämpft sich hervor — und es ist schwächer.',
      low:   'Er schreit wütend. Die angehefteten Arme kämpfen unabhängig — sie kennen ihn nicht mehr.',
      dying: 'Alle Masken fallen. Was bleibt, ist erschreckend klein.'
    },
    victory: 'Godrick zerfällt in seine Einzelteile. Und du bist noch ganz.',
    defeat:  'Er wächst. Mit deiner Niederlage. Mit jedem Tag, den du nicht erscheinst.'
  },
  rennala: {
    epithet: 'Herrin der vergangenen Größe',
    intro: 'Sie war einmal die Mächtigste. Dann verließ sie das, was ihr Kraft gab. Seitdem lebt sie in der Erinnerung daran — und verwechselt Erinnerung mit Gegenwart.',
    challenge: 'Hältst du an einer Vergangenheit fest, die dich an deiner Gegenwart hindert?',
    quotes: {
      full:  'Sie singt. Ein Lied über das, was war. Es ist schön. Es ist auch eine Falle.',
      half:  'Die Kinder, die sie schützen, beginnen zu weichen. Die Gegenwart bricht ein.',
      low:   'Sie hört auf zu singen. Zum ersten Mal seit langer Zeit: Stille.',
      dying: 'Ein letztes Lächeln. Nicht traurig — erleichtert.'
    },
    victory: 'Rennala sinkt in den Mondlichtboden. Sie schläft. Endlich wirklich.',
    defeat:  'Das Lied geht weiter. Und du merkst: Du hast mitgesummt.'
  },
  pontiff: {
    epithet: 'Der Selbstbetrug des Erfahrenen',
    intro: 'Er war so lange auf diesem Weg, dass er vergessen hat, warum er gegangen ist. Er bezeichnet Routine als Tugend. Stagnation als Weisheit. Er ist gefährlich — weil er so überzeugend klingt.',
    challenge: 'Tust du es aus Überzeugung — oder aus Gewohnheit, die sich wie Überzeugung anfühlt?',
    quotes: {
      full:  'Er bewegt sich mit makelloser Technik. Jede Bewegung sitzt. Kein Raum für Wachstum.',
      half:  'Sein Schatten löst sich von ihm. Auch er weiß nicht mehr, welcher der echte ist.',
      low:   'Beide kämpfen jetzt — Maske und Gesicht. Keiner gewinnt.',
      dying: 'Er sieht dich an. Nicht als Gegner. Als Spiegel.'
    },
    victory: 'Pontiff zerfällt. Sein Schatten verschwindet zuletzt — als hätte er noch etwas zu sagen gehabt.',
    defeat:  'Er trägt dich ein in sein Buch der Versuche. Unter tausend anderen Namen.'
  },
  twins: {
    epithet: 'Brüder des aufgeschobenen Lebens',
    intro: 'Einer ist krank. Der andere weigert sich, weiterzugehen, bis der erste bereit ist. Sie warten aufeinander seit Ewigkeiten. Keiner macht den ersten Schritt.',
    challenge: 'Worauf wartest du, bevor du anfängst — wirklich anfängst?',
    quotes: {
      full:  'Einer kämpft. Der andere beobachtet, bereit zu helfen. Zusammen sind sie etwas, das du noch nicht gesehen hast.',
      half:  'Der Kranke tritt vor. Jetzt kämpft er für den, der für ihn gekämpft hat.',
      low:   'Sie sind synchron. Krank oder gesund spielt keine Rolle mehr.',
      dying: 'Sie fallen zusammen. Wie sie gelebt haben — niemals allein.'
    },
    victory: 'Die Fürsten sinken. Und du fragst dich: Worauf habe ich selbst gewartet?',
    defeat:  'Sie warten weiter. Aufeinander. Auf dich. Auf den richtigen Moment.'
  },
  isshin: {
    epithet: 'Der Preis echter Disziplin',
    intro: 'Er hat alles geopfert. Familie. Ruhe. Bequemlichkeit. Er ist kein Feind — er ist ein Standard. Und Standards tun weh.',
    challenge: 'Bis wohin bist du wirklich bereit zu gehen?',
    quotes: {
      full:  'Er greift nicht sofort an. Er beobachtet. Er lernt dich kennen, schneller als du denkst.',
      half:  'Er lächelt kaum merklich. Nicht Herablassung — Anerkennung.',
      low:   'Er kämpft mit letzter Kraft. Und diese Kraft ist erschreckend.',
      dying: 'Er schließt die Augen. Ein Nicken. Du hast bestanden.'
    },
    victory: 'Isshin sinkt. Er hat dir nichts gegeben — er hat gezeigt, was du dir nehmen kannst.',
    defeat:  'Er steckt sein Schwert weg. "Nicht heute," sagt er. Es klingt nicht wie Kritik.'
  },
  morgott: {
    epithet: 'König der verborgenen Wunden',
    intro: 'Er trägt alles unter dem Mantel. Die Verletzungen. Die Flüche. Die Erschöpfung. Er kämpft trotzdem — und nennt es Pflicht, obwohl es längst Sturheit ist.',
    challenge: 'Kämpfst du heute aus Stärke — oder kämpfst du, weil du nicht weißt, wie man aufhört?',
    quotes: {
      full:  'Er bewegt sich schwer, aber zielstrebig. Man sieht die Last. Er zeigt sie nicht.',
      half:  'Er hustet. Er macht weiter. Man fragt sich: Für wen tut er das eigentlich?',
      low:   'Der Mantel fällt. Darunter: mehr Narben als Haut.',
      dying: 'Er lacht — kurz, echt. "Endlich," sagt er leise.'
    },
    victory: 'Morgott fällt mit Würde. Unter dem König war ein Mensch, der sich endlich ausruhen darf.',
    defeat:  'Er trägt die Last weiter. Allein. Wie immer.'
  },
  nameless: {
    epithet: 'Der ohne Zeugen',
    intro: 'Er existiert außerhalb der Geschichte. Kein Name. Kein Erbe. Nur er und sein Drache — und ein Kampf, den niemand gesehen hat. Er braucht keine Anerkennung. Das macht ihn gefährlicher als alle anderen.',
    challenge: 'Würdest du dieselben Dinge tun, wenn niemand zuschaut?',
    quotes: {
      full:  'Der Drache landet. Er steigt ab. Kein Ritual. Kein Publikum. Nur der Kampf.',
      half:  'Er kämpft jetzt allein. Ruhiger. Fokussierter. Wütender.',
      low:   'Seine Bewegungen werden kleiner, präziser. Als hätte er diese Stunde geübt.',
      dying: 'Er sieht dich an. Kein Feind, kein Spiegel — ein Ebenbürtiger.'
    },
    victory: 'Der Namenlose sinkt. Und du verstehst: Manche Dinge existieren nur zwischen dir und dir selbst.',
    defeat:  'Er verschwindet wie er kam — lautlos. War er wirklich da?'
  },
  gael: {
    epithet: 'Der letzte Pilger',
    intro: 'Er hat die ganze Welt durchquert. Durch Tod, durch Feuer, durch das Ende aller Dinge. Er hat nie aufgehört. Nicht einmal, als es keinen Grund mehr gab.',
    challenge: 'Was würde dich dazu bringen, aufzuhören — wirklich aufzuhören?',
    quotes: {
      full:  'Er hat nichts mehr zu verlieren. Das macht ihn nicht schwach — es macht ihn frei.',
      half:  'Er blutet. Er stolpert. Er macht weiter. Es ist nicht heroisch. Es ist einfach so.',
      low:   'Etwas in ihm leuchtet — nicht Kraft, nicht Magie. Etwas älteres.',
      dying: 'Er streckt die Hand aus. Nicht nach Hilfe — nach dir.'
    },
    victory: 'Gael fällt. Am Ende des letzten Weges liegt er — und irgendwie weißt du, dass er es so wollte.',
    defeat:  'Er pilgert weiter. Durch deine Niederlage, durch morgen, durch alles.'
  },
  friede: {
    epithet: 'Botin des ewigen Stillstands',
    intro: 'Sie hat Frieden gefunden — indem sie alles zum Stillstand gebracht hat. Kein Wachstum. Kein Schmerz. Auch keine Freude. Sie nennt es Erleuchtung. Es ist Versteinerung.',
    challenge: 'Welche Bequemlichkeit hält dich davon ab, unbequem zu wachsen?',
    quotes: {
      full:  '"Ruh dich aus," flüstert sie. Ihre Stimme ist echt — und das ist das Gefährliche.',
      half:  'Sie zeigt ihr wahres Gesicht. Der Frieden war nie echt — nur gut verborgen.',
      low:   'Drei Formen. Jede ein anderes Gesicht der Stagnation.',
      dying: 'Die Asche kühlt ab. Darunter: Erde. Und in der Erde: Möglichkeit.'
    },
    victory: 'Friede löst sich auf. Die Asche fliegt auseinander. Etwas hat sich bewegt — nach langer Zeit.',
    defeat:  'Der Frost legt sich wieder. Sanft. Unaufhaltsam. Gewohnheit.'
  },
  malenia: {
    epithet: 'Die Fäulnis des Nie-Gut-Genug',
    intro: 'Sie wurde nie besiegt. Auch sich selbst nicht. Sie hat sich einfach immer weiter übertroffen — bis die Fäulnis in ihr schneller wuchs als das Wachstum. Perfektionismus ist ihr Fluch, nicht ihre Stärke.',
    challenge: 'Akzeptierst du 80% Fortschritt — oder wartest du auf die perfekte Woche, die nie kommt?',
    quotes: {
      full:  'Jeder Schlag gegen dich heilt sie. Deine Fehler nähren sie. Sie wurde gebaut, um von Rückschlägen zu profitieren.',
      half:  '"Ich habe noch nie verloren," sagt sie. Man glaubt ihr. Das ist das Problem.',
      low:   'Die Fäulnis blüht auf. Auf den Flügeln Rot. In den Augen kein Hass — nur Entschlossenheit.',
      dying: 'Sie fällt zum ersten Mal. Es überrascht sie aufrichtig.'
    },
    victory: 'Malenia sinkt. Du hast nicht perfekt gespielt. Du hast durchgespielt. Das ist der Unterschied.',
    defeat:  'Sie heilt. Vollständig. Alle Fortschritte dieser Woche — zurück. Sie nennt das natürlich.'
  },
  elden: {
    epithet: 'Das Unbekannte jenseits der Grenzen',
    intro: 'Es gibt keine Geschichte über ihn, die vollständig wäre. Er ist das, was wartet, wenn alle anderen Grenzen gefallen sind. Nicht Feind. Nicht Freund. Die Frage, die bleibt, wenn alle anderen beantwortet sind.',
    challenge: 'Was tust du, wenn du alles erreicht hast, was du dir vorgenommen hattest?',
    quotes: {
      full:  'Er ist still. Er ist groß. Er ist alt. Er hat gesehen, wie viele Menschen hier standen und dann gegangen sind.',
      half:  'Er verändert sich. Nicht um dich zu erschrecken — um dich zu prüfen.',
      low:   'Das Licht in ihm wird schwächer. Darunter: Dunkelheit. Darunter: etwas Neues.',
      dying: 'Kein Schrei. Kein Drama. Nur ein langsames Verblassen — wie das Ende eines langen Tages.'
    },
    victory: 'Das Elden Beast löst sich auf in Licht. Was bleibt, ist kein Sieg — es ist ein Anfang.',
    defeat:  'Es wartet. Es hat immer gewartet. Es hat keine Eile — das hat es nie gehabt.'
  }
};
