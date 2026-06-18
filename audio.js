// ═══════════════════════════════════════════════════════
//  audio.js — Procedural Web Audio Synthesizer
//  No external files needed · 8-bit style chiptune
// ═══════════════════════════════════════════════════════
'use strict';

const AUDIO = {
  ctx: null,
  master: null,
  muted: false,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch(e) { console.warn('Audio init failed:', e); }
  },

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  },

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return !this.muted;
  },

  // Play sequence: [[freq, dur, vol?, wave?], ...]
  seq(notes, delay=0) {
    if (!this.ctx || this.muted) return;
    this.resume();
    let t = this.ctx.currentTime + delay + 0.01;
    for (const [f, d, v=0.25, w='square'] of notes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain); gain.connect(this.master);
      osc.type = w; osc.frequency.value = f;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.start(t); osc.stop(t + d + 0.05);
      t += d * 0.85;
    }
  },

  // Short noise burst (hit impact)
  noise(dur=0.08, vol=0.2) {
    if (!this.ctx || this.muted) return;
    this.resume();
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate*dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0; i<data.length; i++) data[i] = (Math.random()*2-1)*0.5;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    src.buffer = buf;
    filter.type = 'bandpass'; filter.frequency.value = 600;
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime+dur);
    src.start(); src.stop(this.ctx.currentTime + dur + 0.05);
  },

  sfx: {
    move()    { AUDIO.seq([[660, 0.04, 0.08, 'square']]); },
    step()    { AUDIO.seq([[330, 0.035, 0.06, 'square']]); },
    menu()    { AUDIO.seq([[440,0.06,0.15,'square'],[550,0.06,0.15,'square']]); },
    select()  { AUDIO.seq([[660,0.04,0.18,'square'],[880,0.06,0.18,'square']]); },
    back()    { AUDIO.seq([[550,0.04,0.12,'square'],[440,0.06,0.12,'square']]); },
    deny()    { AUDIO.seq([[220,0.1,0.2,'sawtooth'],[165,0.12,0.15,'sawtooth']]); },

    hit()     { AUDIO.noise(0.06,0.22); AUDIO.seq([[220,0.08,0.15,'sawtooth']],0.02); },
    crit()    { AUDIO.noise(0.04,0.3); AUDIO.seq([[440,0.05,0.3,'square'],[880,0.07,0.3,'square']],0.01); },
    heal()    { AUDIO.seq([[523,0.07,0.18,'sine'],[659,0.07,0.18,'sine'],[784,0.1,0.2,'sine']]); },
    skill()   { AUDIO.seq([[392,0.05,0.2,'square'],[523,0.05,0.2,'square'],[659,0.08,0.2,'square']]); },
    buff()    { AUDIO.seq([[440,0.06,0.15,'triangle'],[550,0.06,0.15,'triangle'],[660,0.1,0.18,'triangle']]); },
    drain()   { AUDIO.seq([[330,0.1,0.2,'sawtooth'],[247,0.1,0.15,'sawtooth'],[185,0.15,0.1,'sawtooth']]); },
    stun()    { AUDIO.noise(0.12,0.25); AUDIO.seq([[165,0.15,0.18,'sawtooth']],0.05); },

    battleStart() {
      AUDIO.seq([
        [196,0.1,0.3,'sawtooth'],[165,0.1,0.3,'sawtooth'],
        [147,0.18,0.3,'sawtooth'],[131,0.35,0.28,'sawtooth'],
      ]);
    },
    bossStart() {
      AUDIO.seq([
        [98, 0.15,0.4,'sawtooth'],[82, 0.15,0.4,'sawtooth'],
        [73, 0.25,0.4,'sawtooth'],[65, 0.5, 0.38,'sawtooth'],
      ]);
    },
    victory() {
      AUDIO.seq([
        [523,0.08,0.25],[659,0.08,0.25],[784,0.08,0.25],
        [1047,0.14,0.3],[784,0.06,0.2],[1047,0.22,0.3],
      ].map(([f,d,v])=>[f,d,v,'square']));
    },
    levelUp() {
      AUDIO.seq([
        [523,0.07],[659,0.07],[784,0.07],[1047,0.07],
        [1319,0.07],[1568,0.07],[2093,0.22],
      ].map(([f,d])=>[f,d,0.3,'square']));
    },
    defeat()  {
      AUDIO.seq([
        [392,0.12,0.22,'sawtooth'],[330,0.12,0.2,'sawtooth'],
        [262,0.16,0.18,'sawtooth'],[196,0.28,0.15,'sawtooth'],
      ]);
    },
    chest()   { AUDIO.seq([[784,0.06,0.2,'sine'],[1047,0.06,0.2,'sine'],[1319,0.12,0.22,'sine']]); },
    save()    { AUDIO.seq([[440,0.06,0.15,'sine'],[523,0.06,0.15,'sine'],[659,0.1,0.18,'sine']]); },
    damage()  { AUDIO.noise(0.07,0.18); },
    portal()  { AUDIO.seq([[220,0.08,0.15,'sine'],[330,0.08,0.15,'sine'],[440,0.12,0.2,'sine'],[330,0.08,0.12,'sine'],[220,0.16,0.1,'sine']]); },
  },
};
