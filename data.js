// ═══════════════════════════════════════════════════════
//  data.js — Game Data Layer
//  Zodiac system · Area maps · Enemy roster · Skills
// ═══════════════════════════════════════════════════════
'use strict';

// ── WESTERN ZODIAC (month 1–12) ─────────────────────────
const WZ = [null,
  {m:1, n:'Capricorn',   sym:'♑', el:'Earth', q:'Cardinal', ic:'🏔️', col:'#8B7355'},
  {m:2, n:'Aquarius',    sym:'♒', el:'Air',   q:'Fixed',    ic:'⚡', col:'#4488CC'},
  {m:3, n:'Pisces',      sym:'♓', el:'Water', q:'Mutable',  ic:'🌊', col:'#44AACC'},
  {m:4, n:'Aries',       sym:'♈', el:'Fire',  q:'Cardinal', ic:'🔥', col:'#CC3333'},
  {m:5, n:'Taurus',      sym:'♉', el:'Earth', q:'Fixed',    ic:'🌿', col:'#557733'},
  {m:6, n:'Gemini',      sym:'♊', el:'Air',   q:'Mutable',  ic:'💫', col:'#CCBB33'},
  {m:7, n:'Cancer',      sym:'♋', el:'Water', q:'Cardinal', ic:'🌙', col:'#7799CC'},
  {m:8, n:'Leo',         sym:'♌', el:'Fire',  q:'Fixed',    ic:'☀️', col:'#DD9900'},
  {m:9, n:'Virgo',       sym:'♍', el:'Earth', q:'Mutable',  ic:'🌾', col:'#77AA55'},
  {m:10,n:'Libra',       sym:'♎', el:'Air',   q:'Cardinal', ic:'⚖️', col:'#BB77BB'},
  {m:11,n:'Scorpio',     sym:'♏', el:'Water', q:'Fixed',    ic:'🦂', col:'#882244'},
  {m:12,n:'Sagittarius', sym:'♐', el:'Fire',  q:'Mutable',  ic:'🏹', col:'#CC7733'},
];

// ── CHINESE ZODIAC (year cycle) ─────────────────────────
const CZ = [
  {i:0, n:'Rat',    ic:'🐀', el:'Water', yang:true,  sp:'rat',     lore:'Cunning survivor, master of gaps and shadows.'},
  {i:1, n:'Ox',     ic:'🐂', el:'Earth', yang:false, sp:'ox',      lore:'Immovable will, tireless strength, patience like stone.'},
  {i:2, n:'Tiger',  ic:'🐅', el:'Wood',  yang:true,  sp:'tiger',   lore:'Born to lead by fear and respect. Strikes first.'},
  {i:3, n:'Rabbit', ic:'🐇', el:'Wood',  yang:false, sp:'rabbit',  lore:'Speed is survival. The Rabbit was never where you looked.'},
  {i:4, n:'Dragon', ic:'🐉', el:'Earth', yang:true,  sp:'dragon',  lore:'Divine and terrible. Where the Dragon walks, history bends.'},
  {i:5, n:'Snake',  ic:'🐍', el:'Fire',  yang:false, sp:'snake',   lore:'Wisdom coiled tight. Strikes only when certain.'},
  {i:6, n:'Horse',  ic:'🐴', el:'Fire',  yang:true,  sp:'horse',   lore:'Freedom is everything. No fence holds a Horse.'},
  {i:7, n:'Goat',   ic:'🐐', el:'Earth', yang:false, sp:'goat',    lore:'The healer who asks nothing. Carries all burdens quietly.'},
  {i:8, n:'Monkey', ic:'🐒', el:'Metal', yang:true,  sp:'monkey',  lore:'Brilliant and dangerous. Invents what others fear.'},
  {i:9, n:'Rooster',ic:'🐓', el:'Metal', yang:false, sp:'rooster', lore:'The Rooster\'s cry ends all shadow. Dawn is its weapon.'},
  {i:10,n:'Dog',    ic:'🐕', el:'Earth', yang:true,  sp:'dog',     lore:'Loyalty beyond death. Never breaks a bond.'},
  {i:11,n:'Pig',    ic:'🐖', el:'Water', yang:false, sp:'pig',     lore:'Generous to a fault. Feeds all, even its enemies.'},
];

