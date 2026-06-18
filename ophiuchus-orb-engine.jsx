import React, {
  useState, useEffect, useMemo, useRef, useCallback, useReducer
} from 'react';

// ╔══════════════════════════════════════════════════════════════╗
//  ASSET MANIFEST — Drop image files to these exact paths
//  All src= references below are production-ready path strings
// ╚══════════════════════════════════════════════════════════════╝
const A = {
  bg: {
    menu:      'assets/sprites/backgrounds/bg1.png',
    world:     'assets/sprites/backgrounds/bg2.png',
    battle:    'assets/sprites/backgrounds/bg3.png',
    boss:      'assets/sprites/backgrounds/bg4.png',
    endLight:  'assets/sprites/backgrounds/bg5.png',
    endShadow: 'assets/sprites/backgrounds/bg6.png',
    orb:       'assets/sprites/backgrounds/bg7.png',
    codex:     'assets/sprites/backgrounds/bg8.png',
  },
  tiles: {
    f1: 'assets/sprites/tiles/f1.png',   // floor variant 1
    f2: 'assets/sprites/tiles/f2.png',   // floor variant 2
    w1: 'assets/sprites/tiles/w1.png',   // wall type 1
    w2: 'assets/sprites/tiles/w2.png',   // wall type 2
    g1: 'assets/sprites/tiles/g1.png',   // grass
    wt: 'assets/sprites/tiles/wt.png',   // water
    s1: 'assets/sprites/tiles/s1.png',   // stone
    e1: 'assets/sprites/tiles/e1.png',   // enemy marker
    ch: 'assets/sprites/tiles/ch.png',   // chest
    bo: 'assets/sprites/tiles/bo.png',   // boss
    dr: 'assets/sprites/tiles/dr.png',   // door
    sv: 'assets/sprites/tiles/sv.png',   // save point
    np: 'assets/sprites/tiles/np.png',   // npc
  },
  // 144 fusion portraits: w{1-12}_c{1-12}.png
  //   w = western month sign  (1=Capricorn … 12=Sagittarius)
  //   c = chinese year animal (1=Rat      … 12=Pig)
  chars: {
    oph_m:     'assets/sprites/characters/oph_m.png',
    oph_f:     'assets/sprites/characters/oph_f.png',
    lyra:      'assets/sprites/characters/lyra.png',
    ophiuchus: 'assets/sprites/characters/ophiuchus.png',
    ...Object.fromEntries(
      Array.from({ length: 12 }, (_, wi) =>
        Array.from({ length: 12 }, (_, ci) =>
          [`w${wi+1}_c${ci+1}`, `assets/sprites/characters/w${wi+1}_c${ci+1}.png`]
        )
      ).flat()
    ),
  },
  enemies: {
    s_rat:       'assets/sprites/enemies/s_rat.png',
    s_ox:        'assets/sprites/enemies/s_ox.png',
    s_tiger:     'assets/sprites/enemies/s_tiger.png',
    s_rabbit:    'assets/sprites/enemies/s_rabbit.png',
    s_dragon:    'assets/sprites/enemies/s_dragon.png',
    s_snake:     'assets/sprites/enemies/s_snake.png',
    s_horse:     'assets/sprites/enemies/s_horse.png',
    s_goat:      'assets/sprites/enemies/s_goat.png',
    s_monkey:    'assets/sprites/enemies/s_monkey.png',
    s_rooster:   'assets/sprites/enemies/s_rooster.png',
    s_dog:       'assets/sprites/enemies/s_dog.png',
    s_pig:       'assets/sprites/enemies/s_pig.png',
    chimera:     'assets/sprites/enemies/chimera.png',
    void_shard:  'assets/sprites/enemies/void_shard.png',
    ghost_flame: 'assets/sprites/enemies/ghost_flame.png',
    void_hound:  'assets/sprites/enemies/void_hound.png',
    stone_doll:  'assets/sprites/enemies/stone_doll.png',
    mirror_twin: 'assets/sprites/enemies/mirror_twin.png',
  },
  sheets: {
    // ── layer1.png: Tileset spritesheet ──────────────────────────
    //   Layout: 512 × 256 px,  32×32 per tile, 16 columns × 8 rows
    //   Row 0  (y=  0): floor variants   f1(0,0) f2(32,0) f3(64,0)…
    //   Row 1  (y= 32): wall variants    w1(0,32) w2(32,32)…
    //   Row 2  (y= 64): nature tiles     grass(0,64) water(32,64) stone(64,64)…
    //   Row 3  (y= 96): specials         enemy(0,96) chest(32,96) boss(64,96) door(96,96)…
    //   Row 4  (y=128): FX overlays      glow, shadow, aura…
    //   Row 5+ (y=160+): reserved
    tiles: 'spritesheet/layer1.png',

    // ── layer2.jpeg: Background parallax sheet ────────────────────
    //   Wide strip (2048 × 512): far BG | mid BG | near BG | overlay
    //   Scroll X to select layer, used for cinematic parallax
    bg:    'spritesheet/layer2.jpeg',

    // ── layer1.jpg: Character portrait sheet ─────────────────────
    //   Layout: 768 × 768 px,  64×64 per portrait, 12 cols × 12 rows
    //   col (x) = Chinese animal index   0=Rat … 11=Pig
    //   row (y) = Western sign index     0=Capricorn … 11=Sagittarius
    //   Portrait for w{w+1}_c{c+1} → backgroundPosition: -(c*64)px -(w*64)px
    chars: 'spritesheet/layer1.jpg',

    items: 'spritesheet/items.png',   // 16×16 item icons at 24px grid
    fx:    'spritesheet/fx.png',      // combat effect frames
  },
  ui: {
    frame:  'assets/sprites/ui/frame.png',
    cursor: 'assets/sprites/ui/cursor.png',
    hpBar:  'assets/sprites/ui/hp_bar.png',
    mpBar:  'assets/sprites/ui/mp_bar.png',
    logo:   'assets/sprites/ui/logo.png',
    badge:  'assets/sprites/ui/badge.png',
  },
};

// Tile definition map — id → { sheet grid pos, individual src, colour fallback, walk, trigger }
const TDEF = {
  0:  { pos:[0,0], src:null,       col:'#04060f', walk:false,              label:'Void'  },
  1:  { pos:[0,0], src:A.tiles.f1, col:'#161030', walk:true,               label:'Floor1'},
  2:  { pos:[1,0], src:A.tiles.f2, col:'#1a1540', walk:true,               label:'Floor2'},
  3:  { pos:[0,1], src:A.tiles.w1, col:'#231558', walk:false,              label:'Wall1' },
  4:  { pos:[1,1], src:A.tiles.w2, col:'#2d1a6e', walk:false,              label:'Wall2' },
  5:  { pos:[0,2], src:A.tiles.g1, col:'#173020', walk:true,               label:'Grass' },
  6:  { pos:[1,2], src:A.tiles.wt, col:'#082440', walk:false,              label:'Water' },
  7:  { pos:[2,2], src:A.tiles.s1, col:'#222222', walk:false,              label:'Stone' },
  8:  { pos:[0,3], src:A.tiles.e1, col:'#380e0e', walk:true,  trg:'battle',label:'Enemy' },
  9:  { pos:[1,3], src:A.tiles.ch, col:'#382400', walk:true,  trg:'chest', label:'Chest' },
  10: { pos:[2,3], src:A.tiles.bo, col:'#420018', walk:true,  trg:'boss',  label:'Boss'  },
  11: { pos:[3,3], src:A.tiles.dr, col:'#382000', walk:true,  trg:'door',  label:'Door'  },
  12: { pos:[4,3], src:A.tiles.sv, col:'#002432', walk:true,  trg:'save',  label:'Save'  },
  13: { pos:[5,3], src:A.tiles.np, col:'#003018', walk:true,  trg:'npc',   label:'NPC'   },
};

// ╔══════════════════════════════════════════════════════════════╗
//  QUATERBASE4I  —  p=00  d=01  b=10  q=11
//  Base β = 4i  (pure-imaginary quaternary)
//  ×i rotation:     p→d  d→q  q→b  b→p   (complex multiply)
//  Shadow / ~:      p↔q  d↔b            (additive complement mod 4)
//  Position weights: s[3]×(4i)³ s[2]×(4i)² s[1]×(4i) s[0]×1
//    → Re = s[0] − 16·s[2]      Im = 4·s[1] − 64·s[3]
// ╚══════════════════════════════════════════════════════════════╝
const QB4I = {
  G:   'pdbq',
  ROT: { p:'d', d:'q', q:'b', b:'p' },   // ×i
  CMP: { p:'q', d:'b', b:'d', q:'p' },   // shadow complement

  enc(n) {
    n = Math.abs(Math.round(n)) & 0xFF;
    return [(n>>6)&3,(n>>4)&3,(n>>2)&3,n&3].map(v=>this.G[v]).join('');
  },
  dec(s) {
    return [...s].reduce((a,c,i)=>a|(this.G.indexOf(c)<<(6-i*2)), 0);
  },
  imag(s)      { return [...s].map(g=>this.ROT[g]??g).join(''); },  // ×i
  shadow(s)    { return [...s].map(g=>this.CMP[g]??g).join(''); },  // ~
  resonance(s) { return this.dec(this.imag(s)); },

  // Complex base-4i value → [Re, Im] components
  complex(s) {
    const d = [...s].map(g=>this.G.indexOf(g));
    const re = d[3] - 16*d[1];
    const im = 4*d[2] - 64*d[0];
    return [re, im];
  },

  sig(p) {
    return ['ATK','DEF','SPD','HP','MP','LCK']
      .map(k=>`${k}:${this.enc(p.stats[k]||0)}`).join(' │ ');
  },
  shadowPow(p) {
    return Math.round(
      ['ATK','DEF','SPD','HP']
        .reduce((a,k)=>a+this.resonance(this.enc(p.stats[k]||0)),0)/4
    );
  },

  // printf-style formatter — %q = QB4I strand, %i = imaginary transform
  pf(fmt, ...args) {
    let ai = 0;
    return fmt.replace(/%([dsfqxi%])/g, (_, sp) => {
      if (sp==='%') return '%';
      const v = args[ai++];
      if (sp==='d') return Math.round(+v);
      if (sp==='s') return String(v);
      if (sp==='f') return (+v).toFixed(2);
      if (sp==='q') return this.enc(+v);                // quaterbase4i strand
      if (sp==='x') return (+v).toString(16).padStart(2,'0').toUpperCase();
      if (sp==='i') return this.imag(String(v));        // imaginary rotation
      return '?';
    });
  },
};

