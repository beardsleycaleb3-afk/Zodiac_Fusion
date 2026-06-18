// ═══════════════════════════════════════════════════════
//  battle.js — Turn-Based Battle Engine
//  Android Chrome 350×550 · Touch-only · 60fps effects
// ═══════════════════════════════════════════════════════
'use strict';

const BATTLE = {
  state: null,
  dmgQueue: [],    // floating damage numbers
  shakeTime: 0,    // screen shake timer
  flashColor: null,

  // ── START ──────────────────────────────────────────
  start(enemyObj) {
    const en = {
      ...enemyObj,
      curHP: enemyObj.hp,
      maxHP: enemyObj.hp,
      curMP: enemyObj.mp || 30,
      stunned: false,
      atkMult: 1.0,
      defMult: 1.0,
      phase: 0,
      dotTurns: 0,
    };

    this.state = {
      en, enObj: enemyObj,
      log: [], turn: 'player',
      over: false,
      pEvade: false, pDefend: false,
      pBufs: {}, eBufs: {},
      pDot: 0, eDot: 0,
      pRegen: 0,
      turnNum: 1,
    };
    this.dmgQueue = [];
    this.shakeTime = 0;
    this.flashColor = null;

    AUDIO.sfx[en.isBoss ? 'bossStart' : 'battleStart']();
    GAME.scr = 'battle';
    UI.render();
    this._animIn();
  },

  _animIn() {
    const sprite = document.getElementById('bat-sprite');
    if (sprite) {
      sprite.style.transform = 'translateY(-120%) scale(0.8)';
      sprite.style.opacity   = '0';
      requestAnimationFrame(() => {
        sprite.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease';
        sprite.style.transform  = 'translateY(0) scale(1)';
        sprite.style.opacity    = '1';
      });
    }
  },

  // ── LOG ──────────────────────────────────────────
  log(html, color = '') {
    const el = document.getElementById('bat-log');
    if (!el) return;
    const lines = el.querySelectorAll('.bat-line');
    if (lines.length >= 3) lines[0].remove();
    const d = document.createElement('div');
    d.className = 'bat-line';
    d.innerHTML = color ? `<span style="color:${color}">${html}</span>` : html;
    el.appendChild(d);
  },

  clearLog() {
    const el = document.getElementById('bat-log');
    if (el) el.innerHTML = '';
  },

  // ── PLAYER ACTION ──────────────────────────────
  doAction(type) {
    if (!this.state || this.state.over || this.state.turn !== 'player') return;
    const s  = this.state;
    const p  = GAME.player;
    const en = s.en;
    this._lockBtns(true);

    let done = true;

    switch (type) {
      case 'atk': {
        const atkVal = Math.round(p.stats.ATK * (s.pBufs.ATK || 1));
        const defVal = Math.round(en.curHP > 0 ? en.defMult * (s.eBufs.DEF || 1) * (en.def||20) : 1);
        const dmg    = this._calcDmg(atkVal, defVal, 1.0);
        this._hitEnemy(dmg, '#e74c3c');
        this.log(`⚔️ <b>${p.name}</b> strikes — <span style="color:#e74c3c">${dmg}</span>!`);
        AUDIO.sfx.hit();
        break;
      }
      case 'sk0': case 'sk1': case 'sk2': case 'sk3': {
        const idx = parseInt(type.slice(2));
        const skName = p.skills[idx];
        if (!skName) { this._lockBtns(false); return; }
        const sk = SKILLS[skName];
        if (!sk) { this._lockBtns(false); return; }
        if (p.stats.MP < sk.cost) {
          this.log('❌ Not enough MP!', '#ff4444');
          AUDIO.sfx.deny();
          this._lockBtns(false);
          return;
        }
        p.stats.MP = Math.max(0, p.stats.MP - sk.cost);
        this._applySkill(sk, skName, true);
        AUDIO.sfx.skill();
        break;
      }
      case 'item': {
        const pot = p.items.find(i => i.id === 'potion' && i.uses > 0);
        if (!pot) { this.log('❌ No items!', '#ff4444'); AUDIO.sfx.deny(); this._lockBtns(false); return; }
        pot.uses--;
        const h = Math.round(p.stats.maxHP * 0.4);
        p.stats.HP = Math.min(p.stats.maxHP, p.stats.HP + h);
        this.log(`🧪 Healing Draught — <span style="color:#1aaf8c">+${h} HP</span>!`);
        AUDIO.sfx.heal();
        this._flashScreen('rgba(26,175,140,0.18)');
        break;
      }
      case 'defend': {
        s.pDefend = true;
        this.log(`🛡️ <b>${p.name}</b> guards — damage halved!`);
        AUDIO.sfx.buff();
        break;
      }
      case 'flee': {
        const spd = p.stats.SPD || 22;
        const chance = Math.max(0.2, Math.min(0.8, 0.5 + (spd - (s.en.spd||20)) * 0.01));
        if (Math.random() < chance) {
          this.log('💨 Escaped!', '#8b3fe8');
          AUDIO.sfx.portal();
          setTimeout(() => this._end(false, true), 900);
          return;
        }
        this.log('💨 Failed to escape!', '#ff6600');
        done = true;
        break;
      }
      default:
        this._lockBtns(false); return;
    }

    // DoT on enemy
    if (s.eDot > 0) {
      const dd = Math.round(en.maxHP * 0.05);
      this._hitEnemy(dd, '#44ff88');
      this.log(`☠️ Poison — <span style="color:#44ff88">${dd}</span> to ${en.label}!`);
      s.eDot--;
    }

    // Player regen
    if (s.pRegen > 0) {
      const rh = Math.round(p.stats.maxHP * 0.1);
      p.stats.HP = Math.min(p.stats.maxHP, p.stats.HP + rh);
      this.log(`🌿 Regen — <span style="color:#1aaf8c">+${rh} HP</span>`);
      s.pRegen--;
    }

    this._updateUI();

    if (en.curHP <= 0) { setTimeout(() => this._end(true), 500); return; }

    // Boss phase check
    this._checkPhase();

    s.turn = 'enemy';
    setTimeout(() => this._enemyTurn(), 700);
  },

  _applySkill(sk, name, isPlayer) {
    const s  = this.state;
    const p  = GAME.player;
    const en = s.en;
    const atkVal = isPlayer ? Math.round(p.stats.ATK * (s.pBufs.ATK||1)) : Math.round(en.atkMult*(en.atk||30));
    const defVal = isPlayer ? Math.round((en.def||20) * (s.eBufs.DEF||1)) : Math.round(p.stats.DEF*(s.pBufs.DEF||1));

    switch (sk.type) {
      case 'dmg': case 'dmg_spd': case 'dmg_dbt': {
        const dmg = this._calcDmg(atkVal, defVal, sk.mult);
        if (isPlayer) { this._hitEnemy(dmg,'#e74c3c'); }
        else { this._hitPlayer(dmg); }
        this.log(`${sk.icon} <b>${name}</b> — <span style="color:${isPlayer?'#e74c3c':'#ff8888'}">${dmg}</span>!`);
        if (sk.type==='dmg_dbt' && !isPlayer) s.pBufs.ATK=(s.pBufs.ATK||1)*0.8;
        if (sk.type==='dmg_spd' && isPlayer)  s.pBufs.SPD=(s.pBufs.SPD||1)*1.2;
        break;
      }
      case 'dmg_prc': {
        const dmg = this._calcDmg(atkVal, defVal*0.5, sk.mult);
        this._hitEnemy(dmg,'#ff8800');
        this.log(`${sk.icon} <b>${name}</b> pierces — <span style="color:#ff8800">${dmg}</span>!`);
        break;
      }
      case 'dmg_dot': {
        const dmg = this._calcDmg(atkVal, defVal, sk.mult);
        if (isPlayer) { this._hitEnemy(dmg,'#44ff88'); s.eDot=(s.eDot||0)+2; }
        else          { this._hitPlayer(dmg);           s.pDot=(s.pDot||0)+2; }
        this.log(`${sk.icon} <b>${name}</b> — ${dmg} + poisoned!`);
        break;
      }
      case 'heal': {
        const h = Math.round(p.stats.maxHP * sk.pct);
        p.stats.HP = Math.min(p.stats.maxHP, p.stats.HP + h);
        this._flashScreen('rgba(26,175,140,0.22)');
        this.log(`${sk.icon} <b>${name}</b> — <span style="color:#1aaf8c">+${h} HP</span>!`);
        AUDIO.sfx.heal();
        break;
      }
      case 'drain': {
        const dmg = this._calcDmg(atkVal, defVal, sk.mult);
        const dr  = Math.round(dmg * 0.5);
        if (isPlayer) { this._hitEnemy(dmg,'#cc44ff'); p.stats.HP=Math.min(p.stats.maxHP,p.stats.HP+dr); }
        else          { this._hitPlayer(dmg);           }
        this.log(`${sk.icon} <b>${name}</b> — drains ${dmg}, +${dr} HP!`);
        break;
      }
      case 'buff': {
        if (isPlayer) s.pBufs[sk.stat]=(s.pBufs[sk.stat]||1)+(sk.boost||0.35);
        else          s.eBufs[sk.stat]=(s.eBufs[sk.stat]||1)+(sk.boost||0.35);
        this.log(`${sk.icon} <b>${name}</b> — ${sk.stat} raised!`, '#8b3fe8');
        break;
      }
      case 'evade': {
        s.pEvade = isPlayer;
        this.log(`${sk.icon} <b>${name}</b> — will evade next hit!`, '#22aacc');
        break;
      }
      case 'stun': {
        const dmg = this._calcDmg(atkVal, defVal, sk.mult||1.15);
        if (isPlayer) { this._hitEnemy(dmg,'#ff88cc'); en.stunned=true; }
        this.log(`${sk.icon} <b>${name}</b> — ${dmg} + stunned!`, '#ff88cc');
        break;
      }
      case 'regen': {
        s.pRegen = (s.pRegen||0) + (sk.turns||3);
        this.log(`${sk.icon} <b>${name}</b> — regen ${sk.turns||3} turns!`, '#1aaf8c');
        break;
      }
    }
  },

  // ── ENEMY TURN ──────────────────────────────────
  _enemyTurn() {
    if (!this.state || this.state.over) return;
    const s  = this.state;
    const en = s.en;
    const p  = GAME.player;

    if (en.stunned) {
      en.stunned = false;
      this.log(`💤 ${en.label} is stunned — loses turn!`);
      this._afterEnemy();
      return;
    }

    // Player evade
    if (s.pEvade) {
      s.pEvade = false;
      this.log(`✨ ${p.name} evades ${en.label}'s attack!`);
      this._afterEnemy();
      return;
    }
    s.pEvade = false;

    // Enemy AI
    const hp_pct = en.curHP / en.maxHP;
    const skills  = en.skills || ['Strike'];
    let chosen;

    if (en.isBoss && hp_pct < 0.3 && Math.random() < 0.35) {
      // Desperate self-heal when low
      const h = Math.round(en.maxHP * 0.12);
      en.curHP = Math.min(en.maxHP, en.curHP + h);
      this.log(`💀 ${en.label} absorbs shadow — heals ${h}!`, '#cc44ff');
      this._flashScreen('rgba(150,0,255,0.18)');
      this._afterEnemy();
      return;
    }

    chosen = skills[Math.floor(Math.random() * skills.length)];

    const atkVal  = Math.round(en.atkMult * (s.eBufs.ATK||1) * (en.atk||30));
    const defVal  = Math.round(p.stats.DEF * (s.pBufs.DEF||1));
    let   dmg     = this._calcDmg(atkVal, defVal, 1.0);
    if (s.pDefend) { dmg = Math.round(dmg * 0.5); }
    s.pDefend = false;

    this._hitPlayer(dmg);
    this.log(`${en.label} uses <b>${chosen}</b> — <span style="color:#ff5555">${dmg}</span>!`);

    this._afterEnemy();
  },

  _afterEnemy() {
    const s = this.state; const p = GAME.player;
    // Player DoT
    if (s.pDot > 0) {
      const pd = Math.round(p.stats.maxHP * 0.05);
      p.stats.HP = Math.max(0, p.stats.HP - pd);
      s.pDot--;
      this.log(`☠️ Poison — <span style="color:#ff4444">${pd}</span> to you!`);
    }
    // MP regen
    p.stats.MP = Math.min(p.stats.maxMP, p.stats.MP + 4);
    s.turnNum++;
    this._updateUI();

    if (p.stats.HP <= 0) { setTimeout(() => this._end(false), 600); return; }

    s.turn = 'player';
    this._lockBtns(false);
  },

  _checkPhase() {
    const s = this.state; const en = s.en;
    if (!en.isBoss) return;
    const phases = [
      { pct: 0.6, mult: 1.2, msg: `${en.label} is enraged — ATK ×1.2!` },
      { pct: 0.3, mult: 1.4, msg: `⚠ FINAL PHASE — ${en.label} goes BERSERK!` },
    ];
    phases.forEach((ph, i) => {
      if (s.phase <= i && en.curHP / en.maxHP <= ph.pct) {
        s.phase = i + 1;
        en.atkMult = ph.mult;
        this._shakeScreen(400);
        this._flashScreen('rgba(255,0,0,0.3)');
        setTimeout(() => this.log(`⚠️ <b>${ph.msg}</b>`, '#ff3333'), 150);
      }
    });
  },

  // ── DAMAGE ──────────────────────────────────────
  _calcDmg(atk, def, mult) {
    const raw = Math.max(1, atk * mult - def * 0.42);
    return Math.max(1, Math.round(raw * (0.88 + Math.random() * 0.24)));
  },

  _hitEnemy(dmg, color = '#e74c3c') {
    const en = this.state.en;
    en.curHP = Math.max(0, en.curHP - dmg);
    this._spawnDmgNum(dmg, color, true);
    this._shakeScreen(180);
    this._animHPBar('en');
  },

  _hitPlayer(dmg) {
    const p = GAME.player;
    p.stats.HP = Math.max(0, p.stats.HP - dmg);
    this._spawnDmgNum(dmg, '#ff5555', false);
    this._flashScreen('rgba(255,0,0,0.22)');
    AUDIO.sfx.damage();
    this._animHPBar('pl');
  },

  _animHPBar(which) {
    const id = which === 'en' ? 'bat-en-fill' : 'bat-pl-fill';
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transition = 'width 0.4s ease-out';
    const en = this.state.en, p = GAME.player;
    const pct = which === 'en'
      ? Math.max(0, (en.curHP / en.maxHP) * 100)
      : Math.max(0, (p.stats.HP / p.stats.maxHP) * 100);
    el.style.width = pct + '%';

    // Color shift when critical
    if (pct < 25) el.style.background = 'linear-gradient(90deg, #7a0000, #ff2222)';
  },

  _spawnDmgNum(n, color, isEnemy) {
    const container = document.getElementById(isEnemy ? 'bat-en-dmg' : 'bat-pl-dmg');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'dmg-num';
    el.textContent = `-${n}`;
    el.style.color  = color;
    el.style.left   = `${25 + Math.random()*50}%`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 900);
  },

  _flashScreen(color) {
    const fl = document.getElementById('bat-flash');
    if (!fl) return;
    fl.style.background = color;
    fl.style.opacity = '1';
    setTimeout(() => { fl.style.opacity = '0'; }, 120);
  },

  _shakeScreen(ms) {
    const wrap = document.getElementById('bat-wrap');
    if (!wrap) return;
    wrap.classList.add('shaking');
    setTimeout(() => wrap.classList.remove('shaking'), ms);
  },

  // ── END ─────────────────────────────────────────
  _end(won, fled) {
    if (!this.state) return;
    this.state.over = true;
    this._lockBtns(true);

    if (won) {
      const en  = this.state.en;
      const xp  = en.xp || Math.round(en.maxHP * 0.5 + (en.atk||25) * 2);
      const p   = GAME.player;
      p.exp    += xp;
      p.wins    = (p.wins||0) + 1;
      // Partial restore
      p.stats.HP = Math.min(p.stats.maxHP, p.stats.HP + Math.round(p.stats.maxHP * 0.2));
      p.stats.MP = Math.min(p.stats.maxMP, p.stats.MP + Math.round(p.stats.maxMP * 0.3));

      AUDIO.sfx.victory();
      this._flashScreen('rgba(212,160,23,0.35)');
      this.log(`<span style="color:#d4a017">✨ Victory! +${xp} EXP</span>`);

      // Level up loop
      let leveled = false;
      while (p.exp >= p.expNext) {
        p.level++; p.exp -= p.expNext; p.expNext = Math.round(p.expNext * 1.55);
        p.stats.maxHP += 14; p.stats.HP = p.stats.maxHP;
        p.stats.maxMP += 7;  p.stats.MP = p.stats.maxMP;
        p.stats.ATK += 4; p.stats.DEF += 3; p.stats.SPD += 3;
        leveled = true;
      }
      if (leveled) {
        AUDIO.sfx.levelUp();
        setTimeout(() => this.log(`🌟 <b style="color:#d4a017">LEVEL UP → Lv.${p.level}!</b>`), 400);
      }

      // Remove defeated enemy from world
      GAME.defeatObj(this.state.enObj);
      const delay = en.isBoss ? 2400 : 1600;
      setTimeout(() => { this.state = null; GAME.scr = 'world'; UI.render(); }, delay);

    } else if (fled) {
      this.state = null;
      GAME.scr = 'world';
      UI.render();

    } else {
      // Defeat
      GAME.player.stats.HP = Math.round(GAME.player.stats.maxHP * 0.5);
      GAME.player.stats.MP = Math.round(GAME.player.stats.maxMP * 0.5);
      AUDIO.sfx.defeat();
      this._flashScreen('rgba(0,0,0,0.7)');
      this.log('💀 <span style="color:#ff3333">Defeated... rise and continue.</span>');
      setTimeout(() => { this.state = null; GAME.scr = 'world'; UI.render(); }, 2200);
    }

    this._updateUI();
  },

  _lockBtns(lock) {
    document.querySelectorAll('.bat-btn').forEach(b => b.disabled = lock);
  },

  _updateUI() {
    if (!this.state) return;
    const p  = GAME.player;
    const en = this.state.en;

    // Enemy HP
    const enPct = Math.max(0,(en.curHP/en.maxHP)*100);
    const enFill = document.getElementById('bat-en-fill');
    if (enFill) enFill.style.width = enPct + '%';
    const enTxt = document.getElementById('bat-en-hp');
    if (enTxt) enTxt.textContent = `${Math.max(0,en.curHP)} / ${en.maxHP}`;

    // Player HP
    const plPct = Math.max(0,(p.stats.HP/p.stats.maxHP)*100);
    const plFill = document.getElementById('bat-pl-fill');
    if (plFill) plFill.style.width = plPct + '%';
    const plHp  = document.getElementById('bat-pl-hp');
    if (plHp) plHp.textContent = `${p.stats.HP} / ${p.stats.maxHP}`;

    // Player MP
    const mpPct = Math.max(0,(p.stats.MP/p.stats.maxMP)*100);
    const mpFill = document.getElementById('bat-mp-fill');
    if (mpFill) mpFill.style.width = mpPct + '%';
    const mpTxt = document.getElementById('bat-pl-mp');
    if (mpTxt) mpTxt.textContent = `${p.stats.MP} / ${p.stats.maxMP}`;
  },
};