// ── STAT GENERATION ────────────────────────────────────
const EL_BONUS = {
  Fire:  {ATK:15, SPD:8},  Earth: {DEF:15, HP:12},
  Air:   {SPD:15, LCK:8},  Water: {MP:15,  DEF:8},
  Wood:  {HP:15,  ATK:8},  Metal: {LCK:15, ATK:10},
};
const Q_MUL = { Cardinal:1.10, Fixed:1.15, Mutable:1.05 };

function genStats(w, c, gender) {
  const s = {HP:100, MP:50, ATK:25, DEF:22, SPD:22, LCK:12};
  for (const bonus of [EL_BONUS[w.el]||{}, EL_BONUS[c.el]||{}])
    for (const [k,v] of Object.entries(bonus)) s[k] = (s[k]||0) + v;
  const qm = Q_MUL[w.q]||1;
  s.ATK=Math.round(s.ATK*qm); s.DEF=Math.round(s.DEF*qm); s.SPD=Math.round(s.SPD*qm);
  if (gender==='F') { s.MP+=10; s.LCK+=5; } else { s.HP+=10; s.ATK+=5; }
  s.maxHP=s.HP; s.maxMP=s.MP;
  return s;
}

// ── SKILL SYSTEM ────────────────────────────────────────
const SKILLS = {
  // Player skills
  'Solar Strike':    {cost:8,  type:'dmg',    mult:1.7,  el:'Fire',  desc:'Blazing direct hit',          icon:'🔥'},
  'Corona Burst':    {cost:15, type:'dmg_dbt', mult:1.4,  el:'Fire',  desc:'AOE blast, lowers enemy ATK', icon:'☀️'},
  'Stone Guard':     {cost:6,  type:'buff',    stat:'DEF', boost:.35, turns:2, desc:'DEF +35% for 2 turns', icon:'🛡️'},
  'Terra Shatter':   {cost:14, type:'dmg_prc', mult:1.5,  pierce:.5,  desc:'Pierces DEF',                 icon:'🏔️'},
  'Gale Blade':      {cost:9,  type:'dmg_spd', mult:1.6,  el:'Air',   desc:'Slash + SPD up',              icon:'💨'},
  'Zephyr Veil':     {cost:10, type:'evade',   turns:1,               desc:'Evade next hit',              icon:'🌀'},
  'Tidal Mend':      {cost:12, type:'heal',    pct:.38,               desc:'Restore 38% HP',              icon:'💧'},
  'Deep Pull':       {cost:13, type:'drain',   mult:1.35,             desc:'Drain HP from enemy',         icon:'🌊'},
  'Life Surge':      {cost:8,  type:'regen',   pct:.10,   turns:3,    desc:'Regen 10% HP×3 turns',       icon:'🌿'},
  'Thorn Lash':      {cost:10, type:'dmg_dot', mult:1.5,  el:'Wood',  desc:'Damage + poison',             icon:'🌾'},
  'Iron Edge':       {cost:9,  type:'dmg',     mult:1.85, el:'Metal', desc:'Highest base damage',         icon:'⚔️'},
  'Fortune Flip':    {cost:7,  type:'buff',    stat:'LCK', boost:1.0, turns:2, desc:'Double LCK',        icon:'🍀'},
  'Serpent Bind':    {cost:18, type:'stun',    mult:1.15,             desc:'Stun for 1 turn',            icon:'🐍'},
};

const EL_SKILLS = {
  Fire:  ['Solar Strike', 'Corona Burst'],
  Earth: ['Stone Guard', 'Terra Shatter'],
  Air:   ['Gale Blade', 'Zephyr Veil'],
  Water: ['Tidal Mend', 'Deep Pull'],
  Wood:  ['Life Surge', 'Thorn Lash'],
  Metal: ['Iron Edge', 'Fortune Flip'],
};

function genSkills(welEl, celEl) {
  const sk = [...(EL_SKILLS[welEl]||[])];
  if (celEl !== welEl && EL_SKILLS[celEl]) sk.push(EL_SKILLS[celEl][0]);
  sk.push('Serpent Bind');
  return sk.slice(0,4);
}

