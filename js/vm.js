// ═══════════════════════════════════════════════════════
//  vm.js — QB4I Encoding + printf() VM Debug Console
//  p=00  d=01  b=10  q=11  · base β=4i
//  Activation: tap ⚕ 5× · type "printf" in name field
// ═══════════════════════════════════════════════════════
'use strict';

// ── QUATERBASE4I ────────────────────────────────────────
const QB4I = {
  G: 'pdbq',
  ROT: { p:'d', d:'q', q:'b', b:'p' },   // ×i rotation
  CMP: { p:'q', d:'b', b:'d', q:'p' },   // ~ complement

  enc(n) {
    n = Math.abs(Math.round(n)) & 0xFF;
    return [(n>>6)&3,(n>>4)&3,(n>>2)&3,n&3].map(v=>this.G[v]).join('');
  },
  dec(s) {
    return [...s].reduce((a,c,i)=>a|(this.G.indexOf(c)<<(6-i*2)),0);
  },
  imag(s)   { return [...s].map(g=>this.ROT[g]||g).join(''); },
  shadow(s) { return [...s].map(g=>this.CMP[g]||g).join(''); },
  resonance(s){ return this.dec(this.imag(s)); },
  complex(s) {
    const d=[...s].map(g=>this.G.indexOf(g));
    return { re:d[3]-16*d[1], im:4*d[2]-64*d[0] };
  },

  // Printf-style formatter: %d=int %q=strand %x=hex %i=imag %s=string
  pf(fmt, ...args) {
    let ai=0;
    return fmt.replace(/%([dqxis%])/g, (_,sp)=>{
      if(sp==='%') return '%';
      const v = args[ai++];
      if(sp==='d') return Math.round(+v);
      if(sp==='s') return String(v);
      if(sp==='q') return this.enc(+v);
      if(sp==='x') return (+v).toString(16).padStart(2,'0').toUpperCase();
      if(sp==='i') return this.imag(String(v));
      return '?';
    });
  },

  // Full player genetic signature
  sig(p) {
    return ['ATK','DEF','SPD','HP','MP','LCK']
      .map(k=>`${k}:${this.enc(p.stats[k]||0)}`).join(' │ ');
  },
  shadowPow(p) {
    return Math.round(['ATK','DEF','SPD','HP']
      .reduce((a,k)=>a+this.resonance(this.enc(p.stats[k]||0)),0)/4);
  },
};

