// ═══════════════════════════════════════════════════════
//  ui.js — Screen Renderer
//  Renders all game screens as HTML into #app
// ═══════════════════════════════════════════════════════
'use strict';

const UI = {

  render() {
    switch (GAME.scr) {
      case 'menu':    this.showMenu();    break;
      case 'create':  this.showCreate();  break;
      case 'world':   this.showWorld();   break;
      case 'battle':  this.showBattle();  break;
      case 'dlg':     this.showDlg();     break;
      case 'char':    this.showChar();    break;
    }
  },

  // ── MENU ──────────────────────────────────────
  showMenu() {
    this._activate('screen-menu');
  },

  // ── CREATE ────────────────────────────────────
  showCreate() {
    const el = document.getElementById('screen-create');
    if (!el) return;
    this._activate('screen-create');
    this._updatePreview();
  },

  _updatePreview() {
    const mo = parseInt(document.getElementById('in-mo')?.value || 7);
    const yr = parseInt(document.getElementById('in-yr')?.value || 1990);
    const nm = document.getElementById('in-name')?.value || 'Hero';
    const gn = GAME.form?.gender || 'M';
    if (isNaN(yr) || yr < 1900 || yr > 2025) return;

    const w   = WZ[mo];
    const ci  = ((yr - 1900) % 12 + 12) % 12;
    const c   = CZ[ci];
    const st  = genStats(w, c, gn);
    const sk  = genSkills(w.el, c.el);
    const wi  = mo - 1;
    const ttl = (TITLES[c.n] || [])[wi] || `${w.n}-${c.n}`;
    const arc = QB4I.enc(st.ATK);

    const iEl = document.getElementById('prev-icons');
    const nEl = document.getElementById('prev-name');
    const tEl = document.getElementById('prev-title');
    const sEl = document.getElementById('prev-strand');
    const gEl = document.getElementById('prev-stats');
    const kEl = document.getElementById('prev-skills');

    if (iEl) iEl.textContent = `${w.ic} ⚕️ ${c.ic}`;
    if (nEl) { nEl.textContent = nm; nEl.style.color = w.col || '#d4a017'; }
    if (tEl) tEl.textContent = `${w.sym} ${ttl}`;
    if (sEl) sEl.textContent = `arc: ${arc}  ×i: ${QB4I.imag(arc)}  shadow: ${QB4I.shadow(arc)}`;
    if (gEl) gEl.innerHTML = ['HP','MP','ATK','DEF','SPD','LCK'].map(k =>
      `<div class="stat-cell"><div class="sl">${k}</div><div class="sv">${st[k]}</div></div>`
    ).join('');
    if (kEl) kEl.innerHTML = sk.map(s => {
      const d = SKILLS[s]; return d ? `<span>${d.icon} ${s}</span>` : '';
    }).join(' · ');
  },

  // ── WORLD ─────────────────────────────────────
  showWorld() {
    this._activate('screen-world');
    const p = GAME.player;
    if (!p) return;
    this._updateHUD();
    // Canvas init is handled by GAME.initCanvas()
    setTimeout(() => GAME.initCanvas(), 10);
  },

  _updateHUD() {
    const p = GAME.player;
    if (!p) return;
    const hpPct = Math.max(0, p.stats.HP / p.stats.maxHP * 100);
    const mpPct = Math.max(0, p.stats.MP / p.stats.maxMP * 100);
    const hpFill = document.getElementById('hud-hp-fill');
    const mpFill = document.getElementById('hud-mp-fill');
    const hpVal  = document.getElementById('hud-hp-val');
    const mpVal  = document.getElementById('hud-mp-val');
    const nm     = document.getElementById('hud-name');
    const lv     = document.getElementById('hud-level');
    if (hpFill) hpFill.style.width = hpPct + '%';
    if (mpFill) mpFill.style.width = mpPct + '%';
    if (hpVal)  hpVal.textContent  = `${p.stats.HP}/${p.stats.maxHP}`;
    if (mpVal)  mpVal.textContent  = `${p.stats.MP}/${p.stats.maxMP}`;
    if (nm)     nm.textContent     = `${p.name} ${p.w.sym}${p.c.ic}`;
    if (lv)     lv.textContent     = `Lv.${p.level}  ${AREA_DATA[GAME.area]?.name || ''}`;
  },

  // ── BATTLE ────────────────────────────────────
  showBattle() {
    this._activate('screen-battle');
    if (!BATTLE.state) return;
    const { en } = BATTLE.state;
    const p = GAME.player;

    // Boss tag
    const tag = document.getElementById('bat-boss-tag');
    if (tag) tag.style.display = en.isBoss ? 'block' : 'none';

    // Enemy name
    const nm = document.getElementById('bat-en-name');
    if (nm) nm.textContent = en.label;

    // Sprite
    const imgEl = document.getElementById('bat-sprite');
    const emoEl = document.getElementById('bat-sprite-emoji');
    if (en.sprite && GAME.IMG[en.sprite]) {
      if (imgEl) { imgEl.src = GAME.IMG[en.sprite].src; imgEl.style.display = 'block'; }
      if (emoEl) emoEl.style.display = 'none';
      if (en.isBoss && imgEl) imgEl.classList.add('boss-pulse');
    } else {
      if (imgEl) imgEl.style.display = 'none';
      if (emoEl) { emoEl.style.display = 'block'; emoEl.textContent = en.sprite ? '🌑' : '👾'; }
    }

    // Enemy HP
    const enFill = document.getElementById('bat-en-fill');
    const enTxt  = document.getElementById('bat-en-hp');
    if (enFill) enFill.style.width = '100%';
    if (enTxt)  enTxt.textContent  = `${en.hp} / ${en.hp}`;

    // Player bars
    this._renderBattleBars(p);

    // Action buttons
    this._renderActions(p);

    // Clear log
    const logEl = document.getElementById('bat-log');
    if (logEl) logEl.innerHTML = '';
  },

  _renderBattleBars(p) {
    const plFill = document.getElementById('bat-pl-fill');
    const mpFill = document.getElementById('bat-mp-fill');
    const plHp   = document.getElementById('bat-pl-hp');
    const plMp   = document.getElementById('bat-pl-mp');
    const pln    = document.getElementById('bat-pl-name');
    if (plFill) plFill.style.width = Math.max(0, p.stats.HP/p.stats.maxHP*100) + '%';
    if (mpFill) mpFill.style.width = Math.max(0, p.stats.MP/p.stats.maxMP*100) + '%';
    if (plHp)   plHp.textContent   = `${p.stats.HP} / ${p.stats.maxHP}`;
    if (plMp)   plMp.textContent   = `${p.stats.MP} / ${p.stats.maxMP}`;
    if (pln)    pln.textContent    = `${p.name} · Lv.${p.level}`;
  },

  _renderActions(p) {
    const grid = document.getElementById('bat-actions');
    if (!grid) return;
    grid.innerHTML = '';

    const pot = p.items.find(i => i.id==='potion' && i.uses>0);

    const btns = [
      { type:'atk',  cls:'atk', icon:'⚔️', name:'Attack',        sub:'Basic' },
      ...p.skills.slice(0,3).map((sk,i) => {
        const s = SKILLS[sk] || {}; const mp = s.cost||0;
        return { type:`sk${i}`, cls:'sk', icon:s.icon||'✨', name:sk, sub:`${mp} MP`, disabled: p.stats.MP < mp };
      }),
      { type:'item', cls:'itm', icon:'🧪', name:`Draught ×${pot?.uses||0}`, sub:'Heal 40%', disabled:!pot },
      { type:'dfn',  cls:'dfn', icon:'🛡️', name:'Defend',        sub:'−50% dmg' },
      { type:'flee', cls:'fl',  icon:'💨', name:'Flee',           sub:'50% chance', disabled: BATTLE.state?.en?.isBoss },
    ];

    btns.forEach(b => {
      const btn = document.createElement('button');
      btn.className = `bat-btn ${b.cls}`;
      btn.disabled  = !!b.disabled;
      btn.setAttribute('data-action', b.type);
      btn.innerHTML = `<span class="bn">${b.icon} ${b.name}</span><span class="bc">${b.sub}</span>`;
      btn.addEventListener('touchend', e => { e.preventDefault(); BATTLE.doAction(b.type); }, { passive:false });
      grid.appendChild(btn);
    });
  },

  // ── DIALOGUE ──────────────────────────────────
  showDlg() {
    this._activate('screen-dlg');
    const d = GAME.dlg;
    if (!d) return;
    const art = document.getElementById('dlg-art');
    const sp  = document.getElementById('dlg-sp');
    const tx  = document.getElementById('dlg-tx');
    const ch  = document.getElementById('dlg-choices');
    const adv = document.getElementById('dlg-adv');
    if (art) art.textContent = d.art || '🌑';
    if (sp)  sp.textContent  = d.speaker || 'OPHIUCHUS';
    if (tx)  tx.textContent  = d.text || '';
    if (ch)  ch.innerHTML    = '';
    if (adv) adv.style.display = 'block';
  },

  // ── CHAR SHEET ────────────────────────────────
  showChar() {
    this._activate('screen-char');
    const p  = GAME.player;
    if (!p) return;
    const ico = document.getElementById('cs-icon');
    const nm  = document.getElementById('cs-name');
    const tt  = document.getElementById('cs-title');
    const bd  = document.getElementById('cs-body');

    if (ico) {
      const sw = document.getElementById('cs-sprite-wrap');
      if (p.portrait && GAME.IMG[p.portrait] && sw) {
        sw.innerHTML = `<img class="cs-sprite" src="${GAME.IMG[p.portrait].src}" alt="${p.title}">`;
      } else {
        ico.textContent = `${p.w.ic} ${p.c.ic}`;
      }
    }
    if (nm)  nm.textContent  = `${p.name} ${p.gender==='F'?'♀':'♂'}`;
    if (tt)  tt.textContent  = `${p.title} · Level ${p.level}`;

    if (!bd) return;
    const skHtml = (p.skills||[]).map(s => {
      const sk = SKILLS[s]; if (!sk) return '';
      return `<div style="padding:5px 0;border-bottom:1px solid rgba(38,22,96,.3)">
        ${sk.icon} <b>${s}</b> <span style="color:var(--dim);font-size:10px">${sk.cost} MP</span>
        <div style="color:var(--dim);font-size:11px;margin-top:2px">${sk.desc||''}</div>
      </div>`;
    }).join('');

    const statHtml = ['HP','MP','ATK','DEF','SPD','LCK'].map(k => {
      const v = p.stats[k]||0; const s = QB4I.enc(v);
      return `<div class="strand-row">
        <span class="sk">${k}</span>
        <span style="color:var(--dim)">${String(v).padStart(3)}</span>
        <span class="sv">${s}</span>
        <span class="si">×i:${QB4I.imag(s)}</span>
        <span class="ss">~:${QB4I.shadow(s)}</span>
      </div>`;
    }).join('');

    bd.innerHTML = `
      <div class="sec-t">Western Sign</div>
      <p style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:4px">
        ${p.w.sym} <b style="color:var(--txt)">${p.w.n}</b> · ${p.w.el} / ${p.w.q}</p>
      <div class="sec-t">Chinese Sign</div>
      <p style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:4px">
        ${p.c.ic} <b style="color:var(--txt)">${p.c.n}</b> · ${p.c.yang?'Yang':'Yin'} ${p.c.el}<br>
        <span style="font-size:11px">${p.c.lore||''}</span></p>
      <div class="sec-t">Stats</div>
      <div class="stat-grid" style="margin-bottom:8px">
        ${['HP','MP','ATK','DEF','SPD','LCK'].map(k=>
          `<div class="stat-cell"><div class="sl">${k}</div>
           <div class="sv">${p.stats[k]}${p.stats['max'+k]&&k==='HP'?'/'+p.stats.maxHP:k==='MP'?'/'+p.stats.maxMP:''}</div></div>`
        ).join('')}
      </div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:8px">
        EXP: ${p.exp}/${p.expNext} · Victories: ${p.wins||0}</div>
      <div class="sec-t">Skills</div>
      <div style="margin-bottom:8px">${skHtml}</div>
      <div class="sec-t" style="color:var(--teal)">QB4I Genetic Strand</div>
      <div style="background:rgba(2,4,8,.85);border:1px solid rgba(26,175,140,.25);
        border-radius:4px;padding:8px;margin-bottom:8px">${statHtml}</div>
      <div style="font-size:11px;color:var(--dim);text-align:center;margin-bottom:12px">
        Shadow Resonance: <span style="color:var(--purple)">${QB4I.shadowPow(p)}</span></div>
    `;
  },

  // ── HELPERS ───────────────────────────────────
  _activate(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  toast(msg, ms=2200) {
    const el = document.getElementById('notif');
    if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), ms);
  },

  areaTransition(name, subtext, cb) {
    const el = document.getElementById('area-transition');
    const h2 = el?.querySelector('h2');
    const p  = el?.querySelector('p');
    if (!el) { cb?.(); return; }
    if (h2) h2.textContent = name;
    if (p)  p.textContent  = subtext || '';
    el.classList.add('fade-in');
    setTimeout(() => { cb?.(); el.classList.remove('fade-in'); }, 900);
  },
};