// ╔══════════════════════════════════════════════════════════════╗
//  printf() VM  —  SECRET DEBUG CONSOLE
//  Activation: type "printf" in name field   OR   tap ⚕ 5×
//  256-byte Uint8Array memory,  QB4I strand view over all output
// ╚══════════════════════════════════════════════════════════════╝
const createVM = () => {
  const mem = new Uint8Array(256);
  for (let i=0; i<256; i++) mem[i] = i;   // identity init
  const vm = {
    mem,
    hist:  [],
    lines: [],
    log(ln) { vm.lines = [...vm.lines.slice(-35), ln]; },
    exec(raw, player) {
      if (!raw.trim()) return;
      vm.hist = [raw, ...vm.hist.slice(0,24)];
      vm.log(`<G>&gt; ${raw.replace(/</g,'&lt;')}</G>`);
      const pts = raw.trim().split(/\s+/);
      const op  = pts[0].toLowerCase();

      if (op === 'printf') {
        const m = raw.match(/printf\("([^"]*)"(,(.+))?\)/);
        if (!m) { vm.log('Usage: printf("fmt %d %q", ATK, 42)'); return; }
        const fmt = m[1], argStr = m[3]||'';
        const args = argStr.split(',').map(s=>{
          s = s.trim().replace(/['"]/g,'');
          if (player?.stats?.[s] !== undefined) return player.stats[s];
          if (!isNaN(s)) return Number(s);
          return s;
        }).filter(Boolean);
        vm.log(QB4I.pf(fmt, ...args));
        return;
      }

      switch (op) {
        case 'help':
          [
            'printf("fmt"[,args])  — QB4I-aware formatted print',
            'encode &lt;0-255&gt;       — byte → p/d/b/q strand',
            'decode &lt;strand&gt;      — strand → int + [Re,Im]',
            'imag &lt;strand&gt;        — ×i imaginary rotation',
            'shadow &lt;strand&gt;      — additive complement (~)',
            'complex &lt;strand&gt;     — base-4i complex components',
            'sig                  — player genetic signature',
            'stats                — all stats as QB4I strands',
            'dump                 — 256-byte mem as hex + strand',
            'write &lt;addr&gt; &lt;val&gt;  — poke byte into VM memory',
            'read &lt;addr&gt;          — peek byte from VM memory',
            'cheat &lt;hp|mp|xp&gt;    — restore resource',
            'clear                — clear console output',
          ].forEach(l => vm.log(`<D>  ${l}</D>`));
          break;

        case 'encode': {
          const n = parseInt(pts[1]);
          if (isNaN(n)) { vm.log('encode &lt;0–255&gt;'); break; }
          const s = QB4I.enc(n);
          vm.log(`${n.toString().padStart(3)} → <b>${s}</b>  ×i:<P>${QB4I.imag(s)}</P>  ~:<T>${QB4I.shadow(s)}</T>`);
          break;
        }
        case 'decode': {
          const s = pts[1]||'';
          if (!/^[pdbq]+$/.test(s)) { vm.log('decode &lt;pdbq…&gt;'); break; }
          const [re,im] = QB4I.complex(s);
          vm.log(`${s} → ${QB4I.dec(s)}  resonance:<P>${QB4I.resonance(s)}</P>  [Re=${re} Im=${im}i]`);
          break;
        }
        case 'imag':
          vm.log(`imag(<b>${pts[1]}</b>) = <P>${QB4I.imag(pts[1]||'pdbq')}</P>`); break;
        case 'shadow':
          vm.log(`shadow(<b>${pts[1]}</b>) = <T>${QB4I.shadow(pts[1]||'pdbq')}</T>`); break;
        case 'complex': {
          const s = pts[1]||'pppp';
          const [re,im] = QB4I.complex(s);
          vm.log(`${s} → Re=<G>${re}</G>  Im=<P>${im}i</P>`);
          break;
        }
        case 'sig':
          if (!player) { vm.log('No player loaded.'); break; }
          vm.log(`<Y>◈ ${player.name} Genetic Signature:</Y>`);
          vm.log(QB4I.sig(player));
          vm.log(`Shadow Resonance: <P>${QB4I.shadowPow(player)}</P>`);
          break;
        case 'stats':
          if (!player) { vm.log('No player.'); break; }
          ['HP','MP','ATK','DEF','SPD','LCK'].forEach(k=>{
            const v=player.stats[k]||0, s=QB4I.enc(v), [re,im]=QB4I.complex(s);
            vm.log(`<b>${k.padEnd(4)}</b>${String(v).padStart(3)} → <b>${s}</b>  ×i:<P>${QB4I.imag(s)}</P>  Re=${re} Im=${im}i`);
          });
          break;
        case 'dump':
          vm.log('<Y>◈ VM MEMORY — 256 bytes  (hex  │  QB4I strand)</Y>');
          for (let i=0; i<256; i+=8) {
            const h = Array.from({length:8},(_,j)=>vm.mem[i+j].toString(16).padStart(2,'0')).join(' ');
            const s = Array.from({length:8},(_,j)=>QB4I.enc(vm.mem[i+j])).join(' ');
            vm.log(`<D>0x${i.toString(16).padStart(2,'0')}</D>  ${h}  <P>${s}</P>`);
          }
          break;
        case 'write': {
          const addr=parseInt(pts[1],16)||parseInt(pts[1]), val=parseInt(pts[2]);
          if (isNaN(addr)||isNaN(val)) { vm.log('write &lt;addr&gt; &lt;val&gt;'); break; }
          vm.mem[addr&0xFF] = val&0xFF;
          vm.log(`mem[0x${(addr&0xFF).toString(16).padStart(2,'0')}] ← ${val}  <G>(${QB4I.enc(val)})</G>`);
          break;
        }
        case 'read': {
          const addr=parseInt(pts[1],16)||parseInt(pts[1]), v=vm.mem[addr&0xFF];
          vm.log(`mem[0x${(addr&0xFF).toString(16).padStart(2,'0')}] = ${v}  <G>(${QB4I.enc(v)})</G>`);
          break;
        }
        case 'cheat':
          if (!player) { vm.log('No player.'); break; }
          if (pts[1]==='hp') { player.stats.HP=player.stats.maxHP; vm.log('<T>HP fully restored.</T>'); }
          else if (pts[1]==='mp') { player.stats.MP=player.stats.maxMP; vm.log('<P>MP fully restored.</P>'); }
          else if (pts[1]==='xp') { player.exp=player.expNext-1; vm.log('<Y>EXP maxed.</Y>'); }
          else vm.log('cheat &lt;hp|mp|xp&gt;');
          break;
        case 'clear':
          vm.lines = []; break;
        default:
          vm.log(`<R>Unknown: ${op}  —  type "help"</R>`);
      }
    },
  };
  return vm;
};

// ╔══════════════════════════════════════════════════════════════╗
//  ZODIAC DATA  —  Western (monthly) × Chinese (yearly) = 144
// ╚══════════════════════════════════════════════════════════════╝
const WZ = [null,
  {m:1, name:'Capricorn',   sym:'♑',el:'Earth',q:'Cardinal',ic:'🏔️',c:'#8B7355',desc:'Mountain Sovereign — enduring, ambitious'},
  {m:2, name:'Aquarius',    sym:'♒',el:'Air',  q:'Fixed',   ic:'⚡',c:'#5B8DCC',desc:'Storm Rebel — visionary, revolutionary'},
  {m:3, name:'Pisces',      sym:'♓',el:'Water',q:'Mutable', ic:'🌊',c:'#5CC8CC',desc:'Dream Drifter — mystical, empathic'},
  {m:4, name:'Aries',       sym:'♈',el:'Fire', q:'Cardinal',ic:'🔥',c:'#CC4444',desc:'War Spark — bold, pioneering'},
  {m:5, name:'Taurus',      sym:'♉',el:'Earth',q:'Fixed',   ic:'🌿',c:'#7B9B4C',desc:'Iron Root — steadfast, resolute'},
  {m:6, name:'Gemini',      sym:'♊',el:'Air',  q:'Mutable', ic:'💫',c:'#CCBB44',desc:'Twin Wind — quick, mercurial'},
  {m:7, name:'Cancer',      sym:'♋',el:'Water',q:'Cardinal',ic:'🌙',c:'#9999CC',desc:'Moon Tide — protective, intuitive'},
  {m:8, name:'Leo',         sym:'♌',el:'Fire', q:'Fixed',   ic:'☀️',c:'#DDA000',desc:'Solar Mane — regal, passionate'},
  {m:9, name:'Virgo',       sym:'♍',el:'Earth',q:'Mutable', ic:'🌾',c:'#88AA66',desc:'Harvest Mind — precise, devoted'},
  {m:10,name:'Libra',       sym:'♎',el:'Air',  q:'Cardinal',ic:'⚖️',c:'#CC88BB',desc:'Scale Wind — just, harmonious'},
  {m:11,name:'Scorpio',     sym:'♏',el:'Water',q:'Fixed',   ic:'🦂',c:'#882244',desc:'Deep Sting — intense, transformative'},
  {m:12,name:'Sagittarius', sym:'♐',el:'Fire', q:'Mutable', ic:'🏹',c:'#CC7733',desc:'Arrow Star — adventurous, philosophical'},
];
const CZ = [
  {i:0, name:'Rat',    el:'Water',ic:'🐀',yang:true, desc:'Cunning, adaptive, resourceful'},
  {i:1, name:'Ox',     el:'Earth',ic:'🐂',yang:false,desc:'Tireless, determined, immovable'},
  {i:2, name:'Tiger',  el:'Wood', ic:'🐅',yang:true, desc:'Fearless, confident, commanding'},
  {i:3, name:'Rabbit', el:'Wood', ic:'🐇',yang:false,desc:'Swift, graceful, keeper of secrets'},
  {i:4, name:'Dragon', el:'Earth',ic:'🐉',yang:true, desc:'Divine power, shaper of fate'},
  {i:5, name:'Snake',  el:'Fire', ic:'🐍',yang:false,desc:'Coiled wisdom, seeker of truth'},
  {i:6, name:'Horse',  el:'Fire', ic:'🐴',yang:true, desc:'Wild freedom, thundering spirit'},
  {i:7, name:'Goat',   el:'Earth',ic:'🐐',yang:false,desc:'Creative calm, healer\'s strength'},
  {i:8, name:'Monkey', el:'Metal',ic:'🐒',yang:true, desc:'Brilliant trickster, innovator'},
  {i:9, name:'Rooster',el:'Metal',ic:'🐓',yang:false,desc:'Keen observer, unyielding honor'},
  {i:10,name:'Dog',    el:'Earth',ic:'🐕',yang:true, desc:'Loyal guardian, faithful heart'},
  {i:11,name:'Pig',    el:'Water',ic:'🐖',yang:false,desc:'Generous spirit, deep compassion'},
];

// Shadow boss roster
const SB = [
  {id:'s_rat',   name:'Shadow Rat',    ic:'🐀',src:A.enemies.s_rat,   stats:{HP:210,ATK:40,DEF:18,SPD:44,MP:60}},
  {id:'s_ox',    name:'Shadow Ox',     ic:'🐂',src:A.enemies.s_ox,    stats:{HP:290,ATK:52,DEF:42,SPD:18,MP:40}},
  {id:'s_tiger', name:'Shadow Tiger',  ic:'🐅',src:A.enemies.s_tiger, stats:{HP:240,ATK:58,DEF:26,SPD:46,MP:50}},
  {id:'s_rabbit',name:'Shadow Rabbit', ic:'🐇',src:A.enemies.s_rabbit,stats:{HP:195,ATK:43,DEF:22,SPD:58,MP:82}},
  {id:'s_dragon',name:'Shadow Dragon', ic:'🐉',src:A.enemies.s_dragon,stats:{HP:330,ATK:68,DEF:36,SPD:30,MP:95}},
  {id:'s_snake', name:'Shadow Snake',  ic:'🐍',src:A.enemies.s_snake, stats:{HP:215,ATK:49,DEF:30,SPD:38,MP:105}},
  {id:'s_horse', name:'Shadow Horse',  ic:'🐴',src:A.enemies.s_horse, stats:{HP:245,ATK:60,DEF:22,SPD:62,MP:46}},
  {id:'s_goat',  name:'Shadow Goat',   ic:'🐐',src:A.enemies.s_goat,  stats:{HP:205,ATK:46,DEF:48,SPD:24,MP:78}},
  {id:'s_monkey',name:'Shadow Monkey', ic:'🐒',src:A.enemies.s_monkey,stats:{HP:225,ATK:54,DEF:28,SPD:52,MP:88}},
  {id:'s_rooster',name:'Shadow Rooster',ic:'🐓',src:A.enemies.s_rooster,stats:{HP:235,ATK:58,DEF:38,SPD:35,MP:62}},
  {id:'s_dog',   name:'Shadow Dog',    ic:'🐕',src:A.enemies.s_dog,   stats:{HP:255,ATK:54,DEF:44,SPD:32,MP:56}},
  {id:'s_pig',   name:'Shadow Pig',    ic:'🐖',src:A.enemies.s_pig,   stats:{HP:265,ATK:48,DEF:40,SPD:22,MP:92}},
  {id:'chimera', name:'Shadow Chimera',ic:'🌑',src:A.enemies.chimera, stats:{HP:900,ATK:92,DEF:72,SPD:56,MP:220},isFinal:true},
];

// ── Master System Engine (from ORB APP) ──────────────────────
const MSE = {
  calcDegree: (name) => {
    const sum = name.split('').reduce((a,c)=>a+c.charCodeAt(0), 0);
    return sum % 360;
  },
  getCorrespondences: (deg) => {
    const DAYS    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const PLANETS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
    const CHAKRAS = ['Root','Sacral','Solar','Heart','Throat','Third Eye','Crown'];
    const i = Math.floor(deg / (360/7));
    return { day: DAYS[i], planet: PLANETS[i], chakra: CHAKRAS[i], idx: i };
  },
  // QB4I-encoded degree → genetic arc
  geneticArc: (deg) => QB4I.enc(Math.round(deg) & 0xFF),
};

// ── Character generation ─────────────────────────────────────
const EL_BONUS = {
  Fire:{ATK:15,SPD:8}, Earth:{DEF:15,HP:12},
  Air:{SPD:15,LCK:8},  Water:{MP:15,DEF:8},
  Wood:{HP:15,ATK:8},  Metal:{LCK:15,ATK:10},
};
const Q_MUL = { Cardinal:1.1, Fixed:1.15, Mutable:1.05 };

function genChar(month, year, gender, name) {
  const w = WZ[parseInt(month)];
  const ci = ((parseInt(year)-1900)%12+12)%12;
  const c = CZ[ci];
  let s = {HP:100,MP:50,ATK:25,DEF:22,SPD:22,LCK:12};
  [EL_BONUS[w.el]||{}, EL_BONUS[c.el]||{}].forEach(b=>{
    Object.entries(b).forEach(([k,v])=>s[k]=(s[k]||0)+v);
  });
  const qm = Q_MUL[w.q]||1;
  s.ATK=Math.round(s.ATK*qm); s.DEF=Math.round(s.DEF*qm); s.SPD=Math.round(s.SPD*qm);
  if (gender==='F') { s.MP+=10; s.LCK+=5; } else { s.HP+=10; s.ATK+=5; }
  s.maxHP=s.HP; s.maxMP=s.MP;

  const ELS = {
    Fire:['fire_strike','fire_aoe'], Earth:['earth_shield','earth_quake'],
    Air:['air_slash','air_dodge'],   Water:['water_heal','water_drain'],
    Wood:['wood_grow','wood_thorn'], Metal:['metal_cut','metal_luck'],
  };
  const sk = [...(ELS[w.el]||[])];
  if (c.el!==w.el && ELS[c.el]) sk.push(ELS[c.el][0]);
  sk.push('serpent_bind');

  // QB4I genetic signature
  const sig = QB4I.sig({stats:s});
  const deg = MSE.calcDegree(name||'Hero');
  const { planet, chakra, day } = MSE.getCorrespondences(deg);

  return {
    name:name||'Hero', gender, month:parseInt(month), year:parseInt(year),
    w, c, title:`The ${w.name}-${c.name}`,
    stats:s, skills:sk.slice(0,4),
    level:1, exp:0, expNext:100, wins:0, taint:0,
    items:[{id:'potion',name:'Healing Draught',uses:3}],
    // ORB data
    orbDeg:deg, planet, chakra, day,
    geneticArc:MSE.geneticArc(deg),
    sig,
    // Asset path for this specific 144-combo portrait
    portrait: A.chars[`w${parseInt(month)}_c${ci+1}`],
    // Spritesheet position on layer1.jpg
    sheetPos: { x: ci * 64, y: (parseInt(month)-1) * 64 },
  };
}

// ╔══════════════════════════════════════════════════════════════╗
//  UI COMPONENTS
// ╚══════════════════════════════════════════════════════════════╝

// Sprite from sheet: uses backgroundPosition on layer src
const SheetSprite = React.memo(({ sheet, sx, sy, sw=64, sh=64, scale=1, alt='' }) => (
  <div title={alt} style={{
    width:sw*scale, height:sh*scale, flexShrink:0,
    backgroundImage:`url(${sheet})`,
    backgroundPosition:`-${sx}px -${sy}px`,
    backgroundSize:'auto',
    imageRendering:'pixelated',
  }} />
));

// Individual PNG sprite with emoji fallback
const CharImg = React.memo(({ src, fallback, size=64, alt='' }) => {
  const [ok, setOk] = useState(true);
  return ok
    ? <img src={src} alt={alt} width={size} height={size}
           style={{imageRendering:'pixelated',objectFit:'cover'}}
           onError={()=>setOk(false)} />
    : <span style={{fontSize:size*.55,lineHeight:1,display:'block',textAlign:'center'}}>{fallback}</span>;
});

// Tile with individual PNG + spritesheet fallback + colour fallback
const TileCell = React.memo(({ id, ts=40 }) => {
  const td = TDEF[id] || TDEF[0];
  const [imgOk, setImgOk] = useState(!!td.src);
  return (
    <div style={{ width:ts, height:ts, flexShrink:0, position:'relative',
                  backgroundColor:td.col, overflow:'hidden' }}>
      {imgOk && td.src &&
        <img src={td.src} alt={td.label} width={ts} height={ts}
             style={{position:'absolute',inset:0,objectFit:'cover',imageRendering:'pixelated'}}
             onError={()=>setImgOk(false)} />
      }
      {!imgOk && td.pos &&
        <SheetSprite sheet={A.sheets.tiles}
          sx={td.pos[0]*32} sy={td.pos[1]*32} sw={32} sh={32} scale={ts/32} alt={td.label} />
      }
    </div>
  );
});

// Background layer with PNG + parallax hint
const BgLayer = ({ src, children, style={} }) => (
  <div style={{
    position:'relative', width:'100%', height:'100%', overflow:'hidden',
    backgroundImage:`url(${src})`,
    backgroundSize:'cover', backgroundPosition:'center',
    ...style,
  }}>
    {children}
  </div>
);

// Radial cosmic ring (from original ORB APP)
const OrbRing = ({ degree, name }) => {
  const rings = [1,2,3,4,5,6,7];
  const gArc = MSE.geneticArc(degree);
  return (
    <div className="relative w-full max-w-xs aspect-square mx-auto">
      <svg viewBox="0 0 300 300" className="w-full h-full">
        {rings.map((r,i) => (
          <circle key={r} cx={150} cy={150} r={25+i*22}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"
            strokeDasharray="3 3" />
        ))}
        <line x1={150} y1={150} x2={150} y2={30}
          stroke="#d4a017" strokeWidth="3" strokeLinecap="round"
          style={{ transformOrigin:'150px 150px', transform:`rotate(${degree}deg)` }} />
        <circle cx={150} cy={150} r={18} fill="rgba(0,0,0,0.6)" stroke="#8b3fe8" strokeWidth="1"/>
        <text x={150} y={154} textAnchor="middle" fill="#d4a017" fontSize="9" fontFamily="monospace">
          {gArc}
        </text>
      </svg>
      <div style={{position:'absolute',bottom:0,width:'100%',textAlign:'center',
                   fontSize:'.7rem',color:'#8b3fe8',letterSpacing:'.15em',fontFamily:'monospace'}}>
        QB4I arc: <b>{gArc}</b>  ×i: <b style={{color:'#1aaf8c'}}>{QB4I.imag(gArc)}</b>
      </div>
    </div>
  );
};

// HP/MP bar
const ResourceBar = ({ cur, max, color='#1aaf8c', label, small }) => (
  <div style={{marginBottom:'.3rem'}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:small?'.6rem':'.7rem',
                 color:'#6a5a90',marginBottom:'.15rem'}}>
      <span>{label}</span><span>{Math.max(0,cur)}/{max}</span>
    </div>
    <div style={{height:small?7:9,background:'rgba(255,255,255,.07)',borderRadius:5,overflow:'hidden'}}>
      <div style={{height:'100%',background:color,borderRadius:5,
                   width:`${Math.max(0,Math.min(100,(cur/max)*100))}%`,transition:'width .4s'}} />
    </div>
  </div>
);

// VM console line renderer — interprets colour tags
const VMLine = ({ html }) => (
  <div style={{fontFamily:'monospace',fontSize:'.75rem',lineHeight:1.5,
               whiteSpace:'pre-wrap',wordBreak:'break-all'}}
    dangerouslySetInnerHTML={{
      __html: html
        .replace(/<G>/g,'<span style="color:#1aaf8c">')
        .replace(/<T>/g,'<span style="color:#1aaf8c">')
        .replace(/<P>/g,'<span style="color:#8b3fe8">')
        .replace(/<Y>/g,'<span style="color:#d4a017">')
        .replace(/<R>/g,'<span style="color:#e74c3c">')
        .replace(/<D>/g,'<span style="color:#6a5a90">')
        .replace(/<b>/g,'<b>').replace(/<\/b>/g,'</b>')
        .replace(/<\/(G|T|P|Y|R|D)>/g,'</span>')
    }}
  />
);

// ╔══════════════════════════════════════════════════════════════╗
//  ERROR BOUNDARY
// ╚══════════════════════════════════════════════════════════════╝
class ErrorBoundary extends React.Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e,i) { console.error(e,i); }
  render() {
    if (this.state.err)
      return <div style={{padding:'2rem',color:'#e74c3c',textAlign:'center'}}>
        Cosmic disturbance. Refresh to restore the realm.</div>;
    return this.props.children;
  }
}