// ── VM CONSOLE ──────────────────────────────────────────
const VM = {
  lines: [],
  hist:  [],
  mem:   new Uint8Array(256),
  _ready: false,

  init() {
    if (this._ready) return;
    for (let i=0;i<256;i++) this.mem[i]=i;
    this._ready = true;
  },

  // Render a line with colour tags
  _col(s) {
    return s
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\[G\](.*?)\[\/G\]/g,'<span class="vc-g">$1</span>')
      .replace(/\[P\](.*?)\[\/P\]/g,'<span class="vc-p">$1</span>')
      .replace(/\[Y\](.*?)\[\/Y\]/g,'<span class="vc-y">$1</span>')
      .replace(/\[T\](.*?)\[\/T\]/g,'<span class="vc-t">$1</span>')
      .replace(/\[R\](.*?)\[\/R\]/g,'<span class="vc-r">$1</span>')
      .replace(/\[D\](.*?)\[\/D\]/g,'<span class="vc-d">$1</span>')
      .replace(/\[B\](.*?)\[\/B\]/g,'<b>$1</b>');
  },

  log(raw) {
    this.lines = [...this.lines.slice(-36), raw];
    const out = document.getElementById('vm-out');
    if (out) {
      const d = document.createElement('div');
      d.className = 'vm-ln';
      d.innerHTML = this._col(raw);
      out.appendChild(d);
      out.scrollTop = out.scrollHeight;
    }
  },

  exec(raw, player) {
    if (!raw.trim()) return;
    this.init();
    this.hist = [raw, ...this.hist.slice(0,24)];
    this.log(`[G]> ${raw}[/G]`);
    const pts = raw.trim().split(/\s+/);
    const op  = pts[0].toLowerCase();
    const p   = player || (typeof GAME!=='undefined' ? GAME.player : null);

    if (op === 'printf') {
      const m = raw.match(/printf\("([^"]*)"(,(.+))?\)/);
      if (!m) { this.log('[D]Usage: printf("HP=%d strand=%q", HP, HP)[/D]'); return; }
      const args = (m[3]||'').split(',').map(s=>{
        s=s.trim().replace(/['"]/g,'');
        if(p?.stats?.[s]!==undefined) return p.stats[s];
        if(!isNaN(s)) return +s;
        return s;
      }).filter(Boolean);
      this.log(QB4I.pf(m[1], ...args));
      return;
    }

    switch(op) {
      case 'help':
        ['printf("fmt"[,args])   — QB4I formatted output (%d %q %x %i %s)',
         'encode [lt]0-255[gt]        — byte → p/d/b/q strand',
         'decode [lt]strand[gt]       — strand → int + [Re,Im] complex',
         'imag [lt]strand[gt]         — ×i imaginary rotation',
         'shadow [lt]strand[gt]       — additive complement (~)',
         'complex [lt]strand[gt]      — base-4i [Re,Im] components',
         'sig                   — player full genetic signature',
         'stats                 — all stats as QB4I strands',
         'dump                  — 256-byte VM memory dump',
         'write [lt]addr[gt] [lt]val[gt]  — poke byte to memory',
         'read [lt]addr[gt]          — peek byte from memory',
         'cheat [lt]hp|mp|xp[gt]    — restore resource (shhh)',
         'clear                 — clear console',
        ].forEach(l=>this.log(`[D]  ${l.replace(/\[lt\]/g,'<').replace(/\[gt\]/g,'>')}[/D]`));
        break;

      case 'encode': {
        const n=parseInt(pts[1]);
        if(isNaN(n)){this.log('[D]encode &lt;0-255&gt;[/D]');break;}
        const s=QB4I.enc(n); const {re,im}=QB4I.complex(s);
        this.log(`[B]${n}[/B] → [G]${s}[/G]  ×i:[P]${QB4I.imag(s)}[/P]  ~:[T]${QB4I.shadow(s)}[/T]  [Re=${re} Im=${im}i]`);
        break;
      }
      case 'decode': {
        const s=pts[1]||'';
        if(!/^[pdbq]+$/.test(s)){this.log('[D]decode &lt;pdbq...&gt;[/D]');break;}
        const {re,im}=QB4I.complex(s);
        this.log(`[G]${s}[/G] → [B]${QB4I.dec(s)}[/B]  resonance:[P]${QB4I.resonance(s)}[/P]  [Re=${re} Im=${im}i]`);
        break;
      }
      case 'imag':
        this.log(`imag([G]${pts[1]||'pdbq'}[/G]) = [P]${QB4I.imag(pts[1]||'pdbq')}[/P]`);break;
      case 'shadow':
        this.log(`shadow([G]${pts[1]||'pdbq'}[/G]) = [T]${QB4I.shadow(pts[1]||'pdbq')}[/T]`);break;
      case 'complex': {
        const s=pts[1]||'pppp'; const {re,im}=QB4I.complex(s);
        this.log(`[G]${s}[/G] → Re=[G]${re}[/G]  Im=[P]${im}i[/P]`);break;
      }
      case 'sig':
        if(!p){this.log('[R]No player loaded.[/R]');break;}
        this.log(`[Y]◈ ${p.name} — Genetic Signature[/Y]`);
        this.log(QB4I.sig(p));
        this.log(`Shadow Resonance: [P]${QB4I.shadowPow(p)}[/P]`);
        break;
      case 'stats':
        if(!p){this.log('[R]No player.[/R]');break;}
        ['HP','MP','ATK','DEF','SPD','LCK'].forEach(k=>{
          const v=p.stats[k]||0, s=QB4I.enc(v), {re,im}=QB4I.complex(s);
          this.log(`[B]${k.padEnd(4)}[/B]${String(v).padStart(3)} → [G]${s}[/G]  ×i:[P]${QB4I.imag(s)}[/P]  [${re},${im}i]`);
        });break;
      case 'dump':
        this.log('[Y]◈ VM MEMORY — 256 bytes[/Y]');
        for(let i=0;i<256;i+=8){
          const h=Array.from({length:8},(_,j)=>this.mem[i+j].toString(16).padStart(2,'0')).join(' ');
          const s=Array.from({length:8},(_,j)=>QB4I.enc(this.mem[i+j])).join(' ');
          this.log(`[D]0x${i.toString(16).padStart(2,'0')}[/D]  ${h}  [P]${s}[/P]`);
        }break;
      case 'write': {
        const addr=parseInt(pts[1],16)||parseInt(pts[1]),val=parseInt(pts[2]);
        if(isNaN(addr)||isNaN(val)){this.log('[D]write &lt;addr&gt; &lt;val&gt;[/D]');break;}
        this.mem[addr&0xFF]=val&0xFF;
        this.log(`mem[0x${(addr&0xFF).toString(16).padStart(2,'0')}] ← [B]${val}[/B]  [G](${QB4I.enc(val)})[/G]`);break;
      }
      case 'read': {
        const addr=parseInt(pts[1],16)||parseInt(pts[1]),v=this.mem[addr&0xFF];
        this.log(`mem[0x${(addr&0xFF).toString(16).padStart(2,'0')}] = [B]${v}[/B]  [G](${QB4I.enc(v)})[/G]`);break;
      }
      case 'cheat':
        if(!p){this.log('[R]No player.[/R]');break;}
        if(pts[1]==='hp'){p.stats.HP=p.stats.maxHP;this.log('[T]HP fully restored.[/T]');}
        else if(pts[1]==='mp'){p.stats.MP=p.stats.maxMP;this.log('[P]MP fully restored.[/P]');}
        else if(pts[1]==='xp'){p.exp=p.expNext-1;this.log('[Y]EXP maxed — level up next fight.[/Y]');}
        else this.log('[D]cheat &lt;hp|mp|xp&gt;[/D]');
        break;
      case 'clear':
        this.lines=[];
        const out=document.getElementById('vm-out');
        if(out) out.innerHTML='';
        break;
      default:
        this.log(`[R]Unknown: ${op} — type "help"[/R]`);
    }
  },
};