// ── CHARACTER TITLES ────────────────────────────────────
const TITLES = {
  Rat:    ['Iron Vermin','Storm Vermin','Mist Rat','War Gnaw','Root Rat','Echo Rat','Moon Rat','Solar Rat','Harvest Rat','Scale Rat','Venom Rat','Arrow Rat'],
  Ox:     ['Iron Colossus','Tidal Colossus','Dream Ox','War Ox','Root Colossus','Twin Ox','Moon Ox','Solar Ox','Harvest Ox','Balance Ox','Abyss Ox','Free Ox'],
  Tiger:  ['Stone Sovereign','Thunder Celestial','Mist Tiger','Ember Tiger','Root Tiger','Twin Tiger','Moon Tiger','Solar Tiger','Harvest Tiger','Scale Tiger','Venom Tiger','Arrow Sovereign'],
  Rabbit: ['Iron Phantom','Void Phantom','Dream Phantom','Ember Rabbit','Root Rabbit','Echo Rabbit','Moon Rabbit','Solar Rabbit','Harvest Rabbit','Scale Rabbit','Venom Rabbit','Arrow Phantom'],
  Dragon: ['Stone Emperor','Null Emperor','Dream Emperor','War Emperor','Root Emperor','Echo Emperor','Moon Emperor','Solar Emperor','Harvest Emperor','Scale Emperor','Abyss Emperor','Arrow Emperor'],
  Snake:  ['Iron Coil','Crystal Coil','Dream Coil','Ember Coil','Root Coil','Echo Coil','Moon Coil','Solar Coil','Harvest Coil','Scale Coil','Venom Coil','Arrow Coil'],
  Horse:  ['Iron Gallop','Lightning Gallop','Dream Gallop','War Gallop','Root Gallop','Twin Gallop','Moon Gallop','Solar Gallop','Harvest Gallop','Scale Gallop','Venom Gallop','Arrow Gallop'],
  Goat:   ['Iron Shepherd','Mist Shepherd','Dream Shepherd','Ember Shepherd','Root Shepherd','Echo Shepherd','Moon Shepherd','Solar Shepherd','Harvest Shepherd','Scale Shepherd','Venom Shepherd','Arrow Shepherd'],
  Monkey: ['Iron Trickster','Glitch Ape','Dream Monkey','Ember Trickster','Root Monkey','Echo Trickster','Moon Monkey','Solar Trickster','Harvest Monkey','Scale Trickster','Venom Trickster','Arrow Trickster'],
  Rooster:['Iron Crier','Storm Crier','Dream Rooster','Ember Crier','Root Rooster','Echo Crier','Moon Crier','Solar Crier','Harvest Crier','Scale Crier','Venom Crier','Arrow Crier'],
  Dog:    ['Iron Guardian','Crystal Hound','Dream Dog','War Guardian','Root Guardian','Echo Guardian','Moon Guardian','Solar Guardian','Harvest Guardian','Scale Guardian','Venom Guardian','Arrow Guardian'],
  Pig:    ['Iron Bounty','Void Bounty','Dream Pig','War Pig','Root Bounty','Echo Bounty','Moon Bounty','Solar Bounty','Harvest Bounty','Scale Bounty','Venom Bounty','Arrow Bounty'],
};