// ╔══════════════════════════════════════════════════════════════╗
//  MAIN APP
// ╚══════════════════════════════════════════════════════════════╝
const DEF_MAP = [
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,1,1,1,1,1,1,1,1,1,1,1,1,1,3],
  [3,1,5,5,13,1,1,1,1,1,1,1,1,1,3],
  [3,1,5,5,1,3,3,3,1,1,1,1,1,1,3],
  [3,1,1,1,1,3,8,3,1,1,5,8,5,1,3],
  [3,1,1,1,1,1,1,1,1,1,5,5,5,1,3],
  [3,1,1,1,1,1,1,1,1,1,1,1,9,1,3],
  [3,1,8,1,1,1,1,12,1,1,1,1,1,1,3],
  [3,1,1,1,1,1,1,1,1,1,1,1,1,1,3],
  [3,1,1,1,1,3,3,11,3,3,1,1,8,1,3],
  [3,1,1,1,1,3,1,1,1,3,1,1,1,1,3],
  [3,1,1,9,1,3,1,10,1,3,1,1,1,1,3],
  [3,1,1,1,1,3,3,3,3,3,1,1,1,1,3],
  [3,1,1,1,1,1,1,1,1,1,1,1,1,1,3],
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
];

export default function OphiuchusOrbApp() {
  const [tab, setTab]           = useState('orb');
  const [screen, setScreen]     = useState('menu');
  const [player, setPlayer]     = useState(null);
  const [form, setForm]         = useState({name:'',month:7,year:1990,gender:'M'});
  const [map, setMap]           = useState(DEF_MAP.map(r=>[...r]));
  const [pp, setPP]             = useState({x:1,y:1});
  const [battle, setBattle]     = useState(null);
  const [chapter, setChapter]   = useState(1);
  const [flags, setFlags]       = useState({});
  const [logLines, setLogLines] = useState(['Prepare for battle!']);
  const [vmOpen, setVmOpen]     = useState(false);
  const [vmInput, setVmInput]   = useState('');
  const [vmTick, setVmTick]     = useState(0);  // force re-render
  const [orbInput, setOrbInput] = useState('Ophiuchus');
  const [orbTab, setOrbTab]     = useState('Natal');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [tgtDate, setTgtDate]   = useState(new Date().toISOString().split('T')[0]);
  const [codexWest, setCodexWest] = useState(0);
  const [taps, setTaps]         = useState(0);
  const [edMap, setEdMap]       = useState(DEF_MAP.map(r=>[...r]));
  const [editTile, setEditTile] = useState(1);
  const [diff, setDiff]         = useState(1.0);
  const [notify, setNotify]     = useState('');
  const [bossIdx, setBossIdx]   = useState(0);

  const [vm] = useState(()=>createVM());
  const vmOutRef = useRef(null);

  // ── Notification ───────────────────────────────────────────
  const toast = useCallback((msg, ms=2200) => {
    setNotify(msg);
    setTimeout(()=>setNotify(''),ms);
  },[]);

  // ── Secret trigger: tap ⚕ 5× or type "printf" ──────────────
  const handleSecretTap = () => {
    const n = taps+1; setTaps(n);
    if (n>=5) {
      setTaps(0); setVmOpen(true);
      vm.log('<Y>◈ OPHIUCHUS printf() VM — ONLINE</Y>');
      vm.log('<G>quaterbase4i: p=00  d=01  b=10  q=11</G>');
      vm.log('<D>type "help" for all commands</D>');
      setVmTick(t=>t+1);
    }
  };

  const handleNameKey = (val) => {
    setForm(f=>({...f,name:val}));
    if (val.toLowerCase().endsWith('printf')) {
      setVmOpen(true);
      vm.log('<Y>◈ printf() VM — activated via name field!</Y>');
      setVmTick(t=>t+1);
    }
  };

  // ── VM exec ────────────────────────────────────────────────
  const runVM = () => {
    if (!vmInput.trim()) return;
    vm.exec(vmInput.trim(), player);
    setVmTick(t=>t+1);
    setVmInput('');
    if (vmOutRef.current) setTimeout(()=>{ vmOutRef.current.scrollTop=99999; },50);
  };

  // ── Character generation ───────────────────────────────────
  const preview = useMemo(()=>{
    if (!form.month||!form.year) return null;
    return genChar(form.month,form.year,form.gender,form.name||'Hero');
  },[form]);

  const confirmChar = () => {
    if (!form.name.trim()) { toast('Enter your name!'); return; }
    const p = genChar(form.month,form.year,form.gender,form.name);
    setPlayer(p); setScreen('world'); setTab('game');
    toast(`${p.title} — ${p.planet} / ${p.chakra}`);
  };

  // ── World movement ─────────────────────────────────────────
  const mv = useCallback((dx,dy)=>{
    setPP(prev=>{
      const nx=prev.x+dx, ny=prev.y+dy;
      if (ny<0||ny>=map.length||nx<0||nx>=map[0].length) return prev;
      const td=TDEF[map[ny][nx]];
      if (!td?.walk) return prev;
      // handle trigger
      if (td.trg) setTimeout(()=>handleTrigger(td.trg,nx,ny),0);
      return {x:nx,y:ny};
    });
  },[map]);

  const handleTrigger = (trg,x,y) => {
    if (trg==='battle') {
      const wp=['void_shard','ghost_flame','void_hound','stone_doll','mirror_twin'];
      const eid=wp[Math.floor(Math.random()*wp.length)];
      setMap(m=>{ const nm=m.map(r=>[...r]); nm[y][x]=1; return nm; });
      startBattle(eid);
    } else if (trg==='boss') {
      const b=SB[bossIdx%SB.length];
      setMap(m=>{ const nm=m.map(r=>[...r]); nm[y][x]=1; return nm; });
      startBattle(b.id);
    } else if (trg==='chest') {
      setMap(m=>{ const nm=m.map(r=>[...r]); nm[y][x]=1; return nm; });
      toast('📦 Found Healing Draughts ×2!');
      setPlayer(p=>p?{...p,items:p.items.map(it=>it.id==='potion'?{...it,uses:it.uses+2}:it)}:p);
    } else if (trg==='save') {
      localStorage.setItem('oph_save',JSON.stringify({player,map,pp,chapter,bossIdx,flags}));
      toast('💾 Saved!');
    } else if (trg==='npc') {
      toast('👤 Ophiuchus: "The shadow grows stronger. Choose wisely."');
    } else if (trg==='door') {
      toast('🚪 Advancing...'); setTimeout(()=>setChapter(ch=>ch+1),800);
    }
  };

  // ── Battle ─────────────────────────────────────────────────
  const allEnemies = useMemo(()=>[
    {id:'void_shard', name:'Void Shard',   ic:'💠',src:A.enemies.void_shard,  stats:{HP:85,ATK:22,DEF:10,SPD:28,MP:20}},
    {id:'ghost_flame',name:'Ghost Flame',  ic:'🕯️',src:A.enemies.ghost_flame, stats:{HP:95,ATK:28,DEF:8, SPD:32,MP:42}},
    {id:'void_hound', name:'Void Hound',   ic:'🐾',src:A.enemies.void_hound,  stats:{HP:125,ATK:34,DEF:15,SPD:36,MP:16}},
    {id:'stone_doll', name:'Stone Doll',   ic:'🗿',src:A.enemies.stone_doll,  stats:{HP:155,ATK:26,DEF:42,SPD:8, MP:12}},
    {id:'mirror_twin',name:'Mirror Twin',  ic:'🪞',src:A.enemies.mirror_twin, stats:{HP:105,ATK:36,DEF:18,SPD:30,MP:62}},
    ...SB,
  ],[]);

  const startBattle = (eid) => {
    const tmpl = allEnemies.find(e=>e.id===eid);
    if (!tmpl) return;
    const en = { ...tmpl, stats:{...tmpl.stats,maxHP:Math.round(tmpl.stats.HP*diff)},
                  HP:Math.round(tmpl.stats.HP*diff) };
    en.stats.maxHP = en.HP;
    setBattle({en, pBufs:{}, eBufs:{}, pDot:0, eDot:0, pRegen:0, turn:1});
    setLogLines([`⚔️ ${en.name} appears!`]);
    setScreen('battle'); setTab('game');
  };

  const addLog = (l) => setLogLines(prev=>[...prev.slice(-3),l]);

  const doAttack = () => {
    if (!battle||!player) return;
    const {en,pBufs} = battle;
    const atk = Math.round(player.stats.ATK*(pBufs.ATK||1));
    const def = en.stats.DEF*(battle.eBufs?.DEF||1);
    const dmg = Math.max(1,Math.round((atk-def*.45)*(0.85+Math.random()*.3)));
    const newHP = en.HP-dmg;
    addLog(`⚔️ You deal <b>${dmg}</b> to ${en.name}!`);
    if (newHP<=0) {
      addLog(`<span style="color:#d4a017">✨ Victory! +${Math.round(en.stats.maxHP*.5)} EXP</span>`);
      const expGain=Math.round(en.stats.maxHP*.5);
      setPlayer(p=>{
        const np={...p,exp:p.exp+expGain,wins:(p.wins||0)+1};
        np.stats={...np.stats,HP:Math.min(np.stats.maxHP,np.stats.HP+Math.round(np.stats.maxHP*.2))};
        return np;
      });
      setBossIdx(bi=>SB.find(b=>b.id===battle.en.id)?bi+1:bi);
      setTimeout(()=>{setBattle(null);setScreen('world');},1400);
      return;
    }
    // Enemy counter
    const eDmg = Math.max(1,Math.round((en.stats.ATK-player.stats.DEF*.4)*(0.85+Math.random()*.3)));
    addLog(`${en.ic} ${en.name} hits for <span style="color:#e74c3c">${eDmg}</span>!`);
    setBattle(b=>({...b,en:{...b.en,HP:newHP}}));
    setPlayer(p=>{
      const np={...p,stats:{...p.stats,HP:Math.max(0,p.stats.HP-eDmg)}};
      if (np.stats.HP<=0) {
        addLog(`<span style="color:#e74c3c">💀 Defeated. Rise again…</span>`);
        np.stats.HP=Math.round(np.stats.maxHP*.5);
        setTimeout(()=>{setBattle(null);setScreen('world');},1600);
      }
      return np;
    });
  };

  const doHeal = () => {
    if (!player) return;
    const pot=player.items.find(i=>i.id==='potion'&&i.uses>0);
    if (!pot) { toast('No items!'); return; }
    const h=Math.round(player.stats.maxHP*.4);
    setPlayer(p=>({...p,stats:{...p.stats,HP:Math.min(p.stats.maxHP,p.stats.HP+h)},
                   items:p.items.map(it=>it.id==='potion'?{...it,uses:it.uses-1}:it)}));
    addLog(`🧪 Healed <span style="color:#1aaf8c">+${h} HP</span>!`);
  };

  // ── Tilemap sub-component ──────────────────────────────────
  const MapView = useMemo(()=>{
    if (!player) return null;
    const TS=38, ROWS=map.length, COLS=map[0].length;
    const visR=Math.ceil(360/TS), visC=Math.ceil(320/TS);
    const startY=Math.max(0,Math.min(ROWS-visR,pp.y-Math.floor(visR/2)));
    const startX=Math.max(0,Math.min(COLS-visC,pp.x-Math.floor(visC/2)));
    return {TS,ROWS,COLS,visR,visC,startY,startX};
  },[map,pp,player]);

  // ── ORB APP data ───────────────────────────────────────────
  const orbDeg   = useMemo(()=>MSE.calcDegree(orbInput),[orbInput]);
  const orbCorr  = useMemo(()=>MSE.getCorrespondences(orbDeg),[orbDeg]);
  const orbArc   = useMemo(()=>MSE.geneticArc(orbDeg),[orbDeg]);

  // ── Codex ─────────────────────────────────────────────────
  const codexChars = useMemo(()=>
    Array.from({length:12},(_,wi)=>
      Array.from({length:12},(_,ci)=>({
        wi,ci,
        west:WZ[wi+1],chin:CZ[ci],
        key:`w${wi+1}_c${ci+1}`,
        src:A.chars[`w${wi+1}_c${ci+1}`],
        sheetPos:{x:ci*64,y:wi*64},
        title:`${WZ[wi+1]?.name}-${CZ[ci]?.name}`,
        strand:QB4I.enc(((wi+1)*13+(ci)*7)&0xFF),
      }))
    ).flat()
  ,[]);

  // ═══════════════════════ RENDER ═══════════════════════════
  const style = {
    app:{ minHeight:'100vh',background:'#04060f',color:'#ddd0a8',
          fontFamily:'Georgia,serif',userSelect:'none' },
    header:{ display:'flex',justifyContent:'space-between',alignItems:'center',
             padding:'.6rem 1rem',borderBottom:'1px solid #261660',
             background:'rgba(4,6,15,.97)',position:'sticky',top:0,zIndex:50 },
    tabBar:{ display:'flex',gap:'.5rem' },
    tabBtn:(active)=>({
      padding:'.3rem .75rem',borderRadius:3,fontSize:'.78rem',cursor:'pointer',
      border:`1px solid ${active?'#8b3fe8':'#261660'}`,
      background:active?'rgba(139,63,232,.3)':'rgba(38,22,96,.15)',
      color:active?'#b048e8':'#6a5a90',letterSpacing:'.05em',transition:'all .15s',
    }),
    panel:{ background:'rgba(11,8,32,.9)',border:'1px solid #261660',borderRadius:5,padding:'.85rem' },
    gold:{ color:'#d4a017' }, purple:{ color:'#8b3fe8' }, teal:{ color:'#1aaf8c' },
    dim:{ color:'#6a5a90' }, red:{ color:'#e74c3c' },
    sectionTitle:{ color:'#d4a017',fontSize:'.7rem',letterSpacing:'.15em',
                   textTransform:'uppercase',borderBottom:'1px solid #261660',
                   paddingBottom:'.2rem',marginBottom:'.5rem' },
  };

  const TABS = ['orb','game','codex','editor','vm'];

  return (
    <ErrorBoundary>
    <div style={style.app}>

      {/* ── NOTIFICATION ── */}
      {notify && (
        <div style={{position:'fixed',top:'1rem',left:'50%',transform:'translateX(-50%)',
                     background:'rgba(11,8,32,.97)',border:'1px solid #d4a017',color:'#d4a017',
                     padding:'.4rem .9rem',borderRadius:4,fontSize:'.82rem',zIndex:999,
                     whiteSpace:'nowrap',letterSpacing:'.04em'}}>
          {notify}
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={style.header}>
        <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
          <img src={A.ui.logo} alt="logo" width={28} height={28}
               style={{imageRendering:'pixelated'}} onError={e=>e.target.style.display='none'} />
          <button onClick={handleSecretTap}
            style={{color:'#d4a017',fontWeight:'bold',fontSize:'1.05rem',
                    letterSpacing:'.12em',background:'none',border:'none',cursor:'pointer',
                    textShadow:'0 0 12px rgba(212,160,23,.6)'}}>
            ⚕ OPHIUCHUS
          </button>
          <span style={{...style.dim,fontSize:'.65rem',letterSpacing:'.1em'}}>
            ORB ENGINE v2
          </span>
        </div>
        <div style={style.tabBar}>
          {TABS.map(t=>(
            <button key={t} style={style.tabBtn(tab===t)} onClick={()=>setTab(t)}>
              {t==='vm'?'printf()':t.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* ═══════════════ TAB: ORB APP ═══════════════ */}
      {tab==='orb' && (
        <BgLayer src={A.bg.orb} style={{minHeight:'calc(100vh - 48px)'}}>
        <div style={{backdropFilter:'blur(2px)',minHeight:'calc(100vh - 48px)',
                     display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',
                     padding:'1.5rem',alignItems:'start',maxWidth:900,margin:'0 auto'}}>

          {/* Left: ring + inputs */}
          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <OrbRing degree={orbDeg} name={orbInput} />
            <div style={style.panel}>
              <div style={style.sectionTitle}>Name / Intent</div>
              <input value={orbInput} onChange={e=>setOrbInput(e.target.value)}
                style={{width:'100%',background:'rgba(4,6,15,.9)',border:'1px solid #261660',
                        color:'#ddd0a8',padding:'.5rem .75rem',borderRadius:3,
                        fontFamily:'Georgia,serif',fontSize:'.95rem',outline:'none',
                        boxSizing:'border-box'}} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.75rem',marginTop:'.75rem'}}>
                <div>
                  <div style={{...style.dim,fontSize:'.68rem',marginBottom:'.2rem'}}>BIRTH DATE</div>
                  <input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)}
                    style={{width:'100%',background:'rgba(4,6,15,.9)',border:'1px solid #261660',
                            color:'#ddd0a8',padding:'.45rem',borderRadius:3,fontSize:'.85rem',
                            fontFamily:'Georgia,serif'}} />
                </div>
                <div>
                  <div style={{...style.dim,fontSize:'.68rem',marginBottom:'.2rem'}}>TARGET DATE</div>
                  <input type="date" value={tgtDate} onChange={e=>setTgtDate(e.target.value)}
                    style={{width:'100%',background:'rgba(4,6,15,.9)',border:'1px solid #261660',
                            color:'#ddd0a8',padding:'.45rem',borderRadius:3,fontSize:'.85rem',
                            fontFamily:'Georgia,serif'}} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: reading */}
          <div style={{...style.panel,minHeight:480}}>
            <div style={{display:'flex',gap:'1rem',marginBottom:'1rem',
                         borderBottom:'1px solid #261660',paddingBottom:'.5rem'}}>
              {['Natal','Fusion','Donations'].map(t=>(
                <button key={t} onClick={()=>setOrbTab(t)}
                  style={{...orbTab===t?{color:'#d4a017',borderBottom:'2px solid #d4a017'}:{color:'#6a5a90'},
                           background:'none',border:'none',cursor:'pointer',
                           fontFamily:'Georgia,serif',fontSize:'.9rem',paddingBottom:'.25rem'}}>
                  {t}
                </button>
              ))}
            </div>

            <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1rem'}}>
              <img src={A.chars.ophiuchus} alt="Ophiuchus" width={48} height={48}
                   style={{imageRendering:'pixelated',borderRadius:'50%',border:'1px solid #8b3fe8'}}
                   onError={e=>e.target.style.display='none'} />
              <div>
                <div style={{...style.gold,fontSize:'1.3rem',fontWeight:'bold'}}>
                  {orbCorr.planet} Influence
                </div>
                <div style={{...style.dim,fontSize:'.78rem'}}>
                  {orbDeg.toFixed(2)}° · {orbCorr.day} Arc · {orbCorr.chakra} Chakra
                </div>
              </div>
            </div>

            <div style={{...style.dim,fontSize:'.82rem',lineHeight:1.65,marginBottom:'1rem'}}>
              Resonating at <span style={style.gold}>{orbDeg.toFixed(2)}°</span> on the Master Circle.
              Your core essence aligns with the <span style={style.purple}>{orbCorr.chakra} Chakra</span>.
              The canticle flows through the <span style={style.teal}>{orbCorr.day}</span> arc.
            </div>

            <div style={{...style.panel,background:'rgba(4,6,15,.7)',marginBottom:'1rem'}}>
              <div style={{...style.dim,fontStyle:'italic',fontSize:'.82rem'}}>
                "The {orbCorr.planet} speaks through the {orbCorr.chakra} frequency…"
              </div>
            </div>

            {/* QB4I readout */}
            <div style={style.sectionTitle}>Genetic Arc — QB4I</div>
            <div style={{fontFamily:'monospace',fontSize:'.82rem',display:'grid',
                         gridTemplateColumns:'1fr 1fr',gap:'.4rem'}}>
              {[
                ['Arc strand', orbArc, style.gold],
                ['×i imag',    QB4I.imag(orbArc),   style.purple],
                ['~ shadow',   QB4I.shadow(orbArc),  style.teal],
                ['resonance',  QB4I.resonance(orbArc), style.red],
              ].map(([k,v,s])=>(
                <div key={k} style={{...style.panel,padding:'.4rem .6rem',
                                     background:'rgba(4,6,15,.6)'}}>
                  <div style={{...style.dim,fontSize:'.62rem',letterSpacing:'.08em'}}>{k}</div>
                  <div style={{...s,fontWeight:'bold',fontSize:'.9rem'}}>{v}</div>
                </div>
              ))}
            </div>

            <button onClick={()=>{setTab('game');setScreen('create');}}
              style={{marginTop:'1.2rem',width:'100%',padding:'.65rem',
                      background:'rgba(122,85,0,.2)',border:'1px solid #7a5500',
                      color:'#d4a017',cursor:'pointer',borderRadius:3,
                      fontFamily:'Georgia,serif',fontSize:'.9rem'}}>
              ⚕ Begin RPG Journey →
            </button>
          </div>
        </div>
        </BgLayer>
      )}

      {/* ═══════════════ TAB: GAME ═══════════════ */}
      {tab==='game' && (
        <div style={{minHeight:'calc(100vh - 48px)'}}>

          {/* MENU */}
          {screen==='menu' && (
            <BgLayer src={A.bg.menu} style={{minHeight:'calc(100vh - 48px)',display:'flex',
                                             flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
              <div style={{backdropFilter:'blur(3px)',textAlign:'center'}}>
                <img src={A.chars.ophiuchus} alt="Ophiuchus" width={80} height={80}
                     style={{imageRendering:'pixelated',margin:'0 auto .8rem',display:'block',
                             border:'2px solid #8b3fe8',borderRadius:'50%'}}
                     onError={e=>e.target.style.display='none'} />
                <div style={{...style.gold,fontSize:'2rem',fontWeight:'bold',letterSpacing:'.12em',
                             textShadow:'0 0 20px rgba(212,160,23,.7)',marginBottom:'.2rem'}}>
                  OPHIUCHUS
                </div>
                <div style={{...style.dim,fontSize:'.75rem',letterSpacing:'.22em',marginBottom:'2rem'}}>
                  THE SERPENT THRONE
                </div>
                {[
                  ['▶ New Game','create','#7a5500','#d4a017'],
                  ['↺ Continue','load','#261660','#ddd0a8'],
                ].map(([txt,act,bg,col])=>(
                  <button key={act} onClick={()=>{
                    if(act==='load'){
                      const sv=localStorage.getItem('oph_save');
                      if(sv){try{const d=JSON.parse(sv);setPlayer(d.player);setMap(d.map||DEF_MAP.map(r=>[...r]));setPP(d.pp||{x:1,y:1});setBossIdx(d.bossIdx||0);setChapter(d.chapter||1);setScreen('world');toast('Loaded!');}catch(e){toast('No save found.');}}
                      else toast('No save found.');
                    }else setScreen(act);
                  }}
                    style={{display:'block',width:220,margin:'.5rem auto',padding:'.7rem',
                            background:`rgba(${bg==='#7a5500'?'122,85,0':'38,22,96'},.22)`,
                            border:`1px solid ${bg}`,color:col,cursor:'pointer',borderRadius:3,
                            fontFamily:'Georgia,serif',fontSize:'.95rem',letterSpacing:'.05em'}}>
                    {txt}
                  </button>
                ))}
              </div>
            </BgLayer>
          )}

          {/* CREATE */}
          {screen==='create' && (
            <BgLayer src={A.bg.menu}>
            <div style={{maxWidth:480,margin:'0 auto',padding:'1.5rem',backdropFilter:'blur(2px)'}}>
              <div style={{textAlign:'center',marginBottom:'1.2rem'}}>
                <div style={{...style.gold,fontSize:'1.1rem',marginBottom:'.2rem'}}>⚕ Forge Your Destiny</div>
                <div style={{...style.dim,fontSize:'.75rem'}}>
                  Birth month × year = 1 of 144 unique souls
                </div>
              </div>

              {/* Form */}
              {[
                {label:'Your Name', el:<input value={form.name} onChange={e=>handleNameKey(e.target.value)}
                  placeholder="Enter your name" maxLength={18}
                  style={{width:'100%',background:'rgba(4,6,15,.9)',border:'1px solid #261660',
                          color:'#ddd0a8',padding:'.55rem .75rem',borderRadius:3,
                          fontFamily:'Georgia,serif',fontSize:'.95rem',outline:'none',boxSizing:'border-box'}} />},
                {label:'Gender', el:(
                  <div style={{display:'flex',gap:'.75rem'}}>
                    {[['M','♂ Male'],['F','♀ Female']].map(([g,l])=>(
                      <button key={g} onClick={()=>setForm(f=>({...f,gender:g}))}
                        style={{flex:1,padding:'.55rem',border:`1px solid ${form.gender===g?'#8b3fe8':'#261660'}`,
                                background:form.gender===g?'rgba(139,63,232,.2)':'transparent',
                                color:form.gender===g?'#ddd0a8':'#6a5a90',cursor:'pointer',borderRadius:3,
                                fontFamily:'Georgia,serif',fontSize:'1rem'}}>
                        {l}
                      </button>
                    ))}
                  </div>
                )},
                {label:'Birth Month', el:(
                  <select value={form.month} onChange={e=>setForm(f=>({...f,month:+e.target.value}))}
                    style={{width:'100%',background:'rgba(4,6,15,.9)',border:'1px solid #261660',
                            color:'#ddd0a8',padding:'.55rem .75rem',borderRadius:3,
                            fontFamily:'Georgia,serif',fontSize:'.9rem',appearance:'none',boxSizing:'border-box'}}>
                    {WZ.filter(Boolean).map(w=>(
                      <option key={w.m} value={w.m}>{w.m}. {w.name} {w.sym}</option>
                    ))}
                  </select>
                )},
                {label:'Birth Year', el:(
                  <input type="number" value={form.year} min={1900} max={2025}
                    onChange={e=>setForm(f=>({...f,year:+e.target.value}))}
                    style={{width:'100%',background:'rgba(4,6,15,.9)',border:'1px solid #261660',
                            color:'#ddd0a8',padding:'.55rem .75rem',borderRadius:3,
                            fontFamily:'Georgia,serif',fontSize:'.95rem',outline:'none',boxSizing:'border-box'}} />
                )},
              ].map(({label,el})=>(
                <div key={label} style={{marginBottom:'.85rem'}}>
                  <div style={{...style.dim,fontSize:'.68rem',letterSpacing:'.12em',
                               textTransform:'uppercase',marginBottom:'.3rem'}}>{label}</div>
                  {el}
                </div>
              ))}

              {/* Preview card */}
              {preview && (
                <div style={{...style.panel,textAlign:'center',marginBottom:'1rem'}}>
                  <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'.5rem',
                               marginBottom:'.5rem'}}>
                    {/* Individual portrait */}
                    <CharImg src={preview.portrait} fallback={preview.w.ic} size={56} alt={preview.title} />
                    <div style={{fontSize:'1.5rem'}}>⚕️</div>
                    <CharImg src={A.chars[`w${form.month}_c${((form.year-1900)%12+12)%12+1}`]}
                             fallback={preview.c.ic} size={56} alt={preview.c.name} />
                    {/* Sheet-based portrait */}
                    <div style={{marginLeft:'.5rem',opacity:.6}}>
                      <SheetSprite sheet={A.sheets.chars}
                        sx={preview.sheetPos.x} sy={preview.sheetPos.y}
                        sw={64} sh={64} scale={.6} alt={preview.title} />
                    </div>
                  </div>
                  <div style={{...style.gold,fontSize:'1rem',marginBottom:'.15rem'}}>{form.name||'Hero'}</div>
                  <div style={{...style.purple,fontSize:'.8rem',marginBottom:'.6rem'}}>{preview.title}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.4rem',marginBottom:'.7rem'}}>
                    {['HP','MP','ATK','DEF','SPD','LCK'].map(k=>(
                      <div key={k} style={{...style.panel,padding:'.3rem',
                                           background:'rgba(38,22,96,.2)',textAlign:'center'}}>
                        <div style={{...style.dim,fontSize:'.6rem',letterSpacing:'.08em'}}>{k}</div>
                        <div style={{fontSize:'.95rem'}}>{preview.stats[k]}</div>
                      </div>
                    ))}
                  </div>
                  {/* QB4I strand for this character */}
                  <div style={{fontFamily:'monospace',fontSize:'.72rem',...style.dim}}>
                    Arc: <span style={style.gold}>{preview.geneticArc}</span> ·
                    ×i: <span style={style.purple}>{QB4I.imag(preview.geneticArc)}</span> ·
                    {preview.planet} / {preview.chakra}
                  </div>
                </div>
              )}

              <button onClick={confirmChar}
                style={{width:'100%',padding:'.7rem',background:'rgba(122,85,0,.2)',
                        border:'1px solid #7a5500',color:'#d4a017',cursor:'pointer',
                        borderRadius:3,fontFamily:'Georgia,serif',fontSize:'.95rem',marginBottom:'.5rem'}}>
                ⚔ Enter the Shattered Realm
              </button>
              <button onClick={()=>setScreen('menu')}
                style={{width:'100%',padding:'.6rem',background:'rgba(38,22,96,.15)',
                        border:'1px solid #261660',color:'#6a5a90',cursor:'pointer',
                        borderRadius:3,fontFamily:'Georgia,serif',fontSize:'.88rem'}}>
                ← Back
              </button>
            </div>
            </BgLayer>
          )}

          {/* WORLD */}
          {screen==='world' && player && MapView && (
            <BgLayer src={A.bg.world} style={{height:'calc(100vh - 48px)',display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                           padding:'.45rem .75rem',borderBottom:'1px solid #261660',
                           background:'rgba(4,6,15,.92)'}}>
                <span style={{...style.gold,fontSize:'.82rem'}}>
                  ⚔️ Chapter {chapter} — The Shattered Realm
                </span>
                <div style={{display:'flex',gap:'.4rem'}}>
                  {[
                    ['👤',()=>setScreen('sheet')],
                    ['💾',()=>{localStorage.setItem('oph_save',JSON.stringify({player,map,pp,chapter,bossIdx,flags}));toast('💾 Saved!');}],
                    ['≡',()=>setScreen('menu')],
                  ].map(([ic,cb])=>(
                    <button key={ic} onClick={cb}
                      style={{padding:'.3rem .6rem',background:'rgba(38,22,96,.25)',
                              border:'1px solid #261660',color:'#ddd0a8',cursor:'pointer',
                              borderRadius:3,fontSize:'.82rem'}}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tilemap */}
              <div style={{flex:1,overflow:'hidden',position:'relative'}}>
                <div style={{position:'absolute',inset:0,display:'flex',
                             alignItems:'center',justifyContent:'center'}}>
                  <div style={{display:'flex',flexDirection:'column'}}>
                    {Array.from({length:MapView.visR},(_,ry)=>{
                      const y=MapView.startY+ry;
                      return (
                        <div key={y} style={{display:'flex'}}>
                          {Array.from({length:MapView.visC},(_,rx)=>{
                            const x=MapView.startX+rx;
                            const tid=map[y]?.[x]??0;
                            const isPlayer=x===pp.x&&y===pp.y;
                            return (
                              <div key={x} style={{position:'relative'}}
                                   onClick={()=>{const dx=x-pp.x,dy=y-pp.y;if(Math.abs(dx)+Math.abs(dy)===1)mv(dx,dy);}}>
                                <TileCell id={tid} ts={MapView.TS} />
                                {isPlayer && (
                                  <div style={{position:'absolute',inset:0,display:'flex',
                                               alignItems:'center',justifyContent:'center',
                                               background:'rgba(139,63,232,.35)',
                                               border:'2px solid #d4a017',boxSizing:'border-box'}}>
                                    <CharImg src={player.gender==='F'?A.chars.oph_f:A.chars.oph_m}
                                             fallback={player.c.ic} size={MapView.TS-4} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* D-Pad */}
              <div style={{padding:'.4rem',borderTop:'1px solid #261660',
                           background:'rgba(4,6,15,.92)',display:'grid',
                           gridTemplateColumns:'repeat(3,44px)',justifyContent:'center',
                           gap:'.3rem',margin:'0 auto'}}>
                {[[null,'▲',null],['◀',null,'▶'],[null,'▼',null]].map((row,ri)=>
                  row.map((ic,ci)=>ic
                    ? <button key={`${ri}${ci}`}
                        onClick={()=>mv(ci-1===0?0:ci===0?-1:1, ri===0?-1:ri===2?1:0)}
                        style={{width:44,height:44,background:'rgba(38,22,96,.25)',
                                border:'1px solid #261660',color:'#ddd0a8',cursor:'pointer',
                                borderRadius:3,fontSize:'.9rem'}}>
                        {ic}
                      </button>
                    : <div key={`${ri}${ci}`} />
                  )
                )}
              </div>
            </BgLayer>
          )}

          {/* BATTLE */}
          {screen==='battle' && player && battle && (
            <BgLayer src={battle.en.isFinal?A.bg.boss:A.bg.battle}
                     style={{height:'calc(100vh - 48px)',display:'flex',flexDirection:'column'}}>
              <div style={{padding:'.6rem .85rem',borderBottom:'1px solid #261660',
                           background:'rgba(4,6,15,.85)',display:'flex',
                           justifyContent:'space-between',alignItems:'center'}}>
                <span style={{...style.dim,fontSize:'.78rem'}}>⚔ BATTLE · Ch.{chapter}</span>
                {battle.en.isFinal && <span style={{...style.red,fontSize:'.72rem',
                  letterSpacing:'.15em'}}>⚠ FINAL BOSS ⚠</span>}
              </div>

              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                           justifyContent:'space-around',padding:'.75rem',gap:'.6rem',backdropFilter:'blur(3px)'}}>
                {/* Enemy */}
                <div style={{textAlign:'center'}}>
                  <CharImg src={battle.en.src} fallback={battle.en.ic} size={72} alt={battle.en.name} />
                  <div style={{...style.red,fontSize:'1rem',fontWeight:'bold',marginTop:'.3rem'}}>
                    {battle.en.name}
                  </div>
                  <div style={{width:220,margin:'.4rem auto 0'}}>
                    <ResourceBar cur={battle.en.HP} max={battle.en.stats.maxHP} color='#e74c3c' label='HP' />
                  </div>
                </div>

                {/* Log */}
                <div style={{...style.panel,width:'100%',maxWidth:360,minHeight:55,maxHeight:72,
                             overflowY:'auto',textAlign:'center',fontSize:'.82rem',lineHeight:1.55}}
                     dangerouslySetInnerHTML={{__html:logLines.join('<br>')}}>
                </div>

                {/* Player */}
                <div style={{textAlign:'center',width:'100%',maxWidth:300}}>
                  <div style={{display:'flex',justifyContent:'center',gap:'.5rem',
                               alignItems:'center',marginBottom:'.4rem'}}>
                    <CharImg src={player.gender==='F'?A.chars.oph_f:A.chars.oph_m}
                             fallback={player.c.ic} size={36} />
                    <span style={{...style.dim,fontSize:'.8rem'}}>
                      {player.name} {player.w.sym}{player.c.ic} Lv.{player.level}
                    </span>
                  </div>
                  <ResourceBar cur={player.stats.HP} max={player.stats.maxHP}
                               color='#1aaf8c' label='HP' />
                  <ResourceBar cur={player.stats.MP} max={player.stats.maxMP}
                               color='#8b3fe8' label='MP' />
                </div>
              </div>

              {/* Actions */}
              <div style={{padding:'.65rem',borderTop:'1px solid #261660',
                           background:'rgba(4,6,15,.92)',
                           display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'.45rem',
                           maxWidth:360,margin:'0 auto',width:'100%'}}>
                {[
                  ['⚔️ Attack','#5a1010',doAttack],
                  ['🧪 Heal ×'+(player.items.find(i=>i.id==='potion')?.uses||0),'#7a5500',doHeal],
                  ['🛡️ Defend','#0a5040',()=>{
                    setPlayer(p=>({...p,defending:true}));
                    addLog('🛡️ Defensive stance!');
                  }],
                  ['💨 Flee','#303030',()=>{
                    if(Math.random()<.5){addLog('💨 Escaped!');setTimeout(()=>{setBattle(null);setScreen('world');},900);}
                    else addLog('💨 Failed to flee!');
                  }],
                ].map(([txt,bc,cb])=>(
                  <button key={txt} onClick={cb}
                    style={{padding:'.5rem',background:'rgba(11,8,32,.85)',
                            border:`1px solid ${bc}`,color:'#ddd0a8',cursor:'pointer',
                            borderRadius:3,fontFamily:'Georgia,serif',fontSize:'.8rem',
                            textAlign:'left'}}>
                    {txt}
                  </button>
                ))}
              </div>
            </BgLayer>
          )}

          {/* CHARACTER SHEET */}
          {screen==='sheet' && player && (
            <div style={{...style.panel,maxWidth:480,margin:'1rem auto',padding:'1.2rem',
                         background:'rgba(11,8,32,.97)'}}>
              <div style={{textAlign:'center',marginBottom:'1rem'}}>
                <div style={{display:'flex',justifyContent:'center',gap:'.5rem',marginBottom:'.5rem'}}>
                  <CharImg src={player.portrait} fallback={player.w.ic} size={64} alt={player.title} />
                  <SheetSprite sheet={A.sheets.chars}
                    sx={player.sheetPos.x} sy={player.sheetPos.y} sw={64} sh={64} alt={player.title} />
                </div>
                <div style={{...style.gold,fontSize:'1.05rem'}}>{player.name}</div>
                <div style={{...style.purple,fontSize:'.78rem'}}>{player.title}</div>
              </div>

              {[
                ['Western Sign', `${player.w.sym} ${player.w.name} — ${player.w.el} / ${player.w.q}\n${player.w.desc}`],
                ['Chinese Sign', `${player.c.ic} ${player.c.name} (${player.c.yang?'Yang':'Yin'} · ${player.c.el})\n${player.c.desc}`],
                ['ORB Resonance', `${player.planet} · ${player.chakra} Chakra · ${player.day} Arc\nOrbital degree: ${player.orbDeg.toFixed(1)}°`],
              ].map(([ttl,tx])=>(
                <div key={ttl} style={{marginBottom:'.75rem'}}>
                  <div style={style.sectionTitle}>{ttl}</div>
                  <div style={{...style.dim,fontSize:'.82rem',lineHeight:1.55,whiteSpace:'pre-wrap'}}>{tx}</div>
                </div>
              ))}

              <div style={style.sectionTitle}>Stats</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.4rem',marginBottom:'.75rem'}}>
                {['HP','MP','ATK','DEF','SPD','LCK'].map(k=>(
                  <div key={k} style={{...style.panel,padding:'.35rem',textAlign:'center',
                                       background:'rgba(38,22,96,.2)'}}>
                    <div style={{...style.dim,fontSize:'.62rem',letterSpacing:'.08em'}}>{k}</div>
                    <div style={{fontSize:'.95rem'}}>{player.stats[k]}/{player.stats['max'+k]||player.stats[k]}</div>
                  </div>
                ))}
              </div>

              <div style={style.sectionTitle}>QB4I Genetic Signature</div>
              <div style={{...style.panel,background:'rgba(4,6,15,.7)',
                           fontFamily:'monospace',fontSize:'.72rem',lineHeight:1.8,marginBottom:'.75rem'}}>
                {['ATK','DEF','SPD','HP','MP','LCK'].map(k=>{
                  const v=player.stats[k]||0, s=QB4I.enc(v);
                  const [re,im]=QB4I.complex(s);
                  return (
                    <div key={k}>
                      <span style={style.dim}>{k.padEnd(4)}</span>
                      <span style={{...style.gold,margin:'0 .4rem'}}>{String(v).padStart(3)}</span>
                      → <b>{s}</b>
                      <span style={{...style.purple,margin:'0 .3rem'}}>×i:{QB4I.imag(s)}</span>
                      <span style={style.dim}>[{re},{im}i]</span>
                    </div>
                  );
                })}
                <div style={{marginTop:'.4rem',paddingTop:'.4rem',borderTop:'1px solid #261660'}}>
                  <span style={style.dim}>Shadow Res: </span>
                  <span style={{...style.purple,fontWeight:'bold'}}>{QB4I.shadowPow(player)}</span>
                </div>
              </div>

              <button onClick={()=>setScreen('world')}
                style={{width:'100%',padding:'.6rem',background:'rgba(38,22,96,.15)',
                        border:'1px solid #261660',color:'#6a5a90',cursor:'pointer',
                        borderRadius:3,fontFamily:'Georgia,serif',fontSize:'.88rem'}}>
                ← Back to World
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: CODEX (all 144) ═══════════════ */}
      {tab==='codex' && (
        <BgLayer src={A.bg.codex} style={{minHeight:'calc(100vh - 48px)',overflowY:'auto'}}>
        <div style={{backdropFilter:'blur(2px)',padding:'1rem'}}>
          <div style={{textAlign:'center',marginBottom:'1rem'}}>
            <div style={{...style.gold,fontSize:'1.1rem',marginBottom:'.2rem'}}>📖 Zodiac Codex</div>
            <div style={{...style.dim,fontSize:'.72rem'}}>
              12 Western × 12 Chinese = 144 unique soul fusions
            </div>
          </div>

          {/* Western filter */}
          <div style={{display:'flex',flexWrap:'wrap',gap:'.35rem',marginBottom:'1rem',
                       justifyContent:'center'}}>
            <button onClick={()=>setCodexWest(0)}
              style={{...style.tabBtn(codexWest===0),fontSize:'.7rem',padding:'.2rem .5rem'}}>All</button>
            {WZ.filter(Boolean).map(w=>(
              <button key={w.m} onClick={()=>setCodexWest(w.m)}
                style={{...style.tabBtn(codexWest===w.m),fontSize:'.7rem',padding:'.2rem .5rem'}}>
                {w.sym}
              </button>
            ))}
          </div>

          {/* 144 character grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'.65rem'}}>
            {codexChars.filter(ch=>codexWest===0||ch.wi+1===codexWest).map(ch=>(
              <div key={ch.key} style={{...style.panel,
                                        borderColor:ch.west.c||'#261660',
                                        background:'rgba(11,8,32,.88)',textAlign:'center'}}>
                {/* Individual portrait + sheet fallback */}
                <div style={{display:'flex',justifyContent:'center',gap:'.3rem',marginBottom:'.4rem'}}>
                  <CharImg src={ch.src} fallback={ch.west.ic}
                           size={40} alt={ch.title} />
                  <SheetSprite sheet={A.sheets.chars}
                    sx={ch.sheetPos.x} sy={ch.sheetPos.y} sw={64} sh={64} scale={.6} alt={ch.title} />
                </div>
                <div style={{fontSize:'.75rem',color:ch.west.c||style.gold.color,
                             marginBottom:'.15rem',fontWeight:'bold'}}>{ch.title}</div>
                <div style={{...style.dim,fontSize:'.65rem',marginBottom:'.3rem'}}>
                  {ch.west.sym} {ch.west.el} · {ch.chin.ic} {ch.chin.el}
                </div>
                <div style={{fontFamily:'monospace',fontSize:'.68rem',
                             color:'#8b3fe8',letterSpacing:'.05em'}}>
                  {ch.strand} <span style={style.dim}>·</span> {QB4I.imag(ch.strand)}
                </div>
              </div>
            ))}
          </div>

          {/* Shadow Bosses */}
          <div style={{marginTop:'1.5rem'}}>
            <div style={{...style.sectionTitle,color:'#e74c3c'}}>Shadow Boss Roster</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'.5rem'}}>
              {SB.map(b=>(
                <div key={b.id} style={{...style.panel,borderColor:'#5a1010',textAlign:'center'}}>
                  <CharImg src={b.src} fallback={b.ic} size={40} alt={b.name} />
                  <div style={{...style.red,fontSize:'.78rem',marginTop:'.3rem'}}>{b.name}</div>
                  <div style={{...style.dim,fontSize:'.65rem'}}>
                    HP:{b.stats.HP} ATK:{b.stats.ATK}
                  </div>
                  <div style={{fontFamily:'monospace',fontSize:'.65rem',color:'#8b3fe8'}}>
                    {QB4I.enc(b.stats.HP&0xFF)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </BgLayer>
      )}

      {/* ═══════════════ TAB: LEVEL EDITOR ═══════════════ */}
      {tab==='editor' && (
        <div style={{height:'calc(100vh - 48px)',display:'flex',flexDirection:'column',
                     background:'#07091a'}}>
          <div style={{padding:'.45rem .75rem',borderBottom:'1px solid #261660',
                       display:'flex',justifyContent:'space-between',alignItems:'center',
                       background:'rgba(4,6,15,.97)',fontSize:'.82rem'}}>
            <span style={style.gold}>Level Editor</span>
            <div style={{display:'flex',gap:'.35rem'}}>
              {[['Save','#0a5040',()=>{localStorage.setItem('oph_map',JSON.stringify(edMap));toast('Map saved!');}],
                ['Load','#261660',()=>{const d=localStorage.getItem('oph_map');if(d)setEdMap(JSON.parse(d));}],
                ['Clear','#5a0808',()=>setEdMap(DEF_MAP.map(r=>[...r]))],
              ].map(([l,bc,cb])=>(
                <button key={l} onClick={cb}
                  style={{padding:'.3rem .65rem',background:`rgba(${bc.slice(1).match(/.{2}/g).map(h=>parseInt(h,16)).join(',')}, .2)`,
                          border:`1px solid ${bc}`,color:'#ddd0a8',cursor:'pointer',
                          borderRadius:3,fontSize:'.75rem'}}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{flex:1,display:'flex',overflow:'hidden'}}>
            {/* Map */}
            <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'flex-start',
                         justifyContent:'flex-start',padding:'.5rem'}}>
              <div style={{display:'flex',flexDirection:'column'}}>
                {edMap.map((row,y)=>(
                  <div key={y} style={{display:'flex'}}>
                    {row.map((tid,x)=>(
                      <div key={x} style={{cursor:'pointer'}}
                           onClick={()=>setEdMap(m=>{const nm=m.map(r=>[...r]);nm[y][x]=editTile;return nm;})}>
                        <TileCell id={tid} ts={30} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Palette */}
            <div style={{width:54,background:'rgba(11,8,32,.97)',borderLeft:'1px solid #261660',
                         overflowY:'auto',padding:'.2rem',display:'flex',flexDirection:'column',gap:'.2rem'}}>
              {Object.entries(TDEF).map(([id,td])=>(
                <button key={id} title={td.label} onClick={()=>setEditTile(+id)}
                  style={{width:42,height:42,background:td.col,border:`2px solid ${+id===editTile?'#d4a017':'transparent'}`,
                          borderRadius:3,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:'.65rem',color:'#aaa',flexShrink:0,padding:0,position:'relative',overflow:'hidden'}}>
                  {td.src
                    ? <img src={td.src} alt={td.label} width={42} height={42}
                           style={{objectFit:'cover',imageRendering:'pixelated',position:'absolute',inset:0}}
                           onError={e=>e.target.style.display='none'} />
                    : td.label.slice(0,2)}
                </button>
              ))}
            </div>
          </div>

          <div style={{padding:'.45rem',borderTop:'1px solid #261660',
                       background:'rgba(4,6,15,.97)',display:'flex',gap:'.5rem',
                       alignItems:'center',fontSize:'.8rem'}}>
            <span style={style.dim}>Difficulty:</span>
            {[[.7,'Easy'],[1,'Normal'],[1.5,'Hard'],[2,'Nightmare']].map(([v,l])=>(
              <button key={v} onClick={()=>setDiff(v)}
                style={{padding:'.25rem .55rem',background:diff===v?'rgba(139,63,232,.3)':'rgba(38,22,96,.15)',
                        border:`1px solid ${diff===v?'#8b3fe8':'#261660'}`,color:diff===v?'#b048e8':'#6a5a90',
                        cursor:'pointer',borderRadius:3,fontSize:'.72rem'}}>{l}</button>
            ))}
            <button onClick={()=>{if(!player){toast('Create a character first!');return;}
              setMap(edMap.map(r=>[...r]));setScreen('world');setTab('game');toast('Testing map!');}}
              style={{marginLeft:'auto',padding:'.3rem .75rem',background:'rgba(122,85,0,.2)',
                      border:'1px solid #7a5500',color:'#d4a017',cursor:'pointer',borderRadius:3,fontSize:'.78rem'}}>
              ▶ Test
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: VM CONSOLE ═══════════════ */}
      {tab==='vm' && (
        <div style={{height:'calc(100vh - 48px)',display:'flex',flexDirection:'column',
                     background:'#020408',fontFamily:'monospace'}}>
          <div style={{padding:'.6rem 1rem',borderBottom:'1px solid #1aaf8c',
                       background:'rgba(0,20,10,.9)'}}>
            <div style={{color:'#1aaf8c',fontSize:'.82rem',letterSpacing:'.12em'}}>
              ◈ OPHIUCHUS printf() VM · quaterbase4i encoder · 256-byte memory
            </div>
            <div style={{color:'#6a5a90',fontSize:'.68rem',marginTop:'.18rem'}}>
              Encode: p=00  d=01  b=10  q=11  ·  ×i: p→d→q→b→p  ·  ~: p↔q d↔b
            </div>
          </div>

          <div ref={vmOutRef} style={{flex:1,overflowY:'auto',padding:'.75rem',
                                      background:'#020408'}}>
            {vm.lines.length===0
              ? <VMLine html={`<G>printf() VM ready. Type "help" for commands.</G>`} />
              : vm.lines.map((l,i)=><VMLine key={i} html={l} />)}
          </div>

          <div style={{padding:'.5rem',borderTop:'1px solid #1aaf8c',
                       background:'rgba(0,20,10,.9)',display:'flex',gap:'.5rem',
                       alignItems:'center'}}>
            <span style={{color:'#1aaf8c',fontSize:'.82rem'}}>printf</span>
            <span style={{color:'#6a5a90',fontSize:'.82rem'}}>&gt;</span>
            <input value={vmInput} onChange={e=>setVmInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&runVM()}
              placeholder='printf("ATK=%d strand=%q", ATK, ATK)'
              style={{flex:1,background:'transparent',border:'none',color:'#ddd0a8',
                      fontFamily:'monospace',fontSize:'.82rem',outline:'none'}} />
            <button onClick={runVM}
              style={{padding:'.3rem .65rem',background:'rgba(26,175,140,.2)',
                      border:'1px solid #1aaf8c',color:'#1aaf8c',cursor:'pointer',
                      borderRadius:3,fontSize:'.78rem',fontFamily:'monospace'}}>
              EXEC
            </button>
          </div>

          {/* Quick commands */}
          <div style={{padding:'.4rem .5rem',borderTop:'1px solid #1aaf8c22',
                       display:'flex',flexWrap:'wrap',gap:'.3rem',background:'rgba(0,20,10,.7)'}}>
            {[
              ['help','help'],
              ['sig','sig'],
              ['stats','stats'],
              ['dump (8)','dump'],
              ['encode 255','encode 255'],
              ['decode pdbq','decode pdbq'],
              ['imag pdbq','imag pdbq'],
              ['shadow pdbq','shadow pdbq'],
            ].map(([label,cmd])=>(
              <button key={label} onClick={()=>{
                  vm.exec(cmd,player);setVmTick(t=>t+1);
                  if(vmOutRef.current)setTimeout(()=>{vmOutRef.current.scrollTop=99999;},50);
                }}
                style={{padding:'.2rem .5rem',background:'rgba(26,175,140,.1)',
                        border:'1px solid #1aaf8c44',color:'#1aaf8c',cursor:'pointer',
                        borderRadius:3,fontSize:'.68rem',fontFamily:'monospace'}}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ OVERLAY: printf() VM ═══════════════ */}
      {vmOpen && (
        <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.75)',
                     display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{width:'100%',maxWidth:640,height:'55vh',
                       background:'#020408',borderTop:'2px solid #1aaf8c',
                       display:'flex',flexDirection:'column',fontFamily:'monospace'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                         padding:'.45rem .75rem',borderBottom:'1px solid #1aaf8c44',
                         background:'rgba(0,20,10,.9)'}}>
              <span style={{color:'#1aaf8c',fontSize:'.8rem',letterSpacing:'.1em'}}>
                ◈ printf() VM — ACTIVE <span style={{color:'#6a5a90'}}>[secret tool]</span>
              </span>
              <button onClick={()=>setVmOpen(false)}
                style={{background:'none',border:'none',color:'#e74c3c',
                        cursor:'pointer',fontSize:'1rem'}}>✕</button>
            </div>
            <div ref={vmOutRef} style={{flex:1,overflowY:'auto',padding:'.6rem .75rem'}}>
              {vm.lines.map((l,i)=><VMLine key={`${vmTick}-${i}`} html={l} />)}
            </div>
            <div style={{display:'flex',gap:'.5rem',padding:'.45rem .75rem',
                         borderTop:'1px solid #1aaf8c44',alignItems:'center'}}>
              <span style={{color:'#1aaf8c',fontSize:'.8rem'}}>printf &gt;</span>
              <input value={vmInput} onChange={e=>setVmInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&runVM()}
                autoFocus placeholder='printf("HP=%d arc=%q", HP, HP)'
                style={{flex:1,background:'transparent',border:'none',color:'#ddd0a8',
                        fontFamily:'monospace',fontSize:'.8rem',outline:'none'}} />
              <button onClick={runVM}
                style={{padding:'.25rem .6rem',background:'rgba(26,175,140,.2)',
                        border:'1px solid #1aaf8c',color:'#1aaf8c',cursor:'pointer',
                        borderRadius:3,fontSize:'.75rem'}}>RUN</button>
            </div>
          </div>
        </div>
      )}

    </div>
    </ErrorBoundary>
  );
}