// ── AREA MAPS (height + object layers) ─────────────────
// Height: 0=floor, 1=step, 2=block, 3=wall
const AREA_DATA = {

  hub: {
    id: 'hub', name: 'Convergence Square', chapter: 0,
    w: 20, h: 18, spawn: {x:10,y:9},
    palette: {
      floor:'#120f38', floor2:'#1a1650', step:'#18145a',
      wall:'#231875', wallL:'#0e0c38', wallR:'#080620',
      edge:'#080618', water:'#040840', ambient:'rgba(139,63,232,0.07)',
    },
    bgColor: '#030610',
    hmap: [
      [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,3],
      [3,0,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,3],
      [3,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,3],
      [3,0,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,3],
      [3,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    ],
    objects: [
      {x:10,y:2, t:'npc',    id:'ophiuchus', msg:'Two zodiac realms collided. Twelve shadow beasts rose from the fracture. You — uniquely born — are the bridge between both worlds. Seek the shadows. Face them. Choose wisely.'},
      {x:5, y:7, t:'enemy',  id:'void_shard',  label:'Void Shard',   hp:80,  atk:22, def:10, spd:28, mp:20, skills:['Void Bite','Shadow Lash'],   xp:45,  sprite:null},
      {x:15,y:5, t:'enemy',  id:'ghost_flame', label:'Ghost Flame',  hp:95,  atk:28, def:8,  spd:32, mp:42, skills:['Fire Lick','Soul Burn'],     xp:55,  sprite:null},
      {x:4, y:13,t:'enemy',  id:'void_hound',  label:'Void Hound',   hp:120, atk:34, def:15, spd:36, mp:16, skills:['Void Bite','Savage Rush'],   xp:65,  sprite:null},
      {x:9, y:9, t:'boss',   id:'s_ox',        label:'Shadow Ox',    hp:290, atk:52, def:42, spd:18, mp:40, skills:['Earth Crush','Iron Wall','Colossus Stomp'], xp:180, sprite:'ox',     isBoss:true, desc:'Crystalline darkness given immovable form. Its hooves crack reality with each step.'},
      {x:16,y:13,t:'chest',  reward:{type:'potion', amt:3}},
      {x:3, y:5, t:'save'},
      {x:10,y:0, t:'exit',   to:'aquarius'},
      {x:19,y:9, t:'exit',   to:'ruins'},
    ],
    music: 'ambient_void',
    storyKey: 'hub_enter',
  },

  aquarius: {
    id: 'aquarius', name: 'Aquarius Storm Crystal', chapter: 2,
    w: 22, h: 18, spawn: {x:11,y:15},
    palette: {
      floor:'#041a2a', floor2:'#062234', step:'#083040',
      wall:'#0a3860', wallL:'#04182a', wallR:'#020f1c',
      edge:'#02100e', water:'#002240', ambient:'rgba(34,170,204,0.14)',
    },
    bgColor: '#020d1a',
    hmap: [
      [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
      [3,0,0,0,0,0,2,2,2,0,0,0,2,2,2,0,0,0,0,0,0,3],
      [3,0,0,0,0,2,2,0,2,2,0,2,2,0,2,2,0,0,0,0,0,3],
      [3,0,0,0,0,2,0,0,0,2,2,2,0,0,0,2,0,0,0,0,0,3],
      [3,0,0,0,0,2,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,3],
      [3,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,3],
      [3,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,3],
      [3,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3],
      [3,0,0,0,0,2,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,3],
      [3,0,0,0,0,2,2,0,0,0,0,0,0,0,2,2,0,0,0,0,0,3],
      [3,0,0,0,0,0,2,2,2,0,0,0,2,2,2,0,0,0,0,0,0,3],
      [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    ],
    objects: [
      {x:11,y:2,  t:'npc',   id:'lyra',       msg:'The Aquarian line — fusions of Air and ancient zodiac — gathered here after the collision. Each one is a world in itself. Face them with respect.'},
      {x:5, y:7,  t:'enemy', id:'storm_shard', label:'Storm Shard',  hp:100, atk:28, def:12, spd:35, mp:30, skills:['Static Burst','Chain Arc'],         xp:60,  sprite:null},
      {x:17,y:7,  t:'enemy', id:'mirror_twin', label:'Mirror Twin',  hp:110, atk:36, def:18, spd:30, mp:62, skills:['Copy Strike','Illusion Hex'],        xp:70,  sprite:null},
      {x:5, y:12, t:'enemy', id:'crystal_golem',label:'Crystal Golem',hp:145,atk:32, def:48, spd:10, mp:15, skills:['Crystal Crush','Stone Skin'],        xp:80,  sprite:null},
      {x:17,y:12, t:'enemy', id:'storm_sprite', label:'Storm Sprite', hp:90,  atk:30, def:10, spd:45, mp:55, skills:['Spark Dash','Thunder Sting'],        xp:60,  sprite:null},
      {x:11,y:9,  t:'boss',  id:'s_tiger',     label:'Shadow Tiger',  hp:240, atk:58, def:26, spd:46, mp:50, skills:['Predator Leap','Roar of Fear','Tiger\'s Claw'], xp:200, sprite:'tiger', isBoss:true, desc:'Descended from storm divinity. Wings of condensed lightning arc behind its sacred form.'},
      {x:2, y:9,  t:'chest', reward:{type:'skill_gem', amt:1}},
      {x:20,y:9,  t:'chest', reward:{type:'potion', amt:2}},
      {x:11,y:4,  t:'save'},
      {x:0, y:9,  t:'exit',  to:'hub'},
      {x:11,y:17, t:'exit',  to:'ruins'},
    ],
    music: 'ambient_storm',
    storyKey: 'aquarius_enter',
  },

  ruins: {
    id: 'ruins', name: 'Aries Fire Ruins', chapter: 1,
    w: 22, h: 18, spawn: {x:11,y:16},
    palette: {
      floor:'#2a0e00', floor2:'#3c1500', step:'#3d1800',
      wall:'#521c00', wallL:'#2e1000', wallR:'#200a00',
      edge:'#140500', water:'#4d0000', ambient:'rgba(200,60,0,0.13)',
    },
    bgColor: '#160700',
    hmap: [
      [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,3,0,0,0,3,0,0,0,0,0,0,3,0,0,0,3,0,0,0,3],
      [3,0,3,0,0,0,3,0,0,0,0,0,0,3,0,0,0,3,0,0,0,3],
      [3,0,2,0,0,0,2,0,0,0,0,0,0,2,0,0,0,2,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,0,0,2,2,2,0,0,0,0,0,0,2,2,2,0,0,0,0,0,3],
      [3,0,0,0,2,0,2,0,0,0,0,0,0,2,0,2,0,0,0,0,0,3],
      [3,0,0,0,2,0,2,0,0,0,0,0,0,2,0,2,0,0,0,0,0,3],
      [3,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,3,0,0,0,3,0,0,0,0,0,0,3,0,0,0,3,0,0,0,3],
      [3,0,3,0,0,0,3,0,0,0,0,0,0,3,0,0,0,3,0,0,0,3],
      [3,0,2,0,0,0,2,0,0,0,0,0,0,2,0,0,0,2,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    ],
    objects: [
      {x:11,y:2,  t:'npc',   id:'spirit',      msg:'The ruins of the Ram burn eternal. The Dragon waits at the heart of the flame — the mightiest of the Aquarian line. Do not face it until you are ready.'},
      {x:9, y:8,  t:'enemy', id:'ember_golem',  label:'Ember Golem',   hp:135, atk:42, def:28, spd:15, mp:25, skills:['Fire Slam','Ember Burst'],           xp:75,  sprite:null},
      {x:13,y:8,  t:'enemy', id:'blaze_imp',    label:'Blaze Imp',     hp:95,  atk:38, def:12, spd:42, mp:45, skills:['Fire Lick','Flame Dash'],             xp:65,  sprite:null},
      {x:4, y:8,  t:'enemy', id:'ruin_wolf',    label:'Ruin Wolf',     hp:150, atk:44, def:22, spd:38, mp:18, skills:['Savage Rush','Pack Call'],             xp:80,  sprite:null},
      {x:18,y:8,  t:'enemy', id:'stone_sentinel',label:'Stone Sentinel',hp:185, atk:36, def:52, spd:8,  mp:10, skills:['Stone Crush','Iron Guard'],            xp:90,  sprite:null},
      {x:11,y:9,  t:'boss',  id:'s_dragon',     label:'Shadow Dragon',  hp:330, atk:68, def:36, spd:30, mp:95, skills:['Void Breath','Chaos Wing','Dragon Ascent'], xp:280, sprite:'dragon', isBoss:true, desc:'The void itself crystallized into draconic form. Green energy seeps through every crack in its obsidian hide.'},
      {x:3, y:14, t:'chest', reward:{type:'power_gem', amt:1}},
      {x:19,y:14, t:'chest', reward:{type:'potion', amt:4}},
      {x:11,y:15, t:'save'},
      {x:19,y:9,  t:'exit',  to:'aquarius'},
    ],
    music: 'ambient_fire',
    storyKey: 'ruins_enter',
  },
};

// ── STORY DIALOGUES ─────────────────────────────────────
const STORY = {
  hub_enter:      { speaker:'OPHIUCHUS', art:'🐍⚕️🐍', tx:'Two zodiac realms fused into chaos. Twelve shadow beasts rose. You — a fusion of Eastern and Western stars — are the only frequency they cannot read.\n\nFor now.' },
  aquarius_enter: { speaker:'LYRA — fractured guide', art:'✨', tx:'The Aquarian Storm Crystal. Every creature here is a fusion of Air and ancient animal spirit — wild, dangerous, and beautiful.\n\nWalk carefully. The Tiger is watching.' },
  ruins_enter:    { speaker:'SPIRIT OF THE RAM', art:'🔥', tx:'The fire ruins remember every battle ever fought here.\n\nThe Dragon is at the heart. It has been here since the beginning. Weaken it before you go for full damage.' },
};

// ── AREA EXIT NAMES ─────────────────────────────────────
const EXIT_LABELS = {
  hub:      { n:'▲ Storm Crystal',  e:'▶ Fire Ruins' },
  aquarius: { w:'◀ Hub',            s:'▼ Fire Ruins' },
  ruins:    { e:'◀ Aquarius' },
};
